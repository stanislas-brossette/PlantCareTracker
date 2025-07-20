#!/usr/bin/env bash
set -e
npm install
npm install @capacitor/camera@latest @capacitor/filesystem@latest @capacitor/preferences@latest
npm run cap:sync
npm run build
npm run cap:copy
#npm run cap:open
npm start
