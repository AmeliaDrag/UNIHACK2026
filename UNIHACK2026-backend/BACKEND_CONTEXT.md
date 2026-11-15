# UNIHACK 2026 — Stadiul actual al backendului

**Data rezumatului:** 14 noiembrie 2026  
**Scop:** context de continuare pentru un nou chat. Acest fișier descrie stadiul relatat al proiectului, nu reprezintă un audit independent al repository-ului. **Codul real are prioritate** dacă există diferențe între documente.

## 1. Proiectul și responsabilitățile

Construim un MVP pentru un hackathon de 48 de ore: aplicație web de siguranță pietonală, în special pentru femei. Utilizatorii pot raporta zone cu potențial risc, pot solicita rute pietonale care încearcă să evite raportările și pot trimite alerte SOS contactelor de încredere.

Eu lucrez **exclusiv la backend**; colegii dezvoltă frontendul separat. Prioritatea este un demo funcțional, fără overengineering. Frontendul era deja parțial construit și nu a fost proiectat neapărat după contractul backendului.

## 2. Stack și convenții

- Java, Spring Boot, Maven, Spring Web MVC, Spring Data JPA/Hibernate, Jakarta Validation, Lombok.
- Bază de date **H2 in-memory**: datele aplicației se pierd la repornirea backendului.
- Spring Security OAuth2 Resource Server + Auth0 JWT.
- API REST cu prefixul **`/api/v1`**, local de regulă la `http://localhost:8080/api/v1`.
- Pachet principal: `com.hackathon.backend`; componente în `controllers`, `services`, `repositories`, `mappers`, `model.entities`, `model.dtos`, `config`, `exceptions`.
- DTO-uri de tip Java `record`; timestampurile rapoartelor și SOS sunt `LocalDateTime` (fără offset în JSON), în timp ce erorile folosesc timestamp cu offset.
- Pentru versiunea exactă Spring Boot și orice alte detalii: consultați **`pom.xml` și codul actual**, nu presupuneți că vechiul `BACKEND_CONTEXT(4).md` reflectă ultimele implementări.

## 3. Funcționalități backend implementate

### Utilizatori
- Creare manuală utilizator în profilul local `dev` (`POST /users`).
- Citirea și editarea profilului propriu (`GET /users/me`, `PUT /users/me`).
- În profilul `auth`, identitatea este extrasă din JWT; creare manuală prin `POST /users` este blocată.

### Raportări de pericole
- Creare și citire raportări active (`POST /reports`, `GET /reports`).
- Tipuri: `LOW_LIGHT`, `SUSPICIOUS_PERSON`, `ISOLATED_AREA`, `DAMAGED_ROAD`, `OTHER`.
- Au coordonate geografice și expiră după **24 h**. Nu există editare/ștergere raport prin API-ul actual.

### Contacte de încredere
- Invitații prin email, cu status `PENDING` → `ACCEPTED`.
- Relațiile sunt **direcționale**: dacă A invită B și B acceptă, B primește SOS de la A, nu automat și invers.
- Doar destinatarul acceptă invitația; oricare dintre părți poate șterge relația.
- Destinatarul trebuie să aibă deja profil în backend; altfel invitația primește 404.

### SOS
- Creare alertă cu poziția GPS, citirea alertelor proprii, citirea alertelor primite de la contacte acceptate și rezolvarea de către expeditor.
- Doar alertele `ACTIVE` ale expeditorilor eligibili apar în lista primită.
- Nu există endpoint de anulare după trimitere, notificări push, SMS, WebSocket, apel 112 sau garanție de livrare.
- Frontendul trebuie să facă un **countdown anulabil de 3 secunde înainte de POST** și polling la ~**10 secunde** pentru alertele primite cât aplicația este activă.

### Erori
- Erori JSON standardizate prin `ErrorResponse` (`status`, `error`, `message`, `timestamp`, eventual `validationErrors`), inclusiv pentru 401/403 de securitate.

## 4. Auth0 — implementat, dar integrarea reală nu este încă verificată

Codex a implementat profilurile de securitate:

- **`dev`**: testare locală fără token, cu un singur utilizator fix. Nu permite testarea realistă a fluxurilor cu două identități. **Nu are CORS activat pentru apeluri browser cross-origin**; dacă frontendul rulează pe alt port, pentru acest profil este recomandat un proxy de development (de exemplu Vite, apeluri relative `/api/v1`).
- **`auth`**: fiecare endpoint de aplicație necesită `Authorization: Bearer <access_token>` valid. Spring verifică semnătura, issuer, audience și expirarea. CORS este restrâns la originile exacte din `FRONTEND_ORIGIN`. Nu activați `dev` într-un deployment public.

