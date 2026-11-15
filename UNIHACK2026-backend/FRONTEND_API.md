# Frontend API integration contract

This document describes the observable REST contract. Inspect the existing frontend API calls, authentication, types, routing UI, and SOS flows first. Compare them with this contract, preserve correct functionality, and adapt mismatched paths, fields, authentication, and response handling. Do not rebuild working components unnecessarily. Ask the owner about UNKNOWN items or genuine ambiguities.

## 1. Overview and connection

The API provides current-user profiles, community reports, directional trusted contacts, SOS alerts, and walking routes that attempt to avoid reported areas. Base path: `/api/v1`. Default local origin: `http://localhost:8080`; default API base URL: `http://localhost:8080/api/v1`. No custom server port is specified; runtime overrides may change this. Deployment API origin: **UNKNOWN - verify**.

Send Content-Type: application/json for JSON request bodies. GETs have no request body. Lists are bare arrays, possibly [], without pagination envelopes; no pagination or filtering query parameters are exposed. DELETE returns an empty body. Object property order is not significant. All sample IDs, names, reserved example-domain addresses, coordinates and times below are fictional illustrative values, not account records.

| Mode | Identity and browser behavior |
|---|---|
| dev | No token required. Identity-dependent requests use one server-configured fixed user. Creating another user does not change the acting identity; two-user flows cannot be exercised as two separate identities in this mode. Missing fixed user gives 401. No CORS policy is enabled for the REST endpoints: cross-origin browser integration is not supported and preflights may be rejected. Use a frontend development proxy with relative /api/v1 requests, or serve both on the same origin. |
| auth | Every application endpoint requires a Bearer access token. Manual POST /api/v1/users is additionally denied. Allowed CORS preflights need no token. Exact configured origins only; methods GET, POST, PUT, PATCH, DELETE, OPTIONS; allowed request headers Authorization and Content-Type. Credentialed-cookie CORS is not enabled; do not use credentials: include. |

In auth, the owner sets FRONTEND_ORIGIN to exact frontend origins, comma-separated if necessary, without paths, wildcards, or trailing slashes. This configuration is required. Rejected CORS produces 403 "CORS request denied", but the browser may hide its body. Distinguish unreadable browser/network failures from readable API errors.

## 2. Authentication and public Auth0 handoff

| Setting | Value | Confirmation / owner action |
|---|---|---|
| Auth0 domain | dev-h6e6m3uck5zb26m4.us.auth0.com | Confirmed in backend auth-profile properties |
| Issuer | https://dev-h6e6m3uck5zb26m4.us.auth0.com/ | Confirmed; trailing slash matters |
| API audience | https://unihack-project-api | Confirmed in backend auth-profile properties |
| SPA application Client ID | <FILL_IN_BY_BACKEND_OWNER> | UNKNOWN - verify; copy public SPA Client ID from Dashboard |
| Frontend origin, including scheme/host/port | <FILL_IN_BY_BACKEND_OWNER> | UNKNOWN - verify; development/deployment URL |
| Allowed Callback URLs | <FILL_IN_BY_BACKEND_OWNER> | UNKNOWN - verify; register the exact redirect URI(s) used by the existing frontend, including callback path; backend prescribes no callback path |
| Allowed Logout URLs | <FILL_IN_BY_BACKEND_OWNER> | UNKNOWN - verify; exact post-logout frontend return URL(s) |
| Allowed Web Origins | <FILL_IN_BY_BACKEND_OWNER> | UNKNOWN - verify; actual frontend origin(s), without paths |
| Backend FRONTEND_ORIGIN | <FILL_IN_BY_BACKEND_OWNER> | UNKNOWN - verify actual list; include frontend origin in auth |

The frontend needs only public Auth0 configuration. Do not request or embed private credentials. Dashboard settings and deployed Post Login Action status are **UNKNOWN - verify**; configured backend values do not prove Dashboard setup is complete.

Use an Auth0 SPA SDK with Authorization Code + PKCE, audience above, and scopes openid profile email. Send the **access token, not the ID token**, as `Authorization: Bearer <access_token>` on every auth-mode call. There is no backend password-login or token-issuing endpoint.

Immediately after login, call GET /api/v1/users/me and wait for success before entering authenticated application state. First use of a valid new identity with the required claims creates its backend profile and returns profile JSON. Subsequent calls return the existing profile, including local edits. Do not use POST /users for authenticated registration.

