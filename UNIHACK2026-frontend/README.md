# LadyApp 🐞

Aplicație mobilă de siguranță pentru femei — hartă cu raportări, rută sigură, SOS, partajare traseu și chat.

---

## Cum pornești aplicația local

**Ai nevoie de:** Node.js 18+

```bash
# 1. Clonează repo-ul
git clone https://github.com/AmeliaDrag/UNIHACK2026.git
cd UNIHACK2026

# 2. Treci pe branch-ul frontend
git checkout frontend

# 3. Instalează dependențele
npm install

# 4. Copiază fișierul de configurare
cp .env.example .env
# (completează valorile din .env dacă ai credențiale reale)

# 5. Pornește baza de date locală (într-un terminal separat)
npm run db

# 6. Pornește aplicația (într-un alt terminal)
npm run dev
```

Deschide **http://localhost:5173**

---

## Structura fișierelor

```
src/
├── main.jsx          # Entry point, cadrul de telefon
├── App.jsx           # Reexportă din HomePage.jsx
├── HomePage.jsx      # Router principal — leagă toate paginile
├── HomePage.css      # Stiluri navbar, FAB-uri, dropdown hartă
├── styles.css        # Stiluri globale (culori, butoane, chat)
├── auth.js           # Wrapper useSession() peste Auth0
├── config.js         # Validare variabile de mediu
├── api.js            # Tot accesul la date (json-server / Spring Boot)
├── useGeo.js         # Hook GPS
├── routing.js        # Calcul risc rute
│
├── RouteTab.jsx      # Harta principală cu planificator de rută
├── ReportsPage.jsx   # Pagina de raportări
├── SosPage.jsx       # Butonul SOS cu countdown
├── SharePage.jsx     # Partajare traseu live
├── ChatPage.jsx      # Chat între utilizatori
├── TrackPage.jsx     # Vizualizare traseu partajat (link public)
├── AccountPage.jsx   # Pagina de cont (buburuza 🐞)
└── AccountPage.css   # Stiluri pagina de cont
```

---

## Cum lucrezi fără să strici ce au făcut ceilalți

### 1. Creează-ți branch-ul propriu (o singură dată)

```bash
git checkout frontend
git pull origin frontend
git checkout -b feature/numele-tau
```

Exemple: `feature/amelia-reports`, `feature/ana-sos`, `feature/maria-chat`

### 2. Lucrează pe branch-ul tău

```bash
# Înainte să începi în fiecare zi — ia ultimele modificări
git pull origin frontend

# Salvează progresul
git add .
git commit -m "descriere scurtă ce ai făcut"
git push -u origin feature/numele-tau
```

### 3. Când ești gata — deschide un Pull Request

Pe GitHub: **feature/numele-tau → frontend**

Daniela revede și dă merge.

---

## Reguli importante 🐞

| ✅ Fă asta | ❌ Nu face asta |
|-----------|----------------|
| Lucrează pe `feature/numele-tau` | Nu lucra direct pe `frontend` sau `main` |
| Creează fișiere noi pentru paginile tale | Nu modifica `HomePage.jsx`, `styles.css`, `HomePage.css` fără să anunți |
| Importează componentele tale în `HomePage.jsx` prin PR | Nu dai push direct pe `frontend` |

### Fișiere care aparțin fiecăruia

| Fișier | Proprietar |
|--------|-----------|
| `ReportsPage.jsx` | poate fi modificat de oricine cu PR |
| `SosPage.jsx` | poate fi modificat de oricine cu PR |
| `SharePage.jsx` | poate fi modificat de oricine cu PR |
| `ChatPage.jsx` | poate fi modificat de oricine cu PR |
| `AccountPage.jsx` / `AccountPage.css` | Daniela |
| `HomePage.jsx` / `HomePage.css` | Daniela (anunță înainte) |
| `styles.css` | Daniela (anunță înainte) |
| `RouteTab.jsx` | Daniela (anunță înainte) |
| `api.js` | toată echipa, cu grijă |

---

## Variabile de mediu (.env)

Copiază `.env.example` în `.env` și completează:

```
VITE_AUTH0_DOMAIN=       # de la Auth0
VITE_AUTH0_CLIENT_ID=    # de la Auth0
VITE_AUTH0_AUDIENCE=     # opțional
VITE_GUEST_ENABLED=true  # true în dev, false în producție
```

`.env` nu se urcă pe Git — conține secrete.

---

## Baza de date locală

`db.json` — fișier JSON simplu servit de `json-server` pe portul 3001.  
Vite proxiază automat `/api/*` → `http://localhost:3001`.  
Când backend-ul Spring Boot e gata, se înlocuiesc corpurile funcțiilor din `api.js`.
