
import React, { useState, useMemo } from 'react';
import { FormattedNumber } from './Shared';
import type { SupplierPayment, Supplier, Treasury, CompanyData } from '../types';
import { searchMatch } from '../utils';

interface SupplierPaymentRegisterProps {
    supplierPayments: SupplierPayment[];
    suppliers: Supplier[];
    treasuries: Treasury[];
    companyData: CompanyData;
}

const SupplierPaymentRegister: React.FC<SupplierPaymentRegisterProps> = ({
    supplierPayments,
    suppliers,
    treasuries,
    companyData
}) => {
    const [searchFilters, setSearchFilters] = useState({
        id: '',
        date: '',
        name: '',
        method: '',
        amount: '',
        treasury: '',
        notes: ''
    });

    const filteredPayments = useMemo(() => {
        return supplierPayments.filter(p => {
            const supplierName = suppliers.find(s => s.id === p.supplierId)?.name || '';
            const treasuryName = treasuries.find(t => t.id === p.treasuryId)?.name || '';
            const methodLabel = p.paymentMethod === 'cash' ? 'نقدي' : p.paymentMethod === 'check' ? 'شيك' : 'خصم مكتسب';
            
            return (
                (!searchFilters.id || p.id.toString().includes(searchFilters.id)) &&
                (!searchFilters.date || p.date.includes(searchFilters.date)) &&
                (!searchFilters.name || searchMatch(supplierName, searchFilters.name)) &&
                (!searchFilters.method || searchMatch(methodLabel, searchFilters.method)) &&
                (!searchFilters.amount || p.amount.toString().includes(searchFilters.amount)) &&
                (!searchFilters.treasury || searchMatch(treasuryName, searchFilters.treasury)) &&
                (!searchFilters.notes || searchMatch(p.notes, searchFilters.notes))
            );
        }).sort((a, b) => b.id - a.id);
    }, [supplierPayments, searchFilters, suppliers, treasuries]);

    const filteredTotal = useMemo(() => filteredPayments.reduce((sum, p) => sum + p.amount, 0), [filteredPayments]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none dark:text-white";

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300">سجل سندات الدفع</h1>
                <div className="flex gap-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 px-4 rounded-lg text-center shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي المبالغ</p>
                        <p className="text-xl font-black text-red-700 dark:text-red-300"><FormattedNumber value={filteredTotal} /></p>
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2 mb-4 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">رقم السند</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.id} onChange={e => setSearchFilters({...searchFilters, id: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">التاريخ</label><input type="text" placeholder="يوم-شهر-سنة" className={filterInputClass} value={searchFilters.date} onChange={e => setSearchFilters({...searchFilters, date: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المورد</label><input type="text" placeholder="اسم المورد..." className={filterInputClass} value={searchFilters.name} onChange={e => setSearchFilters({...searchFilters, name: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الطريقة</label><input type="text" placeholder="نقدي/شيك..." className={filterInputClass} value={searchFilters.method} onChange={e => setSearchFilters({...searchFilters, method: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المبلغ</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.amount} onChange={e => setSearchFilters({...searchFilters, amount: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الخزينة</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.treasury} onChange={e => setSearchFilters({...searchFilters, treasury: e.target.value})} /></div>
                    <div className="flex items-end gap-1">
                        <div className="flex-1"><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الملاحظات</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.notes} onChange={e => setSearchFilters({...searchFilters, notes: e.target.value})} /></div>
                        <button onClick={() => setSearchFilters({id:'', date:'', name:'', method:'', amount:'', treasury:'', notes:''})} className="bg-gray-200 dark:bg-gray-600 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white" title="تفريغ"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
                    <div className="bg-gray-100 dark:bg-gray-800 grid grid-cols-7 text-right font-bold p-3 border-b border-gray-300 dark:border-gray-600 sticky top-0 z-10">
                        <div>رقم السند</div>
                        <div>التاريخ</div>
                        <div>اسم المورد</div>
                        <div>طريقة الدفع</div>
                        <div>المبلغ</div>
                        <div>الخزينة</div>
                        <div>الملاحظات</div>
                    </div>
                    
                    <div className="overflow-y-auto max-h-[576px] scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                        {filteredPayments.map((p) => {
                            const supplier = suppliers.find(s => s.id === p.supplierId);
                            const treasury = treasuries.find(t => t.id === p.treasuryId);
                            const methodLabel = p.paymentMethod === 'cash' ? 'نقدي' : p.paymentMethod === 'check' ? 'شيك' : 'خصم مكتسب';
                            return (
                                <div key={p.id} className="grid grid-cols-7 items-center p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors">
                                    <div className="font-bold text-teal-600">{p.id}</div>
                                    <div className="text-gray-600 dark:text-gray-400 text-sm">{new Date(p.date).toLocaleDateString('ar-EG')}</div>
                                    <div className="font-bold text-gray-800 dark:text-gray-200 truncate">{supplier?.name}</div>
                                    <div className="text-gray-700 dark:text-gray-300 text-sm">{methodLabel}</div>
                                    <div className="font-bold text-red-600"><FormattedNumber value={p.amount} /></div>
                                    <div className="text-gray-600 dark:text-gray-400 truncate">{treasury?.name || '-'}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.notes || '-'}</div>
                                </div>
                            );
                        })}
                        {filteredPayments.length === 0 && (
                            <div className="p-8 text-center text-gray-500">لا توجد سندات تطابق معايير البحث.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierPaymentRegister;
