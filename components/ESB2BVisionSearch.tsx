
import React, { useRef, useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface ESB2BVisionSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (searchTerm: string) => void;
}

const ESB2BVisionSearch: React.FC<ESB2BVisionSearchProps> = ({ isOpen, onClose, onResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorType, setErrorType] = useState<'permission' | 'notfound' | 'other' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setErrorType(null);
      setErrorMessage(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("unsupported");
      }
      const constraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
        };
      }
    } catch (err: any) {
      const errorName = err.name || '';
      const errorMsg = err.message || '';
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorMsg.toLowerCase().includes('denied')) {
        setErrorType('permission');
        setErrorMessage("عذراً، وصول الكاميرا محظور. يرجى تفعيل الكاميرا من إعدادات المتصفح أو رفع صورة يدوياً.");
      } else {
        setErrorType('other');
        setErrorMessage("حدث خطأ غير متوقع أثناء تشغيل الكاميرا.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const processImage = async (base64Image: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
            { text: "تعرف على هذا المنتج في الصورة. أعطني اسماً مختصراً جداً باللغة العربية لاستخدامه في محرك بحث لمتجر ESB2B." }
          ]
        }
      });
      const resultText = response.text?.trim() || "";
      if (resultText) {
        onResult(resultText);
        onClose();
      }
    } catch (err) {
      setErrorMessage("عذراً، لم نتمكن من تحليل الصورة. حاول مجدداً.");
    } finally {
      setIsProcessing(false);
    }
  };

  const captureFromVideo = () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx && video.videoWidth > 0) {
      ctx.drawImage(video, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      processImage(base64Image);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col font-['Cairo']" dir="rtl">
      <div className="p-4 flex items-center justify-between text-white bg-black/50 absolute top-0 w-full z-10">
        <button onClick={onClose} className="text-xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">✕</button>
        <h3 className="font-bold text-sm">البحث البصري في ESB2B</h3>
        <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-[#feee00] text-black px-4 py-2 rounded-full font-black shadow-lg">رفع ملف</button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            processImage(base64String);
          };
          reader.readAsDataURL(file);
        }
      }} />

      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
        {errorMessage ? (
          <div className="p-8 text-center text-white space-y-6 max-w-sm animate-fadeIn z-20">
            <div className="bg-white/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-2xl">
               <span className="text-5xl">{errorType === 'permission' ? '🔒' : '⚠️'}</span>
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black text-[#feee00]">تنبيه الأمان</h4>
              <p className="text-sm text-white/80 leading-relaxed font-bold">{errorMessage}</p>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-[#feee00]/30 rounded-[48px] relative shadow-[0_0_0_100vmax_rgba(0,0,0,0.7)]">
                <div className="absolute -top-1 -right-1 w-14 h-14 border-t-[6px] border-r-[6px] border-[#feee00] rounded-tr-[40px]"></div>
                <div className="absolute -top-1 -left-1 w-14 h-14 border-t-[6px] border-l-[6px] border-[#feee00] rounded-tl-[40px]"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-[#feee00] shadow-[0_0_30px_#feee00] animate-scanline opacity-70"></div>
              </div>
            </div>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="p-8 bg-gradient-to-t from-black via-black/90 to-transparent absolute bottom-0 w-full flex flex-col items-center gap-6">
        {!errorMessage && (
          <button onClick={captureFromVideo} disabled={isProcessing} className="w-20 h-20 rounded-full border-[6px] border-white/20 flex items-center justify-center transition-all relative group">
            <div className={`w-16 h-16 rounded-full shadow-2xl transition-all ${isProcessing ? 'bg-gray-700 scale-75' : 'bg-white group-active:scale-90 group-hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]'}`}></div>
          </button>
        )}
        {isProcessing && (
          <div className="flex flex-col items-center gap-3 text-[#feee00] text-xs font-black animate-pulse bg-black/60 px-8 py-4 rounded-3xl border border-[#feee00]/30 backdrop-blur-xl">
            <span>ذكاء ESB2B يحلل الصورة الآن...</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanline {
          0% { top: 5%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
        .animate-scanline { animation: scanline 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default ESB2BVisionSearch;
