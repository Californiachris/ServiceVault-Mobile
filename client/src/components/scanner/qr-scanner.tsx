import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Camera, AlertCircle, ExternalLink } from 'lucide-react';

export type CameraStatus = 'initializing' | 'granted' | 'denied' | 'blocked' | 'error';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  onStatusChange?: (status: CameraStatus, message?: string) => void;
  onFallbackRequest?: () => void;
}

// Simple QR code pattern detection for demo purposes
// In a real implementation, you'd use a proper QR scanning library
function detectQRPattern(imageData: ImageData): string | null {
  // This is a simplified mock implementation
  // Real QR detection would involve complex image processing
  const mockCodes = [
    'FT-HVAC-2024-A7K9',
    'FT-PLUMB-2024-B3M7',
    'FT-ELEC-2024-C5N2',
    'M-HOUSE-2024-H1R8'
  ];
  
  // Simulate detection based on random chance for demo
  if (Math.random() > 0.7) {
    return mockCodes[Math.floor(Math.random() * mockCodes.length)];
  }
  
  return null;
}

export default function QRScanner({ onScan, onClose, onStatusChange, onFallbackRequest }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('initializing');
  const isInIframeRef = useRef<boolean>(false);

  useEffect(() => {
    const inIframe = checkIframeStatus();
    if (!inIframe) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, []);

  const checkIframeStatus = (): boolean => {
    try {
      const inIframe = window.self !== window.top;
      isInIframeRef.current = inIframe;
      if (inIframe) {
        setError('Camera unavailable in embedded view. Please open in a new tab.');
        updateStatus('blocked', 'Camera blocked: Running in embedded view');
      }
      return inIframe;
    } catch (e) {
      isInIframeRef.current = true;
      setError('Camera unavailable in embedded view. Please open in a new tab.');
      updateStatus('blocked', 'Camera blocked: Cross-origin frame detected');
      return true;
    }
  };

  const updateStatus = (status: CameraStatus, message?: string) => {
    setCameraStatus(status);
    onStatusChange?.(status, message);
  };

  const startCamera = async () => {
    try {
      updateStatus('initializing', 'Requesting camera access...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API not supported in this browser.');
        updateStatus('error', 'Camera API not supported');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsScanning(true);
        setError(null);
        updateStatus('granted', 'Camera access granted');
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
        updateStatus('denied', 'Camera permission denied by user');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
        updateStatus('error', 'No camera device found');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application.');
        updateStatus('error', 'Camera in use by another app');
      } else {
        setError('Unable to access camera. Please ensure camera permissions are granted.');
        updateStatus('error', err.message || 'Unknown camera error');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = detectQRPattern(imageData);
    
    if (qrCode) {
      setIsScanning(false);
      stopCamera();
      onScan(qrCode);
    } else if (isScanning) {
      // Continue scanning
      requestAnimationFrame(scanFrame);
    }
  };

  useEffect(() => {
    if (isScanning && videoRef.current) {
      const video = videoRef.current;
      const handleLoadedData = () => {
        requestAnimationFrame(scanFrame);
      };
      
      video.addEventListener('loadeddata', handleLoadedData);
      return () => video.removeEventListener('loadeddata', handleLoadedData);
    }
  }, [isScanning]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
          </div>

          {isInIframeRef.current && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm text-left space-y-3">
              <p className="font-medium flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Solution: Open in New Tab
              </p>
              <p className="text-muted-foreground text-xs">
                Camera access is blocked in embedded views. Click below to open this page in a full browser tab where camera permissions will work.
              </p>
              <Button 
                className="w-full"
                onClick={() => window.open(window.location.href, '_blank')}
                data-testid="button-open-new-tab"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          )}

          {cameraStatus === 'denied' && (
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-left space-y-2">
              <p className="font-medium">Need Help?</p>
              <ul className="text-muted-foreground text-xs space-y-1 list-disc list-inside">
                <li>Check browser settings for camera permissions</li>
                <li>Look for a camera icon in the address bar</li>
                <li>Refresh the page after granting permissions</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            {onFallbackRequest && (
              <Button 
                variant="outline" 
                onClick={() => {
                  onFallbackRequest();
                  handleClose();
                }}
                data-testid="button-use-fallback"
              >
                Enter Code Manually
              </Button>
            )}
            <Button 
              variant={onFallbackRequest ? "outline" : "default"}
              onClick={handleClose} 
              data-testid="button-close-scanner"
            >
              Close Scanner
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Scanning for QR Code</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          data-testid="button-close-scanner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          data-testid="video-scanner"
        />
        
        {/* Scanning overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-4 border-2 border-primary rounded-2xl">
            <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-primary rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-primary rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-primary rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-primary rounded-br-lg"></div>
          </div>
          
          {/* Scanning line animation */}
          {isScanning && (
            <div className="absolute inset-4 overflow-hidden rounded-2xl">
              <div className="absolute w-full h-0.5 bg-primary animate-scan-line opacity-75"></div>
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-white text-sm">
              {isScanning ? 'Position QR code within the frame' : 'Starting camera...'}
            </p>
          </div>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="hidden"
        data-testid="canvas-scanner"
      />
      
      <div className="flex justify-center mt-4">
        <Button
          variant="outline"
          onClick={handleClose}
          data-testid="button-stop-scanning"
        >
          <Camera className="mr-2 h-4 w-4" />
          Stop Scanning
        </Button>
      </div>
    </div>
  );
}
