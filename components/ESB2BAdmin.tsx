import React, { useState, useMemo } from 'react';
import { Product, Order, AppUser } from '../types';
import { formatEnNumber, formatDate } from '../App';

interface ESB2BAdminProps {
  products: Product[];
  orders: Order[];
  users: AppUser[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void; // يجب تمرير هذه الدالة من App.tsx
  onAddProduct: (p: Omit<Product, 'id'>) => void;
  onUpdateUser: (id: string, updates: Partial<AppUser>) => void;
  onDeleteUser: (id: string) => void;
  onUpdateOrderStatus: (id: string, status: Order['status']) => void;
  onLogout: () => void;
}

const ESB2BAdmin: React.FC<ESB2BAdminProps> = ({
  products, orders, users, 
  onUpdateProduct, onDeleteProduct, onAddProduct,
  onUpdateUser, onDeleteUser, onUpdateOrderStatus, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'products' | 'users' | 'orders'>('stats');
  const [searchQuery, setSearchQuery] = useState('');

  // إحصائيات المنصة الشاملة [cite: 342]
  const stats = {
    totalSales: orders.reduce((acc, o) => acc + (o.total || 0), 0),
    totalOrders: orders.length,
    totalUsers: users.length,
    totalProducts: products.length
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Cairo']" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 text-white p-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-mint text-navy p-3 rounded-2xl font-black italic">ADMIN</div>
            <h1 className="text-xl font-bold">لوحة التحكم المطلقة - iB2B</h1>
          </div>
          <button onClick={onLogout} className="bg-rose-500 px-6 py-2 rounded-xl text-sm font-bold">خروج</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs [cite: 383] */}
        <nav className="flex gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm border">
          {['stats', 'products', 'users', 'orders'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                activeTab === tab ? 'bg-slate-900 text-white' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              {tab === 'stats' ? '📊 نظرة عامة' : tab === 'products' ? '📦 المنتجات' : tab === 'users' ? '👥 المستخدمين' : '🧾 الطلبات'}
            </button>
          ))}
        </nav>

        {/* 1. التبويب: نظرة عامة [cite: 386] */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100">
              <p className="text-xs text-gray-400 font-bold">إجمالي المبيعات</p>
              <h2 className="text-2xl font-black text-emerald-600">{formatEnNumber(stats.totalSales)} ر.س</h2>
            </div>
            {/* أضف باقي الكروت هنا بنفس النمط */}
          </div>
        )}

        {/* 2. التبويب: إدارة المنتجات (Master Product Control) [cite: 406, 419] */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-[10px] font-black">
                <tr>
                  <th className="p-4">المنتج</th>
                  <th className="p-4">المورد</th>
                  <th className="p-4">السعر</th>
                  <th className="p-4">الترتيب</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold">{p.name}</td>
                    <td className="p-4 text-gray-500">{p.supplier}</td>
                    <td className="p-4 text-emerald-600 font-black">{p.price} ر.س</td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        defaultValue={(p as any).sortOrder || 0}
                        onBlur={(e) => onUpdateProduct(p.id, { sortOrder: parseInt(e.target.value) } as any)}
                        className="w-16 border rounded p-1 text-center"
                      />
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      <button onClick={() => onDeleteProduct(p.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">🗑️ حذف</button>
                      <button className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg">✏️ تعديل</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. التبويب: إدارة المستخدمين (كامل المنصة) [cite: 297, 348] */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {users.map(user => (
              <div key={user.id} className="bg-white p-6 rounded-[2rem] shadow-sm border relative">
                <div className="absolute top-4 left-4">
                  <span className={`text-[8px] font-black px-3 py-1 rounded-full ${user.role === 'seller' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {user.role === 'seller' ? 'مورد' : 'مشتري'}
                  </span>
                </div>
                <h3 className="font-black text-navy">{user.company}</h3>
                <p className="text-[10px] text-gray-400 mb-4">{user.displayName}</p>
                
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => onUpdateUser(user.id, { status: user.status === 'active' ? 'suspended' : 'active' })}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black ${user.status === 'active' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}
                  >
                    {user.status === 'active' ? 'تعطيل الحساب' : 'تنشيط الحساب'}
                  </button>
                  <button onClick={() => onDeleteUser(user.id)} className="bg-gray-100 text-gray-400 p-2 rounded-xl hover:bg-rose-500 hover:text-white transition-all">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. التبويب: الطلبات الشاملة [cite: 422, 440] */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
             <table className="w-full text-right">
                <thead className="bg-slate-900 text-white text-[10px]">
                  <tr>
                    <th className="p-4">رقم الطلب</th>
                    <th className="p-4">العميل</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td className="p-4 font-mono">#{o.id.substring(0,8)}</td>
                      <td className="p-4 font-bold">{o.customerName}</td>
                      <td className="p-4">
                        <select 
                          value={o.status}
                          onChange={(e) => onUpdateOrderStatus(o.id, e.target.value as any)}
                          className="border rounded-full px-3 py-1 text-[10px] font-black"
                        >
                          <option value="pending">قيد المراجعة</option>
                          <option value="processing">جاري التجهيز</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>
                      <td className="p-4 font-black">{formatEnNumber(o.total)} ر.س</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ESB2BAdmin;