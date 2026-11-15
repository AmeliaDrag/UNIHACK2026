# Pagina SOS - Lista Completă de Fișiere

## 📁 Fișiere Active (Folosite Acum)

### 1. Component React Principal
**Fișier:** `SosPageNew.jsx`  
**Locație:** `UNIHACK2026-frontend/src/SosPageNew.jsx`  
**Mărime:** ~184 linii de cod  

**Ce conține:**
- Import imagine mockup: `import sosImageBackground from './image.jpeg'`
- Logică SOS completă:
  - Countdown 5 secunde
  - Audio siren (880Hz square wave)
  - Vibrație dispozitiv
  - Sistem PIN (normal + duress)
  - State machine (idle/count/sent/fail)
- JSX rendering:
  - `<img src={sosImageBackground} />` (fundal full-screen)
  - 3 butoane transparente overlay (ladybug, pink, red)
  - Modale pentru status screens
- Funcții helpers:
  - `sha()` - SHA-256 hashing pentru PIN
  - `hush()` - Oprește audio și vibrație
  - `fire()` - Trimite alertă la backend
  - `begin()` - Pornește countdown
  - `check()` - Verifică PIN
  - `call112()` - Deschide dialer

---

### 2. Stiluri CSS
**Fișier:** `SosPageNew.css`  
**Locație:** `UNIHACK2026-frontend/src/SosPageNew.css`  
**Mărime:** ~350 linii CSS  

**Ce conține:**
- Container pagină:
  - `position: relative`
  - `width: 100%`, `height: 100%`
  - `background-color: #FFFFFF`
  
- Background imagine:
  ```css
  .sos-new-bg-image {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: fill;
    pointer-events: none;
    z-index: 0;
  }
  ```

- Butoane overlay transparente:
  ```css
  .sos-new-overlay-btn {
    position: absolute;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: transform 0.1s ease;
  }
  
  .sos-new-overlay-btn:active {
    transform: scale(0.97);
  }
  ```

- Poziționare zone (percentage-based):
  - **Ladybug:** `top: 22%`, `left: 22%`, `width: 56%`, `height: 32%`
  - **Pink pill:** `top: 59%`, `left: 11%`, `width: 78%`, `height: 11%`
  - **Red pill:** `top: 72%`, `left: 11%`, `width: 78%`, `height: 11%`

- Modale overlay:
  ```css
  .sos-new-modal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(10px);
    z-index: 10;
  }
  ```

- Responsive design (media queries pentru 480px și 360px)
- Focus states pentru accessibility
- Stiluri pentru: countdown, title, text, input, buttons

---

### 3. Imagine Mockup Background
**Fișier:** `image.jpeg`  
**Locație:** `UNIHACK2026-frontend/src/image.jpeg`  
**Mărime:** ~94 KB  
**Dimensiuni:** 900x1600 pixels  
**Format:** JPEG  

