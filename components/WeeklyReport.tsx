
import React, { useState, useMemo } from 'react';
import type { SalesInvoice, SalesReturn, Item, CustomerReceipt, PurchaseInvoice, PurchaseReturn, CompanyData, DefaultValues } from '../types';
import { PrintIcon, FormattedNumber } from './Shared';
import { formatDateForDisplay } from '../utils';
import { getReportPrintTemplate } from '../utils/printing';

interface WeeklyReportProps {
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    customerReceipts: CustomerReceipt[];
    items: Item[];
    companyData: CompanyData;
    defaultValues: DefaultValues;
}

interface WeeklyData {
    weekLabel: string;
    startDate: string;
    endDate: string;
    
    // Opening Stock
    openingStockCost: number;
    openingStockSell: number;
    
    // Net Sales
    netSalesCost: number;
    netSalesSell: number;
    
    // Profit
    grossProfit: number;
    
    // Growth
    salesGrowth: number; // percentage
    
    // Cash Collections
    cashCollections: number;

    // Discounts
    totalDiscounts: number;
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({
    salesInvoices,
    salesReturns,
    purchaseInvoices,
    purchaseReturns,
    customerReceipts,
    items,
    companyData,
    defaultValues,
}) => {
    const [numberOfWeeks, setNumberOfWeeks] = useState(5);

    // Helper to get Monday of the week for a given date
    const getMonday = (d: Date) => {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    };

    const reportData = useMemo(() => {
        const weeksData: WeeklyData[] = [];
        let currentRefDate = new Date(); // Start from today working backwards

        // We want to generate 'numberOfWeeks' weeks
        // Align currentRefDate to the start of the current week (Monday)
        let currentWeekStart = getMonday(currentRefDate);

        for (let i = 0; i < numberOfWeeks; i++) {
            // Define Week Range (Monday to Sunday)
            const weekStart = new Date(currentWeekStart);
            weekStart.setHours(0, 0, 0, 0); // Monday 00:00
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Sunday
            weekEnd.setHours(23, 59, 59, 999); // Sunday 23:59

            const startDateStr = weekStart.toISOString();
            const endDateStr = weekEnd.toISOString();
            const weekLabel = `${formatDateForDisplay(weekStart.toISOString())} إلى ${formatDateForDisplay(weekEnd.toISOString())}`;

            // 1. Calculate Opening Stock (at start of Monday)
            
            let openingStockCost = 0;
            let openingStockSell = 0;

            // To get historical stock, we iterate all items
            items.forEach(item => {
                let historicalQty = item.openingBalance; // Initial setup balance

                // Add Purchases before weekStart
                purchaseInvoices.forEach(inv => {
                    if (inv.date < startDateStr) {
                        const invItem = inv.items.find(x => x.itemId === item.id);
                        if (invItem) historicalQty += invItem.quantity;
                    }
                });
                purchaseReturns.forEach(ret => {
                    if (ret.date < startDateStr) {
                        const retItem = ret.items.find(x => x.itemId === item.id);
                        if (retItem) historicalQty -= retItem.quantity;
                    }
                });

                // Subtract Sales before weekStart
                salesInvoices.forEach(inv => {
                    if (inv.date < startDateStr) {
                        const invItem = inv.items.find(x => x.itemId === item.id);
                        if (invItem) historicalQty -= invItem.quantity;
                    }
                });
                salesReturns.forEach(ret => {
                    if (ret.date < startDateStr) {
                        const retItem = ret.items.find(x => x.itemId === item.id);
                        if (retItem) historicalQty += retItem.quantity;
                    }
                });

                if (historicalQty > 0) {
                    openingStockCost += historicalQty * item.purchasePrice;
                    openingStockSell += historicalQty * item.sellPrice;
                }
            });

            // 2. Net Sales & Discounts during the week
            let salesCost = 0;
            let salesSell = 0;
            let totalDiscounts = 0;
            
            salesInvoices.forEach(inv => {
                if (inv.date >= startDateStr && inv.date <= endDateStr) {
                    inv.items.forEach(line => {
                        const itemDef = items.find(x => x.id === line.itemId);
                        if (itemDef) {
                            salesCost += line.quantity * itemDef.purchasePrice;
                            salesSell += line.quantity * line.price; // Actual sell price in invoice
                        }
                    });
                    // Adjust for discount on invoice level (approximate distribution)
                    if (inv.discount > 0) {
                        salesSell -= inv.discount;
                        totalDiscounts += inv.discount; // Add invoice discount
                    }
                }
            });

            salesReturns.forEach(ret => {
                if (ret.date >= startDateStr && ret.date <= endDateStr) {
                    ret.items.forEach(line => {
                        const itemDef = items.find(x => x.id === line.itemId);
                        if (itemDef) {
                            salesCost -= line.quantity * itemDef.purchasePrice;
                            salesSell -= line.quantity * line.price;
                        }
                    });
                    if (ret.discount > 0) {
                        salesSell += ret.discount;
                        // Return discount reduces the "Given Discount", effectively we take it back.
                        // However, usually we track "Total Discounts Given".
                        // To keep Net Sales correct, we added it back to SalesSell.
                        // For the Discount Column, do we subtract it? Usually yes.
                        totalDiscounts -= ret.discount;
                    }
                }
            });

            // 3. Profit Margin
            const grossProfit = salesSell - salesCost;

            // 4. Cash Collections & Receipt Discounts
            // a. Cash Invoices (paidAmount)
            let cashFromSales = 0;
            salesInvoices.forEach(inv => {
                if (inv.date >= startDateStr && inv.date <= endDateStr) {
                    cashFromSales += (inv.paidAmount || 0);
                }
            });
            
            // c. Receipt Vouchers
            let receiptVouchers = 0;
            customerReceipts.forEach(rec => {
                if (rec.date >= startDateStr && rec.date <= endDateStr) {
                    if (rec.paymentMethod === 'discount') {
                        totalDiscounts += rec.amount; // Add receipt discount (Permitted Discount)
                    } else {
                        receiptVouchers += rec.amount; // Cash or Check
                    }
                }
            });

            const cashCollections = cashFromSales + receiptVouchers;

            weeksData.push({
                weekLabel,
                startDate: startDateStr,
                endDate: endDateStr,
                openingStockCost,
                openingStockSell,
                netSalesCost: salesCost,
                netSalesSell: salesSell,
                grossProfit,
                salesGrowth: 0, // Calculated in next pass
                cashCollections,
                totalDiscounts
            });

            // Move back 7 days for next iteration
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        }

        // Calculate Growth (Reverse loop because we built it Newest -> Oldest)
        // We want (Current - Previous) / Previous
        // In our array, index 0 is newest, index 1 is previous week
        for (let i = 0; i < weeksData.length - 1; i++) {
            const currentWeek = weeksData[i];
            const prevWeek = weeksData[i + 1];

            if (prevWeek.netSalesSell !== 0) {
                currentWeek.salesGrowth = ((currentWeek.netSalesSell - prevWeek.netSalesSell) / prevWeek.netSalesSell) * 100;
            } else if (currentWeek.netSalesSell > 0) {
                currentWeek.salesGrowth = 100;
            } else {
                currentWeek.salesGrowth = 0;
            }
        }

        return weeksData;
    }, [salesInvoices, salesReturns, purchaseInvoices, purchaseReturns, customerReceipts, items, numberOfWeeks]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const headers = ['فترة الأسبوع', 'أول المدة (تكلفة)', 'أول المدة (بيع)', 'المبيعات (تكلفة)', 'المبيعات (بيع)', 'هامش الربح', 'النمو %', 'إجمالي الخصم', 'التحصيلات'];

        const rowsHtml = reportData.map((row) => `
            <tr>
                <td class="font-bold text-right">${row.weekLabel}</td>
                <td>${row.openingStockCost.toFixed(2)}</td>
                <td>${row.openingStockSell.toFixed(2)}</td>
                <td>${row.netSalesCost.toFixed(2)}</td>
                <td class="font-black text-indigo">${row.netSalesSell.toFixed(2)}</td>
                <td class="font-black text-green">${row.grossProfit.toFixed(2)}</td>
                <td class="font-black ${row.salesGrowth >= 0 ? 'text-green' : 'text-red'}">
                    ${row.salesGrowth.toFixed(1)}% ${row.salesGrowth > 0 ? '↑' : row.salesGrowth < 0 ? '↓' : '-'}
                </td>
                <td class="text-red">${row.totalDiscounts.toFixed(2)}</td>
                <td class="font-black text-indigo">${row.cashCollections.toFixed(2)}</td>
            </tr>
        `).join('');

        const subtitle = `تقرير أداء أسبوعي لآخر ${numberOfWeeks} أسابيع`;
        const title = `التقرير الأسبوعي الشامل`;

        printWindow.document.write(getReportPrintTemplate(title, subtitle, companyData, headers, rowsHtml));
        printWindow.document.close();
    };

    const formatNumberWithCommas = (val: number) => {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 transition duration-300";

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">التقرير الأسبوعي الشامل</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-gray-700 dark:text-gray-300 font-bold">عدد الأسابيع:</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="52" 
                            value={numberOfWeeks} 
                            onChange={(e) => setNumberOfWeeks(parseInt(e.target.value) || 5)} 
                            className={`${inputClass} w-20 text-center`}
                        />
                    </div>
                    <button onClick={handlePrint} className="flex items-center justify-center bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700">
                        <PrintIcon /> <span className="mr-2">طباعة</span>
                    </button>
                </div>
            </div>

            <div className={cardClass}>
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                                <th rowSpan={2} className="p-3 border border-gray-300 dark:border-gray-600 text-center align-middle">فترة الأسبوع</th>
                                <th colSpan={2} className="p-3 border border-gray-300 dark:border-gray-600 text-center bg-blue-50 dark:bg-blue-900/20">أصناف أول المدة</th>
                                <th colSpan={2} className="p-3 border border-gray-300 dark:border-gray-600 text-center bg-green-50 dark:bg-green-900/20">صافي المبيعات</th>
                                <th rowSpan={2} className="p-3 border border-gray-300 dark:border-gray-600 text-center align-middle">هامش الربح</th>
                                <th rowSpan={2} className="p-3 border border-gray-300 dark:border-gray-600 text-center align-middle">النمو %</th>
                                <th rowSpan={2} className="p-3 border border-gray-300 dark:border-gray-600 text-center align-middle">إجمالي الخصم</th>
                                <th rowSpan={2} className="p-3 border border-gray-300 dark:border-gray-600 text-center align-middle">التحصيلات النقدية</th>
                            </tr>
                            <tr className="bg-gray-100 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
                                <th className="p-2 border border-gray-300 dark:border-gray-600 text-center">بسعر التكلفة</th>
                                <th className="p-2 border border-gray-300 dark:border-gray-600 text-center">بسعر البيع</th>
                                <th className="p-2 border border-gray-300 dark:border-gray-600 text-center">بسعر التكلفة</th>
                                <th className="p-2 border border-gray-300 dark:border-gray-600 text-center">بسعر البيع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/20 dark:hover:bg-white/5 border-b border-gray-200 dark:border-gray-700">
                                    <td className="p-3 border-l border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap text-center text-sm">{row.weekLabel}</td>
                                    
                                    {/* Opening Stock */}
                                    <td className="p-3 text-center text-gray-600 dark:text-gray-400"><FormattedNumber value={row.openingStockCost} /></td>
                                    <td className="p-3 text-center text-gray-600 dark:text-gray-400 border-l-2 border-gray-300 dark:border-gray-600"><FormattedNumber value={row.openingStockSell} /></td>
                                    
                                    {/* Net Sales */}
                                    <td className="p-3 text-center text-gray-600 dark:text-gray-400"><FormattedNumber value={row.netSalesCost} /></td>
                                    <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400 border-l-2 border-gray-300 dark:border-gray-600"><FormattedNumber value={row.netSalesSell} /></td>
                                    
                                    {/* Profit */}
                                    <td className="p-3 text-center font-bold text-green-600 dark:text-green-400 text-lg"><FormattedNumber value={row.grossProfit} /></td>
                                    
                                    {/* Growth */}
                                    <td className={`p-3 text-center font-bold dir-ltr ${row.salesGrowth > 0 ? 'text-green-600' : row.salesGrowth < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                        <span className="flex items-center justify-center gap-1">
                                            {row.salesGrowth > 0 && '↑'}
                                            {row.salesGrowth < 0 && '↓'}
                                            {Math.abs(row.salesGrowth).toFixed(1)}%
                                        </span>
                                    </td>

                                    {/* Discounts */}
                                    <td className="p-3 text-center font-bold text-orange-600 dark:text-orange-400"><FormattedNumber value={row.totalDiscounts} /></td>
                                    
                                    {/* Cash Collections */}
                                    <td className="p-3 text-center font-bold text-purple-600 dark:text-purple-400"><FormattedNumber value={row.cashCollections} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    * الأسبوع يبدأ من يوم الاثنين وينتهي يوم الأحد.
                    <br/>
                    * التحصيلات النقدية = المقبوضات النقدية + المدفوعات النقدية في فواتير المبيعات.
                    <br/>
                    * إجمالي الخصم = خصومات الفواتير + سندات الخصم المسموح به.
                </div>
            </div>
        </div>
    );
};

export default WeeklyReport;
