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

### Changing the API host/port inside the app
- A floating **Connection** button (bottom-right of each page) opens a small panel where you can enter the backend IP/hostname and port (e.g., `192.168.1.31` and `2000`).
- Saving the values stores them locally and updates all API calls immediately. Use **Use default** to clear the override and fall back to the current origin.

## Offline acceptance test
1. In Chrome DevTools → Application, **Unregister** any existing service worker for this origin and clear storage for a clean slate.
2. Start the server with `npm start` and open the app in Chrome.
3. Browse the plant list and at least one plant detail page so images and data load while online. Confirm watering/feeding buttons show a relative time (not "Never").
4. Open DevTools → Application:
   - The service worker should show **Activated and is running**.
   - Cache Storage → `api-cache` should contain exact entries for `/plants`, `/locations`, and `/lastClickedTimes`.
   - Cache Storage → `img-cache` should contain plant images that were viewed.
5. Stop the server completely.
6. Hard reload the tab (Ctrl+Shift+R) or reopen it.

Expected results:
- App shell loads from cache.
- Plant list, plant details, and images still display.
- Watering/feeding buttons still show the cached relative time (no "Never").
- Offline banner is visible.
- Add/undo/watering/feeding/location management actions are disabled with an offline notice.

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

---

## **API Overview**

The server exposes a small REST API consumed by the frontend. Useful endpoints:

- `GET /plants` – list all non‑archived plants.
- `GET /plants/:name` – fetch details for a single plant.
- `POST /plants` – create a plant.
- `PUT /plants/:name` – update a plant or archive it by sending `{ "archived": true }`.
- `DELETE /plants/:name` – remove a plant.
- `GET /locations` – list locations.
- `POST /locations` – add a location (returns **201** when created, **200** if it already existed).
- `DELETE /locations/:name` – delete a location and reassign any plants using it.
- `GET /lastClickedTimes` – retrieve timestamps for watering and feeding actions.
- `POST /clicked` – record a watering or feeding action.
- `POST /undo` – revert the most recent action for a button.

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
