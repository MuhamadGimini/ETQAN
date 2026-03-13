
import React, { useState, useMemo } from 'react';
import type { Supplier, PurchaseInvoice, PurchaseReturn, SupplierPayment, CompanyData, DefaultValues } from '../types';
import { ViewIcon, PrintIcon, PdfIcon, FormattedNumber, DownloadIcon } from './Shared';
import { searchMatch } from '../utils';
import { exportToExcel } from '../services/excel';
import { getReportPrintTemplate } from '../utils/printing';

interface AllSuppliersStatementProps {
    suppliers: Supplier[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    supplierPayments: SupplierPayment[];
    companyData: CompanyData;
    onViewSupplierStatement: (supplierId: number) => void;
    defaultValues: DefaultValues;
}

interface SupplierSummary {
    id: number;
    name: string;
    openingBalance: number;
    totalPurchases: number;
    totalReturns: number;
    totalPayments: number;
    closingBalance: number;
}

const AllSuppliersStatement: React.FC<AllSuppliersStatementProps> = ({
    suppliers,
    purchaseInvoices,
    purchaseReturns,
    supplierPayments,
    companyData,
    onViewSupplierStatement,
    defaultValues,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showZeroBalances, setShowZeroBalances] = useState(false); // Default: Hide zero balances

    const supplierSummaries = useMemo<SupplierSummary[]>(() => {
        const summaries = suppliers.map(supplier => {
            const openingBalance = supplier.openingBalance;

            const totalPurchases = purchaseInvoices
                .filter(inv => inv.supplierId === supplier.id)
                .reduce((sum, inv) => {
                    const invTotal = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                    const totalPaid = inv.paidAmount || 0;
                    return sum + (invTotal - totalPaid);
                }, 0);
            
            const totalReturns = purchaseReturns
                .filter(ret => ret.supplierId === supplier.id)
                .reduce((sum, ret) => {
                    const retTotal = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                    const totalRefunded = ret.paidAmount || 0;
                    return sum + (retTotal - totalRefunded);
                }, 0);

            const totalStandalonePayments = supplierPayments
                .filter(p => p.supplierId === supplier.id)
                .reduce((sum, p) => sum + p.amount, 0);

            // Closing Balance for suppliers:
            // Positive means we owe them (Credit balance for them)
            // Negative means they owe us (Debit balance for them)
            const closingBalance = openingBalance + totalPurchases - totalReturns - totalStandalonePayments;

            // For display purposes, we show total values, not just credit parts
            const displayTotalPurchases = purchaseInvoices
                .filter(inv => inv.supplierId === supplier.id)
                .reduce((sum, inv) => sum + (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100), 0);

            const displayTotalReturns = purchaseReturns
                .filter(ret => ret.supplierId === supplier.id)
                .reduce((sum, ret) => sum + (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100), 0);

            const displayTotalPayments = supplierPayments
                .filter(p => p.supplierId === supplier.id)
                .reduce((sum, p) => sum + p.amount, 0) + 
                purchaseInvoices
                .filter(inv => inv.supplierId === supplier.id)
                .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);


            return {
                id: supplier.id,
                name: supplier.name,
                openingBalance,
                totalPurchases: displayTotalPurchases,
                totalReturns: displayTotalReturns,
                totalPayments: displayTotalPayments,
                closingBalance,
            };
        });

        // Sort alphabetically by name
        return summaries.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [suppliers, purchaseInvoices, purchaseReturns, supplierPayments]);

    const filteredSummaries = useMemo(() => {
        let result = supplierSummaries;

        // 1. Filter Zero Balances
        if (!showZeroBalances) {
            result = result.filter(s => Math.abs(s.closingBalance) > 0.01);
        }

        // 2. Filter Search Query
        if (searchQuery) {
            result = result.filter(s => searchMatch(s.name, searchQuery));
        }

        return result;
    }, [supplierSummaries, searchQuery, showZeroBalances]);

    const totals = useMemo(() => {
        return filteredSummaries.reduce((acc, curr) => ({
            count: acc.count + 1,
            openingBalance: acc.openingBalance + curr.openingBalance,
            totalPurchases: acc.totalPurchases + curr.totalPurchases,
            totalReturns: acc.totalReturns + curr.totalReturns,
            totalPayments: acc.totalPayments + curr.totalPayments,
            closingBalance: acc.closingBalance + curr.closingBalance
        }), { count: 0, openingBalance: 0, totalPurchases: 0, totalReturns: 0, totalPayments: 0, closingBalance: 0 });
    }, [filteredSummaries]);

    const handleExport = () => {
        const data = filteredSummaries.map(s => ({
            'اسم المورد': s.name,
            'رصيد أول المدة': s.openingBalance,
            'إجمالي المشتريات': s.totalPurchases,
            'إجمالي المرتجعات': s.totalReturns,
            'إجمالي المدفوعات': s.totalPayments,
            'الرصيد النهائي': s.closingBalance
        }));
        exportToExcel(data, 'كشف_حسابات_الموردين');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the report.');
            return;
        }

        const printableSummaries = filteredSummaries;

        const totalPayables = printableSummaries
            .filter(s => s.closingBalance > 0)
            .reduce((acc, curr) => acc + curr.closingBalance, 0);
            
        const totalReceivables = printableSummaries
            .filter(s => s.closingBalance < 0)
            .reduce((acc, curr) => acc + curr.closingBalance, 0);

        const netBalance = totalPayables + totalReceivables;

        const headers = ['م', 'اسم المورد', 'رصيد أول', 'مشتريات', 'مرتجع', 'مدفوعات', 'الرصيد النهائي'];

        const rowsHtml = printableSummaries.map((summary, index) => `
            <tr>
                <td>${index + 1}</td>
                <td class="text-right font-black">${summary.name}</td>
                <td>${summary.openingBalance.toFixed(2)}</td>
                <td class="text-red">${summary.totalPurchases.toFixed(2)}</td>
                <td class="text-green">${summary.totalReturns.toFixed(2)}</td>
                <td class="text-indigo">${summary.totalPayments.toFixed(2)}</td>
                <td class="font-black ${summary.closingBalance > 0 ? 'text-red' : 'text-green'}">${summary.closingBalance.toFixed(2)}</td>
            </tr>
        `).join('');

        const summaryHtml = `
            <div class="w-full mt-4">
                <div class="summary-item"><span>عدد الموردين:</span><span>${printableSummaries.length}</span></div>
                <div class="summary-item"><span>إجمالي المشتريات:</span><span class="text-red">${totals.totalPurchases.toFixed(2)}</span></div>
                <div class="summary-item"><span>إجمالي المرتجعات:</span><span class="text-green">${totals.totalReturns.toFixed(2)}</span></div>
                <div class="summary-item"><span>إجمالي المدفوعات:</span><span class="text-indigo">${totals.totalPayments.toFixed(2)}</span></div>
                <div class="summary-item font-black border-t border-gray-300 mt-2 pt-2">
                    <span>إجمالي الدائنية (لهم):</span><span class="text-red">${totalPayables.toFixed(2)}</span>
                </div>
                <div class="summary-item font-black">
                    <span>إجمالي المديونية (عليهم):</span><span class="text-green">${totalReceivables.toFixed(2)}</span>
                </div>
                <div class="summary-item font-black text-lg border-t-2 border-indigo mt-2 pt-2">
                    <span>صافي الأرصدة:</span><span class="text-indigo">${netBalance.toFixed(2)}</span>
                </div>
            </div>
        `;

        printWindow.document.write(getReportPrintTemplate('تقرير أرصدة الموردين النهائية', '', companyData, headers, rowsHtml, summaryHtml, undefined, undefined, 'A4', '#dc2626'));
        printWindow.document.close();
    };


    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">كشف حسابات الموردين</h1>
            
            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div className="w-full md:w-1/2">
                        <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">بحث</label>
                        <input
                            type="text"
                            placeholder="بحث باسم المورد..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="w-full md:w-1/4">
                        <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">تصفية الأرصدة</label>
                        <select
                            value={showZeroBalances ? 'true' : 'false'}
                            onChange={(e) => setShowZeroBalances(e.target.value === 'true')}
                            className={inputClass}
                        >
                            <option value="false">إخفاء الأرصدة الصفرية (طباعة الأرصدة الفعلية)</option>
                            <option value="true">عرض كل الموردين (شامل الأرصدة الصفرية)</option>
                        </select>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                        <button onClick={handleExport} className="flex items-center justify-center bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-700 transition duration-300">
                            <DownloadIcon /> <span className="mr-2">تصدير</span>
                        </button>
                        <button onClick={handlePrint} className="flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 transition duration-300">
                            <PrintIcon /> <span className="mr-2">طباعة</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Totals Section */}
            <div className={cardClass}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">عدد الموردين</p>
                        <p className="font-bold text-xl text-gray-800 dark:text-gray-200">{totals.count}</p>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">أرصدة أول المدة</p>
                        <p className="font-bold text-lg text-gray-800 dark:text-gray-200"><FormattedNumber value={totals.openingBalance} /></p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">إجمالي المشتريات</p>
                        <p className="font-bold text-lg text-green-700 dark:text-green-300"><FormattedNumber value={totals.totalPurchases} /></p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-xs text-red-600 dark:text-red-400 mb-1">إجمالي المرتجعات</p>
                        <p className="font-bold text-lg text-red-700 dark:text-red-300"><FormattedNumber value={totals.totalReturns} /></p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">إجمالي المدفوعات</p>
                        <p className="font-bold text-lg text-blue-700 dark:text-blue-300"><FormattedNumber value={totals.totalPayments} /></p>
                    </div>
                    <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">صافي الأرصدة</p>
                        <p className={`font-bold text-lg ${totals.closingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            <FormattedNumber value={totals.closingBalance} />
                        </p>
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full text-right">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-200 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                                {['اسم المورد', 'رصيد أول المدة', 'إجمالي المشتريات', 'إجمالي المرتجعات', 'إجمالي المدفوعات', 'الرصيد النهائي', 'إجراءات'].map(h => <th key={h} className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSummaries.map(summary => (
                                <tr key={summary.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                    <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{summary.name}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300"><FormattedNumber value={summary.openingBalance} /></td>
                                    <td className="p-3 text-green-600 dark:text-green-400"><FormattedNumber value={summary.totalPurchases} /></td>
                                    <td className="p-3 text-red-600 dark:text-red-400"><FormattedNumber value={summary.totalReturns} /></td>
                                    <td className="p-3 text-blue-600 dark:text-blue-400"><FormattedNumber value={summary.totalPayments} /></td>
                                    <td className={`p-3 font-bold ${
                                        summary.closingBalance > 0 ? 'text-red-700 dark:text-red-500' : 
                                        summary.closingBalance < 0 ? 'text-green-700 dark:text-green-500' :
                                        'text-gray-700 dark:text-gray-300'
                                    }`}>
                                        <FormattedNumber value={Math.abs(summary.closingBalance)} />
                                        {summary.closingBalance > 0 ? ' (له)' : 
                                         summary.closingBalance < 0 ? ' (عليه)' : ''}
                                    </td>
                                    <td className="p-3">
                                        <button onClick={() => onViewSupplierStatement(summary.id)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" title="عرض كشف الحساب التفصيلي">
                                            <ViewIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="sticky bottom-0 z-10 bg-gray-200 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600">
                            <tr>
                                <td className="p-3 font-bold text-gray-800 dark:text-gray-200">الإجمالي</td>
                                <td className="p-3 font-bold text-gray-800 dark:text-gray-200"><FormattedNumber value={totals.openingBalance} /></td>
                                <td className="p-3 font-bold text-green-700 dark:text-green-400"><FormattedNumber value={totals.totalPurchases} /></td>
                                <td className="p-3 font-bold text-red-700 dark:text-red-400"><FormattedNumber value={totals.totalReturns} /></td>
                                <td className="p-3 font-bold text-blue-700 dark:text-blue-400"><FormattedNumber value={totals.totalPayments} /></td>
                                <td className={`p-3 font-bold ${totals.closingBalance > 0 ? 'text-red-700 dark:text-red-500' : totals.closingBalance < 0 ? 'text-green-700 dark:text-green-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                    <FormattedNumber value={Math.abs(totals.closingBalance)} />
                                    {totals.closingBalance > 0 ? ' (له)' : totals.closingBalance < 0 ? ' (عليه)' : ''}
                                </td>
                                <td className="p-3"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AllSuppliersStatement;
