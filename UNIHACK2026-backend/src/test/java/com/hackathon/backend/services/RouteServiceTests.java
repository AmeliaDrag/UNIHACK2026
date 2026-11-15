package com.hackathon.backend.services;

import com.hackathon.backend.clients.OpenRouteServiceClient;
import com.hackathon.backend.model.dtos.routes.RouteRequestDTO;
import com.hackathon.backend.model.entities.ReportEntity;
import com.hackathon.backend.repositories.ReportRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class RouteServiceTests {
    private final GeoJsonService geo = new GeoJsonService();
    private final RouteRequestDTO request = new RouteRequestDTO(new RouteRequestDTO.Point(45.75,21.22),
            new RouteRequestDTO.Point(45.76,21.23));
    @Test void diamondIsClosedCounterclockwiseAndLongitudeFirst() {
        var ring = geo.diamond(45.75, 21.22);
        double dy = 50.0 / 111320;
        double dx = dy / Math.cos(Math.toRadians(45.75));
        assertThat(ring).containsExactly(List.of(21.22,45.75+dy),List.of(21.22-dx,45.75),
                List.of(21.22,45.75-dy),List.of(21.22+dx,45.75),List.of(21.22,45.75+dy));
        var polygons = geo.multiPolygon(List.of(report(1,45.75,21.22),report(2,45.76,21.23)));
        assertThat((List<?>)polygons.get("coordinates")).hasSize(2);
        assertThatThrownBy(() -> geo.diamond(90,180)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void omitsEmptyAvoidanceAndDeduplicatesNearbyReports() {
        var repository = mock(ReportRepository.class);
        var client = mock(OpenRouteServiceClient.class);
        when(client.route(any(), any())).thenReturn(new OpenRouteServiceClient.Result(null,100,80));
        var service = new RouteService(repository,geo,client,500);
        when(repository.findActiveInBounds(any(),anyDouble(),anyDouble(),anyDouble(),anyDouble())).thenReturn(List.of());
        assertThat(service.route(request).avoidanceApplied()).isFalse();
        verify(client).route(request,null);
        when(repository.findActiveInBounds(any(),anyDouble(),anyDouble(),anyDouble(),anyDouble()))
                .thenReturn(List.of(report(1,45.755,21.225),report(2,45.75501,21.22501)));
        assertThat(service.route(request).avoidancePolygonCount()).isEqualTo(1);
    }
    @Test void capsAndPrioritizesNearestReports() {
        var repository = mock(ReportRepository.class);
        var client = mock(OpenRouteServiceClient.class);
        when(client.route(any(), any())).thenReturn(new OpenRouteServiceClient.Result(null,100,80));
        var reports = new ArrayList<ReportEntity>();
        for (int i=0;i<110;i++) reports.add(report(i+1,45.75+i*0.0003,21.225));
        when(repository.findActiveInBounds(any(),anyDouble(),anyDouble(),anyDouble(),anyDouble())).thenReturn(reports);
        var result = new RouteService(repository,geo,client,500).route(request);
        assertThat(result.avoidanceLimited()).isTrue();
        assertThat(result.avoidancePolygonCount()).isEqualTo(100);
        var capture = ArgumentCaptor.forClass(Map.class);
        verify(client).route(eq(request),capture.capture());
        assertThat(capture.getValue().toString()).doesNotContain("45.7827");
    }
    @Test void invalidInputNeverCallsProvider() {
        var client = mock(OpenRouteServiceClient.class);
        var service = new RouteService(mock(ReportRepository.class),geo,client,500);
        assertThatThrownBy(() -> service.route(new RouteRequestDTO(new RouteRequestDTO.Point(Double.NaN,21.0),request.destination())))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        verifyNoInteractions(client);
    }
    @Test void propertiesImportAndEnvironmentPrecedenceUseOnlyDummyFixture(
            @org.junit.jupiter.api.io.TempDir java.nio.file.Path directory) throws Exception {
        var fixture = directory.resolve("routing-fixture");
        java.nio.file.Files.writeString(fixture, "ORS_API_KEY=dummy-file\nors.api-key=${ORS_API_KEY:}\n");
        for (boolean override : new boolean[]{false,true}) {
            var environment = new org.springframework.core.env.StandardEnvironment();
            environment.getPropertySources().replace("systemEnvironment",
                    new org.springframework.core.env.SystemEnvironmentPropertySource("systemEnvironment",
                            override ? Map.of("ORS_API_KEY","dummy-environment") : Map.of()));
            var app = new org.springframework.boot.SpringApplication(ImportTestConfig.class);
            app.setWebApplicationType(org.springframework.boot.WebApplicationType.NONE);
            app.setEnvironment(environment);
            try (var context = app.run("--spring.config.location=optional:classpath:/routing-test-empty.properties",
                    "--spring.config.import=" + fixture.toUri() + "[.properties]", "--spring.main.banner-mode=off")) {
                assertThat(context.getEnvironment().getProperty("ors.api-key"))
                        .isEqualTo(override ? "dummy-environment" : "dummy-file");
            }
        }
    }
    @org.springframework.context.annotation.Configuration(proxyBeanMethods=false)
    static class ImportTestConfig {}
    private ReportEntity report(long id,double lat,double lon) {
        return ReportEntity.builder().id(id).latitude(lat).longitude(lon).build();
    }
}

