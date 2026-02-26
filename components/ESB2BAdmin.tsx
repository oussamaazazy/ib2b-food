import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Order, AppUser, BaseProduct, SupplierProduct } from '../types';
import { formatEnNumber, formatDate } from '../App';
import * as XLSX from 'xlsx';
import { dbService } from '../services/dbService';

interface ESB2BAdminProps {
  products: Product[];
  orders: Order[];
  users: AppUser[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onAddProduct: (p: Omit<Product, 'id'>) => void;
  onUpdateUser: (id: string, updates: Partial<AppUser>) => void;
  onDeleteUser: (id: string) => void;
  onAddUser: (u: Omit<AppUser, 'id'>) => void;
  onUpdateOrderStatus: (id: string, status: Order['status']) => void;
  onLogout: () => void;
}

const ESB2BAdmin: React.FC<ESB2BAdminProps> = ({
  products, orders, users, 
  onUpdateProduct, onDeleteProduct, onAddProduct,
  onUpdateUser, onDeleteUser, onAddUser,
  onUpdateOrderStatus, onLogout
}) => {
  // تحديث أنواع التبويبات لإضافة التبويبات الجديدة
  const [activeTab, setActiveTab] = useState<'stats' | 'products' | 'users' | 'orders' | 'baseProducts' | 'supplierProducts'>('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // حالات لإدارة المنتجات (القديمة)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  
  // حالات جديدة للمنتجات الأساسية وعلاقات الموردين
  const [baseProducts, setBaseProducts] = useState<BaseProduct[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [isBaseProductModalOpen, setIsBaseProductModalOpen] = useState(false);
  const [isSupplierProductModalOpen, setIsSupplierProductModalOpen] = useState(false);
  const [editingBaseProductId, setEditingBaseProductId] = useState<string | null>(null);
  const [editingSupplierProductId, setEditingSupplierProductId] = useState<string | null>(null);
  const [supplierProductFilter, setSupplierProductFilter] = useState<string>('all');
  
  // مرجع لرفع ملف Excel
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const baseProductFileInputRef = useRef<HTMLInputElement>(null);
  
  // نموذج إضافة/تعديل المنتج (القديم)
  const initialProductForm: Omit<Product, 'id'> = {
    name: '',
    category: '',
    price: 0,
    stock: 0,
    description: '',
    supplier: '',
    supplierId: '',
    imageUrl: '',
    isActive: true,
    barcode: '',
    expiryDate: '',
    offer: { buyQty: 0, getQty: 0, type: 'buy_x_get_y' },
    discount: 0,
    sortOrder: 0
  };
  
  const [productForm, setProductForm] = useState(initialProductForm);

  // نموذج المنتج الأساسي (جديد)
  const initialBaseProductForm: Omit<BaseProduct, 'id'> = {
    name: '',
    barcode: '',
    category: '',
    subCategory: '',
    description: '',
    images: [],
    brandImage: '',
    nutritionImage: '',
    isActive: true
  };
  
  const [baseProductForm, setBaseProductForm] = useState(initialBaseProductForm);

  // نموذج علاقة المنتج بالمورد (جديد)
  const initialSupplierProductForm: Omit<SupplierProduct, 'id'> = {
    baseProductId: '',
    supplierId: '',
    supplierName: '',
    price: 0,
    stock: 0,
    discount: 0,
    offer: null,
    minOrderQuantity: 1,
    isActive: true,
    sortOrder: 0,
    expiryDate: '',
    tiers: []
  };
  
  const [supplierProductForm, setSupplierProductForm] = useState(initialSupplierProductForm);

  // نموذج إضافة/تعديل المستخدم
  const initialUserForm: Omit<AppUser, 'id'> = {
    company: '',
    displayName: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    role: 'buyer',
    status: 'active',
    logoUrl: '',
    linkedSupplierId: null,
    supplierName: ''
  };
  
  const [userFormData, setUserFormData] = useState(initialUserForm);

  // تحميل البيانات الجديدة عند فتح التبويبات
  useEffect(() => {
    if (activeTab === 'baseProducts') {
      loadBaseProducts();
    } else if (activeTab === 'supplierProducts') {
      loadSupplierProducts();
    }
  }, [activeTab]);

  const loadBaseProducts = async () => {
    const data = await dbService.getAllBaseProducts();
    setBaseProducts(data);
  };

  const loadSupplierProducts = async () => {
    const data = await dbService.getAllSupplierProducts();
    setSupplierProducts(data);
  };

  // إحصائيات المنصة الشاملة
  const stats = {
    totalSales: orders.reduce((acc, o) => acc + (o.total || 0), 0),
    totalOrders: orders.length,
    totalUsers: users.length,
    totalSellers: users.filter(u => u.role === 'seller').length,
    totalBuyers: users.filter(u => u.role === 'buyer').length,
    totalProducts: products.length,
    totalBaseProducts: baseProducts.length,
    totalSupplierProducts: supplierProducts.length
  };

  // تصفية المستخدمين حسب البحث
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u => 
      u.company?.toLowerCase().includes(query) ||
      u.displayName?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.includes(query) ||
      u.role?.includes(query)
    );
  }, [users, searchQuery]);

  // تصفية المنتجات حسب البحث والفلتر (القديمة)
  const filteredProducts = useMemo(() => {
    let result = products;
    
    if (productSearchQuery) {
      const query = productSearchQuery.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        p.supplier?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    if (supplierFilter !== 'all') {
      result = result.filter(p => p.supplierId === supplierFilter);
    }
    
    return result;
  }, [products, productSearchQuery, supplierFilter]);

  // تصفية المنتجات الأساسية
  const filteredBaseProducts = useMemo(() => {
    if (!productSearchQuery) return baseProducts;
    const query = productSearchQuery.toLowerCase();
    return baseProducts.filter(bp => 
      bp.name?.toLowerCase().includes(query) ||
      bp.barcode?.toLowerCase().includes(query) ||
      bp.category?.toLowerCase().includes(query) ||
      bp.description?.toLowerCase().includes(query)
    );
  }, [baseProducts, productSearchQuery]);

  // تصفية علاقات المنتج بالمورد
  const filteredSupplierProducts = useMemo(() => {
    let result = supplierProducts;
    
    if (supplierProductFilter !== 'all') {
      result = result.filter(sp => sp.supplierId === supplierProductFilter);
    }
    
    if (productSearchQuery) {
      const query = productSearchQuery.toLowerCase();
      const matchingBaseProducts = baseProducts.filter(bp => 
        bp.name?.toLowerCase().includes(query) ||
        bp.barcode?.toLowerCase().includes(query)
      ).map(bp => bp.id);
      
      result = result.filter(sp => matchingBaseProducts.includes(sp.baseProductId));
    }
    
    return result;
  }, [supplierProducts, supplierProductFilter, productSearchQuery, baseProducts]);

  // فتح نافذة إضافة مستخدم جديد
  const handleAddUserClick = () => {
    setEditingUserId(null);
    setUserFormData(initialUserForm);
    setIsUserModalOpen(true);
  };

  // فتح نافذة تعديل مستخدم
  const handleEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setUserFormData({
      company: user.company || '',
      displayName: user.displayName || '',
      phone: user.phone || '',
      email: user.email || '',
      username: user.username || '',
      password: user.password || '',
      role: user.role || 'buyer',
      status: user.status || 'active',
      logoUrl: user.logoUrl || '',
      linkedSupplierId: user.linkedSupplierId || null,
      supplierName: user.supplierName || ''
    });
    setIsUserModalOpen(true);
  };

