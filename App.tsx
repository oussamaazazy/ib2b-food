import React, { useState, useEffect, useMemo } from 'react';
import ESB2BHome from './components/ESB2BHome';
import ESB2BCart from './components/ESB2BCart';
import ESB2BProductDetail from './components/ESB2BProductDetail';
import ESB2BAdmin from './components/ESB2BAdmin';
import ESB2BSeller from './components/ESB2BSeller';
import ESB2BProfile from './components/ESB2BProfile';
import ESB2BLogin from './components/ESB2BLogin';
import ESB2BChat from './components/ESB2BChat';
import ESB2BCategories from './components/ESB2BCategories';
import ESB2BVisionSearch from './components/ESB2BVisionSearch';
import NotificationToast from './components/NotificationToast';
import { Product, Order, AppUser, Notification } from './types';
import { dbService } from './services/dbService';
import './index.css';
import { trackEvent } from "./services/trackEvent";
import { usePageTracking } from "./hooks/usePageTracking";

// --- دالة إرسال البيانات لجوجل شيت ---
const sendLogToSheet = async (data: any) => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzs_bpKHf6KSJm0onOADdoWSqX0Cj96bWAYSCEsyQntxE-bzr6K0SC04hX2_kK4ZH31Q/exec';
  const formData = new FormData();
  formData.append('data', JSON.stringify({
    ...data,
    timestamp: new Date().toISOString(),
  }));
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (error) {
    console.debug("Logging skipped or failed silently");
  }
};

// --- مكون شريط التنقل السفلي المضاف ---
const BottomNav: React.FC<{ activeTab: string, setActiveTab: (t: string) => void, cartCount: number, userRole: string }> = ({ activeTab, setActiveTab, cartCount, userRole }) => {
  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: '🏠' },
    { id: 'categories', label: 'الأصناف', icon: '📂' },
    { id: 'cart', label: 'السلة', icon: '🛒', badge: cartCount },
    { id: 'profile', label: 'حسابي', icon: '👤' },
  ];
  if (userRole === 'admin' || userRole === 'seller') {
    tabs.splice(3, 0, { id: userRole, label: 'لوحتي', icon: '📊' });
  }
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-md border-t border-gray-100 pb-safe-area md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-12">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 transition-all relative ${activeTab === tab.id ? 'text-navy scale-105' : 'text-gray-400'}`}>
            <div className="relative">
              <span className="text-xl">{tab.icon}</span>
              {tab.badge > 0 && (
                <span className="absolute -top-1 -right-2 bg-mint text-navy text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center font-black px-1 border border-white">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-1 font-bold ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- مكون تثبيت التطبيق (PWA) ---
const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isApple);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); setDeferredPrompt(e); setShowInstallBtn(true);
    });
    if (isApple && !(window.navigator as any).standalone) setShowInstallBtn(true);
  }, []);
  const handleInstallClick = async () => {
    if (isIOS) { alert('لتثبيت التطبيق على iPhone:\n1. اضغط على زر المشاركة (Share) بالأسفل\n2. اختر "إضافة للشاشة الرئيسية"'); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setDeferredPrompt(null); setShowInstallBtn(false); }
    }
  };
  if (!showInstallBtn) return null;
  return (
    <button onClick={handleInstallClick} className="flex items-center gap-2 bg-[#feee00] text-navy px-3 py-2 rounded-xl font-black text-[10px] md:text-xs shadow-lg hover:scale-105 transition-transform animate-pulse border border-navy/10 w-full justify-center">
      <span className="text-sm">📲</span><span>تثبيت التطبيق</span>
    </button>
  );
};

// --- مساعدات التنسيق ---
export const formatEnNumber = (num: number | string) => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  return isNaN(n) ? "0" : n.toLocaleString('en-US');
};
export const formatDate = (val: any): string => {
  if (!val) return "";
  if (val && typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000).toLocaleDateString('ar-SA');
  if (val instanceof Date) return val.toLocaleDateString('ar-SA');
  return String(val);
};
export const ESLogo: React.FC<{ light?: boolean; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ light = false, size = 'md' }) => {
  const sizeClasses = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-5xl', xl: 'text-8xl' };
  return (
    <div className={`logo-font inline-flex items-center ${sizeClasses[size]} select-none cursor-pointer`} style={{ direction: 'ltr' }}>
      <span className={light ? 'text-white' : 'text-navy'}>E</span><span className="text-mint">S</span>
    </div>
  );
};

