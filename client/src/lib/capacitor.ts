import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

export const isAndroid = () => {
  return Capacitor.getPlatform() === 'android';
};

export const isIOS = () => {
  return Capacitor.getPlatform() === 'ios';
};

export async function takePhoto() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });
    return image;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
}

export async function pickImageFromGallery() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
    });
    return image;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
}

export async function getCurrentLocation() {
  try {
    const coordinates = await Geolocation.getCurrentPosition();
    return coordinates;
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
}

export async function watchLocation(callback: (coords: any) => void) {
  try {
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      (position) => {
        callback(position?.coords);
      }
    );
    return id;
  } catch (error) {
    console.error('Error watching location:', error);
    throw error;
  }
}

export async function clearLocationWatch(id: string) {
  try {
    await Geolocation.clearWatch({ id });
  } catch (error) {
    console.error('Error clearing location watch:', error);
  }
}

export function onAppResume(callback: () => void) {
  App.addListener('appStateChange', (state) => {
    if (state.isActive) {
      callback();
    }
  });
}

export function onAppPause(callback: () => void) {
  App.addListener('appStateChange', (state) => {
    if (!state.isActive) {
      callback();
    }
  });
}

// Push Notifications
export async function registerPushNotifications() {
  if (!isNativeApp()) return null;
  
  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      throw new Error('User denied permissions!');
    }

    await PushNotifications.register();
    
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Error registering push notifications:', error);
    return null;
  }
}

export function onPushNotificationReceived(callback: (notification: any) => void) {
  if (!isNativeApp()) return;
  
  PushNotifications.addListener('pushNotificationReceived', callback);
}

export function onPushNotificationActionPerformed(callback: (action: any) => void) {
  if (!isNativeApp()) return;
  
  PushNotifications.addListener('pushNotificationActionPerformed', callback);
}
