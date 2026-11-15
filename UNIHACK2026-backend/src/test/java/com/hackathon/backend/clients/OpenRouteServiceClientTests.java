package com.hackathon.backend.clients;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.http.*;
import tools.jackson.databind.json.JsonMapper;
import com.hackathon.backend.model.dtos.routes.RouteRequestDTO;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class OpenRouteServiceClientTests {
    private final RouteRequestDTO request = new RouteRequestDTO(new RouteRequestDTO.Point(45.75,21.22),
            new RouteRequestDTO.Point(45.76,21.23));
    private final String success = """
            {"features":[{"geometry":{"type":"LineString","coordinates":[[21.22,45.75],[21.23,45.76]]},
            "properties":{"summary":{"distance":1200,"duration":900}}}]}
            """;
    @Test void fallbackRunsOnceAndNeverRunsWithoutPolygons() {
        for (int scenario = 0; scenario < 3; scenario++) {
            boolean hasReports = scenario != 0;
            boolean fallbackFails = scenario == 2;
            var builder = RestClient.builder().baseUrl("https://mock.invalid");
            var server = MockRestServiceServer.bindTo(builder).build();
            var client = new OpenRouteServiceClient(JsonMapper.builder().build(), "dummy", builder);
            var repository = org.mockito.Mockito.mock(com.hackathon.backend.repositories.ReportRepository.class);
            org.mockito.Mockito.when(repository.findActiveInBounds(org.mockito.ArgumentMatchers.any(),
                    org.mockito.ArgumentMatchers.anyDouble(),org.mockito.ArgumentMatchers.anyDouble(),
                    org.mockito.ArgumentMatchers.anyDouble(),org.mockito.ArgumentMatchers.anyDouble()))
                    .thenReturn(hasReports ? java.util.List.of(com.hackathon.backend.model.entities.ReportEntity.builder()
                            .id(1L).latitude(45.755).longitude(21.225).build()) : java.util.List.of());
            server.expect(requestTo("https://mock.invalid/v2/directions/foot-walking/geojson"))
                    .andExpect(hasReports ? jsonPath("$.options.avoid_polygons.type").value("MultiPolygon")
                            : jsonPath("$.options").doesNotExist())
                    .andRespond(withBadRequest().contentType(MediaType.APPLICATION_JSON).body("{\"error\":{\"code\":2009}}"));
            if (hasReports) server.expect(requestTo("https://mock.invalid/v2/directions/foot-walking/geojson"))
                    .andExpect(jsonPath("$.options").doesNotExist())
                    .andRespond(fallbackFails ? withServerError() : withSuccess(success,MediaType.APPLICATION_JSON));
            var service = new com.hackathon.backend.services.RouteService(repository,
                    new com.hackathon.backend.services.GeoJsonService(),client,500);
            if (hasReports && !fallbackFails) {
                var response = service.route(request);
                assertThat(response.avoidanceApplied()).isFalse();
                assertThat(response.avoidanceLimited()).isTrue();
                assertThat(response.warning()).contains("does not avoid reported areas");
            } else assertThatThrownBy(() -> service.route(request)).isInstanceOf(OpenRouteServiceClient.Failure.class);
            server.verify();
        }
    }
    @Test void sendsLongitudeFirstAndParsesRoute() {
        var builder = RestClient.builder().baseUrl("https://mock.invalid");
        var server = MockRestServiceServer.bindTo(builder).build();
        var client = new OpenRouteServiceClient(JsonMapper.builder().build(), "dummy", builder);
        server.expect(requestTo("https://mock.invalid/v2/directions/foot-walking/geojson"))
                .andExpect(method(HttpMethod.POST)).andExpect(header("Authorization", "dummy"))
                .andExpect(content().json("{\"coordinates\":[[21.22,45.75],[21.23,45.76]]}", true))
                .andRespond(withSuccess(success, MediaType.APPLICATION_JSON));
        var result = client.route(request, null);
        assertThat(result.distance()).isEqualTo(1200);
        assertThat(result.duration()).isEqualTo(900);
        server.verify();
    }
    @Test void onlyDocumentedNoRouteWithAvoidanceIsEligible() {
        for (int status : new int[]{400,404,401,403,429,500,503}) {
            var builder = RestClient.builder().baseUrl("https://mock.invalid");
            var server = MockRestServiceServer.bindTo(builder).build();
            var client = new OpenRouteServiceClient(JsonMapper.builder().build(), "dummy", builder);
            server.expect(requestTo("https://mock.invalid/v2/directions/foot-walking/geojson"))
                    .andRespond(withStatus(HttpStatus.valueOf(status)).contentType(MediaType.APPLICATION_JSON)
                            .body("{\"error\":{\"code\":2009,\"message\":\"private upstream details\"}}"));
            assertThatThrownBy(() -> client.route(request, Map.of("type","MultiPolygon")))
                    .isInstanceOfSatisfying(OpenRouteServiceClient.Failure.class, e -> {
                        assertThat(e.fallbackEligible()).isEqualTo(status == 400 || status == 404);
                        assertThat(e.getReason()).doesNotContain("private");
                    });
            server.verify();
        }
    }
    @Test void timeoutMalformedAndMissingKeyAreSanitized() {
        var builder = RestClient.builder().baseUrl("https://mock.invalid");
        var server = MockRestServiceServer.bindTo(builder).build();
        var client = new OpenRouteServiceClient(JsonMapper.builder().build(), "dummy", builder);
        server.expect(requestTo("https://mock.invalid/v2/directions/foot-walking/geojson"))
                .andRespond(withException(new java.net.SocketTimeoutException("private")));
        assertThatThrownBy(() -> client.route(request, null)).isInstanceOfSatisfying(OpenRouteServiceClient.Failure.class,
                e -> { assertThat(e.getStatusCode().value()).isEqualTo(504); assertThat(e.fallbackEligible()).isFalse(); });
        server.verify();
        var empty = new OpenRouteServiceClient(JsonMapper.builder().build(), "", RestClient.builder());
        assertThatThrownBy(() -> empty.route(request, null)).hasMessageContaining("set ORS_API_KEY");
    }
    @Test void rejectsMalformedSuccessAndUnsnappablePointWithoutRetry() {
        for (String body : new String[]{"{}", "{\"error\":{\"code\":2010}}"}) {
            var builder = RestClient.builder().baseUrl("https://mock.invalid");
            var server = MockRestServiceServer.bindTo(builder).build();
            var client = new OpenRouteServiceClient(JsonMapper.builder().build(), "dummy", builder);
            server.expect(requestTo("https://mock.invalid/v2/directions/foot-walking/geojson"))
                    .andRespond(withStatus(body.equals("{}") ? HttpStatus.OK : HttpStatus.BAD_REQUEST)
                            .contentType(MediaType.APPLICATION_JSON).body(body));
            assertThatThrownBy(() -> client.route(request, Map.of("type","MultiPolygon")))
                    .isInstanceOfSatisfying(OpenRouteServiceClient.Failure.class, e -> assertThat(e.fallbackEligible()).isFalse());
            server.verify();
        }
    }
}


