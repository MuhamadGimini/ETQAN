
import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon, DeleteIcon } from './Shared';
import type { CompanyData, NotificationType } from '../types';

interface CompanySettingsProps {
    companyData: CompanyData;
    setCompanyData: React.Dispatch<React.SetStateAction<CompanyData>>;
    showNotification: (type: NotificationType) => void;
}

const CompanySettings: React.FC<CompanySettingsProps> = ({ companyData, setCompanyData, showNotification }) => {
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    useEffect(() => {
        if (companyData.logo) {
            setLogoPreview(companyData.logo);
        }
    }, [companyData.logo]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCompanyData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setLogoPreview(result);
                setCompanyData(prev => ({ ...prev, logo: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
        setCompanyData(prev => ({ ...prev, logo: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        showNotification('save');
    };

    return (
         <div className="space-y-8">
             <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">إعدادات بيانات الشركة</h1>
            <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-8 border border-white/40 dark:bg-gray-700/30 dark:border-white/20">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className={labelClass} htmlFor="name">اسم الشركة (يظهر في الفواتير)</label>
                                <input id="name" name="name" type="text" value={companyData.name} onChange={handleInputChange} className={inputClass} required placeholder="مثال: شركة النور للتجارة" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass} htmlFor="cr">رقم السجل التجاري</label>
                                    <input id="cr" name="cr" type="text" value={companyData.cr} onChange={handleInputChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="tr">رقم التسجيل الضريبي</label>
                                    <input id="tr" name="tr" type="text" value={companyData.tr} onChange={handleInputChange} className={inputClass} />
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass} htmlFor="phone1">رقم التليفون 1</label>
                                    <input id="phone1" name="phone1" type="tel" value={companyData.phone1} onChange={handleInputChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="phone2">رقم التليفون 2</label>
                                    <input id="phone2" name="phone2" type="tel" value={companyData.phone2} onChange={handleInputChange} className={inputClass} />
                                </div>
                            </div>
                             <div>
                                <label className={labelClass} htmlFor="address">العنوان التفصيلي</label>
                                <textarea id="address" name="address" value={companyData.address} onChange={handleInputChange} rows={3} className={inputClass + ' resize-none'} />
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-start pt-8">
                            <label className={labelClass + " mb-4"}>شعار الشركة (اللوجو)</label>
                            <div className="relative group">
                                <div className={`w-64 h-64 border-4 border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-white/50 dark:bg-black/20 ${!logoPreview ? 'border-gray-300' : 'border-blue-400'}`}>
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="معاينة الشعار" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <UploadIcon />
                                            <p className="mt-2 text-sm">اضغط لرفع صورة</p>
                                        </div>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                
                                {logoPreview && (
                                    <button 
                                        type="button" 
                                        onClick={handleRemoveLogo}
                                        className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                                        title="حذف الشعار"
                                    >
                                        <DeleteIcon />
                                    </button>
                                )}
                            </div>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                                يفضل استخدام صورة مربعة بخلفية شفافة (PNG) للحصول على أفضل جودة في الطباعة.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-300 dark:border-gray-600">
                        <button type="submit" className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transform hover:-translate-y-1 transition-all duration-300 text-lg flex items-center">
                            <span>حفظ إعدادات الشركة</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanySettings;
