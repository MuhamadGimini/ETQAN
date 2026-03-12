
import React, { useState, useMemo } from 'react';
import type { Customer, SalesInvoice, SalesReturn, CustomerReceipt, CompanyData, DefaultValues } from '../types';
import { PrintIcon, FormattedNumber } from './Shared';
import { formatDateForDisplay } from '../utils';
import { useDateInput } from '../hooks/useDateInput';

interface CustomerMovementComparisonProps {
    customers: Customer[];
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    customerReceipts: CustomerReceipt[];
    companyData: CompanyData;
    defaultValues: DefaultValues;
}

type SortKey = 'name' | 'previousBalance' | 'netSales' | 'weekPayments' | 'closingBalance';
type SortDirection = 'asc' | 'desc';

const CustomerMovementComparison: React.FC<CustomerMovementComparisonProps> = ({
    customers,
    salesInvoices,
    salesReturns,
    customerReceipts,
    companyData,
    defaultValues,
}) => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const dateInputProps = useDateInput(selectedDate, setSelectedDate);
    
    // Sorting State
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Calculate Date Range (Week: Monday to Sunday)
    const { startDate, endDate, previousEndDate } = useMemo(() => {
        const current = new Date(selectedDate);
        const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        
        // Calculate days to subtract to get to Monday
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const start = new Date(current);
        start.setDate(current.getDate() - daysFromMonday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6); // End on Sunday
        end.setHours(23, 59, 59, 999);

        // Previous Period End (The day before Start Date)
        const prevEnd = new Date(start);
        prevEnd.setDate(start.getDate() - 1);
        prevEnd.setHours(23, 59, 59, 999);

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            previousEndDate: prevEnd.toISOString()
        };
    }, [selectedDate]);

    const reportData = useMemo(() => {
        const data = customers.map(customer => {
            // 1. Calculate Previous Balance (Up to previousEndDate)
            let previousBalance = customer.openingBalance;

            // + Invoices before start date
            salesInvoices.forEach(inv => {
                if (inv.customerId === customer.id && inv.date <= previousEndDate) {
                    const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                    previousBalance += (total - (inv.paidAmount || 0));
                }
            });
            // - Returns before start date
            salesReturns.forEach(ret => {
                if (ret.customerId === customer.id && ret.date <= previousEndDate) {
                    const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                    previousBalance -= (total - (ret.paidAmount || 0));
                }
            });
            // - Receipts before start date
            customerReceipts.forEach(rec => {
                if (rec.customerId === customer.id && rec.date <= previousEndDate) {
                    previousBalance -= rec.amount;
                }
            });

            // 2. Current Week Net Sales (Sales - Returns)
            let weekSales = 0;
            let weekReturns = 0;

            salesInvoices.forEach(inv => {
                if (inv.customerId === customer.id && inv.date >= startDate && inv.date <= endDate) {
                    const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                    weekSales += total;
                }
            });

            salesReturns.forEach(ret => {
                if (ret.customerId === customer.id && ret.date >= startDate && ret.date <= endDate) {
                    const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                    weekReturns += total;
                }
            });

            const netSales = weekSales - weekReturns;

            // 3. Current Week Payments (Receipts + Direct Invoice Payments - Direct Return Refunds)
            let weekPayments = 0;
            
            // Receipts
            customerReceipts.forEach(rec => {
                if (rec.customerId === customer.id && rec.date >= startDate && rec.date <= endDate) {
                    weekPayments += rec.amount;
                }
            });
            
            // Direct Invoice Payments
            salesInvoices.forEach(inv => {
                if (inv.customerId === customer.id && inv.date >= startDate && inv.date <= endDate) {
                    weekPayments += (inv.paidAmount || 0);
                }
            });

            // Direct Return Refunds (Reduces the payment/credit)
            salesReturns.forEach(ret => {
                if (ret.customerId === customer.id && ret.date >= startDate && ret.date <= endDate) {
                    weekPayments -= (ret.paidAmount || 0);
                }
            });

            // 4. Closing Balance
            const closingBalance = previousBalance + netSales - weekPayments;

            return {
                id: customer.id,
                name: customer.name,
                previousBalance,
                netSales,
                weekPayments,
                closingBalance
            };
        }).filter(r => {
            // Filter Logic: Exclude rows where EVERYTHING is effectively zero.
            const hasPreviousBalance = Math.abs(r.previousBalance) > 0.01;
            const hasNetSales = Math.abs(r.netSales) > 0.01;
            const hasPayments = Math.abs(r.weekPayments) > 0.01;
            const hasClosingBalance = Math.abs(r.closingBalance) > 0.01;

            return hasPreviousBalance || hasNetSales || hasPayments || hasClosingBalance;
        });

        // Sorting Logic
        return data.sort((a, b) => {
            let comparison = 0;
            switch (sortKey) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'ar');
                    break;
                case 'previousBalance':
                    comparison = a.previousBalance - b.previousBalance;
                    break;
                case 'netSales':
                    comparison = a.netSales - b.netSales;
                    break;
                case 'weekPayments':
                    comparison = a.weekPayments - b.weekPayments;
                    break;
                case 'closingBalance':
                    comparison = a.closingBalance - b.closingBalance;
                    break;
                default:
                    comparison = 0;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

    }, [customers, salesInvoices, salesReturns, customerReceipts, startDate, endDate, previousEndDate, sortKey, sortDirection]);

    const totals = useMemo(() => {
        return reportData.reduce((acc, curr) => ({
            previousBalance: acc.previousBalance + curr.previousBalance,
            netSales: acc.netSales + curr.netSales,
            weekPayments: acc.weekPayments + curr.weekPayments,
            closingBalance: acc.closingBalance + curr.closingBalance
        }), { previousBalance: 0, netSales: 0, weekPayments: 0, closingBalance: 0 });
    }, [reportData]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableRows = reportData.map((row) => `
            <tr class="border-b border-gray-300">
                <td class="p-2 border border-gray-300 font-bold">${row.name}</td>
                <td class="p-2 border border-gray-300 font-bold ${row.previousBalance >= 0 ? 'text-green-700' : 'text-red-700'}">${row.previousBalance.toFixed(2)}</td>
                <td class="p-2 border border-gray-300 font-bold text-blue-700">${row.netSales.toFixed(2)}</td>
                <td class="p-2 border border-gray-300 font-bold text-orange-700">${row.weekPayments.toFixed(2)}</td>
                <td class="p-2 border border-gray-300 font-bold ${row.closingBalance >= 0 ? 'text-green-800' : 'text-red-800'}" style="background-color: #f3f4f6;">${row.closingBalance.toFixed(2)}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>مقارنة حركات العملاء</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Cairo', sans-serif; direction: rtl; }
                        table { width: 100%; border-collapse: collapse; text-align: center; }
                        th, td { border: 1px solid #ccc; padding: 8px; font-size: 14px; }
                        thead { background-color: #f3f4f6; }
                    </style>
                </head>
                <body class="p-8" onload="window.print(); window.close();">
                    <div class="text-center mb-6 border-b-2 border-black pb-4">
                        <h1 class="text-2xl font-bold">${companyData.name}</h1>
                        <h2 class="text-xl">تقرير مقارنة حركات العملاء (أسبوعي)</h2>
                        <p class="text-gray-600">الفترة: من ${formatDateForDisplay(startDate)} إلى ${formatDateForDisplay(endDate)}</p>
                        <p class="text-xs text-gray-500">(الأسبوع: الإثنين - الأحد)</p>
                    </div>
                    
                    <table>
                        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th class="p-3 border border-gray-300">اسم العميل</th>
                                <th class="p-3 border border-gray-300">رصيد سابق<br/><span class="text-xs font-normal">(حتى ${formatDateForDisplay(previousEndDate)})</span></th>
                                <th class="p-3 border border-gray-300 text-blue-700">(+) صافي المبيعات<br/><span class="text-xs font-normal">(خلال الأسبوع)</span></th>
                                <th class="p-3 border border-gray-300 text-orange-700">(-) الدفعات<br/><span class="text-xs font-normal">(خلال الأسبوع)</span></th>
                                <th class="p-3 border border-gray-300 bg-gray-100">(=) الرصيد الحالي<br/><span class="text-xs font-normal">(نهاية الأسبوع)</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                            <tr class="bg-gray-200 font-bold">
                                <td class="p-3 border border-gray-300">الإجمالي</td>
                                <td class="p-3 border border-gray-300">${totals.previousBalance.toFixed(2)}</td>
                                <td class="p-3 border border-gray-300 text-blue-800">${totals.netSales.toFixed(2)}</td>
                                <td class="p-3 border border-gray-300 text-orange-800">${totals.weekPayments.toFixed(2)}</td>
                                <td class="p-3 border border-gray-300">${totals.closingBalance.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="text-center mt-8 text-sm">
                        <p>${defaultValues.invoiceFooter}</p>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 transition duration-300";
    const headerClass = "p-4 border-b-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors select-none";

    const SortIndicator = ({ active, direction }: { active: boolean, direction: SortDirection }) => {
        if (!active) return <span className="opacity-30 ml-1">⇅</span>;
        return <span className="text-blue-500 ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">مقارنة حركات العملاء (أسبوعي)</h1>

            <div className={cardClass}>
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">اختر تاريخ داخل الأسبوع</label>
                        <input 
                            type="text"
                            {...dateInputProps}
                            className={inputClass}
                        />
                    </div>
                    <div className="flex-1 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p><strong>فترة التقرير (الأسبوع الحالي):</strong> {formatDateForDisplay(startDate)} إلى {formatDateForDisplay(endDate)}</p>
                        <p><strong>نهاية الفترة السابقة:</strong> {formatDateForDisplay(previousEndDate)}</p>
                        <p className="text-xs mt-1 text-gray-500">* الأسبوع يبدأ الإثنين وينتهي الأحد</p>
                    </div>
                    <div>
                        <button onClick={handlePrint} className="flex items-center justify-center bg-gray-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-gray-700 h-11">
                            <PrintIcon /> <span className="mr-2">طباعة</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className={headerClass} onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">
                                        اسم العميل <SortIndicator active={sortKey === 'name'} direction={sortDirection} />
                                    </div>
                                </th>
                                <th className={headerClass} onClick={() => handleSort('previousBalance')}>
                                    <div className="flex items-center gap-1">
                                        رصيد سابق <SortIndicator active={sortKey === 'previousBalance'} direction={sortDirection} />
                                    </div>
                                    <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">نهاية الأسبوع السابق</div>
                                </th>
                                <th className={`${headerClass} text-blue-600 dark:text-blue-400`} onClick={() => handleSort('netSales')}>
                                    <div className="flex items-center gap-1">
                                        (+) صافي المبيعات <SortIndicator active={sortKey === 'netSales'} direction={sortDirection} />
                                    </div>
                                    <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">الأسبوع الحالي</div>
                                </th>
                                <th className={`${headerClass} text-orange-600 dark:text-orange-400`} onClick={() => handleSort('weekPayments')}>
                                    <div className="flex items-center gap-1">
                                        (-) الدفعات <SortIndicator active={sortKey === 'weekPayments'} direction={sortDirection} />
                                    </div>
                                    <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">الأسبوع الحالي</div>
                                </th>
                                <th className={`${headerClass} bg-gray-100 dark:bg-gray-900/50`} onClick={() => handleSort('closingBalance')}>
                                    <div className="flex items-center gap-1">
                                        (=) الرصيد الحالي <SortIndicator active={sortKey === 'closingBalance'} direction={sortDirection} />
                                    </div>
                                    <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">نهاية الأسبوع الحالي</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row) => (
                                <tr key={row.id} className="hover:bg-white/20 dark:hover:bg-white/5 border-b border-gray-200 dark:border-gray-700">
                                    <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{row.name}</td>
                                    <td className={`p-3 font-mono font-bold ${row.previousBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        <FormattedNumber value={row.previousBalance} />
                                    </td>
                                    <td className="p-3 font-mono text-blue-600 dark:text-blue-400 font-bold">
                                        <FormattedNumber value={row.netSales} />
                                    </td>
                                    <td className="p-3 font-mono text-orange-600 dark:text-orange-400 font-bold">
                                        <FormattedNumber value={row.weekPayments} />
                                    </td>
                                    <td className={`p-3 font-mono font-bold text-lg bg-gray-50 dark:bg-gray-900/30 ${row.closingBalance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                        <FormattedNumber value={row.closingBalance} />
                                    </td>
                                </tr>
                            ))}
                            {reportData.length > 0 && (
                                <tr className="bg-gray-100 dark:bg-gray-700 font-bold border-t-2 border-gray-400">
                                    <td className="p-3 text-gray-800 dark:text-gray-200">الإجمالي</td>
                                    <td className="p-3 text-gray-800 dark:text-gray-200"><FormattedNumber value={totals.previousBalance} /></td>
                                    <td className="p-3 text-blue-700 dark:text-blue-300"><FormattedNumber value={totals.netSales} /></td>
                                    <td className="p-3 text-orange-700 dark:text-orange-300"><FormattedNumber value={totals.weekPayments} /></td>
                                    <td className="p-3 text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-600"><FormattedNumber value={totals.closingBalance} /></td>
                                </tr>
                            )}
                            {reportData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">لا توجد حركات في هذا الأسبوع.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CustomerMovementComparison;
