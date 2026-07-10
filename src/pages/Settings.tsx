import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useApp } from '../lib/AppContext';
import { Shield, Bell, User, Globe, Moon, Sun, Save, CheckCircle2, Info } from 'lucide-react';

export default function Settings() {
  const { currentUser, updateProfile } = useAuth();
  const { settings, updateSettings } = useApp();
  const isAdmin = currentUser.role === 'admin';
  const isGuest = currentUser.role === 'guest';

  const [displayName, setDisplayName] = useState(currentUser.name);
  const [localSettings, setLocalSettings] = useState(settings);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    if (!isGuest) {
      updateProfile(displayName);
    }
    updateSettings(localSettings);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-text-title tracking-tight">
            {isAdmin ? 'Pengaturan Sistem' : 'Pengaturan & Preferensi'}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {isAdmin 
              ? 'Konfigurasi preferensi perpustakaan dan profil admin.' 
              : 'Sesuaikan kenyamanan tampilan dan profil Anda.'}
          </p>
        </div>
        {showNotification && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-2xl border border-green-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-bold">Perubahan Berhasil Disimpan</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Profil Section */}
          {!isGuest && (
            <div className="bg-white rounded-[32px] border border-natural-border overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
              <div className="p-6 sm:p-8 border-b border-natural-border bg-natural-bg/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-black text-lg text-text-title tracking-tight">Profil Saya</h3>
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-2 px-1">Nama Tampilan</label>
                    <input 
                      type="text" 
                      value={displayName} 
                      onChange={e => setDisplayName(e.target.value)}
                      className="w-full bg-natural-panel rounded-2xl px-5 py-3.5 text-sm font-bold text-text-title outline-none border-2 border-transparent focus:border-primary transition-all shadow-inner" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-2 px-1">Role Akses</label>
                    <div className="w-full bg-natural-bg rounded-2xl px-5 py-3.5 text-sm font-bold text-text-muted border-2 border-natural-border">
                      {currentUser.role.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Library Rules Section */}
          {isAdmin && (
            <div className="bg-white rounded-[32px] border border-natural-border overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
              <div className="p-6 sm:p-8 border-b border-natural-border bg-natural-bg/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-black text-lg text-text-title tracking-tight">Aturan Perpustakaan</h3>
                </div>
              </div>
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-2 px-1">Denda Per Hari</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">Rp</span>
                      <input 
                        type="number" 
                        value={localSettings.finePerDay} 
                        onChange={e => setLocalSettings({...localSettings, finePerDay: parseInt(e.target.value) || 0})}
                        className="w-full bg-natural-panel rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold text-text-title outline-none border-2 border-transparent focus:border-primary transition-all shadow-inner" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-2 px-1">Durasi Pinjam (Hari)</label>
                    <input 
                      type="number" 
                      value={localSettings.maxBorrowDays} 
                      onChange={e => setLocalSettings({...localSettings, maxBorrowDays: parseInt(e.target.value) || 0})}
                      className="w-full bg-natural-panel rounded-2xl px-5 py-3.5 text-sm font-bold text-text-title outline-none border-2 border-transparent focus:border-primary transition-all shadow-inner" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-2 px-1">Maks. Buku / Anggota</label>
                    <input 
                      type="number" 
                      value={localSettings.maxBooksPerMember} 
                      onChange={e => setLocalSettings({...localSettings, maxBooksPerMember: parseInt(e.target.value) || 0})}
                      className="w-full bg-natural-panel rounded-2xl px-5 py-3.5 text-sm font-bold text-text-title outline-none border-2 border-transparent focus:border-primary transition-all shadow-inner" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
            <div className="flex gap-4">
              <Info className="w-5 h-5 text-primary shrink-0" />
              <p className="text-xs text-primary/80 font-medium leading-relaxed">
                {isAdmin 
                  ? 'Beberapa pengaturan sistem akan berdampak langsung pada seluruh akun anggota yang terdaftar.' 
                  : 'Preferensi tampilan disimpan secara lokal pada peramban Anda untuk kunjungan berikutnya.'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Preferences Section */}
          <div className="bg-white rounded-[32px] border border-natural-border overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
            <div className="p-6 sm:p-8 border-b border-natural-border bg-natural-bg/30">
              <h3 className="font-black text-lg text-text-title tracking-tight">Preferensi</h3>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-natural-bg rounded-xl">
                    <Bell className="w-5 h-5 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-title">Notifikasi</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Email Pengingat</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={localSettings.enableNotifications} 
                    onChange={e => setLocalSettings({...localSettings, enableNotifications: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Theme Selector */}
              <div className="border-t border-natural-border/40 pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-natural-bg rounded-xl">
                    {localSettings.darkMode ? (
                      <Moon className="w-5 h-5 text-primary" />
                    ) : (
                      <Sun className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-title">Tema Tampilan</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Pilih Terang atau Gelap</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 p-1 bg-natural-panel rounded-2xl border border-natural-border/60 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...localSettings, darkMode: false };
                      setLocalSettings(updated);
                      updateSettings({ darkMode: false });
                    }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                      !localSettings.darkMode
                        ? 'bg-primary text-white shadow-md'
                        : 'text-text-muted hover:text-text-title'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    Terang
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...localSettings, darkMode: true };
                      setLocalSettings(updated);
                      updateSettings({ darkMode: true });
                    }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                      localSettings.darkMode
                        ? 'bg-primary text-white shadow-md'
                        : 'text-text-muted hover:text-text-title'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    Gelap
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-primary text-white py-5 rounded-[24px] font-black text-lg hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
          >
            <Save className="w-6 h-6" />
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}
