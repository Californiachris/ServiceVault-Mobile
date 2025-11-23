import type { CapacitorConfig } from '@capacitor/cli';

// Use production URL if available, otherwise fallback to development
const getServerUrl = () => {
  // For development builds, use localhost or Replit preview URL
  if (process.env.NODE_ENV === 'development') {
    return undefined; // Capacitor will use default (file:// protocol)
  }
  // Production builds should use the actual deployed URL
  return process.env.VITE_API_URL || undefined;
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
