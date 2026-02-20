
import React, { useRef, useEffect, useState } from 'react';

interface ScannerModalProps {
  onScan: (barcode: string) => void;
  onCapture: (base64: string) => void;
  onClose: () => void;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ onScan, onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // إعداد فاحص الباركود إذا كان مدعوماً
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
          });

          interval = window.setInterval(async () => {
            if (videoRef.current && isScanning) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  setIsScanning(false);
                  onScan(barcodes[0].rawValue);
                  if (navigator.vibrate) navigator.vibrate(200);
                }
              } catch (e) {
                // Ignore detection errors
              }
            }
          }, 500);
        }
      } catch (err) {
        setError('تعذر الوصول للكاميرا. يرجى التحقق من التصاريح.');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (interval) clearInterval(interval);
    };
  }, [onScan, isScanning]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
        onCapture(base64);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-black flex flex-col font-['Tajawal']" dir="rtl">
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="p-10 text-center space-y-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-4xl"></i>
            <p className="text-white">{error}</p>
            <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-full text-white">إغلاق</button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Overlay Scanner UI */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative w-64 h-64 border-2 border-blue-500/50 rounded-3xl overflow-hidden shadow-[0_0_0_100vmax_rgba(0,0,0,0.6)]">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent animate-[scan_2s_infinite]"></div>
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
              </div>
              <p className="text-white/70 text-[10px] font-black mt-8 uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                وجه الكاميرا نحو الباركود أو المنتج
              </p>
            </div>
          </>
        )}
      </div>

      <div className="h-32 bg-[#050810] flex items-center justify-around px-10 border-t border-white/5">
        <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white">
          <i className="fas fa-times"></i>
        </button>
        <button 
          onClick={captureImage}
          className="w-20 h-20 rounded-full border-4 border-white/20 p-1 group active:scale-95 transition-all"
        >
          <div className="w-full h-full rounded-full bg-white group-hover:bg-blue-500 transition-colors"></div>
        </button>
        <div className="w-12 h-12"></div> {/* Spacer */}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
};

export default ScannerModal;
