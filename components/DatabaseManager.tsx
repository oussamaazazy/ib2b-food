
import React from 'react';

const DatabaseManager: React.FC = () => {
  const currentLoad = {
    sellers: 10,
    users: 200,
    products: 500,
    ordersMonthly: 1000, // افتراضي بناءً على عدد المستخدمين
    images: 1000
  };

  const firebaseLimits = {
    auth: 50000,
    storageGB: 5,
    firestoreGB: 1, // 1 جيجابايت تعادل 1024 ميجابايت
  };

  // الحسبة التقنية للفواتير والطلبات
  const orderSizeKB = 1.5;
  const totalOrdersIn1GB = (1024 * 1024) / orderSizeKB; // حوالي 700 ألف فاتورة

  const stats = [
    { 
      label: 'الطلبات والفواتير', 
      current: currentLoad.ordersMonthly, 
      max: Math.round(totalOrdersIn1GB), 
      unit: 'فاتورة',
      icon: '🧾',
      color: 'bg-emerald-600',
      description: 'كل فاتورة مخزنة كبيانات نصية مشفرة'
    },
    { 
      label: 'المستخدمين', 
      current: currentLoad.users, 
      max: firebaseLimits.auth, 
      unit: 'مستخدم',
      icon: '👥',
      color: 'bg-blue-600',
      description: 'حسابات المشترين والمديرين'
    },
    { 
      label: 'المنتجات', 
      current: currentLoad.products, 
      max: 100000, 
      unit: 'منتج',
      icon: '📦',
      color: 'bg-orange-500',
      description: 'بيانات الأصناف والأسعار'
    },
    { 
      label: 'تخزين الصور', 
      current: currentLoad.images, 
      max: 25000, 
      unit: 'صورة',
      icon: '🖼️',
      color: 'bg-indigo-600',
      description: 'صور المنتجات والبروفايلات'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 pb-32 font-['Cairo']">
      {/* Header Section */}
      <div className="bg-slate-900 text-white rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden mb-10 border border-white/5">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-[#feee00] text-slate-900 px-4 py-1 rounded-full font-black text-[10px] uppercase italic">System Architecture</span>
            <span className="text-emerald-400 font-bold text-[10px]">● Firestore Database: ACTIVE</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4">تحليل سعة الفواتير والبيانات</h1>
          <p className="text-slate-400 max-w-2xl font-bold leading-relaxed">
            البيانات المالية (الطلبات، الفواتير، التحويلات) هي أخف أنواع البيانات. تطبيق <b>b2b</b> مصمم ليتحمل ملايين العمليات قبل أن تلاحظ أي استهلاك في المساحة.
          </p>
        </div>
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-emerald-600 rounded-full blur-[120px] opacity-10"></div>
      </div>

      {/* Capacity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, idx) => {
          const percentage = (stat.current / stat.max) * 100;
          return (
            <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-gray-100 group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
              </div>
              <h4 className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">{stat.label}</h4>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-black text-slate-900">{stat.current.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 font-bold">/ {stat.max > 1000 ? (stat.max/1000).toFixed(0)+'K' : stat.max}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full ${stat.color} transition-all duration-1000`} 
                  style={{ width: `${Math.max(2, percentage)}%` }}
                ></div>
              </div>
              <p className="text-[9px] text-gray-400 font-bold leading-tight">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Order & Invoice Depth Analysis */}
      <div className="bg-white rounded-[3.5rem] p-8 md:p-12 border border-gray-100 shadow-sm mb-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 space-y-6">
            <h3 className="text-2xl font-black text-slate-800">كم فاتورة يمكنني تخزينها مجاناً؟</h3>
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs text-emerald-800 font-bold leading-relaxed">
                  تطبيق <b>b2b</b> يستخدم بنية بيانات ذكية. الفاتورة الواحدة لا تتجاوز حجم "رسالة واتساب نصية قصيرة".
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-[10px] text-gray-400 font-black mb-1">المساحة المجانية</p>
                  <p className="text-xl font-black text-slate-900">1,024 MB</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-[10px] text-gray-400 font-black mb-1">الاستهلاك لكل 1000 طلب</p>
                  <p className="text-xl font-black text-slate-900">1.5 MB</p>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-64 h-64 bg-slate-900 rounded-[3rem] flex flex-col items-center justify-center text-center p-6 border-8 border-gray-50 shadow-inner">
             <div className="text-4xl mb-2">🚀</div>
             <p className="text-white font-black text-sm">أداء غير محدود</p>
             <p className="text-slate-500 text-[9px] font-bold mt-2 leading-relaxed">حتى لو وصل متجرك لـ 100,000 فاتورة، ستظل التكلفة 0 ريال.</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-600 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-blue-200">
        <div className="text-center md:text-right">
          <h4 className="text-xl font-black mb-2">هل تخطط للتوسع لآلاف البائعين؟</h4>
          <p className="text-sm text-blue-100 font-bold">نظام b2b مبني على معمارية NoSQL التي تتوسع تلقائياً مع نمو تجارتك.</p>
        </div>
        <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-transform">
          طلب استشارة تقنية
        </button>
      </div>
    </div>
  );
};

export default DatabaseManager;
