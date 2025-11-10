import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Camera, AlertCircle, ExternalLink, Lock, Smartphone, Shield } from 'lucide-react';

export type CameraStatus = 'initializing' | 'granted' | 'denied' | 'blocked' | 'error';

type BrowserType = 'chrome' | 'safari' | 'firefox' | 'other';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('firefox')) return 'firefox';
  return 'other';
}

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
    const browser = detectBrowser();
    
    const getBrowserInstructions = () => {
      if (browser === 'chrome') {
        return [
          'Tap the lock icon or "View site information" in the address bar',
          'Find "Camera" in the permissions list',
          'Change from "Block" to "Allow"',
          'Refresh this page to start scanning'
        ];
      } else if (browser === 'safari') {
        return [
          'Tap "aA" in the address bar (top left)',
          'Select "Website Settings"',
          'Tap "Camera" and choose "Allow"',
          'Refresh this page to start scanning'
        ];
      } else if (browser === 'firefox') {
        return [
          'Tap the lock icon in the address bar',
          'Tap "Connection" or "Permissions"',
          'Find Camera and change to "Allow"',
          'Refresh this page to start scanning'
        ];
      } else {
        return [
          'Look for a camera or lock icon in your address bar',
          'Find camera permissions in your browser settings',
          'Change permission from "Block" to "Allow"',
          'Refresh this page to start scanning'
        ];
      }
    };

    return (
      <Card className="border-border shadow-xl">
        <CardContent className="p-0">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-background p-6 border-b border-border">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-semibold">Camera Access Needed</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To scan QR codes or warranties on your equipment and assets
                </p>
              </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="p-6 space-y-6">
            {/* Iframe Error */}
            {isInIframeRef.current && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <ExternalLink className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      Preview Mode Detected
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                      Camera access is restricted in embedded previews. Open this page in a new tab to enable scanning.
                    </p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  onClick={() => window.open(window.location.href, '_blank')}
                  data-testid="button-open-new-tab"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
            )}

            {/* Permission Denied Instructions */}
            {cameraStatus === 'denied' && !isInIframeRef.current && (
              <div className="space-y-5">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <Lock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-1">Permission Currently Blocked</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You previously denied camera access. Follow the steps below to enable it.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span>How to Enable Camera Access</span>
                  </div>
                  
                  <ol className="space-y-3.5">
                    {getBrowserInstructions().map((instruction, index) => (
                      <li key={index} className="flex gap-3 items-start">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm text-foreground leading-relaxed pt-0.5">
                          {instruction}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed">
                    <strong className="font-semibold">Privacy Note:</strong> Your camera access is only used to scan QR codes. 
                    We never record or store camera footage.
                  </p>
                </div>
              </div>
            )}

            {/* Other Errors */}
            {cameraStatus === 'error' && !isInIframeRef.current && (
              <div className="bg-muted/30 border border-border rounded-lg p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-sm">Technical Issue</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {onFallbackRequest && (
                <Button 
                  variant="outline" 
                  className="flex-1 shadow-sm"
                  onClick={() => {
                    onFallbackRequest();
                    handleClose();
                  }}
                  data-testid="button-use-fallback"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Enter Code Manually
                </Button>
              )}
              <Button 
                variant={onFallbackRequest ? "outline" : "default"}
                className={onFallbackRequest ? "flex-1 shadow-sm" : "w-full shadow-sm"}
                onClick={handleClose} 
                data-testid="button-close-scanner"
              >
                Close
              </Button>
            </div>
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
