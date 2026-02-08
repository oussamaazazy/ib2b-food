import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppUser } from '../types';
import { ESLogo } from '../App';
import { Eye, EyeOff, Lock, User, Info, Smartphone } from 'lucide-react';

type UserRole = 'guest' | 'admin' | 'seller' | 'buyer';

interface ESB2BLoginProps {
  users: AppUser[];
  onLogin: (role: UserRole, user: AppUser) => void;
  onBack: () => void;
  lang?: 'ar' | 'en';
}

const ESB2BLogin: React.FC<ESB2BLoginProps> = ({ users = [], onLogin, onBack, lang = 'ar' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loginTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. بصمة الجهاز (محسنة لتعمل مرة واحدة) ---
  const currentDeviceID = useMemo(() => {
    let id = localStorage.getItem('esb2b_device_sig');
    if (!id) {
      id = 'DV-' + Math.random().toString(36).substring(2, 12).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem('esb2b_device_sig', id);
    }
    return id;
  }, []);

  // --- 2. ميزة تذكرني: استعادة البيانات عند تحميل الصفحة ---
  useEffect(() => {
    const savedUser = localStorage.getItem('rememberedUser');
    if (savedUser) {
      setEmail(savedUser);
      setRememberMe(true);
    }
    
    return () => {
      if (loginTimerRef.current) clearTimeout(loginTimerRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    loginTimerRef.current = setTimeout(() => {
      const inputIdentifier = email.trim().toLowerCase();
      const inputPassword = password.trim();
      
      const matchedUser = users.find(u => {
        const uEmail = (u.email || "").toLowerCase();
        const uUsername = (u.username || "").toLowerCase();
        return (uUsername === inputIdentifier || uEmail === inputIdentifier) && u.password === inputPassword;
      });

      if (matchedUser) {
        // --- حماية الجهاز ---
        if (matchedUser.role !== 'admin') {
          const savedDeviceKey = `device_lock_${matchedUser.id}`;
          const registeredID = localStorage.getItem(savedDeviceKey);

          if (registeredID && registeredID !== currentDeviceID) {
            setError('⚠️ أمن الحساب: هذا الحساب مرتبط بجهاز آخر. لا يمكن الدخول من هذا الجوال.');
            setIsLoading(false);
            return;
          }

          if (!registeredID) {
            localStorage.setItem(savedDeviceKey, currentDeviceID);
          }
        }

        // --- حفظ أو مسح بيانات تذكرني ---
        if (rememberMe) {
          localStorage.setItem('rememberedUser', inputIdentifier);
        } else {
          localStorage.removeItem('rememberedUser');
        }

        onLogin(matchedUser.role, matchedUser);
      } else {
        setError('بيانات الدخول غير صحيحة. يرجى التأكد من اسم المستخدم وكلمة المرور.');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-navy/5 rounded-full blur-[120px]"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-mint/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-navy/5 z-10 animate-fadeIn">
        <div className="bg-navy p-10 flex flex-col items-center">
          <ESLogo size="xl" light />
          <p className="text-mint font-bold text-[10px] tracking-[0.3em] mt-4 uppercase opacity-80">Easy . Smart . Business</p>
        </div>

        <div className="p-8 md:p-12 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-navy">تسجيل الدخول</h2>
            <p className="text-gray-400 text-xs font-bold">أدخل بيانات الحساب للوصول إلى المنصة</p>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-black text-center border border-red-100 animate-shake flex items-center justify-center gap-2">
              <Info size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <label className="text-[10px] font-black text-gray-400 uppercase mr-2 mb-1 block">اسم المستخدم</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full pr-12 pl-6 py-4 bg-surface border-2 border-transparent rounded-2xl outline-none focus:border-mint focus:bg-white font-bold text-sm transition-all text-right" 
                  placeholder="username"
                  required 
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-mint transition-colors" size={20} />
              </div>
            </div>

            <div className="relative group">
              <label className="text-[10px] font-black text-gray-400 uppercase mr-2 mb-1 block">كلمة المرور</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full pr-12 pl-12 py-4 bg-surface border-2 border-transparent rounded-2xl outline-none focus:border-mint focus:bg-white font-bold text-sm transition-all text-right" 
                  placeholder="••••••••"
                  required 
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-mint transition-colors" size={20} />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-navy transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-navy focus:ring-mint accent-navy" 
                />
                <span className="text-[11px] font-bold text-gray-500 group-hover:text-navy transition-colors">تذكرني</span>
              </label>
              <button 
                type="button"
                onClick={() => alert('يرجى التواصل مع الدعم الفني لإعادة تعيين الجهاز أو كلمة المرور: 0597892723')}
                className="text-[11px] font-bold text-navy/60 hover:text-navy hover:underline transition-all"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-navy text-mint py-5 rounded-2xl font-black text-sm shadow-lg hover:shadow-navy/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-mint/30 border-t-mint rounded-full animate-spin"></div>
              ) : 'تسجيل الدخول'}
            </button>
          </form>
          
          <div className="flex items-center justify-center gap-2 text-[9px] text-gray-300 font-bold pt-4">
            <Smartphone size={10} />
            <span>معرف الجهاز الآمن: {currentDeviceID.substring(0, 15)}...</span>
          </div>
        </div>
      </div>

      <style>{`
        .animate-shake { animation: shake 0.3s ease-in-out; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ESB2BLogin;