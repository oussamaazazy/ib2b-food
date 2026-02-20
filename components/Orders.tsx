
import React from 'react';
import { Product } from '../types';

interface CartItem extends Product {
  quantity: number;
}

interface OrdersProps {
  cart: CartItem[];
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, q: number) => void;
}

const Orders: React.FC<OrdersProps> = ({ cart, removeFromCart, updateQuantity }) => {
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (cart.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">مسودة طلبك فارغة</h2>
        <p className="text-gray-500">قم بإضافة منتجات من صفحة المنتجات لإنشاء طلب جملة جديد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">مراجعة طلب الجملة</h1>
        <p className="text-sm text-gray-500">لديك {cart.length} أصناف في المسودة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm">
              <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{item.name}</h3>
                <p className="text-xs text-gray-500">{item.supplier}</p>
                <p className="text-blue-600 font-bold mt-1">{item.price.toLocaleString()} ج.م / وحدة</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-3 py-1 hover:bg-gray-50 text-gray-500"
                  >-</button>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                    className="w-12 text-center border-x text-sm font-bold outline-none"
                  />
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="px-3 py-1 hover:bg-gray-50 text-gray-500"
                  >+</button>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit sticky top-24">
          <h3 className="font-bold text-lg mb-6 pb-4 border-b">ملخص الطلب</h3>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">إجمالي الوحدات</span>
              <span className="font-bold">{cart.reduce((acc, i) => acc + i.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>رسوم التوصيل المقدرة</span>
              <span>يحدد لاحقاً</span>
            </div>
            <div className="pt-4 border-t flex justify-between items-center">
              <span className="font-bold">الإجمالي المبدئي</span>
              <span className="text-2xl font-black text-blue-700">{total.toLocaleString()} ج.م</span>
            </div>
          </div>
          <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
            إرسال طلب عرض السعر
          </button>
          <p className="text-[10px] text-gray-400 mt-4 text-center leading-relaxed">
            بضغطك على إرسال، سيتم إخطار الموردين بطلبك وسيقومون بالتواصل معك لتأكيد الشحن وطرق الدفع.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Orders;
