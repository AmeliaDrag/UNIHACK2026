# Auth0 authentication setup

## Files changed

- `config/SecurityConfig.java`, `DevSecurityConfig.java`: exclusive profile chains, stateless RS256 bearer authentication, issuer/time/audience/required-subject validation, exact-origin CORS, blocked manual user creation and H2 access in auth.
- New `config/SecurityProfileConfig.java`, `SecurityErrorHandler.java`: explicit profile selection and existing ErrorResponse JSON for security 401/403.
- `services/CurrentUserService.java`: shared contract. New `DevCurrentUserService.java`, `AuthCurrentUserService.java`, `AuthUserProvisioningService.java`: fixed dev identity or verified JWT identity with isolated provisioning transactions and race-safe uniqueness handling.
- `model/entities/UserEntity.java`: unique issuer/subject pair using existing OAuth fields.
- `mappers/UserMapper.java`: normalized stored email.
- `exceptions/GlobalExceptionHandler.java`: enabled the existing access-denied handler.
- `application.properties`, new `application-dev.properties`, `application-auth.properties`: explicit modes, dev-only console, unchanged Auth0 identifiers and database credentials.
- Tests: explicit dev context and focused auth integration/profile checks. No production dependency changes.

Java paths above are under `src/main/java/com/hackathon/backend`; properties are under `src/main/resources`.

## Auth0 Dashboard (manual)

1. Create or confirm the API identifier `https://unihack-project-api` with RS256 signing.
2. Create/configure a Single Page Application for frontend Authorization Code with PKCE. Set its allowed callback URLs, logout URLs, and web origins to the actual frontend addresses. Use its public client ID in the frontend. No client secret belongs in the frontend or backend resource server.
3. For Postman, configure a suitable separate public application with Authorization Code + PKCE and callback `https://oauth.pstmn.io/v1/callback`. Use that application's client ID and no client secret.
4. Create a Post Login Action with the code below, deploy it, attach it to the Login Flow, and apply the flow. Verify the demo users' emails through Auth0's normal email verification flow. Obtain fresh access tokens after changing the Action.

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const audience = 'https://unihack-project-api';
  if (event.resource_server?.identifier !== audience) return;
  api.accessToken.setCustomClaim(`${audience}/email`, event.user.email);
  api.accessToken.setCustomClaim(`${audience}/name`, event.user.name || event.user.nickname);
  api.accessToken.setCustomClaim(`${audience}/email_verified`, event.user.email_verified === true);
};
```

The backend provisions only on a current-user endpoint using a validated access token. It requires nonblank name/email and boolean `email_verified: true` for a new identity. Missing/invalid claims return 401; unverified email returns 403. An email already stored for another identity or a legacy dev record returns 409, without linking. Existing identities resolve by issuer + subject and keep their locally edited profile.

References: [Auth0 custom claims](https://support.auth0.com/center/s/article/adding-custom-claims-to-tokens), [Spring Security JWT validation](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).

## Run in PowerShell

```powershell
$env:FRONTEND_ORIGIN = 'http://localhost:5173' # Replace with your actual frontend origin
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=auth'
```

`FRONTEND_ORIGIN` is required in auth mode; use comma-separated exact origins without paths/trailing slashes. Postman desktop is not restricted by browser CORS. Auth0 discovery is not required at startup; signature verification fetches Auth0's public signing keys on demand. Internet access to the issuer is needed for uncached keys.

For the existing token-free local flow:

```powershell
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=dev'
```

Create `ana@test.com` with `POST http://localhost:8080/api/v1/users` and body `{"name":"Ana","email":"ana@test.com"}`. Then use the existing endpoints without a token. Dev permits requests and is for local testing only. No profile, or both dev and auth, fails startup. H2 is in-memory: users and reports disappear on restart; no database migration or persistence infrastructure was added.

## Postman

1. Set collection authorization to OAuth 2.0, grant type **Authorization Code (With PKCE)**, challenge method **SHA-256**, and authorize using the browser.
2. Callback: `https://oauth.pstmn.io/v1/callback`.
3. Auth URL: `https://dev-h6e6m3uck5zb26m4.us.auth0.com/authorize`.
4. Access Token URL: `https://dev-h6e6m3uck5zb26m4.us.auth0.com/oauth/token`.
5. Client ID: the public Postman application's client ID. Leave client secret empty. Scope: `openid profile email`.
6. Add authorization request parameter `audience=https://unihack-project-api` (Postman's advanced authorization parameters). Get a new token, sign in as a verified user, then **Use Token**. Send the **access token**, not the ID token, as `Authorization: Bearer <access_token>`.
7. Call `GET http://localhost:8080/api/v1/users/me`: expect 200 and that user's profile. Repeat without authorization: expect standardized JSON 401. With a valid token, `POST /api/v1/users` returns JSON 403.
8. Obtain tokens for two separate verified Auth0 users A and B (log out/use a separate browser session between logins). Call `/users/me` once with each to provision both. As A, POST `/api/v1/trusted-contacts` with `{"contactEmail":"B_EMAIL"}`; save the returned id. A's PATCH `/api/v1/trusted-contacts/{id}/accept` must return 403; B's must return 200 with `ACCEPTED`.
9. Existing report/SOS endpoints use the same bearer header. Business permissions and payloads are unchanged.

## Verification

```powershell
.\mvnw.cmd -DskipTests compile
.\mvnw.cmd test
```

Auth integration tests substitute the JWT decoder to exercise filters, JSON responses, provisioning, profile updates, and two-identity authorization without external credentials. They do not prove a real Auth0 login or live signing-key validation; complete the Postman check above with your own users. Unique database constraints and separate transaction rollback protect concurrent provisioning. Production database migration is outside this H2 hackathon scope.
