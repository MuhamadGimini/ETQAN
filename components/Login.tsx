
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, LogIn, ShieldAlert, MessageCircle, Sparkles, KeyRound } from 'lucide-react';
import type { MgmtUser } from '../types';
import type { LicenseStatus } from '../services/license';
import Clock from './Clock';
import { ALL_PERMISSIONS } from './navigation';
import { WhatsAppIcon } from './Shared';

interface LoginProps {
    onLogin: (user: MgmtUser) => void;
    users: MgmtUser[];
    setUsers: React.Dispatch<React.SetStateAction<MgmtUser[]>>;
    activeDatabaseId: string;
    licenseStatus: LicenseStatus | null;
    onActivateClick?: () => void;
    transparent?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, setUsers, activeDatabaseId, licenseStatus, onActivateClick, transparent }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [failedAttempts, setFailedAttempts] = useState(() => {
      const stored = localStorage.getItem('app_failed_attempts');
      return stored ? parseInt(stored) : 0;
  });
  const [isLocked, setIsLocked] = useState(() => {
      return localStorage.getItem('app_security_lockout') === 'true';
  });

  const [showUnlockForm, setShowUnlockForm] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');
  
  useEffect(() => {
    if (users && users.length === 0) {
      const defaultAdmin: MgmtUser = {
        id: 1,
        username: 'admin',
        password: '8603',
        fullName: 'المدير',
        permissions: ALL_PERMISSIONS,
      };
      setUsers([defaultAdmin]);
    }
  }, [users, setUsers]); 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!users) {
        setError('جاري تحميل البيانات...');
        return;
    }
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      if (user.isBlocked) {
          setError('هذا المستخدم محظور.');
          return;
      }
      setFailedAttempts(0);
      localStorage.removeItem('app_failed_attempts');
      onLogin({ ...user, permissions: user.permissions || [] });
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('app_failed_attempts', newAttempts.toString());
      if (newAttempts >= 5) {
          setIsLocked(true);
          localStorage.setItem('app_security_lockout', 'true');
          setError('تم إغلاق البرنامج لدواعي أمنية.');
      } else {
          setError(`بيانات الدخول غير صحيحة. متبقي ${5 - newAttempts} محاولات.`);
      }
    }
  };

  const performUnlock = () => {
      setIsLocked(false);
      setFailedAttempts(0);
      localStorage.removeItem('app_security_lockout');
      localStorage.removeItem('app_failed_attempts');
      setShowUnlockForm(false);
      setUnlockCode('');
      setError('');
  };

  const handleUnlock = () => {
      if (unlockCode === '8603') {
          performUnlock();
          return;
      }
      if (users) {
          const user = users.find(u => u.password === unlockCode);
          if (user) {
              if (user.id === 1 || (user.permissions && user.permissions.includes('appUnlock'))) {
                  performUnlock();
                  return;
              }
          }
      }
      alert('كود فك الحظر غير صحيح.');
  };

  const inputClass = "w-full pl-4 pr-12 py-4 bg-white/20 border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 text-slate-800 placeholder-slate-500 transition-all duration-300 font-bold backdrop-blur-md";

  if (isLocked) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-100 via-rose-100 to-emerald-100 rtl overflow-hidden font-sans relative">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-orange-400 to-rose-400 blur-[120px] opacity-40 mix-blend-multiply"></div>
                <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-bl from-emerald-400 to-teal-300 blur-[120px] opacity-40 mix-blend-multiply"></div>
            </div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white/40 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] p-10 border border-white/50 text-center relative z-10"
            >
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4">النظام مغلق مؤقتاً</h2>
                <p className="text-slate-600 text-lg mb-8 leading-relaxed font-medium">
                    تم تجاوز الحد المسموح به من محاولات الدخول الخاطئة لدواعي أمنية.
                </p>
                <div className="bg-white/30 p-6 rounded-2xl border border-white/40 mb-8 backdrop-blur-sm">
                    <p className="text-slate-600 text-sm mb-2 font-bold">برجاء التواصل مع الدعم الفني:</p>
                    <p className="text-3xl font-black text-rose-600 dir-ltr font-mono tracking-wider drop-shadow-sm">01007608603</p>
                </div>
                <a 
                    href="https://wa.me/201007608603?text=لقد تم حظر البرنامج بسبب تجاوز محاولات الدخول الخاطئة" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all mb-8 transform hover:scale-[1.02]"
                >
                    <MessageCircle className="w-6 h-6" />
                    <span>تواصل عبر واتساب</span>
                </a>
                
                <div className="pt-6 border-t border-white/40">
                    {!showUnlockForm ? (
                        <button onClick={() => setShowUnlockForm(true)} className="text-slate-500 hover:text-rose-600 font-bold text-sm transition-colors">دخول الدعم الفني / المدير</button>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <label className="block text-slate-600 text-xs mb-3 font-black">أدخل كود فك الحظر</label>
                            <div className="flex gap-2">
                                <input type="password" className="flex-1 p-4 rounded-xl bg-white/40 border border-white/50 text-slate-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/30 focus:outline-none text-center font-black backdrop-blur-sm" placeholder="••••••••" value={unlockCode} onChange={e => setUnlockCode(e.target.value)} autoFocus onKeyPress={(e) => e.key === 'Enter' && handleUnlock()} />
                                <button onClick={handleUnlock} className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-2 rounded-xl hover:from-slate-700 hover:to-slate-800 font-black transition-all shadow-lg">فك</button>
                            </div>
                            <button onClick={() => setShowUnlockForm(false)} className="text-xs text-slate-500 hover:text-slate-700 mt-4 font-bold">إلغاء</button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
      );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 rtl overflow-hidden font-sans relative ${transparent ? '' : 'bg-gradient-to-br from-orange-50 via-rose-50 to-emerald-50'}`}>
        {/* Decorative Background - Sunrise & Nature Theme */}
        {!transparent && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div 
                animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                    rotate: [0, 5, 0]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-orange-400 to-rose-400 blur-[120px] mix-blend-multiply"
            ></motion.div>
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                    rotate: [0, -5, 0]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-bl from-emerald-400 to-teal-300 blur-[120px] mix-blend-multiply"
            ></motion.div>
            <motion.div 
                animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [0.2, 0.4, 0.2],
                    translateY: [0, 20, 0]
                }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
                className="absolute -bottom-[20%] left-[10%] w-[80%] h-[80%] rounded-full bg-gradient-to-tr from-amber-300 to-orange-500 blur-[120px] mix-blend-multiply"
            ></motion.div>
        </div>
        )}

        <div className="w-full max-w-md relative z-10">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <div className="mb-10 drop-shadow-xl">
                    <Clock className="" />
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.4 }}
                className="w-full bg-white/20 backdrop-blur-2xl rounded-[3rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] p-10 border border-white/40 relative overflow-hidden"
            >
                {/* Inner subtle glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent opacity-50 pointer-events-none rounded-[3rem]"></div>

                <div className="text-center mb-10 relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/40 border border-white/50 text-slate-800 text-xs font-black mb-5 shadow-sm backdrop-blur-md"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-emerald-600">نظام نقاط البيع الذكي</span>
                    </motion.div>
                    <h2 className="text-4xl font-black text-slate-800 drop-shadow-sm">تسجيل الدخول</h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                    <div className="relative">
                        <label className="block text-slate-700 text-xs font-black mb-2 mr-2 drop-shadow-sm" htmlFor="username">اسم المستخدم</label>
                        <div className="relative group">
                            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="أدخل اسم المستخدم" required />
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                        </div>
                    </div>
                    
                    <div className="relative">
                        <label className="block text-slate-700 text-xs font-black mb-2 mr-2 drop-shadow-sm" htmlFor="password">كلمة المرور</label>
                        <div className="relative group">
                            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" required />
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                className="bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-700 px-4 py-3 rounded-2xl text-center font-bold text-sm shadow-inner"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        className="group w-full bg-gradient-to-r from-orange-500 via-rose-500 to-emerald-500 hover:from-orange-600 hover:via-rose-600 hover:to-emerald-600 text-white font-black py-5 px-6 rounded-[1.5rem] shadow-[0_10px_25px_-5px_rgba(249,115,22,0.4)] transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                        <span className="relative z-10 text-lg drop-shadow-md">دخول للنظام</span>
                        <LogIn className="w-6 h-6 relative z-10 group-hover:translate-x-[-4px] transition-transform drop-shadow-md" />
                    </motion.button>
                </form>

                {licenseStatus && !licenseStatus.isActivated && onActivateClick && (
                    <div className="mt-10 pt-8 border-t border-white/30 text-center relative z-10">
                        <div className="flex items-center justify-center gap-2 text-rose-600 text-xs font-black mb-3 drop-shadow-sm">
                            <ShieldAlert className="w-4 h-4" />
                            <span>نسخة تجريبية - متبقي {licenseStatus.daysRemaining} يوم</span>
                        </div>
                        <button 
                            type="button" 
                            onClick={onActivateClick} 
                            className="flex items-center justify-center gap-2 mx-auto text-slate-700 hover:text-orange-600 text-sm font-black transition-colors"
                        >
                            <KeyRound className="w-4 h-4" />
                            <span>تفعيل النسخة الكاملة الآن</span>
                        </button>
                    </div>
                )}
            </motion.div>
            
            <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="mt-8 text-center text-slate-500/80 text-xs font-bold drop-shadow-sm"
            >
                © {new Date().getFullYear()} جميع الحقوق محفوظة لـ ETQAN Solutions
            </motion.p>
        </div>
    </div>
  );
};

export default Login;
