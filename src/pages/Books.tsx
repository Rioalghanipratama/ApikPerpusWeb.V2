import React, { useState, useRef } from 'react';
import { Plus, Search, Filter, X, Trash2, Camera, RefreshCw, Wand2, Sparkles } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';
import { visionService } from '../lib/visionService';
import { nlpService } from '../lib/nlpService';

export default function Books() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [editingBook, setEditingBook] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{ code: string; title: string; location: string } | null>(null);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', category: 'Ilmu Komputer', quantity: 1 });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [notification, setNotification] = useState<string | null>(null);
  const { books, addBook, updateBook, deleteBook, requestBook } = useApp();
  const { currentUser, setIsLoginModalOpen, setIsRegInfoModalOpen } = useAuth();
  
  const [isSmartSearching, setIsSmartSearching] = useState(false);
  const [smartSearchQuery, setSmartSearchQuery] = useState('');

  const handleSmartSearch = async () => {
    if (!smartSearchQuery.trim() || isSmartSearching) return;
    
    setIsSmartSearching(true);
    try {
      const context = {
        books: books.map(b => ({ id: b.id, title: b.title, author: b.author, category: b.category, summary: b.summary })),
        task: "Filter the books based on the user's natural language request. Return a comma-separated list of EXACT book IDs that match or are relevant."
      };
      
      const response = await nlpService.chat(
        `Based on this request: "${smartSearchQuery}", which of these books are relevant? Return ONLY the book IDs separated by commas, nothing else. If none match, return 'NONE'.`,
        context
      );
      
      if (response.includes('NONE')) {
        setNotification("AI tidak menemukan buku yang spesifik untuk kueri tersebut.");
      } else {
        const matchedIds = response.split(',').map(id => id.trim());
        setSearchTerm("AI_MATCH:" + matchedIds.join(','));
        setNotification(`AI menemukan ${matchedIds.length} buku yang relevan.`);
      }
    } catch (err) {
      console.error("Smart search failed:", err);
      setNotification("Smart search gagal. Silakan coba lagi.");
    } finally {
      setIsSmartSearching(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      console.error("Camera access error:", err);
      setNotification("Gagal mengakses kamera. Pastikan izin kamera aktif.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleScanBook = async () => {
    if (!videoRef.current) return;
    
    setIsScanning(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      const bookData = await visionService.scanBook(imageData);
      
      setForm({
        title: bookData.title,
        author: bookData.author,
        isbn: bookData.isbn || '',
        category: bookData.category || 'Ilmu Komputer',
        quantity: 1
      });
      
      setIsScanModalOpen(false);
      setIsModalOpen(true);
      stopCamera();
      setNotification(`AI berhasil mengenali buku: ${bookData.title}`);
    } catch (error) {
      console.error("Scan failed:", error);
      setNotification("AI gagal mengenali buku. Silakan coba lagi atau input manual.");
    } finally {
      setIsScanning(false);
    }
  };
  
  const isAdmin = currentUser.role === 'admin';
  const isMember = currentUser.role === 'member';
  const isGuest = currentUser.role === 'guest';

  const categories = ['Semua', 'Ilmu Komputer', 'Software Engineering', 'Sistem Informasi', 'Sains', 'Teknologi', 'Sastra', 'Seni & Desain'];

  const handleRequest = (bookId: string) => {
    if (isGuest) {
      setIsRegInfoModalOpen(true);
      return;
    }
    const book = books.find(b => b.id === bookId);
    if (!book || book.availableQuantity <= 0) return;

    if (currentUser.memberId) {
      const { code, location } = requestBook(bookId, currentUser.memberId);
      setBookingResult({ code, title: book.title, location });
    }
  };

  const handleAddClick = () => {
    setEditingBook(null);
    setForm({ title: '', author: '', isbn: '', category: 'Ilmu Komputer', quantity: 1 });
    setIsModalOpen(true);
  };

  const handleEditClick = (book: any) => {
    setEditingBook(book.id);
    setForm({ 
      title: book.title, 
      author: book.author, 
      isbn: book.isbn, 
      category: book.category,
      quantity: book.quantity || 1
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus buku ini dari sistem?')) {
      deleteBook(id);
      setNotification('Buku berhasil dihapus dari sistem.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!form.title || !form.author) return;
    
    if (editingBook) {
      const existingBook = books.find(b => b.id === editingBook);
      if (existingBook) {
        const borrowedCount = existingBook.quantity - existingBook.availableQuantity;
        const newAvailable = Math.max(0, form.quantity - borrowedCount);
        updateBook(editingBook, { 
          ...form, 
          availableQuantity: newAvailable,
          status: newAvailable > 0 ? 'Available' : 'Borrowed' 
        });
      }
      setNotification('Informasi buku berhasil diperbarui.');
    } else {
      addBook({ ...form, status: 'Available', availableQuantity: form.quantity });
      setNotification(`Buku "${form.title}" berhasil ditambahkan ke katalog.`);
    }
    
    setIsModalOpen(false);
    setEditingBook(null);
    setForm({ title: '', author: '', isbn: '', category: 'Ilmu Komputer', quantity: 1 });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredBooks = books.filter(book => {
    if (searchTerm.startsWith('AI_MATCH:')) {
      const ids = searchTerm.replace('AI_MATCH:', '').split(',');
      return ids.includes(book.id);
    }
    const matchesSearch = 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.isbn.includes(searchTerm);
    
    const matchesCategory = selectedCategory === 'Semua' || book.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 relative">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-text-title sm:truncate sm:text-3xl sm:tracking-tight font-serif">
            Katalog Buku
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            {isAdmin ? "Kelola data buku yang tersedia di perpustakaan." : "Jelajahi dan temukan buku yang Anda butuhkan."}
          </p>
        </div>
        {isAdmin && (
          <div className="mt-4 flex flex-wrap gap-3 sm:ml-4 sm:mt-0">
            <button
              onClick={() => {
                setIsScanModalOpen(true);
                startCamera();
              }}
              className="inline-flex items-center gap-x-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm font-bold text-primary shadow-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-all hover:bg-primary hover:text-white"
            >
              <Wand2 className="h-5 w-5" />
              <span>AI Scan Book</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddClick()}
              className="inline-flex items-center gap-x-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              <Plus className="-ml-0.5 h-5 w-5 pointer-events-none" aria-hidden="true" />
              <span>Tambah Buku</span>
            </button>
          </div>
        )}
      </div>

      {notification && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right duration-300">
          <div className="bg-primary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm">{notification}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-natural-border">
        <div className="relative flex-grow max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-4 w-4 text-text-muted" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl bg-natural-panel border-none py-2.5 pl-11 pr-4 text-text-main text-sm focus:ring-2 focus:ring-primary placeholder:text-text-lighter"
            placeholder="Cari judul, penulis, atau ISBN..."
            value={searchTerm.startsWith('AI_MATCH:') ? '' : searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm.startsWith('AI_MATCH:') && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-[9px] font-black bg-primary text-white px-2 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1 animate-in zoom-in-50">
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </span>
              <button 
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-text-muted" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 bg-natural-panel rounded-xl p-1 border border-primary/5">
           <input
             type="text"
             placeholder="Tanya AI (cth: buku sosis...)"
             value={smartSearchQuery}
             onChange={(e) => setSmartSearchQuery(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
             className="w-32 bg-transparent py-1.5 px-3 text-xs font-medium outline-none"
           />
           <button
             onClick={handleSmartSearch}
             disabled={isSmartSearching || !smartSearchQuery}
             className="p-1.5 bg-primary text-white rounded-lg hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
             title="Smart AI Search"
           >
             {isSmartSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
           </button>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${selectedCategory !== 'Semua' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-title bg-natural-panel hover:bg-natural-hover'}`}
          >
            <Filter className="h-4 w-4" />
            {selectedCategory === 'Semua' ? 'Filter' : selectedCategory}
          </button>
          
          {showFilterDropdown && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowFilterDropdown(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-[70] overflow-hidden border border-natural-border animate-in fade-in zoom-in-95 duration-100">
                <div className="py-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setShowFilterDropdown(false);
                      }}
                      className={`block w-full text-left px-4 py-3 text-sm transition-colors ${selectedCategory === cat ? 'bg-primary/10 text-primary font-bold' : 'text-text-main hover:bg-natural-bg'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow-sm border border-natural-border sm:rounded-2xl bg-white">
              <table className="min-w-full divide-y divide-natural-border">
                <thead className="bg-natural-bg">
                  <tr>
                    <th scope="col" className="py-4 pl-4 pr-3 text-left text-xs font-bold text-text-light uppercase tracking-wider sm:pl-6">
                      Judul & Penulis
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-text-light uppercase tracking-wider">
                      ISBN
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-text-light uppercase tracking-wider">
                      Kategori
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-text-light uppercase tracking-wider">
                      Stok
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-text-light uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-natural-border bg-white">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-natural-bg/50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 text-left">
                        <div className="flex items-center">
                          <div className="h-10 w-8 flex-shrink-0 bg-natural-panel rounded flex items-center justify-center border border-natural-border">
                            <span className="text-text-muted font-bold text-xs">{book.title.charAt(0)}</span>
                          </div>
                          <div className="sm:ml-4">
                            <div className="font-bold text-text-title">{book.title}</div>
                            <div className="text-text-muted mt-0.5">{book.author}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-text-muted text-left font-mono">
                        {book.isbn}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-text-muted text-left">
                         <span className="inline-flex items-center rounded-md bg-natural-panel px-2.5 py-1 text-xs font-bold text-text-muted border border-natural-border">
                            {book.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-left">
                        <div className="flex flex-col">
                           <span className="font-bold text-text-title">{book.availableQuantity} <span className="text-[10px] text-text-muted font-normal">Sisa</span></span>
                           <span className="text-[10px] text-text-lighter">Total: {book.quantity}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-left">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                          book.availableQuantity > 0
                            ? 'bg-natural-bg text-primary border border-natural-border'
                            : 'bg-[#F1E9EA] text-red-600 border border-red-100'
                        }`}>
                          {book.availableQuantity > 0 ? 'Tersedia' : 'Habis'}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        {isAdmin ? (
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => handleEditClick(book)}
                              className="text-primary hover:text-opacity-80 font-bold underline underline-offset-4"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(book.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Hapus Buku"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : book.availableQuantity > 0 ? (
                          <button 
                            onClick={() => handleRequest(book.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                              isGuest 
                                ? 'bg-natural-bg text-primary border border-primary/20 hover:bg-primary/5' 
                                : 'bg-primary text-white hover:bg-opacity-90'
                            }`}
                          >
                            {isGuest ? 'Ingin Meminjam?' : 'Pinjam'}
                          </button>
                        ) : (
                          <span className="text-text-lighter italic text-xs">Habis</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Booking Success untuk Anggota */}
      {bookingResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden border border-natural-border p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
               <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-text-title mb-2">Booking Berhasil!</h3>
            <p className="text-sm text-text-muted mb-6">Silakan tunjukkan kode berikut ke petugas perpustakaan untuk mengambil buku.</p>
            
            <div className="bg-natural-bg border-2 border-dashed border-primary/20 rounded-2xl p-6 mb-4">
              <p className="text-xs font-bold text-text-light uppercase tracking-widest mb-1">Kode Booking</p>
              <p className="text-4xl font-mono font-black text-primary tracking-tighter">{bookingResult.code}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-left bg-natural-panel p-4 rounded-xl border border-natural-border">
                <p className="text-[10px] font-bold text-text-light uppercase tracking-wider mb-1">Lokasi Pengambilan:</p>
                <p className="text-sm font-black text-primary leading-tight">{bookingResult.location}</p>
                <p className="text-[10px] text-text-muted mt-1 font-medium">Buku telah dikunci untuk Anda.</p>
              </div>

              <div className="text-left bg-natural-panel p-3 rounded-xl border border-natural-border opacity-60">
                <p className="text-[9px] font-bold text-text-light uppercase">Buku:</p>
                <p className="text-xs font-bold text-text-title truncate">{bookingResult.title}</p>
              </div>
            </div>

            <button 
              onClick={() => setBookingResult(null)}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-natural-border animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-natural-border bg-white">
              <h3 className="text-lg font-bold text-text-title">{editingBook ? 'Edit Informasi Buku' : 'Tambah Buku Baru'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingBook(null); }} className="text-text-muted hover:text-text-main p-1"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 bg-white">
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-2">
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                     <Wand2 className="w-3 h-3" />
                     Smart AI Entry Tip
                   </p>
                   <p className="text-xs text-primary/80 mt-1 font-medium italic">Gunakan tombol "AI Scan Book" di dashboard untuk mengisi detail buku otomatis menggunakan Computer Vision.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-light uppercase tracking-wider mb-2">Judul Buku</label>
                  <input 
                    type="text" 
                    required 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    className="block w-full rounded-xl bg-natural-panel border border-natural-border py-2.5 px-4 text-text-main text-sm focus:ring-2 focus:ring-primary outline-none transition-all focus:bg-white" 
                    placeholder="Contoh: Pemrograman React Dasar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-light uppercase tracking-wider mb-2">Penulis</label>
                  <input 
                    type="text" 
                    required 
                    value={form.author} 
                    onChange={e => setForm({...form, author: e.target.value})} 
                    className="block w-full rounded-xl bg-natural-panel border border-natural-border py-2.5 px-4 text-text-main text-sm focus:ring-2 focus:ring-primary outline-none transition-all focus:bg-white" 
                    placeholder="Nama penulis..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-light uppercase tracking-wider mb-2">Total Stok</label>
                    <input 
                      type="number" 
                      min="1"
                      required 
                      value={form.quantity} 
                      onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})} 
                      className="block w-full rounded-xl bg-natural-panel border border-natural-border py-2.5 px-4 text-text-main text-sm focus:ring-2 focus:ring-primary outline-none transition-all focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-light uppercase tracking-wider mb-2">Kategori</label>
                    <select 
                      value={form.category} 
                      onChange={e => setForm({...form, category: e.target.value})} 
                      className="block w-full rounded-xl bg-natural-panel border border-natural-border py-2 px-4 text-text-main text-sm focus:ring-2 focus:ring-primary outline-none h-[42px] appearance-none"
                    >
                      {categories.filter(c => c !== 'Semua').map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-light uppercase tracking-wider mb-2">ISBN</label>
                  <input 
                    type="text" 
                    required 
                    value={form.isbn} 
                    onChange={e => setForm({...form, isbn: e.target.value})} 
                    className="block w-full rounded-xl bg-natural-panel border border-natural-border py-2.5 px-4 text-text-main text-sm focus:ring-2 focus:ring-primary outline-none transition-all focus:bg-white font-mono" 
                    placeholder="ISBN-13"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-natural-bg border-t border-natural-border flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingBook(null); }} 
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-text-muted hover:bg-natural-border transition-colors outline-none"
                >
                  Batal
                </button>
                <button 
                type="submit" 
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95 outline-none"
              >
                {editingBook ? 'Simpan Perubahan' : 'Tambah Ke Katalog'}
              </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isScanModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col">
              <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-text-title tracking-tight font-serif">AI Book Vision</h3>
                  <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-1 text-primary">Arahkan sampul buku ke kamera</p>
                </div>
                <button 
                  onClick={() => {
                    setIsScanModalOpen(false);
                    stopCamera();
                  }}
                  className="p-2 bg-natural-bg rounded-2xl text-text-muted hover:text-red-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="px-8 py-4 flex-1">
                <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  <video 
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Scanner overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-[15%] border-2 border-primary/50 rounded-2xl"></div>
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_#3b4170] animate-[scan_3s_ease-in-out_infinite]"></div>
                  </div>

                  {isScanning && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                      <RefreshCw className="w-12 h-12 animate-spin mb-4 text-primary" />
                      <p className="font-black text-lg tracking-widest animate-pulse">MEMINDAI SAMPUL...</p>
                      <p className="text-xs opacity-70 mt-2">Gemini Flash sedang menganalisis teks...</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 pt-4">
                <button
                  onClick={handleScanBook}
                  disabled={isScanning}
                  className="w-full bg-primary text-white py-4 rounded-3xl font-black text-xl hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Camera className="w-6 h-6" />
                  Ambil Foto & Scan
                </button>
                <p className="text-center text-[10px] text-text-light font-bold uppercase tracking-tighter mt-4">Powered by Google Gemini 1.5 Flash Vision</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
