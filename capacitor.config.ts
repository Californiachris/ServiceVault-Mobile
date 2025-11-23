import type { CapacitorConfig } from '@capacitor/cli';

// Use production URL for mobile app
const getServerUrl = () => {
  return 'https://servicevault.app';
};

const config: CapacitorConfig = {
  appId: 'com.servicevault.app',
  appName: 'ServiceVault',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    url: getServerUrl(),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a',
    },
  },
};

export default config;
