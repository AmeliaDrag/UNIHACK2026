# Script pentru rularea aplicației LadyMap pe telefonul Android

$ErrorActionPreference = "Stop"

Write-Host "`n=== LadyMap - Lansare pe telefon Android ===" -ForegroundColor Cyan

# Adaugă ADB la PATH
$env:Path += ";C:\Users\Deborah\OneDrive\Desktop\platform-tools-latest-windows\platform-tools"

# Verifică dispozitivul conectat
Write-Host "`nVerificare dispozitiv conectat..." -ForegroundColor Yellow
$devices = adb devices
if ($devices -notmatch "device$") {
    Write-Host "Eroare: Niciun dispozitiv Android conectat!" -ForegroundColor Red
    Write-Host "Conectează telefonul prin USB și activează USB Debugging" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Dispozitiv conectat" -ForegroundColor Green

# Configurează tunelurile ADB
Write-Host "`nConfigurare tuneluri ADB..." -ForegroundColor Yellow
adb reverse tcp:8082 tcp:8082  # Expo Metro
adb reverse tcp:5173 tcp:5173  # Frontend Vite
adb reverse tcp:8081 tcp:8081  # Backend Spring Boot
Write-Host "✓ Tuneluri configurate: 8082, 5173, 8081" -ForegroundColor Green

# Setează variabilele de mediu pentru Expo
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
$env:REACT_NATIVE_PACKAGER_HOSTNAME="127.0.0.1"

Write-Host "`nPornire server Expo pe portul 8082..." -ForegroundColor Yellow
Write-Host "Așteaptă 10 secunde pentru pornirea serverului...`n" -ForegroundColor Cyan

# Pornește Expo în background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Deborah\OneDrive\Desktop\UNIHACK2026-final-web\mobile'; `$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; `$env:REACT_NATIVE_PACKAGER_HOSTNAME='127.0.0.1'; npx expo start --port 8082"

# Așteaptă pornirea serverului
Start-Sleep -Seconds 10

# Lansează aplicația pe telefon
Write-Host "Lansare aplicație pe telefon..." -ForegroundColor Yellow
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8082"

Write-Host "`n✓ Aplicația LadyMap a fost lansată pe telefon!" -ForegroundColor Green
Write-Host "`nServerul Expo rulează în terminal separat." -ForegroundColor Cyan
Write-Host "Pentru a opri serverul, închide terminalul Expo." -ForegroundColor Yellow
