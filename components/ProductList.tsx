import React, { useState } from 'react';
import { Product } from '../types';

interface ProductListProps {
  products: Product[]; // أضفنا هذا السطر لاستقبال المنتجات الحقيقية
  onAddToCart: (p: Product) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, onAddToCart }) => {
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('الكل');
  const [addedId, setAddedId] = useState<string | null>(null);

  // استخدام products القادمة من Props بدلاً من MOCK_PRODUCTS
  const categories = ['الكل', ...new Set(products.map(p => p.category))];

  const filteredProducts = products
    .filter(p => {
      const query = filter.trim().toLowerCase();
      const matchesFilter = 
        (p.name || '').toLowerCase().includes(query) || 
        (p.description || '').toLowerCase().includes(query);
        
      const matchesCategory = category === 'الكل' || p.category === category;
      return matchesFilter && matchesCategory;
    })
    // --- أضف جزء الترتيب هنا ---
    .sort((a, b) => {
      const orderA = a.sortOrder ?? 999; // القيمة الافتراضية إذا لم يوجد ترتيب
      const orderB = b.sortOrder ?? 999;
      return orderA - orderB; // الترتيب تصاعدي (1 يظهر قبل 2)
    });

  const handleAdd = (product: Product) => {
    onAddToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">تصفح المنتجات</h1>
        <div className="flex flex-1 max-w-2xl gap-2">
          <input
            type="text"
            placeholder="ابحث عن منتج، مورد، أو وصف..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select 
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts
  .slice() // نأخذ نسخة لضمان عدم تغيير مصفوفة المنتجات الأصلية
  .sort((a, b) => {
    // الترتيب: الرقم الأصغر في sortOrder يظهر أولاً
    // إذا لم يوجد رقم ترتيب نعتبره 999 (يظهر في الأخير)
    const orderA = a.sortOrder ?? 999;
    const orderB = b.sortOrder ?? 999;
    return orderA - orderB;
  })
  .map((product) => (
    <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* باقي كود عرض الكارد الخاص بك كما هو بدون تغيير */}
      <div className="h-48 relative overflow-hidden group">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
              <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {product.category}
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">{product.supplier}</p>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{product.name}</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
                {product.description}
              </p>
              
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">سعر الوحدة</p>
                  <p className="text-xl font-black text-blue-700">{product.price.toLocaleString()} ر.س</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500 text-right">أقل كمية</p>
                  <p className="text-sm font-bold text-gray-900">{product.minOrderQuantity} وحدة</p>
                </div>
              </div>
              
              <button 
                onClick={() => handleAdd(product)}
                className={`w-full py-3 rounded-lg font-bold transition-all active:transform active:scale-95 ${
                  addedId === product.id 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {addedId === product.id ? '✅ تم الإضافة' : 'إضافة لطلب الجملة'}
              </button>
            </div>
            
            <div className="px-5 py-3 border-t bg-gray-50/50 flex justify-between items-center text-xs">
              <span className="text-green-600 font-medium">● متوفر: {product.stock}</span>
              <button className="text-blue-600 hover:underline">طلب عينة</button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500 text-lg">لم يتم العثور على منتجات تطابق بحثك.</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;