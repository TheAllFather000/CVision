@echo off
title CVision APK Builder
echo ========================================
echo       CVision APK Builder
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org
    pause
    exit /b 1
)
echo Node.js found!

echo.
echo [2/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo Dependencies installed!

echo.
echo [3/4] Creating assets folder and bundling JS...
if not exist "android\app\src\main\assets" mkdir "android\app\src\main\assets"
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android\app\src\main\assets\index.android.bundle --assets-dest android\app\src\main\res
if %errorlevel% neq 0 (
    echo ERROR: Bundle failed!
    pause
    exit /b 1
)
echo JS bundle created!

echo.
echo [4/4] Building debug APK...
cd android
call gradlew assembleDebug
cd ..

if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo       BUILD SUCCESSFUL!
echo ========================================
echo APK location:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Transfer this APK to your phone and install it.
echo.
pause
