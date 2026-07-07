import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, CheckCircle2, User, X, AlertTriangle, ScanFace } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';

export default function FaceId() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { transactions, members, validateBookingByMember } = useApp();
  const { currentUser } = useAuth();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    member?: any;
    message: string;
    preparedBooks?: {title: string, author: string, category: string, rackLocation: string}[];
  } | null>(null);

  const getStudentImage = (name: string) => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const [aiAnalysisStep, setAiAnalysisStep] = useState<string | null>(null);

  const [visionAnalysis, setVisionAnalysis] = useState<any>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setHasPermission(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const startRealScan = async () => {
    try {
      setIsScanning(true);
      setScanResult(null);
      setVisionAnalysis(null);
      setAiAnalysisStep("Mengunci fokus biometrik...");

      const imageData = captureFrame();
      if (!imageData) throw new Error("Gagal menangkap gambar dari kamera");

      setAiAnalysisStep("Menganalisis wajah dengan AI Vision...");
      
      const { visionService } = await import('../lib/visionService');
      const analysis = await visionService.analyzeFace(imageData);
      setVisionAnalysis(analysis);

      if (analysis.isObstructed) {
        setIsScanning(false);
        setAiAnalysisStep(null);
        setScanResult({
          success: false,
          message: `Terdeteksi Penghalang: ${analysis.friendlyMessage}`
        });
        return;
      }

      setAiAnalysisStep("Mencocokkan dengan database anggota...");

      setTimeout(() => {
        setIsScanning(false);
        setAiAnalysisStep(null);
        
        // Match logic (simulated against local database)
        const pendingTx = transactions.find(t => t.status === 'Pending');
        const memberIdToTest = pendingTx ? pendingTx.memberId : members[0]?.id;
        const member = members.find(m => m.id === memberIdToTest);
        
        if (member) {
          const result = validateBookingByMember(member.id);
          setScanResult({
            success: result.success,
            member: member,
            message: result.message,
            preparedBooks: result.preparedBooks
          });
        } else {
          setScanResult({
            success: false,
            message: "Data pemindaian tidak valid."
          });
        }
      }, 1500);

    } catch (error) {
      console.error("Vision scan failed:", error);
      setIsScanning(false);
      setAiAnalysisStep(null);
      setScanResult({
        success: false,
        message: "Terjadi kesalahan pada sistem Computer Vision. Mohon coba lagi."
      });
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-text-title mb-2">Akses Terbatas</h2>
        <p className="text-text-muted max-w-md">Maaf, halaman ini hanya dapat diakses oleh Admin Perpustakaan.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-text-title tracking-tight flex items-center gap-3">
          <ScanFace className="w-8 h-8 text-primary" />
          Verifikasi Face ID
        </h2>
        <p className="text-sm text-text-muted mt-1">Otomatisasi pengambilan buku menggunakan pemindaian wajah mahasiswa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Camera Section */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-natural-border flex flex-col items-center transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
          <div className="relative w-full aspect-[3/4] sm:aspect-square bg-gray-900 rounded-3xl overflow-hidden shadow-inner mb-6">
            {hasPermission === false ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 p-6 text-center">
                 <Camera className="w-12 h-12 mb-4 opacity-50" />
                 <p className="font-medium text-sm">Kamera tidak ditemukan atau akses ditolak.</p>
                 <p className="text-xs mt-2 text-white/40">Anda masih bisa menjalankan simulasi di bawah.</p>
                 <button onClick={startCamera} className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors">Coba Akses Kamera</button>
               </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-500 ${isScanning ? 'opacity-80' : 'opacity-100'}`}
                />
                
                {/* Scanner Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <div className="absolute inset-0 border-[4px] border-primary/50 rounded-3xl m-8"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_#3b4170] animate-[scan_2s_ease-in-out_infinite]"></div>
                    {aiAnalysisStep && (
                       <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                         <div className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold px-4 py-2 rounded-full shadow-lg border border-primary/20 backdrop-blur tracking-wide text-center">
                           {aiAnalysisStep}
                         </div>
                       </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          <button 
            onClick={startRealScan}
            disabled={isScanning}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Menganalisis...
              </>
            ) : (
              <>
                Mulai Verifikasi
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-natural-bg border border-natural-border rounded-[32px] p-6 sm:p-8 flex flex-col transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-xl text-text-title">Hasil Verifikasi</h3>
            {visionAnalysis && (
              <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
                AI Vision Active
              </span>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {scanResult ? (
              <div className={`p-6 rounded-3xl border ${scanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
                <div className={`flex flex-col items-center text-center space-y-4 ${scanResult.preparedBooks && scanResult.preparedBooks.length > 0 ? '' : 'justify-center h-full'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${scanResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {scanResult.success ? <CheckCircle2 className="w-8 h-8" /> : <X className="w-8 h-8" />}
                  </div>
                  
                  {visionAnalysis && (
                    <div className="text-xs font-medium text-text-muted italic px-4 py-2 bg-white/50 rounded-xl mb-2">
                      " {visionAnalysis.friendlyMessage} "
                    </div>
                  )}

                  {scanResult.member && (
                    <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex items-center gap-4">
                       <div className="w-14 h-14 bg-primary/10 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border border-primary/20">
                         <img 
                           src={scanResult.member.faceIdImageUrl || getStudentImage(scanResult.member.name)} 
                           alt={scanResult.member.name} 
                           className="w-full h-full object-cover"
                         />
                       </div>
                       <div className="text-left flex-1">
                         <span className="block font-black text-text-title text-base sm:text-lg leading-tight line-clamp-1">{scanResult.member.name}</span>
                         <span className="text-xs sm:text-sm font-bold text-text-muted">{scanResult.member.studentId}</span>
                       </div>
                       <div className="hidden sm:inline-block bg-green-100 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                         Terverifikasi
                       </div>
                    </div>
                  )}

                  {scanResult.preparedBooks && scanResult.preparedBooks.length > 0 && (
                    <div className="w-full text-left pt-2 space-y-3">
                      <h4 className="text-xs font-black text-text-light uppercase tracking-[0.2em] text-center mb-4 mt-2">Detail Buku & Rak</h4>
                      {scanResult.preparedBooks.map((b, i) => (
                        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-2xl border border-natural-border shadow-sm gap-4 hover:border-primary/30 transition-colors">
                           <div className="flex-1 min-w-0 pr-4">
                             <p className="font-bold text-text-title truncate">{b.title}</p>
                             <p className="text-[11px] text-text-muted font-medium mt-0.5 truncate">{b.author} &bull; {b.category}</p>
                           </div>
                           <div className="bg-primary/5 border border-primary/20 xl:bg-primary xl:text-white text-primary px-4 py-2.5 rounded-xl text-center shrink-0 sm:min-w-[140px] shadow-inner">
                             <p className="text-[9px] font-black uppercase tracking-widest xl:text-white/70 text-primary/70 mb-0.5">Lokasi Rak</p>
                             <p className="text-xs sm:text-sm font-black whitespace-normal leading-tight">{b.rackLocation}</p>
                           </div>
                        </div>
                      ))}
                      
                      <div className="mt-6 p-4 bg-primary/5 rounded-2xl text-center border border-primary/10 shadow-sm flex items-start sm:items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-xs text-primary/80 font-bold leading-relaxed text-left flex-1">
                          Status: <span className="font-black text-primary">"Dipinjam" (Borrowed)</span>. Admin telah menyerahkan buku kepada mahasiswa.
                        </p>
                      </div>
                    </div>
                  )}

                  {!scanResult.preparedBooks && (
                    <p className={`text-sm font-bold leading-relaxed px-2 ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {scanResult.message}
                    </p>
                  )}
                </div>
              </div>
            ) : isScanning ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-natural-border border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-text-muted font-bold animate-pulse">Sedang menganalisis biometrik...</p>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-natural-border rounded-[32px] bg-natural-panel/50">
                <Camera className="w-12 h-12 text-text-lighter mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold text-text-lighter px-8">Silakan arahkan wajah ke kamera dan tekan "Mulai Verifikasi"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
