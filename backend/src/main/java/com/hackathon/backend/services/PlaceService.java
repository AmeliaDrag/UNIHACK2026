package com.hackathon.backend.services;

import com.hackathon.backend.model.dtos.places.PlaceDto;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;

@Service
public class PlaceService {
    private final List<PlaceDto> places;

    @Autowired
    public PlaceService(ObjectMapper mapper) {
        this(mapper, new ClassPathResource("open-24-7-overpass.json"));
    }

    // Resource constructor permits isolated missing/invalid snapshot tests.
    PlaceService(ObjectMapper mapper, Resource snapshot) {
        List<PlaceDto> loaded = null;
        try (var input = snapshot.getInputStream()) {
            JsonNode root = mapper.readTree(input);
            if (root == null || !root.isObject() || !root.path("elements").isArray()) {
                throw new IllegalArgumentException("Expected Overpass object with elements array");
            }
            var unique = new LinkedHashMap<String, PlaceDto>();
            for (var element : root.path("elements")) {
                var place = map(element);
                if (place != null) unique.putIfAbsent(place.id(), place);
            }
            loaded = List.copyOf(unique.values());
        } catch (Exception ex) {
            LoggerFactory.getLogger(PlaceService.class).error(
                    "Cannot load open-24-7-overpass.json: missing, unreadable or invalid Overpass snapshot ({}). Places endpoint will return 503.",
                    ex.getClass().getSimpleName());
        }
        places = loaded;
    }

    public List<PlaceDto> getPlaces() {
        if (places == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "24/7 places snapshot is unavailable");
        }
        return places;
    }

    private static PlaceDto map(JsonNode element) {
        var type = element.path("type");
        var id = element.path("id");
        var tags = element.path("tags");
        if (!type.isString() || !Set.of("node", "way", "relation").contains(type.asText())
                || !id.isIntegralNumber() || !id.canConvertToLong() || id.asLong() <= 0
                || !tags.isObject() || !"24/7".equals(tags.path("opening_hours").asText())) return null;
        String category = text(tags.path("shop"));
        if (category == null || category.isBlank()) {
            category = text(tags.path("amenity"));
            if (!"pharmacy".equals(category) && !"fuel".equals(category)) return null;
        }
        var location = "node".equals(type.asText()) ? element : element.path("center");
        var lat = location.path("lat");
        var lon = location.path("lon");
        if (!lat.isNumber() || !lon.isNumber() || !Double.isFinite(lat.asDouble())
                || !Double.isFinite(lon.asDouble()) || Math.abs(lat.asDouble()) > 90
                || Math.abs(lon.asDouble()) > 180) return null;
        return new PlaceDto(type.asText() + "/" + id.asLong(), text(tags.path("name")),
                lat.asDouble(), lon.asDouble(), category);
    }

    private static String text(JsonNode value) {
        return value.isString() ? value.asText() : null;
    }
}
