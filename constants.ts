import { BusinessStat } from './types';

// أرقام الهواتف الأساسية
export const SUPPLIER_PHONE = '+966597892723';
export const CUSTOMER_PHONE = '+966566756808';

// اترك الإحصائيات مؤقتاً إذا كانت تظهر في لوحة التحكم (Dashboard)
export const MOCK_STATS: BusinessStat[] = [
  { month: 'يناير', sales: 120000, orders: 450 },
  { month: 'فبراير', sales: 150000, orders: 520 },
  { month: 'مارس', sales: 140000, orders: 480 },
  { month: 'أبريل', sales: 190000, orders: 630 },
];