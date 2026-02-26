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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [groupedCart, setGroupedCart] = useState<Map<string, CartItem[]>>(new Map());

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

  // تجميع منتجات السلة حسب المورد (للعرض المنفصل) مع تنسيق الأسماء
  useEffect(() => {
    const grouped = new Map<string, CartItem[]>();
    cart.forEach(item => {
      // تنسيق اسم المورد للعرض
      let supplierDisplayName = item.supplier || '';
      
      if (!supplierDisplayName && item.supplierId) {
        supplierDisplayName = `مورد (${item.supplierId.substring(0, 4)}...)`;
      } else if (!supplierDisplayName) {
        supplierDisplayName = 'مورد غير معروف';
      }
      
      if (!grouped.has(supplierDisplayName)) {
        grouped.set(supplierDisplayName, []);
      }
      grouped.get(supplierDisplayName)?.push(item);
    });
    setGroupedCart(grouped);
  }, [cart]);

  // ✅ دالة حساب إجمالي المنتج مع مراعاة العروض
  const calculateItemTotal = (item: CartItem) => {
    // السعر الأساسي × الكمية
    let baseTotal = item.price * item.quantity;
    
    // تطبيق العرض إذا كان موجوداً
    if (item.offer && item.offer.type === 'buy_x_get_y') {
      const { buyQty, getQty } = item.offer;
      if (buyQty && getQty && buyQty > 0) {
        const setSize = buyQty + getQty;
        const numSets = Math.floor(item.quantity / setSize);
        const remainingItems = item.quantity % setSize;
        const billableQuantity = (numSets * buyQty) + remainingItems;
        baseTotal = billableQuantity * item.price;
      }
    }
    
    // تطبيق الخصم المئوي إذا كان موجوداً
    if (item.discount && item.discount > 0) {
      baseTotal = baseTotal * (1 - item.discount / 100);
    }
    
    return baseTotal;
  };

  // ✅ حساب المجموع الكلي للسلة (بدون ضريبة)
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  }, [cart]);

  // ✅ حساب الضريبة (15%)
  const tax = subtotal * 0.15;

  // ✅ الإجمالي النهائي (المجموع + الضريبة)
  const total = subtotal + tax;

  // حساب المجاميع لكل مورد على حدة
  const supplierTotals = useMemo(() => {
    const totals = new Map<string, { subtotal: number; tax: number; total: number; items: number }>();
    
    groupedCart.forEach((items, supplier) => {
      const supplierSubtotal = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
      const supplierTax = supplierSubtotal * 0.15;
      const supplierTotal = supplierSubtotal + supplierTax;
      
      totals.set(supplier, {
        subtotal: supplierSubtotal,
        tax: supplierTax,
        total: supplierTotal,
        items: items.length
      });
    });
    
    return totals;
  }, [groupedCart]);

  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter(o => {
      const orderCust = String(o.customerName || '').trim().toLowerCase();
      const userComp = String(currentUser.company || '').trim().toLowerCase();
      const userDisp = String(currentUser.displayName || '').trim().toLowerCase();
      const userEmail = String(currentUser.email || '').trim().toLowerCase();
      const orderEmail = String((o as any).customerEmail || '').trim().toLowerCase();
      return (
        (userComp && orderCust === userComp) || 
        (userDisp && orderCust === userDisp) ||
        (userEmail && orderEmail === userEmail) ||
        (o.customerId === currentUser.id) ||
        (o.userId === currentUser.id) ||
        (o.userId === (currentUser as any).uid)
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, currentUser]);

  const handleConfirmAndWhatsApp = async () => {
    if (cart.length === 0) return;
    const tempOrderId = Math.floor(100000 + Math.random() * 900000);
    
    // إنشاء رسالة واتساب متعددة الموردين
    let message = `*🧾 طلب توريد جديد: #${tempOrderId}*\n`;
    message += `--------------------------------\n`;
    message += `*🏢 العميل:* ${currentUser?.company || currentUser?.displayName || 'عميل مسجل'}\n`;
    message += `*📅 التاريخ:* ${new Date().toLocaleDateString('ar-SA')}\n\n`;
    
    // تجميع المنتجات حسب المورد في الرسالة
    groupedCart.forEach((items, supplier) => {
      message += `*📦 ${supplier}*\n`;
      message += `----------------\n`;
      
      items.forEach((item, index) => {
        const itemTotal = calculateItemTotal(item);
        message += `${index + 1}. *${item.name}*\n`;
        if (item.barcode) message += `🏷️ باركود: \`${item.barcode}\` \n`;
        if (item.offer && item.quantity >= (item.offer.buyQty + item.offer.getQty)) {
          message += `🎁 عرض مطبق: (${item.offer.buyQty} + ${item.offer.getQty})\n`;
        }
        if (item.discount && item.discount > 0) {
          message += `💰 خصم ${item.discount}%\n`;
        }
        message += `الكمية: ${item.quantity} | السعر: ${formatEnNumber(item.price)} ج.م\n`;
        message += `الإجمالي: ${formatEnNumber(itemTotal.toFixed(2))} ج.م\n\n`;
      });
      
      const supplierTotal = supplierTotals.get(supplier)?.total || 0;
      message += `*💰 إجمالي ${supplier} (شامل الضريبة): ${formatEnNumber(supplierTotal.toFixed(2))} ج.م*\n\n`;
    });

    message += `--------------------------------\n`;
    message += `*💵 المجموع قبل الضريبة: ${formatEnNumber(subtotal.toFixed(2))} ج.م*\n`;
    message += `*💰 ضريبة القيمة المضافة (15%): ${formatEnNumber(tax.toFixed(2))} ج.م*\n`;
    message += `*💳 الإجمالي الكلي النهائي: ${formatEnNumber(total.toFixed(2))} ج.م*`;
    
    const cleanPhone = SUPPLIER_PHONE.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    try {
      window.open(whatsappUrl, '_blank');
      const success = await onPlaceOrder(); 
      if (success) {
        if (currentUser?.email) localStorage.removeItem(`esb2b_cart_${currentUser.email}`);
        setActiveTab('tracking');
      }
    } catch (error) { console.error("خطأ:", error); }
  };

  // دالة لتنسيق اسم المورد للعرض
  const formatSupplierName = (supplier: string): string => {
    if (supplier.includes('مورد (') || (supplier.length > 20 && !supplier.includes(' '))) {
      const shortId = supplier.replace('مورد (', '').replace(')', '').substring(0, 4);
      return `مورد (${shortId})`;
    }
    return supplier;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-32 font-['Cairo']" dir="rtl">
      {/* Tab Switcher */}
      <div className="flex bg-white/40 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-xl mb-12 border border-white/60 max-w-md mx-auto">
        <button 
          onClick={() => setActiveTab('cart')} 
          className={`flex-1 py-4 rounded-[1.8rem] font-black text-xs transition-all duration-500 ${
            activeTab === 'cart' ? 'bg-navy text-[#feee00] shadow-2xl scale-105' : 'text-gray-400 hover:text-navy'
          }`}
        >
          السلة النشطة ({cart.length})
        </button>
        <button 
          onClick={() => setActiveTab('tracking')} 
          className={`flex-1 py-4 rounded-[1.8rem] font-black text-xs transition-all duration-500 ${
            activeTab === 'tracking' ? 'bg-navy text-[#feee00] shadow-2xl scale-105' : 'text-gray-400 hover:text-navy'
          }`}
        >
          سجل الطلبات ({myOrders.length})
        </button>
      </div>

      {activeTab === 'cart' && (
        <div className="flex flex-col lg:flex-row gap-10 animate-fadeIn">
          <div className="flex-2 space-y-6">
            <h1 className="text-2xl font-black text-navy px-4">المشتريات المختارة ({cart.length})</h1>
            
            {cart.length === 0 ? (
              <div className="bg-white/40 backdrop-blur-xl rounded-[4rem] p-24 text-center border border-white/60">
                <span className="text-6xl mb-6 opacity-20 block">📦</span>
                <p className="text-gray-400 font-black text-lg">السلة فارغة</p>
                <button onClick={onGoBack} className="mt-8 bg-[#feee00] text-navy px-12 py-4 rounded-2xl font-black">تصفح الآن</button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* عرض المنتجات مجمعة حسب المورد */}
                {Array.from(groupedCart.entries()).map(([supplier, items]) => {
                  const supplierDisplayName = formatSupplierName(supplier);
                  
                  return (
                    <div key={supplier} className="space-y-4">
                      <div className="flex items-center gap-2 px-4">
                        <h2 className="text-lg font-black text-navy">{supplierDisplayName}</h2>
                        <span className="bg-navy/10 text-navy px-3 py-1 rounded-full text-[10px] font-black">
                          {items.length} {items.length === 1 ? 'منتج' : 'منتجات'}
                        </span>
                      </div>
                      
                      {items.map(item => {
                        const itemTotal = calculateItemTotal(item);
                        const unitPrice = item.price;
                        
                        return (
                          <div key={item.id} className="bg-white/40 backdrop-blur-xl p-6 rounded-[3rem] border border-white/60 flex gap-6 shadow-sm group hover:shadow-2xl transition-all duration-500">
                            <div className="w-28 h-28 rounded-[2rem] overflow-hidden bg-white/50 border border-white/40 shadow-inner">
                              <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-black text-navy text-lg">{item.name}</h3>
                                  
                                  {/* عرض العروض والخصومات */}
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {item.offer && item.offer.buyQty > 0 && item.offer.getQty > 0 && (
                                      <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full">
                                        عرض {item.offer.buyQty} + {item.offer.getQty} 🎁
                                      </span>
                                    )}
                                    {item.discount && item.discount > 0 && (
                                      <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-full">
                                        خصم {item.discount}%
                                      </span>
                                    )}
                                  </div>
                                  
                                  <p className="text-[10px] text-gray-400 font-black mt-2 uppercase">
                                    المورد: {item.supplier || (item.supplierId ? `مورد (${item.supplierId.substring(0, 4)}...)` : 'غير محدد')}
                                  </p>
                                  {item.barcode && (
                                    <p className="text-[8px] text-gray-300 font-mono">باركود: {item.barcode}</p>
                                  )}
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
                                  {/* سعر الوحدة */}
                                  <p className="text-[10px] text-gray-400">سعر الوحدة: {formatEnNumber(unitPrice)} ج.م</p>
                                  
                                  {/* إجمالي المنتج قبل الضريبة */}
                                  <span className="text-xl font-black text-navy">
                                    {formatEnNumber(itemTotal.toFixed(2))} <span className="text-[10px] text-gray-400">ج.م</span>
                                  </span>
                                  
                                  {/* عرض السعر قبل الخصم إذا كان هناك خصم */}
                                  {item.discount && item.discount > 0 && (
                                    <p className="text-[8px] text-gray-400 line-through">
                                      {formatEnNumber((item.price * item.quantity).toFixed(2))} ج.م
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* إجمالي المورد (مع تفاصيل الضريبة) */}
                      <div className="bg-navy/5 mx-4 p-4 rounded-2xl border border-navy/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-black text-navy">إجمالي {supplierDisplayName} قبل الضريبة:</span>
                          <span className="font-black text-navy">
                            {formatEnNumber(supplierTotals.get(supplier)?.subtotal.toFixed(2) || '0')} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                          <span>الضريبة (15%):</span>
                          <span>{formatEnNumber(supplierTotals.get(supplier)?.tax.toFixed(2) || '0')} ج.م</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-black text-emerald-600 mt-2 pt-2 border-t border-navy/10">
                          <span>الإجمالي شامل الضريبة:</span>
                          <span>{formatEnNumber(supplierTotals.get(supplier)?.total.toFixed(2) || '0')} ج.م</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {cart.length > 0 && (
            <div className="flex-1">
              <div className="bg-navy rounded-[4rem] p-10 shadow-2xl sticky top-24 text-white space-y-8 overflow-hidden">
                <h2 className="text-2xl font-black border-b border-white/10 pb-6 relative z-10 text-center">تفاصيل الفاتورة</h2>
                
                {/* عرض إجماليات كل مورد */}
                <div className="space-y-4 relative z-10">
                  {Array.from(supplierTotals.entries()).map(([supplier, totals]) => {
                    const supplierDisplayName = formatSupplierName(supplier);
                    
                    return (
                      <div key={supplier} className="border-b border-white/10 pb-3">
                        <p className="text-[10px] text-gray-400 font-black mb-1">{supplierDisplayName}</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">المجموع الفرعي:</span>
                          <span className="text-white">{formatEnNumber(totals.subtotal.toFixed(2))} ج.م</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-400">الضريبة (15%):</span>
                          <span className="text-white">{formatEnNumber(totals.tax.toFixed(2))} ج.م</span>
                        </div>
                        <div className="flex justify-between text-sm font-black mt-1">
                          <span className="text-[#feee00]">الإجمالي شامل الضريبة:</span>
                          <span className="text-[#feee00]">{formatEnNumber(totals.total.toFixed(2))} ج.م</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* الإجمالي الكلي */}
                <div className="pt-4 border-t border-white/10 relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">المجموع الكلي قبل الضريبة:</span>
                    <span className="text-white">{formatEnNumber(subtotal.toFixed(2))} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-400">إجمالي الضريبة (15%):</span>
                    <span className="text-white">{formatEnNumber(tax.toFixed(2))} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black text-[#feee00]">الإجمالي الكلي النهائي:</span>
                    <span className="text-3xl font-black text-[#feee00]">
                      {formatEnNumber(total.toFixed(2))} <span className="text-xs">ج.م</span>
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleConfirmAndWhatsApp} 
                  disabled={isSubmitting} 
                  className="w-full bg-[#feee00] text-navy py-6 rounded-[2rem] font-black text-sm shadow-2xl flex items-center justify-center gap-3 relative z-10 active:scale-95 transition-all"
                >
                  <span>تأكيد وإرسال الطلب</span> 
                  <span className="text-2xl">💬</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tracking' && (
         <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
            {myOrders.length === 0 ? (
              <div className="text-center py-20 opacity-50">لا يوجد طلبات سابقة لهذا الحساب</div>
            ) : (
              myOrders.map(order => {
                // تجميع منتجات الطلب حسب المورد للعرض
                const orderItemsBySupplier = new Map<string, any[]>();
                order.items.forEach(item => {
                  const supplier = item.supplier || 'مورد غير معروف';
                  if (!orderItemsBySupplier.has(supplier)) {
                    orderItemsBySupplier.set(supplier, []);
                  }
                  orderItemsBySupplier.get(supplier)?.push(item);
                });

                return (
                  <div key={order.id} className="bg-white/40 p-6 rounded-[2.5rem] border border-white/60 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-black text-navy">طلب #{order.id.slice(-6).toUpperCase()}</span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-600' : 
                            order.status === 'cancelled' ? 'bg-rose-100 text-rose-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {order.status === 'delivered' ? '✅ تم التوصيل' : 
                             order.status === 'cancelled' ? '🚫 ملغي' : 
                             '⏳ قيد التنفيذ'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold tracking-wider">{formatDate(order.date)}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-left">
                          <p className="text-[10px] text-gray-400 font-black">إجمالي الفاتورة</p>
                          <p className="font-black text-navy text-lg">{formatEnNumber(Number(order.total).toFixed(2))} <span className="text-xs">ج.م</span></p>
                          <p className="text-[8px] text-gray-400">شامل الضريبة</p>
                        </div>
                        <button onClick={() => setSelectedOrder(order)} className="bg-navy text-[#feee00] px-6 py-3 rounded-2xl font-black text-xs hover:scale-105 transition-transform">
                          تفاصيل الفاتورة
                        </button>
                      </div>
                    </div>

                    {/* عرض مختصر للمنتجات حسب المورد */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {Array.from(orderItemsBySupplier.entries()).map(([supplier, items]) => (
                        <div key={supplier} className="mb-3 last:mb-0">
                          <p className="text-[10px] font-black text-gray-400 mb-1">{supplier}</p>
                          <div className="flex flex-wrap gap-2">
                            {items.slice(0, 3).map((item, idx) => (
                              <span key={idx} className="bg-gray-100 text-navy px-2 py-1 rounded-lg text-[8px] font-black">
                                {item.productName} x{item.quantity}
                              </span>
                            ))}
                            {items.length > 3 && (
                              <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-lg text-[8px] font-black">
                                +{items.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
         </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl relative animate-slideUp">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-6 left-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black z-20 hover:bg-gray-200 transition-colors">
              ✕
            </button>
            <div className="p-8 md:p-12 overflow-y-auto max-h-[85vh]">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-black text-navy mb-2">تفاصيل الفاتورة</h2>
                <p className="text-gray-400 font-bold">طلب رقم #{selectedOrder.id.slice(-6).toUpperCase()}</p>
              </div>
              
              {/* تجميع المنتجات حسب المورد في التفاصيل */}
              <div className="space-y-6 mb-10">
                {(() => {
                  const itemsBySupplier = new Map<string, any[]>();
                  selectedOrder.items.forEach(item => {
                    const supplier = item.supplier || 'مورد غير معروف';
                    if (!itemsBySupplier.has(supplier)) {
                      itemsBySupplier.set(supplier, []);
                    }
                    itemsBySupplier.get(supplier)?.push(item);
                  });

                  return Array.from(itemsBySupplier.entries()).map(([supplier, items]) => (
                    <div key={supplier}>
                      <h3 className="text-sm font-black text-navy mb-3 border-b pb-2">{supplier}</h3>
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-2">
                          <div className="flex items-center gap-4">
                            <span className="w-8 h-8 bg-navy text-[#feee00] rounded-full flex items-center justify-center text-[10px] font-black">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-black text-navy text-sm">{item.productName || item.name}</p>
                              <p className="text-[10px] text-gray-400 font-black">
                                الكمية: {item.quantity} | سعر الوحدة: {formatEnNumber(item.price)} ج.م
                              </p>
                              {item.barcode && (
                                <p className="text-[8px] text-gray-300">باركود: {item.barcode}</p>
                              )}
                            </div>
                          </div>
                          <p className="font-black text-navy text-sm">
                            {formatEnNumber((item.price * (item.quantity || 1)).toFixed(2))} ج.م
                          </p>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>

              {/* ✅ قسم الإجماليات المصحح */}
              <div className="bg-navy rounded-[2.5rem] p-8 text-white">
                {(() => {
                  // حساب المجموع الفرعي الحقيقي من items
                  const calculatedSubtotal = selectedOrder.items.reduce((sum, item) => {
                    return sum + ((item.price || 0) * (item.quantity || 1));
                  }, 0);
                  
                  // الضريبة المحسوبة
                  const calculatedTax = calculatedSubtotal * 0.15;
                  
                  // الإجمالي الكلي = المجموع الفرعي + الضريبة
                  const calculatedTotal = calculatedSubtotal + calculatedTax;
                  
                  return (
                    <>
                      <div className="flex justify-between mb-4 text-sm opacity-60 font-bold">
                        <span>المجموع الفرعي (قبل الضريبة)</span>
                        <span>{formatEnNumber(calculatedSubtotal.toFixed(2))} ج.م</span>
                      </div>
                      <div className="flex justify-between mb-6 text-sm opacity-60 font-bold">
                        <span>ضريبة القيمة المضافة (15%)</span>
                        <span>{formatEnNumber(calculatedTax.toFixed(2))} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/10 pt-6">
                        <span className="font-black text-[#feee00]">الإجمالي الكلي (شامل الضريبة)</span>
                        <span className="text-3xl font-black">{formatEnNumber(calculatedTotal.toFixed(2))} ج.م</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              <button 
                onClick={() => { 
                  onReOrder(selectedOrder.items); 
                  setSelectedOrder(null);
                  setActiveTab('cart');
                }} 
                className="w-full mt-6 bg-gray-100 text-navy py-5 rounded-2xl font-black text-sm hover:bg-[#feee00] transition-colors"
              >
                إعادة طلب هذه المنتجات 🔁
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      `}</style>
    </div>
  );
};

export default ESB2BCart;