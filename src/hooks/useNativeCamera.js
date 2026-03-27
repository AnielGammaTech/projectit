import { useCallback } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNative } from '@/lib/capacitor';

export function useNativeCamera() {
  const isNativeCamera = isNative();

  const getPhoto = useCallback(async (source) => {
    if (!isNativeCamera) return null;

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
        width: 1920,
        height: 1920,
        correctOrientation: true,
      });

      if (!photo.dataUrl) return null;

      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();
      const extension = photo.format || 'jpeg';
      const file = new File([blob], `photo-${Date.now()}.${extension}`, {
        type: `image/${extension}`,
      });

      return { file, dataUrl: photo.dataUrl };
    } catch (err) {
      if (err.message?.includes('cancelled') || err.message?.includes('User cancelled')) {
        return null;
      }
      throw err;
    }
  }, [isNativeCamera]);

  const takePhoto = useCallback(
    () => getPhoto(CameraSource.Camera),
    [getPhoto]
  );

  const pickFromGallery = useCallback(
    () => getPhoto(CameraSource.Photos),
    [getPhoto]
  );

  return { takePhoto, pickFromGallery, isNativeCamera };
}
