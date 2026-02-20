import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product } from '../types';
import { formatDate, formatEnNumber } from '../App';
import { SUPPLIER_PHONE } from '../constants';

interface ESB2BProductDetailProps {
  product: Product;
  onAddToCart: (p: Product, qty: number) => void;
  onBack: () => void;
  onSelectRelated: (p: Product) => void;
  onSelectCategory: (catName: string) => void;
  similarProducts?: Product[]; // إضافة خاصية المنتجات المشابهة
}

// --- مكون بطاقة المنتج المصغر للمنتجات المشابهة (جديد) ---
const SimilarProductCard: React.FC<{
  product: Product;
  onSelect: (p: Product) => void;
  onAddToCart: (p: Product, qty: number) => void;
}> = ({ product, onSelect, onAddToCart }) => {
  const [qty, setQty] = useState(1);
  const isOutOfStock = (product.stock || 0) <= 0;

  return (
    <div 
      className="group bg-white rounded-2xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-[#feee00] w-[200px] flex-shrink-0"
      onClick={() => onSelect(product)}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2">
        <img 
          src={product.imageUrl || 'https://via.placeholder.com/200?text=No+Image'} 
          className={`w-full h-full object-cover transition-transform group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-50' : ''}`}
          alt={product.name}
          loading="lazy"
        />
        {product.offer && product.offer.buyQty > 0 && !isOutOfStock && (
          <div className="absolute top-1 right-1 bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">
            عرض
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full">نفذ</span>
          </div>
        )}
      </div>
      
      <h4 className="text-xs font-bold text-navy line-clamp-2 mb-1 min-h-[2em]">{product.name}</h4>
      
      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="text-[10px] text-gray-400">السعر</span>
          <p className="text-sm font-black text-navy">{product.price.toLocaleString()} <span className="text-[8px]">ج.م</span></p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isOutOfStock) onAddToCart(product, 1);
          }}
          disabled={isOutOfStock}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            isOutOfStock 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-[#feee00] text-navy hover:scale-110 active:scale-95'
          }`}
        >
          🛒
        </button>
      </div>
    </div>
  );
};

const ESB2BProductDetail: React.FC<ESB2BProductDetailProps> = ({ 
  product, 
  onAddToCart, 
  onBack, 
  onSelectRelated,
  onSelectCategory,
  similarProducts = [] // المنتجات المشابهة
}) => {
  const [quantity, setQuantity] = useState(product.minOrderQuantity || 1);
  const [activeImg, setActiveImg] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [showAllSimilar, setShowAllSimilar] = useState(false); // لعرض كل المنتجات المشابهة
  const isOutOfStock = (product.stock || 0) <= 0;

  useEffect(() => {
    window.scrollTo(0, 0);
    setQuantity(product.minOrderQuantity || 1);
    const initialImg = product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/600?text=No+Image');
    setActiveImg(initialImg);
  }, [product]);

  const calculateTotal = useCallback(() => {
    if (product.offer && product.offer.type === 'buy_x_get_y') {
      const { buyQty, getQty } = product.offer;
      const setSize = buyQty + getQty;
      const numSets = Math.floor(quantity / setSize);
      const remainingItems = quantity % setSize;
      const billableQuantity = (numSets * buyQty) + remainingItems;
      return billableQuantity * product.price;
    }
    return quantity * product.price;
  }, [product, quantity]);

  const calculateSavings = useCallback(() => {
    if (product.offer && product.offer.type === 'buy_x_get_y') {
      const { buyQty, getQty } = product.offer;
      const setSize = buyQty + getQty;
      const numSets = Math.floor(quantity / setSize);
      return numSets * getQty * product.price;
    }
    return 0;
  }, [product, quantity]);

  const allImages = Array.from(new Set([
    product.imageUrl,
    ...(product.images || [])
  ])).filter(Boolean);

  const handleContactWhatsApp = () => {
    const total = calculateTotal();
    const savings = calculateSavings();
    const message = `مرحباً، أود الاستفسار عن المنتج: ${product.name}
