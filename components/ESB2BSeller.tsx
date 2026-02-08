import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { SUPPLIER_PHONE } from "../constants";

import * as XLSX from 'xlsx';
import React, { useState, useRef, useMemo } from 'react';
import { Product, Order, AppUser, Notification } from '../types';
import { formatEnNumber, formatDate } from '../App';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_STATS, CUSTOMER_PHONE } from '../constants';
// import ScannerModal from './ScannerModal';

interface ESB2BSellerProps {
  products: Product[];
  orders: Order[];
  users?: AppUser[];
  notifications?: Notification[];
  currentUser: AppUser | null;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onAddProduct: (p: Omit<Product, 'id'>) => void;
  onUpdateOrderStatus: (id: string, status: Order['status']) => void;
  onAddUser: (u: Omit<AppUser, 'id'>) => void;
  onUpdateUser: (id: string, updates: Partial<AppUser>) => void;
  onDeleteUser: (id: string) => void;
  onLogout: () => void;
  lang?: 'ar' | 'en';
}

const ESB2BSeller: React.FC<ESB2BSellerProps> = ({ 
  products = [], orders = [], users = [], notifications = [], currentUser, 
  onUpdateProduct, onAddProduct, onUpdateOrderStatus, onAddUser, onUpdateUser, onDeleteUser, onLogout, lang = 'ar' 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'orders' | 'customers' | 'offers'>('overview');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);

  const initialProductForm: Omit<Product, 'id'> = {
    name: '', category: '', price: 0, stock: 0, description: '', supplier: currentUser?.company || '',
    imageUrl: '', isActive: true, barcode: '', expiryDate: '', 
    offer: { buyQty: 0, getQty: 0, type: 'buy_x_get_y' }, discount: 0,
  };

  const [productForm, setProductForm] = useState<any>(initialProductForm);

  const initialUserForm: Omit<AppUser, 'id'> = {
    company: '', displayName: '', phone: '', email: '', username: '', password: '', 
    role: 'buyer', status: 'active', logoUrl: ''
  };
  const [userFormData, setUserFormData] = useState(initialUserForm);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const brandFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const userPhotoInputRef = useRef<HTMLInputElement>(null);

  const [imageChangeId, setImageChangeId] = useState<string | null>(null);
  const [activeBrandEditCat, setActiveBrandEditCat] = useState<string | null>(null);

  // تحسين الإحصائيات مع ألوان متسقة
  const stats = [
    { 
      label: 'إجمالي المبيعات', 
      value: orders.reduce((acc, o) => acc + (o.total || 0), 0), 
      unit: 'ر.س', 
      icon: '💰', 
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      textColor: 'text-blue-100'
    },
    { 
      label: 'طلبات جديدة', 
      value: orders.filter(o => o.status === 'pending').length, 
      unit: 'طلب', 
      icon: '🔔', 
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-100'
    },
    { 
      label: 'العملاء النشطين', 
      value: (users || []).filter(u => u.role === 'buyer').length, 
      unit: 'عميل', 
      icon: '👥', 
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      textColor: 'text-indigo-100'
    },
    { 
      label: 'الأصناف المتاحة', 
      value: products.length, 
      unit: 'صنف', 
      icon: '📦', 
      color: 'bg-gradient-to-br from-slate-700 to-slate-800',
      textColor: 'text-slate-100'
    },
  ];

  const categoriesGrid = useMemo(() => {
    const catsMap: Record<string, string> = {};
    products.forEach(p => {
      if (p.category && !catsMap[p.category]) {
        catsMap[p.category] = p.brandImage || p.imageUrl || '';
      }
    });
    return Object.entries(catsMap).map(([name, icon]) => ({ name, icon }));
  }, [products]);

  const handleToggleVisibility = (p: Product) => {
    onUpdateProduct(p.id, { isActive: !p.isActive });
  };

  const handleEditProduct = (p: Product) => {
    setEditingId(p.id);
    setProductForm({
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      description: p.description || '',
      supplier: p.supplier || (currentUser?.company || ''),
      imageUrl: p.imageUrl || '',
      isActive: p.isActive !== false,
      barcode: p.barcode || '',
      expiryDate: p.expiryDate || '',
      discount: p.discount || 0,
      offer: p.offer || { buyQty: 0, getQty: 0, type: 'buy_x_get_y' },
      sortOrder: (p as any).sortOrder || 0,
    });
    setTempStock(p.stock.toString());
    setIsProductModalOpen(true);
  };

  const handleEditCustomer = (user: AppUser) => {
    setEditingUserId(user.id);
    setUserFormData({
      company: user.company || '',
      displayName: user.displayName || '',
      phone: user.phone || '',
      email: user.email || '',
      username: user.username || '',
      password: user.password || '',
      role: 'buyer',
      status: user.status || 'active',
      logoUrl: user.logoUrl || ''
    });
    setIsCustomerModalOpen(true);
  };

  const handleAddProductClick = () => {
    setEditingId(null);
    setProductForm({ ...initialProductForm, sortOrder: 0 });
    setTempStock('0');
    setIsProductModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'modal' | 'list' | 'brand' | 'user') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (target === 'list' && imageChangeId) {
          onUpdateProduct(imageChangeId, { imageUrl: result });
          setImageChangeId(null);
        } else if (target === 'modal') {
          setProductForm((prev: any) => ({ ...prev, imageUrl: result }));
        } else if (target === 'brand' && activeBrandEditCat) {
          products.forEach(p => {
            if (p.category === activeBrandEditCat) {
              onUpdateProduct(p.id, { brandImage: result });
            }
          });
          setActiveBrandEditCat(null);
        } else if (target === 'user') {
          setUserFormData(prev => ({ ...prev, logoUrl: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalProductData = {
      ...productForm,
      price: Number(productForm.price) || 0,
      stock: Number(productForm.stock) || 0,
      discount: Number(productForm.discount || 0),
    };

    if (editingId) {
      onUpdateProduct(editingId, finalProductData);
    } else {
      onAddProduct(finalProductData);
    }
    
    setIsProductModalOpen(false);
    setProductForm(initialProductForm);
    setEditingId(null);
  };

  const filteredProducts = useMemo(() => {
    let result = [...products]
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeTab === 'offers') {
      result = result.filter(p => (p.discount && p.discount > 0) || (p.offer && p.offer.buyQty > 0));
    }

    return result.sort((a, b) => {
      const orderA = a.sortOrder ?? 9999;
      const orderB = b.sortOrder ?? 9999;
      return orderA - orderB;
    });
  }, [products, searchQuery, activeTab]);

  const filteredCustomers = useMemo(() => {
    return (users || []).filter(u => 
      u.role === 'buyer' && (
        (u.company || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        (u.displayName || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        (u.phone || '').includes(customerSearchQuery)
      )
    );
  }, [users, customerSearchQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => orderStatusFilter === 'all' ? true : o.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const getCustomerStats = (user: AppUser) => {
    const customerOrders = orders.filter(o => 
      o.customerName === user.company || 
      o.customerName === user.displayName
    );
    const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    return {
      count: customerOrders.length,
      spent: totalSpent,
      lastOrder: customerOrders.length > 0 ? customerOrders[0].date : 'لا يوجد'
    };
  };

  const sendCredentialsWhatsApp = (user: AppUser) => {
    const siteUrl = window.location.origin;
    const message = `*مرحباً ${user.displayName}*\n*بيانات الدخول لمنصة iB2B:*\n\n🔗 الرابط: ${siteUrl}\n👤 اسم المستخدم: ${user.username}\n🔑 كلمة المرور: ${user.password}\n\nنتمنى لك تجربة تسوق ممتعة.`;
    const whatsappUrl = `https://wa.me/${(user.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const sendOrderInvoiceWhatsApp = (order: Order, waPhone: string) => {
    const shortId = order.id.substring(0, 8);
    let message = `*🧾 فاتورة طلب توريد - ES B2B*\n`;
    message += `-----------------------------------\n`;
    message += `*🏢 المورد:* ${currentUser?.company || 'مورد معتمد'}\n`;
    message += `*👤 العميل:* ${order.customerName}\n`;
    message += `*🔢 رقم الطلب:* #${shortId}\n`;
    message += `*📅 التاريخ:* ${formatDate(order.date)}\n`;
    message += `-----------------------------------\n\n`;
    message += `*📦 الأصناف المطلوبة:*\n`;
    
    order.items.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      message += `${index + 1}. *${item.productName}*\n`;
      message += `   السعر: ${formatEnNumber(item.price)} ر.س | الكمية: ${item.quantity}\n`;
      message += `   المجموع: ${formatEnNumber(itemTotal)} ر.س\n`;
    });
    
    message += `\n-----------------------------------\n`;
    message += `*💰 الإجمالي النهائي: ${formatEnNumber(order.total)} ر.س*\n`;
    message += `-----------------------------------\n\n`;
    message += `شكراً لتعاملكم معنا. سيتم إبلاغكم فور تحديث حالة الشحن. ✨`;

    const whatsappUrl = `https://wa.me/${waPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      if (!bstr) return;

      try {
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rawData = XLSX.utils.sheet_to_json(ws);

        let updatedCount = 0;
        let addedCount = 0;

        for (const item of rawData as any[]) {
          const barcode = String(item.barcode || '').trim();
          
          let finalExpiryDate = '';
          if (item.expiryDate) {
            if (item.expiryDate instanceof Date) {
              finalExpiryDate = item.expiryDate.toISOString().split('T')[0];
            } else {
              let dateStr = String(item.expiryDate).trim().replace(/"/g, ''); 
              if (dateStr.includes('-') || dateStr.includes('/')) {
                const separator = dateStr.includes('-') ? '-' : '/';
                const parts = dateStr.split(separator);
                if (parts[0].length <= 2 && parts[2].length === 4) {
                  finalExpiryDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else if (parts[0].length === 4) {
                  finalExpiryDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                }
              }
            }
          }

          const productData = {
            name: item.name || '',
            barcode: barcode,
            price: Number(item.price || 0),
            discount: Number(item.discount || 0), 
            offer: {
              buyQty: Number(item.buyQty || 0),
              getQty: Number(item.getQty || 0),
              type: 'buy_x_get_y'
            },
            category: item.category || 'عام',
            stock: Number(item.stock || 0),
            expiryDate: finalExpiryDate,
            sortOrder: Number(item.sortOrder || 0),
            isActive: true,
            description: item.description || '',
            imageUrl: item.imageUrl || '',
            supplier: currentUser?.company || currentUser?.displayName,
            updatedAt: new Date().toISOString()
          };

          const existingProduct = products.find(p => String(p.barcode).trim() === barcode && barcode !== "");

          if (existingProduct) {
            await onUpdateProduct(existingProduct.id, productData);
            updatedCount++;
          } else {
            await onAddProduct({
              ...productData,
              createdAt: new Date().toISOString()
            });
            addedCount++;
          }
        }
        
        alert(`✅ اكتمل الرفع بنجاح!\n- تم تحديث: ${updatedCount} منتج\n- تم إضافة: ${addedCount} منتج جديد`);
        e.target.value = '';

      } catch (error) {
        console.error("Bulk upload error:", error);
        alert("❌ حدث خطأ في معالجة الملف. تأكد من إغلاق الملف قبل الرفع.");
      }
    };

    reader.readAsBinaryString(file);
  };

  // حساب الإحصائيات الخاصة بالعروض
  const offersStats = useMemo(() => {
    const discountedProducts = products.filter(p => p.discount && p.discount > 0);
    const offerProducts = products.filter(p => p.offer && p.offer.buyQty > 0);
    
    return {
      discountedCount: discountedProducts.length,
      offerCount: offerProducts.length,
      totalOffers: discountedProducts.length + offerProducts.length
    };
  }, [products]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col font-['Cairo'] no-print-bg" dir="rtl">
      {/* Header محسن */}
      <header className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 md:px-12 py-6 shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-400 text-blue-900 rounded-2xl flex items-center justify-center text-3xl shadow-2xl font-black">
              ES
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">لوحة تحكم المورد</h1>
              <p className="text-blue-200 text-sm mt-1">
                {currentUser?.company || 'المنشأة'} • {currentUser?.displayName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsNotifPanelOpen(!isNotifPanelOpen)}
                className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition-all relative group"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-black animate-pulse">
                    {notifications.length}
                  </span>
                )}
                <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  التنبيهات
                </span>
              </button>
              
              {isNotifPanelOpen && (
                <div className="absolute top-16 left-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-[100] text-gray-800 animate-slide-up">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black text-sm flex items-center gap-2">
                      🔔 التنبيهات
                      {notifications.length > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                          {notifications.length} جديد
                        </span>
                      )}
                    </h4>
                    <button 
                      onClick={() => setIsNotifPanelOpen(false)} 
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="text-4xl mb-2">📭</div>
                        <p className="text-sm text-gray-400 font-bold">لا توجد تنبيهات جديدة</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors">
                          <p className="text-xs font-black text-blue-800 mb-1">{n.title}</p>
                          <p className="text-xs text-blue-600">{n.message}</p>
                          <span className="text-[10px] text-blue-400 mt-1 block">{formatDate(n.timestamp || '')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={onLogout} 
              className="bg-gradient-to-r from-rose-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
            >
              <span>🚪</span>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      {/* Navigation محسن */}
      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-8">
        <nav className="flex bg-white p-2 rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-x-auto scrollbar-hide sticky top-24 z-40">
          {[
            { id: 'overview', label: '📊 نظرة عامة', icon: '📊' },
            { id: 'inventory', label: '📦 المخزون', icon: '📦' },
            { id: 'offers', label: '🎁 العروض', icon: '🎁' },
            { id: 'orders', label: '🧾 الطلبات', icon: '🧾' },
            { id: 'customers', label: '👥 العملاء', icon: '👥' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`flex-1 min-w-[140px] flex flex-col items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-[1.02]' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* محتوى التبويبات */}
        <div className="min-h-[600px]">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              {/* بطاقات الإحصائيات المحسنة */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-2xl ${stat.textColor} shadow-md group-hover:scale-110 transition-transform`}>
                        {stat.icon}
                      </div>
                      <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                        اليوم
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 mb-1">
                      {formatEnNumber(stat.value)} <span className="text-sm text-gray-500">{stat.unit}</span>
                    </h3>
                    <p className="text-sm font-bold text-gray-600">{stat.label}</p>
                    <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${stat.color.split(' ')[0]} rounded-full`}
                        style={{ width: `${Math.min(100, (stat.value / (stat.value + 1000)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* مخطط ومعلومات إضافية */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-gray-800">مخطط أداء المبيعات</h3>
                    <select className="text-sm font-bold text-gray-600 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 outline-none">
                      <option>آخر 30 يوم</option>
                      <option>آخر 90 يوم</option>
                      <option>هذه السنة</option>
                    </select>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_STATS}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="month" hide />
                        <YAxis hide />
                        <Tooltip 
                          formatter={(value) => [`${value} ر.س`, 'المبيعات']}
                          labelFormatter={(label) => `الشهر: ${label}`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#4f46e5" 
                          strokeWidth={3}
                          fill="url(#colorSales)" 
                          fillOpacity={0.1}
                        />
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl">
                    <div className="text-4xl mb-4">🚀</div>
                    <h3 className="text-xl font-black mb-2">جاهز للتوسع؟</h3>
                    <p className="text-sm text-blue-100 mb-6">
                      أضف منتجات جديدة وحافظ على تحديث صور العلامات التجارية لزيادة ظهورك للمشترين.
                    </p>
                    <button 
                      onClick={handleAddProductClick}
                      className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all shadow-lg"
                    >
                      + إضافة منتج جديد
                    </button>
                  </div>

                  <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                    <h4 className="font-black text-gray-800 mb-4">نظرة سريعة</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm font-bold text-gray-600">منتجات منخفضة المخزون</span>
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                          {products.filter(p => p.stock <= 5).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm font-bold text-gray-600">طلبات قيد الانتظار</span>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                          {orders.filter(o => o.status === 'pending').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'inventory' || activeTab === 'offers') && (
            <div className="space-y-8 animate-fadeIn">
              {activeTab === 'offers' && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-100 mb-8">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-amber-900 mb-2">🎁 إدارة العروض والخصومات</h2>
                      <p className="text-sm text-amber-700">
                        {offersStats.totalOffers} عرض نشط • {offersStats.discountedCount} خصم • {offersStats.offerCount} عرض كمية
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setActiveTab('inventory')}
                        className="bg-white text-amber-700 border border-amber-200 px-6 py-3 rounded-xl font-bold text-sm hover:bg-amber-50 transition-all"
                      >
                        إدارة المخزون
                      </button>
                      <button 
                        onClick={handleAddProductClick}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                      >
                        + إضافة عرض جديد
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <>
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h2 className="text-2xl font-black text-gray-800">📂 الفئات والعلامات التجارية</h2>
                        <p className="text-sm text-gray-500 mt-1">إدارة صور الفئات للتصنيفات المختلفة</p>
                      </div>
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-2 rounded-xl">
                        {categoriesGrid.length} فئة نشطة
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                      {categoriesGrid.map((cat) => (
                        <div key={cat.name} className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                          <div className="relative w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden">
                            {cat.icon.length > 2 ? (
                              <img src={cat.icon} className="w-full h-full object-cover" alt={cat.name} />
                            ) : (
                              <span className="text-2xl text-gray-400">📁</span>
                            )}
                            <button 
                              onClick={() => { setActiveBrandEditCat(cat.name); brandFileInputRef.current?.click(); }}
                              className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold"
                            >
                              تغيير الصورة
                            </button>
                          </div>
                          <span className="text-xs font-bold text-gray-700 text-center truncate w-full">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                    <input type="file" ref={brandFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'brand')} />
                  </div>

                  {/* أزرار الإضافة والرفع */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div 
                      onClick={handleAddProductClick}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-3xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-white transition-all duration-300 cursor-pointer group"
                    >
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-4xl text-blue-500">➕</span>
                      </div>
                      <h4 className="font-black text-blue-700 text-lg mb-2">إضافة منتج جديد</h4>
                      <p className="text-sm text-blue-600">إدخال البيانات يدوياً للمنتجات الفردية</p>
                      <div className="mt-4 bg-white text-blue-600 px-6 py-2 rounded-xl font-bold text-sm">
                        ابدأ الآن
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-3xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center text-center hover:border-emerald-400 hover:bg-white transition-all duration-300">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                        <span className="text-4xl text-emerald-500">📊</span>
                      </div>
                      <h4 className="font-black text-emerald-700 text-lg mb-2">رفع جماعي عبر Excel</h4>
                      <p className="text-sm text-emerald-600">رفع 100+ منتج بضغطة واحدة</p>
                      <input 
                        type="file" 
                        id="bulk-excel" 
                        className="hidden" 
                        accept=".xlsx, .xls" 
                        onChange={handleBulkUpload} 
                      />
                      <label 
                        htmlFor="bulk-excel" 
                        className="mt-4 bg-white text-emerald-600 px-6 py-2 rounded-xl font-bold text-sm cursor-pointer hover:bg-emerald-50 transition-all shadow-sm"
                      >
                        اختر ملف Excel
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* شريط البحث */}
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full">
                    <input 
                      type="text" 
                      placeholder="ابحث عن منتج بالاسم، الفئة، أو الباركود..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-12 pl-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-sm"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsScannerOpen(true)}
                      className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center text-xl shadow-lg hover:bg-blue-600 transition-all"
                      title="مسح الباركود"
                    >
                      📷
                    </button>
                    <select 
                      value={activeTab === 'offers' ? 'offers' : 'all'}
                      onChange={(e) => e.target.value === 'offers' ? setActiveTab('offers') : null}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    >
                      <option value="all">جميع المنتجات</option>
                      <option value="offers">العروض فقط</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 font-bold">
                  {filteredProducts.length} منتج معروض • {
                    activeTab === 'offers' 
                      ? `${offersStats.totalOffers} عرض نشط` 
                      : `${products.filter(p => p.stock <= 5).length} منتج منخفض المخزون`
                  }
                </div>
              </div>

              {/* شبكة المنتجات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(p => {
                  const isHidden = p.isActive === false;
                  const isLowStock = (p.stock || 0) <= 5;
                  const finalPrice = p.discount ? p.price * (1 - p.discount / 100) : p.price;
                  const hasOffer = p.offer?.buyQty > 0;
                  const hasDiscount = p.discount > 0;

                  return (
                    <div key={p.id} className={`bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 ${isHidden ? 'opacity-60' : ''}`}>
                      {/* شارة العروض والخصومات */}
                      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
                        {hasOffer && (
                          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-lg shadow-lg">
                            <p className="text-xs font-black">{p.offer.buyQty} + {p.offer.getQty} مجاناً</p>
                          </div>
                        )}
                        {hasDiscount && !hasOffer && (
                          <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-3 py-1 rounded-lg shadow-lg">
                            <p className="text-xs font-black">خصم {p.discount}%</p>
                          </div>
                        )}
                      </div>

                      {/* الصورة */}
                      <div className="relative h-48 bg-gray-100 overflow-hidden group">
                        <img 
                          src={p.imageUrl || 'https://via.placeholder.com/400x400/f8fafc/94a3b8?text=No+Image'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          alt={p.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button 
                          onClick={() => { setImageChangeId(p.id); fileInputRef.current?.click(); }}
                          className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                        >
                          تحديث الصورة
                        </button>
                      </div>

                      {/* معلومات المنتج */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                #{p.barcode || 'N/A'}
                              </span>
                              <span className={`w-2 h-2 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`} />
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm line-clamp-2">{p.name}</h4>
                          </div>
                          <div className="text-right">
                            {hasDiscount ? (
                              <>
                                <p className="text-xs line-through text-gray-400">{formatEnNumber(p.price)} ر.س</p>
                                <p className="text-lg font-black text-blue-600">{formatEnNumber(finalPrice)} ر.س</p>
                              </>
                            ) : (
                              <p className="text-lg font-black text-gray-800">{formatEnNumber(p.price)} ر.س</p>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 mb-3">{p.category}</p>

                        {/* المخزون والحالة */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-xs text-gray-500">المخزون</p>
                              <p className={`text-sm font-bold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                {p.stock} وحدة
                              </p>
                            </div>
                            <div className="h-8 w-px bg-gray-200" />
                            <div className="text-center">
                              <p className="text-xs text-gray-500">الحالة</p>
                              <p className={`text-sm font-bold ${isHidden ? 'text-gray-500' : 'text-green-600'}`}>
                                {isHidden ? 'مخفي' : 'نشط'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* الأزرار */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleToggleVisibility(p)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                              isHidden 
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {isHidden ? 'إظهار' : 'إخفاء'}
                          </button>
                          <button 
                            onClick={() => handleEditProduct(p)}
                            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                          >
                            تعديل
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-200">
                  <div className="text-6xl mb-4 opacity-20">📦</div>
                  <h3 className="text-xl font-black text-gray-400 mb-2">لا توجد منتجات</h3>
                  <p className="text-gray-500 mb-6">لم يتم العثور على منتجات تطابق معايير البحث</p>
                  <button 
                    onClick={handleAddProductClick}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
                  >
                    + إضافة أول منتج
                  </button>
                </div>
              )}

              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'list')} />
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fadeIn">
              {/* فلتر الحالة */}
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'الكل', color: 'bg-gray-100 text-gray-700', count: orders.length },
                      { id: 'pending', label: 'جديد', color: 'bg-amber-100 text-amber-700', count: orders.filter(o => o.status === 'pending').length },
                      { id: 'processing', label: 'تجهيز', color: 'bg-blue-100 text-blue-700', count: orders.filter(o => o.status === 'processing').length },
                      { id: 'delivered', label: 'مكتمل', color: 'bg-green-100 text-green-700', count: orders.filter(o => o.status === 'delivered').length },
                      { id: 'cancelled', label: 'ملغي', color: 'bg-red-100 text-red-700', count: orders.filter(o => o.status === 'cancelled').length }
                    ].map(f => (
                      <button 
                        key={f.id}
                        onClick={() => setOrderStatusFilter(f.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                          orderStatusFilter === f.id 
                            ? `${f.color} border-2 border-current` 
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <span>{f.label}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${orderStatusFilter === f.id ? 'bg-white/50' : 'bg-gray-200'}`}>
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-sm font-bold text-gray-600">
                    إجمالي المعروض: <span className="text-blue-600">{filteredOrders.length}</span> طلب
                  </p>
                </div>
              </div>

              {/* جدول الطلبات */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-right">
                        <th className="px-6 py-4 text-sm font-black text-gray-700">العميل</th>
                        <th className="px-6 py-4 text-sm font-black text-gray-700">التاريخ</th>
                        <th className="px6 py-4 text-sm font-black text-gray-700">المنتجات</th>
                        <th className="px-6 py-4 text-sm font-black text-gray-700">الإجمالي</th>
                        <th className="px-6 py-4 text-sm font-black text-gray-700 text-center">الحالة</th>
                        <th className="px-6 py-4 text-sm font-black text-gray-700 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.map(o => {
                        const customerUser = (users || []).find(u => u.company === o.customerName || u.displayName === o.customerName);
                        const waPhone = customerUser?.phone || '';
                        
                        const statusConfig = {
                          pending: { color: 'bg-amber-100 text-amber-800', icon: '⏳' },
                          processing: { color: 'bg-blue-100 text-blue-800', icon: '⚙️' },
                          shipped: { color: 'bg-indigo-100 text-indigo-800', icon: '🚚' },
                          delivered: { color: 'bg-green-100 text-green-800', icon: '✅' },
                          cancelled: { color: 'bg-red-100 text-red-800', icon: '🚫' }
                        }[o.status] || { color: 'bg-gray-100 text-gray-800', icon: '📦' };

                        return (
                          <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-800 text-sm">{o.customerName}</span>
                                <span className="text-xs text-gray-500">#{o.id.substring(0, 8)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-gray-600">{formatDate(o.date)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="max-w-[200px]">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-500">عدد المنتجات:</span>
                                  <span className="text-sm font-bold text-gray-800">{o.items.length}</span>
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {o.items.slice(0, 2).map(item => item.productName).join('، ')}
                                  {o.items.length > 2 && ` +${o.items.length - 2} أكثر`}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-gray-800 text-lg">{formatEnNumber(o.total)}</span>
                              <span className="text-xs text-gray-500 mr-1">ر.س</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                <select 
                                  value={o.status}
                                  onChange={(e) => onUpdateOrderStatus(o.id, e.target.value as any)}
                                  className={`text-sm font-bold rounded-xl px-4 py-2 outline-none cursor-pointer transition-all ${statusConfig.color} border border-transparent hover:border-current`}
                                >
                                  <option value="pending">⏳ قيد المراجعة</option>
                                  <option value="processing">⚙️ جاري التجهيز</option>
                                  <option value="shipped">🚚 تم الشحن</option>
                                  <option value="delivered">✅ تم التسليم</option>
                                  <option value="cancelled">🚫 ملغي</option>
                                </select>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-2">
                                {waPhone && (
                                  <button 
                                    onClick={() => sendOrderInvoiceWhatsApp(o, waPhone)}
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-lg transition-all"
                                    title="إرسال الفاتورة عبر واتساب"
                                  >
                                    <span>💬</span>
                                    <span>فاتورة واتساب</span>
                                  </button>
                                )}
                                <button 
                                  onClick={() => setSelectedOrderDetails(o)}
                                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-all"
                                >
                                  <span>📄</span>
                                  <span>عرض التفاصيل</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {filteredOrders.length === 0 && (
                    <div className="py-16 text-center">
                      <div className="text-6xl mb-4 opacity-20">📭</div>
                      <h3 className="text-xl font-black text-gray-400 mb-2">لا توجد طلبات</h3>
                      <p className="text-gray-500">لم يتم العثور على طلبات تطابق معايير البحث</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-8 animate-fadeIn">
              {/* شريط البحث والإضافة */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative flex-1 w-full">
                    <input 
                      type="text" 
                      placeholder="ابحث عن عميل بالاسم، الشركة، أو الهاتف..." 
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full pr-12 pl-4 py-3 bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-sm"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingUserId(null);
                      setUserFormData(initialUserForm);
                      setIsCustomerModalOpen(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <span>👤</span>
                    إضافة عميل جديد
                  </button>
                </div>
                <div className="mt-4 text-sm text-gray-500 font-bold">
                  {filteredCustomers.length} عميل معروض • {
                    filteredCustomers.filter(u => u.status === 'active').length
                  } عميل نشط
                </div>
              </div>

              {/* شبكة العملاء */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map(user => {
                  const customerStats = getCustomerStats(user);
                  const isInactive = user.status === 'suspended';
                  
                  return (
                    <div key={user.id} className={`bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all ${isInactive ? 'grayscale opacity-75' : ''}`}>
                      {/* رأس البطاقة */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                            {user.logoUrl ? (
                              <img src={user.logoUrl} className="w-full h-full object-cover" alt={user.company} />
                            ) : (
                              <span className="text-2xl text-blue-600">🏢</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">{user.company}</h3>
                            <p className="text-sm text-gray-500">{user.displayName}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                            isInactive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {isInactive ? 'معطل' : 'نشط'}
                          </span>
                          <button 
                            onClick={() => handleEditCustomer(user)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="تعديل بيانات العميل"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>

                      {/* معلومات الاتصال */}
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">📱</span>
                          <span className="font-bold text-gray-700">{user.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">📧</span>
                          <span className="font-bold text-gray-700 truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">👤</span>
                          <span className="font-bold text-gray-700">{user.username}</span>
                        </div>
                      </div>

                      {/* إحصائيات العميل */}
                      <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">إجمالي الطلبات</p>
                          <p className="text-xl font-black text-blue-600">{customerStats.count}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">إجمالي المبيعات</p>
                          <p className="text-xl font-black text-green-600">{formatEnNumber(customerStats.spent)} ر.س</p>
                        </div>
                      </div>

                      {/* آخر طلب */}
                      <div className="mb-6">
                        <p className="text-xs text-gray-500 mb-1">آخر طلب</p>
                        <p className="text-sm font-bold text-gray-700">
                          {customerStats.lastOrder !== 'لا يوجد' ? formatDate(customerStats.lastOrder) : 'لا توجد طلبات'}
                        </p>
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => sendCredentialsWhatsApp(user)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span>💬</span>
                          <span>إرسال البيانات</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCustomers.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-200">
                  <div className="text-6xl mb-4 opacity-20">👥</div>
                  <h3 className="text-xl font-black text-gray-400 mb-2">لا توجد عملاء</h3>
                  <p className="text-gray-500 mb-6">لم يتم العثور على عملاء تطابق معايير البحث</p>
                  <button 
                    onClick={() => {
                      setEditingUserId(null);
                      setUserFormData(initialUserForm);
                      setIsCustomerModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
                  >
                    + إضافة أول عميل
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal تفاصيل الطلب */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">تفاصيل الطلب #{selectedOrderDetails.id.substring(0,8)}</h3>
                <p className="text-sm text-blue-100">العميل: {selectedOrderDetails.customerName}</p>
              </div>
              <button 
                onClick={() => setSelectedOrderDetails(null)} 
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition-all"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* معلومات الطلب */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">تاريخ الطلب</p>
                    <p className="font-bold text-gray-800">{formatDate(selectedOrderDetails.date)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">حالة الطلب</p>
                    <p className="font-bold text-blue-600">{selectedOrderDetails.status}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">إجمالي الفاتورة</p>
                    <p className="text-xl font-black text-gray-800">{formatEnNumber(selectedOrderDetails.total)} ر.س</p>
                  </div>
                </div>

                {/* قائمة المنتجات */}
                <div>
                  <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                    <span>📦 المنتجات المطلوبة</span>
                    <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                      {selectedOrderDetails.items.length} منتج
                    </span>
                  </h4>
                  <div className="space-y-3">
                    {selectedOrderDetails.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                          <img src={item.imageUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-800 mb-2">{item.productName}</h5>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-600">الكمية: <b className="text-gray-800">{item.quantity}</b></span>
                              <span className="text-gray-600">سعر الوحدة: <b className="text-gray-800">{formatEnNumber(item.price)} ر.س</b></span>
                            </div>
                            <span className="text-lg font-black text-blue-600">
                              {formatEnNumber(item.price * item.quantity)} ر.س
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ملخص الفاتورة */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
                  <h4 className="font-bold text-gray-800 text-lg mb-4">🧾 ملخص الفاتورة</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">قيمة المنتجات</span>
                      <span className="font-bold text-gray-800">{formatEnNumber(selectedOrderDetails.total / 1.15)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ضريبة القيمة المضافة (15%)</span>
                      <span className="font-bold text-gray-800">
                        {formatEnNumber(selectedOrderDetails.total - (selectedOrderDetails.total / 1.15))} ر.س
                      </span>
                    </div>
                    <div className="pt-4 border-t border-gray-300 flex justify-between items-center">
                      <span className="text-lg font-black text-blue-600">الإجمالي الكلي</span>
                      <span className="text-3xl font-black text-gray-900">{formatEnNumber(selectedOrderDetails.total)} ر.س</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-4">
              <button 
                onClick={() => {
                  const customer = users.find(u => u.company === selectedOrderDetails.customerName || u.displayName === selectedOrderDetails.customerName);
                  if (customer?.phone) sendOrderInvoiceWhatsApp(selectedOrderDetails, customer.phone);
                }}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
              >
                <span>💬</span>
                <span>مشاركة عبر واتساب</span>
              </button>
              <button 
                onClick={() => window.print()}
                className="px-8 bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
              >
                <span>🖨️</span>
                <span>طباعة الفاتورة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal إضافة/تعديل منتج */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">
                {editingId ? '✏️ تعديل المنتج' : '➕ إضافة منتج جديد'}
              </h3>
              <button 
                onClick={() => { setIsProductModalOpen(false); setEditingId(null); }} 
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              {/* رفع الصورة */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-2xl border-4 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                     onClick={() => modalFileInputRef.current?.click()}>
                  {productForm.imageUrl ? (
                    <img src={productForm.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl text-gray-400 mb-2">🖼️</div>
                      <p className="text-xs text-gray-500">اضغط لرفع صورة</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm font-bold">
                    تغيير الصورة
                  </div>
                </div>
                <input type="file" ref={modalFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'modal')} />
              </div>

              {/* معلومات أساسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">اسم المنتج *</label>
                  <input 
                    required 
                    placeholder="أدخل اسم المنتج..." 
                    value={productForm.name} 
                    onChange={e => setProductForm({...productForm, name: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الباركود</label>
                  <input 
                    placeholder="رقم الباركود..." 
                    value={productForm.barcode || ''} 
                    onChange={e => setProductForm({...productForm, barcode: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* السعر والخصم */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">السعر (ر.س) *</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={productForm.price || ''} 
                    onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الخصم (%)</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={productForm.discount || ''} 
                    onChange={e => setProductForm({...productForm, discount: Number(e.target.value)})} 
                    className="w-full p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold outline-none focus:border-red-500 transition-colors"
                  />
                  {productForm.discount > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      السعر بعد الخصم: {(productForm.price * (1 - productForm.discount / 100)).toFixed(2)} ر.س
                    </p>
                  )}
                </div>
              </div>

              {/* الفئة والترتيب */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الفئة *</label>
                  <input 
                    required 
                    placeholder="التصنيف..." 
                    value={productForm.category} 
                    onChange={e => setProductForm({...productForm, category: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ترتيب العرض</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={productForm.sortOrder} 
                    onChange={e => setProductForm({...productForm, sortOrder: Number(e.target.value)})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* المخزون */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">المخزون الحالي</label>
                  <input 
                    type="number" 
                    readOnly 
                    value={productForm.stock} 
                    className="w-full p-3 bg-gray-100 border border-gray-300 rounded-xl text-sm text-gray-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">تحديث المخزون *</label>
                  <input 
                    required 
                    type="number" 
                    placeholder="أدخل الكمية..." 
                    value={tempStock} 
                    onChange={e => {
                      setTempStock(e.target.value);
                      setProductForm({...productForm, stock: Number(e.target.value)});
                    }} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* عرض الكميات */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
                <label className="block text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <span>🎁 عرض الكميات (هدية مجانية)</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-700 mb-1">عند شراء عدد (X)</label>
                    <input 
                      type="number" 
                      placeholder="مثلاً: 5"
                      value={productForm.offer?.buyQty || ''} 
                      onChange={e => setProductForm({
                        ...productForm, 
                        offer: { ...productForm.offer, buyQty: Number(e.target.value), type: 'buy_x_get_y' }
                      })}
                      className="w-full p-3 bg-white border border-amber-300 rounded-xl text-sm outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-700 mb-1">يحصل على (Y) مجاناً</label>
                    <input 
                      type="number" 
                      placeholder="مثلاً: 1"
                      value={productForm.offer?.getQty || ''} 
                      onChange={e => setProductForm({
                        ...productForm, 
                        offer: { ...productForm.offer, getQty: Number(e.target.value) }
                      })}
                      className="w-full p-3 bg-white border border-amber-300 rounded-xl text-sm outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
                {productForm.offer?.buyQty > 0 && (
                  <div className="flex justify-between items-center mt-3 px-2">
                    <p className="text-sm text-amber-700 font-bold">
                      العرض: {productForm.offer.buyQty} + {productForm.offer.getQty} مجاناً
                    </p>
                    <button 
                      type="button"
                      onClick={() => setProductForm({...productForm, offer: { buyQty: 0, getQty: 0, type: 'buy_x_get_y' }})}
                      className="text-xs text-red-600 font-bold hover:text-red-800 transition-colors"
                    >
                      حذف العرض
                    </button>
                  </div>
                )}
              </div>

              {/* تاريخ الانتهاء والحالة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الانتهاء</label>
                  <input 
                    type="date" 
                    value={productForm.expiryDate || ''} 
                    onChange={e => setProductForm({...productForm, expiryDate: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">حالة المنتج</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-300">
                    <input 
                      type="checkbox" 
                      checked={productForm.isActive} 
                      onChange={e => setProductForm({...productForm, isActive: e.target.checked})} 
                      className="w-5 h-5 accent-blue-600"
                    />
                    <span className="text-sm font-bold text-gray-700">
                      {productForm.isActive ? 'ظاهر للعملاء' : 'مخفي عن العملاء'}
                    </span>
                  </div>
                </div>
              </div>

              {/* الوصف */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">وصف المنتج</label>
                <textarea 
                  placeholder="اكتب تفاصيل المنتج..." 
                  value={productForm.description} 
                  onChange={e => setProductForm({...productForm, description: e.target.value})} 
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl h-24 text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {/* زر الإرسال */}
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all mt-4"
              >
                {editingId ? '💾 حفظ التعديلات' : '➕ إضافة المنتج'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal إضافة/تعديل عميل */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[115] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
            <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">
                {editingUserId ? '✏️ تعديل بيانات العميل' : '👤 إضافة عميل جديد'}
              </h3>
              <button 
                onClick={() => setIsCustomerModalOpen(false)} 
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
              >
                ✕
              </button>
            </div>
            
            <form 
              onSubmit={(e) => { 
                e.preventDefault(); 
                if (editingUserId) {
                  onUpdateUser(editingUserId, userFormData);
                } else {
                  onAddUser({ ...userFormData, linkedSupplierId: currentUser?.id });
                }
                setIsCustomerModalOpen(false); 
              }} 
              className="p-6 space-y-6 overflow-y-auto"
            >
              {/* صورة العميل */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-2xl border-4 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                     onClick={() => userPhotoInputRef.current?.click()}>
                  {userFormData.logoUrl ? (
                    <img src={userFormData.logoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl text-gray-400 mb-2">👤</div>
                      <p className="text-xs text-gray-500">اضغط لرفع الصورة</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm font-bold">
                    تغيير الصورة
                  </div>
                </div>
                <input type="file" ref={userPhotoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'user')} />
                <p className="text-xs text-gray-500">ارفع شعار المحل أو صورة المسؤول</p>
              </div>

              {/* معلومات الشركة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">اسم الشركة / المحل *</label>
                  <input 
                    required 
                    placeholder="اسم المنشأة..." 
                    value={userFormData.company} 
                    onChange={e => setUserFormData({...userFormData, company: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">اسم المسؤول *</label>
                  <input 
                    required 
                    placeholder="اسم الشخص..." 
                    value={userFormData.displayName} 
                    onChange={e => setUserFormData({...userFormData, displayName: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>

              {/* معلومات الاتصال */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">رقم الجوال (واتساب) *</label>
                  <input 
                    required 
                    placeholder="9665..." 
                    value={userFormData.phone} 
                    onChange={e => setUserFormData({...userFormData, phone: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">البريد الإلكتروني *</label>
                  <input 
                    required 
                    type="email" 
                    placeholder="example@..." 
                    value={userFormData.email} 
                    onChange={e => setUserFormData({...userFormData, email: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>

              {/* بيانات الدخول */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">اسم المستخدم *</label>
                  <input 
                    required 
                    placeholder="username..." 
                    value={userFormData.username} 
                    onChange={e => setUserFormData({...userFormData, username: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">كلمة المرور *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="password..." 
                    value={userFormData.password} 
                    onChange={e => setUserFormData({...userFormData, password: e.target.value})} 
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>

              {/* حالة الحساب */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">حالة الحساب</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setUserFormData({...userFormData, status: 'active'})}
                    className={`py-4 rounded-xl text-sm font-bold transition-all ${
                      userFormData.status === 'active' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    ✅ نشط
                  </button>
                  <button 
                    type="button"
                    onClick={() => setUserFormData({...userFormData, status: 'suspended'})}
                    className={`py-4 rounded-xl text-sm font-bold transition-all ${
                      userFormData.status === 'suspended' 
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    🚫 معطل
                  </button>
                </div>
              </div>

              {/* زر الإرسال */}
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all mt-4"
              >
                {editingUserId ? '💾 تحديث بيانات العميل' : '👤 تأكيد إضافة العميل'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fadeIn { animation: fade-in 0.5s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-1 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
        .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        .line-clamp-3 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
        @media print {
          .no-print-bg { background: white !important; }
          .hide-on-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ESB2BSeller;