The owner must configure these access-token claims through the Auth0 Post Login Action:

| Claim | First-use requirement |
|---|---|
| https://unihack-project-api/email | Nonblank string, <=255 characters before trimming; trimmed/lowercased; basic non-whitespace local@domain.suffix format |
| https://unihack-project-api/name | Nonblank string, <=100 characters before trimming; trimmed |
| https://unihack-project-api/email_verified | JSON boolean true, not string "true" |

Existing recognized identities do not have those first-use profile checks repeated and are not refreshed from claim name/email on each call. Never send a user ID/email to select the current user; the token determines identity. contactEmail identifies an invitation recipient only.

### Common identity errors

These apply to GET/PUT /users/me, report creation, and all contact/SOS operations. GET /reports and POST /routes require a valid auth-mode token but do not themselves initialize the profile.

| HTTP | Exact message | Handling |
|---|---|---|
| 401 | Authentication required or invalid bearer token | Missing/invalid/expired token; obtain fresh token or re-authenticate; security response includes WWW-Authenticate: Bearer |
| 401 | Authentication required | No usable authenticated identity |
| 401 | Missing or invalid identity claims | Missing, blank, wrongly typed or overlong required strings; owner must fix claims, not loop login |
| 401 | Invalid identity email claim | Invalid first-use email format |
| 403 | Verified email required for provisioning | First-use email_verified missing, false, or not boolean true; verify email/acquire fresh token |
| 409 | Identity conflicts with an existing account | Email belongs to another/legacy identity; no automatic linking; contact owner |
| 401 | Development user not found | Owner must prepare fixed dev user |
| 403 | Access denied | Endpoint forbidden; token refresh does not bypass permission |

## 3. Data conventions and shared errors

Inputs use named latitude/longitude. Coordinates are required finite JSON numbers, latitude [-90,90], longitude [-180,180]; route restrictions also apply. NaN/Infinity are not valid inputs. GeoJSON uses [longitude,latitude]. When manually converting to Leaflet position arrays, use [latitude,longitude]; GeoJSON-aware layers already handle GeoJSON order, so do not double-swap.

| Enum | Exact values |
|---|---|
| Report type | LOW_LIGHT, SUSPICIOUS_PERSON, ISOLATED_AREA, DAMAGED_ROAD, OTHER |
| Contact status | PENDING, ACCEPTED |
| SOS status | ACTIVE, CANCELLED, RESOLVED |

Frontend maps type to icons/emoji. No report description, severity, icon, or owner is returned. CANCELLED exists as an enum but no cancellation endpoint exists.

Report and SOS timestamps are ISO local date-time strings without offset/Z, e.g. 2026-11-14T10:00:00, potentially with fractional seconds. Server timezone: **UNKNOWN - verify**. Do not append Z or assume browser timezone. Error timestamps are ISO offset date-time strings, with variable offset/Z and optional fractional seconds. Backend active-report filtering is authoritative.

Serialization: unset phoneNumber is returned as null; null route warning is omitted; absent validationErrors is omitted. Other listed success fields are present. No success envelope is added. These findings come from current serialization annotations/configuration; no new live serialization probe was performed for this documentation task.

### Standard error JSON