type UserRole = 'guest' | 'admin' | 'seller' | 'buyer';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('lastTab') || 'home');
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [activeCat, setActiveCat] = useState('الكل');
  const [cart, setCart] = useState<any[]>(() => {
    try {
      const email = localStorage.getItem('rememberedUser');
      if (email) { const saved = localStorage.getItem(`esb2b_cart_${email}`); return saved ? JSON.parse(saved) : []; }
    } catch (e) { console.error(e); }
    return [];
  });

  usePageTracking();

  // ==========================================
  // نـظـام إدارة الـتـاريـخ (لـمـنـع الـخـروج عـنـد الـرجـوع)
  // ==========================================
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        setActiveTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    if (!window.history.state) {
      window.history.replaceState({ tab: activeTab }, '');
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToTab = (tabId: string) => {
    if (tabId !== activeTab) {
      window.history.pushState({ tab: tabId }, '');
      setActiveTab(tabId);
    }
    setIsSidebarOpen(false);
  };
  // ==========================================

  useEffect(() => { trackEvent({ event: "app_open", page: window.location.pathname }); }, []);

  useEffect(() => {
    localStorage.setItem('lastTab', activeTab);
    if (currentUser) {
      sendLogToSheet({ event: 'NAVIGATION', action: 'tab_change', page: activeTab, email: currentUser.email, role: userRole });
    }
  }, [activeTab]);

  useEffect(() => {
    const savedSession = localStorage.getItem('esb2b_session');
    if (savedSession) {
      try {
        const { user, role } = JSON.parse(savedSession);
        setCurrentUser(user); setUserRole(role);
        const savedCart = localStorage.getItem(`esb2b_cart_${user.email}`);
        if (savedCart) setCart(JSON.parse(savedCart));
      } catch (e) { console.error("Failed to restore session", e); }
    }
  }, []);

  useEffect(() => {
    const unsubscribeProducts = dbService.subscribeToProducts((data) => {
      setProducts(data.map(p => ({ ...p, barcode: p.barcode ? String(p.barcode).trim() : '' })));
    });
    const unsubscribeOrders = dbService.subscribeToOrders(setOrders);
    const unsubscribeUsers = dbService.subscribeToUsers(setUsers);
    return () => { unsubscribeProducts(); unsubscribeOrders(); unsubscribeUsers(); };
  }, []);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return false;
    setIsSubmittingOrder(true);
    try {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const newOrderData = {
        customerId: currentUser?.id || 'guest', customerName: currentUser?.displayName || 'عميل مجهول',
        date: new Date().toISOString(), items: cart, subtotal, tax: subtotal * 0.15, total: subtotal,
        status: 'pending' as const, createdAt: new Date()
      };
      await dbService.addOrder(newOrderData);
      sendLogToSheet({ event: 'ORDER', action: 'place_order', email: currentUser?.email, status: 'success', data: { total: subtotal, itemCount: cart.length } });
      setCart([]);
      if (currentUser?.email) localStorage.removeItem(`esb2b_cart_${currentUser.email}`);
      addNotification('تم الطلب بنجاح', 'تم إرسال طلبك للمورد وجاري المعالجة', 'order');
      return true;
    } catch (error) {
      addNotification('خطأ', 'فشل في إرسال الطلب، حاول مرة أخرى', 'info');
      return false;
    } finally { setIsSubmittingOrder(false); }
  };

  const categoriesWithIcons = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const dynamicCats = uniqueCategories.map(cat => ({ name: cat, icon: '📦' }));
    return [{ name: 'الكل', icon: '🛍️' }, ...dynamicCats];
  }, [products]);

  const addNotification = (title: string, message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, title, message, type }]);
  };

  const addToCart = (product: Product, quantity: number) => {
    if (quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const newCart = existing ? prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item) : [...prev, { ...product, quantity }];
      if (currentUser?.email) localStorage.setItem(`esb2b_cart_${currentUser.email}`, JSON.stringify(newCart));
      return newCart;
    });
    sendLogToSheet({ event: 'CART', action: 'add_item', email: currentUser?.email, entityId: product.id, data: { name: product.name, quantity } });
    addNotification('تمت الإضافة', `تم إضافة ${quantity} من ${product.name}`, 'order');
  };

  const handleLogin = (role: UserRole, user: AppUser) => {
    setUserRole(role); setCurrentUser(user);
    localStorage.setItem('esb2b_session', JSON.stringify({ user, role }));
    localStorage.setItem('rememberedUser', user.email);
    const savedCart = localStorage.getItem(`esb2b_cart_${user.email}`);
    if (savedCart) setCart(JSON.parse(savedCart));
    navigateToTab(role === 'admin' ? 'admin' : (role === 'seller' ? 'seller' : 'home'));
    sendLogToSheet({ event: 'AUTH', action: 'login', uid: user.id, email: user.email, role: role });
    addNotification('success', `أهلاً بك! تم تسجيل الدخول بنجاح`, 'order');
  };

  const handleLogout = () => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      if (currentUser) sendLogToSheet({ event: 'AUTH', action: 'logout', email: currentUser.email });
      localStorage.removeItem('esb2b_session');
      setCurrentUser(null); setUserRole('guest'); setCart([]); navigateToTab('home');
      addNotification('info', 'تم تسجيل الخروج بنجاح', 'order');
    }
  };

  const renderContent = () => {
    if (userRole === 'guest') return <ESB2BLogin users={users} onLogin={handleLogin} onBack={() => {}} />;
    const filteredProducts = products.filter(p => (p.isActive !== false) && (activeCat === 'الكل' || p.category === activeCat));
    
    switch (activeTab) {
      case 'home': 
        return <ESB2BHome products={filteredProducts} searchQuery={searchQuery} activeCat={activeCat} setActiveCat={setActiveCat} categories={categoriesWithIcons} onAddToCart={addToCart} onSelectProduct={(p) => { setSelectedProduct(p); navigateToTab('product-detail'); }} favorites={favorites} toggleFavorite={id => setFavorites(f => f.includes(id) ? f.filter(i => i !== id) : [...f, id])} />;
      case 'categories': return <ESB2BCategories products={products.filter(p => p.isActive !== false)} onSelectCategory={(cat) => { setActiveCat(cat); setSearchQuery(''); navigateToTab('home'); }} />;
      case 'cart': 
        return <ESB2BCart cart={cart} orders={orders} currentUser={currentUser} removeFromCart={(id) => setCart(c => c.filter(i => i.id !== id))} updateQuantity={(id, q) => setCart(c => c.map(i => i.id === id ? {...i, quantity: q} : i))} onGoBack={() => window.history.back()} onPlaceOrder={handlePlaceOrder} onReOrder={(items) => { setCart(items); navigateToTab('cart'); addNotification('تم التحديث', 'تمت إضافة منتجات الطلب السابق لسلتك', 'info'); }} userRole={userRole} isSubmitting={isSubmittingOrder} />;
      case 'admin': return userRole === 'admin' ? <ESB2BAdmin products={products} users={users} orders={orders} onAddProduct={dbService.addProduct} onEditProduct={(p) => dbService.updateProduct(p.id, p)} onDeleteProduct={dbService.deleteProduct} onUpdateOrderStatus={dbService.updateOrderStatus} onToggleUserStatus={dbService.updateUserStatus} onUpdateUser={dbService.updateUser} onDeleteUser={dbService.deleteUser} onSimulateRole={(r) => { setUserRole(r); setSimulationMode(true); navigateToTab('home'); }} onAddUser={dbService.addUser} /> : null;
      case 'product-detail': return selectedProduct ? <ESB2BProductDetail product={selectedProduct} onAddToCart={addToCart} onBack={() => window.history.back()} onSelectRelated={(p) => setSelectedProduct(p)} /> : null;
      case 'profile': return <ESB2BProfile userRole={userRole} currentUser={currentUser} onLogout={handleLogout} onNavigate={navigateToTab} />;
      case 'seller': return <ESB2BSeller products={products} orders={orders} users={users} notifications={notifications} currentUser={currentUser} onUpdateProduct={dbService.updateProduct} onAddProduct={dbService.addProduct} onUpdateOrderStatus={dbService.updateOrderStatus} onAddUser={dbService.addUser} onUpdateUser={dbService.updateUser} onDeleteUser={dbService.deleteUser} onLogout={handleLogout} />;
      case 'vision-search': return <ESB2BVisionSearch onProductFound={(p) => { setSelectedProduct(p); navigateToTab('product-detail'); }} onBack={() => window.history.back()} />;
      case 'chat': return <ESB2BChat currentUser={currentUser} onBack={() => window.history.back()} />;
      default: return <ESB2BHome products={filteredProducts} searchQuery={searchQuery} onAddToCart={addToCart} onSelectProduct={(p) => setSelectedProduct(p)} favorites={favorites} toggleFavorite={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface text-navy font-['Cairo'] no-zoom">
      {userRole !== 'guest' && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white text-navy h-20 flex items-center border-b border-navy/5 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex items-center justify-between gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface hover:bg-gray-100 text-navy font-black">☰</button>
            <div className="flex-1 max-w-2xl relative">
              <input type="text" placeholder="ابحث هنا..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); if(activeTab !== 'home') navigateToTab('home');}} className="w-full bg-surface border-2 border-transparent focus:border-mint focus:bg-white rounded-2xl pr-10 pl-4 py-2 text-xs font-black outline-none transition-all shadow-inner" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <div className="flex items-center gap-2 hidden md:flex">
                <button onClick={() => navigateToTab('cart')} className="relative w-10 h-10 rounded-2xl bg-surface flex items-center justify-center hover:bg-gray-100 transition-all">
                    <span className="text-xl">🛒</span>
                    {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-mint text-navy text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-bounce shadow-sm">{cart.length}</span>}
                </button>
                <button onClick={() => navigateToTab('profile')} className="w-10 h-10 rounded-2xl bg-navy text-mint flex items-center justify-center font-black hover:scale-105 transition-all">👤</button>
            </div>
          </div>
        </header>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[110] flex">
          <div className="absolute inset-0 bg-navy/20 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="absolute top-0 right-0 w-72 h-full bg-white text-navy transition-transform duration-300 shadow-2xl animate-slide-left">
            <div className="p-8 space-y-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center gap-2 border-b border-gray-100 pb-8"><ESLogo size="lg" /></div>
              <nav className="space-y-4">
                <button onClick={() => { navigateToTab('home'); setActiveCat('الكل'); setSearchQuery(''); }} className="w-full p-4 text-right hover:bg-surface rounded-2xl flex items-center gap-4 font-bold text-gray-600 transition-all">🏠 الرئيسية</button>
                <button onClick={() => navigateToTab('categories')} className="w-full p-4 text-right hover:bg-surface rounded-2xl flex items-center gap-4 font-bold text-gray-600 transition-all">📁 الكتالوج</button>
                <div className="mt-4 px-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-4 italic">تصفح الأصناف</p>
                  <div className="flex flex-col gap-1">
                    {categoriesWithIcons.map((cat) => (
                      <button key={cat.name} onClick={() => { setActiveCat(cat.name); setSearchQuery(''); navigateToTab('home'); }} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${activeCat === cat.name ? 'bg-navy text-white shadow-md' : 'hover:bg-gray-50 text-gray-600'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeCat === cat.name ? 'bg-white/20' : 'bg-gray-100'}`}><span className="text-sm">{cat.icon}</span></div>
                        <span className="text-sm font-bold truncate">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 mt-6 border-t border-gray-100 space-y-4">
                  <InstallPWA />
                  {userRole === 'admin' && ( <button onClick={() => navigateToTab('admin')} className="w-full p-4 text-right bg-mint/10 text-navy rounded-2xl flex items-center gap-4 font-black transition-all border-2 border-mint/20">🛠️ لوحة الإدارة</button> )}
                  {(userRole === 'seller' || userRole === 'admin') && ( <button onClick={() => navigateToTab('seller')} className="w-full p-4 text-right bg-blue-50 text-blue-600 rounded-2xl flex items-center gap-4 font-black transition-all border-2 border-blue-100">📊 لوحة المورد</button> )}
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      <main className={`${userRole !== 'guest' ? 'pt-24 pb-24 md:pb-8' : ''}`}>{renderContent()}</main>

      {userRole !== 'guest' && (
        <BottomNav activeTab={activeTab} setActiveTab={navigateToTab} cartCount={cart.length} userRole={userRole} />
      )}

      <div className="fixed top-24 right-4 z-[100] w-80 space-y-3 pointer-events-none">
        {notifications.map(notif => (
          <NotificationToast key={notif.id} notification={notif} onClose={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))} />
        ))}
      </div>

      <style>{`
        @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-left { animation: slide-left 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .no-zoom { touch-action: manipulation; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; }
        .pb-safe-area { padding-bottom: env(safe-area-inset-bottom); }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
};

export default App;