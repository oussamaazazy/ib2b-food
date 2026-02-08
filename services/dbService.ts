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
  limit
} from "firebase/firestore";
import { db } from "./firebase";
import { Product, Order, AppUser } from "../types";

const PRODUCTS_COL = "products";
const ORDERS_COL = "orders";
const USERS_COL = "users";

// تنظيف البيانات من أي قيم undefined لتجنب أخطاء Firestore
const sanitize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) => 
    value === undefined ? null : value
  ));
};

export const dbService = {
  // --- إدارة المنتجات ---
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
  }
};