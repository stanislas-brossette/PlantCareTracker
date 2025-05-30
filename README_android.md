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
4. Install the Capacitor Camera plugin (if not already installed):
   ```bash
   npm install @capacitor/camera
   ```
5. Sync Capacitor to install native plugins:
   ```bash
   npm run cap:sync
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

## Configure API URL
Edit `public/config.js` to point to your server's IP address and port. By default it uses `http://192.168.1.20:3000`.
