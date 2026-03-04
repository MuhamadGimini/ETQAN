
import React, { useState } from 'react';
import type { SalesInvoice, SalesReturn, Expense, Item, CompanyData, DefaultValues, ExpenseCategory } from '../types';
import { PrintIcon } from './Shared';
import { useDateInput } from '../hooks/useDateInput';

interface IncomeStatementProps {
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    expenses: Expense[];
    items: Item[];
    companyData: CompanyData;
    defaultValues: DefaultValues;
    expenseCategories: ExpenseCategory[];
}

interface ReportData {
    totalSales: number;
    totalReturns: number;
    netSales: number;
    cogsForSales: number;
    cogsForReturns: number;
    netCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    groupedExpenses: { [key: string]: number };
}

interface Partner {
    name: string;
    percentage: number;
}

const IncomeStatement: React.FC<IncomeStatementProps> = ({
    salesInvoices,
    salesReturns,
    expenses,
    items,
    companyData,
    defaultValues,
    expenseCategories,
}) => {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    
    // Partners State
    const [partnerCount, setPartnerCount] = useState<number>(0);
    const [partners, setPartners] = useState<Partner[]>([]);
    
    const startDateInputProps = useDateInput(startDate, setStartDate);
    const endDateInputProps = useDateInput(endDate, setEndDate);

    const handleSearch = () => {
        const invoicesInRange = salesInvoices.filter(inv => 
            (!startDate || inv.date.split('T')[0] >= startDate) && 
            (!endDate || inv.date.split('T')[0] <= endDate)
        );
        const returnsInRange = salesReturns.filter(ret => 
            (!startDate || ret.date.split('T')[0] >= startDate) && 
            (!endDate || ret.date.split('T')[0] <= endDate)
        );
        const expensesInRange = expenses.filter(exp => 
            (!startDate || exp.date >= startDate) && 
            (!endDate || exp.date <= endDate)
        );

        // 1. Sales
        const totalSales = invoicesInRange.reduce((sum, inv) => 
            sum + inv.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0)
        , 0);
        
        const totalReturns = returnsInRange.reduce((sum, ret) => 
            sum + ret.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0)
        , 0);
        
        const netSales = totalSales - totalReturns;

        // 2. COGS
        const cogsForSales = invoicesInRange.reduce((totalCogs, inv) => {
            const invoiceCogs = inv.items.reduce((invSum, saleItem) => {
                const itemDetails = items.find(i => i.id === saleItem.itemId);
                return invSum + (itemDetails ? itemDetails.purchasePrice * saleItem.quantity : 0);
            }, 0);
            return totalCogs + invoiceCogs;
        }, 0);
        
        const cogsForReturns = returnsInRange.reduce((totalCogs, ret) => {
            const returnCogs = ret.items.reduce((retSum, returnItem) => {
                const itemDetails = items.find(i => i.id === returnItem.itemId);
                return retSum + (itemDetails ? itemDetails.purchasePrice * returnItem.quantity : 0);
            }, 0);
            return totalCogs + returnCogs;
        }, 0);

        const netCogs = cogsForSales - cogsForReturns;

        // 3. Gross Profit
        const grossProfit = netSales - netCogs;

        // 4. Expenses
        const totalExpenses = expensesInRange.reduce((sum, exp) => sum + exp.amount, 0);
        const groupedExpenses = expensesInRange.reduce((acc, exp) => {
            const categoryName = expenseCategories.find(c => c.id === exp.categoryId)?.name || 'غير مصنف';
            acc[categoryName] = (acc[categoryName] || 0) + exp.amount;
            return acc;
        }, {} as { [key: string]: number });


        // 5. Net Profit
        const netProfit = grossProfit - totalExpenses;

        setReportData({ totalSales, totalReturns, netSales, cogsForSales, cogsForReturns, netCogs, grossProfit, totalExpenses, netProfit, groupedExpenses });
    };

    const handlePartnerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = Math.max(0, parseInt(e.target.value) || 0);
        setPartnerCount(count);
        setPartners(prev => {
            const newPartners = [...prev];
            if (count > prev.length) {
                for (let i = prev.length; i < count; i++) {
                    newPartners.push({ name: '', percentage: 0 });
                }
            } else {
                newPartners.splice(count);
            }
            return newPartners;
        });
    };

    const handlePartnerUpdate = (index: number, field: 'name' | 'percentage', value: string) => {
        setPartners(prev => {
            const newPartners = [...prev];
            newPartners[index] = {
                ...newPartners[index],
                [field]: field === 'percentage' ? parseFloat(value) || 0 : value
            };
            return newPartners;
        });
    };

    const handlePrint = () => {
        if (!reportData) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for printing.');
            return;
        }

        let partnersHtml = '';
        if (partners.length > 0) {
            const partnersRows = partners.map(p => {
                const amount = reportData.netProfit * (p.percentage / 100);
                return `
                    <tr class="border-b border-gray-300">
                        <td class="p-2 border border-gray-300 font-bold">${p.name}</td>
                        <td class="p-2 border border-gray-300 text-center">${p.percentage}%</td>
                        <td class="p-2 border border-gray-300 font-bold text-left">${amount.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');

            partnersHtml = `
                <div class="mt-8 pt-4 border-t-2 border-black">
                    <h3 class="text-xl font-bold text-center mb-4">توزيع الأرباح على الشركاء</h3>
                    <table class="w-full text-right border-collapse border border-gray-400">
                        <thead class="bg-gray-200">
                            <tr>
                                <th class="p-2 border border-gray-300">اسم الشريك</th>
                                <th class="p-2 border border-gray-300 text-center">النسبة</th>
                                <th class="p-2 border border-gray-300 text-left">نصيب الربح</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${partnersRows}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const reportHtml = `
            <html>
            <head>
                <title>قائمة الدخل</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; direction: rtl; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                </style>
            </head>
            <body class="p-8" onload="window.print(); window.close();">
                <div class="text-center mb-6 border-b-2 border-black pb-4">
                    <h1 class="text-3xl font-bold">${companyData.name}</h1>
                    <p>${companyData.address}</p>
                </div>
                <h2 class="text-2xl font-bold text-center mb-2">قائمة الدخل</h2>
                <p class="text-center text-gray-600 mb-6">للفترة من ${startDate || 'البداية'} إلى ${endDate || 'النهاية'}</p>
                <div class="space-y-2 max-w-3xl mx-auto text-lg">
                    
                    <div class="flex justify-between p-2"><span class="font-bold">صافي المبيعات</span><span class="font-bold text-xl text-blue-600">${reportData.netSales.toFixed(2)}</span></div>
                    <div class="flex justify-between p-1 pl-6"><span>إجمالي المبيعات</span><span class="font-mono">${reportData.totalSales.toFixed(2)}</span></div>
                    <div class="flex justify-between p-1 pl-6"><span>(-) مرتجع المبيعات</span><span class="font-mono text-red-600">(${reportData.totalReturns.toFixed(2)})</span></div>

                    <div class="flex justify-between p-2 mt-4"><span class="font-bold">(-) صافي تكلفة المبيعات</span><span class="font-bold text-xl text-red-600">(${reportData.netCogs.toFixed(2)})</span></div>
                    <div class="flex justify-between p-1 pl-6"><span>تكلفة المبيعات</span><span class="font-mono">${reportData.cogsForSales.toFixed(2)}</span></div>
                    <div class="flex justify-between p-1 pl-6"><span>(-) تكلفة المرتجعات</span><span class="font-mono text-red-600">(${reportData.cogsForReturns.toFixed(2)})</span></div>
                    
                    <hr class="my-2 border-t-2 border-gray-400"/>
                    <div class="flex justify-between items-center p-2 bg-gray-100"><span class="font-bold text-xl">(=) مجمل الربح</span><span class="font-bold text-xl text-blue-600">${reportData.grossProfit.toFixed(2)}</span></div>
                    
                    <div class="flex justify-between p-2 mt-4"><span class="font-bold">(-) اجمالي المصروفات</span><span class="font-bold text-xl text-red-600">(${reportData.totalExpenses.toFixed(2)})</span></div>
                    ${Object.entries(reportData.groupedExpenses).map(([name, amount]) => `
                        <div class="flex justify-between p-1 pl-6"><span>${name}</span><span class="font-mono text-red-600">(${(amount as number).toFixed(2)})</span></div>
                    `).join('')}

                    <hr class="my-2 border-t-2 border-gray-400"/>
                    <div class="flex justify-between items-center p-4 rounded ${reportData.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}"><span class="font-bold text-2xl">(=) صافي الربح</span><span class="font-bold text-2xl ${reportData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}">${reportData.netProfit.toFixed(2)}</span></div>
                </div>
                
                ${partnersHtml}

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
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-black dark:text-white">قائمة الدخل</h1>
            
            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className={labelClass} htmlFor="start-date">من تاريخ</label>
                        <input 
                            id="start-date" 
                            type="text" 
                            className={inputClass} 
                            {...startDateInputProps}
                        />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="end-date">إلى تاريخ</label>
                        <input 
                            id="end-date" 
                            type="text" 
                            className={inputClass} 
                            {...endDateInputProps}
                        />
                    </div>
                    <div>
                        <button onClick={handleSearch} className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-700">
                            بحث
                        </button>
                    </div>
                </div>
            </div>

            {reportData && (
                <div className={cardClass}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-300 dark:border-gray-600">
                        <h2 className="text-2xl font-bold text-black dark:text-white">
                           قائمة الدخل للفترة من {startDate || 'البداية'} إلى {endDate || 'النهاية'}
                        </h2>
                        <button onClick={handlePrint} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
                            <PrintIcon /> <span className="mr-2">طباعة</span>
                        </button>
                    </div>

                    <div className="space-y-3 max-w-3xl mx-auto text-lg">
                        
                        <div className="flex justify-between p-2"><span className="font-bold text-black dark:text-white">صافي المبيعات</span><span className="font-bold text-xl text-blue-600 dark:text-blue-400">{reportData.netSales.toFixed(2)}</span></div>
                        <div className="flex justify-between p-1 pl-8 text-gray-700 dark:text-gray-300"><span>إجمالي المبيعات</span><span className="font-mono">{reportData.totalSales.toFixed(2)}</span></div>
                        <div className="flex justify-between p-1 pl-8 text-gray-700 dark:text-gray-300"><span>(-) مرتجع المبيعات</span><span className="font-mono text-red-500">({reportData.totalReturns.toFixed(2)})</span></div>

                        <div className="flex justify-between p-2 mt-4"><span className="font-bold text-black dark:text-white">(-) صافي تكلفة المبيعات</span><span className="font-bold text-xl text-red-600 dark:text-red-400">({reportData.netCogs.toFixed(2)})</span></div>
                        <div className="flex justify-between p-1 pl-8 text-gray-700 dark:text-gray-300"><span>تكلفة المبيعات</span><span className="font-mono">{reportData.cogsForSales.toFixed(2)}</span></div>
                        <div className="flex justify-between p-1 pl-8 text-gray-700 dark:text-gray-300"><span>(-) تكلفة المرتجعات</span><span className="font-mono text-red-500">({reportData.cogsForReturns.toFixed(2)})</span></div>

                        <hr className="my-3 border-t-2 border-gray-400 dark:border-gray-500"/>
                        <div className="flex justify-between items-center p-3 rounded bg-black/5 dark:bg-white/5">
                            <span className="font-bold text-xl text-black dark:text-white">(=) مجمل الربح</span>
                            <span className="font-bold text-xl text-blue-600 dark:text-blue-400">{reportData.grossProfit.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between p-2 mt-4"><span className="font-bold text-black dark:text-white">(-) اجمالي المصروفات</span><span className="font-bold text-xl text-red-600 dark:text-red-400">({reportData.totalExpenses.toFixed(2)})</span></div>
                        {Object.entries(reportData.groupedExpenses).map(([name, amount]) => (
                             <div key={name} className="flex justify-between p-1 pl-8 text-gray-700 dark:text-gray-300"><span>{name}</span><span className="font-mono text-red-500">({(amount as number).toFixed(2)})</span></div>
                        ))}


                        <hr className="my-3 border-t-2 border-gray-400 dark:border-gray-500"/>
                        
                        <div className={`flex justify-between items-center p-4 rounded-lg ${reportData.netProfit >= 0 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                            <span className={`font-bold text-2xl ${reportData.netProfit >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>(=) صافي الربح</span>
                            <span className={`font-mono font-bold text-2xl ${reportData.netProfit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{reportData.netProfit.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Partners Distribution Section */}
                    <div className="mt-8 border-t border-gray-300 dark:border-gray-600 pt-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">توزيع الأرباح على الشركاء</h3>
                        <div className="mb-4">
                            <label className={labelClass} htmlFor="partner-count">عدد الشركاء</label>
                            <input 
                                id="partner-count"
                                type="number" 
                                min="0"
                                value={partnerCount} 
                                onChange={handlePartnerCountChange} 
                                className={inputClass + " w-32 text-center"}
                            />
                        </div>

                        {partnerCount > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-700">
                                            <th className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">اسم الشريك</th>
                                            <th className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 w-32 text-center">نسبة الربح (%)</th>
                                            <th className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-left">نصيب الربح (ج.م)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {partners.map((partner, index) => {
                                            const amount = reportData.netProfit * (partner.percentage / 100);
                                            return (
                                                <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                                                    <td className="p-2 border border-gray-300 dark:border-gray-600">
                                                        <input 
                                                            type="text" 
                                                            placeholder={`شريك ${index + 1}`}
                                                            value={partner.name}
                                                            onChange={(e) => handlePartnerUpdate(index, 'name', e.target.value)}
                                                            className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200"
                                                        />
                                                    </td>
                                                    <td className="p-2 border border-gray-300 dark:border-gray-600">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            max="100"
                                                            step="0.1"
                                                            value={partner.percentage}
                                                            onChange={(e) => handlePartnerUpdate(index, 'percentage', e.target.value)}
                                                            className="w-full bg-transparent outline-none text-center font-bold text-blue-600 dark:text-blue-400"
                                                        />
                                                    </td>
                                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-left font-bold text-green-600 dark:text-green-400 font-mono">
                                                        {amount.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                                            <td className="p-2 text-right text-gray-700 dark:text-gray-300">الإجمالي</td>
                                            <td className="p-2 text-center text-blue-700 dark:text-blue-300">
                                                {partners.reduce((sum, p) => sum + p.percentage, 0).toFixed(1)}%
                                            </td>
                                            <td className="p-2 text-left text-green-700 dark:text-green-300 font-mono">
                                                المتبقي: {(reportData.netProfit - partners.reduce((sum, p) => sum + (reportData.netProfit * (p.percentage / 100)), 0)).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncomeStatement;
