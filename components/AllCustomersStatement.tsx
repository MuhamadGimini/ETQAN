
import React, { useState, useMemo } from 'react';
import type { Customer, SalesInvoice, SalesReturn, CustomerReceipt, CompanyData, DefaultValues } from '../types';
import { ViewIcon, PrintIcon, PdfIcon, FormattedNumber, DownloadIcon } from './Shared';
import { searchMatch } from '../utils';
import { exportToExcel } from '../services/excel';

interface AllCustomersStatementProps {
    customers: Customer[];
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    customerReceipts: CustomerReceipt[];
    companyData: CompanyData;
    onViewCustomerStatement: (customerId: number) => void;
    defaultValues: DefaultValues;
}

interface CustomerSummary {
    id: number;
    name: string;
    openingBalance: number;
    totalSales: number;
    totalReturns: number;
    totalPayments: number;
    closingBalance: number;
}

const AllCustomersStatement: React.FC<AllCustomersStatementProps> = ({
    customers,
    salesInvoices,
    salesReturns,
    customerReceipts,
    companyData,
    onViewCustomerStatement,
    defaultValues,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showZeroBalances, setShowZeroBalances] = useState(false); // Default: Hide zero balances

    const customerSummaries = useMemo<CustomerSummary[]>(() => {
        const summaries = customers.map(customer => {
            const openingBalance = customer.openingBalance;

            const totalSales = salesInvoices
                .filter(inv => inv.customerId === customer.id)
                .reduce((sum, inv) => {
                    const invTotal = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                    return sum + invTotal;
                }, 0);
            
            const totalReturns = salesReturns
                .filter(ret => ret.customerId === customer.id)
                .reduce((sum, ret) => {
                    const retTotal = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                    return sum + retTotal;
                }, 0);

            // Sum of Receipt Vouchers
            const totalReceipts = customerReceipts
                .filter(rec => rec.customerId === customer.id)
                .reduce((sum, rec) => sum + rec.amount, 0);

            // Sum of Direct Payments in Invoices
            const totalInvoicePayments = salesInvoices
                .filter(inv => inv.customerId === customer.id)
                .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

            // Sum of Cash Refunds in Returns (treated as debit increase, or reduction of payment received)
            const totalReturnRefunds = salesReturns
                .filter(ret => ret.customerId === customer.id)
                .reduce((sum, ret) => sum + (ret.paidAmount || 0), 0);

            // Total collected from customer (Invoices + Receipts)
            const totalPayments = totalReceipts + totalInvoicePayments;

            // Balance = Opening + Sales - Returns - (TotalPayments - TotalRefunds)
            // Note: TotalReturnRefunds means money we gave back, so it reduces the 'payment' credit effectively increasing balance
            const closingBalance = openingBalance + totalSales - totalReturns - (totalPayments - totalReturnRefunds);

            return {
                id: customer.id,
                name: customer.name,
                openingBalance,
                totalSales,
                totalReturns,
                totalPayments: totalPayments - totalReturnRefunds, // Net payments for display
                closingBalance,
            };
        });

        // Sort alphabetically by name
        return summaries.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [customers, salesInvoices, salesReturns, customerReceipts]);

    const filteredSummaries = useMemo(() => {
        let result = customerSummaries;

        // 1. Filter Zero Balances
        if (!showZeroBalances) {
            result = result.filter(c => Math.abs(c.closingBalance) > 0.01);
        }

        // 2. Filter Search Query
        if (searchQuery) {
            result = result.filter(c => searchMatch(c.name, searchQuery));
        }

        return result;
    }, [customerSummaries, searchQuery, showZeroBalances]);

    const totals = useMemo(() => {
        return filteredSummaries.reduce((acc, curr) => ({
            count: acc.count + 1,
            openingBalance: acc.openingBalance + curr.openingBalance,
            totalSales: acc.totalSales + curr.totalSales,
            totalReturns: acc.totalReturns + curr.totalReturns,
            totalPayments: acc.totalPayments + curr.totalPayments,
            closingBalance: acc.closingBalance + curr.closingBalance
        }), { count: 0, openingBalance: 0, totalSales: 0, totalReturns: 0, totalPayments: 0, closingBalance: 0 });
    }, [filteredSummaries]);

    const handleExport = () => {
        const data = filteredSummaries.map(c => ({
            'اسم العميل': c.name,
            'رصيد أول المدة': c.openingBalance,
            'إجمالي المبيعات': c.totalSales,
            'إجمالي المرتجعات': c.totalReturns,
            'صافي المدفوعات': c.totalPayments,
            'الرصيد النهائي': c.closingBalance
        }));
        exportToExcel(data, 'تقرير_ارصدة_العملاء');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the report.');
            return;
        }

        // Use the already filtered list so print matches view
        const printableSummaries = filteredSummaries;

        // Recalculate totals based on the filtered list for consistency in the printed report.
        const totalReceivables = printableSummaries
            .filter(c => c.closingBalance > 0)
            .reduce((acc, curr) => acc + curr.closingBalance, 0);
            
        const totalPayables = printableSummaries
            .filter(c => c.closingBalance < 0)
            .reduce((acc, curr) => acc + curr.closingBalance, 0);

        const netBalance = totalReceivables + totalPayables;

        const reportHtml = `
            <html>
            <head>
                <title>تقرير أرصدة العملاء</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; direction: rtl; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .no-print { display: none !important; }
                </style>
            </head>
            <body class="p-8" onload="window.print(); window.close();">
                <div class="text-center mb-6 border-b-2 border-black pb-4">
                    <h1 class="text-3xl font-bold">${companyData.name}</h1>
                    <p>${companyData.address}</p>
                    <p>تليفون: ${companyData.phone1} ${companyData.phone2 ? `- ${companyData.phone2}` : ''}</p>
                </div>
                <h2 class="text-2xl font-bold text-center mb-4">تقرير أرصدة العملاء النهائية</h2>
                
                <div class="grid grid-cols-3 gap-4 mb-6 text-sm border p-4 rounded-lg bg-gray-50">
                    <div>عدد العملاء: <span class="font-bold">${printableSummaries.length}</span></div>
                    <div>إجمالي المبيعات: <span class="font-bold">${totals.totalSales.toFixed(2)}</span></div>
                    <div>إجمالي المدفوعات: <span class="font-bold">${totals.totalPayments.toFixed(2)}</span></div>
                </div>

                <table class="w-full text-right border-collapse border border-gray-400">
                    <thead class="bg-gray-200">
                        <tr>
                             <th class="p-2 border border-gray-300 w-16 text-center">م</th>
                             <th class="p-2 border border-gray-300">اسم العميل</th>
                             <th class="p-2 border border-gray-300 w-48">الرصيد النهائي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${printableSummaries.map((summary, index) => `
                            <tr class="border-b">
                                <td class="p-2 border border-gray-300 text-center">${index + 1}</td>
                                <td class="p-2 border border-gray-300 font-bold">${summary.name}</td>
                                <td class="p-2 border border-gray-300 font-bold ${summary.closingBalance >= 0 ? 'text-green-700' : 'text-red-700'}">${summary.closingBalance.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr class="bg-gray-100 font-bold">
                            <td class="p-2 border border-gray-300 text-center" colspan="2">إجمالي المديونية (لنا)</td>
                            <td class="p-2 border border-gray-300 text-green-800">${totalReceivables.toFixed(2)}</td>
                        </tr>
                        <tr class="bg-gray-100 font-bold">
                            <td class="p-2 border border-gray-300 text-center" colspan="2">إجمالي الدائن (علينا)</td>
                            <td class="p-2 border border-gray-300 text-red-800">${totalPayables.toFixed(2)}</td>
                        </tr>
                         <tr class="bg-blue-100 font-bold border-t-2 border-blue-500">
                            <td class="p-2 border border-gray-300 text-center" colspan="2">صافي الأرصدة</td>
                            <td class="p-2 border border-gray-300 text-blue-800">${netBalance.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="text-center mt-8 text-sm">
                    <p>${defaultValues.invoiceFooter}</p>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(reportHtml);
        printWindow.document.close();
    };


    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">كشف حسابات العملاء</h1>
            
            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div className="w-full md:w-1/2">
                         <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">بحث</label>
                        <input
                            type="text"
                            placeholder="بحث باسم العميل..."
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
                            <option value="true">عرض كل العملاء (شامل الأرصدة الصفرية)</option>
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">عدد العملاء</p>
                        <p className="font-bold text-xl text-gray-800 dark:text-gray-200">{totals.count}</p>
                    </div>
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">أرصدة أول المدة</p>
                        <p className="font-bold text-lg text-gray-800 dark:text-gray-200"><FormattedNumber value={totals.openingBalance} /></p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">إجمالي المبيعات</p>
                        <p className="font-bold text-lg text-green-700 dark:text-green-300"><FormattedNumber value={totals.totalSales} /></p>
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
                        <p className={`font-bold text-lg ${totals.closingBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
                                {['اسم العميل', 'رصيد أول المدة', 'إجمالي المبيعات', 'إجمالي المرتجعات', 'صافي المدفوعات', 'الرصيد النهائي', 'إجراءات'].map(h => <th key={h} className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSummaries.map(summary => (
                                <tr key={summary.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                    <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{summary.name}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300"><FormattedNumber value={summary.openingBalance} /></td>
                                    <td className="p-3 text-green-600 dark:text-green-400"><FormattedNumber value={summary.totalSales} /></td>
                                    <td className="p-3 text-red-600 dark:text-red-400"><FormattedNumber value={summary.totalReturns} /></td>
                                    <td className="p-3 text-blue-600 dark:text-blue-400"><FormattedNumber value={summary.totalPayments} /></td>
                                    <td className={`p-3 font-bold ${summary.closingBalance >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}`}>
                                        <FormattedNumber value={Math.abs(summary.closingBalance)} /> {summary.closingBalance >= 0 ? '(عليه)' : '(له)'}
                                    </td>
                                    <td className="p-3">
                                        <button onClick={() => onViewCustomerStatement(summary.id)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" title="عرض كشف الحساب التفصيلي">
                                            <ViewIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AllCustomersStatement;
