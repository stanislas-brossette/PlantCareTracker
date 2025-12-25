---

# Plant Care Tracker

A simple web app to track watering and fertilizing schedules for your plants. Built with **Node.js**, **Express**, and vanilla JavaScript.

---

## **Features**
- Track last watering and fertilizing times for each plant.
- Dynamic buttons show time since last action (e.g., "3 days ago").
- Buttons turn red when a plant needs attention.
- Data is saved in `lastClickedTimes.json` for persistence.

---

## **Installation**

### **1. Prerequisites**
- **Node.js** (version 18 or later; Node 20 recommended) and **npm** installed on your Raspberry Pi.
  To install:
  ```bash
  sudo apt update
  sudo apt install nodejs npm
  ```

### **2. Clone or Download the Project**
- If you haven’t already, download or clone the project to your Raspberry Pi.

### **3. Install Dependencies**
Navigate to the project directory and run the setup script to install dependencies:
```bash
cd /path/to/PlantCareTracker
./setup.sh
```

---

## **Running the App**

### **1. Start the Server**
Run the app:
```bash
npm start
```
The app will be available at:
- **Local**: `http://localhost:2000`
- **Network**: `http://<your-pi-ip>:2000` (e.g., `http://192.168.1.72:2000`)

### **Using the app from your phone on the same Wi‑Fi**
1. Start the server (`npm start` or `./setup.sh`). It listens on **0.0.0.0:2000**, so it’s reachable from your LAN.
2. Find your computer/Raspberry Pi IP on that network (e.g., `ip addr`, `hostname -I`, or `ipconfig` on Windows). You should get something like `192.168.1.42`.
3. On your phone (connected to the same Wi‑Fi), open a browser and visit `http://<that-ip>:2000` (for example `http://192.168.1.42:2000`). The page and API calls both use that origin, so the app works end‑to‑end.
4. If it doesn’t load, check that local firewalls allow inbound connections on port **2000**.

### Android physical device (Capacitor)
- Make sure your phone is on the same Wi‑Fi network as your laptop/Raspberry Pi.
- Start the backend with `./setup.sh` (it serves the page, API, and images from `http://192.168.1.31:2000`).
- Run the Android app from Android Studio; the bundled WebView loads `http://192.168.1.31:2000` directly.
- `localhost` on a physical phone points to the phone itself, so the LAN IP must be used for both the shell and API calls.

## Plant Identification
To use the optional Identify Plant feature, set your OpenAI API key before starting the server:
```bash
export OPENAI_API_KEY=your-api-key
export OPENAI_MODEL=gpt-5-mini   # optional
export OPENAI_TEMPERATURE=0       # optional, lower = more deterministic
```
The "Identify Plant" button on each detail page sends the plant photo to ChatGPT and shows the response in a popup. The answer is also copied to your clipboard.
If you accept the suggested description while the plant still has a default name
(like "Plant 1"), the name is automatically replaced with the **nom commun**
found in the description.

Setting `OPENAI_TEMPERATURE` to a low value (0 is the default) makes responses more consistent, which usually improves the accuracy of the identification.
For even more reliable results you can also try a dedicated plant identification API such as [Plant.id](https://web.plant.id/) or [PlantNet](https://plantnet.org/).


## **Running Tests**
Install dev dependencies first:
```bash
./setup.sh
```
Then execute:
```bash
npm test
```

### Offline read-only checks
- With the server running at `http://192.168.1.31:2000`, open the app in a desktop browser on that origin and verify the plant list, “days ago” values, and photos render.
- Open DevTools > Application > Service Workers and Cache Storage: confirm the service worker is active and caches contain `api-cache` entries for `/api/plants`, `/api/locations`, and `/api/lastClickedTimes`, plus `img-cache` entries for images.
- Stop the server, perform a hard reload, and confirm the list still shows with cached dates/images. An “Offline (read-only)” banner should appear and all mutating buttons remain disabled.
- On an Android physical device launched from Android Studio, the app should load from `http://192.168.1.31:2000` (not localhost) and behave the same online/offline.

---

## **API Overview**

The server exposes a small REST API under `/api` on the same origin as the static files. Useful endpoints:

- `GET /api/plants` – list all non‑archived plants.
- `GET /api/plants/:name` – fetch details for a single plant.
- `POST /api/plants` – create a plant.
- `PUT /api/plants/:name` – update a plant or archive it by sending `{ "archived": true }`.
- `DELETE /api/plants/:name` – remove a plant.
- `GET /api/locations` – list locations.
- `POST /api/locations` – add a location (returns **201** when created, **200** if it already existed).
- `DELETE /api/locations/:name` – delete a location and reassign any plants using it.
- `GET /api/lastClickedTimes` – retrieve timestamps for watering and feeding actions.
- `POST /api/clicked` – record a watering or feeding action.
- `POST /api/undo` – revert the most recent action for a button.

---

## **Auto-Start on Boot**

To ensure your app runs automatically on Raspberry Pi startup, you can use **`cron`**. Here’s how to set it up:

---

### **Using `cron`**
1. Open the cron table:
   ```bash
   crontab -e
   ```

2. Add this line at the end (replace `/home/mirror/PlantCareTracker` with your path):
   ```bash
   @reboot cd /home/mirror/PlantCareTracker && /usr/bin/npm start
   ```

3. Save and exit (`Ctrl+X` → `Y` → `Enter`).

---

### **Verify After Reboot**
1. Restart your Pi:
   ```bash
   sudo reboot
   ```

2. After reboot, check if the app is running:
   ```bash
   curl http://localhost:2000
   ```

---

### **Troubleshooting**
- If it fails, check logs for `systemd`:
  ```bash
  journalctl -u plantcaretracker.service
  ```
- Ensure your `server.js` binds to `0.0.0.0` (already done in your code).
---

## **Restarting the App**

If you make changes to the app or need to restart it:

1. Stop the service:
   ```bash
   sudo systemctl stop plantcaretracker.service
   ```

2. Start it again:
   ```bash
   sudo systemctl start plantcaretracker.service
   ```

---

## **File Structure**
```
.
├── lastClickedTimes.json       # Stores timestamps for plant actions
├── node_modules                # Installed dependencies
├── package.json                # Project metadata and dependencies
├── package-lock.json           # Lock file for dependencies
├── public                      # Frontend files
│   ├── index.html              # Main HTML file
│   └── script.js               # JavaScript for the frontend
└── server.js                   # Backend server code
```

## Image Handling

Photos taken with modern phones are often around 4000&times;3000 pixels and over 1&nbsp;MB. To keep the app lightweight on mobile devices, new images are automatically cropped to a square and scaled down to **600&times;600** pixels before being sent to the server. This happens directly in the browser when selecting a photo on the create or edit pages.

---

## **Troubleshooting**

- **App not accessible on the network**:
  - Ensure the server binds to `0.0.0.0` (already done in `server.js`).
  - Check your Raspberry Pi’s IP address:
    ```bash
    hostname -I
    ```

- **App crashes or doesn’t start**:
  - Check logs:
    ```bash
    journalctl -u plantcaretracker.service
    ```

---

Enjoy keeping your plants healthy and happy! 🌱
