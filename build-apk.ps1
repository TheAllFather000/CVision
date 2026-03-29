#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      CVision APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/4] Checking Node.js..." -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Node.js found!" -ForegroundColor Green

Write-Host ""
Write-Host "[2/4] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Dependencies installed!" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] Creating assets folder and bundling JS..." -ForegroundColor Yellow
if (-not (Test-Path "android\app\src\main\assets")) {
    New-Item -ItemType Directory -Path "android\app\src\main\assets" -Force | Out-Null
}
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android\app\src\main\assets\index.android.bundle --assets-dest android\app\src\main\res
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Bundle failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "JS bundle created!" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Building debug APK..." -ForegroundColor Yellow
Set-Location "android"
.\gradlew.bat assembleDebug
Set-Location ".."

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "      BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "APK location:" -ForegroundColor White
Write-Host "android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
Write-Host ""
Write-Host "Transfer this APK to your phone and install it." -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
