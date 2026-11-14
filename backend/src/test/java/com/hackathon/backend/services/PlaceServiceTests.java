package com.hackathon.backend.services;

import com.hackathon.backend.controllers.PlaceController;
import com.hackathon.backend.exceptions.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.json.JsonMapper;
import java.nio.charset.StandardCharsets;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PlaceServiceTests {
    private PlaceService parse(String json) {
        return new PlaceService(JsonMapper.builder().build(), new ByteArrayResource(json.getBytes(StandardCharsets.UTF_8)));
    }
    @Test void mapsNodesWaysAndRelationsAndReturnsBareArray() throws Exception {
        var service = parse("""
                {"elements":[
                  {"type":"node","id":1,"lat":45.75,"lon":21.22,"tags":{"name":"Example","shop":"convenience","amenity":"fuel","opening_hours":"24/7"}},
                  {"type":"way","id":1,"center":{"lat":45.76,"lon":21.23},"tags":{"amenity":"pharmacy","opening_hours":"24/7"}},
                  {"type":"relation","id":2,"center":{"lat":45.77,"lon":21.24},"tags":{"amenity":"fuel","opening_hours":"24/7"}},
                  {"type":"node","id":1,"lat":45.75,"lon":21.22,"tags":{"shop":"convenience","opening_hours":"24/7"}},
                  {"type":"node","id":3,"lat":95,"lon":21,"tags":{"shop":"yes","opening_hours":"24/7"}},
                  {"type":"node","id":4,"lat":45,"lon":21,"tags":{"shop":"yes","opening_hours":"Mo-Fr"}}
                ]}
                """);
        assertThat(service.getPlaces()).hasSize(3);
        assertThat(service.getPlaces().get(0).category()).isEqualTo("convenience");
        assertThat(service.getPlaces().get(1).id()).isEqualTo("way/1");
        assertThat(service.getPlaces().get(1).latitude()).isEqualTo(45.76);
        assertThat(service.getPlaces().get(1).longitude()).isEqualTo(21.23);
        assertThat(service.getPlaces().get(1).name()).isNull();
        MockMvcBuilders.standaloneSetup(new PlaceController(service)).build()
                .perform(get("/api/v1/places/open-24-7"))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3)).andExpect(jsonPath("$[1].name").value(org.hamcrest.Matchers.nullValue()));
        assertThat(parse("{\"elements\":[]}").getPlaces()).isEmpty();
    }
    @Test void missingOrInvalidSnapshotDoesNotPreventConstructionAndReturnsStandard503() throws Exception {
        var services = java.util.List.of(parse("{}"), parse("not JSON"),
                new PlaceService(JsonMapper.builder().build(), new ClassPathResource("nonexistent-places-test.json")));
        for (var service : services) {
            MockMvcBuilders.standaloneSetup(new PlaceController(service))
                    .setControllerAdvice(new GlobalExceptionHandler()).build()
                    .perform(get("/api/v1/places/open-24-7"))
                    .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.status").value(503))
                    .andExpect(jsonPath("$.error").value("Service Unavailable"))
                    .andExpect(jsonPath("$.message").value("24/7 places snapshot is unavailable"))
                    .andExpect(jsonPath("$.timestamp").exists());
        }
    }
    @Test void actualSnapshotLoads() {
        var places = new PlaceService(JsonMapper.builder().build()).getPlaces();
        assertThat(places).isNotEmpty();
        System.out.println("Verified real snapshot place count: " + places.size());
    }
}
