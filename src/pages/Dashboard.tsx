import React from 'react';
import { Link } from 'react-router-dom';
import { Book, Users, ArrowLeftRight, AlertCircle, ChevronRight, BookOpen, Camera, CheckCircle2 } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';

export default function Dashboard() {
  const { books, members, transactions, registerFaceId } = useApp();
  const { currentUser, setIsRegInfoModalOpen } = useAuth();
  
  const [isFaceIdModalOpen, setIsFaceIdModalOpen] = React.useState(false);
  const [isRegisteringFace, setIsRegisteringFace] = React.useState(false);
  const [registrationSuccess, setRegistrationSuccess] = React.useState(false);
  const [registrationError, setRegistrationError] = React.useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [aiAnalysisStep, setAiAnalysisStep] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  const isAdmin = currentUser.role === 'admin';
  const isMember = currentUser.role === 'member';
  const isGuest = currentUser.role === 'guest';

  const currentMemberInfo = members.find(m => m.id === currentUser.memberId);
  const needsFaceId = isMember && currentMemberInfo && !currentMemberInfo.hasFaceId;

  // For members, only show their own transactions. For guests, show nothing or public.
  const recentTransactions = transactions
    .filter(t => isAdmin || (isMember && t.memberId === currentUser.memberId))
    .slice()
    .reverse()
    .slice(0, 5);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleOpenFaceIdModal = () => {
    setIsFaceIdModalOpen(true);
    setHasCameraPermission(null);
    startCamera();
  };

  const handleCloseFaceIdModal = () => {
    setIsFaceIdModalOpen(false);
    stopCamera();
    setIsRegisteringFace(false);
    setRegistrationSuccess(false);
    setRegistrationError(null);
    setAiAnalysisStep(null);
  };

  const handleRegisterFaceId = () => {
    setIsRegisteringFace(true);
    setRegistrationSuccess(false);
    setRegistrationError(null);
    
    // Capture the face image right away
    let capturedImage: string | undefined;
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        capturedImage = canvas.toDataURL('image/jpeg');
      }
    }
    
    // Simulate AI Computer Vision process
    const steps = [
      "Mengambil gambar...",
      "Mengecek pencahayaan & objek penghalang...",
      "Lolos verifikasi AI. Mengekstrak fitur wajah...",
      "Mengubah foto menjadi kode vektor (face embedding)...",
      "Menyimpan dan enkripsi data biometrik..."
    ];

    let currentStep = 0;
    setAiAnalysisStep(steps[0]);

    const interval = setInterval(() => {
      // Simulate errors occasionally at the "Mengecek" step
      if (currentStep === 0 && Math.random() < 0.3) {
        clearInterval(interval);
        setIsRegisteringFace(false);
        setAiAnalysisStep(null);
        
        const rErr = Math.random();
        if (rErr < 0.5) {
          setRegistrationError("Ruangan terlalu gelap. Sistem otomatis mendeteksi pencahayaan rendah. Mohon pindah ke tempat yang lebih terang.");
        } else {
          setRegistrationError("Terdeteksi penghalang (Kacamata Hitam/Masker/Topi). Mohon lepas objek yang menutupi titik penting wajah Anda.");
        }
        return;
      }

      currentStep++;
      if (currentStep < steps.length) {
        setAiAnalysisStep(steps[currentStep]);
      } else {
        clearInterval(interval);
        
        setIsRegisteringFace(false);
        setRegistrationSuccess(true);
        setAiAnalysisStep(null);
        
        if (currentUser.memberId) {
          registerFaceId(currentUser.memberId, capturedImage);
        }
        
        // Auto close after success
        setTimeout(() => {
          handleCloseFaceIdModal();
        }, 3500);
      }
    }, 800);
  };

  const stats = {
    books: books.length,
    members: members.length,
    borrowed: transactions.filter(t => t.status === 'Borrowed').length,
    overdue: transactions.filter(t => t.status === 'Overdue').length,
    pending: transactions.filter(t => t.status === 'Pending').length,
  };

  return (
    <div className="space-y-8 pb-10">
      {needsFaceId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-[32px] p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-yellow-900 mb-1">Akses Peminjaman Cepat Belum Aktif</h3>
              <p className="text-sm text-yellow-800/80 font-medium">Anda belum mendaftarkan biometrik wajah. Daftarkan sekarang untuk menggunakan loker pintar perpustakaan.</p>
            </div>
          </div>
          <button 
            onClick={handleOpenFaceIdModal}
            className="w-full sm:w-auto px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold shadow-md shadow-yellow-500/20 transition-all active:scale-95 whitespace-nowrap"
          >
            Daftarkan Foto Wajah
          </button>
        </div>
      )}

      {/* Header and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-primary rounded-[32px] p-8 text-white flex justify-between items-center relative overflow-hidden">
          <div className="z-10">
            <h2 className="text-3xl font-serif italic mb-2">
              {isAdmin ? `Halo, Admin ${currentUser.name.split(' (')[0]}!` : 
               isMember ? `Selamat Datang, ${currentUser.name.split(' (')[0]}!` : 
               'Halo, Sobat Literasi!'}
            </h2>
            <p className="text-white/80 max-w-sm mb-6">
              {isAdmin ? 'Kelola sirkulasi perpustakaan, tambah koleksi baru, dan pantau aktivitas peminjaman hari ini.' :
               isMember ? 'Jelajahi koleksi buku terbaru dan lihat status peminjaman Anda.' :
               'Temukan ribuan buku berkualitas dan jadilah anggota untuk mulai meminjam.'}
            </p>
            <Link 
              to="/books" 
              className="inline-block bg-white text-primary hover:bg-natural-bg transition-colors px-6 py-2.5 rounded-full font-bold text-sm shadow-lg"
            >
              Exsplorasi Katalog
            </Link>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-20">
             <BookOpen className="w-64 h-64" />
          </div>
        </div>
        
        {!isGuest && (
          <div className="bg-natural-panel rounded-[32px] p-8 border border-natural-border">
            <h3 className="font-bold text-text-title mb-4">
              {isAdmin ? 'Statistik Perpustakaan' : 'Statistik Saya'}
            </h3>
            <div className="space-y-4">
              {isAdmin ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">Total Koleksi Buku</span>
                    <span className="font-bold text-lg">{stats.books}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">Total Anggota</span>
                    <span className="font-bold text-lg">{stats.members}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">Buku Dipinjam</span>
                  <span className="font-bold text-lg">{recentTransactions.length}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">
                  {isAdmin ? 'Sedang Dipinjam' : 'Belum Kembali'}
                </span>
                <span className="font-bold text-lg text-primary">
                  {isAdmin ? stats.borrowed : recentTransactions.filter(t => t.status === 'Borrowed').length}
                </span>
              </div>
              {isAdmin && stats.pending > 0 && (
                <div className="flex items-center justify-between border-t border-natural-border pt-3 mt-1">
                  <span className="text-sm text-primary font-medium">Menunggu Validasi</span>
                  <span className="font-bold text-lg text-primary">{stats.pending}</span>
                </div>
              )}
              {isAdmin && stats.overdue > 0 && (
                <div className="flex items-center justify-between border-t border-natural-border pt-3 mt-1">
                  <span className="text-sm text-red-500 font-medium">Terlambat Kembali</span>
                  <span className="font-bold text-lg text-red-500">{stats.overdue}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {isGuest && (
          <div className="bg-natural-panel rounded-[32px] p-8 border border-natural-border flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-text-title mb-2">Ingin Meminjam?</h3>
            <p className="text-xs text-text-muted mb-4 leading-relaxed px-4">Segera daftarkan diri Anda di meja sirkulasi untuk mendapatkan akses penuh peminjaman buku.</p>
            <button 
              onClick={() => setIsRegInfoModalOpen(true)}
              className="text-primary font-extrabold text-sm underline underline-offset-4 hover:text-opacity-80 transition-all uppercase tracking-widest"
            >
              Cara Mendaftar
            </button>
          </div>
        )}
      </div>

      {/* Popular Books Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-text-title">Koleksi Terpopuler</h3>
          <Link to="/books" className="text-sm font-semibold text-primary underline underline-offset-4">Lihat Semua</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.slice(0, 4).map((book, index) => {
            const bgColors = ['bg-[#F1E5D5]', 'bg-[#D5E1F1]', 'bg-[#E1F1D5]', 'bg-[#E9D5F1]'];
            const textColors = ['text-[#8D7B6D]', 'text-[#5D6D8D]', 'text-[#5D8D5D]', 'text-[#7B5D8D]'];
            const bgColor = bgColors[index % bgColors.length];
            const textColor = textColors[index % textColors.length];

            return (
              <div key={book.id} className="bg-white p-4 rounded-2xl shadow-sm border border-natural-border transition-transform hover:-translate-y-1 hover:shadow-md">
                <div className={`w-full aspect-[3/4] ${bgColor} rounded-xl mb-4 overflow-hidden flex items-center justify-center p-4 text-center`}>
                  <span className={`text-xs ${textColor} font-bold uppercase rotate-12`}>{book.category}</span>
                </div>
                <p className="font-bold text-sm leading-tight mb-1 line-clamp-1" title={book.title}>{book.title}</p>
                <p className="text-xs text-text-light mb-4 line-clamp-1">{book.author}</p>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                    book.status === 'Available'
                      ? 'bg-natural-bg text-primary border border-natural-border'
                      : 'bg-[#F1E9EA] text-red-500 border border-red-100'
                  }`}>
                    {book.status === 'Available' ? 'Tersedia' : 'Dipinjam'}
                  </span>
                  <Link to="/books" className="text-text-lighter hover:text-primary transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions List */}
      {!isGuest && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-text-title mb-6">
            {isAdmin ? 'Aktivitas Terbaru' : 'Pinjaman Terakhir Saya'}
          </h3>
          {recentTransactions.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden">
              <ul role="list" className="divide-y divide-natural-border">
                {recentTransactions.map((tx) => {
                  const book = books.find(b => b.id === tx.bookId);
                  const member = members.find(m => m.id === tx.memberId);
                  return (
                    <li key={tx.id} className="flex justify-between gap-x-6 px-6 py-5 hover:bg-natural-bg transition-colors">
                      <div className="flex min-w-0 gap-x-4 items-center">
                        <div className="h-12 w-12 flex-shrink-0 bg-natural-panel rounded-xl flex items-center justify-center">
                           <ArrowLeftRight className="h-5 w-5 text-text-muted"/>
                        </div>
                        <div className="min-w-0 flex-auto">
                          <p className="text-sm font-bold leading-6 text-text-title">{book?.title}</p>
                          <p className="mt-1 truncate text-xs leading-5 text-text-muted">
                            {isAdmin ? (
                              <>Dipinjam oleh <span className="font-medium text-text-title">{member?.name}</span> ({member?.studentId})</>
                            ) : (
                              <>Dipinjam pada <span className="font-medium text-text-title">{tx.borrowDate}</span></>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:flex sm:flex-col sm:items-end">
                        <p className="text-sm font-medium leading-6 text-text-title">{tx.borrowDate}</p>
                        <div className="mt-1 flex items-center gap-x-1.5">
                          <div className={`flex-none rounded-full p-1 ${
                            tx.status === 'Returned' ? 'bg-primary/20' : 
                            tx.status === 'Pending' ? 'bg-blue-100' : 
                            'bg-accent/30'
                          }`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${
                              tx.status === 'Returned' ? 'bg-primary' : 
                              tx.status === 'Pending' ? 'bg-blue-600' : 
                              'bg-yellow-600'
                            }`} />
                          </div>
                          <p className="text-xs leading-5 text-text-muted font-medium">
                            {tx.status === 'Returned' ? 'Selesai Dibaca' : 
                             tx.status === 'Pending' ? 'Siap Diambil' : 
                             'Sedang Dipinjam'}
                          </p>
                          {tx.status === 'Pending' && (
                            <div className="flex flex-col items-end gap-1 mt-1">
                               {tx.bookingCode && (
                                 <span className="py-0.5 px-2 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg border border-blue-100">
                                   KODE: {tx.bookingCode}
                                 </span>
                               )}
                               {tx.pickupLocation && (
                                 <span className="text-[9px] font-bold text-text-light bg-natural-panel px-2 py-0.5 rounded-lg border border-natural-border italic uppercase tracking-wider">
                                   {tx.pickupLocation}
                                 </span>
                               )}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-natural-border">
              <p className="text-sm text-text-muted">Belum ada riwayat peminjaman.</p>
            </div>
          )}
        </div>
      )}

      {/* Face ID Registration Modal */}
      {isFaceIdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center flex flex-col items-center">
              <h3 className="text-2xl font-black text-text-title mb-2">Pendaftaran Face ID</h3>
              <p className="text-sm text-text-muted mb-8">Posisikan wajah Anda di dalam area pindai untuk didaftarkan ke sistem perpustakaan.</p>
              
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden mb-8 border-4 border-primary/20 shadow-inner bg-natural-bg">
                {registrationSuccess ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-50 text-green-600 z-20 text-center px-4">
                    <CheckCircle2 className="w-16 h-16 mb-2 animate-in zoom-in" />
                    <span className="font-bold text-sm">Wajah Terdaftar</span>
                    <span className="text-[10px] opacity-80 mt-1 leading-tight font-medium">Wajah Anda kini siap digunakan<br />untuk scan di meja admin.</span>
                  </div>
                ) : registrationError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600 text-center p-6 z-20">
                    <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                    <span className="font-bold text-sm mb-1">Gagal Mendaftar</span>
                    <span className="text-[10px] opacity-80 leading-tight">{registrationError}</span>
                  </div>
                ) : hasCameraPermission === false ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600 text-center p-6 z-20">
                    <Camera className="w-12 h-12 mb-2 opacity-50" />
                    <span className="font-bold text-sm mb-1">Kamera Tidak Dapat Diakses</span>
                    <span className="text-xs opacity-70">Pastikan Anda telah memberikan izin kamera pada browser.</span>
                  </div>
                ) : (
                  <>
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover scale-125 transform -scale-x-100"
                    />
                    
                    {isRegisteringFace && (
                      <div className="absolute inset-0 z-10 pointer-events-none">
                        <div className="absolute inset-0 rounded-full border-[6px] border-primary/40 m-2"></div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_#3b4170] animate-scan"></div>
                        {aiAnalysisStep && (
                           <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                             <div className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-primary/20 backdrop-blur tracking-wide">
                               {aiAnalysisStep}
                             </div>
                           </div>
                        )}
                      </div>
                    )}
                    
                    {!isRegisteringFace && hasCameraPermission === null && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-primary bg-natural-bg z-10">
                          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
                          <span className="text-xs font-bold px-3 py-1 bg-white/80 rounded-full">Meminta Akses...</span>
                       </div>
                    )}
                  </>
                )}
              </div>

              <div className="w-full space-y-3">
                {registrationSuccess ? (
                  <button 
                    onClick={handleCloseFaceIdModal}
                    className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all"
                  >
                    Selesai
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleRegisterFaceId}
                      disabled={isRegisteringFace || hasCameraPermission !== true}
                      className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-lg hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isRegisteringFace ? 'Memindai...' : 'Ambil Foto'}
                    </button>
                    <button 
                      onClick={handleCloseFaceIdModal}
                      disabled={isRegisteringFace}
                      className="w-full py-3 bg-natural-panel text-text-muted hover:text-text-title rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                      Batal
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

