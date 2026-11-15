# Backend Context — Unihack 2026 Women's Safety Web App

> Updated from the original `BACKEND_CONTEXT.md` using the implementation summaries and service code shared in chat. **This document is a handoff, not an audit of the current repository.** Codex must inspect actual code before editing; if anything differs, the repository is the source of truth.

## 1. Goal and scope

48-hour hackathon MVP: pedestrian navigation web app showing community risk reports, routes avoiding reported areas where routing API supports it, and SOS alerts to accepted trusted contacts. This repository is **backend only**; frontend is built separately. Prioritize working local demo; avoid needless infrastructure.

## 2. Stack / conventions

- Java, Spring Boot, Maven, IntelliJ IDEA; check `pom.xml` for the **actual Spring Boot version** (newer `spring-boot-starter-webmvc` was mentioned).
- Spring Web MVC, Spring Data JPA / Hibernate, Jakarta Validation, Lombok (`@Getter`, `@Setter`, `@Builder`; no entity `@Data`).
- H2 in-memory, `jdbc:h2:mem:testdb`; `spring.jpa.hibernate.ddl-auto=update`, `show-sql=true` were reported; PostgreSQL is only a future possibility.
- Main package: `com.hackathon.backend`; subpackages `config`, `controllers`, `exceptions`, `mappers`, `model.entities`, `model.dtos` (`users`, `reports`, `trustedContacts`, `sosAlerts`), `repositories`, `services`.
- All REST endpoints implemented so far have prefix **`/api/v1`**. Verify exact annotations in controllers.
- Entity timestamps use **`LocalDateTime`** by deliberate choice, not `Instant`. Error response timestamps use `OffsetDateTime`.
- Relationships are `LAZY`; enums stored as strings. DTOs are Java records with `@Builder` and appropriate Jakarta Validation annotations.
- Spring Security / Auth0 JWT is **the next task**, not confirmed as implemented. Auth0 configuration may already be present in `application.properties`; inspect and preserve correct values. The issuer must be the full HTTPS URL, including trailing `/` (see section 5). Do not assume security classes from previous proposals were created.

## 3. Implemented components (reported and partly exercised in Postman)

### Entities and enums
- `UserEntity` (table `app_users`): id, name, unique email, optional phone number. **Auth0 subject field not yet confirmed; inspect actual entity.**
- `TrustedContactEntity`: `user`, `contactUser`, `status` default `PENDING`; unique `(user_id, contact_user_id)`; relationship is directional.
- `ReportEntity`: owner, report type, latitude/longitude, `createdAt`, `expiresAt` set in `@PrePersist` (+24h).
- `SosAlertEntity`: sender, latitude/longitude, created time, status default `ACTIVE`.
- Enums: `ReportType` (`LOW_LIGHT`, `SUSPICIOUS_PERSON`, `ISOLATED_AREA`, `DAMAGED_ROAD`, `OTHER`), `TrustedContactStatus` (`PENDING`, `ACCEPTED`), `SosAlertStatus` (`ACTIVE`, `CANCELLED`, `RESOLVED`).

### DTOs
- Users: `UserCreateDTO` (development-only), `UserReadDTO`, `UserUpdateDTO`.
- Reports: `ReportCreateDTO`, `ReportReadDTO`.
- Trusted contacts: **`TrustedContactsCreateDTO`** (plural `Contacts` is intentional; accepts `contactEmail`), `TrustedContactReadDTO`.
- SOS: `SosAlertCreateDTO`, `SosAlertReadDTO`.
- Check actual record fields rather than inferring them from this document. Previous summary noted `ReportReadDTO.id`, `SosAlertReadDTO.id`, `SosAlertReadDTO.senderName` are used by mappers.

### Mappers
`UserMapper`, `TrustedContactMapper`, `ReportMapper`, `SosAlertMapper` are Spring `@Component` classes using builders. `UserMapper` normalizes emails via `trim().toLowerCase()`. Time creation belongs to entity `@PrePersist`, not mapper.

### Repositories
`UserRepository`, `TrustedContactRepository`, `ReportRepository`, `SosAlertRepository`; methods described in shared services include:
- `UserRepository`: `existsByEmailIgnoreCase`, `findByEmailIgnoreCase`.
- `TrustedContactRepository`: `existsByUserIdAndContactUserId`, `findByUserId`, `findByContactUserId`, inherited `findById`.
- `ReportRepository`: `findByExpiresAtAfter`, `deleteByExpiresAtBefore` (reported).
- `SosAlertRepository`: `findBySenderId`, `findReceivedAlerts(currentUserId, SosAlertStatus.ACTIVE)`; query should restrict recipients to contacts with `ACCEPTED` status.

