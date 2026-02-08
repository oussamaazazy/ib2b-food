
import React, { useMemo } from 'react';
import { Product } from '../types';

interface ESB2BCategoriesProps {
  products: Product[];
  onSelectCategory: (name: string) => void;
}

const ESB2BCategories: React.FC<ESB2BCategoriesProps> = ({ products, onSelectCategory }) => {
  // استخراج التصنيفات والماركات بشكل ديناميكي وذكي
  const dynamicCategories = useMemo(() => {
    const categoriesMap: Record<string, { name: string; image: string; count: number; brands: string[] }> = {};

    products.forEach(p => {
      const catName = p.category || 'أصناف متنوعة';
      
      // تحديد أفضل صورة متوفرة للمنتج
      const productBestImage = p.imageUrl || (p.images && p.images.length > 0 ? p.images[0] : '');

      if (!categoriesMap[catName]) {
        categoriesMap[catName] = {
          name: catName,
          image: productBestImage, // تعيين أول صورة صالحة كصورة للقسم
          count: 0,
          brands: []
        };
      }

      // إذا كانت صورة القسم الحالية فارغة ولكن هذا المنتج لديه صورة، قم بتحديثها
      if (!categoriesMap[catName].image && productBestImage) {
        categoriesMap[catName].image = productBestImage;
      }

      categoriesMap[catName].count += 1;

      // جمع شعارات البراندات الفريدة لهذا القسم (بحد أقصى 5 شعارات للمعينة)
      if (p.brandImage && !categoriesMap[catName].brands.includes(p.brandImage)) {
        if (categoriesMap[catName].brands.length < 5) {
          categoriesMap[catName].brands.push(p.brandImage);
        }
      }
    });

    return Object.values(categoriesMap);
  }, [products]);

  // قائمة جميع البراندات المتوفرة في المتجر بالكامل للشريط السفلي
  const allAvailableBrands = useMemo(() => {
    const brands = products
      .map(p => p.brandImage)
      .filter((img): img is string => !!img);
    return Array.from(new Set(brands)).slice(0, 15);
  }, [products]);

  return (
    <div className="max-w-7xl mx-auto px-6 pb-40 animate-fadeIn font-['Cairo']" dir="rtl">
      <div className="py-12 text-right">
        <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">كاتالوج الأصناف والماركات</h1>
        <p className="text-slate-500 font-bold text-base">اكتشف {dynamicCategories.length} قسماً رئيسياً متاحاً في مخزون b2b حالياً</p>
      </div>

      {dynamicCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-24">
          {dynamicCategories.map((cat) => (
            <div 
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className="bg-white rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 cursor-pointer group flex flex-col"
            >
              {/* صورة القسم الكبيرة */}
              <div className="h-60 relative overflow-hidden bg-slate-50">
                <img 
                  src={cat.image || `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80`} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  alt={cat.name}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                <div className="absolute bottom-8 right-8 text-white text-right">
                  <div className="bg-blue-600/30 backdrop-blur-md px-3 py-1 rounded-full w-fit mb-3 border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest">{cat.count} صنف متوفر</p>
                  </div>
                  <h3 className="text-3xl font-black tracking-tight">{cat.name}</h3>
                </div>
              </div>

              {/* شعارات الماركات الموجودة داخل هذا القسم */}
              <div className="p-8 bg-white flex items-center justify-between border-t border-gray-50 mt-auto">
                 <div className="flex flex-col gap-3">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ماركات مسجلة في هذا القسم:</p>
                   <div className="flex -space-x-3 space-x-reverse">
                     {cat.brands.length > 0 ? (
                        cat.brands.map((brand, idx) => (
                          <div key={idx} className="w-12 h-12 rounded-2xl bg-white border-2 border-white shadow-lg p-2 flex items-center justify-center overflow-hidden transition-transform hover:z-10 hover:scale-110">
                            <img src={brand} className="w-full h-full object-contain" alt="brand" />
                          </div>
                        ))
                     ) : (
                       <div className="flex items-center gap-2 text-slate-300">
                         <div className="w-10 h-10 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-xs">؟</div>
                         <span className="text-[10px] font-bold italic">أصناف عامة</span>
                       </div>
                     )}
                   </div>
                 </div>
                 <div className="w-14 h-14 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-900 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner group-hover:shadow-blue-200">
                    <span className="text-2xl font-black">←</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[4rem] p-32 text-center border-4 border-dashed border-slate-100 flex flex-col items-center gap-6">
           <div className="text-7xl opacity-20 grayscale">📦</div>
           <div className="space-y-2">
             <h3 className="text-2xl font-black text-slate-800">لا توجد بيانات حالياً</h3>
             <p className="text-slate-400 font-bold max-w-xs mx-auto">بمجرد إضافة منتجات وتصنيفات من لوحة الإدارة، ستظهر هنا تلقائياً.</p>
           </div>
           <button onClick={() => window.location.reload()} className="bg-slate-900 text-[#feee00] px-10 py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all">تحديث البيانات 🔄</button>
        </div>
      )}

      {/* عرض شامل لجميع البراندات العالمية */}
      {allAvailableBrands.length > 0 && (
        <div className="bg-slate-900 rounded-[4rem] p-16 shadow-2xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-16 space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-white">شبكة الموردين والماركات</h2>
              <p className="text-slate-500 font-bold text-sm">نحن نوفر منتجات من أرقى العلامات التجارية لضمان جودة أعمالك</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-10 items-center">
              {allAvailableBrands.map((brand, idx) => (
                <div key={idx} className="group cursor-pointer flex flex-col items-center gap-4 transition-all hover:scale-110">
                  <div className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-5 flex items-center justify-center border border-white/10 group-hover:bg-white group-hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all duration-500">
                    <img src={brand} className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-700" alt="brand" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ESB2BCategories;
