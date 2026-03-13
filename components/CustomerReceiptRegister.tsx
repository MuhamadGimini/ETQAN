
import React, { useState, useMemo } from 'react';
import { FormattedNumber, PrintIcon } from './Shared';
import type { CustomerReceipt, Customer, Treasury, CompanyData } from '../types';
import { searchMatch, formatDateForDisplay } from '../utils';
import { getReportPrintTemplate } from '../utils/printing';

interface CustomerReceiptRegisterProps {
    customerReceipts: CustomerReceipt[];
    customers: Customer[];
    treasuries: Treasury[];
    companyData: CompanyData;
}

const CustomerReceiptRegister: React.FC<CustomerReceiptRegisterProps> = ({
    customerReceipts,
    customers,
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

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const filteredReceipts = useMemo(() => {
        return customerReceipts.filter(rec => {
            const customerName = customers.find(c => c.id === rec.customerId)?.name || '';
            const treasuryName = treasuries.find(t => t.id === rec.treasuryId)?.name || '';
            const methodLabel = rec.paymentMethod === 'cash' ? 'نقدي' : rec.paymentMethod === 'check' ? 'شيك' : 'خصم مسموح به';
            
            return (
                (!searchFilters.id || rec.id.toString().includes(searchFilters.id)) &&
                (!searchFilters.date || rec.date.includes(searchFilters.date)) &&
                (!searchFilters.name || searchMatch(customerName, searchFilters.name)) &&
                (!searchFilters.method || searchMatch(methodLabel, searchFilters.method)) &&
                (!searchFilters.amount || rec.amount.toString().includes(searchFilters.amount)) &&
                (!searchFilters.treasury || searchMatch(treasuryName, searchFilters.treasury)) &&
                (!searchFilters.notes || searchMatch(rec.notes, searchFilters.notes))
            );
        }).sort((a, b) => b.id - a.id);
    }, [customerReceipts, searchFilters, customers, treasuries]);

    const paginatedReceipts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReceipts, currentPage]);

    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

    const filteredTotal = useMemo(() => filteredReceipts.reduce((sum, r) => sum + r.amount, 0), [filteredReceipts]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const headers = ['رقم السند', 'التاريخ', 'اسم العميل', 'طريقة القبض', 'المبلغ', 'الخزينة'];

        const rowsHtml = filteredReceipts.map(r => {
            const customer = customers.find(c => c.id === r.customerId);
            const treasury = treasuries.find(t => t.id === r.treasuryId);
            const methodLabel = r.paymentMethod === 'cash' ? 'نقدي' : r.paymentMethod === 'check' ? 'شيك' : 'خصم مسموح به';
            return `
                <tr>
                    <td>${r.id}</td>
                    <td class="whitespace-nowrap">${new Date(r.date).toLocaleDateString('ar-EG')}</td>
                    <td class="text-right font-black">${customer?.name || '-'}</td>
                    <td>${methodLabel}</td>
                    <td class="text-green font-black">${r.amount.toFixed(2)}</td>
                    <td>${treasury?.name || '-'}</td>
                </tr>
            `;
        }).join('');

        const summaryHtml = `
            <div class="w-full mt-4">
                <div class="summary-item"><span>عدد السندات:</span><span>${filteredReceipts.length}</span></div>
                <div class="summary-item font-black text-lg border-t-2 border-indigo mt-2 pt-2">
                    <span>إجمالي المبالغ:</span><span class="text-green">${filteredTotal.toFixed(2)}</span>
                </div>
            </div>
        `;

        printWindow.document.write(getReportPrintTemplate('سجل سندات القبض', '', companyData, headers, rowsHtml, summaryHtml, undefined, undefined, 'A4', '#16a34a'));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:text-white";

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-indigo-800 dark:text-indigo-300">سجل سندات القبض</h1>
                <div className="flex gap-4 items-center">
                    <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md">
                        <PrintIcon /> <span>طباعة السجل</span>
                    </button>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 px-4 rounded-lg text-center shadow-sm">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي المبالغ</p>
                        <p className="text-xl font-black text-green-700 dark:text-green-300"><FormattedNumber value={filteredTotal} /></p>
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2 mb-4 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">رقم السند</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.id} onChange={e => setSearchFilters({...searchFilters, id: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">التاريخ</label><input type="text" placeholder="يوم-شهر-سنة" className={filterInputClass} value={searchFilters.date} onChange={e => setSearchFilters({...searchFilters, date: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">العميل</label><input type="text" placeholder="اسم العميل..." className={filterInputClass} value={searchFilters.name} onChange={e => setSearchFilters({...searchFilters, name: e.target.value})} /></div>
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
                        <div>اسم العميل</div>
                        <div>طريقة القبض</div>
                        <div>المبلغ</div>
                        <div>الخزينة</div>
                        <div>الملاحظات</div>
                    </div>
                    
                    <div className="overflow-y-auto max-h-[576px] scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                        {paginatedReceipts.map((r) => {
                            const customer = customers.find(c => c.id === r.customerId);
                            const treasury = treasuries.find(t => t.id === r.treasuryId);
                            const methodLabel = r.paymentMethod === 'cash' ? 'نقدي' : r.paymentMethod === 'check' ? 'شيك' : 'خصم مسموح به';
                            return (
                                <div key={r.id} className="grid grid-cols-7 items-center p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors">
                                    <div className="font-bold text-indigo-600">{r.id}</div>
                                    <div className="text-gray-600 dark:text-gray-400 text-sm">{new Date(r.date).toLocaleDateString('ar-EG')}</div>
                                    <div className="font-bold text-gray-800 dark:text-gray-200 truncate">{customer?.name}</div>
                                    <div className="text-gray-700 dark:text-gray-300 text-sm">{methodLabel}</div>
                                    <div className="font-bold text-green-600"><FormattedNumber value={r.amount} /></div>
                                    <div className="text-gray-600 dark:text-gray-400 truncate">{treasury?.name || '-'}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.notes || '-'}</div>
                                </div>
                            );
                        })}
                        {filteredReceipts.length === 0 && (
                            <div className="p-8 text-center text-gray-500">لا توجد سندات تطابق معايير البحث.</div>
                        )}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-4 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow disabled:opacity-50 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">السابق</button>
                            <span className="font-bold text-gray-700 dark:text-gray-300">صفحة {currentPage} من {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow disabled:opacity-50 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">التالي</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerReceiptRegister;