**Ce conține:**
- Fundal alb (#FFFFFF)
- Polka dots negre (#000000) - buline mici distribuite uniform
- Buburuza roșie centrală:
  - Cap negru cu 2 antene curbate
  - Aripi roșii deschise (#E53924 / #E32919)
  - Corp negru în centru
  - 4 puncte negre pe aripi (2 pe fiecare)
  - Text "SOS" alb, bold, centrat pe aripi
- Buton pill roz (#FAD4D8):
  - Icon pin negru (📍)
  - Text negru: "Partajează locația cu Ladybugs" (2 linii)
- Buton pill roșu (#DF1B2C):
  - Icon telefon alb (📞)
  - Text alb: "Sună la 112"

**Cum e folosită:**
- Importată în `SosPageNew.jsx`:
  ```javascript
  import sosImageBackground from './image.jpeg';
  ```
- Renderată ca `<img>`:
  ```jsx
  <img src={sosImageBackground} className="sos-new-bg-image" />
  ```
- Stretched to fill: `object-fit: fill`

---

### 4. Router / Integrare
**Fișier:** `HomePage.jsx`  
**Locație:** `UNIHACK2026-frontend/src/HomePage.jsx`  
**Modificări:** 2 linii  

**Linia 10 (Import):**
```javascript
import SosPageNew   from './SosPageNew'; // New SOS page matching mockup
```

**Linia ~215 (Render):**
```javascript
// ── SOS ──
if (page === 'sos')
  return (
    <div className="app" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {profilePromptOverlay}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {secure(<SosPageNew uid={uid} pos={pos} onShare={() => setPage('share')} />)}
      </div>
      <LadybugNav active="sos" onMap={() => setPage('home')} onChat={() => setPage('chat')} onAccount={() => setPage('account')} />
    </div>
  );
```

**Props trimise către SosPageNew:**
- `uid` → User ID pentru alerte
- `pos` → Geolocation curentă {lat, lng}
- `onShare` → Handler pentru deschidere SharePage

---

## 🔒 Fișiere Backup (Păstrate, Neutilizate Acum)

### 5. Component SOS Original
**Fișier:** `SosPage.jsx`  
**Locație:** `UNIHACK2026-frontend/src/SosPage.jsx`  
**Status:** PĂSTRAT ca backup, NU e utilizat  

**Ce conține:**
- Versiunea originală a paginii SOS
- Folosea buline decorative CSS + SVG icon sirenă
- Aceeași logică ca SosPageNew (PIN, countdown, etc.)

**Cum să revii la el:**
1. Edit `HomePage.jsx` linia 215
2. Schimbă `<SosPageNew />` cu `<SosPage />`
3. Save → hot reload automat

---

### 6. Stiluri SOS Originale
**Fișier:** `SosPage.css`  
**Locație:** `UNIHACK2026-frontend/src/SosPage.css`  
**Status:** PĂSTRAT ca backup, NU e utilizat  

**Ce conține:**
- Stiluri pentru versiunea originală SOS
- Gradient background (roz)
- Buline decorative CSS (radial-gradient)
- Buton circular roșu cu siren icon

---

## 📊 Structura Dependințelor

```
HomePage.jsx
    │
    ├─ import SosPageNew from './SosPageNew'
    │
    └─ render: <SosPageNew uid={...} pos={...} onShare={...} />
              ↓
         SosPageNew.jsx
              │
              ├─ import './SosPageNew.css'
              ├─ import sosImageBackground from './image.jpeg'
              │
              ├─ render: <img src={sosImageBackground} />
              └─ render: <button className="sos-new-overlay-btn" />
                         (x3: ladybug, pink, red)
```

---

## 📂 Căi Complete Fișiere

### Windows Paths:
```
C:\Users\Deborah\OneDrive\Desktop\UNIHACK2026-final-web\
└── UNIHACK2026-final-web\
    └── UNIHACK2026-frontend\
        └── src\
            ├── SosPageNew.jsx       ← Component activ
            ├── SosPageNew.css       ← Stiluri active
            ├── image.jpeg           ← Imagine mockup
            ├── HomePage.jsx         ← Router (2 linii modificate)
            ├── SosPage.jsx          ← Backup (original)
            └── SosPage.css          ← Backup (original)
```

### Relative Paths (pentru import):
```javascript
// În HomePage.jsx:
import SosPageNew from './SosPageNew';  // ← релativ la src/

// În SosPageNew.jsx:
import sosImageBackground from './image.jpeg';  // ← релativ la src/
import './SosPageNew.css';  // ← релativ la src/
```

---

## 🔄 Cum Lucrează Împreună

### 1. User Accesează Pagina SOS
- User apasă butonul "SOS" (floating, stânga jos)
- `HomePage.jsx` detectează: `page === 'sos'`
- Renderează: `<SosPageNew uid={uid} pos={pos} onShare={onShare} />`

### 2. SosPageNew Se Încarcă
- Importă `image.jpeg` ca `sosImageBackground`
- Importă stiluri din `SosPageNew.css`
- Verifică dacă există PIN salvat în localStorage
- Dacă nu → arată ecran setup PIN
- Dacă da → arată ecran principal (ph === 'idle')

### 3. Ecran Principal (ph === 'idle')
- Renderează `<img src={sosImageBackground} />` (fundal full-screen)
- Renderează 3 butoane transparente peste imagine:
  - `.sos-new-ladybug-zone` → Apasare → execută `begin()`
  - `.sos-new-pink-zone` → Apasare → execută `onShare()`
  - `.sos-new-red-zone` → Apasare → execută `call112()`

### 4. User Apasă o Zonă
**Dacă apasă ladybug:**
- `begin()` se execută
- State devine `ph: 'count'`
- Pornește countdown: n = 5, 4, 3, 2, 1, 0
- Pornește siren audio (880Hz)
- Pornește vibrație dispozitiv
- Arată modal overlay cu countdown + PIN input

**Dacă apasă pink zone:**
- `onShare()` se execută
- Deschide `SharePage` cu trusted contacts

**Dacă apasă red zone:**
- `call112()` se execută
- `window.location.href = 'tel:112'`
- Deschide dialer telefon

### 5. CSS Aplică Stilurile
- `SosPageNew.css` controlează:
  - Poziționare imagine (absolute, fill)
  - Poziționare butoane overlay (%, absolute)
  - Stiluri modale (centered, backdrop blur)
  - Efecte interactive (scale on active)
  - Responsive design (media queries)

---

## 📝 Dependințe NPM

Nu sunt necesare pachete NPM suplimentare! Totul folosește:
- ✅ React standard (hooks: useState, useEffect, useRef)
- ✅ Web APIs native:
  - `navigator.geolocation` (geolocation)
  - `AudioContext` (audio siren)
  - `navigator.vibrate` (vibration)
  - `crypto.subtle.digest` (SHA-256)
  - `localStorage` (PIN storage)

---

## 🎯 Rezumat Rapid

**Fișiere Active (4):**
1. `src/SosPageNew.jsx` - Component (184 linii)
2. `src/SosPageNew.css` - Stiluri (350 linii)
3. `src/image.jpeg` - Imagine mockup (94 KB)
4. `src/HomePage.jsx` - Integrare (2 linii modificate)

**Fișiere Backup (2):**
5. `src/SosPage.jsx` - Original backup
6. `src/SosPage.css` - Stiluri originale backup

**Total Linii Cod Noi:** ~534 linii (JSX + CSS)  
**Total Fișiere Noi:** 2 (SosPageNew.jsx, SosPageNew.css)  
**Total Imagine:** 1 (image.jpeg - exista deja în proiect)  
**Modificări Existente:** 2 linii în HomePage.jsx  

---

**Toate fișierele sunt în frontend, folder `src/`!** 📁
