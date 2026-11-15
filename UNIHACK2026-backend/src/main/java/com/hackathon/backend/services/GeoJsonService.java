package com.hackathon.backend.services;

import com.hackathon.backend.model.entities.ReportEntity;
import com.hackathon.backend.model.dtos.routes.RouteRequestDTO.Point;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class GeoJsonService {
    public static final double METERS_PER_DEGREE = 111_320;
    public List<List<Double>> diamond(double latitude, double longitude) {
        double dy = 50 / METERS_PER_DEGREE;
        double dx = dy / Math.cos(Math.toRadians(latitude));
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude) || Math.abs(latitude) > 85
                || Math.abs(longitude) + dx > 180) {
            throw new IllegalArgumentException("Unsupported avoidance location");
        }
        var north = List.of(longitude, latitude + dy);
        return List.of(north, List.of(longitude - dx, latitude), List.of(longitude, latitude - dy),
                List.of(longitude + dx, latitude), north);
    }
    public Map<String, Object> multiPolygon(List<ReportEntity> reports) {
        return Map.of("type", "MultiPolygon", "coordinates", reports.stream()
                .map(r -> List.of(diamond(r.getLatitude(), r.getLongitude()))).toList());
    }
    public double distance(double lat1, double lon1, double lat2, double lon2) {
        double x = (lon2 - lon1) * METERS_PER_DEGREE * Math.cos(Math.toRadians((lat1 + lat2) / 2));
        double y = (lat2 - lat1) * METERS_PER_DEGREE;
        return Math.hypot(x, y);
    }
    public double distanceToSegment(ReportEntity report, Point a, Point b) {
        double scale = METERS_PER_DEGREE * Math.cos(Math.toRadians((a.latitude() + b.latitude()) / 2));
        double x = (report.getLongitude() - a.longitude()) * scale;
        double y = (report.getLatitude() - a.latitude()) * METERS_PER_DEGREE;
        double bx = (b.longitude() - a.longitude()) * scale;
        double by = (b.latitude() - a.latitude()) * METERS_PER_DEGREE;
        double t = Math.clamp((x * bx + y * by) / (bx * bx + by * by), 0, 1);
        return Math.hypot(x - t * bx, y - t * by);
    }
}
