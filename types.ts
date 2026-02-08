
export interface PriceTier {
  minQuantity: number;
  price: number;
}

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
  sortOrder?: number; // 👈 أضف هذا السطر هنا
  discount?: number;

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
  linkedSupplierId?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerId: string; // 👈 إضافة مهمة: لربط الطلب بحساب المستخدم بدقة حتى لو تغير اسمه
  date: string;
  timestamp?: any; // يفضل أن يكون من نوع Timestamp الخاص بـ Firebase
  total: number;
  subtotal: number; // 👈 إضافة: الإجمالي قبل الضريبة
  tax: number;      // 👈 إضافة: قيمة الضريبة (15%) بشكل منفصل للشفافية
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  
  // تحديث محتوى العناصر (items)
  items: { 
    productId: string;   // 👈 إضافة: مهمة جداً للرجوع لبيانات المنتج الأصلي
    productName: string; 
    quantity: number; 
    price: number;       // السعر وقت الشراء (لحمايته من تغييرات الأسعار لاحقاً)
    imageUrl?: string; 
    barcode?: string;
    supplier?: string;   // 👈 إضافة: لمعرفة مورد كل قطعة داخل الطلب
  }[];

  paymentMethod?: string;
  shippingAddress?: string;
  customerPhone?: string; // 👈 إضافة: لسهولة تواصل المندوب مع العميل
  notes?: string;
  deliveryFee?: number;   // 👈 إضافة: إذا كان هناك رسوم توصيل
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
