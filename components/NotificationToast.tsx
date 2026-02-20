import React, { useEffect, useState } from 'react';
import { Notification } from '../types';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const [progress, setProgress] = useState(100);

  // 1. مؤقت الإغلاق التلقائي (آمن ومنفصل)
  useEffect(() => {
    const duration = 5000; // 5 ثواني
    
    // إغلاق التنبيه بعد انتهاء المدة
    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    // 2. إدارة شريط التقدم (للعرض البصري فقط)
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const progressTimer = setInterval(() => {
      setProgress(prev => (prev > 0 ? prev - step : 0));
    }, intervalTime);

    // تنظيف المؤقتات عند مسح المكون من الشاشة
    return () => {
      clearTimeout(closeTimer);
      clearInterval(progressTimer);
    };
  }, [onClose]);

  const typeConfig = {
    order: { icon: '🛒', color: 'border-emerald-500 bg-emerald-50', iconBg: 'bg-emerald-500' },
    update: { icon: '📢', color: 'border-blue-500 bg-blue-50', iconBg: 'bg-blue-500' },
    info: { icon: '💡', color: 'border-slate-800 bg-white', iconBg: 'bg-slate-800' }
  };

  const config = typeConfig[notification.type as keyof typeof typeConfig] || typeConfig.info;

  return (
    <div className={`pointer-events-auto w-full bg-white border-r-4 rounded-xl shadow-2xl overflow-hidden animate-slide-left p-4 flex gap-4 ${config.color}`}>
      {/* أيقونة التنبيه */}
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-lg ${config.iconBg} shadow-lg shadow-gray-200`}>
        {config.icon}
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className="text-xs font-black text-slate-900 leading-tight">{notification.title}</h4>
          {/* زر الإغلاق اليدوي */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="text-gray-300 hover:text-slate-900 text-[10px] p-1 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <p className="text-[10px] text-slate-600 font-bold mt-1 leading-relaxed">
          {notification.message}
        </p>
        
        {/* شريط التقدم البصري */}
        <div className="mt-3 h-0.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-linear duration-75 ${
              notification.type === 'order' ? 'bg-emerald-500' : 
              notification.type === 'update' ? 'bg-blue-500' : 'bg-slate-800'
            }`} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <style>{`
        @keyframes slide-left {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-left {
          animation: slide-left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .transition-linear {
          transition-timing-function: linear;
        }
      `}</style>
    </div>
  );
};

export default NotificationToast;