**Auth0 configurat în backend:**
- Domain: `dev-h6e6m3uck5zb26m4.us.auth0.com`
- Issuer: `https://dev-h6e6m3uck5zb26m4.us.auth0.com/`
- API audience: `https://unihack-project-api`
- Semnare API: RS256.

Frontendul trebuie să folosească **Auth0 SPA SDK**, Authorization Code + PKCE, să ceară **access token pentru audience-ul API** și să îl trimită la backend (nu ID token). După autentificare se recomandă `GET /api/v1/users/me` pentru inițializarea profilului. Identitatea backend este legată de `issuer + sub`, nu de un email/userId furnizat de client.

**Post Login Action** din Auth0 adaugă în access token cele trei custom claims necesare pentru primul profil: `https://unihack-project-api/email`, `/name`, `/email_verified` (cu prefixul complet). Pentru un cont nou, emailul trebuie verificat. Claimurile lipsă/invalide pot provoca 401, emailul neverificat 403, iar un email deja asociat unei alte identități 409. Nu se face asociere automată între conturi doar pe baza emailului.

**Rămase pentru Auth0:**
1. De confirmat în Auth0 Dashboard că Post Login Action este deployat și atașat la Login Flow; configurația reală Dashboard nu a fost verificată end-to-end.
2. De obținut **SPA Client ID public** din aplicația Auth0 de tip Single Page Application și transmis colegilor. Nu se transmite Client Secret.
3. De stabilit cu echipa URL-ul/originul frontendului, callback URL, logout URL și Allowed Web Origins; de înregistrat valorile în Auth0 și configurat `FRONTEND_ORIGIN` în backend.
4. Când frontendul este gata: login real cu cel puțin două conturi, token API valid, `/users/me`, invitație acceptată între două persoane și SOS.

Problema veche de login Google în Postman (autentificare în browser aparent reușită, dar finalizare eșuată în Postman) a rămas nerezolvată; **s-a decis verificarea integrării reale prin frontend**, nu consumarea timpului în Postman.

## 5. OpenRouteService (ORS) — implementat, fără apel live verificat

Codex a implementat **`POST /api/v1/routes`**:

1. Frontendul trimite obiecte `origin` și `destination`, fiecare cu `latitude` și `longitude`.
2. Backendul selectează raportări **active** relevante pentru călătorie (bounding box cu marjă implicită ~500 m).
3. Generează pentru raportări romburi GeoJSON de aproximativ **50 m** spre N/V/S/E, cu inele închise și coordonate `[longitude, latitude]`.
4. Reduce raportările foarte apropiate (~25 m), prioritizează zonele apropiate de segmentul A–B, limitează la **100 de poligoane** și le combină într-un `MultiPolygon`.
5. Cere traseu pietonal de la OpenRouteService prin API-ul server-side, folosind poligoanele drept `avoid_polygons`.
6. Returnează `geometry` (GeoJSON `LineString`), `distanceMeters`, `durationSeconds`, `avoidanceApplied`, `avoidanceLimited`, `avoidancePolygonCount` și, la nevoie, `warning`.

**Fallback controlat:** dacă prima cerere a inclus poligoane și ORS întoarce HTTP 400/404 cu codul documentat `2009` (no route), backendul încearcă **o singură dată** fără poligoane. Dacă reușește, răspunde cu `avoidanceApplied=false` și avertisment explicit că ruta nu evită zonele raportate. Nu face fallback pe timeout, 401/403/429/5xx sau erori neconfirmate. O rută nu trebuie prezentată niciodată drept „garantat sigură”. Există limitări pentru deplasări polare/antimeridian și limite de dimensiune ORS.

**Cheia ORS:** utilizatorul a creat o cheie în dashboard și a pus-o local în `backend/.env` ca `ORS_API_KEY=value`. Codex a configurat importul opțional `.env`, `.env.example`, `.gitignore`, URL-ul ORS și timeouturile. Fișierul `.env` este privat: **nu trebuie citit, modificat sau distribuit**. Nici cheia ORS, nici alte secrete nu ajung în frontend.

**Verificarea raportată de Codex:** Maven compile reușit și **18 teste trecute**, inclusiv teste auth/dev și teste ORS simulate (fallback, timeouturi, erori, expirare raportări, configurare). **Nu s-au verificat** apeluri reale ORS, ocolirea efectivă a poligoanelor pe o hartă sau încărcarea fișierului `.env` privat. Utilizatorul a ales să facă verificarea funcțională când frontendul este pregătit, nu acum prin Postman.

**Rămase pentru ORS:** integrarea și verificarea live din frontend: rută A–B fără raportări, apoi raportare pe traseu și verificarea ocolirii reale; afișarea avertismentului și a stării de evitare limitată. De verificat separat că `.env` este ignorat și neurmărit de Git (verificările Git automate ale Codex au eșuat din cauza accesului la directorul părinte).

