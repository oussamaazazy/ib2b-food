import React, { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
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
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        env: "prod"
      }),
    });
  } catch (error) {
    console.error("Failed to log movement:", error);
  }
};

type UserRole = 'guest' | 'admin' | 'seller' | 'buyer';

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
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
    if (isApple && !(window.navigator as any).standalone) {
      setShowInstallBtn(true);
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert('لتثبيت التطبيق على iPhone:\n1. اضغط على زر المشاركة (Share) بالأسفل\n2. اختر "إضافة للشاشة الرئيسية"');
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
    <button onClick={handleInstallClick} className="flex items-center gap-2 bg-[#feee00] text-navy px-3 py-2 rounded-xl font-black text-[10px] md:text-xs shadow-lg hover:scale-105 transition-transform animate-pulse border border-navy/10 w-full justify-center">
      <span className="text-sm">📲</span>
      <span>تثبيت التطبيق</span>
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
  if (val && typeof val === 'object' && 'seconds' in val) {
    return new Date(val.seconds * 1000).toLocaleDateString('ar-SA');
  }
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

// --- مكون Skeleton للمنتجات ---
const HomeSkeleton: React.FC = () => {
  return (
    <div className="p-4 md:p-8">
      <div className="w-full max-w-2xl mx-auto mb-8">
        <div className="h-12 bg-gray-200 rounded-2xl animate-pulse"></div>
      </div>
      <div className="mb-8">
        <div className="flex gap-2 overflow-x-auto pb-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex-shrink-0">
              <div className="w-20 h-20 bg-gray-200 rounded-2xl animate-pulse"></div>
              <div className="w-16 h-4 bg-gray-200 rounded mt-2 mx-auto animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-full h-40 bg-gray-200 rounded-xl animate-pulse mb-4"></div>
            <div className="h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded-xl animate-pulse w-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- نوع لمسار التنقل ---
interface NavigationState {
  tab: string;
  productId?: string;
  category?: string;
  page?: number;
  searchQuery?: string;
  showOffersOnly?: boolean;
  timestamp: number;
}

const App: React.FC = () => {
  // --- حالات ضغط زر الرجوع ---
  const [backPressCount, setBackPressCount] = useState(0);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('lastTab') || 'home';
  });
  
  // --- سجل التنقل (جديد) ---
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const isPopStateEvent = useRef(false);
  const isInitialMount = useRef(true);
  
  const [userRole, setUserRole] = useState<'admin' | 'seller' | 'buyer' | 'guest'>('guest');
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
// 1. تعريف الحالة مع خاصية الاسترجاع من الذاكرة المحلية (localStorage)
const [favorites, setFavorites] = useState<string[]>(() => {
  // التأكد من أن الكود يعمل في بيئة المتصفح
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('user_favorites');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
});

// 2. دالة التبديل (إضافة/حذف) مع الحفظ التلقائي
const toggleFavorite = useCallback((productId: string) => {
  setFavorites(prev => {
    const isExist = prev.includes(productId);
    const updated = isExist 
      ? prev.filter(id => id !== productId) // حذف إذا كان موجوداً
      : [...prev, productId];               // إضافة إذا كان جديداً
    
    // حفظ التحديث في ذاكرة المتصفح
    localStorage.setItem('user_favorites', JSON.stringify(updated));
    return updated;
  });
}, []);  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [activeCat, setActiveCat] = useState('الكل');
  const [currentPage, setCurrentPage] = useState(1);
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  
  // --- حالات التحميل ---
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [cachedProducts, setCachedProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('esb2b_products_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.error("Failed to load cached products:", e);
      return [];
    }
  });

  // --- إدارة سجل التنقل (جديد) ---
  const addToHistory = useCallback((newState: Partial<NavigationState>) => {
    if (isPopStateEvent.current) {
      isPopStateEvent.current = false;
      return;
    }

    const currentState: NavigationState = {
      tab: activeTab,
      productId: selectedProduct?.id,
      category: activeCat,
      page: currentPage,
      searchQuery: searchQuery,
      showOffersOnly: showOffersOnly,
      timestamp: Date.now()
    };

    // دمج الحالة الجديدة مع الحالية
    const updatedState = { ...currentState, ...newState };

    // التحقق من عدم إضافة حالة مكررة
    const lastState = navigationHistory[currentHistoryIndex];
    if (lastState && 
        lastState.tab === updatedState.tab &&
        lastState.productId === updatedState.productId &&
        lastState.category === updatedState.category &&
        lastState.page === updatedState.page) {
      return;
    }

    // إزالة الحالات الأحدث إذا كنا في منتصف التاريخ
    const newHistory = navigationHistory.slice(0, currentHistoryIndex + 1);
    newHistory.push(updatedState);
    
    setNavigationHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);

    // تحديث URL
    const urlParams = new URLSearchParams();
    urlParams.set('tab', updatedState.tab);
    if (updatedState.productId) urlParams.set('product', updatedState.productId);
    if (updatedState.category) urlParams.set('cat', updatedState.category);
    if (updatedState.page && updatedState.page > 1) urlParams.set('page', updatedState.page.toString());
    if (updatedState.searchQuery) urlParams.set('q', updatedState.searchQuery);
    if (updatedState.showOffersOnly) urlParams.set('offers', '1');
    
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState(updatedState, '', newUrl);
  }, [activeTab, selectedProduct, activeCat, currentPage, searchQuery, showOffersOnly, navigationHistory, currentHistoryIndex]);

  // --- استعادة الحالة من URL عند التحميل الأول ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const productId = params.get('product');
    const category = params.get('cat');
    const page = params.get('page');
    const q = params.get('q');
    const offers = params.get('offers');

    if (tab) setActiveTab(tab);
    if (category) setActiveCat(category);
    if (page) setCurrentPage(parseInt(page));
    if (q) setSearchQuery(q);
    if (offers === '1') setShowOffersOnly(true);

    // البحث عن المنتج إذا كان موجوداً
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) setSelectedProduct(product);
    }

    // إضافة الحالة الأولية للتاريخ
    const initialState: NavigationState = {
      tab: tab || 'home',
      productId: productId || undefined,
      category: category || 'الكل',
      page: page ? parseInt(page) : 1,
      searchQuery: q || '',
      showOffersOnly: offers === '1',
      timestamp: Date.now()
    };
    
    setNavigationHistory([initialState]);
    setCurrentHistoryIndex(0);
    window.history.replaceState(initialState, '', window.location.href);
  }, [products]);

  // --- معالج حدث popstate (الرجوع للأمام/الخلف في المتصفح) ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        isPopStateEvent.current = true;
        
        const state = event.state as NavigationState;
        
        // استعادة الحالة
        setActiveTab(state.tab);
        setActiveCat(state.category || 'الكل');
        setCurrentPage(state.page || 1);
        setSearchQuery(state.searchQuery || '');
        setShowOffersOnly(state.showOffersOnly || false);
        
        if (state.productId && products.length > 0) {
          const product = products.find(p => p.id === state.productId);
          setSelectedProduct(product || null);
        } else if (state.tab !== 'product-detail') {
          setSelectedProduct(null);
        }

        // تحديث المؤشر الحالي في التاريخ
        const index = navigationHistory.findIndex(h => h.timestamp === state.timestamp);
        if (index !== -1) {
          setCurrentHistoryIndex(index);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigationHistory, products]);

  // --- منطق ضغط زر الرجوع 3 مرات للخروج من التطبيق ---
  useEffect(() => {
    const handleBackPress = (e: PopStateEvent) => {
      // إذا كان هناك تاريخ للتنقل، نترك المتصفح يتعامل معه
      if (currentHistoryIndex > 0) {
        return;
      }
      
      // منع الخروج الفوري
      window.history.pushState(null, '', window.location.pathname);
      
      setBackPressCount((prev) => prev + 1);

      if (backPressCount >= 2) {
        alert("يتم إغلاق التطبيق...");
        window.close();
      }

      const timer = setTimeout(() => {
        setBackPressCount(0);
      }, 2000);

      return () => clearTimeout(timer);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handleBackPress);

    return () => {
      window.removeEventListener('popstate', handleBackPress);
    };
  }, [backPressCount, currentHistoryIndex]);

  // --- حفظ آخر تبويب ---
  useEffect(() => {
    localStorage.setItem('lastTab', activeTab);
    if (currentUser) {
      sendLogToSheet({
        event: 'NAVIGATION',
        action: 'tab_change',
        page: activeTab,
        email: currentUser.email,
        role: userRole
      });
    }
  }, [activeTab, currentUser, userRole]);

  // --- استعادة الجلسة المحفوظة ---
  useEffect(() => {
    const savedSession = localStorage.getItem('esb2b_session');
    if (savedSession) {
      try {
        const { user, role } = JSON.parse(savedSession);
        setCurrentUser(user);
        setUserRole(role);
        
        const savedCart = localStorage.getItem(`esb2b_cart_${user.email}`);
        if (savedCart) setCart(JSON.parse(savedCart));
        
        setActiveTab(role === 'admin' ? 'admin' : (role === 'seller' ? 'seller' : 'home'));
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
  }, []);

  // --- تحميل المنتجات مع عرض الكاش فوراً ---
  useEffect(() => {
    if (cachedProducts.length > 0) {
      setProducts(cachedProducts);
      setIsProductsLoading(false);
    }

    const unsubscribeProducts = dbService.subscribeToProducts((data) => {
      const formattedData = data.map(p => ({ 
        ...p, 
        barcode: p.barcode ? String(p.barcode).trim() : '' 
      }));
      
      setProducts(formattedData);
      
      try {
  localStorage.setItem('esb2b_products_cache', JSON.stringify(products));
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    console.warn("Storage is full, clearing old cache...");
    localStorage.removeItem('esb2b_products_cache'); // امسح القديم ولا تخزن الجديد
  }
}
      
      setIsProductsLoading(false);
    });

    const unsubscribeOrders = dbService.subscribeToOrders(setOrders);
    const unsubscribeUsers = dbService.subscribeToUsers(setUsers);
    
    return () => { 
      unsubscribeProducts(); 
      unsubscribeOrders(); 
      unsubscribeUsers(); 
    };
  }, []);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return false;
    
    setIsSubmittingOrder(true);
    try {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.15; 
      const total = subtotal; 

      const newOrderData = {
        customerId: currentUser?.id || 'guest',
        customerName: currentUser?.displayName || 'عميل مجهول',
        date: new Date().toISOString(),
        items: cart,
        subtotal: subtotal,
        tax: tax,
        total: total,
        status: 'pending' as const,
        createdAt: new Date()
      };
      
      await dbService.addOrder(newOrderData);

      sendLogToSheet({
        event: 'ORDER',
        action: 'place_order',
        email: currentUser?.email,
        status: 'success',
        data: { total, itemCount: cart.length }
      });

      setCart([]);
      if (currentUser?.email) {
        localStorage.removeItem(`esb2b_cart_${currentUser.email}`);
      }
      
      addNotification('تم الطلب بنجاح', 'تم إرسال طلبك للمورد وجاري المعالجة', 'order');
      return true;
    } catch (error) {
      console.error("خطأ أثناء تنفيذ الطلب:", error);
      addNotification('خطأ', 'فشل في إرسال الطلب، حاول مرة أخرى', 'info');
      return false;
    } finally {
      setIsSubmittingOrder(false);
    }
  };

