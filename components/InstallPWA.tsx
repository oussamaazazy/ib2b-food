import React, { useState, useEffect } from 'react';

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // 1. اكتشاف نظام iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isApple);

    // 2. القبض على حدث التثبيت للأندرويد والمتصفحات
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    // إظهار الزر دائماً للايفون (إذا لم يكن مثبتاً بالفعل)
    if (isApple && !(window.navigator as any).standalone) {
      setShowInstallBtn(true);
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert('لتثبيت التطبيق على iPhone:\n1. اضغط على زر المشاركة (Share) في المتصفح بالأسفل\n2. اختر "إضافة للشاشة الرئيسية" (Add to Home Screen)');
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBtn(false);
      }
    }
  };

  if (!showInstallBtn) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 bg-[#feee00] text-[#001f3f] px-3 py-2 rounded-xl font-black text-[10px] md:text-xs shadow-lg hover:scale-105 transition-transform animate-pulse border border-[#001f3f]/10"
    >
      <span className="text-sm md:text-base">📲</span>
      <span>تثبيت التطبيق</span>
    </button>
  );
};

export default InstallPWA;