السعر: ${product.price} ج.م
الكمية المطلوبة: ${quantity}
الإجمالي: ${total} ج.م
${savings > 0 ? `التوفير: ${savings} ج.م` : ''}
الحالة: ${isOutOfStock ? 'نفذ المخزون' : 'متوفر'}`;
    
    const url = `https://wa.me/${SUPPLIER_PHONE.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    setQuantity(newQty);
  };

  // فلترة المنتجات المشابهة (استبعاد المنتج الحالي)
  const filteredSimilarProducts = useMemo(() => {
    return similarProducts
      .filter(p => p.id !== product.id && p.category === product.category)
      .slice(0, showAllSimilar ? undefined : 10); // عرض 10 منتجات افتراضياً
  }, [similarProducts, product.id, product.category, showAllSimilar]);

  return (
    <div className="bg-gray-50 min-h-screen pb-32 font-['Cairo'] text-right animate-fadeIn" dir="rtl">
      <div className="max-w-7xl mx-auto md:py-10 md:px-6">
        {/* شريط التنقل */}
        <div className="flex items-center justify-between mb-6 px-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white font-bold text-xs bg-slate-900 hover:bg-blue-600 transition-all px-5 py-2.5 rounded-full shadow-md active:scale-95"
          >
            <span>العودة للمتجر</span>
            <span className="text-sm">←</span>
          </button>

          {/* مسار التنقل (Breadcrumb) */}
          <div className="flex items-center gap-2 text-xs">
            <button 
              onClick={() => onSelectCategory('الكل')}
              className="text-gray-500 hover:text-navy transition-colors"
            >
              الرئيسية
            </button>
            <span className="text-gray-300">/</span>
            <button 
              onClick={() => onSelectCategory(product.category)}
              className="text-gray-500 hover:text-navy transition-colors"
            >
              {product.category}
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-navy font-bold truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 px-4">
          {/* قسم الصور - بدون sticky */}
<div className="flex-1 bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100">
  <div 
    className={`relative aspect-square rounded-[2rem] overflow-hidden bg-gray-50 group mb-6 cursor-zoom-in transition-all duration-300 ${
      isZoomed ? 'scale-150 z-50 fixed inset-0 bg-black/90 flex items-center justify-center' : ''
    }`}
    onClick={() => setIsZoomed(!isZoomed)}
  >
    {/* محتوى الصورة كما هو */}
    {product.offer && product.offer.buyQty > 0 && !isOutOfStock && (
      <div className="absolute top-4 right-4 z-10 drop-shadow-xl animate-pulse">
        <div className="bg-white/70 backdrop-blur-md text-rose-600 text-[10px] font-black px-4 py-2 rounded-2xl border border-white shadow-sm flex items-center gap-2">
          <span className="bg-rose-500 text-white w-5 h-5 flex items-center justify-center rounded-lg text-[10px]">🎁</span>
          <span className="tracking-tight">اشتري {product.offer.buyQty} واحصل على {product.offer.getQty} مجاناً</span>
        </div>
      </div>
    )}

    <img 
      src={activeImg} 
      className={`w-full h-full object-contain transition-transform duration-700 ${
        isZoomed ? 'scale-150' : 'group-hover:scale-110'
      } ${isOutOfStock ? 'grayscale opacity-40' : ''}`} 
      alt={product.name} 
      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600?text=Image+Error'; }}
    />

    {isOutOfStock && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="bg-rose-600 text-white font-black px-10 py-4 rounded-3xl shadow-2xl text-xl rotate-12">نفذ المخزون 🚫</span>
      </div>
    )}
    
    {product.isBestSeller && !isOutOfStock && (
      <span className="absolute top-6 right-6 bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-2xl">الأكثر مبيعاً 🔥</span>
    )}

    {/* مؤشر التكبير */}
    <div className="absolute bottom-4 left-4 bg-black/50 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
      {isZoomed ? 'اضغط للتصغير' : 'اضغط للتكبير'}
    </div>
  </div>
  
  {allImages.length > 1 && (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {allImages.map((img, i) => (
        <button 
          key={i} 
          onClick={() => setActiveImg(img || '')}
          className={`w-20 h-20 rounded-2xl border-4 transition-all overflow-hidden flex-shrink-0 ${
            activeImg === img ? 'border-[#feee00] scale-105 shadow-md' : 'border-gray-50 opacity-60 hover:opacity-100'
          }`}
        >
          <img src={img || ''} className="w-full h-full object-cover" alt="" />
        </button>
      ))}
    </div>
  )}
