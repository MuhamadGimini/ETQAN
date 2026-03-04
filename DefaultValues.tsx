import React, { useState, useEffect } from 'react';
import type { DefaultValues, Warehouse, Unit, SalesRepresentative, Treasury, NotificationType } from '../types';

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

    useEffect(() => {
        setFormData(defaultValues);
    }, [defaultValues]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
             const checked = (e.target as HTMLInputElement).checked;
             setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            const isNumeric = ['defaultWarehouseId', 'defaultUnitId', 'defaultSalesRepId', 'defaultTreasuryId'].includes(name);
            setFormData(prev => ({ ...prev, [name]: isNumeric ? parseInt(value) : value as any }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setDefaultValues(formData);
        showNotification('save');
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-8 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";
    const checkboxContainerClass = "flex items-center space-x-4 space-x-reverse p-4 bg-black/5 dark:bg-white/5 rounded-lg";
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">القيم الافتراضية</h1>
            <div className={cardClass}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-300 dark:border-gray-600 pb-3">الإعدادات الافتراضية للحركات</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Row 1 */}
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

                        {/* Row 2 */}
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

                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 pt-6 mb-2 border-b border-gray-300 dark:border-gray-600 pb-3">إعدادات النسخ الاحتياطي</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={checkboxContainerClass}>
                            <input 
                                type="checkbox" 
                                id="enableBackupAlert" 
                                name="enableBackupAlert" 
                                checked={formData.enableBackupAlert} 
                                onChange={handleInputChange} 
                                className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex flex-col mr-4">
                                <label htmlFor="enableBackupAlert" className="font-bold text-gray-800 dark:text-gray-200 cursor-pointer">تنبيه عند الخروج</label>
                                <span className="text-sm text-gray-600 dark:text-gray-400">إظهار رسالة تذكير بحفظ نسخة احتياطية عند إغلاق التطبيق.</span>
                            </div>
                        </div>
                    </div>


                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 pt-6 mb-2 border-b border-gray-300 dark:border-gray-600 pb-3">تخصيص الرسائل</h2>
                     <div>
                        <label className={labelClass} htmlFor="invoiceFooter">تذييل الفواتير والتقارير</label>
                        <textarea id="invoiceFooter" name="invoiceFooter" value={formData.invoiceFooter} onChange={handleInputChange} rows={2} className={inputClass + ' resize-none'} />
                    </div>
                     <div>
                        <label className={labelClass} htmlFor="whatsappFooter">تذييل رسائل الواتساب</label>
                        <textarea id="whatsappFooter" name="whatsappFooter" value={formData.whatsappFooter} onChange={handleInputChange} rows={2} className={inputClass + ' resize-none'} />
                    </div>


                    <div className="flex justify-start pt-4">
                        <button type="submit" className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transform hover:-translate-y-1 transition-all duration-300">حفظ التغييرات</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DefaultValuesComponent;