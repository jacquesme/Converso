@echo off
REM Converso - Run App Script (Batch version)
REM This script automates starting Metro and running the Android app

echo 🚀 Starting Converso App...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Make sure you're in the project root.
    pause
    exit /b 1
)

REM Start Metro in a separate window if not running
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Metro bundler may already be running
) else (
    echo 📦 Starting Metro bundler...
    start "Metro Bundler" cmd /k "npm start"
    timeout /t 5 /nobreak >nul
)

REM Ensure autolinking directory exists
if not exist "android\build\generated\autolinking" (
    echo 📁 Creating autolinking directory...
    mkdir "android\build\generated\autolinking"
)

REM Run the Android app
echo 🔨 Building and installing app...
echo.

call npm run android

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ App launched successfully!
) else (
    echo.
    echo ❌ Build failed. Check the error messages above.
    echo 💡 Try running: cd android ^&^& gradlew clean ^&^& cd .. ^&^& npm run android
)

pause

