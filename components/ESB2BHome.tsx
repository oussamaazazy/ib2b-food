import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../types';
import { formatEnNumber } from '../App';

// --- المكون الفرعي لبطاقة المنتج (بدون تغيير في المحتوى) ---
const ProductCard: React.FC<{
  product: Product;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  onAddToCart: (p: Product, qty: number) => void;
  onSelectProduct: (p: Product) => void;
}> = ({ product, favorites, toggleFavorite, onAddToCart, onSelectProduct }) => {
  const [qty, setQty] = useState(product.minOrderQuantity || 1);
  const isOutOfStock = (product.stock || 0) <= 0;

  const handleQtyChange = (val: number) => {
    if (val < 1) return;
    setQty(val);
  };

  return (
    <div 
      className={`group relative bg-white/40 backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] p-3 md:p-6 border border-white/20 shadow-[0_40px_80px_rgba(0,0,0,0.05)] hover:shadow-[0_60px_100px_rgba(0,0,0,0.08)] transition-all duration-700 hover:-translate-y-2 md:hover:-translate-y-4 md:hover:rotate-1 flex flex-col h-full ${isOutOfStock ? 'opacity-70' : ''}`}
      onClick={() => onSelectProduct(product)}
    >
      <div className="relative aspect-square rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-white mb-3 md:mb-6 border border-white/40 shadow-inner group-hover:shadow-2xl transition-all duration-500">
        {product.offer && product.offer.buyQty > 0 && !isOutOfStock && (
          <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 animate-bounce">
            <div className="bg-rose-500 text-white text-[7px] md:text-[10px] font-black px-2 py-1 md:px-4 md:py-2 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
              <span>عرض {product.offer.buyQty} + {product.offer.getQty}</span>
              <span className="text-[10px] md:text-[14px]">🎁</span>
            </div>
          </div>
        )}
        <img 
          src={product.imageUrl || 'https://via.placeholder.com/400?text=No+Image'} 
          className={`w-full h-full object-contain p-4 transition-transform duration-1000 group-hover:scale-105 ${isOutOfStock ? 'grayscale opacity-60' : ''}`} 
          alt={product.name} 
        />
        <div className="absolute inset-0 bg-gray-50/10 pointer-events-none"></div>
        {isOutOfStock && (
          <div className="absolute inset-0 bg-navy/20 backdrop-blur-[2px] flex items-center justify-center p-2">
             <div className="bg-rose-500 text-white font-black text-[8px] md:text-[10px] px-3 py-1 md:px-6 md:py-2 rounded-full shadow-2xl tracking-tighter uppercase text-center">نفذ</div>
          </div>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
          className="absolute bottom-2 left-2 md:bottom-4 md:left-4 w-8 h-8 md:w-11 md:h-11 bg-white/80 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-90 text-sm md:text-lg border border-white/40"
        >
          <span>{favorites.includes(product.id) ? '❤️' : '🤍'}</span>
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
              {product.offer && !isOutOfStock && <p className="text-[7px] md:text-[10px] text-emerald-600 font-black mt-0.5">خصم كمية متاح ✅</p>}
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
              <input type="number" value={qty} onFocus={(e) => e.target.select()} onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)} className="flex-1 bg-transparent text-center font-black text-[10px] md:text-sm text-navy outline-none w-full" />
              <button onClick={() => handleQtyChange(qty - 1)} disabled={qty <= 1} className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-lg md:rounded-xl shadow-sm font-black text-navy hover:bg-[#feee00] transition-all text-sm">-</button>
            </div>
            <button onClick={() => onAddToCart(product, qty)} disabled={isOutOfStock} className={`w-full h-10 md:h-14 rounded-xl md:rounded-[1.8rem] flex items-center justify-center gap-1 md:gap-3 font-black text-[9px] md:text-xs shadow-2xl transition-all ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-navy text-[#feee00] hover:scale-105 active:scale-95 shadow-navy/20'}`}>
              <span className="truncate">{isOutOfStock ? 'غير متاح' : 'إضافة للطلب'}</span>
              <span className="text-sm md:text-xl">🛒</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- المكون الأساسي ESB2BHome ---
const ESB2BHome: React.FC<any> = ({ 
  products = [], 
  searchQuery = '', 
  onAddToCart, 
  onSelectProduct, 
  favorites = [], 
  toggleFavorite 
}) => {   
  
  const [activeCat, setActiveCat] = useState('الكل');
  const [currentPage, setCurrentPage] = useState(1);
  const [showOffersOnly, setShowOffersOnly] = useState(false); // الحالة الجديدة للعروض
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCat, searchQuery, showOffersOnly]);

  const filtered = useMemo(() => {
    // 1. فلترة حسب القسم
    let result = activeCat === 'الكل' ? products : products.filter(p => p.category === activeCat);
    
    // 2. فلترة حسب البحث
    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p => 
        (p.name?.toLowerCase().includes(q) || false) || 
        (p.category?.toLowerCase().includes(q) || false)
      );
    }

    // 3. فلترة "العروض الحالية" إذا كانت مفعلة
    if (showOffersOnly) {
      result = result.filter(p => p.offer && p.offer.buyQty > 0);
    }

    return [...result].sort((a, b) => {
      const orderA = a.sortOrder !== undefined ? Number(a.sortOrder) : 999999;
      const orderB = b.sortOrder !== undefined ? Number(b.sortOrder) : 999999;
      if (orderA !== orderB) return orderA - orderB;
      const aStock = (a.stock || 0) > 0 ? 1 : 0;
      const bStock = (b.stock || 0) > 0 ? 1 : 0;
      if (aStock !== bStock) return bStock - aStock; 
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [activeCat, products, searchQuery, showOffersOnly]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pb-40" dir="rtl">
      {!searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-16">
          {/* البانر الرئيسي */}
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

          {/* حاوية العروض الحالية (جديد) */}
          <div 
            onClick={() => setShowOffersOnly(!showOffersOnly)}
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
            {/* زخرفة خلفية */}
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
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all font-black text-lg ${
                    currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-navy hover:bg-[#feee00] active:scale-90'
                  }`}
                > ← </button>
                <div className="px-6 py-2 flex items-center gap-2">
                  <span className="text-xs font-black text-navy">صفحة</span>
                  <span className="w-10 h-10 flex items-center justify-center bg-navy text-white rounded-xl font-black shadow-lg">{currentPage}</span>
                  <span className="text-xs font-black text-gray-400">من {totalPages}</span>
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all font-black text-lg ${
                    currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-navy hover:bg-[#feee00] active:scale-90'
                  }`}
                > → </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 md:py-40 text-center bg-white/40 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] border border-white/40 flex flex-col items-center">
          <span className="text-5xl md:text-8xl mb-4 md:mb-6 opacity-20">🔍</span>
          <h3 className="text-lg md:text-2xl font-black text-navy">
            {showOffersOnly ? 'لا توجد عروض حالياً في هذا القسم' : 'لم نجد ما تبحث عنه'}
          </h3>
          <button 
            onClick={() => {setShowOffersOnly(false); setActiveCat('الكل');}} 
            className="mt-4 text-navy font-black underline"
          >
            عرض كافة المنتجات
          </button>
        </div>
      )}
    </div>
  );
};

export default ESB2BHome;