import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stanislas.plantcaretracker',
  appName: 'PlantCareTracker',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.31:2000',
    cleartext: true,
    androidScheme: 'http'
  }
};

export default config;
