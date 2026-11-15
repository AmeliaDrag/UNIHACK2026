# Pedestrian routing MVP

## Run and configure

Both the PowerShell working directory for `mvnw.cmd` and IntelliJ **Run Configuration -> Working directory** must be:

`C:\Users\andre\Desktop\Unihack 2026\UNIHACK2026\backend`

The existing private `.env` is loaded by Spring at application startup using `spring.config.import=optional:file:.env[.properties]`. It resolves relative to that working directory. Write properties syntax: `ORS_API_KEY=value`, without quotes, spaces around `=`, or `export`. `.env.example` contains a placeholder only. Real process environment variables take precedence over imported file properties. No dotenv dependency is used.

A missing/blank key does not prevent startup. A valid route request returns standardized 503 JSON with `Routing is not configured: set ORS_API_KEY`.

```powershell
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=dev'
```

For auth, use `-Dspring-boot.run.profiles=auth`, configure `FRONTEND_ORIGIN` as before, and send your Auth0 access token. The existing security chain protects `/api/v1/routes` without modification.

Properties (override with Spring configuration/environment as needed):

| Property | Default |
|---|---|
| `ors.base-url` | `https://api.heigit.org/openrouteservice` |
| `ors.corridor-margin-meters` | `500` |
| `ors.connect-timeout-ms` | `3000` |
| `ors.read-timeout-ms` | `12000` |

Use a base URL without a trailing slash. HTTP redirects are disabled so the credential header cannot follow a redirect to another host.

## Endpoint

POST `http://localhost:8080/api/v1/routes`, Content-Type `application/json`:

```json
{
  "origin": {"latitude": 45.7489, "longitude": 21.2257},
  "destination": {"latitude": 45.7542, "longitude": 21.2315}
}
```

Illustrative response only (geometry and metrics come from ORS, not these examples):

```json
{
  "geometry": {"type":"LineString","coordinates":[[21.2257,45.7489],[21.2315,45.7542]]},
  "distanceMeters":1000,
  "durationSeconds":750,
  "avoidanceApplied":true,
  "avoidanceLimited":false,
  "avoidancePolygonCount":1
}
```

`warning` is omitted when unnecessary. `avoidanceApplied` means ORS returned a route after receiving the submitted polygons; it is not a safety guarantee or an independent intersection check. `avoidancePolygonCount` counts polygons used on the successful request (zero after fallback). `avoidanceLimited` is true if the cap/unsupported report geometry reduced coverage, or fallback removed avoidance. Only reports in the configured bounding box are considered. No relevant reports means normal routing with both flags false.

Reports expire when `expiresAt <= now`. Relevant reports are prioritized by distance to the straight journey segment, deduplicated within approximately 25 m, and limited to 100. Every report diamond is N-W-S-E-N with 50 m offsets; all GeoJSON and ORS coordinates are longitude first. Geometry is transient, not stored.

## Limitations and fallback

This local-distance MVP explicitly rejects polar (above 85 degrees absolute latitude) and antimeridian journeys/corridors with 400. Unsupported report diamonds are skipped with limited-coverage status. Avoidance requests exceeding a conservative combined 20 km extent or a 150 km straight-line journey bound return 422. The 100-diamond cap bounds approximate total polygon area to 0.5 km², below the 200 km² public limit. Actual routed distance may exceed the straight-line bound; provider rejections remain sanitized errors.

