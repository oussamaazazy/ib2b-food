
import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  userRole?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, cartCount, userRole }) => {
  const isBuyer = userRole === 'buyer';

  const menuItems = [
    { id: 'home', label: 'الرئيسية', icon: '🏠' },
    { id: 'categories', label: 'الفئات والأقسام', icon: '📁' },
    { id: 'offers', label: 'عروض الجملة', icon: '🔥' },
    { id: 'cart', label: 'سلة المشتريات', icon: '🛒', badge: cartCount > 0 ? cartCount : null },
    { id: 'suppliers', label: 'الموردون المعتمدون', icon: '🤝' },
    { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-white border-l h-screen flex flex-col shadow-sm fixed right-0 top-0 pt-16 z-40 overflow-y-auto transition-colors duration-300">
      <nav className="flex-1 mt-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-6 py-4 text-sm font-bold transition-colors relative ${
              activeTab === item.id
                ? 'text-blue-600 bg-blue-50 border-r-4 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="ml-3 text-xl">{item.icon}</span>
            {item.label}
            {item.badge && (
              <span className="mr-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
            {userRole === 'admin' ? 'AD' : 'BU'}
          </div>
          <div>
            <p className="text-xs font-black text-gray-900">{isBuyer ? 'حساب أعمال' : 'إدارة النظام'}</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase">{userRole} Account</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
