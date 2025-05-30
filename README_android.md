# PlantCareTracker Android Setup

This project uses [Capacitor](https://capacitorjs.com/) to package the existing web app for Android devices.

## Prerequisites
- Node.js 18+
- Android Studio with SDK installed

## First-time Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Initialize Capacitor (already configured in `capacitor.config.ts`, run only if reinitializing):
   ```bash
   npm run cap:init
   ```
3. Add the Android platform:
   ```bash
   npm run cap:add
   ```

## Building and Running
1. Build the frontend (no compilation needed for plain HTML/JS):
   ```bash
   npm run build
   ```
2. Copy the web assets into the Android project:
   ```bash
   npm run cap:copy
   ```
3. Open the Android project in Android Studio:
   ```bash
   npm run cap:open
   ```
4. From Android Studio you can build and run the application on a device or emulator.

The backend API must be hosted separately and reachable from the device running the app.
