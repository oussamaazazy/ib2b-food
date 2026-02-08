/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_AI_API_KEY: string;
  // أضف أي متغيرات env ثانية هنا
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
