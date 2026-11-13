# SafeWalk (web, React + Firebase + Auth0)

1. `npm install`, apoi copiază `.env.example` în `.env` și completează valorile.
2. Firebase: creează un proiect, activează Firestore, copiază configurarea web în `.env`.
   Regulile în „test mode” sunt TEMPORARE și permit oricui să citească și să scrie. Nu introduce date reale de utilizatoare până nu le înlocuiești.
3. Auth0: aplicație de tip Single Page Application. Adaugă adresa aplicației la Allowed Callback URLs, Logout URLs și Web Origins.
   Pentru rolul `moderator`, un Action adaugă rolurile în ID token la claim-ul `https://safewalk.app/roles`.
4. `npm run dev`.

Trecerea la Spring Boot: tot accesul la date e în `src/api.js`. Păstrezi aceleași funcții și înlocuiești corpul lor cu apeluri `fetch` către REST API, cu token-ul Auth0 în antet.

SMS: alertele SOS se scriu în colecția `alerts`. Nimic nu trimite SMS încă; trebuie făcut în backend (Spring Boot sau Cloud Function), cu cheile furnizorului doar pe server.
