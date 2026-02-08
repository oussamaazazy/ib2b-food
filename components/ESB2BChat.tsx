
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Product } from '../types';

interface ESB2BChatProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

const ESB2BChat: React.FC<ESB2BChatProps> = ({ isOpen, onClose, products }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    {role: 'bot', text: 'مرحباً بك في مساعد ESB2B الذكي! أنا هنا لمساعدتك في العثور على أفضل المنتجات والأسعار لشركتك. كيف يمكنني خدمتك اليوم؟'}
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, {role: 'user', text: userMsg}]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `أنت مساعد ذكي في تطبيق "ESB2B" (EASY SMART B2B). تخصصك هو مساعدة الشركات في العثور على منتجات الجملة وتقديم نصائح تجارية. 
      المنتجات المتوفرة في الكتالوج هي: ${JSON.stringify(products.map(p => ({name: p.name, price: p.price, supplier: p.supplier})))}. 
      أجب باختصار وبأسلوب احترافي جداً وودي باللهجة العربية المناسبة لبيئة الأعمال.
      سؤال العميل: ${userMsg}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setMessages(prev => [...prev, {role: 'bot', text: response.text || 'عذراً، أواجه مشكلة بسيطة حالياً.'}]);
    } catch (error) {
      setMessages(prev => [...prev, {role: 'bot', text: 'لا يمكنني الاتصال بالذكاء الاصطناعي حالياً، حاول مرة أخرى لاحقاً.'}]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-lg h-[80vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        <div className="bg-[#feee00] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-xl">🤖</div>
            <div>
              <h3 className="font-black text-gray-800 text-sm">مساعد ESB2B الذكي</h3>
              <p className="text-[10px] text-gray-600 font-bold">ESB2B AI ⚡</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-xl">✕</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-bold leading-relaxed shadow-sm ${
                m.role === 'user' ? 'bg-[#3866df] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-end">
              <div className="bg-white p-3 rounded-2xl border shadow-sm flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="اسأل مساعد ESB2B..."
            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button 
            onClick={handleSend}
            className="bg-[#feee00] w-10 h-10 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all"
          >
            🚀
          </button>
        </div>
      </div>
    </div>
  );
};

export default ESB2BChat;
