import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Database, ArrowLeftRight, Sparkles, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

interface InitialSetupProps {
    onChoice: (choice: 'cloud' | 'local' | 'restore') => void;
}

const InitialSetup: React.FC<InitialSetupProps> = ({ onChoice }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#fdfdfd] font-sans rtl">
            {/* Animated Background Elements - Subtle & Light */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-100/50 blur-[120px] animate-pulse"></div>
                <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-100/50 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-5xl px-6"
            >
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-8 shadow-sm"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>مرحباً بك في مستقبل المحاسبة الذكية</span>
                    </motion.div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                        مرحباً بك في <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">النظام</span>
                    </h1>
                    
                    <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-bold">
                        يرجى اختيار طريقة بدء النظام.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Local Option */}
                    <motion.div
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className="group relative p-8 rounded-3xl bg-[#f0fdf4] border border-emerald-100 shadow-lg hover:shadow-xl hover:shadow-emerald-100 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
                        onClick={() => onChoice('local')}
                    >
                        <div className="w-20 h-20 rounded-2xl bg-[#059669] flex items-center justify-center mb-6 shadow-md shadow-emerald-200 group-hover:scale-110 transition-transform duration-300">
                            <Database className="w-10 h-10 text-white" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">قاعدة جديدة</h2>
                        <p className="text-slate-500 mb-8 leading-relaxed text-sm font-medium">
                            بدء العمل على قاعدة بيانات فارغة مباشرة.
                        </p>
                        
                        <div className="mt-auto w-full">
                            <button className="w-full py-3 px-6 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl transition-colors shadow-sm">
                                بدء العمل
                            </button>
                        </div>
                    </motion.div>

                    {/* Restore Option */}
                    <motion.div
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className="group relative p-8 rounded-3xl bg-[#fff7ed] border border-orange-100 shadow-lg hover:shadow-xl hover:shadow-orange-100 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
                        onClick={() => onChoice('restore')}
                    >
                        <div className="w-20 h-20 rounded-2xl bg-[#ea580c] flex items-center justify-center mb-6 shadow-md shadow-orange-200 group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">استعادة نسخة</h2>
                        <p className="text-slate-500 mb-8 leading-relaxed text-sm font-medium">
                            الذهاب لشاشة النسخ الاحتياطي لاستعادة البيانات.
                        </p>
                        
                        <div className="mt-auto w-full">
                            <button className="w-full py-3 px-6 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl transition-colors shadow-sm">
                                شاشة النسخ الاحتياطي
                            </button>
                        </div>
                    </motion.div>

                    {/* Cloud Option */}
                    <motion.div
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className="group relative p-8 rounded-3xl bg-[#eff6ff] border border-blue-100 shadow-lg hover:shadow-xl hover:shadow-blue-100 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
                        onClick={() => onChoice('cloud')}
                    >
                        <div className="w-20 h-20 rounded-2xl bg-[#2563eb] flex items-center justify-center mb-6 shadow-md shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                            <Cloud className="w-10 h-10 text-white" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">بيانات سحابية</h2>
                        <p className="text-slate-500 mb-8 leading-relaxed text-sm font-medium">
                            إعداد الربط السحابي للمزامنة بين الفروع.
                        </p>
                        
                        <div className="mt-auto w-full">
                            <button className="w-full py-3 px-6 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl transition-colors shadow-sm">
                                إعدادات الربط
                            </button>
                        </div>
                    </motion.div>
                </div>

                <div className="mt-20 text-center">
                    <div className="inline-flex items-center gap-6 px-8 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 text-sm font-bold">
                        <div className="flex items-center gap-2">
                            <ArrowLeftRight className="w-4 h-4" />
                            <span>يمكنك التغيير لاحقاً من الإعدادات</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        <span>الإصدار 1.2.7</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        <span>بواسطة ETQAN Solutions</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default InitialSetup;
