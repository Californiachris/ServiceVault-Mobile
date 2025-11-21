import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { takePhoto, pickImageFromGallery, isNativeApp } from '@/lib/capacitor';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';

interface NativeCameraProps {
  onPhotoCapture: (photoUri: string) => void;
  onError?: (error: string) => void;
}

export function NativeCamera({ onPhotoCapture, onError }: NativeCameraProps) {
  const [loading, setLoading] = useState(false);

  if (!isNativeApp()) {
    return null;
  }

  const handleTakePhoto = async () => {
    try {
      setLoading(true);
      const photo = await takePhoto();
      if (photo?.webPath) {
        onPhotoCapture(photo.webPath);
      }
    } catch (error) {
      console.error('Camera error:', error);
      onError?.('Failed to capture photo');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setLoading(true);
      const photo = await pickImageFromGallery();
      if (photo?.webPath) {
        onPhotoCapture(photo.webPath);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      onError?.('Failed to pick image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleTakePhoto}
        disabled={loading}
        size="sm"
        className="flex items-center gap-2"
        data-testid="button-camera"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        Take Photo
      </Button>
      <Button
        onClick={handlePickImage}
        disabled={loading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        data-testid="button-gallery"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        From Gallery
      </Button>
    </div>
  );
}
