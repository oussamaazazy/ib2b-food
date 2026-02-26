import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  where,
  limit,
  getDoc // 👈 إضافة getDoc للدوال الجديدة
} from "firebase/firestore";
import { db } from "./firebase";
import { Product, Order, AppUser, BaseProduct, SupplierProduct } from "../types"; // 👈 إضافة الأنواع الجديدة

const PRODUCTS_COL = "products";
const ORDERS_COL = "orders";
const USERS_COL = "users";

// 👇 إضافة أسماء المجموعات الجديدة
const BASE_PRODUCTS_COL = "baseProducts";
const SUPPLIER_PRODUCTS_COL = "supplierProducts";

// تنظيف البيانات من أي قيم undefined لتجنب أخطاء Firestore
const sanitize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) => 
    value === undefined ? null : value
  ));
};

export const dbService = {
  // --- إدارة المنتجات (القديمة) ---
  async getProducts(): Promise<Product[]> {
    try {
      const q = query(collection(db, PRODUCTS_COL), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return []; 
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (e) {
      console.error("Error fetching products:", e);
      return [];
    }
  },

  subscribeToProducts(callback: (products: Product[]) => void) {
    const q = query(collection(db, PRODUCTS_COL), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      callback(products);
    }, (error) => console.error("Products sub error:", error));
  },

  async addProduct(product: Omit<Product, 'id'>) {
    const cleanData = sanitize(product);
    return await addDoc(collection(db, PRODUCTS_COL), { ...cleanData, createdAt: serverTimestamp() });
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    if (!id) return;
    const docRef = doc(db, PRODUCTS_COL, id);
    await updateDoc(docRef, sanitize(updates));
  },

  async deleteProduct(id: string) {
    if (!id) return;
    await deleteDoc(doc(db, PRODUCTS_COL, id));
  },

  // ==================== دوال جديدة للمنتجات المركزية ====================
  
  // --- المنتجات الأساسية (Base Products) ---
  async addBaseProduct(product: Omit<BaseProduct, 'id'>): Promise<string> {
    const cleanData = sanitize(product);
    const docRef = await addDoc(collection(db, BASE_PRODUCTS_COL), { 
      ...cleanData, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async updateBaseProduct(id: string, updates: Partial<BaseProduct>) {
    if (!id) return;
    const docRef = doc(db, BASE_PRODUCTS_COL, id);
    await updateDoc(docRef, sanitize({ ...updates, updatedAt: serverTimestamp() }));
  },

  async deleteBaseProduct(id: string) {
    if (!id) return;
    // حذف المنتج الأساسي (ملاحظة: يجب حذف علاقاته أولاً)
    await deleteDoc(doc(db, BASE_PRODUCTS_COL, id));
  },

  async getBaseProductsByIds(ids: string[]): Promise<BaseProduct[]> {
    if (ids.length === 0) return [];
    
    // Firestore يدعم max 10 IDs في استعلام "in"
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }
    
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(
          collection(db, BASE_PRODUCTS_COL),
          where('__name__', 'in', chunk)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseProduct));
      })
    );
    
    return results.flat();
  },

  async findBaseProductByBarcode(barcode: string): Promise<BaseProduct | null> {
    const q = query(
      collection(db, BASE_PRODUCTS_COL),
      where('barcode', '==', barcode),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as BaseProduct;
  },

  async getAllBaseProducts(): Promise<BaseProduct[]> {
    try {
      const q = query(collection(db, BASE_PRODUCTS_COL), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseProduct));
    } catch (e) {
      console.error("Error fetching base products:", e);
      return [];
    }
  },

  subscribeToBaseProducts(callback: (products: BaseProduct[]) => void) {
    const q = query(collection(db, BASE_PRODUCTS_COL), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaseProduct));
      callback(products);
    }, (error) => console.error("Base products sub error:", error));
  },

  // --- علاقات المنتج بالمورد (Supplier Products) ---
  async addSupplierProduct(product: Omit<SupplierProduct, 'id'>): Promise<string> {
    const cleanData = sanitize(product);
    const docRef = await addDoc(collection(db, SUPPLIER_PRODUCTS_COL), { 
      ...cleanData, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async updateSupplierProduct(id: string, updates: Partial<SupplierProduct>) {
    if (!id) return;
    const docRef = doc(db, SUPPLIER_PRODUCTS_COL, id);
    await updateDoc(docRef, sanitize({ ...updates, updatedAt: serverTimestamp() }));
  },

  async deleteSupplierProduct(id: string) {
    if (!id) return;
    await deleteDoc(doc(db, SUPPLIER_PRODUCTS_COL, id));
  },

  async getSupplierProductsBySupplier(supplierId: string): Promise<SupplierProduct[]> {
    const q = query(
      collection(db, SUPPLIER_PRODUCTS_COL),
      where('supplierId', '==', supplierId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierProduct));
  },

  async getSupplierProductsByBaseProduct(baseProductId: string): Promise<SupplierProduct[]> {
    const q = query(
      collection(db, SUPPLIER_PRODUCTS_COL),
      where('baseProductId', '==', baseProductId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierProduct));
  },

  async getAllSupplierProducts(): Promise<SupplierProduct[]> {
    try {
      const snapshot = await getDocs(collection(db, SUPPLIER_PRODUCTS_COL));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierProduct));
    } catch (e) {
      console.error("Error fetching supplier products:", e);
      return [];
    }
  },

  subscribeToSupplierProducts(callback: (products: SupplierProduct[]) => void) {
    return onSnapshot(collection(db, SUPPLIER_PRODUCTS_COL), (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierProduct));
      callback(products);
    }, (error) => console.error("Supplier products sub error:", error));
  },

  // دوال مساعدة لدمج البيانات
  async getProductsForBuyer(buyerId: string): Promise<any[]> {
    try {
      // 1. جلب بيانات المشتري
      const buyer = await this.getUserById(buyerId);
      if (!buyer?.linkedSupplierId) return [];
      
      // 2. جلب منتجات المورد
      const supplierProducts = await this.getSupplierProductsBySupplier(buyer.linkedSupplierId);
      
      // 3. جلب المنتجات الأساسية
      const baseProductIds = supplierProducts.map(sp => sp.baseProductId);
      const baseProducts = await this.getBaseProductsByIds(baseProductIds);
      
      // 4. دمج البيانات
      return supplierProducts.map(sp => {
        const base = baseProducts.find(bp => bp.id === sp.baseProductId);
        return {
          ...base,
          ...sp,
          id: sp.id, // استخدام id العلاقة كمعرف للمنتج
          name: base?.name,
          category: base?.category,
          description: base?.description,
          images: base?.images,
          brandImage: base?.brandImage,
          nutritionImage: base?.nutritionImage,
          supplier: sp.supplierName,
          supplierId: sp.supplierId,
          price: sp.price,
          stock: sp.stock,
          discount: sp.discount,
          offer: sp.offer,
          minOrderQuantity: sp.minOrderQuantity || 1,
          expiryDate: sp.expiryDate,
          tiers: sp.tiers,
          baseProductId: sp.baseProductId
        };
      });
    } catch (e) {
      console.error("Error getting products for buyer:", e);
      return [];
    }
  },

  async getProductsForSupplier(supplierId: string): Promise<any[]> {
    try {
      const supplierProducts = await this.getSupplierProductsBySupplier(supplierId);
      const baseProductIds = supplierProducts.map(sp => sp.baseProductId);
      const baseProducts = await this.getBaseProductsByIds(baseProductIds);
      
      return supplierProducts.map(sp => {
        const base = baseProducts.find(bp => bp.id === sp.baseProductId);
        return {
          ...base,
          ...sp,
          id: sp.id,
          name: base?.name,
          category: base?.category,
          description: base?.description,
          images: base?.images,
          brandImage: base?.brandImage,
          nutritionImage: base?.nutritionImage,
          supplier: sp.supplierName,
          supplierId: sp.supplierId,
          price: sp.price,
          stock: sp.stock,
          discount: sp.discount,
          offer: sp.offer,
          minOrderQuantity: sp.minOrderQuantity || 1,
          expiryDate: sp.expiryDate,
          tiers: sp.tiers,
          baseProductId: sp.baseProductId
        };
      });
    } catch (e) {
      console.error("Error getting products for supplier:", e);
      return [];
    }
  },

  async getSuppliersForProduct(baseProductId: string): Promise<any[]> {
    try {
      const supplierProducts = await this.getSupplierProductsByBaseProduct(baseProductId);
      const supplierIds = supplierProducts.map(sp => sp.supplierId);
      const suppliers = await this.getUsersByIds(supplierIds);
      
      return suppliers.map(supplier => {
        const sp = supplierProducts.find(sp => sp.supplierId === supplier.id);
        return {
          ...supplier,
          price: sp?.price,
          stock: sp?.stock,
          discount: sp?.discount,
          offer: sp?.offer,
          supplierProductId: sp?.id
        };
      });
    } catch (e) {
      console.error("Error getting suppliers for product:", e);
      return [];
    }
  },

  // ======================================================================

  // --- إدارة الطلبات ---
  async addOrder(order: Omit<Order, 'id'>) {
    const cleanData = sanitize(order);
    return await addDoc(collection(db, ORDERS_COL), { ...cleanData, timestamp: serverTimestamp() });
  },

  subscribeToOrders(callback: (orders: Order[]) => void) {
    const q = query(collection(db, ORDERS_COL), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      callback(orders);
    });
  },

  async updateOrderStatus(id: string, status: Order['status']) {
    await updateDoc(doc(db, ORDERS_COL, id), { status });
  },

  // --- إدارة المستخدمين (محدثة لدعم البصمة والحالة) ---
  async getUsers(): Promise<AppUser[]> {
    try {
      const snapshot = await getDocs(collection(db, USERS_COL));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
    } catch (e) {
      console.error("Error fetching users:", e);
      return [];
    }
  },

  subscribeToUsers(callback: (users: AppUser[]) => void) {
    return onSnapshot(collection(db, USERS_COL), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      callback(users);
    });
  },

  async addUser(user: Omit<AppUser, 'id'>) {
    const cleanData = sanitize(user);
    return await addDoc(collection(db, USERS_COL), { 
      ...cleanData, 
      createdAt: serverTimestamp(),
      // ✅ تعديل ذكي: المشتري يسجل كـ 'pending' تلقائياً، وغيره (أدمن/مورد) كـ 'active'
      status: cleanData.status || (cleanData.role === 'buyer' ? 'pending' : 'active')
    });
  },

  async updateUser(id: string, updates: Partial<AppUser>) {
    if (!id) return;
    const docRef = doc(db, USERS_COL, id);
    await updateDoc(docRef, sanitize(updates));
  },

  async deleteUser(id: string) {
    if (!id) return;
    await deleteDoc(doc(db, USERS_COL, id));
  },

  // دالة مخصصة لمسح بصمة الجهاز (للاستخدام في لوحة التحكم لاحقاً)
  async resetUserDevice(id: string) {
    if (!id) return;
    const docRef = doc(db, USERS_COL, id);
    await updateDoc(docRef, { linkedDeviceId: null });
  },

  // دالة مخصصة لتحديث حالة المستخدم فقط (متوافقة مع App.tsx)
  async updateUserStatus(id: string, status: AppUser['status']) {
    if (!id) return;
    const docRef = doc(db, USERS_COL, id);
    // نستخدم updateDoc مباشرة هنا لضمان السرعة والتوافق
    await updateDoc(docRef, { status });
  },

  // دوال مساعدة إضافية للمستخدمين
  async getUserById(userId: string): Promise<AppUser | null> {
    try {
      const docRef = doc(db, USERS_COL, userId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as AppUser;
    } catch (e) {
      console.error("Error fetching user by ID:", e);
      return null;
    }
  },

  async getUsersByIds(ids: string[]): Promise<AppUser[]> {
    if (ids.length === 0) return [];
    
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }
    
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(
          collection(db, USERS_COL),
          where('__name__', 'in', chunk)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      })
    );
    
    return results.flat();
  }
};