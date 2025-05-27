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
- **Node.js** and **npm** installed on your Raspberry Pi.
  To install:
  ```bash
  sudo apt update
  sudo apt install nodejs npm
  ```

### **2. Clone or Download the Project**
- If you haven’t already, download or clone the project to your Raspberry Pi.

### **3. Install Dependencies**
Navigate to the project directory and install dependencies:
```bash
cd /path/to/PlantCareTracker
npm install
```

---

## **Running the App**

### **1. Start the Server**
Run the app:
```bash
npm start
```
The app will be available at:
- **Local**: `http://localhost:3000`
- **Network**: `http://<your-pi-ip>:3000` (e.g., `http://192.168.1.72:3000`)

## Plant Identification
To use the optional Identify Plant feature, set your OpenAI API key before starting the server:
```bash
export OPENAI_API_KEY=your-api-key
export OPENAI_MODEL=gpt-4-turbo   # optional
```
The "Identify Plant" button on each detail page sends the plant photo to ChatGPT and shows the response in a popup. The answer is also copied to your clipboard.


## **Running Tests**
Install dev dependencies first:
```bash
npm install
```
Then execute:
```bash
npm test
```

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
   curl http://localhost:3000
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
