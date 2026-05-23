import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot, Loader2, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { nlpService, ChatMessage } from '../lib/nlpService';
import { useApp } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { books, members, transactions } = useApp();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newUserMsg: ChatMessage = { role: 'user', parts: [{ text: userMessage }] };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const context = {
        userRole: currentUser.role,
        userName: currentUser.name,
        books: books.map(b => ({ title: b.title, author: b.author, category: b.category, status: b.status })),
        members: members.length,
        pendingTransactions: transactions.filter(t => t.status === 'Pending').length,
        currentPath: window.location.pathname
      };

      const aiResponse = await nlpService.chat(userMessage, context, messages);
      
      const newAiMsg: ChatMessage = { role: 'model', parts: [{ text: aiResponse }] };
      setMessages(prev => [...prev, newAiMsg]);
    } catch (error) {
      console.error("AI Chat failed:", error);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Maaf, sistem AI sedang mengalami gangguan teknis. Mohon coba lagi nanti." }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`bg-white shadow-2xl rounded-[32px] border border-black/5 overflow-hidden flex flex-col mb-4 w-[90vw] sm:w-[400px] ${isMinimized ? 'h-20' : 'h-[600px]'}`}
          >
            {/* Header */}
            <div className="bg-primary p-6 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-none">PustakaAI</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">Smart Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <MinusCircle className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4 bg-natural-bg/30 custom-scrollbar"
                >
                  {messages.length === 0 && (
                    <div className="text-center py-10 px-4">
                      <div className="w-16 h-16 bg-primary/5 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-primary/10">
                        <Bot className="w-8 h-8 text-primary/40" />
                      </div>
                      <h4 className="font-black text-text-title mb-2">Halo! Ada yang bisa saya bantu?</h4>
                      <p className="text-sm text-text-muted">Tanyakan apa saja tentang buku, status keanggotaan, atau cari rekomendasi bacaan.</p>
                      
                      <div className="mt-8 grid grid-cols-1 gap-2">
                        {["Rekomendasi buku coding?", "Apa itu Pustaka Universitas?", "Cek status pinjaman saya"].map((q) => (
                          <button
                            key={q}
                            onClick={() => {
                              setInput(q);
                              setTimeout(() => handleSend(), 50);
                            }}
                            className="text-xs font-bold text-primary p-3 bg-white border border-primary/10 rounded-2xl hover:bg-primary hover:text-white transition-all text-left"
                          >
                            "{q}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          msg.role === 'user' ? 'bg-primary/10 border-primary/20' : 'bg-white border-black/5 shadow-sm'
                        }`}>
                          {msg.role === 'user' ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-primary" />}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user' 
                          ? 'bg-primary text-white rounded-tr-none' 
                          : 'bg-white border border-black/5 shadow-sm text-text-title rounded-tl-none prose prose-p:my-1 prose-sm'
                        }`}>
                           <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-black/5 shadow-sm flex items-center justify-center shrink-0">
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        </div>
                        <div className="bg-white/50 p-4 rounded-2xl rounded-tl-none">
                           <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <form 
                  onSubmit={handleSend}
                  className="p-6 bg-white border-t border-black/5 flex gap-3"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tulis pesan..."
                    className="flex-1 bg-natural-bg p-4 rounded-2xl text-sm font-medium border border-transparent focus:border-primary/20 focus:bg-white transition-all outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:shadow-xl hover:shadow-primary/20 active:scale-90 transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl transition-all active:scale-90 hover:translate-y-[-4px] ${
          isOpen ? 'bg-secondary text-primary' : 'bg-primary text-white'
        }`}
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-secondary text-primary rounded-full text-[10px] font-black border-4 border-natural-bg flex items-center justify-center animate-bounce">
            1
          </div>
        )}
      </button>
    </div>
  );
}