```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "Only the recipient can accept this request",
  "timestamp": "2026-11-14T10:00:00Z"
}
```
Validation example for a report with missing fields:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "timestamp": "2026-11-14T10:00:00Z",
  "validationErrors": {
    "type": "Report type is required",
    "latitude": "Latitude is required",
    "longitude": "Longitude is required"
  }
}
```

status is an integer matching HTTP status; error/message are strings; timestamp is an offset timestamp; optional validationErrors maps field/property names to strings. Standard annotation messages can depend on locale. Multiple violations for one field need not all be returned. Nested route validation can use keys such as origin.latitude. Do not hard-code business decisions solely from English text.

Shared errors below apply to all endpoints as relevant, in addition to auth and endpoint-specific errors. Security 401/403 and auth CORS rejection have this same JSON structure; still handle non-JSON proxy/network errors.

| HTTP | Exact message / meaning |
|---|---|
| 400 | Validation failed — invalid body fields |
| 400 | Malformed JSON request or invalid value — unreadable/missing body or invalid enum |
| 400 | Invalid value for parameter 'id' — unparseable path ID |
| 400 | Invalid request argument |
| 403 | Access denied; CORS request denied |
| 404 | Resource not found — unknown URL after authentication requirements |
| 405 | Method not allowed for this endpoint |
| 415 | Content type not supported. Use application/json |
| 409 | Data conflicts with existing records |
| 500 | An unexpected error occurred |
| 422 / 502 / 503 / 504 | Routing errors listed below |

Use positive numeric IDs returned by previous calls. Exact message/shape for non-positive path-ID validation is **UNKNOWN - verify**; do not assume the body-validation map applies.

## 4. Endpoint reference

All paths include /api/v1. Auth-mode authentication is required on every endpoint; POST /users is additionally denied. In dev no token is needed. All entries inherit shared errors above and identity errors where applicable. Do not rely on unknown request properties being accepted or acted on.

### POST /api/v1/users

Development-only manual creation. Auth mode denies it with 403 Access denied for a valid token; missing/invalid tokens can produce 401.

| Field | Input constraint |
|---|---|
| name | Required nonblank string, <=100 characters |
| email | Required nonblank valid email string; trimmed/lowercased |
| phoneNumber | Optional/null string; optional leading + followed by 9–15 digits; empty string invalid |

Request:

```json
{
  "name": "Example Person",
  "email": "person@example.invalid"
}
```

Success: 201.

```json
{
  "name": "Example Person",
  "email": "person@example.invalid",
  "phoneNumber": null
}
```
Specific error: 409 `Email already registered`. Creating a user does not log in or change the fixed dev identity. Owner prepares dev identity; do not hard-code an account.

### GET /api/v1/users/me

No body. All three response fields are present: name/email strings, phoneNumber string or null. **No id is returned**. Common first-use identity 401/403/409 errors apply.

Success: 200.

```json
{
  "name": "Example Person",
  "email": "person@example.invalid",
  "phoneNumber": null
}
```


### PUT /api/v1/users/me

Optional/null name: if present length 1–100 and not blank. Optional/null phoneNumber: optional + then 9–15 digits. Omitted/null fields remain unchanged; {} is a no-op. Null cannot clear phoneNumber. Email is not editable.

Request:

```json
{
  "name": "Updated Display Name"
}
```

Success: 200.

```json
{
  "name": "Updated Display Name",
  "email": "person@example.invalid",
  "phoneNumber": null
}
```
Specific error: 400 `Name cannot be blank` for nonempty whitespace-only name; empty/overlong name can fail validation earlier. Common identity errors apply.

### POST /api/v1/reports

Required fields: type (report enum), latitude and longitude (coordinate rules). No expiry, owner, description, or title input.

Request:

```json
{
  "type": "LOW_LIGHT",
  "latitude": 45.7515,
  "longitude": 21.2286
}
```

Success: 201.

```json
{
  "id": 101,
  "type": "LOW_LIGHT",
  "latitude": 45.7515,
  "longitude": 21.2286,
  "createdAt": "2026-11-14T10:00:00",
  "expiresAt": "2026-11-15T10:00:00"
}
```
All fields present/non-null. IDs integers, coordinates numbers, type string, timestamps strings. Server sets expiry 24 hours after creation. Specific error: 400 `Invalid coordinates`, or earlier `Validation failed`. Common identity errors apply.

### GET /api/v1/reports

No body. Active reports only: expiresAt strictly later than server current time. Empty result is []. No guaranteed sort order, pagination, or viewport filtering.

Success: 200.

```json
[
  {
    "id": 101,
    "type": "LOW_LIGHT",
    "latitude": 45.7515,
    "longitude": 21.2286,
    "createdAt": "2026-11-14T10:00:00",
    "expiresAt": "2026-11-15T10:00:00"
  }
]
```
Valid auth token required in auth; this read does not initialize a profile. No report edit/delete endpoint.

### POST /api/v1/trusted-contacts

Required contactEmail: nonblank valid email string, matched case-insensitively. Recipient needs an existing backend profile; Auth0 login alone without a profile-initializing call may be insufficient.

Request:

```json
{
  "contactEmail": "recipient@example.invalid"
}
```

Success: 201.

```json
{
  "id": 201,
  "userId": 11,
  "userName": "Example Sender",
  "userEmail": "sender@example.invalid",
  "contactUserId": 12,
  "contactUserName": "Example Recipient",
  "contactUserEmail": "recipient@example.invalid",
  "status": "PENDING"
}
```
All fields present/non-null. id is the relationship ID; user* identify inviter, contactUser* identify recipient. IDs are integers; names/emails/status strings. Relationship starts PENDING.

| HTTP | Exact message | Situation |
|---|---|---|
| 404 | Contact user not found | No recipient profile |
| 400 | You cannot add yourself | Recipient equals acting user |
| 409 | Contact already exists | Same directional pending/accepted relationship already exists |

### GET /api/v1/trusted-contacts/sent

No body. Current user's outgoing relationships, both statuses. Empty [] allowed; no guaranteed ordering. Common identity/shared errors.

Success: 200.

```json
[
  {
    "id": 201,
    "userId": 11,
    "userName": "Example Sender",
    "userEmail": "sender@example.invalid",
    "contactUserId": 12,
    "contactUserName": "Example Recipient",
    "contactUserEmail": "recipient@example.invalid",
    "status": "PENDING"
  }
]
```


### GET /api/v1/trusted-contacts/received

No body. Relationships addressed to current user, both statuses. Empty [] allowed; no guaranteed ordering. Use this endpoint for incoming-invitation controls without requiring a user.id from /users/me.

Success: 200.

```json
[
  {
    "id": 201,
    "userId": 11,
    "userName": "Example Sender",
    "userEmail": "sender@example.invalid",
    "contactUserId": 12,
    "contactUserName": "Example Recipient",
    "contactUserEmail": "recipient@example.invalid",
    "status": "PENDING"
  }
]
```


### PATCH /api/v1/trusted-contacts/{id}/accept

Positive relationship ID; no body. Only recipient can accept a PENDING invitation.

Success: 200.

```json
{
  "id": 201,
  "userId": 11,
  "userName": "Example Sender",
  "userEmail": "sender@example.invalid",
  "contactUserId": 12,
  "contactUserName": "Example Recipient",
  "contactUserEmail": "recipient@example.invalid",
  "status": "ACCEPTED"
}
```
Specific errors: 404 `Contact request not found`; 403 `Only the recipient can accept this request`; 409 `Request is not pending`.

### DELETE /api/v1/trusted-contacts/{id}

Positive relationship ID; no body. Either party can delete a pending or accepted relationship. Deleting pending can act as rejection; no separate reject endpoint. Deleting accepted removes recipient eligibility through this relationship.

Success: 204.
Empty response body; do not parse JSON.
Specific errors: 404 `Contact not found`; 403 `You cannot delete this contact`. Repeating a successful delete returns 404.

### POST /api/v1/sos

Required latitude/longitude, coordinate rules above. No sender, status, recipients, message, or countdown input.

Request:

```json
{
  "latitude": 45.7515,
  "longitude": 21.2286
}
```

Success: 201.

```json
{
  "id": 301,
  "senderId": 11,
  "senderName": "Example Sender",
  "latitude": 45.7515,
  "longitude": 21.2286,
  "createdAt": "2026-11-14T10:05:00",
  "status": "ACTIVE"
}
```
All fields present/non-null. IDs integers, senderName/status strings, coordinates numbers, createdAt string. Specific error: 400 `Invalid coordinates` or earlier validation error. Common identity errors apply. No accepted contacts is not rejected; there is no delivery receipt/count. Multiple active alerts are allowed. Avoid automatic POST retry after uncertain network outcome.

### GET /api/v1/sos/mine

No body. Current sender's alerts, all statuses; empty [] allowed. No guaranteed ordering. Common identity/shared errors.

Success: 200.

```json
[
  {
    "id": 301,
    "senderId": 11,
    "senderName": "Example Sender",
    "latitude": 45.7515,
    "longitude": 21.2286,
    "createdAt": "2026-11-14T10:05:00",
    "status": "ACTIVE"
  }
]
```


### GET /api/v1/sos/received

No body. ACTIVE alerts from senders who invited the current user and whose relationship is currently ACCEPTED; newest first. Empty [] allowed.

Success: 200.

```json
[
  {
    "id": 301,
    "senderId": 11,
    "senderName": "Example Sender",
    "latitude": 45.7515,
    "longitude": 21.2286,
    "createdAt": "2026-11-14T10:05:00",
    "status": "ACTIVE"
  }
]
```
Recipient sees sender ID/name, snapshot coordinates, timestamp, alert ID/status; no phone/email. Eligibility is checked when polling; later acceptance can expose an already-active alert. Resolution/contact deletion removes it from future received lists.

### PATCH /api/v1/sos/{id}/resolve

Positive alert ID; no body. Only original sender can resolve an ACTIVE alert.

Success: 200.

```json
{
  "id": 301,
  "senderId": 11,
  "senderName": "Example Sender",
  "latitude": 45.7515,
  "longitude": 21.2286,
  "createdAt": "2026-11-14T10:05:00",
  "status": "RESOLVED"
}
```
Specific errors: 404 `SOS alert not found`; 403 `You cannot resolve this alert`; 409 `SOS alert is not active`. No cancel, delete, live-location update, or automatic SOS expiry endpoint.

### POST /api/v1/routes

Required origin/destination objects, each with required latitude/longitude numbers. Valid distinct points required. No user ID, polygons, routing profile, or provider credential input.

Request:

```json
{
  "origin": {
    "latitude": 45.7489,
    "longitude": 21.2257
  },
  "destination": {
    "latitude": 45.7542,
    "longitude": 21.2315
  }
}
```

Success: 200.

```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [
        21.2257,
        45.7489
      ],
      [
        21.2315,
        45.7542
      ]
    ]
  },
  "distanceMeters": 1000,
  "durationSeconds": 750,
  "avoidanceApplied": true,
  "avoidanceLimited": false,
  "avoidancePolygonCount": 1
}
```
The example geometry/metrics are illustrative, not a verified provider route.

Fallback success example:

```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [
        21.2257,
        45.7489
      ],
      [
        21.2315,
        45.7542
      ]
    ]
  },
  "distanceMeters": 1000,
  "durationSeconds": 750,
  "avoidanceApplied": false,
  "avoidanceLimited": true,
  "avoidancePolygonCount": 0,
  "warning": "No route was found with avoidance. This route does not avoid reported areas."
}
```

| Response field | Observable contract |
|---|---|
| geometry | Non-null GeoJSON LineString geometry, not Feature/FeatureCollection; at least two positions; each has at least longitude/latitude; extra provider dimensions may be preserved |
| distanceMeters | Nonnegative finite number |
| durationSeconds | Nonnegative finite estimated walking seconds |
| avoidanceApplied | Boolean: successful provider request included selected zones; not an independent intersection check/safety guarantee |
| avoidanceLimited | Boolean: cap/unsupported geometry reduced coverage, or fallback removed avoidance |
| warning | Optional string, omitted when unnecessary; display whenever present |
| avoidancePolygonCount | Integer 0–100 used on successful request, zero without avoidance/after fallback |

No relevant active reports means ordinary route: both flags false, count 0, no warning. Do not infer safety from absence of reports.

| HTTP | Exact message | Cause |
|---|---|---|
| 400 | Provide distinct valid origin and destination coordinates | Invalid/nonfinite or identical endpoints; validation may reject earlier |
| 400 | Polar and antimeridian journeys are not supported | Absolute endpoint latitude >85 or longitude separation >180 degrees |
| 400 | Antimeridian routing corridor is not supported | Expanded corridor crosses longitude boundary |
| 422 | Journey exceeds supported avoidance limits | Selected avoidance extent/journey beyond limits |
| 422 | No walking route could be found | Provider no-route/point-not-found without successful allowed fallback |
| 502 | Routing provider rejected server credentials | Provider rejects server authentication; changing Auth0 token will not fix this |
| 502 | Routing provider rejected the routing request | Other provider rejection |
| 502 | Invalid response from routing provider | Malformed/oversized/missing expected route data |
| 503 | Routing is not configured: set ORS_API_KEY | Missing server configuration; inform owner, never collect a key in frontend |
| 503 | Routing corridor margin is misconfigured | Invalid server setting |
| 503 | Routing provider unavailable | Connection unavailable |
| 503 | Routing provider temporarily unavailable | Provider rate limit/5xx |
| 504 | Routing provider timed out | Provider timeout |

## 5. Routing behavior and frontend responsibilities

Backend selects active reports within the origin/destination bounding box expanded by a configurable margin (default about 500 m), creates approximately 50 m diamond zones, deduplicates centers within about 25 m, prioritizes zones nearest the straight journey segment, and submits at most 100 zones. Filtering/deduplication alone do not set avoidanceLimited. Cap or unsupported report geometry omission does, with exact warning "Avoidance coverage was limited to selected report areas." Coverage of every report or a wide route detour is not guaranteed.

Avoidance has conservative combined 20 km extent checks with padding and a 150 km approximate direct-journey limit; actual routed distance can exceed that estimate and be rejected. Polar/antimeridian journeys are explicitly unsupported. Unsupported individual zones can be omitted with limited coverage.

Exactly one ordinary-route fallback is possible only when the first request included zones and ORS responds HTTP 400/404 with no-route code 2009. Point-not-found code 2010, unverified geometry errors, generic errors, 401/403/429/5xx, timeouts, invalid frontend input, and initially zone-free requests do not trigger fallback. Failure of the second request yields a sanitized error, not a third attempt. Show the explicit warning whenever avoidanceApplied=false with warning present. Even avoidanceApplied=true never means guaranteed safe.

Frontend responsibilities:
- Obtain GPS through browser/device APIs; manage location permissions, denied/stale/unavailable fixes, live map state and markers.
- Display report icons and returned GeoJSON route geometry, distance/duration and warnings.
- Handle Auth0 login, access-token acquisition/renewal, and authenticated UI state.
- Implement destination selection/search through existing frontend capabilities; this API exposes no geocoding, tiles, turn-by-turn instruction feed, or continuous navigation.
- Do not calculate avoidance polygons, call OpenRouteService directly, or obtain its API key.
- Choose when to refresh reports/recalculate routes. GPS changes and report updates do not automatically update existing route geometry.
- Implement SOS countdown and REST polling; no WebSocket, push notification, SMS, emergency-service call or guaranteed delivery exists.

## 6. End-to-end frontend workflows

### Login -> authenticated application state

1. Owner confirms public Auth0 settings and actual callback/origins.
2. Auth0 SPA SDK login with PKCE -> access token for API audience.
3. GET /api/v1/users/me with Bearer header.
4. On 200, store returned profile and enter authenticated UI. On token 401, renew/re-authenticate; on claim-related 401/403 or 409, show actionable error rather than login loops.
5. Use SDK-managed valid tokens for later calls. Clear account-specific UI state on logout/account change.

### Active reports -> destination -> route display

1. GET /api/v1/reports; draw markers with type/coordinates.
2. Get permission and a usable GPS fix; user selects destination.
3. POST /api/v1/routes with origin/destination.
4. Draw geometry using GeoJSON-aware layer or correctly converted map coordinates. Show distance/duration and warning/limited-coverage status.
5. Refresh/recalculate only when frontend explicitly chooses; server does not push updates.

### Invitation -> acceptance -> SOS -> polling -> resolution

1. In auth, both A and B log in and successfully call /users/me.
2. A POSTs /trusted-contacts with B's email. A sees PENDING in /sent, B in /received.
3. B PATCHes /trusted-contacts/{id}/accept. A cannot accept its outgoing invitation.
4. A's frontend shows a **3-second cancellable countdown BEFORE** POST /sos. Cancellation during countdown sends no request. Timing is a frontend requirement, not server enforcement.
5. After successful POST the alert exists immediately; no cancel endpoint exists. Do not imply countdown cancellation undoes an already-sent request.
6. B polls GET /sos/received approximately **every 10 seconds while the app is active**, using B's token; display snapshot alert locations, reconcile by alert ID, stop polling on logout/inactivity, avoid overlapping requests. This interval is frontend behavior, not a server delivery/rate guarantee.
7. A reads /sos/mine and PATCHes /sos/{id}/resolve. B's next received list omits the resolved alert; B cannot resolve A's alert.

An accepted A -> B relationship lets B receive A's alerts, not vice versa. For reciprocal visibility B must invite A and A must accept separately. Do not promise delivery or emergency response; there is no delivery receipt, background push, SMS or emergency-service integration.

## 7. Limitations, discrepancies and UNKNOWN items

Application data resets on backend restart. Auth0 login can still succeed afterward, but profiles must be initialized again and reports/invitations/alerts are gone. Most lists are unordered; only received SOS is explicitly newest first. No user directory, arbitrary-user impersonation, phone clearing, report modification or automatic SOS expiry is exposed.

Clarifications versus existing setup narratives:
- Auth setup says first use occurs "only on a current-user endpoint". If interpreted as only /users/me this is too narrow: report creation and all contact/SOS operations can also initialize the acting profile. Frontend should still call /users/me first.
- Auth setup's broad "missing/invalid claims -> 401" needs qualification: absent/false/nonboolean email_verified is 403; required string-claim failures are 401.
- Token-free dev instructions are not a promise of browser CORS; dev has no enabled CORS policy. Use a same-origin proxy.
- No conflicting route JSON/fallback contract was found in routing setup. Its illustrative route is not evidence of a real ORS response; 150 km direct estimate is not actual routed-distance assurance.

**UNKNOWN - verify inventory**
1. Public SPA Client ID: <FILL_IN_BY_BACKEND_OWNER>.
2. Actual frontend development/deployment origin(s) and port: <FILL_IN_BY_BACKEND_OWNER>.
3. Exact frontend callback path/URL(s) and Dashboard Allowed Callback URLs: <FILL_IN_BY_BACKEND_OWNER>.
4. Exact logout return URL(s) and Dashboard Allowed Logout URLs: <FILL_IN_BY_BACKEND_OWNER>.
5. Dashboard Allowed Web Origins and actual backend FRONTEND_ORIGIN list: <FILL_IN_BY_BACKEND_OWNER>.
6. Whether Dashboard SPA settings and required Post Login Action are correctly deployed; owner/live-login confirmation needed.
7. Deployment backend API origin and runtime overrides to the default local port.
8. Server timezone for offset-free report/SOS timestamps.
9. Exact non-positive path-ID validation message/shape; send only positive IDs and handle errors defensively.
10. Live ORS availability and actual avoidance/intersection behavior; source/mocked tests do not establish live results.

## 8. Existing frontend adaptation checklist

- Inspect before editing; preserve correct UI and API behavior.
- Align base URL, /api/v1 prefix, methods, body structures, bare arrays and 204 handling.
- Align token audience, access-token Bearer header, initial /users/me call and logout cleanup.
- Configure owner-confirmed callbacks/origins; use proxy for dev CORS.
- Match exact enums and map type to icons in frontend.
- Keep coordinate order correct; do not double-convert GeoJSON.
- Handle null phoneNumber, omitted warning, and absent user.id.
- Show field validation, auth/permission distinctions, conflicts, routing outages and warnings.
- Use incoming/outgoing contact endpoints for permission UI and directional alert visibility.
- Keep countdown before POST; poll only while active; resolve as sender.
- Never promise safety, guaranteed delivery or emergency response.
- Adapt mismatches to this contract; ask owner only about UNKNOWN items or unresolved ambiguity.


## 9. OpenStreetMap 24/7 places

### GET /api/v1/places/open-24-7

No parameters or request body. In auth mode send the same Bearer access token as for other endpoints; missing/invalid tokens return the existing standardized 401. In dev no token is required. Existing CORS behavior is unchanged.

200 returns a bare JSON array, not an envelope. Fields: id (string OSM type/id), name (string or null), latitude/longitude (finite numbers), category (string from OSM tags, not an enum). shop takes priority over amenity=pharmacy/fuel. Only opening_hours exactly 24/7 is included. Duplicate type/id values and malformed individual elements are filtered. Unnamed places remain present with name:null. Frontend chooses icons and must provide an icon fallback for unexpected category strings.

Real example from the supplied snapshot (only the API fields):

```json
[
  {
    "id": "node/265555548",
    "name": "Petrom",
    "latitude": 45.7527997,
    "longitude": 21.2548194,
    "category": "fuel"
  }
]
```

This is an excerpt, not the entire response. Locations are loaded once from the local snapshot into memory; GET makes no external calls. Team updates require replacing the snapshot and restarting the backend. There is no refresh endpoint.

A valid snapshot with no matching places returns []. A missing, unreadable, malformed JSON, or structurally invalid snapshot does NOT stop the backend. It logs a clear error and this endpoint returns 503 using the standard error object, with exact message `24/7 places snapshot is unavailable`. It never silently substitutes [] for such a snapshot. Other endpoints remain available. Frontend should show places as temporarily unavailable on 503, while keeping the rest of the map usable.

Show markers as **“Program 24/7 conform OpenStreetMap”**, not “open now”; this is neither verified current opening status nor a safety guarantee. Show visible attribution **© OpenStreetMap contributors** and respect the ODbL license. No route selection or avoidance behavior is changed by these places.

Documented intended demo bbox: south 45.69, west 21.14, north 45.80, east 21.29 (Timisoara vicinity), not an administrative boundary. The raw export does not prove which query/bbox was used; the team must confirm the export area. Any osm3s.timestamp_osm_base describes the OSM data state, not physical opening-hours verification or necessarily download time. No fetchedAt is exposed.
