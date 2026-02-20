import { getSessionId } from "../session/session";

const WEBHOOK_URL = import.meta.env.VITE_SHEET_TRACK_URL;
const APP_VERSION = "1.0.0";
const ENV = "prod";

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

export const trackEvent = async (payload: TrackPayload) => {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        sessionId: getSessionId(),
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        version: APP_VERSION,
        env: ENV,
      }),
    });
  } catch (err) {
    console.warn("Tracking failed", err);
  }
};
