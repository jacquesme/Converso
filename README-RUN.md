# Running the Converso App

## Quick Start

### Option 1: Using the Automated Script (Recommended)

**PowerShell:**
```powershell
.\run-app.ps1
```

**Or using npm:**
```powershell
npm run run-app
```

**Batch file (Windows):**
```cmd
run-app.bat
```

### Option 2: Manual Steps

1. **Start Metro bundler** (in one terminal):
   ```powershell
   npm start
   ```

2. **Run the Android app** (in another terminal):
   ```powershell
   npm run android
   ```

## What the Script Does

The `run-app.ps1` script automatically:
- ✅ Checks if Metro bundler is running
- ✅ Starts Metro in a separate window if needed
- ✅ Creates autolinking directory if missing
- ✅ Creates autolinking.json with your native modules
- ✅ Checks for connected Android devices
- ✅ Builds and installs the app on your device/emulator

## Troubleshooting

If the build fails:

1. **Clean the Android build:**
   ```powershell
   cd android
   .\gradlew clean
   cd ..
   npm run android
   ```

2. **Check Android device connection:**
   ```powershell
   adb devices
   ```

3. **Make sure Metro is running:**
   - Look for a terminal window running Metro
   - Or start it manually: `npm start`

## Requirements

- Android device connected via USB (with USB debugging enabled)
- OR Android emulator running
- Node.js and npm installed
- Android SDK and development environment set up