</div>

          {/* معلومات المنتج */}
          <div className="flex-[1.3] space-y-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {product.brandImage && (
                      <div className="w-10 h-10 bg-white border rounded-xl p-1.5 flex items-center justify-center shadow-sm">
                        <img src={product.brandImage} className="w-full h-full object-cover" alt="brand" />
                      </div>
                    )}
                    <button 
                      onClick={() => onSelectCategory(product.category)}
                      className="bg-blue-50 text-blue-600 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                    >
                      {product.category}
                    </button>
                  </div>
                  
                  {/* رمز المشاركة (جديد) */}
                  <button 
                    onClick={() => {
                      navigator.share?.({
                        title: product.name,
                        text: product.description,
                        url: window.location.href
                      }).catch(() => {
                        navigator.clipboard?.writeText(window.location.href);
                        alert('تم نسخ الرابط');
                      });
                    }}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <span className="text-sm">🔗</span>
                  </button>
                </div>
                
                <h1 className={`text-2xl md:text-4xl font-black leading-tight ${isOutOfStock ? 'text-gray-400' : 'text-gray-900'}`}>
                  {product.name}
                </h1>
                
                <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 px-4 py-2 rounded-xl w-fit">
                  <span>📅 تاريخ الانتهاء:</span>
                  <span>{formatDate(product.expiryDate) || 'غير محدد'}</span>
                </div>

                <p className="text-slate-500 text-sm font-medium leading-relaxed">{product.description}</p>
                
                {/* معلومات إضافية (جديد) */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {product.supplier && (
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <span className="text-[8px] text-gray-400 block">المورد</span>
                      <span className="text-xs font-bold">{product.supplier}</span>
                    </div>
                  )}
                  {product.barcode && (
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <span className="text-[8px] text-gray-400 block">الباركود</span>
                      <span className="text-xs font-bold font-mono">{product.barcode}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">السعر الحالي</p>
                    <p className={`text-3xl font-black ${isOutOfStock ? 'text-gray-400' : 'text-slate-900'}`}>
                      {product.price.toLocaleString()} <span className="text-xs">ج.م</span>
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">حالة المخزون</p>
                    <p className={`text-sm font-black ${!isOutOfStock ? 'text-green-600' : 'text-red-500'}`}>
                      {!isOutOfStock ? 'متوفر' : 'نفذ تماماً ❌'}
                    </p>
                  </div>
                </div>

                {/* شريط الكمية المحسن */}
                <div className="flex items-center gap-4 mt-4">
                  <span className="text-xs font-bold text-gray-500">الكمية:</span>
                  <div className="flex items-center border-2 border-gray-100 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="w-10 h-10 flex items-center justify-center bg-gray-50 text-navy font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      className="w-16 h-10 text-center font-bold outline-none"
                      min="1"
                      disabled={isOutOfStock}
                    />
                    <button 
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={isOutOfStock}
                      className="w-10 h-10 flex items-center justify-center bg-gray-50 text-navy font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* ملخص الطلب 
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
                <h3 className="text-sm font-black mb-4">ملخص الطلب</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">سعر الوحدة:</span>
                    <span className="font-bold">{product.price.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">الكمية:</span>
                    <span className="font-bold">{quantity}</span>
                  </div>
                  {calculateSavings() > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>توفير من العرض:</span>
                      <span className="font-bold">{calculateSavings().toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 my-2 pt-2">
                    <div className="flex justify-between font-black text-lg">
                      <span>الإجمالي:</span>
                      <span className="text-blue-600">{calculateTotal().toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>
              </div> */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => !isOutOfStock && onAddToCart(product, quantity)} 
                  disabled={isOutOfStock}
                  className={`py-5 rounded-[1.5rem] font-black text-sm shadow-xl transition-all flex items-center justify-center gap-3 ${
                    isOutOfStock 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                    : 'bg-[#feee00] hover:bg-slate-900 hover:text-white text-slate-900 active:scale-95'
                  }`}
                >
                  <span>{isOutOfStock ? 'المنتج غير متوفر حالياً' : 'إضافة لسلة'}</span>
                  <span className="text-xl">{isOutOfStock ? '🚫' : '🛒'}</span>
                </button>
                
                <button 
                  onClick={handleContactWhatsApp} 
                  className="bg-white border-2 border-slate-900 text-slate-900 py-5 rounded-[1.5rem] font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <span>{isOutOfStock ? 'استفسار عن موعد التوفر' : 'تواصل مع المورد (واتساب)'}</span>
                  <span className="text-xl text-green-600">💬</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* قسم المنتجات المشابهة (جديد) */}
        {filteredSimilarProducts.length > 0 && (
          <div className="mt-16 px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-navy">منتجات مشابهة</h2>
                <p className="text-sm text-gray-500">من نفس الفئة: {product.category}</p>
              </div>
              
              <div className="flex items-center gap-3">
                {filteredSimilarProducts.length > 10 && (
                  <button
                    onClick={() => setShowAllSimilar(!showAllSimilar)}
                    className="text-sm font-bold text-navy hover:text-[#feee00] transition-colors"
                  >
                    {showAllSimilar ? 'عرض أقل' : 'عرض الكل'}
                  </button>
                )}
                <button
                  onClick={() => onSelectCategory(product.category)}
                  className="bg-navy text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-opacity-90 transition-all"
                >
                  عرض الكل في {product.category}
                </button>
              </div>
            </div>

            {/* شريط المنتجات المشابهة مع التمرير الأفقي */}
            <div className="relative">
              <div className="overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex gap-4">
                  {filteredSimilarProducts.map((similarProduct) => (
                    <SimilarProductCard
                      key={similarProduct.id}
                      product={similarProduct}
                      onSelect={onSelectRelated}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </div>
              </div>
              
              {/* أزرار التمرير (للسطح المكتب) */}
              <button 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-navy hover:bg-[#feee00] transition-all hidden md:flex"
                onClick={(e) => {
                  const container = e.currentTarget.parentElement?.querySelector('.overflow-x-auto');
                  if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                }}
              >
                ←
              </button>
              <button 
                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-navy hover:bg-[#feee00] transition-all hidden md:flex"
                onClick={(e) => {
                  const container = e.currentTarget.parentElement?.querySelector('.overflow-x-auto');
                  if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                }}
              >
                →
              </button>
            </div>

            {/* رسالة إذا كانت كل المنتجات المشابهة معروضة */}
            {filteredSimilarProducts.length === similarProducts.filter(p => p.id !== product.id && p.category === product.category).length && (
              <p className="text-center text-sm text-gray-500 mt-4">
                تم عرض جميع المنتجات المشابهة ({filteredSimilarProducts.length} منتج)
              </p>
            )}
          </div>
        )}

        {/* قسم اقتراحات إضافية (يمكن إضافته لاحقاً) */}
        {filteredSimilarProducts.length === 0 && (
          <div className="mt-16 px-4 text-center py-10 bg-white/50 rounded-[2rem]">
            <span className="text-4xl mb-4 block">🛍️</span>
            <p className="text-gray-500">لا توجد منتجات مشابهة حالياً</p>
            <button
              onClick={() => onSelectCategory('الكل')}
              className="mt-4 text-navy font-bold underline"
            >
              تصفح جميع المنتجات
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ESB2BProductDetail;