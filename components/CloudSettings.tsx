
import React, { useState, useEffect } from 'react';
import { UploadIcon, CloudIcon, DatabaseIcon, SwitchHorizontalIcon, CogIcon, LockClosedIcon } from './Shared';
import type { FirebaseConfig, NotificationType } from '../types';

interface CloudSettingsProps {
    firebaseConfig: FirebaseConfig | null;
    setFirebaseConfig: React.Dispatch<React.SetStateAction<FirebaseConfig | null>>;
    showNotification: (type: NotificationType) => void;
}

const CloudSettings: React.FC<CloudSettingsProps> = ({ firebaseConfig, setFirebaseConfig, showNotification }) => {
    const [formData, setFormData] = useState<FirebaseConfig>({
        apiKey: '',
        authDomain: '',
        databaseURL: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    });

    const [rawConfigPaste, setRawConfigPaste] = useState('');

    useEffect(() => {
        if (firebaseConfig) {
            setFormData(firebaseConfig);
        }
    }, [firebaseConfig]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Smart Parser for Firebase Config Snippet
    const handleAutoFill = () => {
        if (!rawConfigPaste.trim()) {
            alert("يرجى لصق كود الإعدادات أولاً");
            return;
        }

        const config = { ...formData };
        let foundAny = false;

        const keys: (keyof FirebaseConfig)[] = [
            'apiKey', 'authDomain', 'databaseURL', 'projectId', 
            'storageBucket', 'messagingSenderId', 'appId'
        ];

        keys.forEach(key => {
            // Regex to find key: "value" or key: 'value' or "key": "value"
            const regex = new RegExp(`"?${key}"?\\s*:\\s*["']([^"']+)["']`, 'i');
            const match = rawConfigPaste.match(regex);
            if (match && match[1]) {
                config[key] = match[1];
                foundAny = true;
            }
        });

        if (foundAny) {
            setFormData(config);
            setRawConfigPaste('');
            alert("تم استخراج البيانات وتعبئة الحقول بنجاح. يرجى مراجعتها ثم الضغط على حفظ.");
        } else {
            alert("لم يتم التعرف على نمط إعدادات Firebase. يرجى التأكد من نسخ الكود كاملاً من لوحة تحكم Firebase.");
        }
    };

    const handleFileUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.json,.env';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                if (!content) return;

                let newConfig = { ...formData };
                let isParsed = false;

                // Try JSON
                try {
                    const json = JSON.parse(content);
                    if (json.apiKey || json.projectId) {
                        newConfig = { ...newConfig, ...json };
                        isParsed = true;
                    }
                } catch (e) {
                    // Not JSON
                }

                // Try Firebase snippet format
                if (!isParsed) {
                    const keys: (keyof FirebaseConfig)[] = [
                        'apiKey', 'authDomain', 'databaseURL', 'projectId', 
                        'storageBucket', 'messagingSenderId', 'appId'
                    ];
                    let foundAny = false;
                    keys.forEach(key => {
                        const regex = new RegExp(`"?${key}"?\\s*:\\s*["']([^"']+)["']`, 'i');
                        const match = content.match(regex);
                        if (match && match[1]) {
                            newConfig[key] = match[1];
                            foundAny = true;
                        }
                    });
                    if (foundAny) {
                        isParsed = true;
                    }
                }

                // Try line by line
                if (!isParsed) {
                    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
                    if (lines.length >= 6) {
                        newConfig.apiKey = lines[0] || '';
                        newConfig.authDomain = lines[1] || '';
                        newConfig.databaseURL = lines[2] || '';
                        newConfig.projectId = lines[3] || '';
                        newConfig.storageBucket = lines[4] || '';
                        newConfig.messagingSenderId = lines[5] || '';
                        newConfig.appId = lines[6] || '';
                        isParsed = true;
                    }
                }

                if (isParsed) {
                    setFormData(newConfig);
                    setFirebaseConfig(newConfig);
                    showNotification('save');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    alert("لم يتم التعرف على صيغة الملف. يرجى التأكد من محتواه.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic sanitization before saving
        const sanitizedData = { ...formData };
        if (sanitizedData.databaseURL) {
            let url = sanitizedData.databaseURL.trim();
            if (!url.match(/^https?:\/\//)) {
                url = `https://${url}`;
            }
            if (url.endsWith('/')) {
                url = url.slice(0, -1);
            }
            sanitizedData.databaseURL = url;
        }

        setFirebaseConfig(sanitizedData);
        showNotification('save');
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleClear = () => {
        if(confirm("هل أنت متأكد من إيقاف المزامنة السحابية؟ سيتم حذف الإعدادات من هذا الجهاز فقط.")) {
            setFirebaseConfig(null);
            setFormData({ apiKey: '', authDomain: '', databaseURL: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' });
            showNotification('delete');
            setTimeout(() => window.location.reload(), 1500);
        }
    }

    const handleForceSync = () => {
        window.location.reload();
    };

    const cardClass = "bg-white/40 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 dark:bg-gray-800/40 dark:border-white/10 transition-all duration-300";
    const inputContainerClass = "relative group";
    const inputClass = "w-full pr-12 pl-4 py-3 bg-white/70 dark:bg-gray-900/60 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-gray-800 dark:text-white transition-all duration-300 font-mono text-sm dir-ltr";
    const iconWrapperClass = "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2 text-sm mr-1";

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <CloudIcon className="w-10 h-10 text-blue-500" />
                        <span>الربط السحابي</span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 mr-1">مزامنة البيانات بين جميع أجهزتك في وقت واحد</p>
                </div>
                
                <div className={`flex items-center gap-4 p-2 px-4 rounded-2xl border-2 ${firebaseConfig ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">حالة المزامنة</span>
                        <span className={`text-lg font-black ${firebaseConfig ? 'text-green-600' : 'text-gray-500'}`}>
                            {firebaseConfig ? 'مُفعّـلة' : 'غير متصل'}
                        </span>
                    </div>
                    {firebaseConfig && (
                        <button onClick={handleForceSync} className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm hover:rotate-180 transition-transform duration-500 text-blue-600 dark:text-blue-400" title="تحديث الاتصال">
                            <SwitchHorizontalIcon />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Link Magic Area */}
            <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-600/20 dark:to-indigo-600/20 rounded-2xl p-6 border-2 border-dashed border-blue-400 dark:border-blue-500/50">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 space-y-3">
                        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                            <span className="text-2xl">⚡</span>
                            <span>الربط السريع (التعبئة التلقائية)</span>
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            افتح Firebase Console &gt; Project Settings &gt; General وانزل لأسفل حتى تجد <b>SDK setup and configuration</b>. 
                            انسخ الكود الموجود داخل `firebaseConfig` والصقه هنا.
                        </p>
                        <textarea 
                            value={rawConfigPaste}
                            onChange={(e) => setRawConfigPaste(e.target.value)}
                            className="w-full h-32 p-4 bg-white/50 dark:bg-black/30 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 font-mono text-xs dir-ltr"
                            placeholder='const firebaseConfig = {&#10;  apiKey: "...",&#10;  authDomain: "...",&#10;  ...&#10;};'
                        ></textarea>
                        <div className="flex flex-wrap gap-4">
                            <button 
                                type="button"
                                onClick={handleAutoFill}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <span>استخراج البيانات تلقائياً</span>
                                <SwitchHorizontalIcon className="w-4 h-4 ml-0 rotate-90" />
                            </button>
                            <button 
                                type="button"
                                onClick={handleFileUpload}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-8 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <span>جلب البيانات من ملف</span>
                                <UploadIcon className="w-4 h-4 ml-0" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Instructions Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className={cardClass}>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">خطوات الربط</h3>
                        <div className="space-y-6">
                            {[
                                { step: "1", title: "مشروع Firebase", desc: "أنشئ مشروعاً جديداً في Firebase Console." },
                                { step: "2", title: "نسخ الإعدادات", desc: "انسخ كود الـ SDK من إعدادات المشروع (Web App)." },
                                { step: "3", title: "لصق ومعالجة", desc: "استخدم حقل الربط السريع بالأعلى لتعبئة الحقول بضغطة واحدة." },
                                { step: "4", title: "تفعيل البيانات", desc: "تأكد من تفعيل Realtime Database وضبط القواعد (Rules) للقراءة والكتابة." }
                            ].map((item, index) => (
                                <div key={index} className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/30">
                                        {item.step}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-base">{item.title}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Configuration Form Column */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className={cardClass}>
                        {/* Section 1: Core Identity */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-6 flex items-center gap-2">
                                <CogIcon className="w-5 h-5" />
                                <span>بيانات الهوية (تم استخراجها)</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={inputContainerClass}>
                                    <label className={labelClass}>apiKey</label>
                                    <div className="relative">
                                        <div className={iconWrapperClass}><LockClosedIcon className="w-5 h-5" /></div>
                                        <input name="apiKey" type="text" value={formData.apiKey} onChange={handleInputChange} className={inputClass} placeholder="ستظهر هنا تلقائياً..." required />
                                    </div>
                                </div>
                                <div className={inputContainerClass}>
                                    <label className={labelClass}>projectId</label>
                                    <div className="relative">
                                        <div className={iconWrapperClass}><DatabaseIcon className="w-5 h-5" /></div>
                                        <input name="projectId" type="text" value={formData.projectId} onChange={handleInputChange} className={inputClass} placeholder="ستظهر هنا تلقائياً..." required />
                                    </div>
                                </div>
                                <div className={inputContainerClass}>
                                    <label className={labelClass}>appId</label>
                                    <div className="relative">
                                        <div className={iconWrapperClass}><CogIcon className="w-5 h-5" /></div>
                                        <input name="appId" type="text" value={formData.appId} onChange={handleInputChange} className={inputClass} placeholder="ستظهر هنا تلقائياً..." required />
                                    </div>
                                </div>
                                <div className={inputContainerClass}>
                                    <label className={labelClass}>messagingSenderId</label>
                                    <div className="relative">
                                        <div className={iconWrapperClass}><SwitchHorizontalIcon className="w-5 h-5" /></div>
                                        <input name="messagingSenderId" type="text" value={formData.messagingSenderId} onChange={handleInputChange} className={inputClass} placeholder="ستظهر هنا تلقائياً..." required />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Endpoints */}
                        <div className="mb-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-6 flex items-center gap-2">
                                <CloudIcon className="w-5 h-5" />
                                <span>عناوين الوصول السحابي</span>
                            </h3>
                            <div className="space-y-6">
                                <div className={inputContainerClass}>
                                    <label className={labelClass}>databaseURL</label>
                                    <div className="relative">
                                        <div className={iconWrapperClass}><DatabaseIcon className="w-5 h-5" /></div>
                                        <input name="databaseURL" type="text" value={formData.databaseURL} onChange={handleInputChange} className={inputClass} placeholder="https://your-db.firebaseio.com" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className={inputContainerClass}>
                                        <label className={labelClass}>authDomain</label>
                                        <div className="relative">
                                            <div className={iconWrapperClass}><LockClosedIcon className="w-5 h-5" /></div>
                                            <input name="authDomain" type="text" value={formData.authDomain} onChange={handleInputChange} className={inputClass} placeholder="project.firebaseapp.com" required />
                                        </div>
                                    </div>
                                    <div className={inputContainerClass}>
                                        <label className={labelClass}>storageBucket</label>
                                        <div className="relative">
                                            <div className={iconWrapperClass}><UploadIcon className="w-5 h-5" /></div>
                                            <input name="storageBucket" type="text" value={formData.storageBucket} onChange={handleInputChange} className={inputClass} placeholder="project.appspot.com" required />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button 
                                type="button" 
                                onClick={handleClear}
                                className="w-full sm:w-auto px-8 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all border border-red-200"
                            >
                                إيقاف الربط السحابي
                            </button>
                            <button 
                                type="submit" 
                                className="w-full sm:w-auto px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-xl shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-1 transition-all"
                            >
                                حفظ وتفعيل المزامنة
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CloudSettings;
