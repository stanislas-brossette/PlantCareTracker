# PlantCareTracker Overview

PlantCareTracker is a self‑contained plant management application built with Node.js, Express and vanilla JavaScript.  The codebase provides both a small REST backend and a mobile‑friendly frontend.  An optional Android wrapper is included via Capacitor so the web app can run as a native application.

## Runtime Architecture

### Server
- **Entry point:** `server.js`
- **Framework:** Express
- **Port:** 3000, bound to `0.0.0.0` so the server is reachable on the local network.
- **Data storage:** simple JSON files in the project root:
  - `plants.json` – array describing each plant
  - `locations.json` – array of known location names
  - `lastClickedTimes.json` – map of button IDs to ISO timestamps
- **OpenAI integration:** the `/identify` endpoint sends a base64 encoded plant photo to the OpenAI ChatGPT API.  The response is parsed to extract a plant description and watering/feeding schedule.

The server exports the Express instance so tests can import it. When run directly it listens on port 3000.

### Frontend
Static files under `public/` contain the client side code.  The major pages are:
- `index.html` – dashboard listing all plants with quick watering and feeding buttons.
- `create.html` – form used to create a new plant.
- `plant.html` – detail page with editing capabilities for a single plant.
- `locations.html` – management page for locations.

Bootstrap is used for styling, and the scripts rely only on vanilla DOM APIs.  `config.js` rewrites relative fetch URLs so the frontend can talk to a remote API (useful for the Android build).

The frontend code is split into several JavaScript files:
- `script.js` – logic for the dashboard, time tracking buttons and swipe navigation between locations.
- `create.js` – handles the create form, photo capture/resize, and plant identification.
- `plant.js` – advanced editor for a plant, including swipe navigation between plants and schedule editing.
- `locations.js` – adds/removes locations via the API.
- `leafAnimations.js` – provides various loading animations where a leaf image moves around the screen.

Images uploaded by the user are resized client‑side to 600×600 before being sent to the server.  Each plant record stores a relative image path within `public/images/`.

### Android Wrapper
The `android/` directory contains the Capacitor project used to package the web app as an Android application.  `capacitor.config.ts` specifies the application id, name and that web assets come from the `public/` folder.  The `setup.sh` script installs dependencies, syncs Capacitor plugins and opens the Android project.

## Data Model
A plant entry in `plants.json` has the following structure:
```json
{
  "name": "Calathea",
  "description": "markdown description",
  "image": "images/img_123456.jpeg",
  "location": "Apartment",
  "archived": false,
  "wateringMin": [null, 7, ...],
  "wateringMax": [null, 10, ...],
  "feedingMin": [null, null, ...],
  "feedingMax": [null, null, ...]
}
```
`wateringMin`, `wateringMax`, `feedingMin` and `feedingMax` are arrays of 12 numbers or `null`, one for each month.  They represent the recommended number of days between actions.

`lastClickedTimes.json` maps button IDs such as `"button-Calathea-Arrosage"` to ISO timestamps which allows the interface to display "3 days ago" and highlight overdue tasks.

## REST API
The backend exposes a small set of endpoints consumed by the frontend.  They return JSON and accept JSON bodies.

- `GET /plants` – list all non‑archived plants.
- `GET /plants/:name` – get details of one plant.
- `POST /plants` – create a plant.  If the `name` field is blank a unique name like "Plant 1" is generated.  Images can be supplied as a base64 string (`imageData`) or as an existing relative path (`image`).
- `PUT /plants/:name` – update plant fields.  Renaming a plant updates any stored timestamps.  Archiving a plant removes its button timestamps.
- `DELETE /plants/:name` – permanently remove a plant and its timestamp data.
- `GET /locations` – list all location names.
- `POST /locations` – add a location.  Returns `201` if created or `200` if it already existed.
- `DELETE /locations/:name` – remove a location.  Plants using it are reassigned to the remaining first location.
- `GET /lastClickedTimes` – retrieve the map of timestamps.
- `POST /clicked` – record a watering or feeding action for a given button ID.
- `POST /undo` – revert the most recent action for a button.
- `POST /identify` – send a plant image to the OpenAI API and return the parsed description and schedule.

## Helper Scripts and Utilities
- `parseIdentifyResponse.js` parses the markdown/JSON response from ChatGPT, stripping headings and extracting the optional watering/feeding schedule.
- `analyze_images.js` scans all images in `public/images/` to report their sizes and optionally crop/resize them to 600×600 using Jimp.

## Tests
The `tests/` directory contains Jest test suites covering the server API and the response parser.  `server.test.js` exercises most endpoints, creating temporary plants and locations, and verifying that actions update `lastClickedTimes.json` as expected.  `identify.test.js` validates that `parseIdentifyResponse` correctly extracts data.

Running `npm test` executes all tests.

## User Experience
The dashboard shows a table of plants.  Each plant has two buttons – "Arrosage" (watering) and "Engrais" (feeding).  The buttons display how long it has been since the last action and change color based on the configured schedule (normal → warning → overdue).  Locations can be switched via a drop‑down and the app supports swipe gestures to switch locations or to navigate between plant detail pages on mobile.

Creating or editing a plant allows photo upload (with optional capture via the Capacitor Camera plugin), Markdown description editing, and entry of monthly watering/feeding frequencies.  The "Identify Plant" feature sends the current photo to ChatGPT which returns a short description and an optional schedule.  This information can be applied to the form with a single click.  If the plant still has a default name, accepting the description will automatically rename it using the detected common name.

## Conclusion
PlantCareTracker is a lightweight full‑stack application intended for personal use on devices like a Raspberry Pi or as a packaged Android app.  It demonstrates how a small Express backend can manage persistent JSON data while a simple client-side application provides a responsive, mobile‑friendly interface.  Integration with OpenAI and optional Capacitor packaging add extra capabilities without complicating the core architecture.
