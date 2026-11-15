# LadyMap Mobile App

Aplicația mobilă React Native/Expo pentru LadyMap care încarcă aplicația web într-un WebView.

## Cerințe

- Node.js și npm instalate
- Android Debug Bridge (ADB) instalat
- Telefon Android cu USB Debugging activat
- Expo Go instalat pe telefon (sau compilare nativă)

## Instalare

```bash
cd mobile
npm install
```

## Rulare pe telefon Android

### Metoda 1: Script automat (Recomandat)

```powershell
.\run-on-phone.ps1
```

Scriptul va:
1. Verifica dispozitivul conectat
2. Configura tunelurile ADB (5173, 8081, 8082)
3. Porni serverul Expo pe portul 8082
4. Lansa aplicația pe telefon

### Metoda 2: Manual

```powershell
# 1. Adaugă ADB la PATH
$env:Path += ";C:\Users\Deborah\OneDrive\Desktop\platform-tools-latest-windows\platform-tools"

# 2. Verifică dispozitivul
adb devices

# 3. Configurează tunelurile
adb reverse tcp:8082 tcp:8082
adb reverse tcp:5173 tcp:5173
adb reverse tcp:8081 tcp:8081

# 4. Pornește Expo
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
$env:REACT_NATIVE_PACKAGER_HOSTNAME="127.0.0.1"
npx expo start --port 8082

# 5. Lansează pe telefon
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8082"
```

## Asigură-te că rulează:

1. **Frontend (Vite)** pe `http://localhost:5173`
2. **Backend (Spring Boot)** pe `http://localhost:8081`
3. **Expo Metro** pe `exp://127.0.0.1:8082`

## Features

- ✅ WebView cu suport complet pentru aplicația web
- ✅ Geolocation nativă prin Expo Location API
- ✅ Permisiuni Android automate pentru locație
- ✅ Bridge între WebView și API-ul nativ
- ✅ Gestionare erori și reconectare

## Troubleshooting

### "Eroare de conexiune"
- Verifică că frontend-ul rulează pe port 5173
- Verifică tunelurile ADB: `adb reverse --list`

### "Obținerea locației durează prea mult"
- Acceptă permisiunile de locație când sunt cerute
- Verifică că GPS-ul este activat pe telefon

### "Port-ul 8082 este deja în uz"
- Oprește procesele Expo anterioare
- Sau schimbă portul în `run-on-phone.ps1`
