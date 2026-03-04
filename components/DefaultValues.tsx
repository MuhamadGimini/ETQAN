
import React, { useState, useEffect, useRef } from 'react';
import type { DefaultValues, Warehouse, Unit, SalesRepresentative, Treasury, NotificationType } from '../types';
import { UploadIcon, DeleteIcon } from './Shared';

interface DefaultValuesProps {
    defaultValues: DefaultValues;
    setDefaultValues: React.Dispatch<React.SetStateAction<DefaultValues>>;
    warehouses: Warehouse[];
    units: Unit[];
    salesRepresentatives: SalesRepresentative[];
    treasuries: Treasury[];
    showNotification: (type: NotificationType) => void;
}

const DefaultValuesComponent: React.FC<DefaultValuesProps> = ({ 
    defaultValues, setDefaultValues, warehouses, units, salesRepresentatives, treasuries, showNotification 
}) => {
    const [formData, setFormData] = useState<DefaultValues>(defaultValues);
    const bgInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData(defaultValues);
    }, [defaultValues]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
             const checked = (e.target as HTMLInputElement).checked;
             setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (['backgroundOpacity', 'backgroundBlur', 'salesInvoiceOpacity', 'purchaseInvoiceOpacity', 'salesReturnOpacity', 'purchaseReturnOpacity'].includes(name)) {
             setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
        } else {
            const isNumeric = ['defaultWarehouseId', 'defaultUnitId', 'defaultSalesRepId', 'defaultTreasuryId'].includes(name);
            setFormData(prev => ({ ...prev, [name]: isNumeric ? parseInt(value) : value as any }));
        }
    };

    const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setFormData(prev => ({ ...prev, [fieldName]: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveBg = (fieldName: string) => {
        setFormData(prev => ({ ...prev, [fieldName]: '' }));
        const input = document.getElementById(`bg-input-${fieldName}`) as HTMLInputElement;
        if (input) input.value = '';
    };

    const renderBackgroundUploader = (label: string, fieldName: keyof DefaultValues, opacityFieldName: keyof DefaultValues) => (
        <div className="space-y-4 border p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <label className={labelClass}>{label}</label>
            <div className="relative group">
                <div className={`w-full h-32 border-4 border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-white/50 dark:bg-black/20 ${!formData[fieldName] ? 'border-gray-300' : 'border-blue-400'}`}>
                    {formData[fieldName] ? (
                        <img src={formData[fieldName] as string} alt={label} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center text-gray-400">
                            <UploadIcon />
                            <p className="mt-2 text-xs">اضغط لاختيار صورة</p>
                        </div>
                    )}
                </div>
                <input 
                    type="file" 
                    id={`bg-input-${fieldName}`}
                    onChange={(e) => handleBgChange(e, fieldName as string)} 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                
                {formData[fieldName] && (
                    <button 
                        type="button" 
                        onClick={() => handleRemoveBg(fieldName as string)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                        title="حذف الخلفية"
                    >
                        <DeleteIcon />
                    </button>
                )}
            </div>
            
            <div className="space-y-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">شفافية التعتيم ({Math.round(((formData[opacityFieldName] as number) || 0.6) * 100)}%)</label>
                <input 
                    type="range" 
                    name={opacityFieldName as string} 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={(formData[opacityFieldName] as number) !== undefined ? (formData[opacityFieldName] as number) : 0.6} 
                    onChange={handleInputChange} 
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
            </div>
        </div>
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setDefaultValues(formData);
        showNotification('save');
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-8 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";
    const checkboxContainerClass = "flex items-center space-x-4 space-x-reverse p-4 bg-black/5 dark:bg-white/5 rounded-lg";
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">القيم الافتراضية</h1>
            <div className={cardClass}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-300 dark:border-gray-600 pb-3">الإعدادات الافتراضية للحركات</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className={labelClass} htmlFor="defaultWarehouseId">المخزن الافتراضي</label>
                            <select id="defaultWarehouseId" name="defaultWarehouseId" value={formData.defaultWarehouseId} onChange={handleInputChange} className={inputClass}>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="defaultTreasuryId">الخزينة الافتراضية</label>
                            <select id="defaultTreasuryId" name="defaultTreasuryId" value={formData.defaultTreasuryId} onChange={handleInputChange} className={inputClass}>
                                {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="defaultUnitId">الوحدة الافتراضية</label>
                            <select id="defaultUnitId" name="defaultUnitId" value={formData.defaultUnitId} onChange={handleInputChange} className={inputClass}>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="defaultSalesRepId">المندوب الافتراضي</label>
                            <select id="defaultSalesRepId" name="defaultSalesRepId" value={formData.defaultSalesRepId} onChange={handleInputChange} className={inputClass}>
                                <option value={0}>بدون</option>
                                {salesRepresentatives.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="defaultPaymentMethodInvoices">طريقة الدفع (الفواتير)</label>
                            <select id="defaultPaymentMethodInvoices" name="defaultPaymentMethodInvoices" value={formData.defaultPaymentMethodInvoices} onChange={handleInputChange} className={inputClass}>
                                <option value="credit">آجل</option>
                                <option value="cash">نقدي</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="defaultPaymentMethodReceipts">طريقة الدفع (السندات)</label>
                            <select id="defaultPaymentMethodReceipts" name="defaultPaymentMethodReceipts" value={formData.defaultPaymentMethodReceipts} onChange={handleInputChange} className={inputClass}>
                                <option value="cash">نقدي</option>
                                <option value="check">شيك</option>
                                <option value="discount">خصم</option>
                            </select>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 pt-6 mb-2 border-b border-gray-300 dark:border-gray-600 pb-3">مظهر البرنامج</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className={labelClass}>صورة خلفية البرنامج (الرئيسية)</label>
                            <div className="relative group">
                                <div className={`w-full h-48 border-4 border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-white/50 dark:bg-black/20 ${!formData.backgroundImage ? 'border-gray-300' : 'border-blue-400'}`}>
                                    {formData.backgroundImage ? (
                                        <img src={formData.backgroundImage} alt="خلفية البرنامج" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <UploadIcon />
                                            <p className="mt-2 text-sm">اضغط لاختيار صورة خلفية</p>
                                        </div>
                                    )}
                                </div>
                                <input type="file" id="bg-input-backgroundImage" onChange={(e) => handleBgChange(e, 'backgroundImage')} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                
                                {formData.backgroundImage && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveBg('backgroundImage')}
                                        className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                                        title="حذف الخلفية"
                                    >
                                        <DeleteIcon />
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">ستظهر هذه الصورة كخلفية لجميع شاشات البرنامج بما في ذلك صفحة الدخول، ما لم يتم تخصيص خلفية لشاشة معينة.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-4">
                                <label className={labelClass}>شفافية طبقة التعتيم ({Math.round((formData.backgroundOpacity !== undefined ? formData.backgroundOpacity : 0.6) * 100)}%)</label>
                                <input 
                                    type="range" 
                                    name="backgroundOpacity" 
                                    min="0" 
                                    max="1" 
                                    step="0.05" 
                                    value={formData.backgroundOpacity !== undefined ? formData.backgroundOpacity : 0.6} 
                                    onChange={handleInputChange} 
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">تحكم في درجة وضوح الخلفية الرئيسية.</p>
                            </div>
                            <div className="space-y-4 mt-6">
                                <label className={labelClass}>تمويه الخلفية ({formData.backgroundBlur !== undefined ? formData.backgroundBlur : 2}px)</label>
                                <input 
                                    type="range" 
                                    name="backgroundBlur" 
                                    min="0" 
                                    max="20" 
                                    step="1" 
                                    value={formData.backgroundBlur !== undefined ? formData.backgroundBlur : 2} 
                                    onChange={handleInputChange} 
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">تحكم في ضبابية الخلفية (0 = صورة حادة).</p>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 pt-6 mb-2 border-b border-gray-300 dark:border-gray-600 pb-3">تخصيص خلفيات الفواتير</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">يمكنك تعيين خلفية مختلفة لكل نوع من الفواتير. في حال عدم تعيين خلفية، سيتم استخدام الخلفية الرئيسية.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {renderBackgroundUploader('فاتورة مبيعات', 'salesInvoiceBackground', 'salesInvoiceOpacity')}
                        {renderBackgroundUploader('فاتورة مشتريات', 'purchaseInvoiceBackground', 'purchaseInvoiceOpacity')}
                        {renderBackgroundUploader('مرتجع مبيعات', 'salesReturnBackground', 'salesReturnOpacity')}
                        {renderBackgroundUploader('مرتجع مشتريات', 'purchaseReturnBackground', 'purchaseReturnOpacity')}
                    </div>

                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 pt-6 mb-2 border-b border-gray-300 dark:border-gray-600 pb-3">تخصيص الشات</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>لون ثيم الشات</label>
                            <div className="flex flex-wrap gap-3 mb-3">
                                {['#008069', '#0f172a', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'].map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, chatThemeColor: color }))}
                                        className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${formData.chatThemeColor === color ? 'border-white ring-2 ring-blue-500 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="color" 
                                    name="chatThemeColor" 
                                    value={formData.chatThemeColor || '#008069'} 
                                    onChange={handleInputChange} 
                                    className="h-10 w-20 rounded cursor-pointer"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">أو اختر لوناً مخصصاً</span>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 pt-6 mb-2 border-b border-gray-300 dark:border-gray-600 pb-3">إعدادات التحديث التلقائي</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className={labelClass} htmlFor="githubRepo">مستودع GitHub (اسم المستخدم/اسم المستودع)</label>
                            <input 
                                type="text" 
                                id="githubRepo" 
                                name="githubRepo" 
                                value={formData.githubRepo || ''} 
                                onChange={handleInputChange} 
                                placeholder="مثال: username/repo" 
                                className={inputClass} 
                                dir="ltr"
                            />
                            <p className="text-sm text-gray-500 mt-1">يستخدم للتحقق من وجود تحديثات جديدة للبرنامج.</p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 pt-6 mb-2 border-b border-gray-300 dark:border-gray-600 pb-3">تخصيص الرسائل</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className={labelClass} htmlFor="invoiceFooter">تذييل الفواتير والتقارير</label>
                            <textarea id="invoiceFooter" name="invoiceFooter" value={formData.invoiceFooter} onChange={handleInputChange} rows={2} className={inputClass + ' resize-none'} />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="whatsappFooter">تذييل رسائل الواتساب</label>
                            <textarea id="whatsappFooter" name="whatsappFooter" value={formData.whatsappFooter} onChange={handleInputChange} rows={2} className={inputClass + ' resize-none'} />
                        </div>
                    </div>

                    <div className="flex justify-start pt-4">
                        <button type="submit" className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transform hover:-translate-y-1 transition-all duration-300 text-lg">حفظ التغييرات</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DefaultValuesComponent;
