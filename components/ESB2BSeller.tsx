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
  // تحديث أنواع التبويبات لإضافة 'offers'
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
    name: '', category: '', price: 0, stock: 0, description: '', supplier: currentUser?.company ||
    '', imageUrl: '', isActive: true, barcode: '', expiryDate: '', offer: { buyQty: 0, getQty: 0, type: 'buy_x_get_y' }, discount: 0,
  };
  const [selectedCustomerForOrders, setSelectedCustomerForOrders] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<any>(initialProductForm);

  const initialUserForm: Omit<AppUser, 'id'> = {
    company: '', displayName: '', phone: '', email: '', username: '', password: '', role: 'buyer', status: 'active', logoUrl: ''
  };
  const [userFormData, setUserFormData] = useState(initialUserForm);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const brandFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const userPhotoInputRef = useRef<HTMLInputElement>(null);

  const [imageChangeId, setImageChangeId] = useState<string | null>(null);
  const [activeBrandEditCat, setActiveBrandEditCat] = useState<string | null>(null);

  const stats = [
    { label: 'إجمالي المبيعات', value: orders.reduce((acc, o) => acc + (o.total || 0), 0), unit: 'ج.م', icon: '💰', color: 'bg-blue-600' },
    { label: 'طلبات جديدة', value: orders.filter(o => o.status === 'pending').length, unit: 'طلب', icon: '🔔', color: 'bg-emerald-500' },
    { label: 'العملاء', value: (users || []).filter(u => u.role === 'buyer').length, unit: 'عميل', icon: '👥', color: 'bg-indigo-600' },
    { label: 'الأصناف', value: products.length, unit: 'صنف', icon: '📦', color: 'bg-slate-800' },
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
  let result = [...products];
  
  // 🔍 البحث المتقدم: إذا كان هناك نص بحث
  if (searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase().trim();
    
    // تقسيم كلمات البحث إذا كان هناك مسافات
    const searchTerms = query.split(' ').filter(term => term.length > 0);
    
    result = result.filter(p => {
      // البحث في الاسم (الكود الأصلي)
      if (p.name.toLowerCase().includes(query)) return true;
      
      // 🔍 البحث الإضافي في الحقول الأخرى
      
      // البحث في الباركود
      if (p.barcode?.toLowerCase().includes(query)) return true;
      
      // البحث في الفئة
      if (p.category?.toLowerCase().includes(query)) return true;
      
      // البحث في الوصف
      if (p.description?.toLowerCase().includes(query)) return true;
      
      // البحث في السعر (كرقم)
      if (p.price?.toString().includes(query)) return true;
      
      // البحث في المورد
      if (p.supplier?.toLowerCase().includes(query)) return true;
      
      // البحث المتقدم: تطابق جميع مصطلحات البحث
      let matchesAllTerms = true;
      const productText = `
        ${p.name || ''}
        ${p.barcode || ''}
        ${p.category || ''}
        ${p.description || ''}
        ${p.supplier || ''}
        ${p.price || ''}
      `.toLowerCase();
      
      for (const term of searchTerms) {
        if (!productText.includes(term)) {
          matchesAllTerms = false;
          break;
        }
      }
      
      return matchesAllTerms;
    });
  }
  
  // 🎁 إذا كنا في تبويب العروض، نظهر فقط المنتجات التي بها خصم أو عرض كمية
  if (activeTab === 'offers') {
    result = result.filter(p => (p.discount && p.discount > 0) || (p.offer && p.offer.buyQty > 0));
  }

  // 🔄 الترتيب حسب sortOrder (الكود الأصلي)
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
  let message = `*🧾 فاتورة طلب توريد - iB2BFOOD*\n`;
  message += `-----------------------------------\n`;
  message += `*🏢 المورد:* ${currentUser?.company || 'iB2B'}\n`;
  message += `*👤 العميل:* ${order.customerName}\n`;
  message += `*🔢 رقم الطلب:* #${shortId}\n`;
  message += `*📅 التاريخ:* ${formatDate(order.date)}\n`;
  message += `-----------------------------------\n\n`;
  message += `*📦 الأصناف المطلوبة:*\n`;
  
  order.items.forEach((item, index) => {
    // التأكد من جلب اسم المنتج من أي خاصية متوفرة (productName أو name)
    const name = item.productName || (item as any).name || 'منتج غير مسمى';
    // التأكد من جلب الباركود
    const barcode = item.barcode || (item as any).sku || '---';
    const itemTotal = item.price * item.quantity;

    message += `${index + 1}. *${name}*\n`;
    message += `   الباركود: ${barcode}\n`;
    message += `   الكمية: ${item.quantity}\n`; // الكمية في سطر
    message += `   السعر: ${formatEnNumber(item.price)} ج.م\n`; // السعر في سطر
    message += `   المجموع: ${formatEnNumber(itemTotal)} ج.م\n\n`; // سطر فارغ بين المنتجات للتنظيم
  });
  
  message += `-----------------------------------\n`;
  message += `*💰 الإجمالي النهائي: ${formatEnNumber(order.total)} ج.م*\n`;
  message += `-----------------------------------\n\n`;
  message += `شكراً لتعاملكم معنا. سيتم إبلاغكم فور تحديث حالة الشحن. ✨`;

  // تنظيف رقم الهاتف وإرسال الرسالة
  const cleanPhone = waPhone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
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

          // 1. نبحث أولاً عن المنتج في القائمة الحالية باستخدام الباركود
const existingProduct = products.find(p => String(p.barcode).trim() === barcode && barcode !== "");

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
  
  // التعديل هنا: 
  // إذا كان ملف الإكسل يحتوي على رابط (item.imageUrl) نستخدمه، 
  // وإلا إذا كان المنتج موجوداً نستخدم صورته القديمة (existingProduct.imageUrl)،
  // وإذا كان منتجاً جديداً تماماً نضع نصاً فارغاً.
  imageUrl: item.imageUrl || (existingProduct ? existingProduct.imageUrl : ''),
  
  supplier: currentUser?.company || currentUser?.displayName,
  updatedAt: new Date().toISOString()
};