## 6. Contractul REST actual

**15 endpointuri** sub `/api/v1`:

| Domeniu | Endpointuri |
|---|---|
| Users | `POST /users` (doar dev), `GET /users/me`, `PUT /users/me` |
| Reports | `POST /reports`, `GET /reports` |
| Trusted contacts | `POST /trusted-contacts`, `GET /trusted-contacts/sent`, `GET /trusted-contacts/received`, `PATCH /trusted-contacts/{id}/accept`, `DELETE /trusted-contacts/{id}` |
| SOS | `POST /sos`, `GET /sos/mine`, `GET /sos/received`, `PATCH /sos/{id}/resolve` |
| Routing | `POST /routes` |

**Sursa detaliată și actualizată pentru frontend este `FRONTEND_API(1).md` / `FRONTEND_API.md`**: DTO-uri și validări, exemple JSON, statusuri, permisiuni, convenții geografice, erori, comportament SOS și ORS. Acest rezumat nu înlocuiește documentul respectiv.

## 7. Predarea către echipa de frontend — realizată

Codex a inspectat codul real și a generat **`FRONTEND_API.md`** în directorul backendului. Conform raportului, include toate cele 15 endpointuri, exemple JSON valide, Auth0, erori, rutare și fluxuri complete. A fost transmis colegilor **designul/contractul API actual** pentru integrarea cu frontendul deja parțial construit.

Echipa de frontend a primit instrucțiuni să:
- compare frontendul existent cu documentația și să păstreze componentele deja corecte;
- propună un plan de adaptare **înainte de a modifica codul**;
- nu modifice backendul sau să inventeze endpointuri;
- păstreze URL-ul API și setările Auth0 în variabile de configurare frontend;
- poată dezvolta temporar împotriva backendului `dev`, fără Auth0, folosind proxy-ul serverului frontend (de exemplu Vite) pentru a evita CORS;
- treacă ulterior la profilul backend `auth` pentru verificarea loginului și a fluxurilor cu utilizatori diferiți;
- respecte GeoJSON `[longitude,latitude]`, warnings de rutare și fluxul SOS (countdown + polling).

**Important:** transmiterea documentației nu înseamnă că adaptarea frontendului este deja finalizată. Stadiul efectiv al implementării la colegi nu a fost confirmat în acest chat.

## 8. Ce urmează — priorități practice

1. **Coordonare cu frontendul:** obțineți adresa exactă a frontendului, portul și callback/logout path-urile; transmiteți publicul **Auth0 SPA Client ID** și configurați Dashboard + `FRONTEND_ORIGIN`.
2. **Integrare Auth0 prin UI:** profil backend `auth`, login PKCE real, `/users/me`, două conturi și permisiuni trusted contacts/SOS.
3. **Integrare hartă/rute:** frontendul afișează raportările, trimite A/B la `POST /routes`, desenează geometria, afișează `warning`/`avoidanceLimited`; validați primul apel live ORS și comportamentul real de evitare.
4. **Integrare SOS:** countdown anulabil înainte de POST, polling în aplicație activă, acceptare invitații și rezolvare alerte.
5. **Config/securitate:** confirmați că `.env` nu este urmărit de Git; nu puneți secrete în repository/frontend; testați CORS potrivit originului frontend. H2 pierde date la restart — acceptat pentru demo, cu această limitare cunoscută.

Nu prioritizați acum refactorizări mari, teste suplimentare ample, infrastructură nouă sau reluarea problemei Postman, decât dacă integrarea frontend descoperă un blocaj real.

## 9. Fișiere care vor fi furnizate în următoarea conversație

1. **`AUTH_SETUP.md`** — detaliile implementării Auth0 și pașii Dashboard/manuali; unele formulări mai vechi despre când se inițializează profilul sunt clarificate de contractul frontend.
2. **`BACKEND_CONTEXT(4).md`** — context mai vechi despre arhitectură și reguli de business; secțiunea care descrie Auth0 ca „viitor” este **depășită**, la fel și lista de sarcini care încă tratează rutarea drept neimplementată.
3. **`FRONTEND_API(1).md`** — contractul REST bazat pe codul real la momentul generării, cel mai util pentru integrarea frontend.
4. **Acest fișier** — rezumatul stadiului actual și al deciziilor luate în conversația recentă.

**Regulă de lucru în viitor:** verifică repository-ul real când o decizie depinde de cod. Nu interpreta rezumatele drept garanție că integrarea live este verificată. Răspunde în română, practic și concis, cu prioritate pe MVP.
