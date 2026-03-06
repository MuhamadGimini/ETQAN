
import React, { useState, useEffect } from 'react';
import { APP_VERSION, BUILD_DATE } from '../constants/version';
import { ShoppingCartIcon, ArchiveIcon, CalculatorIcon, CogIcon, ChartBarIcon, ShieldCheckIcon, WhatsAppIcon, DownloadIcon } from './Shared';

interface AboutProps {
    updateAvailable: boolean;
    onNavigate: (view: string) => void;
    activeDatabaseName: string;
    isDBReady: boolean;
    isCloudConnected: boolean;
}

const About: React.FC<AboutProps> = ({ updateAvailable, onNavigate, activeDatabaseName, isDBReady, isCloudConnected }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBtn, setShowInstallBtn] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBtn(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallBtn(false);
        }
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    
    const features = [
        { icon: <ShoppingCartIcon />, name: 'المبيعات والمشتريات', desc: 'إدارة كاملة للفواتير والمرتجعات مع متابعة أرصدة العملاء والموردين.' },
        { icon: <ArchiveIcon />, name: 'المخازن والأصناف', desc: 'تكويد الأصناف والمخازن، وإدارة التحويلات المخزنية والجرد والتسويات.' },
        { icon: <CalculatorIcon />, name: 'الحسابات والخزينة', desc: 'تسجيل المصروفات، سندات القبض والدفع، ومتابعة حركة الخزائن.' },
        { icon: <ChartBarIcon />, name: 'التقارير التحليلية', desc: 'مجموعة شاملة من التقارير التفصيلية والإجمالية للمبيعات والأرباح وحركة الأصناف.' },
        { icon: <ShieldCheckIcon />, name: 'الأمان والصلاحيات', desc: 'نظام صلاحيات دقيق لكل شاشة ولكل مستخدم مع إمكانية حظر المستخدمين.' },
        { icon: <CogIcon />, name: 'التحديثات أونلاين', desc: 'إمكانية تحديث البرنامج بضغطة زر للحصول على أحدث الميزات والإصلاحات.' },
        { icon: <CogIcon />, name: 'إعدادات متقدمة', desc: 'النسخ الاحتياطي، الربط السحابي، ضبط المصنع، وتخصيص القيم الافتراضية.' },
    ];

    const StatusIndicator: React.FC<{ status: boolean; text: string }> = ({ status, text }) => (
        <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${status ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
            <span className={`h-3 w-3 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={`font-bold ${status ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{text}</span>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200">نبذة عن البرنامج</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">نظام نقاط البيع وإدارة المخزون والحسابات</p>
            </div>

            {/* Version and Update Card */}
            <div className={`${cardClass} flex flex-col md:flex-row items-center justify-between gap-6`}>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">معلومات الإصدار</h2>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">الإصدار الحالي: v{APP_VERSION}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">تاريخ البناء: {BUILD_DATE}</p>
                </div>
                <div>
                    {updateAvailable ? (
                        <button 
                            onClick={() => onNavigate('updateManagement')} 
                            className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transform hover:-translate-y-1 transition-all duration-300 animate-red-pulse text-lg"
                        >
                            ✨ تحديث جديد متاح!
                        </button>
                    ) : (
                        <button 
                            onClick={() => onNavigate('updateManagement')}
                            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 text-lg"
                        >
                            التحقق من وجود تحديثات
                        </button>
                    )}
                </div>
            </div>

            {/* What's New Card */}
            <div className={`${cardClass} border-l-4 border-l-green-500`}>
                <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                    <span>✨</span> مميزات التحديث الجديد ({APP_VERSION})
                </h2>
                <ul className="space-y-3 list-disc list-inside text-gray-700 dark:text-gray-300 text-lg">
                    <li>
                        <span className="font-bold text-blue-600 dark:text-blue-400">تعدد المخازن في الفواتير:</span> إمكانية اختيار مخزن مختلف لكل صنف داخل فاتورة المشتريات، مرتجع المبيعات، ومرتجع المشتريات.
                    </li>
                    <li>
                        <span className="font-bold text-blue-600 dark:text-blue-400">اختصارات لوحة المفاتيح:</span> إضافة مجموعة من الاختصارات السريعة (F2-F10) للتنقل الفوري بين أهم شاشات النظام.
                    </li>
                    <li>
                        <span className="font-bold text-blue-600 dark:text-blue-400">إعادة ترتيب الجداول:</span> تحسين ترتيب الأعمدة في شاشات المرتجعات والمشتريات لتسهيل عملية الإدخال والمراجعة.
                    </li>
                    <li>
                        <span className="font-bold text-blue-600 dark:text-blue-400">التحديث التلقائي:</span> ربط النظام بمستودع GitHub الرسمي (ETQAN) لضمان وصول التحديثات بشكل تلقائي وسلس.
                    </li>
                </ul>
            </div>

            {/* Keyboard Shortcuts Card */}
            <div className={`${cardClass} border-l-4 border-l-indigo-500`}>
                <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-4 flex items-center gap-2">
                    <span>⌨️</span> اختصارات لوحة المفاتيح
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">استخدم هذه الاختصارات للتنقل السريع داخل النظام دون الحاجة لاستخدام الماوس:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { key: 'F2', name: 'فاتورة مبيعات', desc: 'فتح شاشة مبيعات جديدة' },
                        { key: 'F3', name: 'فاتورة مشتريات', desc: 'فتح شاشة مشتريات جديدة' },
                        { key: 'F4', name: 'مرتجع مبيعات', desc: 'فتح شاشة مرتجع مبيعات' },
                        { key: 'F5', name: 'مرتجع مشتريات', desc: 'فتح شاشة مرتجع مشتريات' },
                        { key: 'F6', name: 'سند قبض عميل', desc: 'تسجيل دفعة من عميل' },
                        { key: 'F7', name: 'سند صرف مورد', desc: 'تسجيل دفعة لمورد' },
                        { key: 'F8', name: 'إدارة المصروفات', desc: 'تسجيل المصاريف اليومية' },
                        { key: 'F9', name: 'بحث عن صنف', desc: 'البحث السريع عن الأصناف' },
                        { key: 'F10', name: 'الرئيسية', desc: 'العودة للوحة التحكم' },
                    ].map(s => (
                        <div key={s.key} className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded font-mono font-bold shadow-sm">{s.key}</span>
                            <div>
                                <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">{s.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Online Update Instructions Card */}
            <div className={`${cardClass} border-r-4 border-r-blue-500`}>
                <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <span>☁️</span> تحديث البرنامج أونلاين
                </h2>
                <div className="space-y-4 text-gray-700 dark:text-gray-300 text-lg">
                    <p>
                        يدعم البرنامج خاصية التحديث التلقائي عبر الإنترنت لضمان حصولك على أحدث الميزات والإصلاحات الأمنية فور صدورها.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">طريقة التحديث:</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li>انتقل إلى شاشة <button onClick={() => onNavigate('updateManagement')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">تحديث النظام</button>.</li>
                            <li>اضغط على زر <strong>"التحقق من وجود تحديثات"</strong>.</li>
                            <li>في حالة وجود إصدار جديد، سيظهر لك زر <strong>"تحميل التحديث"</strong>.</li>
                            <li>بعد التحميل، قم بفك ضغط الملف واستبدال ملفات البرنامج القديمة بالجديدة.</li>
                            <li>أعد تشغيل البرنامج وستجد كافة بياناتك وأرصدتك محفوظة كما هي.</li>
                        </ol>
                    </div>
                    <p className="text-sm italic text-gray-500 dark:text-gray-400">
                        * ملاحظة: يتم تخزين بياناتك في ملف منفصل عن ملفات البرنامج، لذا فإن عملية التحديث آمنة تماماً ولا تؤثر على بياناتك المخزنة.
                    </p>
                </div>
            </div>

            {/* Desktop Installation Card */}
            <div className={`${cardClass} border-r-4 border-r-purple-500`}>
                <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-4 flex items-center gap-2">
                    <span>💻</span> تشغيل البرنامج كأيقونة منفصلة
                </h2>
                <div className="space-y-4 text-gray-700 dark:text-gray-300 text-lg">
                    <p>
                        يمكنك تثبيت البرنامج ليظهر كأيقونة منفصلة على سطح المكتب وشريط المهام، مما يجعله يعمل كبرنامج كمبيوتر مستقل تماماً.
                    </p>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800 text-center">
                        <h3 className="font-bold text-purple-800 dark:text-purple-200 mb-4">تثبيت البرنامج على الجهاز:</h3>
                        
                        {showInstallBtn ? (
                            <button 
                                onClick={handleInstallClick}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform hover:-translate-y-1 transition-all flex items-center gap-3 mx-auto text-xl"
                            >
                                <DownloadIcon />
                                <span>تثبيت الآن على سطح المكتب</span>
                            </button>
                        ) : (
                            <div className="text-right space-y-3">
                                <p className="font-bold text-gray-800 dark:text-gray-200">إذا كنت تستخدم متصفح Chrome أو Edge:</p>
                                <ul className="list-disc list-inside space-y-1 text-base">
                                    <li>انظر إلى شريط العنوان (URL) في الأعلى.</li>
                                    <li>ستجد أيقونة صغيرة تشبه الشاشة أو علامة (+) مكتوب عليها "Install" أو "تثبيت".</li>
                                    <li>اضغط عليها وسيتم إضافة البرنامج لسطح المكتب فوراً.</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Features Card */}
            <div className={cardClass}>
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-6">أهم مميزات البرنامج</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map(feature => (
                        <div key={feature.name} className="flex items-start gap-4 p-4 rounded-lg bg-black/5 dark:bg-white/5">
                            <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">{feature.icon}</div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{feature.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Database and Connectivity Card */}
            <div className={cardClass}>
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-6">قاعدة البيانات والاتصال</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5">
                        <h3 className="font-bold text-gray-700 dark:text-gray-300">قاعدة البيانات النشطة</h3>
                        <p className="text-xl font-semibold text-blue-600 dark:text-blue-400 mt-2">{activeDatabaseName}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5">
                        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">حالة الاتصال</h3>
                        <div className="flex flex-col gap-2">
                            <StatusIndicator status={isDBReady} text="قاعدة البيانات المحلية" />
                            <StatusIndicator status={isCloudConnected} text="المزامنة السحابية" />
                        </div>
                    </div>
                    <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5">
                         <h3 className="font-bold text-gray-700 dark:text-gray-300">التقنية المستخدمة</h3>
                         <p className="text-base text-gray-600 dark:text-gray-400 mt-2">
                            يتم تخزين البيانات محلياً على جهازك باستخدام تقنية <strong>IndexedDB</strong> المتطورة لضمان أقصى سرعة وأمان للبيانات دون الحاجة إلى خوادم خارجية.
                         </p>
                    </div>
                </div>
            </div>

            {/* Technical Support Card */}
            <div className={cardClass}>
                <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-6">الدعم الفني</h2>
                <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                    <div className="text-center md:text-right">
                        <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">للحصول على المساعدة أو الإبلاغ عن مشكلة، يرجى التواصل معنا:</p>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 font-mono dir-ltr my-2">01007608603</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">متاح طوال أيام الأسبوع</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a 
                            href="tel:01007608603" 
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                            </svg>
                            <span>اتصال هاتفي</span>
                        </a>
                        <a 
                            href="https://wa.me/201007608603" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
                        >
                            <WhatsAppIcon />
                            <span>مراسلة واتساب</span>
                        </a>
                    </div>
                </div>
            </div>
            
            <div className={`${cardClass} text-center`}>
                <p className="text-gray-600 dark:text-gray-400">© {new Date().getFullYear()} جميع الحقوق محفوظة لـ ETQAN Solutions</p>
            </div>
        </div>
    );
};

export default About;