### Services / actual business rules
- `UserService`: `create`, `getMe`, `updateMe`. Create checks duplicate email (409). Update rejects blank non-null name (400). User creation is for development, not an anonymous production registration API.
- `TrustedContactService`: create by contact email (404 if recipient missing, 400 self-add, 409 duplicate); `getSent`, `getReceived`, `accept` (only the invited recipient; PENDING -> ACCEPTED; 403/409 otherwise), `delete` (either party, 403 otherwise).
- `SosAlertService`: `create`, `getMine`, `getReceived`, `resolve` (only original sender; ACTIVE -> RESOLVED; 403/409 otherwise). SOS is not physically deleted. Validate non-null, finite GPS latitude [-90,90] and longitude [-180,180].
- `ReportService`: `create`, `getAllActive`; filter `expiresAt > LocalDateTime.now()`; validate finite/in-range GPS coordinates.
- `CurrentUserService`: currently `@Profile("dev")`, looks up **one fixed email** configured as `app.dev-user-email` in H2; throws 401 if missing. **This is a temporary identity provider and not real login.** The four business services directly inject `CurrentUserService` and call `getCurrentUser()`.
- All listed business services use `@Transactional` and generally throw `ResponseStatusException` with appropriate HTTP statuses and explicit reason messages. Do not replace these needlessly.

### Controllers — implemented endpoints (verify actual mappings)
- Users: `POST /api/v1/users`, `GET /api/v1/users/me`, `PUT /api/v1/users/me`.
- Trusted contacts: `POST /api/v1/trusted-contacts`, `GET /api/v1/trusted-contacts/sent`, `GET /api/v1/trusted-contacts/received`, `PATCH /api/v1/trusted-contacts/{id}/accept`, `DELETE /api/v1/trusted-contacts/{id}`.
- SOS: `POST /api/v1/sos`, `GET /api/v1/sos/mine`, `GET /api/v1/sos/received`, `PATCH /api/v1/sos/{id}/resolve`.
- Reports: `POST /api/v1/reports`, `GET /api/v1/reports` (active only).
- No endpoint accepts arbitrary `userId` to impersonate a user; avoid global user list/delete endpoints.

### Centralized exception handling
- `exceptions/ErrorResponse`: record built with Lombok `@Builder`; `status`, `error`, `message`, `timestamp` (`OffsetDateTime`), optional `validationErrors` map. `@JsonInclude(NON_NULL)`.
- `GlobalExceptionHandler` via `@RestControllerAdvice` handles not-found, duplicate, `@Valid`/`MethodArgumentNotValidException`, unreadable JSON, type mismatch, missing parameter, `ConstraintViolationException`, unknown resource, unsupported method/media type, DB integrity violations, unexpected errors, and a **dedicated `ResponseStatusException` handler** to preserve business HTTP status/reason. An `AccessDeniedException` handler was also proposed; verify whether present.
- Custom `ResourceNotFoundException`, `DuplicateResourceException` may exist but the supplied business services currently use `ResponseStatusException` instead.
- Security-filter-level 401/403 must be formatted separately with `AuthenticationEntryPoint` / `AccessDeniedHandler`; `@RestControllerAdvice` does not automatically cover them.

## 4. Postman test status

The user reports successful tests for:
- User creation, `GET /users/me`.
- Valid duplicate email -> **409** `Email already registered`; invalid/missing DTO fields -> **400** with `validationErrors` (these are different cases).
- Malformed JSON -> **400**, nonexistent URL -> **404**.
- Create/list active reports; invalid GPS coordinates -> **400**.
- Trusted contacts: invitation to another existing user, `GET /sent`, duplicate invite -> **409**, invite yourself -> **400**, nonexistent user -> **404**, sender attempting accept -> **403**.

**Not yet confirmed tested:** accepting as recipient, deleting contact, SOS end-to-end, multiple authenticated identities, JWT security, GeoJSON or routing.

## 5. Next task for Codex: implement Spring Security + Auth0 JWT

