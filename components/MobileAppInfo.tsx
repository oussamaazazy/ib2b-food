
import React, { useState, useEffect } from 'react';

const MobileAppInfo: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [isPrivateUrl, setIsPrivateUrl] = useState(false);

  useEffect(() => {
    // التحقق إذا كان الرابط هو رابط معاينة خاص بـ Google AI Studio
    if (window.location.href.includes('aistudio.google.com')) {
      setIsPrivateUrl(true);
    }
  }, []);

  const copyUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 p-4 font-['Cairo']" dir="rtl">
      {/* Hero Section */}
      <div className="text-center space-y-4 pt-6">
        <div className="w-20 h-20 bg-[#feee00] rounded-[2rem] mx-auto flex items-center justify-center text-slate-800 text-4xl shadow-2xl rotate-3">
          📱
        </div>
        <h1 className="text-3xl font-black text-slate-800">مركز استخراج الـ APK</h1>
        <p className="text-gray-500 max-w-lg mx-auto leading-relaxed font-bold">
          دليل حل مشكلة "خطأ 500" وتحويل المتجر إلى تطبيق حقيقي.
        </p>
      </div>

      {/* 500 Error Warning Box */}
      {isPrivateUrl && (
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 shadow-sm animate-pulse">
          <div className="flex gap-4">
            <div className="text-3xl">⚠️</div>
            <div className="space-y-2">
              <h3 className="text-red-800 font-black text-lg">تنبيه: أنت تستخدم "رابط معاينة"</h3>
              <p className="text-xs text-red-700 leading-relaxed font-bold">
                تحويل روابط <b>AI Studio</b> مباشرة إلى APK سيؤدي دائماً إلى <b>خطأ 500</b> لأن جوجل تمنع التطبيقات من الوصول لصفحة المعاينة الخاصة بك.
              </p>
              <div className="pt-2">
                <p className="text-[10px] text-red-900 font-black">الحل: يجب رفع الكود على استضافة عامة (مثل Vercel) أولاً ثم تحويل الرابط الجديد.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Readiness Check */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
          <span className="text-2xl">🔍</span> فحص جاهزية التطبيق للتحويل
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border">
            <div className="flex items-center gap-3">
              <span className="text-xl">{isPrivateUrl ? '❌' : '✅'}</span>
              <span className="text-sm font-bold text-gray-700">نوع الرابط (URL Type)</span>
            </div>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isPrivateUrl ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {isPrivateUrl ? 'رابط معاينة خاص' : 'رابط عام جاهز'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border">
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <span className="text-sm font-bold text-gray-700">ملفات الـ Manifest</span>
            </div>
            <span className="text-[10px] bg-green-100 text-green-600 font-black px-3 py-1 rounded-full">جاهزة للاستخراج</span>
          </div>
        </div>
      </div>

      {/* Action Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <h3 className="text-lg font-black mb-4 flex items-center gap-2">
             <span>1️⃣</span> كيف تحصل على رابط جاهز؟
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            1. قم بتحميل الكود (Download Code).<br/>
            2. ارفعه على <b>Vercel</b> أو <b>GitHub</b>.<br/>
            3. ستحصل على رابط مثل (my-app.vercel.app).<br/>
            4. هذا الرابط هو ما سيتحول إلى APK ناجح 100%.
          </p>
          <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black transition-all border border-white/10">
             تحميل الكود للرفع 📥
          </button>
        </div>

        <div className="bg-[#feee00] p-8 rounded-3xl text-slate-800 shadow-xl flex flex-col">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2">
             <span>2️⃣</span> التحويل المباشر
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed mb-6 font-bold">
            بمجرد حصولك على الرابط العام، استخدم أداة WebIntoApp للحصول على ملف الـ APK فوراً وبدون أي أخطاء.
          </p>
          <div className="mt-auto space-y-2">
            <button onClick={copyUrl} className="w-full py-3 bg-slate-800 text-white rounded-xl text-xs font-black active:scale-95 transition-all">
              {copied ? 'تم نسخ الرابط! ✅' : 'نسخ الرابط العام'}
            </button>
            <a 
              href="https://www.webintoapp.com/" 
              target="_blank" 
              className="block w-full py-3 bg-white text-center rounded-xl text-xs font-black shadow-sm"
            >
              الذهاب للمحول 🚀
            </a>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center">
        <p className="text-xs text-blue-800 font-black leading-relaxed">
          💡 إذا كنت لا تملك خبرة في الرفع على Vercel، يمكنك استشارة مبرمج لرفع الكود لك مرة واحدة فقط، وبعدها يمكنك صنع آلاف نسخ الـ APK بنفسك.
        </p>
      </div>
    </div>
  );
};

export default MobileAppInfo;