  // فتح نافذة إضافة منتج جديد (قديم)
  const handleAddProductClick = () => {
    setEditingProductId(null);
    setProductForm(initialProductForm);
    setIsProductModalOpen(true);
  };

  // فتح نافذة تعديل منتج (قديم)
  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || '',
      category: product.category || '',
      price: product.price || 0,
      stock: product.stock || 0,
      description: product.description || '',
      supplier: product.supplier || '',
      supplierId: product.supplierId || '',
      imageUrl: product.imageUrl || '',
      isActive: product.isActive !== false,
      barcode: product.barcode || '',
      expiryDate: product.expiryDate || '',
      offer: product.offer || { buyQty: 0, getQty: 0, type: 'buy_x_get_y' },
      discount: product.discount || 0,
      sortOrder: (product as any).sortOrder || 0
    });
    setIsProductModalOpen(true);
  };

  // فتح نافذة إضافة منتج أساسي (جديد)
  const handleAddBaseProductClick = () => {
    setEditingBaseProductId(null);
    setBaseProductForm(initialBaseProductForm);
    setIsBaseProductModalOpen(true);
  };

  // فتح نافذة تعديل منتج أساسي (جديد)
  const handleEditBaseProduct = (product: BaseProduct) => {
    setEditingBaseProductId(product.id);
    setBaseProductForm({
      name: product.name || '',
      barcode: product.barcode || '',
      category: product.category || '',
      subCategory: product.subCategory || '',
      description: product.description || '',
      images: product.images || [],
      brandImage: product.brandImage || '',
      nutritionImage: product.nutritionImage || '',
      isActive: product.isActive !== false
    });
    setIsBaseProductModalOpen(true);
  };

  // فتح نافذة إضافة علاقة منتج بمورد (جديد)
  const handleAddSupplierProductClick = () => {
    setEditingSupplierProductId(null);
    setSupplierProductForm(initialSupplierProductForm);
    setIsSupplierProductModalOpen(true);
  };

  // فتح نافذة تعديل علاقة منتج بمورد (جديد)
  const handleEditSupplierProduct = (sp: SupplierProduct) => {
    setEditingSupplierProductId(sp.id);
    setSupplierProductForm({
      baseProductId: sp.baseProductId || '',
      supplierId: sp.supplierId || '',
      supplierName: sp.supplierName || '',
      price: sp.price || 0,
      stock: sp.stock || 0,
      discount: sp.discount || 0,
      offer: sp.offer || null,
      minOrderQuantity: sp.minOrderQuantity || 1,
      isActive: sp.isActive !== false,
      sortOrder: sp.sortOrder || 0,
      expiryDate: sp.expiryDate || '',
      tiers: sp.tiers || []
    });
    setIsSupplierProductModalOpen(true);
  };

  // تأكيد حذف المنتج (قديم)
  const handleDeleteProduct = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      onDeleteProduct(id);
    }
  };

  // تأكيد حذف المنتج الأساسي (جديد)
  const handleDeleteBaseProduct = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج الأساسي؟')) {
      await dbService.deleteBaseProduct(id);
      loadBaseProducts();
    }
  };

  // تأكيد حذف علاقة المنتج بالمورد (جديد)
  const handleDeleteSupplierProduct = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه العلاقة؟')) {
      await dbService.deleteSupplierProduct(id);
      loadSupplierProducts();
    }
  };

  // تأكيد حذف المستخدم
  const handleDeleteUser = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      onDeleteUser(id);
    }
  };

  // إرسال بيانات المستخدم عبر واتساب
  const sendCredentialsWhatsApp = (user: AppUser) => {
    const siteUrl = window.location.origin;
    const role = user.role === 'seller' ? 'مورد' : 'مشتري';
    const message = `*مرحباً ${user.displayName}*\n*بيانات الدخول لمنصة iB2B كـ ${role}:*\n\n🔗 الرابط: ${siteUrl}\n👤 اسم المستخدم: ${user.username}\n🔑 كلمة المرور: ${user.password}\n\nنتمنى لك تجربة ممتعة.`;
    const whatsappUrl = `https://wa.me/${(user.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // دالة رفع المنتجات عبر Excel (قديم)
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

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
        let skippedCount = 0;

        for (const item of rawData as any[]) {
          const barcode = String(item.barcode || '').trim();
          
          // معالجة تاريخ الانتهاء
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

          // البحث عن المنتج الموجود بنفس الباركود
          const existingProduct = products.find(p => 
            String(p.barcode).trim() === barcode && barcode !== ""
          );

          // التأكد من وجود المورد في قائمة المستخدمين
          let supplier = item.supplier || '';
          const supplierObj = users.find(u => 
            u.role === 'seller' && 
            (u.company === supplier || u.displayName === supplier)
          );
          
          if (!supplier && supplierObj) {
            supplier = supplierObj.company;
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
            isActive: item.isActive !== false,
            description: item.description || '',
            imageUrl: item.imageUrl || (existingProduct ? existingProduct.imageUrl : ''),
            supplier: supplier,
            supplierId: supplierObj?.id || null,
            updatedAt: new Date().toISOString()
          };

          // التحقق من البيانات الأساسية
          if (!productData.name || productData.price <= 0) {
            skippedCount++;
            continue;
          }

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
        
        alert(`✅ اكتمل الرفع بنجاح!\n- إضافات جديدة: ${addedCount}\n- تحديثات: ${updatedCount}\n- تم تخطي: ${skippedCount}`);
        e.target.value = ''; 

      } catch (error) {
        console.error("Bulk upload error:", error);
        alert("❌ حدث خطأ في معالجة الملف. تأكد من إغلاق الملف قبل الرفع.");
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // دالة رفع المنتجات الأساسية عبر Excel (جديد)
  const handleBaseProductBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      if (!bstr) return;

      try {
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rawData = XLSX.utils.sheet_to_json(ws);

        let addedCount = 0;
        let skippedCount = 0;

        for (const item of rawData as any[]) {
          const barcode = String(item.barcode || '').trim();
          
          // التحقق من وجود المنتج مسبقاً
          const existingProduct = await dbService.findBaseProductByBarcode(barcode);
          
          if (existingProduct) {
            skippedCount++;
            continue;
          }

          const baseProductData = {
            name: item.name || '',
            barcode: barcode,
            category: item.category || 'عام',
            subCategory: item.subCategory || '',
            description: item.description || '',
            images: item.imageUrl ? [item.imageUrl] : [],
            brandImage: item.brandImage || '',
            nutritionImage: item.nutritionImage || '',
            isActive: true
          };

          if (!baseProductData.name || !baseProductData.barcode) {
            skippedCount++;
            continue;
          }

          await dbService.addBaseProduct(baseProductData);
          addedCount++;
        }
        
        alert(`✅ اكتمل الرفع بنجاح!\n- إضافات جديدة: ${addedCount}\n- تم تخطي (موجود مسبقاً): ${skippedCount}`);
        e.target.value = '';
        loadBaseProducts();

      } catch (error) {
        console.error("Base product bulk upload error:", error);
        alert("❌ حدث خطأ في معالجة الملف.");
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // دالة تصدير المنتجات إلى Excel (قديم)
  const handleExportExcel = () => {
    try {
      const exportData = products.map((p, index) => ({
        'رقم': index + 1,
        'اسم المنتج': p.name,
        'الباركود': p.barcode || '',
        'الفئة': p.category,
        'المورد': p.supplier || '',
        'معرف المورد': p.supplierId || '',
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
        'تاريخ التحديث': new Date().toLocaleDateString('ar-SA')
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      const wscols = [
        { wch: 5 },   // رقم
        { wch: 30 },  // اسم المنتج
        { wch: 15 },  // الباركود
        { wch: 15 },  // الفئة
        { wch: 20 },  // المورد
        { wch: 20 },  // معرف المورد
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
        { wch: 12 }   // تاريخ التحديث
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');

      const fileName = `جميع_المنتجات_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(`✅ تم تصدير ${products.length} منتج بنجاح`);
    } catch (error) {
      console.error('خطأ في تصدير Excel:', error);
      alert('❌ حدث خطأ أثناء تصدير الملف');
    }
  };

  // دالة تصدير المنتجات الأساسية إلى Excel (جديد)
  const handleExportBaseProductsExcel = () => {
    try {
      const exportData = baseProducts.map((p, index) => ({
        'رقم': index + 1,
        'اسم المنتج': p.name,
        'الباركود': p.barcode,
        'الفئة': p.category,
        'الفئة الفرعية': p.subCategory || '',
        'الوصف': p.description || '',
        'عدد الموردين': supplierProducts.filter(sp => sp.baseProductId === p.id).length,
        'تاريخ الإضافة': p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-SA') : ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      const wscols = [
        { wch: 5 },   // رقم
        { wch: 30 },  // اسم المنتج
        { wch: 15 },  // الباركود
        { wch: 15 },  // الفئة
        { wch: 15 },  // الفئة الفرعية
        { wch: 40 },  // الوصف
        { wch: 10 },  // عدد الموردين
        { wch: 12 }   // تاريخ الإضافة
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المنتجات الأساسية');

      const fileName = `المنتجات_الأساسية_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(`✅ تم تصدير ${baseProducts.length} منتج أساسي بنجاح`);
    } catch (error) {
      console.error('خطأ في تصدير Excel:', error);
      alert('❌ حدث خطأ أثناء تصدير الملف');
    }
  };

  // دالة تصدير تقرير المبيعات
  const handleExportSalesReport = () => {
    try {
      const reportData = orders.map((o, index) => ({
        'رقم': index + 1,
        'رقم الطلب': o.id.substring(0, 8),
        'العميل': o.customerName,
        'معرف العميل': o.customerId || '',
        'التاريخ': formatDate(o.date),
        'الحالة': o.status,
        'المجموع': o.total,
        'الضريبة': o.tax || 0,
        'الصافي': o.subtotal || o.total,
        'عدد المنتجات': o.items.length,
        'الموردين': [...new Set(o.items.map(i => i.supplier))].join('، ')
      }));

      const ws = XLSX.utils.json_to_sheet(reportData);
      
      const wscols = [
        { wch: 5 },   // رقم
        { wch: 15 },  // رقم الطلب
        { wch: 25 },  // العميل
        { wch: 25 },  // معرف العميل
        { wch: 12 },  // التاريخ
        { wch: 10 },  // الحالة
        { wch: 10 },  // المجموع
        { wch: 8 },   // الضريبة
        { wch: 10 },  // الصافي
        { wch: 8 },   // عدد المنتجات
        { wch: 40 }   // الموردين
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير المبيعات');

      const fileName = `تقرير_المبيعات_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(`✅ تم تصدير تقرير المبيعات بنجاح`);
    } catch (error) {
      console.error('خطأ في تصدير تقرير المبيعات:', error);
      alert('❌ حدث خطأ أثناء تصدير التقرير');
    }
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
        {/* Navigation Tabs - تم إضافة التبويبات الجديدة */}
        <nav className="flex gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm border overflow-x-auto">
          {[
            { id: 'stats', label: '📊 نظرة عامة' },
            { id: 'products', label: '📦 المنتجات' },
            { id: 'baseProducts', label: '🏭 المنتجات الأساسية' },
            { id: 'supplierProducts', label: '🔗 ربط المنتجات بالموردين' },
            { id: 'users', label: '👥 المستخدمين' },
            { id: 'orders', label: '🧾 الطلبات' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 rounded-xl font-black text-xs transition-all min-w-[120px] ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 1. التبويب: نظرة عامة (Stats) - بدون تغيير */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100">
                <p className="text-xs text-gray-400 font-bold">إجمالي المبيعات</p>
                <h2 className="text-2xl font-black text-emerald-600">{formatEnNumber(stats.totalSales)} ج.م</h2>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-blue-100">
                <p className="text-xs text-gray-400 font-bold">إجمالي الطلبات</p>
                <h2 className="text-2xl font-black text-blue-600">{stats.totalOrders}</h2>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-purple-100">
                <p className="text-xs text-gray-400 font-bold">إجمالي المستخدمين</p>
                <h2 className="text-2xl font-black text-purple-600">{stats.totalUsers}</h2>
                <p className="text-[10px] text-gray-400 mt-1">
                  <span className="text-purple-600 font-black">{stats.totalSellers}</span> مورد • 
                  <span className="text-blue-600 font-black mr-1">{stats.totalBuyers}</span> مشتري
                </p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-amber-100">
                <p className="text-xs text-gray-400 font-bold">إجمالي المنتجات</p>
                <h2 className="text-2xl font-black text-amber-600">{stats.totalProducts}</h2>
                <p className="text-[10px] text-gray-400 mt-1">
                  أساسي: {stats.totalBaseProducts} | رابط: {stats.totalSupplierProducts}
                </p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-indigo-100">
                <p className="text-xs text-gray-400 font-bold">الموردين</p>
                <h2 className="text-2xl font-black text-indigo-600">{stats.totalSellers}</h2>
              </div>
            </div>

            {/* رسوم بيانية سريعة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
                <h3 className="font-black text-navy mb-4">توزيع المستخدمين</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600"
                      style={{ width: `${(stats.totalSellers / stats.totalUsers) * 100 || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-black">موردين: {stats.totalSellers}</span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600"
                      style={{ width: `${(stats.totalBuyers / stats.totalUsers) * 100 || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-black">مشترين: {stats.totalBuyers}</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
                <h3 className="font-black text-navy mb-4">أداء المنصة</h3>
                <p className="text-sm text-gray-600">متوسط قيمة الطلب: <span className="font-black text-emerald-600">{formatEnNumber((stats.totalSales / stats.totalOrders) || 0)} ج.م</span></p>
                <p className="text-sm text-gray-600 mt-2">منتجات لكل مورد: <span className="font-black text-amber-600">{(stats.totalProducts / stats.totalSellers || 0).toFixed(1)}</span></p>
                <p className="text-sm text-gray-600 mt-2">متوسط موردين لكل منتج أساسي: <span className="font-black text-purple-600">{((stats.totalSupplierProducts / stats.totalBaseProducts) || 0).toFixed(1)}</span></p>
              </div>
            </div>

            {/* زر تصدير تقرير المبيعات */}
            <div className="flex justify-end">
              <button
                onClick={handleExportSalesReport}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <span>📊</span> تصدير تقرير المبيعات
              </button>
            </div>
          </div>
        )}

        {/* 2. التبويب: إدارة المنتجات (القديمة) - بدون تغيير */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* شريط البحث والإضافة والرفع */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="relative w-full lg:w-96">
                <input 
                  type="text"
                  placeholder="🔍 بحث عن منتج بالاسم أو الباركود أو المورد..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border rounded-2xl text-sm outline-none focus:border-slate-900"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              
              {/* فلتر الموردين */}
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-4 py-3 border rounded-2xl text-sm font-bold outline-none focus:border-slate-900 min-w-[200px]"
              >
                <option value="all">جميع الموردين</option>
                {users.filter(u => u.role === 'seller').map(s => (
                  <option key={s.id} value={s.id}>{s.company}</option>
                ))}
              </select>
              
              <div className="flex gap-3 w-full lg:w-auto">
                <button 
                  onClick={handleAddProductClick}
                  className="flex-1 lg:flex-none bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <span>➕</span> إضافة يدوي
                </button>
                
                <button 
                  onClick={() => bulkFileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`flex-1 lg:flex-none bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
                  }`}
                >
                  <span>{isUploading ? '⏳' : '📊'}</span> 
                  {isUploading ? 'جاري الرفع...' : 'رفع Excel'}
                </button>
                
                <button 
                  onClick={handleExportExcel}
                  className="flex-1 lg:flex-none bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <span>📥</span> تصدير Excel
                </button>
              </div>
              
              <input 
                type="file" 
                ref={bulkFileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls" 
                onChange={handleBulkUpload} 
              />
            </div>

            {/* إحصائيات سريعة للمنتجات */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">إجمالي المنتجات</p>
                <p className="text-xl font-black text-navy">{products.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">منتجات نشطة</p>
                <p className="text-xl font-black text-emerald-600">{products.filter(p => p.isActive).length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">منتجات مخفية</p>
                <p className="text-xl font-black text-amber-600">{products.filter(p => !p.isActive).length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">منتجات منتهية</p>
                <p className="text-xl font-black text-rose-600">
                  {products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date()).length}
                </p>
              </div>
            </div>

            {/* جدول المنتجات مع جميع الإجراءات */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-900 text-white text-[10px]">
                    <tr>
                      <th className="p-4">صورة</th>
                      <th className="p-4">المنتج</th>
                      <th className="p-4">الباركود</th>
                      <th className="p-4">المورد</th>
                      <th className="p-4">الفئة</th>
                      <th className="p-4">السعر</th>
                      <th className="p-4">الخصم</th>
                      <th className="p-4">المخزون</th>
                      <th className="p-4">الترتيب</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-2">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">📦</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold">{p.name}</td>
                        <td className="p-4 font-mono text-gray-500">{p.barcode || '—'}</td>
                        <td className="p-4 text-gray-600">{p.supplier || 'غير محدد'}</td>
                        <td className="p-4">{p.category}</td>
                        <td className="p-4 text-emerald-600 font-black">{p.price} ج.م</td>
                        <td className="p-4">
                          {p.discount ? (
                            <span className="bg-rose-100 text-rose-600 px-2 py-1 rounded-full text-[8px] font-black">
                              {p.discount}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-4">
                          <span className={p.stock <= 5 ? 'text-rose-600 font-black' : 'text-gray-600'}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="p-4">
                          <input 
                            type="number" 
                            defaultValue={(p as any).sortOrder || 0}
                            onBlur={(e) => onUpdateProduct(p.id, { sortOrder: parseInt(e.target.value) } as any)}
                            className="w-16 border rounded p-1 text-center text-xs"
                          />
                        </td>
                        <td className="p-4">
                          <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                            p.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {p.isActive ? 'نشط' : 'مخفي'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => handleEditProduct(p)}
                              className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg transition-all"
                              title="تعديل"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => onUpdateProduct(p.id, { isActive: !p.isActive })}
                              className={`p-2 rounded-lg transition-all ${
                                p.isActive 
                                  ? 'text-amber-500 hover:bg-amber-50' 
                                  : 'text-emerald-500 hover:bg-emerald-50'
                              }`}
                              title={p.isActive ? 'إخفاء' : 'إظهار'}
                            >
                              {p.isActive ? '👁️' : '👁️‍🗨️'}
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(p.id)}
                              className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-all"
                              title="حذف"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* عداد المنتجات */}
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-black">
              <span>إجمالي المنتجات المعروضة: {filteredProducts.length} من أصل {products.length}</span>
              <button 
                onClick={() => {
                  setProductSearchQuery('');
                  setSupplierFilter('all');
                }}
                className="text-blue-600 hover:underline"
              >
                إعادة تعيين البحث
              </button>
            </div>
          </div>
        )}

        {/* 3. التبويب الجديد: المنتجات الأساسية (Base Products) */}
        {activeTab === 'baseProducts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-navy">المنتجات الأساسية (بيانات ثابتة)</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => baseProductFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-purple-700 transition-all"
                >
                  {isUploading ? '⏳ جاري الرفع...' : '📊 رفع Excel'}
                </button>
                <button
                  onClick={handleExportBaseProductsExcel}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-blue-700 transition-all"
                >
                  📥 تصدير Excel
                </button>
                <button
                  onClick={handleAddBaseProductClick}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-emerald-700 transition-all"
                >
                  + إضافة منتج أساسي
                </button>
              </div>
              <input 
                type="file" 
                ref={baseProductFileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls" 
                onChange={handleBaseProductBulkUpload} 
              />
            </div>

            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">إجمالي المنتجات الأساسية</p>
                <p className="text-xl font-black text-navy">{baseProducts.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">مرتبطة بموردين</p>
                <p className="text-xl font-black text-purple-600">
                  {new Set(supplierProducts.map(sp => sp.baseProductId)).size}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">غير مرتبطة</p>
                <p className="text-xl font-black text-amber-600">
                  {baseProducts.length - new Set(supplierProducts.map(sp => sp.baseProductId)).size}
                </p>
              </div>
            </div>

            {/* جدول المنتجات الأساسية */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-900 text-white text-[10px]">
                    <tr>
                      <th className="p-4">المنتج</th>
                      <th className="p-4">الباركود</th>
                      <th className="p-4">الفئة</th>
                      <th className="p-4">الفئة الفرعية</th>
                      <th className="p-4">الوصف</th>
                      <th className="p-4">عدد الموردين</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {filteredBaseProducts.map(bp => {
                      const suppliersCount = supplierProducts.filter(sp => sp.baseProductId === bp.id).length;
                      return (
                        <tr key={bp.id} className="hover:bg-gray-50">
                          <td className="p-4 font-bold">{bp.name}</td>
                          <td className="p-4 font-mono text-gray-500">{bp.barcode}</td>
                          <td className="p-4">{bp.category}</td>
                          <td className="p-4 text-gray-500">{bp.subCategory || '—'}</td>
                          <td className="p-4 text-xs text-gray-500 max-w-[200px] truncate">{bp.description || '—'}</td>
                          <td className="p-4 text-center">
                            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">
                              {suppliersCount}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                              bp.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {bp.isActive ? 'نشط' : 'غير نشط'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditBaseProduct(bp)}
                                className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"
                                title="تعديل"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => handleDeleteBaseProduct(bp.id)}
                                className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg"
                                title="حذف"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredBaseProducts.length === 0 && (
              <div className="text-center py-12 bg-white rounded-[2rem] border">
                <p className="text-gray-400 text-sm">لا توجد منتجات أساسية</p>
              </div>
            )}
          </div>
        )}

        {/* 4. التبويب الجديد: ربط المنتجات بالموردين */}
        {activeTab === 'supplierProducts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-navy">ربط المنتجات بالموردين</h2>
              <div className="flex gap-3">
                <select
                  value={supplierProductFilter}
                  onChange={(e) => setSupplierProductFilter(e.target.value)}
                  className="px-4 py-3 border rounded-xl text-sm font-bold outline-none focus:border-slate-900 min-w-[200px]"
                >
                  <option value="all">جميع الموردين</option>
                  {users.filter(u => u.role === 'seller').map(s => (
                    <option key={s.id} value={s.id}>{s.company}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddSupplierProductClick}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-purple-700 transition-all"
                >
                  + ربط منتج بمورد
                </button>
              </div>
            </div>

            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">إجمالي العلاقات</p>
                <p className="text-xl font-black text-navy">{supplierProducts.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">منتجات مرتبطة</p>
                <p className="text-xl font-black text-purple-600">
                  {new Set(supplierProducts.map(sp => sp.baseProductId)).size}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-[10px] text-gray-400 font-black">موردين نشطين</p>
                <p className="text-xl font-black text-indigo-600">
                  {new Set(supplierProducts.map(sp => sp.supplierId)).size}
                </p>
              </div>
            </div>

            {/* جدول العلاقات */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-900 text-white text-[10px]">
                    <tr>
                      <th className="p-4">المنتج</th>
                      <th className="p-4">الباركود</th>
                      <th className="p-4">المورد</th>
                      <th className="p-4">السعر</th>
                      <th className="p-4">الخصم</th>
                      <th className="p-4">المخزون</th>
                      <th className="p-4">العرض</th>
                      <th className="p-4">الحد الأدنى</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {filteredSupplierProducts.map(sp => {
                      const baseProduct = baseProducts.find(bp => bp.id === sp.baseProductId);
                      const supplier = users.find(u => u.id === sp.supplierId);
                      return (
                        <tr key={sp.id} className="hover:bg-gray-50">
                          <td className="p-4 font-bold">{baseProduct?.name || 'غير معروف'}</td>
                          <td className="p-4 font-mono text-gray-500">{baseProduct?.barcode || '—'}</td>
                          <td className="p-4">{supplier?.company || sp.supplierName}</td>
                          <td className="p-4 text-emerald-600 font-black">{sp.price} ج.م</td>
                          <td className="p-4">{sp.discount ? `${sp.discount}%` : '—'}</td>
                          <td className="p-4">
                            <span className={sp.stock <= 5 ? 'text-rose-600 font-black' : 'text-gray-600'}>
                              {sp.stock}
                            </span>
                          </td>
                          <td className="p-4">
                            {sp.offer?.buyQty ? (
                              <span className="bg-rose-100 text-rose-600 px-2 py-1 rounded-full text-[8px] font-black">
                                {sp.offer.buyQty}+{sp.offer.getQty}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-4">{sp.minOrderQuantity || 1}</td>
                          <td className="p-4">
                            <span className={`text-[8px] font-black px-2 py-1 rounded-full ${
                              sp.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {sp.isActive ? 'نشط' : 'غير نشط'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditSupplierProduct(sp)}
                                className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"
                                title="تعديل"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => handleDeleteSupplierProduct(sp.id)}
                                className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg"
                                title="حذف"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredSupplierProducts.length === 0 && (
              <div className="text-center py-12 bg-white rounded-[2rem] border">
                <p className="text-gray-400 text-sm">لا توجد علاقات</p>
              </div>
            )}
          </div>
        )}

        {/* 5. التبويب: إدارة المستخدمين - بدون تغيير */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* شريط البحث والإضافة */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <input 
                  type="text"
                  placeholder="🔍 بحث عن مستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border rounded-2xl text-sm outline-none focus:border-slate-900"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => {
                    setUserFormData({...initialUserForm, role: 'seller'});
                    setIsUserModalOpen(true);
                  }}
                  className="flex-1 md:flex-none bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-purple-700 transition-all"
                >
                  + إضافة مورد جديد
                </button>
                <button 
                  onClick={() => {
                    setUserFormData({...initialUserForm, role: 'buyer'});
                    setIsUserModalOpen(true);
                  }}
                  className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-blue-700 transition-all"
                >
                  + إضافة مشتري جديد
                </button>
              </div>
            </div>

            {/* عرض المستخدمين */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map(user => {
                const userOrders = orders.filter(o => o.customerName === user.company || o.customerName === user.displayName);
                const isSeller = user.role === 'seller';
                
                // إحصائيات المورد
                const supplierSales = isSeller ? orders
                  .filter(o => o.items?.some(i => i.supplierId === user.id))
                  .reduce((sum, o) => sum + (o.total || 0), 0) : 0;
                
                const supplierProductsCount = isSeller ? products.filter(p => p.supplierId === user.id).length : 0;
                
                return (
                  <div key={user.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border relative ${
                    user.status === 'suspended' ? 'opacity-60 grayscale' : ''
                  }`}>
                    {/* شارة الدور والحالة */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className={`text-[8px] font-black px-3 py-1 rounded-full ${
                        isSeller ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {isSeller ? 'مورد' : 'مشتري'}
                      </span>
                      <span className={`text-[8px] font-black px-3 py-1 rounded-full ${
                        user.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {user.status === 'active' ? 'نشط' : 'معطل'}
                      </span>
                    </div>

                    {/* صورة الشركة */}
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 mb-4 overflow-hidden flex items-center justify-center">
                      {user.logoUrl ? (
                        <img src={user.logoUrl} className="w-full h-full object-cover" alt={user.company} />
                      ) : (
                        <span className="text-2xl">{isSeller ? '🏢' : '👤'}</span>
                      )}
                    </div>

                    {/* بيانات المستخدم */}
                    <h3 className="font-black text-navy text-lg">{user.company}</h3>
                    <p className="text-xs text-gray-500 mb-2">{user.displayName}</p>
                    <p className="text-[10px] text-gray-400 mb-1">{user.email}</p>
                    <p className="text-[10px] text-gray-400 mb-3">{user.phone}</p>

                    {/* إحصائيات المستخدم */}
                    <div className="bg-gray-50 p-3 rounded-xl mb-4">
                      <p className="text-[10px] text-gray-500 flex justify-between">
                        <span>عدد الطلبات:</span>
                        <span className="font-black text-navy">{userOrders.length}</span>
                      </p>
                      <p className="text-[10px] text-gray-500 flex justify-between mt-1">
                        <span>إجمالي المشتريات:</span>
                        <span className="font-black text-emerald-600">
                          {formatEnNumber(userOrders.reduce((sum, o) => sum + (o.total || 0), 0))} ج.م
                        </span>
                      </p>
                      
                      {/* إحصائيات إضافية للموردين */}
                      {isSeller && (
                        <>
                          <p className="text-[10px] text-gray-500 flex justify-between mt-2 pt-2 border-t border-gray-200">
                            <span>إجمالي مبيعاته:</span>
                            <span className="font-black text-purple-600">
                              {formatEnNumber(supplierSales)} ج.م
                            </span>
                          </p>
                          <p className="text-[10px] text-gray-500 flex justify-between mt-1">
                            <span>عدد منتجاته:</span>
                            <span className="font-black text-purple-600">
                              {supplierProductsCount}
                            </span>
                          </p>
                        </>
                      )}
                    </div>

                    {/* أزرار التحكم */}
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all"
                      >
                        ✏️ تعديل
                      </button>
                      <button 
                        onClick={() => onUpdateUser(user.id, { status: user.status === 'active' ? 'suspended' : 'active' })}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black ${
                          user.status === 'active' 
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                        } transition-all`}
                      >
                        {user.status === 'active' ? '🔒 تعطيل' : '🔓 تفعيل'}
                      </button>
                      <button 
                        onClick={() => sendCredentialsWhatsApp(user)}
                        className="w-10 h-10 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center"
                        title="إرسال بيانات الدخول عبر واتساب"
                      >
                        💬
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="w-10 h-10 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all flex items-center justify-center"
                        title="حذف المستخدم"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    {/* عرض المورد المرتبط للمشتري */}
                    {user.role === 'buyer' && user.linkedSupplierId && (
                      <div className="mt-3 p-2 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-[8px] text-blue-600 font-black flex items-center gap-1">
                          <span>🔗</span> مرتبط بمورد: {user.supplierName || 'مورد غير معروف'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* رسالة إذا لم يتم العثور على مستخدمين */}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">لا يوجد مستخدمين مطابقين للبحث</p>
              </div>
            )}
          </div>
        )}

        {/* 6. التبويب: الطلبات الشاملة - بدون تغيير */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-navy">جميع الطلبات</h2>
            <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-900 text-white text-[10px]">
                    <tr>
                      <th className="p-4">رقم الطلب</th>
                      <th className="p-4">العميل</th>
                      <th className="p-4">المورد</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="p-4 font-mono">#{o.id.substring(0,8)}</td>
                        <td className="p-4 font-bold">{o.customerName}</td>
                        <td className="p-4 text-gray-600">{o.items?.[0]?.supplier || 'غير محدد'}</td>
                        <td className="p-4 text-gray-500">{formatDate(o.date)}</td>
                        <td className="p-4">
                          <select 
                            value={o.status}
                            onChange={(e) => onUpdateOrderStatus(o.id, e.target.value as any)}
                            className={`border rounded-full px-3 py-1 text-[10px] font-black ${
                              o.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                              o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              o.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                              'bg-blue-50 text-blue-600 border-blue-200'
                            }`}
                          >
                            <option value="pending">⏳ قيد المراجعة</option>
                            <option value="processing">⚙️ جاري التجهيز</option>
                            <option value="shipped">🚚 تم الشحن</option>
                            <option value="delivered">✅ تم التسليم</option>
                            <option value="cancelled">🚫 ملغي</option>
                          </select>
                        </td>
                        <td className="p-4 font-black text-emerald-600">{formatEnNumber(o.total)} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* مودال إضافة/تعديل المستخدم - بدون تغيير */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">
                {editingUserId ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (editingUserId) {
                  onUpdateUser(editingUserId, userFormData);
                } else {
                  onAddUser(userFormData);
                }
                setIsUserModalOpen(false);
              }}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">اسم الشركة</label>
                  <input 
                    required
                    type="text"
                    value={userFormData.company}
                    onChange={(e) => setUserFormData({...userFormData, company: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="اسم المنشأة"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">اسم المسؤول</label>
                  <input 
                    required
                    type="text"
                    value={userFormData.displayName}
                    onChange={(e) => setUserFormData({...userFormData, displayName: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="الاسم الكامل"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">رقم الجوال</label>
                  <input 
                    required
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({...userFormData, phone: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="05xxxxxxxx"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">البريد الإلكتروني</label>
                  <input 
                    required
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="example@domain.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">اسم المستخدم</label>
                  <input 
                    required
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">كلمة المرور</label>
                  <input 
                    required
                    type="text"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="********"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الدور</label>
                  <select 
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({...userFormData, role: e.target.value as 'seller' | 'buyer'})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  >
                    <option value="seller">مورد</option>
                    <option value="buyer">مشتري</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الحالة</label>
                  <select 
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({...userFormData, status: e.target.value as 'active' | 'suspended'})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  >
                    <option value="active">نشط</option>
                    <option value="suspended">معطل</option>
                  </select>
                </div>
              </div>

              {/* ربط المشتري بمورد */}
              {userFormData.role === 'buyer' && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">ربط بمورد (اختياري)</label>
                  <select 
                    value={userFormData.linkedSupplierId || ''}
                    onChange={(e) => {
                      const selectedSupplierId = e.target.value;
                      const selectedSupplier = users.find(u => u.id === selectedSupplierId);
                      setUserFormData({
                        ...userFormData, 
                        linkedSupplierId: selectedSupplierId || null,
                        supplierName: selectedSupplier?.company || ''
                      });
                    }}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  >
                    <option value="">غير مرتبط</option>
                    {users.filter(u => u.role === 'seller').map(seller => (
                      <option key={seller.id} value={seller.id}>{seller.company}</option>
                    ))}
                  </select>
                  <p className="text-[8px] text-gray-400 mt-1">إذا تم الربط، سيرى المشتري منتجات هذا المورد فقط</p>
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
                >
                  {editingUserId ? 'حفظ التعديلات' : 'إضافة المستخدم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال إضافة/تعديل المنتج (القديم) - بدون تغيير */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">
                {editingProductId ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (editingProductId) {
                  onUpdateProduct(editingProductId, productForm);
                } else {
                  onAddProduct(productForm);
                }
                setIsProductModalOpen(false);
              }}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {productForm.imageUrl ? (
                      <img src={productForm.imageUrl} className="w-full h-full object-cover" alt="product" />
                    ) : (
                      <span className="text-4xl text-gray-400">📦</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">اسم المنتج</label>
                  <input 
                    required
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="اسم المنتج"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الباركود</label>
                  <input 
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="رقم الباركود"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">المورد</label>
                  <select 
                    required
                    value={productForm.supplier}
                    onChange={(e) => {
                      const selectedSupplier = users.find(u => u.company === e.target.value);
                      setProductForm({
                        ...productForm, 
                        supplier: e.target.value,
                        supplierId: selectedSupplier?.id || ''
                      });
                    }}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  >
                    <option value="">اختر المورد</option>
                    {users.filter(u => u.role === 'seller').map(seller => (
                      <option key={seller.id} value={seller.company}>{seller.company}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الفئة</label>
                  <input 
                    required
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="مثال: ألبان, خضروات"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">السعر (ج.م)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الخصم (%)</label>
                  <input 
                    type="number"
                    value={productForm.discount}
                    onChange={(e) => setProductForm({...productForm, discount: Number(e.target.value)})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">المخزون</label>
                  <input 
                    required
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">ترتيب العرض</label>
                  <input 
                    type="number"
                    value={productForm.sortOrder}
                    onChange={(e) => setProductForm({...productForm, sortOrder: Number(e.target.value)})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">تاريخ الانتهاء</label>
                  <input 
                    type="date"
                    value={productForm.expiryDate}
                    onChange={(e) => setProductForm({...productForm, expiryDate: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الحالة</label>
                  <select 
                    value={productForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setProductForm({...productForm, isActive: e.target.value === 'active'})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  >
                    <option value="active">نشط (ظاهر)</option>
                    <option value="inactive">مخفي</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">وصف المنتج</label>
                  <textarea 
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    rows={3}
                    placeholder="وصف مختصر للمنتج..."
                  />
                </div>

                {/* قسم العروض */}
                <div className="col-span-2 bg-purple-50 p-4 rounded-xl">
                  <h4 className="font-black text-sm text-purple-600 mb-3">🎁 عروض الكميات</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase">عند شراء</label>
                      <input 
                        type="number"
                        value={productForm.offer?.buyQty || 0}
                        onChange={(e) => setProductForm({
                          ...productForm, 
                          offer: { ...productForm.offer, buyQty: Number(e.target.value) }
                        })}
                        className="w-full p-3 border rounded-xl text-sm mt-1"
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase">يحصل على مجاناً</label>
                      <input 
                        type="number"
                        value={productForm.offer?.getQty || 0}
                        onChange={(e) => setProductForm({
                          ...productForm, 
                          offer: { ...productForm.offer, getQty: Number(e.target.value) }
                        })}
                        className="w-full p-3 border rounded-xl text-sm mt-1"
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
                >
                  {editingProductId ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال جديد: إضافة/تعديل منتج أساسي */}
      {isBaseProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">
                {editingBaseProductId ? 'تعديل منتج أساسي' : 'إضافة منتج أساسي جديد'}
              </h3>
              <button onClick={() => setIsBaseProductModalOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (editingBaseProductId) {
                  await dbService.updateBaseProduct(editingBaseProductId, baseProductForm);
                } else {
                  await dbService.addBaseProduct(baseProductForm);
                }
                setIsBaseProductModalOpen(false);
                loadBaseProducts();
              }}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">اسم المنتج</label>
                  <input 
                    required
                    type="text"
                    value={baseProductForm.name}
                    onChange={(e) => setBaseProductForm({...baseProductForm, name: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="اسم المنتج"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الباركود</label>
                  <input 
                    required
                    type="text"
                    value={baseProductForm.barcode}
                    onChange={(e) => setBaseProductForm({...baseProductForm, barcode: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="رقم الباركود"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الفئة</label>
                  <input 
                    required
                    type="text"
                    value={baseProductForm.category}
                    onChange={(e) => setBaseProductForm({...baseProductForm, category: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="مثال: ألبان, خضروات"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الفئة الفرعية</label>
                  <input 
                    type="text"
                    value={baseProductForm.subCategory || ''}
                    onChange={(e) => setBaseProductForm({...baseProductForm, subCategory: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="اختياري"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">الوصف</label>
                  <textarea 
                    value={baseProductForm.description || ''}
                    onChange={(e) => setBaseProductForm({...baseProductForm, description: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    rows={3}
                    placeholder="وصف المنتج"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">صورة العلامة التجارية</label>
                  <input 
                    type="text"
                    value={baseProductForm.brandImage || ''}
                    onChange={(e) => setBaseProductForm({...baseProductForm, brandImage: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="رابط الصورة"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">صورة المعلومات الغذائية</label>
                  <input 
                    type="text"
                    value={baseProductForm.nutritionImage || ''}
                    onChange={(e) => setBaseProductForm({...baseProductForm, nutritionImage: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="رابط الصورة"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الحالة</label>
                  <select 
                    value={baseProductForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setBaseProductForm({...baseProductForm, isActive: e.target.value === 'active'})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
                >
                  {editingBaseProductId ? 'حفظ التعديلات' : 'إضافة المنتج الأساسي'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال جديد: إضافة/تعديل علاقة منتج بمورد */}
      {isSupplierProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">
                {editingSupplierProductId ? 'تعديل علاقة منتج بمورد' : 'إضافة علاقة جديدة'}
              </h3>
              <button onClick={() => setIsSupplierProductModalOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (editingSupplierProductId) {
                  await dbService.updateSupplierProduct(editingSupplierProductId, supplierProductForm);
                } else {
                  await dbService.addSupplierProduct(supplierProductForm);
                }
                setIsSupplierProductModalOpen(false);
                loadSupplierProducts();
              }}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">المنتج الأساسي</label>
                  <select
                    required
                    value={supplierProductForm.baseProductId}
                    onChange={(e) => setSupplierProductForm({...supplierProductForm, baseProductId: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  >
                    <option value="">اختر المنتج الأساسي</option>
                    {baseProducts.map(bp => (
                      <option key={bp.id} value={bp.id}>{bp.name} - {bp.barcode}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">المورد</label>
                  <select
                    required
                    value={supplierProductForm.supplierId}
                    onChange={(e) => {
                      const supplier = users.find(u => u.id === e.target.value);
                      setSupplierProductForm({
                        ...supplierProductForm,
                        supplierId: e.target.value,
                        supplierName: supplier?.company || ''
                      });
                    }}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  >
                    <option value="">اختر المورد</option>
                    {users.filter(u => u.role === 'seller').map(seller => (
                      <option key={seller.id} value={seller.id}>{seller.company}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">السعر (ج.م)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={supplierProductForm.price}
                    onChange={(e) => setSupplierProductForm({...supplierProductForm, price: Number(e.target.value)})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">المخزون</label>
                  <input 
                    required
                    type="number"
                    value={supplierProductForm.stock}
                    onChange={(e) => setSupplierProductForm({...supplierProductForm, stock: Number(e.target.value)})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الخصم (%)</label>
                  <input 
                    type="number"
                    value={supplierProductForm.discount || 0}
                    onChange={(e) => setSupplierProductForm({...supplierProductForm, discount: Number(e.target.value)})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الحد الأدنى للطلب</label>
                  <input 
                    type="number"
                    value={supplierProductForm.minOrderQuantity || 1}
                    onChange={(e) => setSupplierProductForm({...supplierProductForm, minOrderQuantity: Number(e.target.value)})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">عند شراء (X)</label>
                  <input 
                    type="number"
                    value={supplierProductForm.offer?.buyQty || 0}
                    onChange={(e) => setSupplierProductForm({
                      ...supplierProductForm,
                      offer: { 
                        ...supplierProductForm.offer, 
                        buyQty: Number(e.target.value),
                        type: 'buy_x_get_y'
                      }
                    })}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">يحصل على (Y) مجاناً</label>
                  <input 
                    type="number"
                    value={supplierProductForm.offer?.getQty || 0}
                    onChange={(e) => setSupplierProductForm({
                      ...supplierProductForm,
                      offer: { 
                        ...supplierProductForm.offer, 
                        getQty: Number(e.target.value) 
                      }
                    })}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">تاريخ الانتهاء</label>
                  <input 
                    type="date"
                    value={supplierProductForm.expiryDate || ''}
                    onChange={(e) => setSupplierProductForm({...supplierProductForm, expiryDate: e.target.value})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">ترتيب العرض</label>
                  <input 
                    type="number"
                    value={supplierProductForm.sortOrder || 0}
                    onChange={(e) => setSupplierProductForm({...supplierProductForm, sortOrder: Number(e.target.value)})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">الحالة</label>
                  <select 
                    value={supplierProductForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setSupplierProductForm({...supplierProductForm, isActive: e.target.value === 'active'})}
                    className="w-full p-3 border rounded-xl text-sm mt-1"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
                >
                  {editingSupplierProductId ? 'حفظ التعديلات' : 'إضافة العلاقة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ESB2BAdmin;