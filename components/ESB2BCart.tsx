import React, { useState, useEffect, useMemo } from 'react';
import { Product, Order, AppUser } from '../types';
import { formatEnNumber, formatDate } from '../App';
import { SUPPLIER_PHONE } from '../constants';

interface CartItem extends Product {
  quantity: number;
}

interface ESB2BCartProps {
  cart: CartItem[];
  orders: Order[];
  currentUser: AppUser | null;
  initialTab?: 'cart' | 'tracking';
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, q: number) => void;
  onGoBack: () => void;
  onPlaceOrder: () => void;
  onReOrder: (items: any[]) => void;
  userRole?: string;
  isSubmitting?: boolean;
}

const ESB2BCart: React.FC<ESB2BCartProps> = ({ 
  cart = [], orders = [], currentUser, initialTab = 'cart', 
  removeFromCart, updateQuantity, onGoBack, onPlaceOrder, onReOrder, userRole, isSubmitting = false
}) => {
  const [activeTab, setActiveTab] = useState<'cart' | 'tracking'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (currentUser?.email) {
      const storageKey = `esb2b_cart_${currentUser.email}`;
      if (cart.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(cart));
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [cart, currentUser]);

  // ✅ دالة تحقق مما إذا كان المنتج يحتوي على عرض حقيقي
  const hasValidOffer = (item: CartItem) => {
    return item.offer && 
      item.offer.type === 'buy_x_get_y' && 
      item.offer.buyQty > 0 && 
      item.offer.getQty > 0;
  };

  // ✅ دالة حساب سعر الصنف مع مراعاة عروض الكمية (مثل 2+1)
  const calculateItemTotal = (item: CartItem) => {
    if (hasValidOffer(item)) {
      const { buyQty, getQty } = item.offer;
      const setSize = buyQty + getQty; // مجموع الحبات في العرض الواحد (مثلاً 3)
      const numSets = Math.floor(item.quantity / setSize); // عدد المجموعات الكاملة
      const remainingItems = item.quantity % setSize; // الحبات المتبقية خارج العرض
      
      const billableQuantity = (numSets * buyQty) + remainingItems;
      return billableQuantity * item.price;
    }
    return item.quantity * item.price;
  };

  // ✅ حسابات المالية المحدثة لتشمل العروض
  const financialTotals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [cart]);

  const { subtotal, tax, total } = financialTotals;

  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter(o => 
      o.customerName === currentUser.company || 
      o.customerName === currentUser.displayName
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, currentUser]);

  const handleConfirmAndWhatsApp = async () => {
    if (cart.length === 0) return;

    const tempOrderId = Math.floor(100000 + Math.random() * 900000);
    let message = `*🧾 طلب توريد جديد: #${tempOrderId}*\n`;
    message += `--------------------------------\n`;
    message += `*🏢 العميل:* ${currentUser?.company || currentUser?.displayName || 'عميل مسجل'}\n`;
    message += `*📅 التاريخ:* ${new Date().toLocaleDateString('ar-SA')}\n\n`;
    
    cart.forEach((item, index) => {
      const itemFinalPrice = calculateItemTotal(item);
      message += `*${index + 1}. ${item.name}*\n`;
      if (item.barcode) message += `🏷️ باركود: \`${item.barcode}\` \n`;
      
      // ✅ إضافة تفاصيل العرض في رسالة الواتساب فقط إذا كان المنتج يحتوي على عرض حقيقي
      if (hasValidOffer(item) && item.quantity >= (item.offer.buyQty + item.offer.getQty)) {
        message += `🎁 عرض مطبق: (${item.offer.buyQty} + ${item.offer.getQty})\n`;
      }
      
      message += `الكمية: ${item.quantity} | السعر الصافي: ${formatEnNumber(itemFinalPrice)} ر.س\n\n`;
    });

    message += `*💰 الإجمالي الكلي (شامل الضريبة): ${formatEnNumber(total)} ر.س*`;

    const cleanPhone = SUPPLIER_PHONE.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    try {
      window.open(whatsappUrl, '_blank');
      const success = await onPlaceOrder(); 
      if (success) {
        if (currentUser?.email) localStorage.removeItem(`esb2b_cart_${currentUser.email}`);
        setActiveTab('tracking');
      }
    } catch (error) {
      console.error("خطأ:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-32 font-['Cairo']" dir="rtl">
      {/* Tab Switcher */}
      <div className="flex bg-white/40 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-xl mb-12 border border-white/60 max-w-md mx-auto">
        <button onClick={() => setActiveTab('cart')} className={`flex-1 py-4 rounded-[1.8rem] font-black text-xs transition-all duration-500 ${activeTab === 'cart' ? 'bg-navy text-[#feee00] shadow-2xl scale-105' : 'text-gray-400 hover:text-navy'}`}>السلة النشطة</button>
        <button onClick={() => setActiveTab('tracking')} className={`flex-1 py-4 rounded-[1.8rem] font-black text-xs transition-all duration-500 ${activeTab === 'tracking' ? 'bg-navy text-[#feee00] shadow-2xl scale-105' : 'text-gray-400 hover:text-navy'}`}>سجل الطلبات ({myOrders.length})</button>
      </div>

      {activeTab === 'cart' && (
        <div className="flex flex-col lg:flex-row gap-10 animate-fadeIn">
          <div className="flex-[2] space-y-6">
            <h1 className="text-2xl font-black text-navy px-4">المشتريات المختارة ({cart.length})</h1>
            
            {cart.length === 0 ? (
              <div className="bg-white/40 backdrop-blur-xl rounded-[4rem] p-24 text-center border border-white/60">
                <span className="text-6xl mb-6 opacity-20 block">📦</span>
                <p className="text-gray-400 font-black text-lg">السلة فارغة</p>
                <button onClick={onGoBack} className="mt-8 bg-[#feee00] text-navy px-12 py-4 rounded-2xl font-black">تصفح الآن</button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => {
                  const itemHasValidOffer = hasValidOffer(item);
                  const isOfferApplied = itemHasValidOffer && item.quantity >= (item.offer.buyQty + item.offer.getQty);
                  
                  return (
                    <div key={item.id} className="bg-white/40 backdrop-blur-xl p-6 rounded-[3rem] border border-white/60 flex gap-6 shadow-sm group hover:shadow-2xl transition-all duration-500">
                      <div className="w-28 h-28 rounded-[2rem] overflow-hidden bg-white/50 border border-white/40 shadow-inner">
                        <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-black text-navy text-lg">{item.name}</h3>
                            {/* ✅ إظهار شارة العرض تحت اسم المنتج فقط إذا كان لديه عرض حقيقي */}
                            {itemHasValidOffer && (
                              <div className="mt-1">
                                <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full animate-pulse shadow-md">
                                  عرض خاص 🎁: {item.offer.buyQty} + {item.offer.getQty} مجاناً
                                </span>
                              </div>
                            )}
                            <p className="text-[10px] text-gray-400 font-black mt-2 uppercase">المورد: {item.supplier}</p>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-rose-500 text-xl transition-colors">✕</button>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center bg-white/60 rounded-2xl p-1 border border-white/80">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center font-black">-</button>
                            <span className="w-12 text-center font-black text-navy">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center font-black">+</button>
                          </div>
                          <div className="text-left">
                            {/* ✅ السعر المحدث بعد العرض */}
                            <span className="text-xl font-black text-navy">
                              {formatEnNumber(calculateItemTotal(item))} <span className="text-[10px] text-gray-400">ر.س</span>
                            </span>
                            {/* ✅ إظهار السعر الأصلي مشطوباً فقط إذا كان العرض مطبق فعلياً */}
                            {isOfferApplied && (
                              <p className="text-[10px] text-gray-400 line-through text-left">
                                {formatEnNumber(item.price * item.quantity)} ر.س
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Summary */}
          {cart.length > 0 && (
            <div className="flex-1">
              <div className="bg-navy rounded-[4rem] p-10 shadow-2xl sticky top-24 text-white space-y-8 overflow-hidden">
                <h2 className="text-2xl font-black border-b border-white/10 pb-6 relative z-10 text-center">تفاصيل الفاتورة</h2>
                <div className="space-y-4 text-sm font-bold text-gray-400 relative z-10">
                  <div className="flex justify-between"><span>قيمة المنتجات</span><span className="text-white">{formatEnNumber(subtotal)} ر.س</span></div>
                  <div className="flex justify-between"><span>القيمة المضافة (15%)</span><span className="text-white">{formatEnNumber(tax)} ر.س</span></div>
                  <div className="pt-8 border-t border-white/10 flex justify-between items-center text-white">
                    <span className="text-base font-black text-[#feee00]">الإجمالي</span>
                    <span className="text-4xl font-black">{formatEnNumber(total)} <span className="text-xs">ر.س</span></span>
                  </div>
                </div>
                <button onClick={handleConfirmAndWhatsApp} disabled={isSubmitting} className="w-full bg-[#feee00] text-navy py-6 rounded-[2rem] font-black text-sm shadow-2xl flex items-center justify-center gap-3 relative z-10 active:scale-95 transition-all">
                  <span>تأكيد الطلب واتساب</span> <span className="text-2xl">💬</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-navy px-4">سجل الطلبات السابقة</h2>
          {myOrders.length === 0 ? (
            <div className="bg-white/40 backdrop-blur-xl rounded-[4rem] p-24 text-center border border-white/60">
              <span className="text-6xl mb-6 opacity-20 block">📜</span>
              <p className="text-gray-400 font-black text-lg">لا توجد طلبات سابقة</p>
            </div>
          ) : (
            <div className="space-y-6">
              {myOrders.map((order) => (
                <div key={order.id} className="bg-white/40 backdrop-blur-xl p-8 rounded-[3rem] border border-white/60 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase">رقم الطلب</span>
                      <h3 className="text-xl font-black text-navy">#{order.id.toString().slice(-6)}</h3>
                      <p className="text-xs text-gray-400 font-bold">{formatDate(order.date)}</p>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black ${order.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {order.status === 'delivered' ? 'تم التوصيل' : 'قيد الانتظار'}
                    </span>
                  </div>
                  <div className="border-t border-white/60 pt-6 flex justify-between items-center">
                    <span className="text-lg font-black text-navy">{formatEnNumber(order.total)} ر.س</span>
                    <button onClick={() => onReOrder(order.items)} className="bg-navy text-[#feee00] px-6 py-3 rounded-2xl font-black text-xs shadow-lg">إعادة طلب 🔁</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ESB2BCart;