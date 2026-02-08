
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // تأكد من إضافة هذا السطر هنا

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// في ملف التسجيل الرئيسي للتطبيق
if ('serviceWorker' in navigator) {
  // لا تقم بتسجيل SW في بيئة التطوير
  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.log('ServiceWorker registration failed: ', error);
      });
    });
  } else {
    // في التطوير، تأكد من إلغاء أي SW مسجل مسبقاً
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
}