1. **Inspect the real repository first**, especially `pom.xml`, all config and controllers, `UserEntity`, DTOs, mappers, repositories, `CurrentUserService`, `GlobalExceptionHandler` and current Auth0 properties. Use only dependencies appropriate to the actual Boot version.
2. Set up Spring Security as **OAuth2 Resource Server**, verifying JWT signature, issuer, expiration and expected API audience. Auth0 handles interactive login in frontend (Authorization Code + PKCE). Backend should not implement password login or mint JWTs.
3. Preserve a **local-only** `dev` configuration for current fixed-user testing, and a secure `auth` configuration (mutually exclusive). **Set the active profile explicitly:** run local development with `dev`, and the authenticated demo with `auth`. Do not silently fall back to `dev`; fail closed if absent or misconfigured. Never deploy an open `dev` security chain. Current `CurrentUserService` is `@Profile("dev")`; refactor to a shared interface/contract with distinct `dev` and `auth` implementations so existing services can keep calling `getCurrentUser()` without business-code changes.
4. Map a verified JWT identity using issuer + `sub` (or `sub` within the one trusted issuer), **never arbitrary request userId or email alone**. Add a unique Auth0 identity column if needed and preserve entity relationships. **Provisioning decision for this MVP: use an Auth0 Post Login Action, not a userinfo HTTP call.** The Action adds custom claims `https://unihack-project-api/email`, `https://unihack-project-api/name`, and `https://unihack-project-api/email_verified` to the **access token** for this API. Only use claims from a JWT that the resource server has already verified. If required claims are missing/invalid or email is not verified, reject provisioning with a clear 401/403 response and do not create a local user. Normalize email; if a *new* Auth0 `sub` presents an email already stored for another provider identity (or a legacy local record), return **409 Conflict** and **do not auto-link accounts**. Handle races/uniqueness safely, and do not expose sensitive data in errors.
5. Protect all private endpoints in `auth` mode, including SOS and contacts; disable or restrict `POST /api/v1/users` (development-only manual create) under `auth`. Preserve existing 403 business rules. Restrict CORS to configured frontend origin(s).
6. Return consistent `ErrorResponse` JSON for filter-level 401 and 403, not only service errors. Avoid leaking stack traces, tokens or coordinates in client errors/logs. Handle Spring Security failures separately from MVC exceptions.
7. Config: the current Auth0 identifiers may remain in `application.properties` for this hackathon, since **issuer, audience and public SPA client ID are not secrets**. Ensure issuer URI is a **complete HTTPS URL with trailing slash**; for this project the currently provided values are:
   ```properties
   spring.security.oauth2.resourceserver.jwt.issuer-uri=https://dev-h6e6m3uck5zb26m4.us.auth0.com/
   spring.security.oauth2.resourceserver.jwt.audiences=https://unihack-project-api
   ```
   Alternatively use `${AUTH0_ISSUER_URI}` and `${AUTH0_AUDIENCE}` environment variables. Treat Auth0 client secrets, management tokens, JWTs and private keys as secrets and never commit or log them. Configure `FRONTEND_ORIGIN` (or equivalent) for restrictive CORS. Resource-server RS256 validation needs no Auth0 client secret. The SPA application for login/Postman PKCE still needs to be configured in Auth0; for Postman allow callback `https://oauth.pstmn.io/v1/callback` in the appropriate Auth0 application, with its own client ID. Document manual Auth0 Dashboard steps, including deploying/attaching the Post Login Action to the Login Flow.
8. **Keep verification lightweight for the 48h MVP.** At minimum verify: no token -> 401; valid token -> correct current user; two real Auth0 identities -> invited recipient can accept, sender cannot. Extra automated coverage (bad/expired/wrong-audience JWT, provisioning edge cases, 403 response shape) is optional if time allows. Avoid introducing major test infrastructure.
9. Compile the application, run any existing Maven tests, and report results honestly; do not add a large new test suite. Provide files changed, brief Auth0 Dashboard setup (including SPA application, Action and Postman PKCE callback), manual Postman steps, and outstanding limitations. Do not deploy or change credentials.

**Important:** Earlier chat contained *suggested* `SecurityConfig`, `DevSecurityConfig` and `AuthCurrentUserService` snippets, but these are **not evidence that any of those files actually exist**. Inspect before creating/replacing.

## 6. Remaining MVP work (after auth)

1. For each active report, calculate an approximately 50 m N/S/E/W diamond; generate valid closed GeoJSON polygons in `[longitude, latitude]` order, not stored in DB.
2. Integrate OpenRouteService, with routing that attempts to avoid report polygons when `avoid_polygons` is supported by relevant routing profile/API limitations. Never describe a route as guaranteed safe.
3. Frontend SOS countdown is 3 seconds and cancellable **before** POST. Once sent, accepted contacts see active alerts through authenticated REST polling every 10 seconds, while their app is active. No WebSocket, SMS or 112 call in MVP.
4. Later only if time allows: scheduled report cleanup, rate limiting/report abuse mitigation, optional PostgreSQL, voice warnings (ElevenLabs), contextual assistant (Gemini), deployment (Vultr).

## 7. Security/privacy guardrails

- Only accepted contacts may access sender SOS location; always verify permissions server-side.
- Do not expose phone, email or GPS unnecessarily; avoid sensitive data in logs.
- Validate coordinates. SOS polling isn't guaranteed delivery; no emergency-service integration.
- No secrets in git: use environment variables and ignored local files. `.gitignore` will not protect a previously tracked file. Rotate exposed secrets; inspect history if needed.

## 8. Collaboration rules

- Prefer small, practical changes appropriate to a 48h MVP.
- Inspect actual code; don't guess classes, DTO fields, mappings or Maven versions.
- Explain paths, modifications, dependencies, and a minimal test for each unit of work.
- Preserve entity time types, relationships, existing DTO conventions and endpoint behavior.
- Mark optional improvements explicitly; point out H2/PostgreSQL differences.
- If implementation and this context conflict, trust current source code and tell the user.
