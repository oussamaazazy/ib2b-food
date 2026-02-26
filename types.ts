export interface PriceTier {
  minQuantity: number;
  price: number;
}

// =============== هياكل البيانات الجديدة للمنتجات المركزية ===============
// المنتج الأساسي (بيانات ثابتة)
export interface BaseProduct {
  id: string;
  name: string;
  barcode: string; // الباركود موحد لجميع الموردين
  category: string;
  subCategory?: string;
  description: string;
  images?: string[];
  brandImage?: string;
  nutritionImage?: string;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// علاقة المنتج بالمورد (أسعار ومخزون خاصة بكل مورد)
export interface SupplierProduct {
  id: string; // معرف فريد للعلاقة
  baseProductId: string; // رابط للمنتج الأساسي
  supplierId: string; // رابط للمورد
  supplierName: string; // اسم المورد (للسهولة)
  price: number;
  stock: number;
  discount?: number;
  offer?: {
    type: 'buy_x_get_y' | 'bulk_discount';
    buyQty: number;
    getQty: number;
  } | null;
  minOrderQuantity?: number;
  isActive?: boolean;
  sortOrder?: number;
  expiryDate?: string;
  tiers?: PriceTier[]; // التسعير المتدرج (كميات أكبر بأسعار أقل)
  createdAt?: any;
  updatedAt?: any;
}
// =========================================================================

// المنتج الحالي - سيبقى للتوافق مع الكود القديم
export interface Product {
  id: string;
  name: string;
  barcode?: string;
  category: string;
  subCategory?: string;
  price: number;
  stock: number;
  expiryDate?: string;
  description: string;
  images?: string[];
  imageUrl?: string;
  brandImage?: string;
  nutritionImage?: string;
  isBestSeller?: boolean;
  isActive?: boolean;
  isVisible?: boolean;
  supplier: string;
  supplierId?: string; // معرف المورد (للربط الدقيق)
  minOrderQuantity?: number;
  rating?: number;
  reviewsCount?: number;
  isVerified?: boolean;
  tiers?: PriceTier[];
  offer?: {
    type: 'buy_x_get_y' | 'bulk_discount';
    buyQty: number; // الكمية التي يشتريها العميل (مثلاً 2)
    getQty: number; // الكمية المجانية (مثلاً 1)
    minQty?: number;
    discountPrice?: number;
  } | null;
  variants?: any[];
  reviews?: any[];
  sortOrder?: number;
  discount?: number;
  
  // حقول إضافية للتوافق مع النظام الجديد (اختياري)
  baseProductId?: string; // إذا كان المنتج محولاً للنظام الجديد
}

export interface BusinessStat {
  month: string;
  sales: number;
  orders: number;
}

export interface Insight {
  title: string;
  content: string;
  type: 'growth' | 'warning' | 'info';
}

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  password?: string;
  role: 'admin' | 'seller' | 'buyer';
  status: 'active' | 'suspended';
  company?: string;
  logoUrl?: string;
  createdAt?: any;
  phone?: string;
  location?: string;
  paymentTerms?: 'credit' | 'cash' | 'both';
  linkedSupplierId?: string; // للمشتري: معرف المورد المرتبط به
  supplierName?: string; // اسم المورد المرتبط (للعرض)
}

export interface Order {
  id: string;
  customerName: string;
  customerId: string; // لربط الطلب بحساب المستخدم بدقة حتى لو تغير اسمه
  date: string;
  timestamp?: any; // يفضل أن يكون من نوع Timestamp الخاص بـ Firebase
  total: number;
  subtotal: number; // الإجمالي قبل الضريبة
  tax: number;      // قيمة الضريبة (15%) بشكل منفصل للشفافية
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  
  // تحديث محتوى العناصر (items)
  items: { 
    productId: string;   // مهمة جداً للرجوع لبيانات المنتج الأصلي
    productName: string; 
    quantity: number; 
    price: number;       // السعر وقت الشراء (لحمايته من تغييرات الأسعار لاحقاً)
    imageUrl?: string; 
    barcode?: string;
    supplier?: string;   // لمعرفة مورد كل قطعة داخل الطلب
    supplierId?: string; // معرف المورد للربط الدقيق
    
    // حقول إضافية للنظام الجديد
    baseProductId?: string; // المنتج الأساسي (إذا كان محولاً)
    supplierProductId?: string; // معرف علاقة المنتج بالمورد
  }[];

  paymentMethod?: string;
  shippingAddress?: string;
  customerPhone?: string; // لسهولة تواصل المندوب مع العميل
  notes?: string;
  deliveryFee?: number;   // إذا كان هناك رسوم توصيل
}

export interface Notification {
  id: string;
  type: 'order' | 'update' | 'info';
  title: string;
  message: string;
}

// Added missing exports for Market Intelligence analysis

/**
 * Represents a price entry from a specific verified store.
 */
export interface MarketEntry {
  store_name: string;
  current_price: number | null;
  currency: string;
  product_url: string | null;
  fetch_date: string;
  stock_status: string;
  notes?: string;
}

/**
 * Represents the structured analysis data extracted from market scanning.
 */
export interface StructuredAnalysis {
  product_info: {
    name: string;
    brand: string;
    weight: string;
    flavor: string;
  };
  market_data: MarketEntry[];
  analytics: {
    min_price: number | null;
    max_price: number | null;
    avg_price: number | null;
    suggested_local_price: number | null;
    strategy_note: string;
  };
}

/**
 * Represents a source URL and title from search grounding metadata.
 */
export interface GroundingSource {
  title: string;
  uri: string;
}

/**
 * Complete response object returned by the product analysis service.
 */
export interface AnalysisResponse {
  data: StructuredAnalysis;
  sources: GroundingSource[];
  timestamp: string;
}