import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stanislas.plantcaretracker',
  appName: 'PlantCareTracker',
  webDir: 'public',
  server: {
    androidScheme: 'http'
  }
};

export default config;
