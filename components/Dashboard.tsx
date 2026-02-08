
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_STATS, MOCK_PRODUCTS } from '../constants';
import { getBusinessInsights } from '../services/geminiService';
import { Insight } from '../types';

const Dashboard: React.FC = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      const data = await getBusinessInsights(MOCK_PRODUCTS, MOCK_STATS);
      setInsights(data);
      setLoading(false);
    };
    fetchInsights();
  }, []);

  const stats = [
    { label: 'إجمالي المبيعات (الشهر)', value: '67,000 ر.س', change: '+12%', color: 'text-green-600', icon: '💰' },
    { label: 'الطلبات النشطة', value: '18', change: '5 قيد الشحن', color: 'text-blue-600', icon: '📦' },
    { label: 'متوسط قيمة الطلب', value: '3,720 ر.س', change: '+5%', color: 'text-purple-600', icon: '💳' },
    { label: 'الموردون المعتمدون', value: '42', change: '3 جدد', color: 'text-orange-600', icon: '🤝' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">نظرة عامة على الأعمال</h1>
        <p className="text-sm text-gray-500">آخر تحديث: اليوم، 10:30 صباحاً</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse">
            <div className="text-3xl bg-gray-50 w-12 h-12 flex items-center justify-center rounded-lg">{stat.icon}</div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-900">{stat.value}</h3>
              <p className={`text-xs font-medium ${stat.color}`}>{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart and AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-gray-800">أداء المبيعات</h3>
            <select className="text-sm border-none bg-gray-50 rounded px-2 py-1 outline-none">
              <option>آخر 6 أشهر</option>
              <option>آخر سنة</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_STATS}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Sidebar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💡</span>
            <h3 className="font-bold text-lg text-gray-800">توصيات الذكاء الاصطناعي</h3>
          </div>
          
          <div className="flex-1 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm">جاري تحليل البيانات...</p>
              </div>
            ) : (
              insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.type === 'growth' ? 'bg-green-50 border-green-500' :
                    insight.type === 'warning' ? 'bg-red-50 border-red-500' :
                    'bg-blue-50 border-blue-500'
                  }`}
                >
                  <h4 className="font-bold text-sm text-gray-900 mb-1">{insight.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{insight.content}</p>
                </div>
              ))
            )}
          </div>
          
          <button className="mt-6 w-full py-2 bg-gray-50 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-100 transition-colors">
            تحديث التحليلات
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-800">أحدث الطلبات</h3>
        </div>
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">رقم الطلب</th>
              <th className="px-6 py-4">العميل</th>
              <th className="px-6 py-4">التاريخ</th>
              <th className="px-6 py-4">المبلغ</th>
              <th className="px-6 py-4">الحالة</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors text-sm">
                <td className="px-6 py-4 font-bold text-blue-600">#ORD-902{i}</td>
                <td className="px-6 py-4 font-medium">شركة المنهل للتجارة</td>
                <td className="px-6 py-4 text-gray-500">منذ 3 ساعات</td>
                <td className="px-6 py-4 font-bold">12,450 ر.س</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    i % 2 === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {i % 2 === 0 ? 'تم الشحن' : 'قيد المعالجة'}
                  </span>
                </td>
                <td className="px-6 py-4 text-left">
                  <button className="text-gray-400 hover:text-blue-600">تفاصيل</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
