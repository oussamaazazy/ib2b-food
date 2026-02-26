import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, AppUser } from '../types';
import { 
  getCachedImage, 
  cacheImage, 
  cacheData, 
  getCachedData, 
  saveSetting, 
  getSetting, 
  clearOldCache 
} from '../services/cacheService';

// --- المكون الفرعي لبطاقة المنتج (مع تحسينات الأداء والتخزين المؤقت للصور) ---
const ProductCard: React.FC<{
  product: Product;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  onAddToCart: (p: Product, qty: number) => void;
  onSelectProduct: (p: Product) => void;
}> = React.memo(({ product, favorites, toggleFavorite, onAddToCart, onSelectProduct }) => {
  const [qty, setQty] = useState(product.minOrderQuantity || 1);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const isOutOfStock = (product.stock || 0) <= 0;

  // تحميل الصورة من الكاش أو الشبكة
  useEffect(() => {
    const loadImage = async () => {
      if (!product.imageUrl) {
        setImageSrc('https://via.placeholder.com/400?text=No+Image');
        setIsLoading(false);
        return;
      }

      try {
        const cachedBlob = await getCachedImage(product.imageUrl);
        
        if (cachedBlob) {
          const url = URL.createObjectURL(cachedBlob);
          setImageSrc(url);
          setIsLoading(false);
          
          return () => URL.revokeObjectURL(url);
        } else {
          const response = await fetch(product.imageUrl, { mode: 'cors' });
          const blob = await response.blob();
          
          await cacheImage(product.imageUrl, blob);
          
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
          setIsLoading(false);
          
          return () => URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Error loading image:', error);
        setImageSrc('https://via.placeholder.com/400?text=Error');
        setIsLoading(false);
      }
    };

    loadImage();
  }, [product.imageUrl]);

  const handleQtyChange = useCallback((val: number) => {
    if (val < 1) return;
    setQty(val);
  }, []);

  return (
    <div 
      className={`group relative bg-white/40 backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] p-3 md:p-6 border border-white/20 shadow-[0_40px_80px_rgba(0,0,0,0.05)] hover:shadow-[0_60px_100px_rgba(0,0,0,0.08)] transition-all duration-700 hover:-translate-y-2 md:hover:-translate-y-4 md:hover:rotate-1 flex flex-col h-full ${isOutOfStock ? 'opacity-70' : ''}`}
      onClick={() => onSelectProduct(product)}
    >
      <div className="relative aspect-square rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-white mb-3 md:mb-6 border border-white/40 shadow-inner group-hover:shadow-2xl transition-all duration-500 flex items-center justify-center p-3 md:p-5">
        {product.offer && product.offer.buyQty > 0 && !isOutOfStock && (
          <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 animate-bounce">
            <div className="bg-rose-500 text-white text-[7px] md:text-[10px] font-black px-2 py-1 md:px-4 md:py-2 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
              <span>عرض {product.offer.buyQty} + {product.offer.getQty}</span>
              <span className="text-[10px] md:text-[14px]">🎁</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 animate-pulse">
            <span className="text-gray-400">⏳</span>
          </div>
        ) : (
          <img 
            loading="lazy"
            src={imageSrc || 'https://via.placeholder.com/400?text=Loading'} 
            className={`
              w-full h-full 
              object-cover 
              max-h-full max-w-full
              transition-transform duration-1000 
              group-hover:scale-110 
              ${isOutOfStock ? 'grayscale opacity-60' : ''}
            `} 
            alt={product.name} 
          />
        )}

        <div className="absolute inset-0 bg-gray-50/5 pointer-events-none"></div>
        
        {isOutOfStock && (
          <div className="absolute inset-0 bg-navy/20 backdrop-blur-[2px] flex items-center justify-center p-2">
             <div className="bg-rose-500 text-white font-black text-[8px] md:text-[10px] px-3 py-1 md:px-6 md:py-2 rounded-full shadow-2xl tracking-tighter uppercase text-center">نفذ</div>
          </div>
        )}

        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            toggleFavorite(product.id); 
          }}
          className={`absolute bottom-2 left-2 md:bottom-4 md:left-4 w-8 h-8 md:w-11 md:h-11 bg-white/80 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-125 border border-white/40 ${
            favorites.includes(product.id) ? 'scale-110' : 'scale-100'
          }`}
        >
          <span className={favorites.includes(product.id) ? 'animate-pulse' : ''}>
            {favorites.includes(product.id) ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      <div className="flex-1 flex flex-col space-y-2 md:space-y-4">
        <div className="text-right">
          <div className="flex items-center gap-1 md:gap-2 justify-end mb-1 md:mb-2">
            <span className="text-[7px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[80px] md:max-w-none">{product.supplier}</span>
            <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-emerald-500 rounded-full"></div>
          </div>
          <h3 className="text-xs md:text-lg font-black text-navy leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[2em]">{product.name}</h3>
          {product.offer && product.offer.buyQty > 0 && !isOutOfStock && (
            <div className="mt-1 md:mt-2 flex justify-end">
              <span className="bg-emerald-50 text-emerald-600 text-[7px] md:text-[10px] font-black px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1">
                <span className="animate-pulse">🔥</span>وفر أكثر مع عرض الـ {product.offer.buyQty + product.offer.getQty} حبات
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 md:pt-4 border-t border-white/40 mt-auto">
          <div className="flex justify-between items-end mb-3 md:mb-5">
            <div className="text-right">
              {!isOutOfStock && product.offer && (product.offer.buyQty > 0 || product.offer.discountPercentage > 0) && (
                <p className="text-[7px] md:text-[10px] text-emerald-600 font-black mt-0.5">
                  {product.offer.buyQty > 0 ? 'خصم كمية متاح ✅' : 'خصم حصري متاح ✅'}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-0.5 md:gap-1">
                <span className="text-orange-400 text-[10px] md:text-xs">★</span>
                <span className="text-[8px] md:text-[10px] font-black text-navy">{product.rating || '4.9'}</span>
              </div>
              <div className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[6px] md:text-[8px] font-black uppercase ${!isOutOfStock ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                {!isOutOfStock ? 'متوفر' : 'غير متاح'}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:gap-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1 md:gap-2 bg-white/30 p-0.5 md:p-1 rounded-xl md:rounded-2xl border border-white/60">
              <button onClick={() => handleQtyChange(qty + 1)} className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-lg md:rounded-xl shadow-sm font-black text-navy hover:bg-[#feee00] transition-all text-sm">+</button>
              <input 
                type="number" 
                value={qty} 
                onFocus={(e) => e.target.select()} 
                onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)} 
                className="flex-1 bg-transparent text-center font-black text-[10px] md:text-sm text-navy outline-none w-full" 
              />
              <button onClick={() => handleQtyChange(qty - 1)} disabled={qty <= 1} className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-lg md:rounded-xl shadow-sm font-black text-navy hover:bg-[#feee00] transition-all text-sm">-</button>
            </div>
            <button 
              onClick={() => onAddToCart(product, qty)} 
              disabled={isOutOfStock} 
              className={`w-full h-10 md:h-14 rounded-xl md:rounded-[1.8rem] flex items-center justify-center gap-1 md:gap-3 font-black text-[9px] md:text-xs shadow-2xl transition-all ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-navy text-[#feee00] hover:scale-105 active:scale-95 shadow-navy/20'}`}
            >
              <span className="truncate">{isOutOfStock ? 'غير متاح' : 'إضافة للطلب'}</span>
              <span className="text-sm md:text-xl">🛒</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

interface ESB2BHomeProps {
  products: Product[];
  searchQuery: string;
  activeCat: string;
  setActiveCat: (cat: string) => void;
  categories: { name: string; icon: string }[];
  onAddToCart: (product: Product, quantity: number) => void;
  onSelectProduct: (product: Product) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  showOffersOnly: boolean;
  onOffersToggle: () => void;
  currentUser?: AppUser | null;
}

// --- المكون الأساسي ESB2BHome مع التخزين المؤقت للبيانات وعزل الموردين ---
const ESB2BHome: React.FC<ESB2BHomeProps> = ({ 
  products = [], 
  searchQuery = '', 
  activeCat,
  setActiveCat,
  categories = [],
  onAddToCart, 
  onSelectProduct, 
  favorites = [], 
  toggleFavorite,
  currentPage,
  onPageChange,
  showOffersOnly,
  onOffersToggle,
  currentUser
}) => {   
  const ITEMS_PER_PAGE = 30;
  const scrollPositionRef = useRef<{ [key: number]: number }>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [cachedCategories, setCachedCategories] = useState(categories);

  // تحميل البيانات المخزنة عند بدء التشغيل
  useEffect(() => {
    const initializeCache = async () => {
      await clearOldCache();
      
      await saveSetting('lastVisit', Date.now());
      await saveSetting('activeCat', activeCat);
      await saveSetting('showOffersOnly', showOffersOnly);
      
      if (categories.length > 0) {
        await cacheData('categories', categories);
        setCachedCategories(categories);
      } else {
        const cachedCats = await getCachedData<typeof categories>('categories', 24 * 60 * 60 * 1000);
        if (cachedCats) {
          setCachedCategories(cachedCats);
        }
      }
      
      setIsInitialized(true);
    };

    initializeCache();
  }, [categories, activeCat, showOffersOnly]);

  // حفظ المنتجات في الكاش عند التحديث
  useEffect(() => {
    const cacheProducts = async () => {
      if (products.length > 0) {
        await cacheData('products_preview', products.slice(0, 100));
      }
    };
    
    cacheProducts();
  }, [products]);

  // فلترة المنتجات - المعدل لعزل الموردين
  const filtered = useMemo(() => {
    console.log('Filtering for supplier:', currentUser);
    
    // 1. أولاً: عزل المنتجات حسب المورد المرتبط بالمستخدم
    let result = products.filter(p => p.isActive !== false);
    
    console.log('Total products before filter:', result.length);
    
    // إذا كان المستخدم لديه linkedSupplierId، اعرض فقط منتجات هذا المورد
    if (currentUser?.linkedSupplierId) {
      const supplierId = currentUser.linkedSupplierId;
      const supplierName = currentUser.supplierName || currentUser.company;
      
      result = result.filter(p => {
        // الطريقة 1: الربط بـ supplierId (الأدق)
        if (p.supplierId && p.supplierId === supplierId) {
          return true;
        }
        
        // الطريقة 2: الربط باسم المورد
        if (p.supplier && supplierName && p.supplier === supplierName) {
          return true;
        }
        
        return false;
      });
      
      console.log('Filtered products:', result.length);
    }

    // 2. فلترة القسم أو المفضلة
    if (activeCat === 'المفضلة') {
      result = result.filter(p => favorites.map(String).includes(String(p.id)));
    } else if (activeCat !== 'الكل') {
      result = result.filter(p => p.category === activeCat);
    }

    // 3. فلترة البحث
    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p => 
        (p.name?.toLowerCase().includes(q) || false) || 
        (p.category?.toLowerCase().includes(q) || false)
      );
    }

    // 4. فلترة العروض
    if (showOffersOnly) {
      result = result.filter(p => p.offer && p.offer.buyQty > 0);
    }

    // 5. الترتيب النهائي
    return [...result].sort((a, b) => {
      const orderA = a.sortOrder !== undefined ? Number(a.sortOrder) : 999999;
      const orderB = b.sortOrder !== undefined ? Number(b.sortOrder) : 999999;
      if (orderA !== orderB) return orderA - orderB;
      const aStock = (a.stock || 0) > 0 ? 1 : 0;
      const bStock = (b.stock || 0) > 0 ? 1 : 0;
      if (aStock !== bStock) return bStock - aStock; 
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [activeCat, products, searchQuery, showOffersOnly, favorites, currentUser]);

  // فلترة الفئات - عرض فقط فئات المنتجات المتاحة للمستخدم
  const filteredCategories = useMemo(() => {
    if (currentUser?.linkedSupplierId) {
      const supplierId = currentUser.linkedSupplierId;
      const supplierName = currentUser.supplierName || currentUser.company;
      
      const supplierProductCategories = new Set(
        products
          .filter(p => 
            (p.supplierId && p.supplierId === supplierId) || 
            (p.supplier && supplierName && p.supplier === supplierName)
          )
          .filter(p => p.isActive !== false)
          .map(p => p.category)
          .filter(Boolean)
      );
      
      return categories.filter(cat => 
        cat.name === 'الكل' || 
        cat.name === 'المفضلة' || 
        supplierProductCategories.has(cat.name)
      );
    }
    
    return categories;
  }, [categories, products, currentUser]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  useEffect(() => {
    const savedPosition = scrollPositionRef.current[currentPage];
    if (savedPosition) {
      window.scrollTo({ top: savedPosition, behavior: 'auto' });
    }
  }, [currentPage]);

  const handlePageChangeWithScroll = (newPage: number) => {
    scrollPositionRef.current[currentPage] = window.scrollY;
    onPageChange(newPage);
  };

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  }, [currentPage, totalPages]);

  if (!isInitialized) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-40 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy font-black">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pb-40" dir="rtl">
      {/* رسالة ترحيب باسم المورد إذا كان مرتبطاً */}
      {currentUser?.linkedSupplierId && (currentUser?.supplierName || currentUser?.company) && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-right">
          <p className="text-xs font-bold text-emerald-700">
            مرحباً بك في متجر <span className="font-black">{currentUser.supplierName || currentUser.company}</span> 
            <span className="mr-2 text-emerald-500">🛍️</span>
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mb-4 flex items-center justify-between bg-white/50 backdrop-blur-sm p-2 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChangeWithScroll(currentPage - 1)}
              disabled={currentPage === 1}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                currentPage === 1 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-navy hover:bg-gray-100'
              }`}
            >
              ←
            </button>
            <span className="text-xs font-bold text-navy">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => handlePageChangeWithScroll(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                currentPage === totalPages 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-navy hover:bg-gray-100'
              }`}
            >
              →

            </button>
          </div>
          
          <select
            value={currentPage}
            onChange={(e) => handlePageChangeWithScroll(parseInt(e.target.value))}
            className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-navy outline-none"
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <option key={page} value={page}>
                صفحة {page}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* استخدام filteredCategories بدلاً من cachedCategories */}
      {filteredCategories.length > 0 && (
        <div className="flex gap-4 md:gap-8 px-2 overflow-x-auto no-scrollbar pb-4" dir="rtl">
          {filteredCategories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => {
                setActiveCat(cat.name);
                onPageChange(1);
              }}
              className="flex flex-col items-center gap-3 min-w-[85px] md:min-w-[110px] group transition-all"
            >
              <div className={`w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center bg-white
                ${activeCat === cat.name ? 'border-navy scale-105 shadow-xl' : 'border-gray-100 shadow-sm'}`}>
                
                {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/') || cat.icon.length > 3) ? (
                  <img 
                    src={cat.icon} 
                    alt={cat.name} 
                    className="w-full h-full object-contain p-2" 
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('placehold.co')) {
                        target.src = 'https://placehold.co/150?text=' + encodeURIComponent(cat.name);
                      }
                    }}
                  />
                ) : (
                  <span className="text-3xl md:text-5xl">{cat.icon}</span>
                )}
              </div>

              <span className={`text-[10px] md:text-xs font-black transition-colors ${
                activeCat === cat.name ? 'text-navy' : 'text-gray-500'
              }`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {!searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-16">
          <div className="md:col-span-2 bg-navy rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl min-h-[250px] md:min-h-[400px] flex flex-col justify-center">
            <div className="absolute -left-20 -top-20 w-96 h-96 bg-[#feee00]/10 rounded-full blur-[100px]"></div>
            <div className="relative z-10 space-y-4 md:space-y-6">
              <div className="inline-flex items-center gap-2 md:gap-3 bg-white/5 px-4 md:px-6 py-1.5 md:py-2 rounded-full border border-white/10 backdrop-blur-md">
                <span className="w-2 md:w-2.5 h-2 md:h-2.5 bg-[#feee00] rounded-full animate-pulse"></span>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#feee00]">EASY. SMART. BUSINESS.</span>
              </div>
              <h1 className="text-3xl md:text-7xl font-black leading-tight">قوة المورد الواحد..<br/>بذكاء المستقبل</h1>
              <p className="text-gray-400 text-sm md:text-lg font-bold max-w-lg">اختصرنا لك عالم التوريد في منصة واحدة.</p>
            </div>
          </div>

          <div 
            onClick={onOffersToggle}
            className={`group cursor-pointer relative overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] p-8 flex flex-col justify-between border-4 transition-all duration-500 shadow-2xl ${
              showOffersOnly ? 'border-[#feee00] bg-navy' : 'border-white bg-gray-50'
            }`}
          >
            <div className="relative z-10">
               <h3 className={`text-2xl md:text-4xl font-black mb-2 ${showOffersOnly ? 'text-[#feee00]' : 'text-navy'}`}>
                {showOffersOnly ? 'كل المنتجات' : 'العروض الحالية'}
               </h3>
               <p className={`text-xs md:text-sm font-bold ${showOffersOnly ? 'text-white/60' : 'text-gray-500'}`}>
                {showOffersOnly ? 'انقر للعودة للقائمة' : 'اكتشف صفقات اليوم الحصرية'}
               </p>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl md:text-3xl shadow-xl transition-transform group-hover:rotate-12 ${
                   showOffersOnly ? 'bg-[#feee00] text-navy' : 'bg-navy text-[#feee00]'
                }`}>
                  %
                </div>
                <span className={`text-[10px] font-black px-4 py-2 rounded-full border ${showOffersOnly ? 'border-white text-white' : 'border-navy text-navy'}`}>
                   {showOffersOnly ? 'نشط الآن' : 'تصفح الآن'}
                </span>
            </div>
            <div className={`absolute -right-10 -bottom-10 text-[180px] font-black opacity-5 pointer-events-none transform -rotate-12 ${showOffersOnly ? 'text-white' : 'text-navy'}`}>%</div>
          </div>
        </div> 
      )}

      {paginatedProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {paginatedProducts.map((p) => (
              <ProductCard 
                key={p.id}
                product={p}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                onAddToCart={onAddToCart}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-16 flex flex-col items-center gap-6">
              <div className="flex items-center gap-4 bg-white/40 backdrop-blur-xl p-2 rounded-[2rem] border border-white/40 shadow-xl">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageChangeWithScroll(currentPage - 1)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all font-black text-lg ${
                    currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-navy hover:bg-[#feee00] active:scale-90'
                  }`}
                  title="الصفحة السابقة"
                > ← </button>
                
                <div className="hidden md:flex items-center gap-2">
                  {pageNumbers.map((page, index) => (
                    <React.Fragment key={index}>
                      {page === '...' ? (
                        <span className="w-8 text-center text-gray-400 font-black">...</span>
                      ) : (
                        <button
                          onClick={() => handlePageChangeWithScroll(page as number)}
                          className={`w-10 h-10 rounded-xl font-black transition-all ${
                            currentPage === page
                              ? 'bg-navy text-white shadow-lg scale-110'
                              : 'text-navy hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="md:hidden px-6 py-2 flex items-center gap-2">
                  <span className="text-xs font-black text-navy">صفحة</span>
                  <span className="w-10 h-10 flex items-center justify-center bg-navy text-white rounded-xl font-black shadow-lg">
                    {currentPage}
                  </span>
                  <span className="text-xs font-black text-gray-400">من {totalPages}</span>
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChangeWithScroll(currentPage + 1)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all font-black text-lg ${
                    currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-navy hover:bg-[#feee00] active:scale-90'
                  }`}
                  title="الصفحة التالية"
                > → </button>
              </div>

              <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-navy transition-all duration-300"
                  style={{ width: `${(currentPage / totalPages) * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">اذهب إلى:</span>
                <select
                  value={currentPage}
                  onChange={(e) => handlePageChangeWithScroll(parseInt(e.target.value))}
                  className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold text-navy outline-none focus:border-[#feee00]"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <option key={page} value={page}>
                      الصفحة {page}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 md:py-40 text-center bg-white/40 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] border border-white/40 flex flex-col items-center">
          <span className="text-5xl md:text-8xl mb-4 md:mb-6 opacity-20">
            {activeCat === 'المفضلة' ? '❤️' : '🔍'}
          </span>
          <h3 className="text-lg md:text-2xl font-black text-navy px-6">
            {activeCat === 'المفضلة' 
              ? 'قائمة المفضلة فارغة حالياً' 
              : showOffersOnly 
                ? 'لا توجد عروض حالياً في هذا القسم' 
                : currentUser?.linkedSupplierId 
                  ? 'لا توجد منتجات لهذا المورد حالياً' 
                  : 'لم نجد ما تبحث عنه'}
          </h3>
          <p className="text-gray-500 mt-2 text-sm font-bold max-w-xs mx-auto">
            {activeCat === 'المفضلة' 
              ? 'المنتجات التي تضغط على قلبها ستظهر هنا لتصل إليها بسرعة.' 
              : ''}
          </p>
          <button 
            onClick={() => {
              if (showOffersOnly) onOffersToggle();
              setActiveCat('الكل');
              onPageChange(1);
            }} 
            className="mt-6 px-8 py-3 bg-navy text-white rounded-2xl font-black text-sm hover:bg-[#feee00] hover:text-navy transition-all active:scale-95 shadow-lg"
          >
            {activeCat === 'المفضلة' ? 'ابدأ بالتسوق الآن' : 'عرض كافة المنتجات'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ESB2BHome;