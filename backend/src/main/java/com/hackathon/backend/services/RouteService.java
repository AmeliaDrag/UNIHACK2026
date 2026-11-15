package com.hackathon.backend.services;

import com.hackathon.backend.clients.OpenRouteServiceClient;
import com.hackathon.backend.model.dtos.routes.*;
import com.hackathon.backend.model.entities.ReportEntity;
import com.hackathon.backend.repositories.ReportRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class RouteService {
    private final ReportRepository reports;
    private final GeoJsonService geo;
    private final OpenRouteServiceClient ors;
    private final double margin;
    public RouteService(ReportRepository reports, GeoJsonService geo, OpenRouteServiceClient ors,
                        @Value("${ors.corridor-margin-meters:500}") double margin) {
        this.reports = reports;
        this.geo = geo;
        this.ors = ors;
        this.margin = margin;
    }
    public RouteResponseDTO route(RouteRequestDTO request) {
        if (request == null) throw badInput();
        validate(request.origin()); validate(request.destination());
        var a = request.origin(); var b = request.destination();
        if (a.equals(b)) throw badInput();
        if (Math.abs(a.latitude()) > 85 || Math.abs(b.latitude()) > 85
                || Math.abs(a.longitude() - b.longitude()) > 180)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Polar and antimeridian journeys are not supported");
        if (!Double.isFinite(margin) || margin < 0 || margin > 20_000)
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Routing corridor margin is misconfigured");
        double dy = margin / GeoJsonService.METERS_PER_DEGREE;
        double dx = dy / Math.cos(Math.toRadians(Math.max(Math.abs(a.latitude()), Math.abs(b.latitude())) + dy));
        double minLat = Math.max(-90, Math.min(a.latitude(), b.latitude()) - dy);
        double maxLat = Math.min(90, Math.max(a.latitude(), b.latitude()) + dy);
        double minLon = Math.min(a.longitude(), b.longitude()) - dx;
        double maxLon = Math.max(a.longitude(), b.longitude()) + dx;
        if (minLon < -180 || maxLon > 180)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Antimeridian routing corridor is not supported");
        var candidates = new ArrayList<>(reports.findActiveInBounds(LocalDateTime.now(), minLat, maxLat, minLon, maxLon));
        candidates.sort(Comparator.comparingDouble((ReportEntity r) -> geo.distanceToSegment(r, a, b))
                .thenComparing(ReportEntity::getId));
        List<ReportEntity> selected = new ArrayList<>();
        boolean limited = false;
        for (var report : candidates) {
            if (selected.stream().anyMatch(r -> geo.distance(r.getLatitude(), r.getLongitude(),
                    report.getLatitude(), report.getLongitude()) <= 25)) continue;
            if (selected.size() == 100) { limited = true; break; }
            try { geo.diamond(report.getLatitude(), report.getLongitude()); }
            catch (IllegalArgumentException ex) { limited = true; continue; }
            selected.add(report);
        }
        if (!selected.isEmpty()) {
            // Conservative combined extent check; 100 50-m diamonds total approximately 0.5 km².
            double south = selected.stream().mapToDouble(ReportEntity::getLatitude).min().orElseThrow();
            double north = selected.stream().mapToDouble(ReportEntity::getLatitude).max().orElseThrow();
            double west = selected.stream().mapToDouble(ReportEntity::getLongitude).min().orElseThrow();
            double east = selected.stream().mapToDouble(ReportEntity::getLongitude).max().orElseThrow();
            double closestToEquator = south <= 0 && north >= 0 ? 0 : Math.min(Math.abs(south), Math.abs(north));
            if ((north - south) * GeoJsonService.METERS_PER_DEGREE + 100 > 20_000
                    || geo.distance(closestToEquator, west, closestToEquator, east) + 200 > 20_000
                    || geo.distance(a.latitude(), a.longitude(), b.latitude(), b.longitude()) > 150_000)
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Journey exceeds supported avoidance limits");
        }
        var polygons = selected.isEmpty() ? null : geo.multiPolygon(selected);
        boolean applied = polygons != null;
        String warning = limited ? "Avoidance coverage was limited to selected report areas." : null;
        OpenRouteServiceClient.Result result;
        try { result = ors.route(request, polygons); }
        catch (OpenRouteServiceClient.Failure ex) {
            if (polygons == null || !ex.fallbackEligible()) throw ex;
            result = ors.route(request, null); // Exactly one fallback; any failure propagates sanitized.
            applied = false;
            limited = true;
            warning = "No route was found with avoidance. This route does not avoid reported areas.";
        }
        return new RouteResponseDTO(result.geometry(), result.distance(), result.duration(), applied, limited,
                warning, applied ? selected.size() : 0);
    }
    private void validate(RouteRequestDTO.Point point) {
        if (point == null || point.latitude() == null || point.longitude() == null
                || !Double.isFinite(point.latitude()) || !Double.isFinite(point.longitude())
                || Math.abs(point.latitude()) > 90 || Math.abs(point.longitude()) > 180) throw badInput();
    }
    private ResponseStatusException badInput() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide distinct valid origin and destination coordinates");
    }
}

