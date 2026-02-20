import React from 'react';
import { AppUser } from '../types';
import { SUPPLIER_PHONE } from '../constants';

interface ESB2BProfileProps {
  userRole: string;
  currentUser: AppUser | null;
  onLogout: () => void;
  onNavigate: (tab: string, subTab?: any) => void; // تم تعديل النوع لقبول بارامترات مرنة
  lang?: 'ar' | 'en';
}

const ESB2BProfile: React.FC<ESB2BProfileProps> = ({ userRole, currentUser, onLogout, onNavigate, lang = 'ar' }) => {
  const isRTL = lang === 'ar';

  const businessDetails = {
    taxId: "310293847500003",
  };

  const labels = {
    ar: {
      unregistered: "مؤسسة أعمال غير مسجلة",
      myOrders: "طلباتي",
      favorites: "المفضلة",
      invoices: "الفواتير",
      notifs: "الاشعارات",
      purchases: "إدارة المشتريات",
      tracking: "تتبع الطلبات النشطة",
      recurring: "الطلبات المتكررة",
      coupons: "كوبونات الخصم والجوائز",
      businessData: "بيانات المنشأة",
      certificates: "الشهادات والتراخيص",
      warehouses: "عناوين المستودعات والشحن",
      support: "الدعم والإعدادات",
      security: "إعدادات الأمان والتنبيهات",
      help: "مركز المساعدة والشكاوى (واتساب)",
      logout: "تسجيل الخروج من المنصة",
      version: "إصدار التطبيق"
    },
    en: {
      unregistered: "Unregistered Business Entity",
      myOrders: "My Orders",
      favorites: "Favorites",
      invoices: "Invoices",
      notifs: "Notifications",
      purchases: "Procurement Management",
      tracking: "Active Order Tracking",
      recurring: "Recurring Orders",
      coupons: "Coupons & Rewards",
      businessData: "Business Info",
      certificates: "Certificates & Licenses",
      warehouses: "Warehouse Addresses",
      support: "Support & Settings",
      security: "Security & Alerts",
      help: "Help Center (WhatsApp)",
      logout: "Logout of Platform",
      version: "App Version"
    }
  }[lang];

  const menuSections = [
    {
      title: labels.purchases,
      items: [
        { id: 'cart', subId: 'tracking' as const, label: labels.tracking, icon: '📦', color: 'bg-blue-50 text-blue-600' },
        { id: 'home', label: labels.recurring, icon: '🔄', color: 'bg-emerald-50 text-emerald-600' },
        { id: 'offers', label: labels.coupons, icon: '🎟️', color: 'bg-orange-50 text-orange-600' },
      ]
    },
    {
      title: labels.businessData,
      items: [
        { id: 'docs', label: labels.certificates, icon: '📄', color: 'bg-indigo-50 text-indigo-600' },
        { id: 'addresses', label: labels.warehouses, icon: '📍', color: 'bg-red-50 text-red-600' },
      ]
    },
    {
      title: labels.support,
      items: [
        { id: 'settings', label: labels.security, icon: '⚙️', color: 'bg-slate-100 text-slate-600' },
        { 
          id: 'help', 
          label: labels.help, 
          icon: '🎧', 
          color: 'bg-purple-50 text-purple-600', 
          isExternal: true, 
          url: `https://wa.me/${SUPPLIER_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent('مرحباً، أحتاج مساعدة في منصة ib2b')}` 
        },
      ]
    }
  ];

  return (
    <div className={`min-h-screen bg-[#f7f7f7] font-['Cairo'] pb-40`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white px-6 py-10 border-b shadow-sm relative overflow-hidden">
        <div className={`absolute ${isRTL ? '-right-20' : '-left-20'} -top-20 w-64 h-64 bg-[#feee00]/10 rounded-full opacity-50 blur-3xl`}></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-28 h-28 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl border-4 border-white transition-transform group-hover:rotate-3">
                🏢
              </div>
              <div className={`absolute -bottom-1 ${isRTL ? '-right-1' : '-left-1'} bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center`}>
                <span className="text-[10px] text-white">✓</span>
              </div>
            </div>
            
            <div className={`${isRTL ? 'text-center md:text-right' : 'text-center md:text-left'} flex-1`}>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">{currentUser?.company || labels.unregistered}</h1>
              <p className="text-xs text-gray-400 font-bold mt-1">{currentUser?.email}</p>
              <div className={`flex flex-wrap justify-center ${isRTL ? 'md:justify-start' : 'md:justify-start'} gap-2 mt-4`}>
                <span className="bg-blue-50 text-blue-600 text-[10px] px-3 py-1 rounded-full font-black uppercase">
                  {userRole.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: labels.myOrders, value: '📊', id: 'cart', subId: 'tracking' },
            // تم تعديل زر المفضلة ليرسل كلمة "المفضلة" كـ Sub-Tab ليتم معالجتها في الهوم
            { label: labels.favorites, value: '❤️', id: 'home', subId: 'المفضلة' }, 
            { label: labels.invoices, value: '🧾', id: 'docs' },
            { label: labels.notifs, value: '🔔', id: 'settings' },
          ].map((stat, i) => (
            <button 
              key={i} 
              onClick={() => onNavigate(stat.id, (stat as any).subId)}
              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:bg-slate-900 transition-all duration-300"
            >
               <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{stat.value}</span>
               <span className="text-[10px] text-gray-400 font-black uppercase mt-1 group-hover:text-white">{stat.label}</span>
            </button>
          ))}
        </div>

        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className={`text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-2`}>{section.title}</h3>
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              {section.items.map((item, i) => (
                <button 
                  key={i}
                  onClick={() => {
                    if (item.isExternal) {
                      window.open(item.url, '_blank');
                    } else {
                      onNavigate(item.id, (item as any).subId);
                    }
                  }}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors border-b last:border-0 group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm ${item.color} group-hover:scale-105 transition-transform`}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{item.label}</span>
                  </div>
                  <span className={`text-gray-300 group-hover:text-blue-600 ${isRTL ? 'group-hover:translate-x-[-4px]' : 'group-hover:translate-x-[4px]'} transition-all`}>{isRTL ? '←' : '→'}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-6">
          <button 
            onClick={onLogout}
            className="w-full py-5 rounded-[2rem] bg-white border border-red-100 text-red-600 font-black text-sm shadow-sm hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span>{labels.logout}</span>
            <span>🚪</span>
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-6 font-bold">{labels.version} 2.5.0 b2b Enterprise</p>
        </div>
      </div>
    </div>
  );
};

export default ESB2BProfile;