// 2. التنفيذ بناءً على النتيجة السابقة
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
        
        alert(`✅ اكتمل الرفع بنجاح!\n- تحديث: ${updatedCount}\n- إضافة: ${addedCount}`);
        e.target.value = ''; 

      } catch (error) {
        console.error("Bulk upload error:", error);
        alert("❌ حدث خطأ في معالجة الملف. تأكد من إغلاق الملف قبل الرفع.");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleExportExcel = () => {
    try {
      // تحضير البيانات للتصدير
      const exportData = products.map((p, index) => ({
        'رقم': index + 1,
        'اسم المنتج': p.name,
        'الباركود': p.barcode || '',
        'الفئة': p.category,
        'السعر': p.price,
        'الخصم (%)': p.discount || 0,
        'السعر بعد الخصم': p.discount ? p.price * (1 - (p.discount / 100)) : p.price,
        'المخزون': p.stock,
        'الحالة': p.isActive === false ? 'مخفي' : 'ظاهر',
        'الحد الأدنى للعرض (Buy Qty)': p.offer?.buyQty || 0,
        'الكمية المجانية (Get Qty)': p.offer?.getQty || 0,
        'تاريخ الانتهاء': p.expiryDate || '',
        'الترتيب': (p as any).sortOrder || 0,
        'الوصف': p.description || '',
        'المورد': p.supplier || currentUser?.company || '',
        'تاريخ التحديث': new Date().toLocaleDateString('ar-SA')
      }));

      // إنشاء ورقة عمل
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // تعيين تنسيق الأعمدة العربية
      const wscols = [
        { wch: 5 },   // رقم
        { wch: 30 },  // اسم المنتج
        { wch: 15 },  // الباركود
        { wch: 15 },  // الفئة
        { wch: 10 },  // السعر
        { wch: 10 },  // الخصم
        { wch: 15 },  // السعر بعد الخصم
        { wch: 10 },  // المخزون
        { wch: 8 },   // الحالة
        { wch: 15 },  // Buy Qty
        { wch: 15 },  // Get Qty
        { wch: 12 },  // تاريخ الانتهاء
        { wch: 8 },   // الترتيب
        { wch: 40 },  // الوصف
        { wch: 20 },  // المورد
        { wch: 12 }   // تاريخ التحديث
      ];
      ws['!cols'] = wscols;

      // إنشاء ملف Excel
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'منتجات المورد');

      // اسم الملف مع التاريخ
      const fileName = `منتجات_${currentUser?.company || 'المورد'}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // حفظ الملف
      XLSX.writeFile(wb, fileName);

      alert(`✅ تم تصدير ${products.length} منتج بنجاح إلى ملف: ${fileName}`);
    } catch (error) {
      console.error('خطأ في تصدير Excel:', error);
      alert('❌ حدث خطأ أثناء تصدير الملف. حاول مرة أخرى.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Cairo'] no-print-bg" dir="rtl">
      <header className="bg-navy text-white px-6 md:px-12 py-8 relative overflow-hidden shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-mint text-navy rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl font-black italic">ES</div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">شركاء iB2B</h1>
              <p className="text-mint/60 text-xs font-bold mt-1">إدارة المورد: {currentUser?.company || 'المنشأة'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotifPanelOpen(!isNotifPanelOpen)}
                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition-all relative"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-black animate-bounce">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {isNotifPanelOpen && (
                <div className="absolute top-16 left-0 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 z-100 text-navy animate-slide-up">
                   <div className="flex justify-between items-center mb-6">
                      <h4 className="font-black text-sm">التنبيهات الأخيرة</h4>
                      <button onClick={() => setIsNotifPanelOpen(false)} className="text-gray-400">✕</button>
                   </div>
                   <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <p className="text-[10px] text-gray-400 font-bold text-center py-4">لا توجد تنبيهات جديدة</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                             <p className="text-[10px] font-black mb-1">{n.title}</p>
                             <p className="text-[9px] text-gray-500 font-bold leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                   </div>
                </div>
              )}
            </div>

            <button onClick={onLogout} className="bg-rose-500 text-white px-10 py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all">خروج آمن</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-6 -mt-10 relative z-20 pb-40">
        // في ملف ESB2BSeller.tsx - ابحث عن هذا الجزء
<nav className="flex bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem] shadow-2xl border border-white mb-12 overflow-x-auto scrollbar-hide">
  {[
    { id: 'overview', label: '📊 الرئيسية' },
    { id: 'inventory', label: '📦 المخزون' },
    { id: 'offers', label: '🎁 العروض' },
    { id: 'orders', label: '🧾 الطلبات' },
    { id: 'customers', label: '🤝 العملاء' }
  ].map(tab => (
    <button 
      key={tab.id} 
      onClick={() => setActiveTab(tab.id as any)} 
      className={`flex-1 min-w-[140px] flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs transition-all ${activeTab === tab.id ? 'bg-navy text-mint shadow-2xl scale-105' : 'text-gray-400 hover:bg-white/50'}`}
    >
      {tab.label}
    </button>
  ))}
</nav>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-white group hover:shadow-xl transition-all">
                   <div className={`w-14 h-14 rounded-2xl ${stat.color} flex items-center justify-center text-2xl text-white mb-6 group-hover:scale-110 transition-transform shadow-lg`}>{stat.icon}</div>
                   <p className="text-[10px] text-gray-400 font-black mb-1">{stat.label}</p>
                   <h3 className="text-2xl font-black text-navy">{formatEnNumber(stat.value)} <span className="text-[10px]">{stat.unit}</span></h3>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-sm border border-white overflow-hidden min-h-[400px]">
                <h3 className="text-lg font-black text-navy mb-8">أداء مبيعات المورد</h3>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_STATS}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} fillOpacity={0.1} fill="#2563eb" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col items-center justify-center text-center">
                 <div className="text-5xl mb-4">🚀</div>
                 <h3 className="text-xl font-black">جاهز للتوسع؟</h3>
                 <p className="text-gray-400 text-xs font-bold mt-2 leading-relaxed px-4">أضف منتجات جديدة وحافظ على تحديث صور البراندات لزيادة ظهورك للمشترين.</p>
              </div>
            </div>
          </div>
        )}


{(activeTab === 'inventory' || activeTab === 'offers') && (
  <div className="space-y-12 animate-fadeIn">
    {activeTab === 'inventory' && (
      <>
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black text-navy">إدارة الفئات والماركات</h2>
        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Brand Control Grid</span>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {categoriesGrid.map((cat) => (
          <div key={cat.name} className="group flex flex-col items-center gap-3 p-3 md:p-4 rounded-[2.5rem] bg-white/40 backdrop-blur-md border border-white transition-all duration-500 hover:shadow-xl relative">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.8rem] bg-white flex items-center justify-center overflow-hidden shadow-sm relative group/logo">
              {cat.icon.length > 2 ? (
                <img src={cat.icon} className="w-full h-full object-cover p-2" alt={cat.name} />
              ) : (
                <span className="text-xl md:text-3xl">{cat.icon}</span>
              )}
              <button 
                onClick={() => { setActiveBrandEditCat(cat.name); brandFileInputRef.current?.click(); }}
                className="absolute inset-0 bg-navy/60 text-mint opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-black"
              >تعديل</button>
            </div>
            <span className="text-[8px] md:text-[10px] font-black text-center text-navy/60 truncate w-full">{cat.name}</span>
          </div>
        ))}
      </div>
      <input type="file" ref={brandFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'brand')} />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 no-print px-2">
      <div 
        className="bg-navy/5 backdrop-blur-md p-10 rounded-[3rem] border-2 border-dashed border-navy/20 flex flex-col items-center justify-center text-center hover:border-navy hover:bg-white transition-all duration-500 cursor-pointer group shadow-sm hover:shadow-2xl" 
        onClick={handleAddProductClick}
      >
        <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform duration-500">
          <span className="text-3xl">➕</span>
        </div>
        <h4 className="font-black text-navy text-sm">إضافة صنف واحد</h4>
        <p className="text-[10px] text-gray-500 font-bold opacity-80">إدخال البيانات يدوياً</p>
      </div>

      <div className="bg-mint/10 backdrop-blur-md p-10 rounded-[3rem] border-2 border-dashed border-mint/40 flex flex-col items-center justify-center text-center hover:border-mint hover:bg-white transition-all duration-500 relative group shadow-sm hover:shadow-2xl">
        <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-sm mb-4 group-hover:rotate-12 transition-transform duration-500">
          <span className="text-3xl">📊</span>
        </div>
        <h4 className="font-black text-navy text-sm">رفع جماعي (Excel)</h4>
        <p className="text-[10px] text-gray-500 font-bold mb-4 opacity-80">رفع 100+ منتج بضغطة واحدة</p>
        
        <input 
          type="file" 
          id="bulk-excel" 
          className="hidden" 
          accept=".xlsx, .xls" 
          onChange={handleBulkUpload} 
        />
        <label 
          htmlFor="bulk-excel" 
          className="bg-navy text-mint px-8 py-3 rounded-2xl font-black text-[10px] cursor-pointer shadow-lg active:scale-95 transition-all"
        >
          اختر الملف
        </label>
      </div>
    </div>
    </>
    )}

<div className="bg-white/60 backdrop-blur-xl p-6 rounded-[3rem] border border-gray-100 shadow-lg flex items-center gap-4">
  <div className="relative flex-1 flex gap-3">
    <div className="relative flex-1">
      <input 
        type="text" 
        placeholder="🔍 ابحث عن منتج بالاسم، الفئة، أو الباركود..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pr-5 pl-14 py-4 bg-white border-2 border-gray-100 focus:border-navy focus:ring-2 focus:ring-navy/20 rounded-[1.8rem] outline-none font-bold text-gray-800 text-sm placeholder-gray-500 transition-all duration-300 shadow-sm"
      />
      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 text-lg">🔍</span>
    </div>
    <button 
      onClick={() => setIsScannerOpen(true)}
      className="w-14 h-14 bg-navy text-mint rounded-[1.8rem] flex items-center justify-center text-xl shadow-lg hover:shadow-xl active:scale-95 transition-all border border-white/30"
      title="مسح باركود"
    >
      📷
    </button>
  </div>
  
  {/* زر تنزيل Excel */}
  <button
    onClick={handleExportExcel}
    disabled={products.length === 0}
    className={`min-w-[200px] px-6 py-4 rounded-[1.8rem] font-black text-sm flex items-center justify-center gap-3 shadow-lg transition-all ${
      products.length === 0 
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-200' 
        : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 border border-emerald-600/20 hover:shadow-xl'
    }`}
  >
    <span className="text-base">📥</span>
    <span>تنزيل Excel ({products.length})</span>
  </button>
</div>

<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8 mt-8">
  {filteredProducts.map(p => {
    const isHidden = p.isActive === false;
    const isLowStock = (p.stock || 0) <= 5;
    const finalPrice = p.discount ? p.price * (1 - p.discount / 100) : p.price;
                return (
                  <div key={p.id} className={`group relative bg-white/40 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3rem] p-3 md:p-6 border border-white shadow-[0_40px_80px_rgba(0,0,0,0.03)] hover:shadow-[0_60px_100px_rgba(0,0,0,0.08)] transition-all duration-700 hover:-translate-y-2 flex flex-col h-full ${isHidden ? 'opacity-60' : ''}`}>
                    {/* شارة العروض */}
                    {p.offer && p.offer.buyQty > 0 && (
                      <div className="absolute top-2 left-2 z-20 bg-rose-500 text-white px-3 py-1 rounded-lg shadow-lg animate-pulse">
                        <p className="text-[10px] font-black">{p.offer.buyQty} + {p.offer.getQty}</p>
                      </div>
                    )}
                    
                    <div className="absolute -top-2 -right-2 z-20 bg-[#feee00] text-navy px-3 py-1.5 rounded-xl shadow-xl">
                      <div className="flex flex-col items-center">
                        {p.discount ? (
                          <>
                            <p className="text-[8px] line-through text-navy/40 mb-0.5">{formatEnNumber(p.price)}</p>
                            <p className="text-xs md:text-lg font-black leading-none">{formatEnNumber(finalPrice)}<span className="text-[8px] mr-1">ج.م</span></p>
                          </>
                        ) : (
                          <p className="text-xs md:text-lg font-black leading-none">{formatEnNumber(p.price)}<span className="text-[8px] mr-1">ج.م</span></p>
                        )}
                      </div>
                    </div>

                    <div className="relative aspect-square rounded-[1.8rem] md:rounded-[2.5rem] overflow-hidden bg-white mb-4 border border-white/40 shadow-inner group-hover:shadow-2xl transition-all">
                      <img src={p.imageUrl || '/images/placeholder.png'} className="w-full h-full object-cover p-4" alt={p.name} />
                      <button 
                        onClick={() => { setImageChangeId(p.id); fileInputRef.current?.click(); }}
                        className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black"
                      >تحديث الصورة</button>
                    </div>

                    <div className="flex-1 space-y-2 text-right">
                       <div className="flex items-center gap-1 justify-end">
                          <span className="text-[7px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">#{ (p as any).sortOrder || 0 } | {p.category}</span>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                       </div>
                       <h4 className="font-black text-navy text-[10px] md:text-sm leading-tight line-clamp-2">{p.name}</h4>
                       {p.barcode && <p className="text-[8px] md:text-[9px] font-bold text-gray-400 mt-1">Barcode: {p.barcode}</p>}
                    </div>

        <div className="mt-4 pt-4 border-t border-white/40 space-y-3">
           <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/60 p-2 rounded-xl border border-white flex flex-col items-center">
                 <span className="text-[7px] text-gray-400 font-black mb-1">المخزون</span>
                 <span className={`text-[10px] font-black ${isLowStock ? 'text-rose-500' : 'text-navy'}`}>{p.stock}</span>
              </div>
              <button 
                onClick={() => handleToggleVisibility(p)}
                className={`rounded-xl border flex items-center justify-center text-[10px] font-black transition-all ${isHidden ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-emerald-50 border-emerald-100 text-emerald-500'}`}
              >
                {isHidden ? 'مخفي' : 'ظاهر'}
              </button>
           </div>
           <button 
            onClick={() => handleEditProduct(p)}
            className="w-full bg-navy text-[#feee00] py-3 rounded-2xl text-[10px] font-black shadow-lg"
           >تعديل كامل البيانات</button>
        </div>
      </div>
    );
  })}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'list')} />
          </div>
        )}

        {activeTab === 'orders' && (
  <div className="space-y-6 animate-fadeIn">
    {/* شريط الفلترة - تم تعديله ليدعم العودة للخلف */}
    <div className="bg-white/40 backdrop-blur-xl p-4 rounded-[2rem] border border-white flex flex-wrap gap-2 items-center justify-between">
       <div className="flex gap-2">
         {selectedCustomerForOrders ? (
           <button 
             onClick={() => setSelectedCustomerForOrders(null)}
             className="px-6 py-2 rounded-xl font-black text-[10px] bg-navy text-mint shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
           >
             <span>🔙 العودة لقائمة العملاء</span>
           </button>
         ) : (
           ['all', 'pending', 'processing', 'delivered', 'cancelled'].map(f => (
             <button 
               key={f}
               onClick={() => setOrderStatusFilter(f as any)}
               className={`px-6 py-2 rounded-xl font-black text-[10px] transition-all ${orderStatusFilter === f ? 'bg-navy text-mint shadow-lg' : 'bg-white/60 text-gray-400 border'}`}
             >
               {f === 'all' ? 'الكل' : f === 'pending' ? 'جديد' : f === 'processing' ? 'تجهيز' : f === 'delivered' ? 'مكتمل' : 'ملغي'}
             </button>
           ))
         )}
       </div>
       <p className="text-[10px] font-black text-gray-400 ml-4">
         {selectedCustomerForOrders ? `طلبات العميل: ${selectedCustomerForOrders}` : `إجمالي العملاء: ${Array.from(new Set(filteredOrders.map(o => o.customerName))).length}`}
       </p>
    </div>

    {!selectedCustomerForOrders ? (
      /* المرحلة الأولى: عرض العملاء فقط */
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(new Set(filteredOrders.map(o => o.customerName))).map(customer => {
          const customerOrders = filteredOrders.filter(o => o.customerName === customer);
          return (
            <div 
              key={customer}
              onClick={() => setSelectedCustomerForOrders(customer)}
              className="bg-white p-6 rounded-[2rem] border border-white shadow-sm hover:shadow-xl transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center text-xl group-hover:bg-navy group-hover:text-white transition-all">
                  👤
                </div>
                <div>
                  <h4 className="font-black text-navy text-sm">{customer}</h4>
                  <p className="text-[10px] text-gray-400 font-bold">{customerOrders.length} طلبات</p>
                </div>
              </div>
              <span className="text-navy/20 group-hover:translate-x-[-5px] transition-all">◀</span>
            </div>
          );
        })}
      </div>
    ) : (
      /* المرحلة الثانية: عرض جدول الطلبات (نفس الكود القديم تماماً) */
      <div className="bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-navy text-white">
              <tr className="text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-6 border-b border-white/10">رقم الطلب</th>
                <th className="px-6 py-6 border-b border-white/10">التاريخ</th>
                <th className="px-6 py-6 border-b border-white/10">المنتجات</th>
                <th className="px-6 py-6 border-b border-white/10">الإجمالي</th>
                <th className="px-6 py-6 border-b border-white/10 text-center">الحالة</th>
                <th className="px-6 py-6 border-b border-white/10 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {filteredOrders
                .filter(o => o.customerName === selectedCustomerForOrders)
                .map(o => (
                  <tr key={o.id} className="hover:bg-white/30 transition-colors group">
                    <td className="px-6 py-5">
                      <span className="text-[9px] text-gray-400 font-bold tracking-tighter">#{o.id.substring(0, 8)}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-bold text-gray-500">{formatDate(o.date)}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="max-w-[200px] flex flex-col gap-1">
                        {o.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/40 p-1.5 rounded-lg border border-white/50">
                            <span className="text-[9px] font-black text-navy truncate flex-1 ml-2">{item.productName}</span>
                            <span className="text-[8px] bg-navy/5 px-1.5 rounded font-bold">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-black text-navy text-sm">{formatEnNumber(o.total)} <small className="text-[10px] text-gray-400 mr-1">ج.م</small></span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <select 
                          value={o.status} 
                          onChange={(e) => onUpdateOrderStatus(o.id, e.target.value as any)}
                          className={`text-[9px] font-black border rounded-full px-4 py-2 outline-none cursor-pointer ${
                            o.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                            o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}
                        >
                          <option value="pending">⏳ قيد المراجعة</option>
                          <option value="processing">⚙️ جاري التجهيز</option>
                          <option value="shipped">🚚 تم الشحن</option>
                          <option value="delivered">✅ تم التسليم</option>
                          <option value="cancelled">🚫 ملغي</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => setSelectedOrderDetails(o)} 
                        className="bg-white border border-gray-100 text-navy p-2 px-3 rounded-xl hover:bg-navy hover:text-[#feee00] transition-all text-[9px] font-black"
                      >
                        📄 عرض
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
)}

        {activeTab === 'customers' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[3rem] border border-white shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <input 
                  type="text" 
                  placeholder="بحث عن عميل..." 
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-3 bg-white/60 border-2 border-transparent focus:border-mint rounded-2xl outline-none font-black text-xs"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <button 
                onClick={() => {
                  setEditingUserId(null);
                  setUserFormData(initialUserForm);
                  setIsCustomerModalOpen(true);
                }}
                className="w-full md:w-auto bg-navy text-mint px-8 py-3.5 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all"
              >إضافة عميل جديد +</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map(user => {
                const customerStats = getCustomerStats(user);
                const isInactive = user.status === 'suspended';
                
                return (
                  <div key={user.id} className={`bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden ${isInactive ? 'grayscale opacity-75' : ''}`}>
                    <div className="absolute top-0 right-0 p-4">
                       <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${isInactive ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {isInactive ? 'معطل' : 'نشط'}
                       </span>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                      <div className="w-20 h-20 rounded-[2rem] bg-blue-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-3xl font-black shrink-0">
                         {user.logoUrl ? (
                            <img src={user.logoUrl} className="w-full h-full object-cover" />
                         ) : '🏢'}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditCustomer(user)}
                          className="w-10 h-10 rounded-xl bg-gray-50 text-navy hover:bg-navy hover:text-white transition-all flex items-center justify-center shadow-sm"
                          title="تعديل بيانات العميل"
                        >✏️</button>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-black text-navy">{user.company}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mb-4">{user.displayName} | {user.email}</p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                          <p className="text-[8px] text-gray-400 font-black mb-1 uppercase">إجمالي الطلبات</p>
                          <p className="text-sm font-black text-navy">{customerStats.count}</p>
                       </div>
                       <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                          <p className="text-[8px] text-gray-400 font-black mb-1 uppercase">إجمالي المبيعات</p>
                          <p className="text-sm font-black text-emerald-600">{formatEnNumber(customerStats.spent)} ج.م</p>
                       </div>
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
                       <div className="flex justify-between text-[10px] font-black">
                          <span className="text-gray-400">اسم المستخدم:</span>
                          <span className="text-navy">{user.username}</span>
                       </div>
                       <div className="flex justify-between text-[10px] font-black">
                          <span className="text-gray-400">الجوال:</span>
                          <span className="text-navy">{user.phone}</span>
                       </div>
                       <div className="flex justify-between text-[10px] font-black">
                          <span className="text-gray-400">آخر طلب:</span>
                          <span className="text-navy">{customerStats.lastOrder}</span>
                       </div>
                    </div>

                    <button 
                      onClick={() => sendCredentialsWhatsApp(user)}
                      className="w-full mt-6 bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all"
                    >
                      <span>إرسال البيانات واتساب</span>
                      <span className="text-sm">💬</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedOrderDetails && (
  <div className="fixed inset-0 z-[110] bg-navy/80 backdrop-blur-md flex items-center justify-center p-4">
    {/* CSS مخصص للطباعة فقط */}
    <style>{`
      @media print {
        /* إخفاء كل شيء ما عدا الفاتورة */
        body *:not(#printable-area):not(#printable-area *) {
          display: none !important;
        }

        /* إعادة ضبط الفاتورة */
        #printable-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white;
          padding: 30px;
          font-family: 'Cairo', sans-serif;
        }

        /* إلغاء قيود المودال */
        .max-h-\\[90vh\\] {
          max-height: none !important;
        }

        .overflow-y-auto {
          overflow: visible !important;
        }

        .fixed {
          position: static !important;
        }

        /* تنسيق الجدول */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 12px;
        }

        th {
          background-color: #1e293b !important;
          color: white !important;
          padding: 12px;
          text-align: center;
          font-weight: 900;
          border: 1px solid #334155;
        }

        td {
          padding: 10px;
          border: 1px solid #cbd5e1;
          text-align: center;
        }

        tr {
          page-break-inside: avoid;
        }

        @page {
          size: A4;
          margin: 15mm;
        }

        .no-print {
          display: none !important;
        }
        
        /* تنسيق الإجماليات */
        .totals-table {
          width: 50%;
          margin-left: auto;
          border-collapse: collapse;
        }
        
        .totals-table td {
          padding: 8px 15px;
          border: none;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .totals-table .total-row {
          background-color: #f8fafc;
          font-weight: 900;
          font-size: 14px;
        }
      }
    `}</style>

    <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="p-8 bg-navy text-white flex justify-between items-center shrink-0 no-print">
        <div>
          <h3 className="text-2xl font-black">تفاصيل الطلب #{selectedOrderDetails.id.substring(0, 8)}</h3>
          <p className="text-[10px] font-bold text-mint uppercase tracking-widest mt-1">المحل: {selectedOrderDetails.customerName}</p>
        </div>
        <button onClick={() => setSelectedOrderDetails(null)} className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition-all">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {/* المحتوى الذي سيظهر في الطباعة */}
        <div id="printable-area">
          {/* رأس الفاتورة */}
          <div className="text-center mb-8 border-b-2 border-navy pb-6">
            <h1 className="text-3xl font-black text-navy mb-2">فاتورة ضريبية</h1>
            <p className="text-sm font-bold text-gray-700">العميل: {selectedOrderDetails.customerName}</p>
            <p className="text-xs text-gray-500">التاريخ: {formatDate(selectedOrderDetails.date)}</p>
            <p className="text-xs text-gray-500">رقم الفاتورة: #{selectedOrderDetails.id.substring(0, 8)}</p>
          </div>

          {/* جدول المنتجات */}
          <table className="w-full border-collapse border border-gray-300 text-right mb-8" dir="rtl">
            <thead>
              <tr className="bg-navy text-white">
                <th className="border border-gray-300 p-3 text-sm font-black">#</th>
                <th className="border border-gray-300 p-3 text-sm font-black">الباركود</th>
                <th className="border border-gray-300 p-3 text-sm font-black">اسم المنتج</th>
                <th className="border border-gray-300 p-3 text-sm font-black">الكمية</th>
                <th className="border border-gray-300 p-3 text-sm font-black">سعر الوحدة</th>
                <th className="border border-gray-300 p-3 text-sm font-black">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrderDetails.items.map((item, idx) => {
                // حساب السعر والكمية بشكل صحيح
                const price = item.price || item.unitPrice || 0;
                const quantity = item.quantity || 1;
                const total = price * quantity;
                
                return (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="border border-gray-300 p-3 text-sm text-center">{idx + 1}</td>
                    <td className="border border-gray-300 p-3 text-sm font-mono text-center" dir="ltr">{item.barcode || item.code || '-'}</td>
                    <td className="border border-gray-300 p-3 text-sm font-bold text-black text-right">{item.productName || item.name || "منتج"}</td>
                    <td className="border border-gray-300 p-3 text-sm text-center">{formatEnNumber(quantity)}</td>
                    <td className="border border-gray-300 p-3 text-sm text-center">{formatEnNumber(price)} ج.م</td>
                    <td className="border border-gray-300 p-3 text-sm text-center font-black">{formatEnNumber(total)} ج.م</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* قسم الإجماليات والضريبة */}
          {(() => {
            const subtotal = selectedOrderDetails.items.reduce((sum, item) => {
              const price = item.price || item.unitPrice || 0;
              const quantity = item.quantity || 1;
              return sum + (price * quantity);
            }, 0);
            const tax = subtotal * 0.15;
            const total = subtotal + tax;
            
            return (
              <div className="flex justify-end mb-6">
                <table className="totals-table w-96 border-collapse">
                  <tbody>
                    <tr>
                      <td className="p-3 text-right font-bold text-gray-700">مجموع المنتجات:</td>
                      <td className="p-3 text-left font-mono font-bold">{formatEnNumber(subtotal.toFixed(2))} ج.م</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-right font-bold text-gray-700">ضريبة القيمة المضافة (15%):</td>
                      <td className="p-3 text-left font-mono font-bold">{formatEnNumber(tax.toFixed(2))} ج.م</td>
                    </tr>
                    <tr className="total-row bg-gray-100">
                      <td className="p-4 text-right font-black text-lg">الإجمالي الكلي:</td>
                      <td className="p-4 text-left font-black text-lg text-blue-700">{formatEnNumber(total.toFixed(2))} ج.م</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* توقيع وشكر */}
          <div className="mt-10 text-center border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600 mb-2">شكراً لتعاملكم معنا</p>
            <p className="text-xs text-gray-400">{currentUser?.company || 'iB2B Platform'}</p>
          </div>
        </div>

        {/* العرض المرئي في التطبيق */}
        <div className="space-y-6 print:hidden">
          <div className="flex items-center justify-between border-b pb-4 border-gray-100">
            <h4 className="font-black text-navy text-sm flex items-center gap-2">
              <span>📦 أصناف الطلب</span>
              <span className="bg-gray-100 px-3 py-1 rounded-full text-[10px] text-gray-500">{selectedOrderDetails.items.length} منتجات</span>
            </h4>
            <p className="text-[10px] font-bold text-gray-400">{formatDate(selectedOrderDetails.date)}</p>
          </div>

          <div className="space-y-3">
            {selectedOrderDetails.items.map((item, idx) => {
              const price = item.price || item.unitPrice || 0;
              const quantity = item.quantity || 1;
              const total = price * quantity;
              
              return (
                <div key={idx} className="flex gap-4 p-4 rounded-[2rem] border border-gray-50 bg-gray-50/30 group hover:border-mint transition-all">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 overflow-hidden shrink-0 shadow-sm">
                    <img src={item.imageUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover p-2" alt={item.productName} />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h5 className="font-black text-navy text-sm mb-1">
                      {item.productName || item.name || "منتج"}
                    </h5>
                    {item.barcode && (
                      <p className="text-[9px] font-bold text-gray-400 mb-2">
                        Barcode: {item.barcode}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-gray-400">
                          الكمية: <b className="text-navy">{formatEnNumber(quantity)}</b>
                        </span>
                        <span className="text-[10px] font-black text-gray-400">
                          سعر الوحدة: <b className="text-navy">{formatEnNumber(price)}</b>
                        </span>
                      </div>
                      <span className="text-sm font-black text-blue-600">
                        {formatEnNumber(total)} <small className="text-[10px] mr-1">ج.م</small>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* حساب الإجماليات للعرض المرئي */}
          {(() => {
            const subtotal = selectedOrderDetails.items.reduce((sum, item) => {
              const price = item.price || item.unitPrice || 0;
              const quantity = item.quantity || 1;
              return sum + (price * quantity);
            }, 0);
            const tax = subtotal * 0.15;
            const total = subtotal + tax;

            return (
              <div className="mt-10 p-8 rounded-[3rem] bg-navy text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-mint/10 blur-3xl rounded-full"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center text-gray-400 text-xs font-bold">
                    <span>قيمة المنتجات (صافي)</span>
                    <span className="text-white">{formatEnNumber(subtotal.toFixed(2))} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-400 text-xs font-bold">
                    <span>ضريبة القيمة المضافة (15%)</span>
                    <span className="text-white">{formatEnNumber(tax.toFixed(2))} ج.م</span>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-base font-black text-[#feee00]">الإجمالي الكلي للفاتورة</span>
                    <span className="text-3xl font-black">
                      {formatEnNumber(total.toFixed(2))} <small className="text-sm mr-1">ج.م</small>
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Buttons Action - إضافة أزرار جديدة للحفظ */}
<div className="p-8 border-t bg-gray-50 flex flex-wrap gap-3 shrink-0 no-print">
  <button 
    onClick={() => {
      const customer = users.find(u => u.company === selectedOrderDetails.customerName || u.displayName === selectedOrderDetails.customerName);
      if (customer?.phone) sendOrderInvoiceWhatsApp(selectedOrderDetails, customer.phone);
    }}
    className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[140px]"
  >
    <span>واتساب</span>
    <span>💬</span>
  </button>
  
  {/* زر الطباعة - إصلاح */}
  <button 
    onClick={() => {
      // استخدام window.print مباشرة مع التأكد من ظهور المحتوى
      window.print();
    }}
    className="flex-1 bg-navy text-mint py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[140px]"
  >
    <span>طباعة</span>
    <span>🖨️</span>
  </button>

  {/* زر حفظ PDF - إصلاح بدون مكتبات خارجية */}
  <button 
    onClick={() => {
      try {
        // إنشاء محتوى HTML للفاتورة
        const subtotal = selectedOrderDetails.items.reduce((sum, item) => {
          const price = item.price || item.unitPrice || 0;
          const quantity = item.quantity || 1;
          return sum + (price * quantity);
        }, 0);
        const tax = subtotal * 0.15;
        const total = subtotal + tax;

        // إنشاء HTML منسق للفاتورة
        const invoiceHTML = `
          <!DOCTYPE html>
          <html dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>فاتورة #${selectedOrderDetails.id.substring(0, 8)}</title>
            <style>
              body {
                font-family: 'Cairo', Arial, sans-serif;
                padding: 30px;
                max-width: 800px;
                margin: 0 auto;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #1e293b;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .header h1 {
                color: #1e293b;
                font-size: 28px;
                margin-bottom: 15px;
              }
              .info {
                margin-bottom: 20px;
              }
              .info p {
                margin: 5px 0;
                font-size: 14px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
              }
              th {
                background-color: #1e293b;
                color: white;
                padding: 12px;
                font-weight: bold;
                border: 1px solid #334155;
              }
              td {
                padding: 10px;
                border: 1px solid #cbd5e1;
                text-align: center;
              }
              .totals {
                width: 50%;
                margin-left: auto;
              }
              .totals td {
                padding: 8px 15px;
                border: none;
                border-bottom: 1px solid #e2e8f0;
              }
              .grand-total {
                background-color: #f8fafc;
                font-weight: bold;
                font-size: 16px;
              }
              .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>فاتورة ضريبية</h1>
              <div class="info">
                <p><strong>العميل:</strong> ${selectedOrderDetails.customerName}</p>
                <p><strong>التاريخ:</strong> ${formatDate(selectedOrderDetails.date)}</p>
                <p><strong>رقم الفاتورة:</strong> #${selectedOrderDetails.id.substring(0, 8)}</p>
                <p><strong>المورد:</strong> ${currentUser?.company || 'مورد معتمد'}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>الباركود</th>
                  <th>اسم المنتج</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${selectedOrderDetails.items.map((item, idx) => {
                  const price = item.price || item.unitPrice || 0;
                  const quantity = item.quantity || 1;
                  const itemTotal = price * quantity;
                  return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${item.barcode || '-'}</td>
                      <td>${item.productName || item.name || 'منتج'}</td>
                      <td>${formatEnNumber(quantity)}</td>
                      <td>${formatEnNumber(price)} ج.م</td>
                      <td>${formatEnNumber(itemTotal)} ج.م</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <table class="totals">
              <tr>
                <td><strong>مجموع المنتجات:</strong></td>
                <td>${formatEnNumber(subtotal.toFixed(2))} ج.م</td>
              </tr>
              <tr>
                <td><strong>ضريبة القيمة المضافة (15%):</strong></td>
                <td>${formatEnNumber(tax.toFixed(2))} ج.م</td>
              </tr>
              <tr class="grand-total">
                <td><strong>الإجمالي الكلي:</strong></td>
                <td>${formatEnNumber(total.toFixed(2))} ج.م</td>
              </tr>
            </table>

            <div class="footer">
              <p>شكراً لتعاملكم معنا</p>
              <p>${currentUser?.company || 'iB2B Platform'}</p>
            </div>
          </body>
          </html>
        `;

        // إنشاء نافذة جديدة للطباعة/الحفظ
        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        
        // انتظار تحميل المحتوى ثم فتح نافذة الطباعة
        printWindow.onload = function() {
          printWindow.print();
        };
      } catch (error) {
        console.error('خطأ في إنشاء PDF:', error);
        alert('حدث خطأ أثناء إنشاء ملف PDF');
      }
    }}
    className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[140px]"
  >
    <span>PDF</span>
    <span>📄</span>
  </button>

  {/* زر حفظ Excel */}
  <button 
    onClick={() => {
      try {
        const subtotal = selectedOrderDetails.items.reduce((sum, item) => {
          const price = item.price || item.unitPrice || 0;
          const quantity = item.quantity || 1;
          return sum + (price * quantity);
        }, 0);
        const tax = subtotal * 0.15;
        const total = subtotal + tax;

        const excelData = [
          ['فاتورة ضريبية', '', '', '', '', ''],
          ['العميل:', selectedOrderDetails.customerName, '', 'التاريخ:', formatDate(selectedOrderDetails.date), ''],
          ['رقم الفاتورة:', `#${selectedOrderDetails.id.substring(0, 8)}`, '', 'المورد:', currentUser?.company || '', ''],
          [],
          ['#', 'الباركود', 'اسم المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'],
          ...selectedOrderDetails.items.map((item, idx) => {
            const price = item.price || item.unitPrice || 0;
            const quantity = item.quantity || 1;
            const itemTotal = price * quantity;
            
            return [
              idx + 1,
              item.barcode || '-',
              item.productName || item.name || "منتج",
              quantity,
              price,
              itemTotal
            ];
          }),
          [],
          ['', '', '', '', 'مجموع المنتجات:', subtotal.toFixed(2)],
          ['', '', '', '', 'ضريبة القيمة المضافة (15%):', tax.toFixed(2)],
          ['', '', '', '', 'الإجمالي الكلي:', total.toFixed(2)],
          [],
          ['شكراً لتعاملكم معنا', '', '', '', '', '']
        ];
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        ws['!cols'] = [
          { wch: 5 },   // #
          { wch: 15 },  // الباركود
          { wch: 40 },  // اسم المنتج
          { wch: 10 },  // الكمية
          { wch: 15 },  // سعر الوحدة
          { wch: 15 }   // الإجمالي
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'فاتورة');
        XLSX.writeFile(wb, `فاتورة_${selectedOrderDetails.id.substring(0, 8)}.xlsx`);
      } catch (error) {
        console.error('خطأ في إنشاء Excel:', error);
        alert('حدث خطأ أثناء إنشاء ملف Excel');
      }
    }}
    className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[140px]"
  >
    <span>Excel</span>
    <span>📊</span>
  </button>
</div>
    </div>
  </div>
)}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-[100] bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[95vh]">
            <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-navy">{editingId ? 'تعديل بيانات المنتج' : 'إضافة صنف جديد'}</h3>
              <button onClick={() => { setIsProductModalOpen(false); setEditingId(null); }} className="text-gray-400 hover:text-navy text-xl">✕</button>
            </div>
            <form 
              onSubmit={handleSubmit} 
              className="p-8 space-y-4 overflow-y-auto custom-scrollbar"
            >
              <div className="flex flex-col items-center gap-3 mb-2">
                 <div className="w-32 h-32 rounded-3xl border-4 border-dashed border-gray-100 bg-gray-50 flex items-center justify-center relative overflow-hidden group">
                    {productForm.imageUrl ? (
                      <img src={productForm.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl opacity-20">🖼️</span>
                    )}
                    <button 
                      type="button" 
                      onClick={() => modalFileInputRef.current?.click()}
                      className="absolute inset-0 bg-navy/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black"
                    >رفع صورة المنتج</button>
                 </div>
                 <input type="file" ref={modalFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'modal')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">اسم المنتج</label>
                  <input required placeholder="أدخل اسم المنتج..." value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">الباركود</label>
                  <input placeholder="رقم الباركود..." value={productForm.barcode || ''} onChange={e => setProductForm({...productForm, barcode: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">السعر (ج.م)</label>
                  <input required type="number" step="0.01" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-black outline-none focus:border-navy transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-rose-400 uppercase mr-1">الخصم (%)</label>
                  <input type="number" placeholder="0" value={productForm.discount || ''} onChange={e => setProductForm({...productForm, discount: Number(e.target.value)})} className="w-full p-4 bg-rose-50 border-rose-100 text-rose-600 rounded-2xl border text-xs font-black outline-none focus:border-rose-300 transition-all" />
                </div>
              </div>

              {productForm.price > 0 && (productForm.discount || 0) > 0 && (
                <div className="mt-1 px-2">
                  <p className="text-[10px] font-bold text-gray-400">السعر النهائي بعد الخصم: <span className="text-emerald-600 mr-1">{(productForm.price * (1 - (productForm.discount || 0) / 100)).toFixed(2)} ج.م</span></p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">الفئة</label>
                  <input required placeholder="التصنيف..." value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">ترتيب العرض</label>
                  <input type="number" placeholder="0" value={productForm.sortOrder} onChange={e => setProductForm({...productForm, sortOrder: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-black outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">المخزون الحالي</label>
                  <input type="number" readOnly value={productForm.stock} className="w-full p-4 bg-gray-100 rounded-2xl border text-xs font-black text-gray-400 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">تحديث المخزون</label>
                  <input required type="number" placeholder="أدخل الكمية..." value={tempStock} onChange={e => {
                    setTempStock(e.target.value);
                    setProductForm({...productForm, stock: Number(e.target.value)});
                  }} className="w-full p-4 bg-gray-50 rounded-2xl border border-mint/30 text-xs font-black outline-none" />
                </div>
              </div>

              {/* قسم إعدادات العرض (Buy X Get Y) */}
              <div className="space-y-3 p-4 bg-mint/5 rounded-[2rem] border border-mint/20">
                <label className="text-[10px] font-black text-navy uppercase flex items-center gap-2">
                  <span>🎁 عروض الكميات (هدية مجانية)</span>
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500">عند شراء عدد (X)</label>
                    <input 
                      type="number" 
                      placeholder="مثلاً: 5"
                      value={productForm.offer?.buyQty || ''} 
                      onChange={e => setProductForm({
                        ...productForm, 
                        offer: { ...productForm.offer, buyQty: Number(e.target.value), type: 'buy_x_get_y' }
                      })}
                      className="w-full p-3 bg-white rounded-xl border text-xs font-black outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500">يحصل على (Y) مجاناً</label>
                    <input 
                      type="number" 
                      placeholder="مثلاً: 1"
                      value={productForm.offer?.getQty || ''} 
                      onChange={e => setProductForm({
                        ...productForm, 
                        offer: { ...productForm.offer, getQty: Number(e.target.value) }
                      })}
                      className="w-full p-3 bg-white rounded-xl border text-xs font-black outline-none" 
                    />
                  </div>
                </div>
                
                {productForm.offer?.buyQty > 0 && (
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] text-emerald-600 font-bold">
                      العرض: {productForm.offer.buyQty} + {productForm.offer.getQty} مجاناً
                    </p>
                    <button 
                      type="button"
                      onClick={() => setProductForm({...productForm, offer: { buyQty: 0, getQty: 0, type: 'buy_x_get_y' }})}
                      className="text-[9px] text-rose-500 font-black underline"
                    >حذف العرض</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">تاريخ الانتهاء</label>
                  <input type="date" value={productForm.expiryDate || ''} onChange={e => setProductForm({...productForm, expiryDate: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">الحالة</label>
                   <div className="flex items-center h-[52px] gap-3 bg-gray-50 px-4 rounded-2xl border">
                    <input 
                      type="checkbox" 
                      checked={productForm.isActive} 
                      onChange={e => setProductForm({...productForm, isActive: e.target.checked})} 
                      className="w-5 h-5 accent-mint"
                    />
                    <span className="text-[10px] font-black text-navy">{productForm.isActive ? 'ظاهر' : 'مخفي'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase mr-1">وصف المنتج</label>
                <textarea placeholder="اكتب تفاصيل المنتج..." value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border h-20 text-xs font-bold outline-none resize-none" />
              </div>

              <button type="submit" className="w-full bg-navy text-mint py-5 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all mt-4">
                {editingId ? 'حفظ التعديلات ✅' : 'إضافة المنتج ✅'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[100] bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[95vh]">
            <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-navy">{editingUserId ? 'تعديل بيانات العميل' : 'إضافة عميل (مشتري) جديد'}</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-navy text-xl">✕</button>
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
              className="p-8 space-y-4 overflow-y-auto custom-scrollbar"
            >
              <div className="flex flex-col items-center gap-3 mb-4">
                 <div className="w-24 h-24 rounded-[2rem] border-4 border-dashed border-gray-100 bg-gray-50 flex items-center justify-center relative overflow-hidden group">
                    {userFormData.logoUrl ? (
                      <img src={userFormData.logoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl opacity-20">👤</span>
                    )}
                    <button 
                      type="button" 
                      onClick={() => userPhotoInputRef.current?.click()}
                      className="absolute inset-0 bg-navy/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-black"
                    >تغيير الصورة</button>
                 </div>
                 <input type="file" ref={userPhotoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'user')} />
                 <p className="text-[10px] text-gray-400 font-bold italic">ارفع شعار المحل أو صورة المسؤول</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">اسم الشركة / المحل</label>
                  <input required placeholder="اسم المنشأة..." value={userFormData.company} onChange={e => setUserFormData({...userFormData, company: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">اسم المسؤول</label>
                  <input required placeholder="اسم الشخص..." value={userFormData.displayName} onChange={e => setUserFormData({...userFormData, displayName: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">رقم الجوال (واتساب)</label>
                  <input required placeholder="9665..." value={userFormData.phone} onChange={e => setUserFormData({...userFormData, phone: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">البريد الإلكتروني</label>
                  <input required type="email" placeholder="example@..." value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">اسم المستخدم</label>
                  <input required placeholder="username..." value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase mr-1">كلمة المرور</label>
                  <input required type="text" placeholder="password..." value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border text-xs font-black outline-none" />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase mr-1 mb-2 block">حالة الحساب</label>
                <div className="flex bg-gray-50 p-2 rounded-2xl border gap-2">
                   <button 
                    type="button"
                    onClick={() => setUserFormData({...userFormData, status: 'active'})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${userFormData.status === 'active' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400'}`}
                   >نشط ✅</button>
                   <button 
                    type="button"
                    onClick={() => setUserFormData({...userFormData, status: 'suspended'})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${userFormData.status === 'suspended' ? 'bg-rose-50 text-white shadow-lg' : 'text-gray-400'}`}
                   >معطل 🚫</button>
                </div>
              </div>

              <button type="submit" className="w-full bg-navy text-mint py-5 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all mt-4">
                {editingUserId ? 'تحديث بيانات العميل ✅' : 'تأكيد إضافة العميل ✅'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* {isScannerOpen && (
        <ScannerModal 
          onScan={(barcode) => {
            setSearchQuery(barcode);
            setIsScannerOpen(false);
          }}
          onCapture={(base64) => {
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
*/}

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

export default ESB2BSeller;


