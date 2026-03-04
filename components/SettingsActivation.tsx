
import React, { useState } from 'react';
import { activateLicense, LicenseStatus } from '../services/license';
import { WarningIcon, UploadIcon, WhatsAppIcon } from './Shared';

interface SettingsActivationProps {
    licenseStatus: LicenseStatus | null;
}

// Local Phone Icon
const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
);

const SettingsActivation: React.FC<SettingsActivationProps> = ({ licenseStatus }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');

    const handleActivate = async () => {
        if (!inputKey.trim()) {
            setError("يرجى إدخال كود التفعيل.");
            return;
        }
        const success = await activateLicense(inputKey);
        if (success) {
            alert("تم تفعيل البرنامج بنجاح! سيتم إعادة تحميل الصفحة.");
            window.location.reload();
        } else {
            setError("كود التفعيل غير صحيح. يرجى التحقق والمحاولة مرة أخرى.");
        }
    };

    const handleCopyId = () => {
        if (licenseStatus?.systemId) {
            navigator.clipboard.writeText(licenseStatus.systemId);
            alert("تم نسخ معرف النظام.");
        }
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-8 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300 text-center font-mono text-lg dir-ltr";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">تفعيل البرنامج</h1>
            
            <div className={cardClass}>
                <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
                    
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-6 rounded-xl border border-yellow-200 dark:border-yellow-700 w-full">
                        <WarningIcon />
                        <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">نسخة غير مفعلة / تجريبية</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                            للاستمرار في استخدام البرنامج والحصول على التحديثات والدعم الفني، يرجى تفعيل نسختك.
                        </p>
                        <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                            <p className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-200">خطوات التفعيل:</p>
                            <ol className="list-decimal list-inside text-right space-y-2 text-gray-700 dark:text-gray-300">
                                <li>انسخ "معرف النظام" الموضح بالأسفل.</li>
                                <li>تواصل مع الدعم الفني عبر الهاتف أو الواتساب.</li>
                                <li>أرسل معرف النظام واستلم "كود التفعيل".</li>
                                <li>أدخل كود التفعيل في الخانة المخصصة واضغط تفعيل.</li>
                            </ol>
                        </div>
                    </div>

                    <div className="w-full bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-3">بيانات المبيعات والدعم الفني</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 font-semibold">لشراء النسخة أو الحصول على كود التفعيل:</p>
                        
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-white/60 dark:bg-black/20 rounded-lg px-8 py-3 inline-block w-full max-w-md">
                                <p className="text-4xl font-bold text-blue-700 dark:text-blue-400 dir-ltr font-mono tracking-wider">01007608603</p>
                            </div>
                            
                            <div className="flex gap-4 w-full max-w-md justify-center">
                                <a 
                                    href="tel:01007608603" 
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                >
                                    <PhoneIcon />
                                    <span>اتصال</span>
                                </a>
                                <a 
                                    href="https://wa.me/201007608603" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                >
                                    <WhatsAppIcon />
                                    <span>واتساب</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="w-full">
                        <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 text-right">معرف النظام (System ID)</label>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded text-green-600 dark:text-green-400 font-mono text-lg border border-gray-300 dark:border-gray-600 dir-ltr select-all">
                                {licenseStatus?.systemId || 'Loading...'}
                            </code>
                            <button onClick={handleCopyId} className="bg-gray-600 hover:bg-gray-700 text-white px-4 rounded font-bold transition-colors shadow-md">
                                نسخ
                            </button>
                        </div>
                    </div>

                    <div className="w-full border-t border-gray-300 dark:border-gray-600 pt-6">
                        <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 text-right">كود التفعيل (Activation Key)</label>
                        <input 
                            type="text" 
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            placeholder="أدخل كود التفعيل هنا..."
                            className={inputClass}
                        />
                        {error && <p className="text-red-500 text-sm font-bold mt-2">{error}</p>}
                    </div>

                    <button 
                        onClick={handleActivate}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform hover:-translate-y-1 transition-all text-xl"
                    >
                        تفعيل البرنامج الآن
                    </button>

                </div>
            </div>
        </div>
    );
};

export default SettingsActivation;
