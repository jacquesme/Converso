# Converso - Run App Script
# This script automates starting Metro and running the Android app

Write-Host "Starting Converso App..." -ForegroundColor Cyan

# Check if Metro is already running (simple check for node processes)
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
$metroRunning = $false

if ($nodeProcesses) {
    # Check if port 8081 is in use (Metro's default port)
    $portCheck = netstat -ano | findstr ":8081"
    if ($portCheck) {
        $metroRunning = $true
    }
}

if ($metroRunning) {
    Write-Host "[OK] Metro bundler is already running" -ForegroundColor Green
} else {
    Write-Host "[*] Starting Metro bundler..." -ForegroundColor Yellow
    $currentDir = Get-Location
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir'; npm start" -WindowStyle Minimized
    Write-Host "[*] Waiting for Metro to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Ensure autolinking directory exists
$autolinkingDir = "android\build\generated\autolinking"
if (-not (Test-Path $autolinkingDir)) {
    Write-Host "[*] Creating autolinking directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $autolinkingDir | Out-Null
}

# Check if Android device/emulator is connected
Write-Host "[*] Checking for Android device..." -ForegroundColor Yellow
try {
    $adbCheck = adb devices 2>&1
    if ($adbCheck -match "device$") {
        Write-Host "[OK] Android device found" -ForegroundColor Green
    } else {
        Write-Host "[!] No Android device detected. Make sure your device/emulator is running." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[!] Could not check for Android devices. Make sure ADB is in your PATH." -ForegroundColor Yellow
}

# Clean build if requested (optional - comment out if you want faster builds)
$cleanBuild = $false
if ($cleanBuild) {
    Write-Host "[*] Cleaning Android build..." -ForegroundColor Yellow
    Set-Location android
    .\gradlew.bat clean 2>&1 | Out-Null
    Set-Location ..
}

# Generate autolinking.json using our script before Gradle runs
# This ensures the file exists with proper format before Gradle validates it
Write-Host "[*] Generating autolinking.json..." -ForegroundColor Yellow
$autolinkingFile = "$autolinkingDir\autolinking.json"

try {
    node generate-autolinking.js 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0 -and (Test-Path $autolinkingFile)) {
        Write-Host "[OK] Autolinking.json generated" -ForegroundColor Green
    } else {
        throw "Generation failed"
    }
} catch {
    Write-Host "[!] Could not generate autolinking.json. Build may fail." -ForegroundColor Yellow
}

# Run the Android app
Write-Host "[*] Building and installing app..." -ForegroundColor Cyan
Write-Host ""

npm run android

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] App launched successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERROR] Build failed. Check the error messages above." -ForegroundColor Red
    Write-Host "[TIP] Try running: cd android; .\gradlew clean; cd ..; npm run android" -ForegroundColor Yellow
}

