
import React from 'react';
import { StructuredAnalysis } from '../types';

interface MarketReportProps {
  analysis: StructuredAnalysis;
}

const MarketReport: React.FC<MarketReportProps> = ({ analysis }) => {
  const { product_info, market_data, analytics } = analysis;

  const sortedMarketData = [...market_data].sort((a, b) => {
    if (a.current_price !== null && b.current_price === null) return -1;
    if (a.current_price === null && b.current_price !== null) return 1;
    if (a.current_price !== null && b.current_price !== null) return a.current_price - b.current_price;
    return a.store_name.localeCompare(b.store_name);
  });

  const activePricesCount = market_data.filter(d => d.current_price !== null).length;

  return (
    <div className="space-y-8 animate-fadeIn text-right" dir="rtl">
      {/* 11 Stores Coverage Dashboard */}
      <div className="bg-[#0A0F1D] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <i className="fas fa-satellite-dish text-blue-500"></i>
            <h3 className="text-xs font-black text-white uppercase">شبكة المسح الشامل (11 متجر)</h3>
          </div>
          <span className={`text-[10px] px-3 py-1 rounded-full font-black ${activePricesCount === 11 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-600/20 text-blue-400'}`}>
            تغطية السوق الحالية: {Math.round((activePricesCount / 11) * 100)}%
          </span>
        </div>
        <div className="grid grid-cols-11 gap-2">
          {market_data.map((item, i) => (
            <div 
              key={i} 
              title={item.store_name}
              className={`h-2 rounded-full transition-all duration-700 ${item.current_price ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}
            ></div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
           <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
             <div className="w-2 h-2 rounded-full bg-emerald-500"></div> تم استخراج السعر المباشر
           </div>
           <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
             <div className="w-2 h-2 rounded-full bg-slate-800"></div> يحتاج فحص يدوي
           </div>
        </div>
      </div>

      {/* Product Summary */}
      <div className="bg-[#0A0F1D] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 blur-[80px] rounded-full"></div>
        <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl shadow-blue-600/20 shrink-0">
            <i className="fas fa-barcode"></i>
          </div>
          <div className="flex-1 text-center md:text-right">
            <h2 className="text-2xl font-black text-white mb-2">{product_info.name || "منتج غير معروف"}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-xl text-[10px] font-black text-blue-400 uppercase">{product_info.brand || "بدون علامة"}</span>
              <span className="bg-slate-800/50 border border-white/5 px-4 py-1.5 rounded-xl text-[10px] font-bold text-slate-400">{product_info.weight || "غير محدد"}</span>
              <span className="bg-slate-800/50 border border-white/5 px-4 py-1.5 rounded-xl text-[10px] font-bold text-slate-400">{product_info.flavor || "بدون نكهة"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'أرخص منافس أونلاين', value: analytics.min_price, color: 'text-emerald-400', icon: 'fa-chevron-down' },
          { label: 'متوسط السوق المحلي', value: analytics.avg_price, color: 'text-blue-400', icon: 'fa-balance-scale' },
          { label: 'أعلى سعر مسجل', value: analytics.max_price, color: 'text-red-400', icon: 'fa-chevron-up' }
        ].map((stat, i) => (
          <div key={i} className="bg-[#0A0F1D] border border-white/5 p-6 rounded-3xl text-center group hover:border-blue-500/20 transition-all">
            <div className="flex justify-center mb-3">
               <i className={`fas ${stat.icon} ${stat.color} opacity-40 text-xs`}></i>
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-[0.2em]">{stat.label}</p>
            <p className={`text-3xl font-black ${stat.color}`}>
              {stat.value ? `${stat.value}` : '---'}
              {stat.value && <small className="text-[12px] opacity-50 mr-1 font-tajawal">SAR</small>}
            </p>
          </div>
        ))}
      </div>

      {/* Suggested Pricing Strategy */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 blur-[60px] rounded-full"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
           <div className="shrink-0 text-center">
             <p className="text-[10px] font-black opacity-70 uppercase mb-1">السعر المحلي المقترح (Smart Pricing)</p>
             <div className="text-6xl font-black tracking-tighter">
               {analytics.suggested_local_price || '---'}
               <span className="text-xl ml-2 opacity-50 italic">SAR</span>
             </div>
             <p className="text-[9px] mt-2 opacity-60 font-bold">خصم 3% عن أقل منافس</p>
           </div>
           <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
             <div className="flex items-start gap-3">
               <i className="fas fa-lightbulb text-yellow-400 mt-1"></i>
               <div>
                 <p className="text-[10px] font-black mb-1 opacity-80 uppercase">توصية المحرك</p>
                 <p className="text-xs font-medium leading-relaxed">{analytics.strategy_note}</p>
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* Detailed Market Table */}
      <div className="bg-[#0A0F1D] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <i className="fas fa-list text-blue-500 text-xs"></i>
            بيانات المتاجر المكتشفة
          </h3>
          <span className="text-[10px] font-bold text-slate-500 italic">تحديث: {new Date().toLocaleDateString('ar-SA')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-slate-500 font-black text-[9px] uppercase border-b border-white/5">
                <th className="px-8 py-5">اسم المتجر</th>
                <th className="px-8 py-5">السعر المباشر</th>
                <th className="px-8 py-5 text-center">الحالة</th>
                <th className="px-8 py-5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedMarketData.map((item, idx) => (
                <tr key={idx} className={`hover:bg-white/[0.02] transition-colors group ${!item.current_price ? 'opacity-50' : ''}`}>
                  <td className="px-8 py-5 font-black text-sm text-white group-hover:text-blue-400 transition-colors">
                    {item.store_name}
                  </td>
                  <td className="px-8 py-5">
                    {item.current_price ? (
                      <span className="text-lg font-black text-white font-mono">{item.current_price} <small className="text-[10px] text-slate-500 font-tajawal">SAR</small></span>
                    ) : (
                      <span className="text-slate-600 text-[10px] font-bold">لم يُعثر على سعر</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black ${item.current_price ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${item.current_price ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                      {item.current_price ? 'متوفر' : 'تحقق يدوياً'}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    {item.product_url ? (
                      <a 
                        href={item.product_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[10px] font-black py-2 px-6 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        <i className="fas fa-external-link-alt"></i>
                        زيارة المتجر
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold italic">لا يوجد رابط مباشر</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketReport;
