
import React, { useState } from 'react';
import type { SalesInvoice, SalesReturn, Expense, PurchaseInvoice, PurchaseReturn, CustomerReceipt, SupplierPayment, TreasuryTransfer, ExpenseCategory, Treasury, DefaultValues, CompanyData } from '../types';
import { PrintIcon } from './Shared';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';
import { formatDateForDisplay } from '../utils';

interface DailyLedgerProps {
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    expenses: Expense[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    customerReceipts: CustomerReceipt[];
    supplierPayments: SupplierPayment[];
    treasuryTransfers: TreasuryTransfer[];
    expenseCategories: ExpenseCategory[];
    treasuries: Treasury[];
    defaultValues: DefaultValues;
    companyData: CompanyData;
}

interface ReportData {
    cashIn: { label: string, amount: number }[];
    totalCashIn: number;
    cashOut: { label: string, amount: number }[];
    expensesBreakdown: { label: string, amount: number }[];
    totalExpenses: number;
    totalCashOut: number;
    netCashFlow: number;
    treasuryName: string;
}

const DailyLedger: React.FC<DailyLedgerProps> = ({
    salesInvoices,
    salesReturns,
    expenses,
    purchaseInvoices,
    purchaseReturns,
    customerReceipts,
    supplierPayments,
    treasuryTransfers,
    expenseCategories,
    treasuries,
    defaultValues,
    companyData
}) => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTreasuryId, setSelectedTreasuryId] = useState<number>(defaultValues.defaultTreasuryId);
    const [reportData, setReportData] = useState<ReportData | null>(null);

    const dateInputProps = useDateInput(selectedDate, setSelectedDate);

    const handleSearch = () => {
        const isAllTreasuries = selectedTreasuryId === 0;
        const includeDirectPayments = isAllTreasuries || selectedTreasuryId === defaultValues.defaultTreasuryId;

        // Cash In
        const salesCash = includeDirectPayments ? salesInvoices.filter(inv => inv.date.startsWith(selectedDate)).reduce((sum, inv) => sum + (inv.paidAmount || 0), 0) : 0;
        const receiptsCash = customerReceipts.filter(rec => rec.date === selectedDate && (isAllTreasuries || rec.treasuryId === selectedTreasuryId)).reduce((sum, rec) => sum + rec.amount, 0);
        const purchaseReturnsCash = includeDirectPayments ? purchaseReturns.filter(ret => ret.date.startsWith(selectedDate)).reduce((sum, ret) => sum + (ret.paidAmount || 0), 0) : 0;
        const transfersInCash = treasuryTransfers.filter(t => t.date === selectedDate && (isAllTreasuries || t.toTreasuryId === selectedTreasuryId)).reduce((sum, t) => sum + t.amount, 0);

        const cashIn = [
            { label: 'سندات القبض', amount: receiptsCash },
            { label: 'مقبوضات فواتير المبيعات (كاش/مقدم)', amount: salesCash },
            { label: 'مستردات مرتجع المشتريات', amount: purchaseReturnsCash },
            { label: isAllTreasuries ? 'إجمالي حركة التحويلات' : 'تحويلات واردة من خزائن أخرى', amount: transfersInCash },
        ].filter(item => item.amount > 0);

        const totalCashIn = cashIn.reduce((sum, item) => sum + item.amount, 0);

        // Cash Out
        const dailyExpenses = expenses.filter(exp => exp.date === selectedDate && (isAllTreasuries || exp.treasuryId === selectedTreasuryId));
        const expensesMap = new Map<string, number>();
        dailyExpenses.forEach(exp => {
            const categoryName = expenseCategories.find(c => c.id === exp.categoryId)?.name || 'مصروف غير محدد';
            expensesMap.set(categoryName, (expensesMap.get(categoryName) || 0) + exp.amount);
        });
        const expensesBreakdown = Array.from(expensesMap.entries()).map(([label, amount]) => ({ label, amount }));
        const totalExpenses = dailyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        const purchasesCash = includeDirectPayments ? purchaseInvoices.filter(inv => inv.date.startsWith(selectedDate)).reduce((sum, inv) => sum + (inv.paidAmount || 0), 0) : 0;
        const paymentsCash = supplierPayments.filter(p => p.date === selectedDate && (isAllTreasuries || p.treasuryId === selectedTreasuryId)).reduce((sum, p) => sum + p.amount, 0);
        const salesReturnsCash = includeDirectPayments ? salesReturns.filter(ret => ret.date.startsWith(selectedDate)).reduce((sum, ret) => sum + (ret.paidAmount || 0), 0) : 0;
        const transfersOutCash = treasuryTransfers.filter(t => t.date === selectedDate && (isAllTreasuries || t.fromTreasuryId === selectedTreasuryId)).reduce((sum, t) => sum + t.amount, 0);

        const cashOut = [
            { label: 'سندات الدفع للموردين', amount: paymentsCash },
            { label: 'مدفوعات فواتير المشتريات', amount: purchasesCash },
            { label: 'مدفوعات مرتجع المبيعات', amount: salesReturnsCash },
            { label: isAllTreasuries ? 'إجمالي حركة التحويلات' : 'تحويلات صادرة إلى خزائن أخرى', amount: transfersOutCash },
        ].filter(item => item.amount > 0);

        const totalCashOut = cashOut.reduce((sum, item) => sum + item.amount, 0) + totalExpenses;
        const netCashFlow = totalCashIn - totalCashOut;
        const treasuryName = isAllTreasuries ? 'كل الخزائن' : treasuries.find(t => t.id === selectedTreasuryId)?.name || 'غير معروف';

        setReportData({ cashIn, totalCashIn, cashOut, expensesBreakdown, totalExpenses, totalCashOut, netCashFlow, treasuryName });
    };

    const handlePrint = () => {
        if (!reportData) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const headers = ['البيان', 'المبلغ (ج.م)'];
        
        const cashInRows = reportData.cashIn.map(item => `
            <tr><td class="text-right">${item.label}</td><td class="text-green font-black">${item.amount.toFixed(2)}</td></tr>
        `).join('');

        const expensesRows = reportData.expensesBreakdown.map(item => `
            <tr><td class="text-right pl-8">مصروف: ${item.label}</td><td class="text-red">(${item.amount.toFixed(2)})</td></tr>
        `).join('');

        const cashOutRows = reportData.cashOut.map(item => `
            <tr><td class="text-right">${item.label}</td><td class="text-red">(${item.amount.toFixed(2)})</td></tr>
        `).join('');

        const rowsHtml = `
            <tr class="bg-green-50"><td colspan="2" class="text-right font-black">النقدية الداخلة (المقبوضات)</td></tr>
            ${cashInRows || '<tr><td colspan="2" class="text-center text-gray-400">لا توجد مقبوضات</td></tr>'}
            <tr class="bg-green-100"><td class="text-right font-black">إجمالي النقدية الداخلة</td><td class="font-black text-green">${reportData.totalCashIn.toFixed(2)}</td></tr>
            
            <tr class="bg-red-50"><td colspan="2" class="text-right font-black">المصروفات</td></tr>
            ${expensesRows || '<tr><td colspan="2" class="text-center text-gray-400">لا توجد مصروفات</td></tr>'}
            <tr class="bg-red-100"><td class="text-right font-black">إجمالي المصروفات</td><td class="font-black text-red">(${reportData.totalExpenses.toFixed(2)})</td></tr>
            
            <tr class="bg-red-50"><td colspan="2" class="text-right font-black">النقدية الخارجة (المدفوعات الأخرى)</td></tr>
            ${cashOutRows || '<tr><td colspan="2" class="text-center text-gray-400">لا توجد مدفوعات أخرى</td></tr>'}
            <tr class="bg-red-100"><td class="text-right font-black">إجمالي النقدية الخارجة (شامل المصروفات)</td><td class="font-black text-red">(${reportData.totalCashOut.toFixed(2)})</td></tr>
            
            <tr class="${reportData.netCashFlow >= 0 ? 'bg-blue-100' : 'bg-orange-100'}">
                <td class="text-right font-black text-xl">صافي حركة النقدية اليومية</td>
                <td class="font-black text-xl ${reportData.netCashFlow >= 0 ? 'text-indigo' : 'text-red'}">${reportData.netCashFlow.toFixed(2)}</td>
            </tr>
        `;

        const subtitle = `التاريخ: ${formatDateForDisplay(selectedDate)} | الخزينة: ${reportData.treasuryName}`;
        const title = `تقرير النقدية اليومي`;

        printWindow.document.write(getReportPrintTemplate(title, subtitle, companyData, headers, rowsHtml, undefined, undefined, undefined, 'A4', '#0f766e'));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    // ... (Render return logic remains same) ...
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">تقرير النقدية اليومي</h1>
            
            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className={labelClass} htmlFor="date-select">اختر التاريخ</label>
                        <input
                            id="date-select"
                            type="text"
                            className={inputClass}
                            {...dateInputProps}
                        />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="treasury-select">اختر الخزينة</label>
                        <select
                            id="treasury-select"
                            className={inputClass}
                            value={selectedTreasuryId}
                            onChange={(e) => setSelectedTreasuryId(Number(e.target.value))}
                        >
                            <option value={0}>كل الخزائن</option>
                            {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <button onClick={handleSearch} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300">
                            بحث
                        </button>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 dark:text-gray-400">
                    * ملاحظة: مقبوضات ومدفوعات الفواتير المباشرة (بدون سند) تظهر فقط عند اختيار الخزينة الافتراضية.
                </p>
            </div>

            {reportData && (
                <div className={cardClass}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-300 dark:border-gray-600">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                            ملخص يوم: {new Date(selectedDate).toLocaleDateString('ar-EG')} | {reportData.treasuryName}
                        </h2>
                        <button onClick={handlePrint} className="flex items-center justify-center bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700">
                            <PrintIcon /> <span className="mr-2">طباعة التقرير</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cash In Section */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-green-700 dark:text-green-300 border-b-2 border-green-300 pb-2 flex items-center">
                                <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path></svg>
                                النقدية الداخلة (المقبوضات)
                            </h3>
                            <div className="space-y-2">
                                {reportData.cashIn.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                                        <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                                        <span className="font-mono font-semibold text-green-600 dark:text-green-400">{item.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                             <div className="flex justify-between items-center p-4 rounded-lg bg-green-100 dark:bg-green-900/40 mt-2 border-t-2 border-green-500">
                                <span className="font-bold text-lg text-green-800 dark:text-green-200">إجمالي المقبوضات</span>
                                <span className="font-mono font-bold text-lg text-green-800 dark:text-green-200">{reportData.totalCashIn.toFixed(2)}</span>
                            </div>
                        </div>

                         {/* Cash Out Section */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-red-700 dark:text-red-300 border-b-2 border-red-300 pb-2 flex items-center">
                                <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path></svg>
                                النقدية الخارجة (المدفوعات)
                            </h3>
                            
                            {/* Expenses */}
                            {reportData.expensesBreakdown.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="font-bold text-gray-600 dark:text-gray-400 mb-2 text-sm">المصروفات:</h4>
                                    <div className="space-y-1 pr-2 border-r-2 border-gray-300 dark:border-gray-600">
                                        {reportData.expensesBreakdown.map((exp, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">- {exp.label}</span>
                                                <span className="font-mono text-red-500">{exp.amount.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {reportData.cashOut.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                                        <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                                        <span className="font-mono font-semibold text-red-600 dark:text-red-400">{item.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                             <div className="flex justify-between items-center p-4 rounded-lg bg-red-100 dark:bg-red-900/40 mt-2 border-t-2 border-red-500">
                                <span className="font-bold text-lg text-red-800 dark:text-red-200">إجمالي المدفوعات والمصروفات</span>
                                <span className="font-mono font-bold text-lg text-red-800 dark:text-red-200">{reportData.totalCashOut.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                     <hr className="border-t-2 border-gray-300 dark:border-gray-600 my-8" />
                    
                    <div className={`flex justify-between items-center p-6 rounded-xl shadow-inner ${reportData.netCashFlow >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                        <div className="flex flex-col">
                            <span className={`font-bold text-2xl ${reportData.netCashFlow >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'}`}>
                                (=) صافي حركة النقدية
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                (إجمالي المقبوضات - إجمالي المدفوعات)
                            </span>
                        </div>
                        <span className={`font-mono font-bold text-3xl ${reportData.netCashFlow >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'}`}>
                            {reportData.netCashFlow.toFixed(2)} ج.م
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyLedger;
