package com.hackathon.backend.clients;

import com.hackathon.backend.model.dtos.routes.RouteRequestDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.*;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.*;

@Component
public class OpenRouteServiceClient {
    private final RestClient client;
    private final String key;
    private final ObjectMapper mapper;

    @org.springframework.beans.factory.annotation.Autowired
    public OpenRouteServiceClient(ObjectMapper mapper, @Value("${ors.api-key:}") String key,
            @Value("${ors.base-url:https://api.heigit.org/openrouteservice}") String baseUrl,
            @Value("${ors.connect-timeout-ms:3000}") int connect,
            @Value("${ors.read-timeout-ms:12000}") int read) {
        this(mapper, key, builder(baseUrl, connect, read));
    }
    private static RestClient.Builder builder(String baseUrl, int connect, int read) {
        var http = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(connect))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofMillis(read));
        return RestClient.builder().baseUrl(baseUrl.replaceAll("/+$", "")).requestFactory(factory);
    }
    // Package-visible constructor for HTTP tests with Spring's mock server.
    OpenRouteServiceClient(ObjectMapper mapper, String key, RestClient.Builder builder) {
        this.mapper = mapper;
        this.key = key;
        this.client = builder.build();
    }
    public record Result(JsonNode geometry, double distance, double duration) {}
    public static class Failure extends ResponseStatusException {
        private final boolean fallbackEligible;
        Failure(HttpStatus status, String reason, boolean fallbackEligible) {
            super(status, reason);
            this.fallbackEligible = fallbackEligible;
        }
        public boolean fallbackEligible() { return fallbackEligible; }
    }
    public Result route(RouteRequestDTO request, Map<String, Object> polygons) {
        if (key == null || key.isBlank()) {
            throw new Failure(HttpStatus.SERVICE_UNAVAILABLE, "Routing is not configured: set ORS_API_KEY", false);
        }
        var body = new LinkedHashMap<String, Object>();
        body.put("coordinates", List.of(List.of(request.origin().longitude(), request.origin().latitude()),
                List.of(request.destination().longitude(), request.destination().latitude())));
        if (polygons != null) body.put("options", Map.of("avoid_polygons", polygons));
        try {
            return client.post().uri("/v2/directions/foot-walking/geojson")
                    .header(HttpHeaders.AUTHORIZATION, key).contentType(MediaType.APPLICATION_JSON).body(body)
                    .exchange((req, response) -> {
                        int status = response.getStatusCode().value();
                        // Bound parsing; never propagate upstream bodies or transport exceptions.
                        byte[] bytes = response.getBody().readNBytes(2_000_001);
                        if (bytes.length > 2_000_000) throw malformed();
                        JsonNode root = null;
                        try { root = mapper.readTree(bytes); } catch (RuntimeException ignored) { }
                        if (status != 200) throw upstream(status, root, polygons != null);
                        return parse(root);
                    });
        } catch (Failure ex) {
            throw ex;
        } catch (ResourceAccessException ex) {
            boolean timeout = false;
            for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
                if (cause instanceof java.net.http.HttpTimeoutException || cause instanceof java.net.SocketTimeoutException)
                    timeout = true;
            }
            throw new Failure(timeout ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.SERVICE_UNAVAILABLE,
                    timeout ? "Routing provider timed out" : "Routing provider unavailable", false);
        } catch (RuntimeException ex) {
            throw malformed();
        }
    }
    private Failure upstream(int status, JsonNode root, boolean avoidance) {
        int code = root == null ? -1 : root.path("error").path("code").asInt(-1);
        if (status == 401 || status == 403)
            return new Failure(HttpStatus.BAD_GATEWAY, "Routing provider rejected server credentials", false);
        if (status == 429 || status >= 500)
            return new Failure(HttpStatus.SERVICE_UNAVAILABLE, "Routing provider temporarily unavailable", false);
        // Documented 2009 means route not found. 2010 (unsnappable point) is deliberately not retried.
        boolean retry = avoidance && (status == 400 || status == 404) && code == 2009;
        if (code == 2009 || code == 2010)
            return new Failure(HttpStatus.UNPROCESSABLE_ENTITY, "No walking route could be found", retry);
        return new Failure(HttpStatus.BAD_GATEWAY, "Routing provider rejected the routing request", false);
    }
    private Result parse(JsonNode root) {
        if (root == null || !root.path("features").isArray() || root.path("features").isEmpty()) throw malformed();
        var feature = root.path("features").get(0);
        var geometry = feature.path("geometry");
        var coordinates = geometry.path("coordinates");
        if (!"LineString".equals(geometry.path("type").asText()) || !coordinates.isArray() || coordinates.size() < 2)
            throw malformed();
        for (var point : coordinates) {
            if (!point.isArray() || point.size() < 2 || !point.get(0).isNumber() || !point.get(1).isNumber()
                    || !Double.isFinite(point.get(0).asDouble()) || !Double.isFinite(point.get(1).asDouble())
                    || Math.abs(point.get(0).asDouble()) > 180 || Math.abs(point.get(1).asDouble()) > 90) throw malformed();
        }
        var summary = feature.path("properties").path("summary");
        var distance = summary.path("distance");
        var duration = summary.path("duration");
        if (!distance.isNumber() || !duration.isNumber() || !Double.isFinite(distance.asDouble())
                || !Double.isFinite(duration.asDouble()) || distance.asDouble() < 0 || duration.asDouble() < 0) throw malformed();
        // Only return the validated geometry fields, not arbitrary provider metadata.
        var clean = mapper.createObjectNode().put("type", "LineString");
        clean.set("coordinates", coordinates);
        return new Result(clean, distance.asDouble(), duration.asDouble());
    }
    private static Failure malformed() {
        return new Failure(HttpStatus.BAD_GATEWAY, "Invalid response from routing provider", false);
    }
}

