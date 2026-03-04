
import React, { useState } from 'react';
import { activateLicense } from '../services/license';
import { WarningIcon, WhatsAppIcon } from './Shared';

interface ActivationScreenProps {
    systemId: string;
    isExpired: boolean;
    daysRemaining: number;
    onActivationSuccess: () => void;
    onBack?: () => void;
}

// Local Phone Icon
const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
);

const ActivationScreen: React.FC<ActivationScreenProps> = ({ systemId, isExpired, daysRemaining, onActivationSuccess, onBack }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');

    const handleActivate = async () => {
        const success = await activateLicense(inputKey);
        if (success) {
            alert("تم تفعيل البرنامج بنجاح!");
            onActivationSuccess();
        } else {
            setError("كود التفعيل غير صحيح. يرجى التحقق والمحاولة مرة أخرى.");
        }
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(systemId);
        alert("تم نسخ معرف النظام.");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4" dir="rtl">
            <div className="max-w-lg w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 relative">
                {onBack && (
                    <button 
                        onClick={onBack}
                        className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700"
                        title="إغلاق"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                <div className="text-center mb-8">
                    <WarningIcon />
                    <h1 className="text-3xl font-bold mb-2 text-yellow-500">
                        {isExpired ? "انتهت الفترة التجريبية" : "نسخة تجريبية"}
                    </h1>
                    <p className="text-gray-400">
                        {isExpired 
                            ? "عفواً، لقد انتهت فترة الـ 3 أيام المجانية. يرجى تفعيل البرنامج للمتابعة." 
                            : `متبقي ${daysRemaining} أيام في الفترة التجريبية.`}
                    </p>
                </div>

                <div className="bg-black/30 p-4 rounded-lg mb-6">
                    <label className="block text-sm text-gray-400 mb-1">معرف النظام (أرسل هذا الكود للمطور):</label>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-black/50 p-3 rounded text-green-400 font-mono text-lg text-center border border-gray-600 dir-ltr select-all">
                            {systemId}
                        </code>
                        <button onClick={handleCopyId} className="bg-blue-600 hover:bg-blue-700 px-4 rounded font-bold transition-colors">
                            نسخ
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">كود التفعيل:</label>
                        <input 
                            type="text" 
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            placeholder="أدخل كود التفعيل هنا..."
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none text-center text-xl font-mono dir-ltr"
                        />
                    </div>
                    
                    {error && <p className="text-red-500 text-center text-sm font-bold">{error}</p>}

                    <button 
                        onClick={handleActivate}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg transform hover:-translate-y-1 transition-all text-lg"
                    >
                        تفعيل البرنامج
                    </button>
                </div>

                <div className="mt-8 text-center text-gray-500 text-sm border-t border-gray-700 pt-4">
                    <p className="mb-3 font-semibold">للحصول على كود التفعيل (الدعم الفني والمبيعات):</p>
                    <p className="text-3xl font-bold text-blue-400 dir-ltr font-mono mb-4">01007608603</p>
                    
                    <div className="flex gap-3 justify-center">
                        <a 
                            href="tel:01007608603" 
                            className="flex items-center gap-2 bg-gray-700 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
                        >
                            <PhoneIcon />
                            <span>اتصال</span>
                        </a>
                        <a 
                            href="https://wa.me/201007608603" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-gray-700 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors"
                        >
                            <WhatsAppIcon />
                            <span>واتساب</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivationScreen;
