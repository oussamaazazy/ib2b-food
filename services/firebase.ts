
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// إعدادات مشروع Firebase الجديد: ib2bfoods
const firebaseConfig = {
  apiKey: "AIzaSyCUngz5_yWNrI3m8HWeXuhJoA1GXT7qPxM",
  authDomain: "easy-smart-1.firebaseapp.com",
  projectId: "easy-smart-1",
  storageBucket: "easy-smart-1.firebasestorage.app",
  messagingSenderId: "139910913979",
  appId: "1:139910913979:web:d05bfb3f8de295e0baae9e",
  measurementId: "G-TDFTPEPXZY"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تصدير الخدمات الأساسية
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
