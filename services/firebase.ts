
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// إعدادات مشروع Firebase الجديد: es-b2b
const firebaseConfig = {
  apiKey: "AIzaSyD0e1H_esNJTHLc5OyWVzPEqC5edSbm6w4",
  authDomain: "easy-smart-b2b-9e554.firebaseapp.com",
  projectId: "easy-smart-b2b-9e554",
  storageBucket: "easy-smart-b2b-9e554.firebasestorage.app",
  messagingSenderId: "30885149347",
  appId: "1:30885149347:web:0a0611af2a5980ea791d16",
  measurementId: "G-3KRNSEJVDF"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تصدير الخدمات الأساسية
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
