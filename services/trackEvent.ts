import { getSessionId } from "../session/session";

const WEBHOOK_URL = import.meta.env.VITE_SHEET_TRACK_URL;
const APP_VERSION = "1.0.0";
const ENV = import.meta.env.NODE_ENV || "development";

type TrackPayload = {
  event: string;
  action?: string;
  uid?: string;
  email?: string;
  role?: string;
  page?: string;
  entityType?: string;
  entityId?: string;
  status?: string;
  duration?: number;
  data?: any;
};

// دالة تنفيذ عملية الإرسال الفعلية
const executeTrackEvent = async (payload: TrackPayload) => {
  const fullPayload = {
    ...payload,
    sessionId: getSessionId(),
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    version: APP_VERSION,
    env: ENV,
    timestamp: new Date().toISOString(),
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
  };

  try {
    // استخدم FormData لتجنب مشاكل CORS مع Google Apps Script
    const formData = new FormData();
    formData.append('data', JSON.stringify(fullPayload));
    
    // استخدم mode: 'no-cors' للطلبات إلى Google Apps Script
    // هذا يتجنب مشاكل CORS ويتقبل أننا لا نستطيع قراءة الاستجابة
    await fetch(WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors", // مهم: لا تحاول قراءة الاستجابة
      body: formData,
      // لا تضع headers مع 'no-cors' لأن المتصفح يتحكم فيها
    });
    
    // تسجيل النجاح فقط في وضع التطوير
    if (ENV === 'development') {
      console.debug('📊 Track event sent:', payload.event);
    }
    
  } catch (err) {
    // في حالة no-cors، الـ catch لن يشتغل إلا لاستثناءات الشبكة
    // لذلك نستخدم console.warn فقط لأخطاء الشبكة
    console.warn("📊 Tracking network error (expected with no-cors mode)");
  }
};

// دالة رئيسية مع تأجيل التنفيذ لتحسين الأداء
export const trackEvent = async (payload: TrackPayload) => {
  // تأجيل الإرسال لعدم تأثير على تجربة المستخدم
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(
      () => {
        executeTrackEvent(payload);
      },
      { timeout: 2000 } // تأخير أقصاه 2 ثانية
    );
  } else if ('setTimeout' in window) {
    // Fallback للمتصفحات القديمة
    setTimeout(() => {
      executeTrackEvent(payload);
    }, 100); // تأخير 100ms
  } else {
    // التنفيذ المباشر كحل أخير
    executeTrackEvent(payload);
  }
};

// دالة مساعدة لتتبع الصفحات
export const trackPageView = (pageName?: string) => {
  trackEvent({
    event: "page_view",
    page: pageName || window.location.pathname,
    action: "navigation",
    data: {
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    },
  });
};

// دالة مساعدة لتتبع الأخطاء
export const trackError = (error: Error, context?: string) => {
  trackEvent({
    event: "error",
    action: "client_error",
    status: "error",
    data: {
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href,
    },
  });
};

// دالة مساعدة لتتبع إجراءات المستخدم
export const trackUserAction = (
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: any
) => {
  trackEvent({
    event: "user_action",
    action,
    entityType,
    entityId,
    data: metadata,
  });
};