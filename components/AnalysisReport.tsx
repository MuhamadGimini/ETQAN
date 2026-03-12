
import React, { useState, useMemo } from 'react';
import type { SalesInvoice, SalesReturn, Item, Customer, SalesInvoiceItem } from '../types';
import { ChartBarIcon, FormattedNumber, PrintIcon, ChevronDownIcon } from './Shared';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';
import { formatDateForDisplay } from '../utils';

interface AnalysisReportProps {
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    items: Item[];
    customers: Customer[];
    companyData: any;
}

interface AggregatedItem {
    id: number;
    name: string;
    totalQty: number;
    totalRevenue: number;
    totalProfit: number;
}

interface AggregatedCustomer {
    id: number;
    name: string;
    totalPurchaseValue: number;
}

type FilterType = 
    | 'top_items_qty' 
    | 'least_items_qty' 
    | 'top_items_profit' 
    | 'least_items_profit' 
    | 'top_customers' 
    | 'least_customers';

const AnalysisReport: React.FC<AnalysisReportProps> = ({ salesInvoices, salesReturns, items, customers, companyData }) => {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
    const [endDate, setEndDate] = useState<string>(today);
    const [activeFilter, setActiveFilter] = useState<FilterType>('top_items_qty');

    const startDateInputProps = useDateInput(startDate, setStartDate);
    const endDateInputProps = useDateInput(endDate, setEndDate);

    const reportData = useMemo(() => {
        const itemMap = new Map<number, AggregatedItem>();
        const customerMap = new Map<number, AggregatedCustomer>();

        items.forEach(item => {
            if (!itemMap.has(item.id)) {
                itemMap.set(item.id, {
                    id: item.id,
                    name: item.name,
                    totalQty: 0,
                    totalRevenue: 0,
                    totalProfit: 0
                });
            }
        });

        salesInvoices.forEach(inv => {
            const invDate = inv.date.split('T')[0];
            if (invDate >= startDate && invDate <= endDate) {
                const customerTotal = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                if (!customerMap.has(inv.customerId)) {
                    const cust = customers.find(c => c.id === inv.customerId);
                    customerMap.set(inv.customerId, { id: inv.customerId, name: cust?.name || 'غير معروف', totalPurchaseValue: 0 });
                }
                const custEntry = customerMap.get(inv.customerId)!;
                custEntry.totalPurchaseValue += customerTotal;

                inv.items.forEach(saleItem => {
                    const itemDef = items.find(i => i.id === saleItem.itemId);
                    if (!itemDef) return;

                    const entry = itemMap.get(saleItem.itemId);
                    if (entry) {
                        const revenue = saleItem.quantity * saleItem.price;
                        const cost = saleItem.quantity * itemDef.purchasePrice;
                        const profit = revenue - cost;

                        entry.totalQty += saleItem.quantity;
                        entry.totalRevenue += revenue;
                        entry.totalProfit += profit;
                    }
                });
            }
        });

        salesReturns.forEach(ret => {
            const retDate = ret.date.split('T')[0];
            if (retDate >= startDate && retDate <= endDate) {
                 const customerTotal = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                 if (customerMap.has(ret.customerId)) {
                     customerMap.get(ret.customerId)!.totalPurchaseValue -= customerTotal;
                 }

                ret.items.forEach(retItem => {
                    const itemDef = items.find(i => i.id === retItem.itemId);
                    if (!itemDef) return;

                    const entry = itemMap.get(retItem.itemId);
                    if (entry) {
                        const revenue = retItem.quantity * retItem.price;
                        const cost = retItem.quantity * itemDef.purchasePrice;
                        const profit = revenue - cost;

                        entry.totalQty -= retItem.quantity;
                        entry.totalRevenue -= revenue;
                        entry.totalProfit -= profit;
                    }
                });
            }
        });

        const itemsArray = Array.from(itemMap.values());
        const customersArray = Array.from(customerMap.values());

        return {
            itemsArray,
            customersArray,
            topSoldByQty: [...itemsArray].filter(i => i.totalQty > 0).sort((a, b) => b.totalQty - a.totalQty).slice(0, 5),
            topSoldByProfit: [...itemsArray].filter(i => i.totalQty > 0).sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 5),
            topSoldByRevenue: [...itemsArray].filter(i => i.totalQty > 0).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5),
            leastSoldByQty: [...itemsArray].sort((a, b) => a.totalQty - b.totalQty).slice(0, 5),
            topCustomers: [...customersArray].sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue).slice(0, 5),
        };
    }, [salesInvoices, salesReturns, items, customers, startDate, endDate]);

    const filteredDetailedData = useMemo(() => {
        switch (activeFilter) {
            case 'top_items_qty':
                return [...reportData.itemsArray].sort((a, b) => b.totalQty - a.totalQty);
            case 'least_items_qty':
                return [...reportData.itemsArray].sort((a, b) => a.totalQty - b.totalQty);
            case 'top_items_profit':
                return [...reportData.itemsArray].sort((a, b) => b.totalProfit - a.totalProfit);
            case 'least_items_profit':
                return [...reportData.itemsArray].sort((a, b) => a.totalProfit - b.totalProfit);
            case 'top_customers':
                return [...reportData.customersArray].sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue);
            case 'least_customers':
                return [...reportData.customersArray].sort((a, b) => a.totalPurchaseValue - b.totalPurchaseValue);
            default:
                return [];
        }
    }, [reportData, activeFilter]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let headers: string[] = [];
        let rowsHtml = '';

        if (activeFilter.includes('customers')) {
            headers = ['م', 'العميل', 'إجمالي المشتريات'];
            rowsHtml = (filteredDetailedData as AggregatedCustomer[]).map((c, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td class="text-right font-black">${c.name}</td>
                    <td class="font-black text-blue">${c.totalPurchaseValue.toFixed(2)}</td>
                </tr>
            `).join('');
        } else {
            headers = ['م', 'الصنف', 'الكمية المباعة', 'إجمالي الإيراد', 'صافي الربح'];
            rowsHtml = (filteredDetailedData as AggregatedItem[]).map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td class="text-right font-black">${item.name}</td>
                    <td class="font-black text-blue">${item.totalQty}</td>
                    <td>${item.totalRevenue.toFixed(2)}</td>
                    <td class="text-green">${item.totalProfit.toFixed(2)}</td>
                </tr>
            `).join('');
        }

        const filterNames: Record<FilterType, string> = {
            'top_items_qty': 'أكثر الأصناف مبيعاً (كمية)',
            'least_items_qty': 'أقل الأصناف مبيعاً (كمية)',
            'top_items_profit': 'أكثر الأصناف تحقيقاً للربح',
            'least_items_profit': 'أقل الأصناف تحقيقاً للربح',
            'top_customers': 'أكثر العملاء شراء',
            'least_customers': 'أقل العملاء شراء'
        };

        const subtitle = `تحليل الأداء للفترة: ${formatDateForDisplay(startDate)} إلى ${formatDateForDisplay(endDate)} - ${filterNames[activeFilter]}`;
        printWindow.document.write(getReportPrintTemplate('التقرير التفصيلي للتحليل', subtitle, companyData, headers, rowsHtml, ''));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";
    const tableHeaderClass = "p-3 text-lg font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-300 dark:border-gray-600";
    const tableCellClass = "p-3 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700";

    const BestItemCard = ({ title, item, metricLabel, metricValue, colorClass }: { title: string, item?: AggregatedItem, metricLabel: string, metricValue?: string, colorClass: string }) => (
        <div className={`${cardClass} flex flex-col items-center justify-center text-center transform hover:scale-105 transition duration-300`}>
            <div className={`p-3 rounded-full ${colorClass} text-white mb-3`}>
               <ChartBarIcon />
            </div>
            <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 mb-1">{title}</h3>
            {item ? (
                <>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{item.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{metricLabel}: <span className="font-bold">{metricValue}</span></p>
                </>
            ) : (
                <p className="text-gray-400">لا توجد بيانات</p>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">تحليل أداء الأصناف والمبيعات</h1>
            
            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className={labelClass}>من تاريخ</label>
                        <input type="text" {...startDateInputProps} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>إلى تاريخ</label>
                        <input type="text" {...endDateInputProps} className={inputClass} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <BestItemCard 
                    title="الأكثر مبيعاً (كمية)" 
                    item={reportData.topSoldByQty[0]} 
                    metricLabel="الكمية المباعة" 
                    metricValue={reportData.topSoldByQty[0]?.totalQty.toString()}
                    colorClass="bg-blue-500"
                />
                <BestItemCard 
                    title="الأكثر ربحاً" 
                    item={reportData.topSoldByProfit[0]} 
                    metricLabel="صافي الربح" 
                    metricValue={`${reportData.topSoldByProfit[0]?.totalProfit.toFixed(2)} ج.م`}
                    colorClass="bg-green-500"
                />
                 <BestItemCard 
                    title="الأعلى إيراداً" 
                    item={reportData.topSoldByRevenue[0]} 
                    metricLabel="إجمالي الإيراد" 
                    metricValue={`${reportData.topSoldByRevenue[0]?.totalRevenue.toFixed(2)} ج.م`}
                    colorClass="bg-purple-500"
                />
                 <div className={`${cardClass} flex flex-col items-center justify-center text-center transform hover:scale-105 transition duration-300`}>
                     <div className={`p-3 rounded-full bg-yellow-500 text-white mb-3`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 mb-1">أفضل عميل</h3>
                     {reportData.topCustomers[0] ? (
                         <>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{reportData.topCustomers[0].name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المشتريات: <span className="font-bold"><FormattedNumber value={reportData.topCustomers[0].totalPurchaseValue} /> ج.م</span></p>
                         </>
                     ) : <p className="text-gray-400">لا توجد بيانات</p>}
                </div>
            </div>

            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">التقرير التفصيلي</h2>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <select 
                                value={activeFilter} 
                                onChange={(e) => setActiveFilter(e.target.value as FilterType)}
                                className={`${inputClass} appearance-none pr-10`}
                            >
                                <option value="top_items_qty">أكثر الأصناف مبيعاً (كمية)</option>
                                <option value="least_items_qty">أقل الأصناف مبيعاً (كمية)</option>
                                <option value="top_items_profit">أكثر الأصناف تحقيقاً للربح</option>
                                <option value="least_items_profit">أقل الأصناف تحقيقاً للربح</option>
                                <option value="top_customers">أكثر العملاء شراء</option>
                                <option value="least_customers">أقل العملاء شراء</option>
                            </select>
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <ChevronDownIcon />
                            </div>
                        </div>
                        <button onClick={handlePrint} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 flex items-center justify-center whitespace-nowrap">
                            <PrintIcon /> <span className="mr-2">طباعة</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                        <table className="w-full text-right">
                        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                            {activeFilter.includes('customers') ? (
                                <tr>
                                    <th className={tableHeaderClass}>م</th>
                                    <th className={tableHeaderClass}>العميل</th>
                                    <th className={tableHeaderClass}>إجمالي المشتريات</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className={tableHeaderClass}>م</th>
                                    <th className={tableHeaderClass}>الصنف</th>
                                    <th className={tableHeaderClass}>الكمية المباعة</th>
                                    <th className={tableHeaderClass}>إجمالي الإيراد</th>
                                    <th className={tableHeaderClass}>صافي الربح</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {activeFilter.includes('customers') ? (
                                (filteredDetailedData as AggregatedCustomer[]).map((c, index) => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className={tableCellClass}>{index + 1}</td>
                                        <td className={tableCellClass + " font-bold"}>{c.name}</td>
                                        <td className={tableCellClass + " font-bold text-blue-600"}><FormattedNumber value={c.totalPurchaseValue} /></td>
                                    </tr>
                                ))
                            ) : (
                                (filteredDetailedData as AggregatedItem[]).map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className={tableCellClass}>{index + 1}</td>
                                        <td className={tableCellClass + " font-bold"}>{item.name}</td>
                                        <td className={tableCellClass + " font-bold text-blue-600"}>{item.totalQty}</td>
                                        <td className={tableCellClass}><FormattedNumber value={item.totalRevenue} /></td>
                                        <td className={tableCellClass + " font-bold text-green-600"}><FormattedNumber value={item.totalProfit} /></td>
                                    </tr>
                                ))
                            )}
                            {filteredDetailedData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-500">لا توجد بيانات</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalysisReport;
