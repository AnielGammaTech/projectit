import { Capacitor } from '@capacitor/core';

export function isNative() {
  return Capacitor.isNativePlatform();
}

export function getPlatform() {
  return Capacitor.getPlatform();
}

export function isIOS() {
  return Capacitor.getPlatform() === 'ios';
}
