import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { formatDate, formatEnNumber } from '../App';
import { SUPPLIER_PHONE } from '../constants';

interface ESB2BProductDetailProps {
  product: Product;
  onAddToCart: (p: Product, qty: number) => void;
  onBack: () => void;
  onSelectRelated: (p: Product) => void;
}

const ESB2BProductDetail: React.FC<ESB2BProductDetailProps> = ({ product, onAddToCart, onBack, onSelectRelated }) => {
  const [quantity, setQuantity] = useState(product.minOrderQuantity || 1);
  const [activeImg, setActiveImg] = useState('');
  const isOutOfStock = (product.stock || 0) <= 0;
  
  // ✅ تحقق مما إذا كان المنتج يحتوي على عرض حقيقي
  const hasValidOffer = product.offer && 
    product.offer.type === 'buy_x_get_y' && 
    product.offer.buyQty > 0 && 
    product.offer.getQty > 0;

  const placeholderImage = 'https://via.placeholder.com/600?text=No+Image';

  useEffect(() => {
    window.scrollTo(0, 0);
    setQuantity(product.minOrderQuantity || 1);
    const initialImg = product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : placeholderImage);
    setActiveImg(initialImg || placeholderImage);
  }, [product]);

  // ✅ دالة حساب الإجمالي مع مراعاة العروض (مثلاً 2+1)
  const calculateTotal = () => {
    if (hasValidOffer) {
      const { buyQty, getQty } = product.offer;
      const setSize = buyQty + getQty;
      const numSets = Math.floor(quantity / setSize);
      const remainingItems = quantity % setSize;
      const billableQuantity = (numSets * buyQty) + remainingItems;
      return billableQuantity * product.price;
    }
    return quantity * product.price;
  };

  // تصفية القيم الفارغة/null/undefined من الصور
  const allImages = Array.from(new Set([
    product.imageUrl,
    ...(product.images || [])
  ])).filter((img): img is string => !!img && img.trim() !== '');

  const handleContactWhatsApp = () => {
    const message = `مرحباً، أود الاستفسار عن المنتج: ${product.name}\nالسعر: ${product.price} ر.س\nالحالة حالياً: ${isOutOfStock ? 'نفذ المخزون' : 'متوفر'}`;
    const url = `https://wa.me/${SUPPLIER_PHONE.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = placeholderImage;
    e.currentTarget.onerror = null; // منع حلقة لا نهائية من الأخطاء
  };

  const handleSetActiveImg = (img: string) => {
    setActiveImg(img || placeholderImage);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-32 font-['Cairo'] text-right animate-fadeIn" dir="rtl">
      <div className="max-w-7xl mx-auto md:py-10 md:px-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white font-bold text-xs bg-slate-900 hover:bg-blue-600 transition-all px-5 py-2.5 rounded-full shadow-md active:scale-95"
        >
          <span>العودة للمتجر</span>
          <span className="text-sm">←</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-10 px-4">
          <div className="flex-1 bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 self-start">
            <div className="flex-1 bg-white p-3 md:p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 self-start transition-all"></div>
            
            <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-50 group mb-6">
              {/* ✅ عرض الشريط الأحمر فقط لمنتجات لها عروض حقيقية ومتوفرة */}
              {hasValidOffer && !isOutOfStock && (
                <div className="absolute top-4 right-4 z-10 drop-shadow-xl animate-pulse">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-black px-4 py-2 rounded-2xl border border-white/30 shadow-lg flex items-center gap-2">
                    <span className="bg-white text-red-600 w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-bold">🎁</span>
                    <span className="tracking-tight">
                      عرض خاص: اشتري {product.offer.buyQty} واحصل على {product.offer.getQty} مجاناً
                    </span>
                  </div>
                </div>
              )}

              <img 
                src={activeImg || placeholderImage}
                className={`w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-40' : ''}`} 
                alt={product.name}
                onError={handleImageError}
              />

              {isOutOfStock && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-rose-600 text-white font-black px-10 py-4 rounded-3xl shadow-2xl text-xl rotate-12">نفذ المخزون 🚫</span>
                </div>
              )}
              {product.isBestSeller && !isOutOfStock && (
                <span className="absolute top-6 right-6 bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-2xl">الأكثر مبيعاً 🔥</span>
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {allImages.map((img, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSetActiveImg(img)}
                    className={`w-20 h-20 rounded-2xl border-4 transition-all overflow-hidden flex-shrink-0 ${activeImg === img ? 'border-[#feee00] scale-105 shadow-md' : 'border-gray-50 opacity-60'}`}
                  >
                    <img 
                      src={img} 
                      className="w-full h-full object-cover" 
                      alt=""
                      onError={handleImageError}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-[1.3] space-y-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {product.brandImage && (
                      <div className="w-10 h-10 bg-white border rounded-xl p-1.5 flex items-center justify-center shadow-sm">
                        <img 
                          src={product.brandImage} 
                          className="w-full h-full object-contain" 
                          alt="brand"
                          onError={handleImageError}
                        />
                      </div>
                    )}
                    <span className="bg-blue-50 text-blue-600 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{product.category}</span>
                  </div>
                </div>
                <h1 className={`text-2xl md:text-4xl font-black leading-tight ${isOutOfStock ? 'text-gray-400' : 'text-gray-900'}`}>{product.name}</h1>
                
                <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 px-4 py-2 rounded-xl w-fit">
                  <span>📅 تاريخ الانتهاء:</span>
                  <span>{formatDate(product.expiryDate) || 'غير محدد'}</span>
                </div>

                <p className="text-slate-500 text-sm font-medium leading-relaxed">{product.description}</p>
              </div>

              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">السعر الحالي</p>
                  <p className={`text-3xl font-black ${isOutOfStock ? 'text-gray-400' : 'text-slate-900'}`}>{product.price.toLocaleString()} <span className="text-xs">ر.س</span></p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">حالة المخزون</p>
                  <p className={`text-sm font-black ${!isOutOfStock ? 'text-green-600' : 'text-red-500'}`}>
                    {!isOutOfStock ? 'متوفر' : 'نفذ تماماً ❌'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-6 pt-6">
                <div className="flex items-center gap-6">
                  <div className={`space-y-1 ${isOutOfStock ? 'opacity-20 pointer-events-none' : ''}`}>
                    <span className="text-[10px] text-gray-400 font-black uppercase">الكمية المطلوبة</span>
                    <div className="flex items-center border-4 border-gray-50 rounded-2xl h-14 px-6 bg-white shadow-inner">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-2xl text-gray-300 hover:text-slate-900">-</button>
                      <input 
                        type="number" 
                        value={isOutOfStock ? 0 : quantity} 
                        readOnly={isOutOfStock}
                        onFocus={(e) => !isOutOfStock && e.target.select()}
                        onChange={(e) => !isOutOfStock && setQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                        className="w-20 text-center bg-transparent font-black text-xl outline-none" 
                      />
                      <button onClick={() => setQuantity(quantity + 1)} className="text-2xl text-gray-300 hover:text-slate-900">+</button>
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                     <p className="text-[10px] text-gray-400 font-black mb-1">إجمالي الفاتورة</p>
                     <p className={`text-2xl font-black ${isOutOfStock ? 'text-gray-300' : 'text-blue-600'}`}>
                        {isOutOfStock ? '---' : formatEnNumber(calculateTotal()) + ' ر.س'}
                     </p>
                     {/* ✅ إظهار التوفير في حال تفعيل العرض */}
                     {hasValidOffer && quantity >= (product.offer.buyQty + product.offer.getQty) && !isOutOfStock && (
                       <p className="text-[10px] text-emerald-600 font-black animate-pulse">تم تطبيق خصم العرض 🎁</p>
                     )}
                  </div>
                </div>

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
                    <span>{isOutOfStock ? 'المنتج غير متوفر حالياً' : 'إضافة لسلة الأعمال'}</span>
                    <span className="text-xl">{isOutOfStock ? '🚫' : '🛒'}</span>
                  </button>
                  <button onClick={handleContactWhatsApp} className="bg-white border-2 border-slate-900 text-slate-900 py-5 rounded-[1.5rem] font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                    <span>{isOutOfStock ? 'استفسار عن موعد التوفر' : 'تواصل مع المورد (واتساب)'}</span>
                    <span className="text-xl text-green-600">💬</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ESB2BProductDetail;