const categories = useMemo(() => {
  const catsMap: Record<string, string> = {};
  
  products.forEach(p => {
    if (p.category && !catsMap[p.category]) {
      // يأخذ صورة البراند أو الصورة الأساسية للمنتج لتكون شعار الفئة
      catsMap[p.category] = p.brandImage || p.image || p.imageUrl || '';
    }
  });

  const dynamicCats = Object.entries(catsMap).map(([name, icon]) => ({
    name,
    icon: icon || 'https://placehold.co/150?text=Category' 
  }));

  return [
    { name: 'الكل', icon: '🛍️' },
    { name: 'المفضلة', icon: '❤️' },
    ...dynamicCats
    
  ];
}, [products]);

  const [cart, setCart] = useState<any[]>(() => {
    try {
      const rememberedUserEmail = localStorage.getItem('rememberedUser');
      if (rememberedUserEmail) {
        const savedCart = localStorage.getItem(`esb2b_cart_${rememberedUserEmail}`);
        return savedCart ? JSON.parse(savedCart) : [];
      }
    } catch (e) { console.error(e); }
    return [];
  });

  const addNotification = (title: string, message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, title, message, type }]);
  };

  const addToCart = (product: Product, quantity: number) => {
    if (quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const newCart = existing 
        ? prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)
        : [...prev, { ...product, quantity }];
      if (currentUser?.email) localStorage.setItem(`esb2b_cart_${currentUser.email}`, JSON.stringify(newCart));
      return newCart;
    });

    sendLogToSheet({
      event: 'CART',
      action: 'add_item',
      email: currentUser?.email,
      entityId: product.id,
      data: { name: product.name, quantity }
    });

    addNotification('تمت الإضافة', `تم إضافة ${quantity} من ${product.name}`, 'order');
  };

  const handleLogin = (role: UserRole, user: AppUser) => {
    setUserRole(role);
    setCurrentUser(user);
    
    localStorage.setItem('esb2b_session', JSON.stringify({ user, role }));
    localStorage.setItem('rememberedUser', user.email);
    
    const savedCart = localStorage.getItem(`esb2b_cart_${user.email}`);
    if (savedCart) setCart(JSON.parse(savedCart));
    
    if (role === 'admin') {
      setActiveTab('admin');
    } else if (role === 'seller') {
      setActiveTab('seller');
    } else if (role === 'buyer') {
      setActiveTab('home');
    } else {
      setActiveTab('home');
    }

    sendLogToSheet({
      event: 'AUTH',
      action: 'login',
      uid: user.id,
      email: user.email,
      role: role
    });

    addNotification('success', `أهلاً بك! تم تسجيل الدخول بنجاح`, 'order');
    
    // إضافة حدث التنقل إلى التاريخ
    addToHistory({ tab: activeTab });
  };

  const handleLogout = () => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      if (currentUser) {
        sendLogToSheet({
          event: 'AUTH',
          action: 'logout',
          email: currentUser.email
        });
      }

      localStorage.removeItem('esb2b_session');
      setCurrentUser(null);
      setUserRole('guest');
      setCart([]);
      setActiveTab('home');
      
      addNotification('info', 'تم تسجيل الخروج بنجاح', 'order');
    }
  };

  // --- دوال التنقل المحسنة ---
  const navigateToHome = useCallback(() => {
    setActiveTab('home');
    setActiveCat('الكل');
    setSearchQuery('');
    setCurrentPage(1);
    setShowOffersOnly(false);
    setSelectedProduct(null);
    addToHistory({ tab: 'home', category: 'الكل', page: 1, searchQuery: '', showOffersOnly: false });
    setIsSidebarOpen(false);
  }, [addToHistory]);

  const navigateToProductDetail = useCallback((product: Product) => {
    setSelectedProduct(product);
    setActiveTab('product-detail');
    addToHistory({ tab: 'product-detail', productId: product.id });
  }, [addToHistory]);

  const navigateToCategory = useCallback((category: string) => {
    setActiveCat(category);
    setSearchQuery('');
    if (userRole === 'seller') {
      setActiveTab('seller');
    } else {
      setActiveTab('home');
      setCurrentPage(1);
      addToHistory({ tab: 'home', category, page: 1 });
    }
  }, [userRole, addToHistory]);

  const navigateToCart = useCallback(() => {
    setActiveTab('cart');
    addToHistory({ tab: 'cart' });
  }, [addToHistory]);

  const navigateToProfile = useCallback(() => {
    setActiveTab('profile');
    addToHistory({ tab: 'profile' });
    setIsSidebarOpen(false);
  }, [addToHistory]);

  const navigateToSeller = useCallback(() => {
    setActiveTab('seller');
    addToHistory({ tab: 'seller' });
    setIsSidebarOpen(false);
  }, [addToHistory]);

  const navigateToAdmin = useCallback(() => {
    setActiveTab('admin');
    addToHistory({ tab: 'admin' });
    setIsSidebarOpen(false);
  }, [addToHistory]);

  const navigateToCategories = useCallback(() => {
    setActiveTab('categories');
    addToHistory({ tab: 'categories' });
    setIsSidebarOpen(false);
  }, [addToHistory]);

  const handleBack = useCallback(() => {
    if (userRole === 'seller') {
      setActiveTab('seller');
    } else if (selectedProduct) {
      setSelectedProduct(null);
      setActiveTab('home');
    } else {
      setActiveTab('home');
    }
    addToHistory({ tab: userRole === 'seller' ? 'seller' : 'home' });
  }, [userRole, selectedProduct, addToHistory]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (activeTab !== 'home') {
      setActiveTab('home');
    }
    setCurrentPage(1);
    addToHistory({ tab: 'home', searchQuery: query, page: 1 });
  }, [activeTab, addToHistory]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    addToHistory({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [addToHistory]);

  const handleOffersToggle = useCallback(() => {
    setShowOffersOnly(prev => !prev);
    setCurrentPage(1);
    addToHistory({ showOffersOnly: !showOffersOnly, page: 1 });
  }, [showOffersOnly, addToHistory]);

  const renderContent = () => {
    if (userRole === 'guest') return <ESB2BLogin users={users} onLogin={handleLogin} onBack={() => {}} />;
    
    if (userRole === 'seller' && activeTab !== 'seller') {
      setActiveTab('seller');
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-600 font-bold">جاري تحميل لوحة المورد...</p>
          </div>
        </div>
      );
    }
    
    if (isProductsLoading && activeTab === 'home' && userRole === 'buyer') {
      return <HomeSkeleton />;
    }
    
    const filteredProducts = products.filter(p => 
      (p.isActive !== false) && (activeCat === 'الكل' || p.category === activeCat)
    );
    
    switch (activeTab) {
     case 'home': 
  return (
    <ESB2BHome 
      // تم تغيير allProducts إلى products حسب تعريفها في ملفك
      products={products} 
      searchQuery={searchQuery}
      activeCat={activeCat} 
      setActiveCat={setActiveCat} 
      categories={categories}
      onAddToCart={addToCart} 
      onSelectProduct={navigateToProductDetail}
      favorites={favorites} 
      toggleFavorite={(id) => {
        const updated = favorites.includes(id) 
          ? favorites.filter(i => i !== id) 
          : [...favorites, id];
        setFavorites(updated);
        // حفظ القائمة في المتصفح فوراً للتزامن
        localStorage.setItem('user_favorites', JSON.stringify(updated));
      }}
      currentPage={currentPage}
      onPageChange={handlePageChange}
      showOffersOnly={showOffersOnly}
      onOffersToggle={handleOffersToggle}
      currentUser={currentUser} // 👈 إضافة هذا السطر فقط
    />
  );
      case 'categories': 
        return <ESB2BCategories 
          products={products.filter(p => p.isActive !== false)} 
          onSelectCategory={navigateToCategory} 
        />;
      case 'cart': 
        return (
          <ESB2BCart 
            cart={cart} 
            orders={orders} 
            currentUser={currentUser} 
            removeFromCart={(id) => setCart(c => c.filter(i => i.id !== id))} 
            updateQuantity={(id, q) => setCart(c => c.map(i => i.id === id ? {...i, quantity: q} : i))} 
            onGoBack={handleBack}
            onPlaceOrder={handlePlaceOrder} 
            onReOrder={(items) => {
              setCart(items); 
              setActiveTab('cart'); 
              addNotification('تم التحديث', 'تمت إضافة منتجات الطلب السابق لسلتك', 'info');
            }} 
            userRole={userRole} 
            isSubmitting={isSubmittingOrder} 
          />
        );
      case 'admin': 
        return userRole === 'admin' ? (
          <ESB2BAdmin 
            products={products} 
            users={users} 
            orders={orders} 
            onAddProduct={dbService.addProduct} 
            onEditProduct={(p) => dbService.updateProduct(p.id, p)} 
            onDeleteProduct={dbService.deleteProduct} 
            onUpdateOrderStatus={dbService.updateOrderStatus} 
            onToggleUserStatus={dbService.updateUserStatus} 
            onUpdateUser={dbService.updateUser} 
            onDeleteUser={dbService.deleteUser} 
            onSimulateRole={(r) => { 
              setUserRole(r); 
              setSimulationMode(true); 
              if (r === 'seller') {
                setActiveTab('seller');
              } else {
                setActiveTab('home'); 
              }
            }} 
            onAddUser={dbService.addUser} 
          />
        ) : null;
      case 'product-detail': 
  return selectedProduct ? (
    <ESB2BProductDetail 
      product={selectedProduct} 
      onAddToCart={addToCart} 
      onBack={handleBack}
      onSelectRelated={(p) => {
        setSelectedProduct(p);
        addToHistory({ productId: p.id });
      }}
      onSelectCategory={(catName) => {
        setActiveCat(catName);
        setActiveTab('home');
        setSelectedProduct(null);
        setCurrentPage(1);
        addToHistory({ tab: 'home', category: catName, page: 1 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      similarProducts={products} // تمرير جميع المنتجات للمقارنة
    />
  ) : null;
      case 'profile': 
  return (
    <ESB2BProfile 
      userRole={userRole} 
      currentUser={currentUser} 
      onLogout={handleLogout} 
      // أضفنا subTab هنا لاستقبال قيمة "المفضلة"
      onNavigate={(tab, subTab) => { 
        if (userRole === 'seller' && tab === 'home') {
          setActiveTab('seller');
        } else {
          setActiveTab(tab); 
        }

        // المنطق الجديد: إذا كان المتنقل إليه هو المفضلة
        if (subTab === 'المفضلة') {
          setActiveCat('المفضلة'); // يضبط القسم النشط في صفحة الهوم
          if (typeof setCurrentPage === 'function') setCurrentPage(1); // يصفر الصفحة للبداية
        }

        setIsSidebarOpen(false); 
        addToHistory({ tab });
      }} 
    />
  );
      case 'seller': 
        return (
          <ESB2BSeller 
            products={products} 
            orders={orders} 
            users={users} 
            notifications={notifications} 
            currentUser={currentUser} 
            onUpdateProduct={dbService.updateProduct} 
            onAddProduct={dbService.addProduct} 
            onUpdateOrderStatus={dbService.updateOrderStatus} 
            onAddUser={dbService.addUser} 
            onUpdateUser={dbService.updateUser} 
            onDeleteUser={dbService.deleteUser} 
            onLogout={handleLogout} 
          />
        );
      default: 
        if (userRole === 'seller') {
          setActiveTab('seller');
          return null;
        }
        return (
  <ESB2BHome 
  products={products} 
  searchQuery={searchQuery}
  activeCat={activeCat} 
  setActiveCat={setActiveCat} 
  categories={categories}
  onAddToCart={addToCart} 
  onSelectProduct={navigateToProductDetail}
  favorites={favorites} 
  toggleFavorite={(id) => {
    const updated = favorites.includes(id) 
      ? favorites.filter(i => i !== id) 
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem('user_favorites', JSON.stringify(updated));
  }}
  currentPage={currentPage}
  onPageChange={handlePageChange}
  showOffersOnly={showOffersOnly}
  onOffersToggle={handleOffersToggle}
  currentUser={currentUser ? {
    ...currentUser,
    supplierName: currentUser.company // 👈 تأكد من وجود supplierName
  } : null}
/>
);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-navy font-['Cairo'] no-zoom">
      {userRole !== 'guest' && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white text-navy h-20 flex items-center border-b border-navy/5 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface hover:bg-gray-100 text-navy font-black"
              >
                ☰
              </button>
              
              <button 
                onClick={navigateToHome} 
                className="px-3 h-10 flex items-center justify-center rounded-xl bg-surface hover:bg-gray-100 text-navy font-bold text-sm transition-all gap-2"
              >
                <span>🏠</span>
                <span className="hidden sm:inline">الرئيسية</span>
              </button>

              {/* أزرار التنقل السريع (جديد) */}
              {currentHistoryIndex > 0 && (
                <button
                  onClick={() => window.history.back()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-navy text-sm"
                  title="الرجوع"
                >
                  ←
                </button>
              )}
              {currentHistoryIndex < navigationHistory.length - 1 && (
                <button
                  onClick={() => window.history.forward()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-navy text-sm"
                  title="التقدم"
                >
                  →
                </button>
              )}
            </div>

            <div className="flex-1 max-w-2xl relative">
              <input 
                type="text" 
                placeholder="ابحث هنا..." 
                value={searchQuery} 
                onChange={(e) => handleSearch(e.target.value)} 
                className="w-full bg-surface border-2 border-transparent focus:border-mint focus:bg-white rounded-2xl pr-10 pl-4 py-2 text-xs font-black outline-none transition-all shadow-inner" 
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={navigateToCart} 
                className="relative w-10 h-10 rounded-2xl bg-surface flex items-center justify-center hover:bg-gray-100 transition-all"
              >
                <span className="text-xl">🛒</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-mint text-navy text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-bounce shadow-sm">
                    {cart.length}
                  </span>
                )}
              </button>
              <button 
                onClick={navigateToProfile} 
                className="w-10 h-10 rounded-2xl bg-navy text-mint flex items-center justify-center font-black hover:scale-105 transition-all"
              >
                👤
              </button>
            </div>
          </div>
        </header>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[9999] flex">
          <div 
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          
          <div className="absolute top-0 right-0 w-72 h-full bg-white text-navy transition-transform duration-300 shadow-2xl animate-slide-left flex flex-col z-[10000]">
            <div className="p-8 space-y-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center gap-2 border-b border-gray-100 pb-8">
                <ESLogo size="lg" />
              </div>

              <nav className="space-y-4">
                <button 
                  onClick={navigateToHome} 
                  className="w-full p-4 text-right hover:bg-surface rounded-2xl flex items-center gap-4 font-bold text-gray-600 transition-all"
                >
                  🏠 الرئيسية
                </button>
                
                <button 
                  onClick={navigateToCategories} 
                  className="w-full p-4 text-right hover:bg-surface rounded-2xl flex items-center gap-4 font-bold text-gray-600 transition-all"
                >
                  📁 الكتالوج
                </button>

                <div className="mt-4 px-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-4 italic">تصفح الأصناف</p>
                 <div className="flex flex-col gap-1">
  {categories.map((cat) => (
    <button 
      key={cat.name} 
      onClick={() => {
        setActiveCat(cat.name);
        setSearchQuery('');
        setActiveTab('home');
        setCurrentPage(1);
        addToHistory({ tab: 'home', category: cat.name, page: 1 });
        setIsSidebarOpen(false);
      }} 
      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
        activeCat === cat.name ? 'bg-navy text-white shadow-md' : 'hover:bg-gray-50 text-gray-600'
      }`}
    >
      {/* حاوية اللوجو المربعة */}
      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border flex items-center justify-center shrink-0 bg-white
        ${activeCat === cat.name ? 'border-white/20' : 'border-gray-100'}`}>
        
        {/* التحقق: هل الأيقونة رابط صورة أم إيموجي؟ */}
        {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/')) ? (
          <img 
            src={cat.icon} 
            alt={cat.name} 
            // object-contain يضمن ظهور اللوجو كاملاً بدون قص الأطراف
            className="w-full h-full object-contain p-1" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('placehold.co')) {
                target.src = 'https://placehold.co/150?text=' + encodeURIComponent(cat.name);
              }
            }}
          />
        ) : (
          <span className="text-xl">{cat.icon}</span>
        )}
      </div>

      <span className="text-sm font-bold truncate">{cat.name}</span>
    </button>
  ))}
</div>
                </div>

                <div className="pt-4 mt-6 border-t border-gray-100 space-y-4">
                  <InstallPWA />
                  {userRole === 'admin' && (
                    <button 
                      onClick={navigateToAdmin} 
                      className="w-full p-4 text-right bg-mint/10 text-navy rounded-2xl flex items-center gap-4 font-black transition-all border-2 border-mint/20"
                    >
                      🛠️ لوحة الإدارة
                    </button>
                  )}
                  {(userRole === 'seller' || userRole === 'admin') && (
                    <button 
                      onClick={navigateToSeller} 
                      className="w-full p-4 text-right bg-blue-50 text-blue-600 rounded-2xl flex items-center gap-4 font-black transition-all border-2 border-blue-100"
                    >
                      📊 لوحة المورد
                    </button>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      <main className={`${userRole !== 'guest' ? 'pt-24' : ''}`}>
        <Suspense fallback={<HomeSkeleton />}>
          {renderContent()}
        </Suspense>
      </main>

      {/* مؤشر الصفحة الحالية في التاريخ (جديد) */}
      {navigationHistory.length > 1 && (
        <div className="fixed bottom-4 left-4 z-50 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-gray-200 text-[10px] font-bold text-navy">
          <span>صفحة {currentHistoryIndex + 1} من {navigationHistory.length}</span>
        </div>
      )}

      {/* تنبيه الخروج عند الضغط */}
      {backPressCount > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-9999 bg-navy/90 text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md animate-bounce font-bold text-sm">
          اضغط {3 - backPressCount} مرات إضافية للخروج
        </div>
      )}

      <div className="fixed top-24 right-4 z-100 w-80 space-y-3 pointer-events-none">
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
      `}</style>
    </div>
  );
};

export default App;