References: [ORS hosted restrictions](https://giscience.github.io/openrouteservice/hosted-api-restrictions), [ORS error codes](https://giscience.github.io/openrouteservice/api-reference/error-codes).

Exactly one fallback is allowed for HTTP 400/404 plus documented routing code **2009** (route not found), and only when the initial request included polygons. The ordinary retry omits `options` entirely. A successful fallback returns `avoidanceApplied=false`, `avoidanceLimited=true`, and `No route was found with avoidance. This route does not avoid reported areas.`

Code 2010 (point not found) does not establish that avoidance caused the problem and is not retried. No unverified geometry-error message matching is used. Generic 400, unknown errors, 401/403/429/5xx, timeouts, invalid frontend input, and requests without polygons never cause fallback. A failed fallback returns a sanitized error, never a third request.

Invalid frontend input -> 400; missing server key / unavailable provider / rate limit -> 503; timeout -> 504; malformed provider responses, provider credential rejection, other rejected provider requests -> 502; no route / unsnappable point / unsupported avoidance limits -> 422. All use the existing ErrorResponse format. Routing code emits no payload/error-body/credential logs and does not attach raw upstream exceptions to client errors.

## Postman checklist

In dev, no bearer token is needed. To create reports, first POST `/api/v1/users` with `{"name":"Ana","email":"ana@test.com"}`. In auth, use the existing PKCE flow and bearer token instead of manual user creation.

A. **No reports:** restart the in-memory backend, then POST the route body above. Expect a real ORS LineString and metrics with `avoidanceApplied=false` and no warning. Save this response locally.

B. **One report:** choose a point on the returned route and POST `/api/v1/reports`:

```json
{"type":"LOW_LIGHT","latitude":45.7515,"longitude":21.2286}
```

The sample coordinate is illustrative: choose an actual interior point of your baseline route, away from its endpoints. Repeat the route request. If avoidance succeeds, expect `avoidanceApplied=true` and count 1; otherwise inspect the explicit fallback warning or sanitized error.

For an independent geometric check, reconstruct the diamond using `dy=50/111320` and `dx=dy/cos(latitude in radians)`. Check every returned route segment against each diamond edge for intersection, and check whether any route point is inside a diamond. Use a local GIS tool or frontend geometry library; do not rely only on changed route shape. Boundary touches count as intersections. Do not upload personal routes to public visualization services. This backend does not perform this independent intersection verification.

C. **Multiple reports:** add several points along the baseline more than 25 m apart and inside its expanded bounding box, then repeat the request. Check polygon count and flags. Closely clustered points collapse to one representative; over 100 unique candidates produces limited coverage.

D. **Fallback:** run `OpenRouteServiceClientTests.fallbackRunsOnceAndNeverRunsWithoutPolygons` for a controlled mocked 2009 response and ordinary-route retry. Live failures are not deterministic and no special production test endpoint exists.

E. **Invalid coordinates:** change latitude to 91 or omit origin. Expect standardized 400 JSON without a provider request.

F. **Expired reports:** covered by `RoutingIntegrationTests.queryExcludesExpiredAndDistantReports`. For manual dev verification, set a report's `expires_at` to a past timestamp using the local H2 console, then repeat. There is intentionally no public endpoint for changing expiry.

## Verification and changed files

Maven checks use dummy keys and mocked responses. `src/test/resources/application.properties` prevents loading the private `.env`. For an explicit extra override:

```powershell
.\mvnw.cmd '-Dspring.config.import=optional:classpath:/routing-test-empty.properties' compile test
```

No live ORS call, real API key, real-world route avoidance, or frontend integration is verified by these tests. Actual private `.env` loading is intentionally not exercised; verify your local startup manually. Git ignored/tracked status remains for you to verify manually, as agreed.

Created:
- `src/main/java/com/hackathon/backend/controllers/RouteController.java`
- `src/main/java/com/hackathon/backend/model/dtos/routes/RouteRequestDTO.java`
- `src/main/java/com/hackathon/backend/model/dtos/routes/RouteResponseDTO.java`
- `src/main/java/com/hackathon/backend/services/GeoJsonService.java`
- `src/main/java/com/hackathon/backend/services/RouteService.java`
- `src/main/java/com/hackathon/backend/clients/OpenRouteServiceClient.java`
- `src/test/java/com/hackathon/backend/clients/OpenRouteServiceClientTests.java`
- `src/test/java/com/hackathon/backend/services/RouteServiceTests.java`
- `src/test/java/com/hackathon/backend/RoutingIntegrationTests.java`
- `src/test/resources/application.properties`
- `ROUTING_SETUP.md`

Modified:
- `src/main/java/com/hackathon/backend/repositories/ReportRepository.java`
- `src/main/resources/application.properties`
- `.env.example` (placeholder only)
- `.gitignore` (existing exclusion rules retained; explanatory comment added)

No dependencies, existing auth/user/contact/SOS code, or credentials were changed. Maven also generates ignored build outputs and verification logs under `target/`.

Final verification: Maven compile succeeded; 18 tests passed, 0 failures/errors. This includes existing auth/dev tests, dummy file import and simulated environment-variable precedence, successful and failed fallback sequences, active-report database filtering, and endpoint validation. The actual private .env was never opened, read, modified, or loaded during verification. No live ORS call or real avoidance/intersection behavior was tested.
