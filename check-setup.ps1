# React Native Android Setup Checker for Windows
Write-Host "================================" -ForegroundColor Cyan
Write-Host "React Native Android Setup Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "OK - Node.js installed: $nodeVersion" -ForegroundColor Green
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        $warnings += "Node.js version is below 18"
    }
} catch {
    $errors += "Node.js is NOT installed"
    Write-Host "ERROR - Node.js is NOT installed" -ForegroundColor Red
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "OK - npm installed: $npmVersion" -ForegroundColor Green
} catch {
    $errors += "npm is NOT installed"
    Write-Host "ERROR - npm is NOT installed" -ForegroundColor Red
}

# Check Java JDK
Write-Host "Checking Java JDK..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "OK - Java installed: $javaVersion" -ForegroundColor Green
    if ($env:JAVA_HOME) {
        Write-Host "OK - JAVA_HOME is set: $env:JAVA_HOME" -ForegroundColor Green
    } else {
        $warnings += "JAVA_HOME is not set"
        Write-Host "WARNING - JAVA_HOME is NOT set" -ForegroundColor Yellow
    }
} catch {
    $errors += "Java JDK is NOT installed"
    Write-Host "ERROR - Java JDK is NOT installed" -ForegroundColor Red
}

# Check Android SDK
Write-Host "Checking Android SDK..." -ForegroundColor Yellow
if ($env:ANDROID_HOME) {
    Write-Host "OK - ANDROID_HOME is set: $env:ANDROID_HOME" -ForegroundColor Green
    if (Test-Path $env:ANDROID_HOME) {
        Write-Host "OK - Android SDK directory exists" -ForegroundColor Green
        $platformToolsPath = Join-Path $env:ANDROID_HOME "platform-tools"
        if (Test-Path $platformToolsPath) {
            Write-Host "OK - Platform-tools found" -ForegroundColor Green
        } else {
            $warnings += "Platform-tools not found"
            Write-Host "WARNING - Platform-tools NOT found" -ForegroundColor Yellow
        }
        $buildToolsPath = Join-Path $env:ANDROID_HOME "build-tools"
        if (Test-Path $buildToolsPath) {
            Write-Host "OK - Build-tools found" -ForegroundColor Green
        } else {
            $warnings += "Build-tools not found"
            Write-Host "WARNING - Build-tools NOT found" -ForegroundColor Yellow
        }
    } else {
        $errors += "ANDROID_HOME path does not exist"
        Write-Host "ERROR - Android SDK directory does NOT exist" -ForegroundColor Red
    }
} else {
    $errors += "ANDROID_HOME is not set"
    Write-Host "ERROR - ANDROID_HOME is NOT set" -ForegroundColor Red
}

# Check adb
Write-Host "Checking adb..." -ForegroundColor Yellow
try {
    $adbVersion = adb version 2>&1 | Select-String "Android Debug Bridge"
    Write-Host "OK - adb is accessible: $adbVersion" -ForegroundColor Green
} catch {
    $warnings += "adb is not in PATH"
    Write-Host "WARNING - adb is NOT accessible" -ForegroundColor Yellow
}

# Check for devices
Write-Host "Checking for Android devices..." -ForegroundColor Yellow
try {
    $devices = adb devices
    $deviceLines = $devices -split "`n" | Select-Object -Skip 1 | Where-Object { $_ -match '\w' }
    if ($deviceLines.Count -gt 0) {
        Write-Host "OK - Connected devices found:" -ForegroundColor Green
        foreach ($device in $deviceLines) {
            Write-Host "  - $device" -ForegroundColor Cyan
        }
    } else {
        $warnings += "No devices detected"
        Write-Host "WARNING - No devices connected" -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING - Could not check for devices" -ForegroundColor Yellow
}

# Check project structure
Write-Host "Checking project structure..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "OK - package.json found" -ForegroundColor Green
    if (Test-Path "android") {
        Write-Host "OK - android directory found" -ForegroundColor Green
    } else {
        $warnings += "android directory not found"
        Write-Host "WARNING - android directory NOT found" -ForegroundColor Yellow
    }
    if (Test-Path "node_modules") {
        Write-Host "OK - node_modules found" -ForegroundColor Green
    } else {
        $warnings += "node_modules not found - run npm install"
        Write-Host "WARNING - node_modules NOT found" -ForegroundColor Yellow
    }
} else {
    $warnings += "Not in project directory"
    Write-Host "WARNING - package.json NOT found" -ForegroundColor Yellow
}

# Check Gradle
if (Test-Path "android\gradlew.bat") {
    Write-Host "OK - Gradle wrapper found" -ForegroundColor Green
} else {
    if (Test-Path "android") {
        $warnings += "Gradle wrapper not found"
        Write-Host "WARNING - Gradle wrapper NOT found" -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "SUCCESS - All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. npm install" -ForegroundColor White
    Write-Host "2. npm start" -ForegroundColor White
    Write-Host "3. npm run android" -ForegroundColor White
} else {
    if ($errors.Count -gt 0) {
        Write-Host ""
        Write-Host "ERRORS:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "  - $error" -ForegroundColor Red
        }
    }
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "WARNINGS:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Visit: https://reactnative.dev/docs/set-up-your-environment" -ForegroundColor Cyan