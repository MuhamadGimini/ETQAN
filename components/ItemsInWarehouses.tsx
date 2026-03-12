
import React, { useState, useMemo, useEffect } from 'react';
import type { Item, Warehouse, CompanyData, SalesInvoice, SalesReturn, PurchaseInvoice, PurchaseReturn } from '../types';
import { PrintIcon, FormattedNumber, ChevronDownIcon, DownloadIcon } from './Shared';
import { searchMatch } from '../utils';
import { exportToExcel } from '../services/excel';

interface ItemsInWarehousesProps {
    items: Item[];
    warehouses: Warehouse[];
    companyData: CompanyData;
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
}

type SortOption = 'barcode' | 'name' | 'sellPrice' | 'purchasePrice' | 'openingBalance';
type SortDirection = 'asc' | 'desc';
type ViewType = 'summary' | 'detailed';

interface DetailedItemRow {
    id: number;
    barcode: string;
    name: string;
    purchasePrice: number;
    sellPrice: number;
    calculatedOpening: number;
    purchases: number;
    purchaseReturns: number;
    sales: number;
    salesReturns: number;
    currentBalance: number;
    warehouseStock: Record<number, number>;
}

const ItemsInWarehouses: React.FC<ItemsInWarehousesProps> = ({ 
    items, warehouses, companyData,
    salesInvoices, salesReturns, purchaseInvoices, purchaseReturns 
}) => {
    const [viewType, setViewType] = useState<ViewType>('summary');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
    const [selectedItemName, setSelectedItemName] = useState<string>('all');
    const [showZeroBalances, setShowZeroBalances] = useState<string>('show'); 
    
    // Display Options State
    const [displayOptions, setDisplayOptions] = useState({
        showPurchasePrice: true,
        showSellPrice: true,
        showProfitMargin: false
    });

    const [summaryReportData, setSummaryReportData] = useState<Item[]>([]);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);

    const [sortOption, setSortOption] = useState<SortOption>('barcode');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const sortItems = (a: Item, b: Item) => {
        let comparison = 0;
        switch (sortOption) {
            case 'barcode':
                const codeA = parseInt(a.barcode);
                const codeB = parseInt(b.barcode);
                if (!isNaN(codeA) && !isNaN(codeB)) comparison = codeA - codeB;
                else comparison = a.barcode.localeCompare(b.barcode);
                break;
            case 'name':
                comparison = a.name.localeCompare(b.name, 'ar');
                break;
            case 'sellPrice':
                comparison = a.sellPrice - b.sellPrice;
                break;
            case 'purchasePrice':
                comparison = a.purchasePrice - b.purchasePrice;
                break;
            case 'openingBalance':
                comparison = a.openingBalance - b.openingBalance;
                break;
            default:
                comparison = 0;
            }
        return sortDirection === 'asc' ? comparison : -comparison;
    };

    useEffect(() => {
        if (viewType !== 'summary') return;
        let filtered = [...items];
        if (selectedItemName !== 'all') {
            filtered = filtered.filter(item => item.name === selectedItemName);
        }
        let finalResult: Item[] = [];
        if (selectedWarehouseId !== 'all') {
            finalResult = filtered.filter(item => item.warehouseId === parseInt(selectedWarehouseId));
        } else {
            const aggregationMap = new Map<string, Item>();
            filtered.forEach(item => {
                const key = item.name;
                if (aggregationMap.has(key)) {
                    const existing = aggregationMap.get(key)!;
                    const totalQty = existing.openingBalance + item.openingBalance;
                    const existingTotalValue = existing.openingBalance * existing.purchasePrice;
                    const newItemTotalValue = item.openingBalance * item.purchasePrice;
                    const totalValue = existingTotalValue + newItemTotalValue;
                    const avgCost = totalQty > 0 ? totalValue / totalQty : existing.purchasePrice;
                    aggregationMap.set(key, { ...existing, openingBalance: totalQty, purchasePrice: avgCost, warehouseId: -1 });
                } else {
                    aggregationMap.set(key, { ...item, warehouseId: -1 });
                }
            });
            finalResult = Array.from(aggregationMap.values());
        }
        if (showZeroBalances === 'hide') {
            finalResult = finalResult.filter(item => item.openingBalance !== 0);
        }
        finalResult.sort(sortItems);
        setSummaryReportData(finalResult);
    }, [items, selectedWarehouseId, selectedItemName, sortOption, sortDirection, showZeroBalances, viewType]);

    const detailedReportData = useMemo<DetailedItemRow[]>(() => {
        if (viewType !== 'detailed') return [];
        const aggregatedItems = new Map<string, DetailedItemRow>();
        items.forEach(item => {
            const key = item.barcode;
            if (!aggregatedItems.has(key)) {
                aggregatedItems.set(key, {
                    id: item.id, barcode: item.barcode, name: item.name,
                    purchasePrice: item.purchasePrice, sellPrice: item.sellPrice,
                    calculatedOpening: 0, purchases: 0, purchaseReturns: 0, sales: 0, salesReturns: 0,
                    currentBalance: 0, warehouseStock: {}
                });
            }
            const entry = aggregatedItems.get(key)!;
            entry.currentBalance += item.openingBalance;
            entry.warehouseStock[item.warehouseId] = (entry.warehouseStock[item.warehouseId] || 0) + item.openingBalance;
        });
        salesInvoices.forEach(inv => {
            inv.items.forEach(line => {
                const item = items.find(i => i.id === line.itemId);
                if (item && aggregatedItems.has(item.barcode)) aggregatedItems.get(item.barcode)!.sales += line.quantity;
            });
        });
        salesReturns.forEach(ret => {
            ret.items.forEach(line => {
                const item = items.find(i => i.id === line.itemId);
                if (item && aggregatedItems.has(item.barcode)) aggregatedItems.get(item.barcode)!.salesReturns += line.quantity;
            });
        });
        purchaseInvoices.forEach(inv => {
            inv.items.forEach(line => {
                const item = items.find(i => i.id === line.itemId);
                if (item && aggregatedItems.has(item.barcode)) aggregatedItems.get(item.barcode)!.purchases += line.quantity;
            });
        });
        purchaseReturns.forEach(ret => {
            ret.items.forEach(line => {
                const item = items.find(i => i.id === line.itemId);
                if (item && aggregatedItems.has(item.barcode)) aggregatedItems.get(item.barcode)!.purchaseReturns += line.quantity;
            });
        });
        let result = Array.from(aggregatedItems.values()).map(row => {
            const netPurchases = row.purchases - row.purchaseReturns;
            const netSales = row.sales - row.salesReturns;
            row.calculatedOpening = row.currentBalance - netPurchases + netSales;
            return row;
        });
        if (selectedItemName !== 'all') result = result.filter(r => r.name === selectedItemName);
        if (showZeroBalances === 'hide') result = result.filter(r => r.currentBalance !== 0);
        return result.sort((a, b) => parseInt(a.barcode) - parseInt(b.barcode));
    }, [items, salesInvoices, salesReturns, purchaseInvoices, purchaseReturns, viewType, selectedItemName, showZeroBalances]);

    const uniqueItems = useMemo(() => {
        const unique = new Map<string, { barcode: string, name: string }>();
        items.forEach(item => {
            if (!unique.has(item.name)) unique.set(item.name, { barcode: item.barcode, name: item.name });
        });
        return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [items]);
    
    const suggestedItems = useMemo(() => {
        if (!itemSearchQuery) return uniqueItems;
        return uniqueItems.filter(item => searchMatch(`${item.name} ${item.barcode}`, itemSearchQuery));
    }, [itemSearchQuery, uniqueItems]);

    // FIX: تم تصحيح اسم الدالة لتطابق الاستدعاء في الـ JSX
    const handleItemSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setItemSearchQuery(e.target.value);
        setIsItemSuggestionsOpen(true);
        if (e.target.value === '') {
            setSelectedItemName('all');
        }
    };

    const handleItemSelect = (item: { barcode: string, name: string }) => {
        setItemSearchQuery(item.name);
        setSelectedItemName(item.name);
        setIsItemSuggestionsOpen(false);
    };

    const summary = useMemo(() => {
        const data = viewType === 'summary' ? summaryReportData : detailedReportData;
        const totalStock = data.reduce((sum, item: any) => sum + (item.openingBalance || item.currentBalance), 0);
        const uniqueCount = data.length;
        
        const totalBuyValue = data.reduce((sum, item: any) => {
            const qty = item.openingBalance !== undefined ? item.openingBalance : item.currentBalance;
            return sum + (qty * item.purchasePrice);
        }, 0);

        const totalSellValue = data.reduce((sum, item: any) => {
            const qty = item.openingBalance !== undefined ? item.openingBalance : item.currentBalance;
            return sum + (qty * item.sellPrice);
        }, 0);

        const totalProfitValue = totalSellValue - totalBuyValue;

        return { count: uniqueCount, totalStock, totalBuyValue, totalSellValue, totalProfitValue };
    }, [summaryReportData, detailedReportData, viewType]);

    const handleExportExcel = () => {
        const dataToExport = (viewType === 'summary' ? summaryReportData : detailedReportData).map((item: any) => {
            if (viewType === 'detailed') {
                const row: any = {
                    'الباركود': item.barcode,
                    'اسم الصنف': item.name,
                    'رصيد أول': item.calculatedOpening,
                    'مشتريات': item.purchases,
                    'م. مشتريات': item.purchaseReturns,
                    'مبيعات': item.sales,
                    'م. مبيعات': item.salesReturns,
                    'رصيد آخر': item.currentBalance,
                };
                if (displayOptions.showPurchasePrice) row['سعر الشراء'] = item.purchasePrice;
                if (displayOptions.showSellPrice) row['سعر البيع'] = item.sellPrice;
                
                warehouses.forEach(w => {
                    row[w.name] = item.warehouseStock[w.id] || 0;
                });
                
                return row;
            } else {
                const row: any = {
                    'الباركود': item.barcode,
                    'اسم الصنف': item.name,
                    'رصيد حالي': item.openingBalance || item.currentBalance,
                };
                if (displayOptions.showPurchasePrice) row['سعر الشراء'] = item.purchasePrice;
                if (displayOptions.showSellPrice) row['سعر البيع'] = item.sellPrice;
                if (displayOptions.showProfitMargin) row['هامش الربح المتوقع'] = ((item.sellPrice - item.purchasePrice) * (item.openingBalance || item.currentBalance)).toFixed(2);
                return row;
            }
        });
        exportToExcel(dataToExport, `الاصناف_في_المخازن_${viewType}`);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let tableContent = '';
        const { showPurchasePrice, showSellPrice, showProfitMargin } = displayOptions;
        
        const isTripleSummary = viewType === 'summary' && showPurchasePrice && showSellPrice && showProfitMargin;

        let summaryBarHtml = `
            <div class="flex justify-between mb-4 text-[10px] border p-2 rounded-lg bg-gray-50 font-bold border-gray-300">
                <div class="flex gap-4">
                    <span>عدد الأصناف: <span class="text-blue-700">${summary.count}</span></span>
                    <span>إجمالي المخزون (قطع): <span class="text-blue-700">${summary.totalStock}</span></span>
                </div>
                <div class="flex gap-4">
                    ${showPurchasePrice ? `<span>إجمالي التكلفة: <span class="text-red-700">${summary.totalBuyValue.toFixed(2)}</span></span>` : ''}
                    ${showSellPrice ? `<span>إجمالي المبيعات: <span class="text-green-700">${summary.totalSellValue.toFixed(2)}</span></span>` : ''}
                    ${showProfitMargin ? `<span>إجمالي الأرباح: <span class="text-purple-700">${summary.totalProfitValue.toFixed(2)}</span></span>` : ''}
                </div>
            </div>
        `;

        if (viewType === 'summary') {
            let headers = '';
            if (isTripleSummary) {
                headers = `
                    <th class="p-2 border border-gray-300 w-32 text-center">الباركود</th>
                    <th class="p-2 border border-gray-300 text-right">اسم الصنف</th>
                    <th class="p-2 border border-gray-300 w-24 text-center">شراء</th>
                    <th class="p-2 border border-gray-300 w-24 text-center">بيع</th>
                    <th class="p-2 border border-gray-300 w-24 text-center">إجمالي تكلفة</th>
                    <th class="p-2 border border-gray-300 w-24 text-center">إجمالي مبيعات</th>
                    <th class="p-2 border border-gray-300 w-24 text-center text-green-700">هامش ربح</th>
                `;
            } else {
                headers = `
                    <th class="p-2 border border-gray-300 w-32 text-center">الباركود</th>
                    <th class="p-2 border border-gray-300 text-right">اسم الصنف</th>
                    <th class="p-2 border border-gray-300 w-40 text-center">المخزن</th>
                    <th class="p-2 border border-gray-300 w-24 text-center">رصيد</th>
                    ${showPurchasePrice ? `<th class="p-2 border border-gray-300 w-24 text-center">شراء</th>` : ''}
                    ${showSellPrice ? `<th class="p-2 border border-gray-300 w-24 text-center">بيع</th>` : ''}
                    <th class="p-2 border border-gray-300 w-32 text-center">إجمالي</th>
                `;
            }

            const rows = summaryReportData.map(item => {
                const warehouseName = item.warehouseId === -1 ? 'كل المخازن' : (warehouses.find(w => w.id === item.warehouseId)?.name || 'غير معروف');
                const totalBuy = item.purchasePrice * item.openingBalance;
                const totalSell = item.sellPrice * item.openingBalance;
                const profit = totalSell - totalBuy;

                if (isTripleSummary) {
                    return `
                        <tr class="border-b">
                            <td class="p-2 border border-gray-300 font-mono text-center">${item.barcode}</td>
                            <td class="p-2 border border-gray-300 font-bold">${item.name}</td>
                            <td class="p-2 border border-gray-300 text-center">${item.purchasePrice.toFixed(2)}</td>
                            <td class="p-2 border border-gray-300 text-center">${item.sellPrice.toFixed(2)}</td>
                            <td class="p-2 border border-gray-300 text-center font-bold">${totalBuy.toFixed(2)}</td>
                            <td class="p-2 border border-gray-300 text-center font-bold">${totalSell.toFixed(2)}</td>
                            <td class="p-2 border border-gray-300 font-bold text-center text-green-700">${profit.toFixed(2)}</td>
                        </tr>`;
                }

                const priceValue = showPurchasePrice ? item.purchasePrice : item.sellPrice;
                const totalValue = priceValue * item.openingBalance;

                return `
                    <tr class="border-b">
                        <td class="p-2 border border-gray-300 font-mono text-center">${item.barcode}</td>
                        <td class="p-2 border border-gray-300 font-bold">${item.name}</td>
                        <td class="p-2 border border-gray-300 text-center text-xs">${warehouseName}</td>
                        <td class="p-2 border border-gray-300 font-bold text-center text-blue-600">${item.openingBalance}</td>
                        ${showPurchasePrice || showSellPrice ? `<td class="p-2 border border-gray-300 text-center">${priceValue.toFixed(2)}</td>` : ''}
                        <td class="p-2 border border-gray-300 font-bold text-center">${totalValue.toFixed(2)}</td>
                    </tr>`;
            }).join('');
            
            tableContent = `
                <table class="w-full text-right border-collapse border border-gray-400">
                    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800" class="bg-gray-200">
                        <tr>${headers}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        } else {
             const warehouseHeaders = warehouses.map(w => `<th class="p-2 border border-gray-300 text-center text-xs">${w.name}</th>`).join('');
             const rows = detailedReportData.map(item => {
                const whCells = warehouses.map(w => `<td class="p-2 border border-gray-300 text-center font-bold" style="background-color: #f0f9ff;">${item.warehouseStock[w.id] || 0}</td>`).join('');
                const profit = (item.sellPrice - item.purchasePrice) * item.currentBalance;
                return `
                <tr class="border-b">
                    <td class="p-2 border border-gray-300 font-mono text-center">${item.barcode}</td>
                    <td class="p-2 border border-gray-300 font-bold">${item.name}</td>
                    <td class="p-2 border border-gray-300 text-center text-xs">${item.calculatedOpening}</td>
                    <td class="p-2 border border-gray-300 text-center text-xs text-green-600">${item.purchases}</td>
                    <td class="p-2 border border-gray-300 text-center text-xs text-red-400">${item.purchaseReturns}</td>
                    <td class="p-2 border border-gray-300 text-center text-xs text-blue-600">${item.sales}</td>
                    <td class="p-2 border border-gray-300 text-center text-xs text-orange-400">${item.salesReturns}</td>
                    <td class="p-2 border border-gray-300 font-bold text-center text-black bg-gray-100">${item.currentBalance}</td>
                    ${showPurchasePrice ? `<td class="p-2 border border-gray-300 text-center text-xs">${item.purchasePrice.toFixed(2)}</td>` : ''}
                    ${showSellPrice ? `<td class="p-2 border border-gray-300 text-center text-xs">${item.sellPrice.toFixed(2)}</td>` : ''}
                    ${showProfitMargin ? `<td class="p-2 border border-gray-300 text-center font-bold text-green-600 text-xs">${profit.toFixed(2)}</td>` : ''}
                    ${whCells}
                </tr>`;
             }).join('');

             tableContent = `
                <table class="w-full text-right border-collapse border border-gray-400">
                    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800" class="bg-gray-200">
                        <tr>
                             <th class="p-2 border border-gray-300 text-center">الباركود</th>
                             <th class="p-2 border border-gray-300">اسم الصنف</th>
                             <th class="p-2 border border-gray-300 text-center text-xs">رصيد أول</th>
                             <th class="p-2 border border-gray-300 text-center text-xs">مشتريات</th>
                             <th class="p-2 border border-gray-300 text-center text-xs">م. مشتريات</th>
                             <th class="p-2 border border-gray-300 text-center text-xs">مبيعات</th>
                             <th class="p-2 border border-gray-300 text-center text-xs">م. مبيعات</th>
                             <th class="p-2 border border-gray-300 text-center text-xs">رصيد آخر</th>
                             ${showPurchasePrice ? `<th class="p-2 border border-gray-300 text-center text-xs">شراء</th>` : ''}
                             ${showSellPrice ? `<th class="p-2 border border-gray-300 text-center text-xs">بيع</th>` : ''}
                             ${showProfitMargin ? `<th class="p-2 border border-gray-300 text-center text-xs">الربح</th>` : ''}
                             ${warehouseHeaders}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }

        const reportHtml = `
            <html>
            <head>
                <title>تقرير الأصناف بالمخازن</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap" rel="stylesheet">
                <style>body { font-family: 'Cairo', sans-serif; direction: rtl; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: black !important; font-size: 8pt; } h1, h2 { font-size: 12pt; } @page { size: landscape; margin: 0.5cm; }</style>
            </head>
            <body class="p-4" onload="window.print(); window.close();">
                <div class="text-center mb-4 border-b-2 border-black pb-2">
                    <h1 class="font-bold">${companyData.name}</h1>
                </div>
                <h2 class="text-center mb-2 font-bold">تقرير أرصدة وتوزيع الأصناف (${viewType === 'summary' ? 'مختصر' : 'تفصيلي'})</h2>
                
                ${summaryBarHtml}
                
                ${tableContent}
            </body>
            </html>
        `;
        printWindow.document.write(reportHtml);
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    const isTripleSummary = viewType === 'summary' && displayOptions.showPurchasePrice && displayOptions.showSellPrice && displayOptions.showProfitMargin;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">الأصناف في المخازن</h1>
            
            <div className={`${cardClass} relative z-30`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="flex flex-col">
                        <label className={labelClass}>نوع العرض</label>
                        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                            <button onClick={() => setViewType('summary')} className={`flex-1 py-2 px-4 rounded-md font-bold text-sm transition-all ${viewType === 'summary' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300'}`}>مختصر</button>
                            <button onClick={() => setViewType('detailed')} className={`flex-1 py-2 px-4 rounded-md font-bold text-sm transition-all ${viewType === 'detailed' ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-300 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300'}`}>تفصيلي</button>
                        </div>
                    </div>
                    <div className="lg:col-span-1 relative">
                        <label className={labelClass}>بحث عن صنف</label>
                        <div className="relative">
                            <input type="text" placeholder="الاسم أو الباركود..." value={itemSearchQuery} onChange={handleItemSearchChange} onFocus={() => setIsItemSuggestionsOpen(true)} onBlur={() => {
                                setTimeout(() => {
                                    if (isItemSuggestionsOpen && suggestedItems.length > 0 && itemSearchQuery) {
                                        handleItemSelect(suggestedItems[0]);
                                    }
                                    setIsItemSuggestionsOpen(false);
                                }, 250);
                            }} className={inputClass} autoComplete="off" />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                        </div>
                        {isItemSuggestionsOpen && (
                            <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg top-full">
                                <li onMouseDown={() => { setItemSearchQuery(''); setSelectedItemName('all'); setIsItemSuggestionsOpen(false); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold text-blue-600">-- عرض كل الأصناف --</li>
                                {suggestedItems.map(item => <li key={item.barcode} onMouseDown={() => handleItemSelect(item)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between"><span>{item.name}</span><span className="text-gray-500 font-mono">{item.barcode}</span></li>)}
                            </ul>
                        )}
                    </div>
                    {viewType === 'summary' && (
                        <div>
                            <label className={labelClass}>المخزن</label>
                            <select value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} className={inputClass}>
                                <option value="all">كل المخازن</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className={labelClass}>فلتر الأرصدة</label>
                        <select value={showZeroBalances} onChange={(e) => setShowZeroBalances(e.target.value)} className={inputClass}>
                            <option value="show">عرض الكل</option>
                            <option value="hide">إخفاء الصفري</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 items-center border-t border-gray-300 dark:border-gray-600 pt-4">
                    <span className="font-bold text-gray-600 dark:text-gray-400">خيارات العرض:</span>
                    <label className="flex items-center gap-2 cursor-pointer bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200">
                        <input type="checkbox" checked={displayOptions.showPurchasePrice} onChange={e => setDisplayOptions(prev => ({...prev, showPurchasePrice: e.target.checked}))} className="w-4 h-4 rounded text-blue-600" />
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-300">سعر الشراء</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200">
                        <input type="checkbox" checked={displayOptions.showSellPrice} onChange={e => setDisplayOptions(prev => ({...prev, showSellPrice: e.target.checked}))} className="w-4 h-4 rounded text-green-600" />
                        <span className="text-sm font-bold text-green-800 dark:text-green-300">سعر البيع</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-lg border border-purple-200">
                        <input type="checkbox" checked={displayOptions.showProfitMargin} onChange={e => setDisplayOptions(prev => ({...prev, showProfitMargin: e.target.checked}))} className="w-4 h-4 rounded text-purple-600" />
                        <span className="text-sm font-bold text-purple-800 dark:text-purple-300">هامش الربح</span>
                    </label>
                </div>
            </div>

            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm">
                        <p className="text-gray-500 dark:text-gray-400 mb-2 font-bold">الأصناف</p>
                        <p className="text-2xl font-bold">{summary.count}</p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm">
                        <p className="text-blue-600 dark:text-blue-400 mb-2 font-bold">إجمالي المخزون (قطع)</p>
                        <p className="text-2xl font-bold"><FormattedNumber value={summary.totalStock} /></p>
                    </div>
                    {displayOptions.showPurchasePrice && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm">
                            <p className="text-red-600 dark:text-red-400 mb-2 font-bold">إجمالي التكلفة (شراء)</p>
                            <p className="text-2xl font-bold"><FormattedNumber value={summary.totalBuyValue} /></p>
                        </div>
                    )}
                    {displayOptions.showSellPrice && (
                         <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg shadow-sm">
                            <p className="text-green-600 dark:text-green-400 mb-2 font-bold">إجمالي المبيعات (بيع)</p>
                            <p className="text-2xl font-bold"><FormattedNumber value={summary.totalSellValue} /></p>
                        </div>
                    )}
                    {displayOptions.showProfitMargin && (
                         <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow-sm">
                            <p className="text-purple-600 dark:text-purple-400 mb-2 font-bold">إجمالي الأرباح (ارباح)</p>
                            <p className="text-2xl font-bold"><FormattedNumber value={summary.totalProfitValue} /></p>
                        </div>
                    )}
                </div>
            </div>

            <div className={`${cardClass} relative z-10`}>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">تقرير الأصناف</h2>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleExportExcel} className="flex items-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300 shadow-md"><DownloadIcon /> <span className="mr-2">تصدير</span></button>
                        <button onClick={handlePrint} className="flex items-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"><PrintIcon /> <span className="mr-2">طباعة</span></button>
                    </div>
                </div>
                
                <div className="overflow-auto max-h-[60vh] border rounded-lg shadow-inner">
                    {viewType === 'summary' ? (
                        <table className="w-full text-right border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-200 dark:bg-gray-800 shadow-sm font-bold">
                                <tr className="border-b-2 border-gray-300">
                                    <th className="p-3" onClick={() => { setSortOption('barcode'); setSortDirection(p => p === 'asc' ? 'desc' : 'asc'); }}>الباركود</th>
                                    <th className="p-3">اسم الصنف</th>
                                    {!isTripleSummary && <th className="p-3">المخزن</th>}
                                    {!isTripleSummary && <th className="p-3 text-center">رصيد</th>}
                                    
                                    {isTripleSummary ? (
                                        <>
                                            <th className="p-3 text-center">شراء</th>
                                            <th className="p-3 text-center">بيع</th>
                                            <th className="p-3 text-center">إجمالي تكلفة</th>
                                            <th className="p-3 text-center">إجمالي مبيعات</th>
                                            <th className="p-3 text-center text-green-600">هامش الربح</th>
                                        </>
                                    ) : (
                                        <>
                                            {displayOptions.showPurchasePrice && <th className="p-3 text-center">شراء</th>}
                                            {displayOptions.showSellPrice && <th className="p-3 text-center">بيع</th>}
                                            <th className="p-3 text-center">الإجمالي</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {summaryReportData.map((item, idx) => {
                                    const totalBuy = item.purchasePrice * item.openingBalance;
                                    const totalSell = item.sellPrice * item.openingBalance;
                                    const profit = totalSell - totalBuy;
                                    const activePrice = displayOptions.showPurchasePrice ? item.purchasePrice : item.sellPrice;
                                    const currentTotal = activePrice * item.openingBalance;

                                    return (
                                        <tr key={idx} className="border-b hover:bg-white/20 font-bold text-sm">
                                            <td className="p-3 font-mono text-gray-700 dark:text-gray-400">{item.barcode}</td>
                                            <td className="p-3">{item.name}</td>
                                            {!isTripleSummary && <td className="p-3 text-xs text-gray-600">{item.warehouseId === -1 ? 'كل المخازن' : warehouses.find(w=>w.id===item.warehouseId)?.name}</td>}
                                            {!isTripleSummary && <td className="p-3 text-center text-blue-600">{item.openingBalance}</td>}
                                            
                                            {isTripleSummary ? (
                                                <>
                                                    <td className="p-3 text-center font-mono">{item.purchasePrice.toFixed(2)}</td>
                                                    <td className="p-3 text-center font-mono">{item.sellPrice.toFixed(2)}</td>
                                                    <td className="p-3 text-center font-mono"><FormattedNumber value={totalBuy} /></td>
                                                    <td className="p-3 text-center font-mono"><FormattedNumber value={totalSell} /></td>
                                                    <td className="p-3 text-center font-bold text-green-600"><FormattedNumber value={profit} /></td>
                                                </>
                                            ) : (
                                                <>
                                                    {(displayOptions.showPurchasePrice || displayOptions.showSellPrice) && <td className="p-3 text-center font-mono">{activePrice.toFixed(2)}</td>}
                                                    <td className="p-3 text-center font-black"><FormattedNumber value={currentTotal} /></td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-right text-xs border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-200 dark:bg-gray-800 shadow-sm font-bold">
                                <tr className="border-b-2 border-gray-300">
                                    <th className="p-2">الباركود</th>
                                    <th className="p-2">اسم الصنف</th>
                                    <th className="p-2 text-center">رصيد أول</th>
                                    <th className="p-2 text-center text-xs">مشتريات</th>
                                    <th className="p-2 text-center text-xs">م. مشتريات</th>
                                    <th className="p-2 text-center text-xs">مبيعات</th>
                                    <th className="p-2 text-center text-xs">م. مبيعات</th>
                                    <th className="p-2 text-center bg-gray-100 dark:bg-gray-700">رصيد آخر</th>
                                    {displayOptions.showPurchasePrice && <th className="p-2 text-center">شراء</th>}
                                    {displayOptions.showSellPrice && <th className="p-2 text-center">بيع</th>}
                                    {displayOptions.showProfitMargin && <th className="p-2 text-center text-green-600">الربح</th>}
                                    {warehouses.map(w => <th key={w.id} className="p-2 text-center bg-blue-50 dark:bg-blue-900/30">{w.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {detailedReportData.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-200 hover:bg-white/20 font-bold">
                                        <td className="p-2 font-mono text-gray-500">{item.barcode}</td>
                                        <td className="p-2">{item.name}</td>
                                        <td className="p-2 text-center">{item.calculatedOpening}</td>
                                        <td className="p-2 text-center text-green-600">{item.purchases}</td>
                                        <td className="p-2 text-center text-red-400">{item.purchaseReturns}</td>
                                        <td className="p-2 text-center text-blue-600">{item.sales}</td>
                                        <td className="p-2 text-center text-orange-400">{item.salesReturns}</td>
                                        <td className="p-2 text-center bg-gray-50 dark:bg-gray-700/50">{item.currentBalance}</td>
                                        {displayOptions.showPurchasePrice && <td className="p-2 text-center font-mono">{item.purchasePrice.toFixed(2)}</td>}
                                        {displayOptions.showSellPrice && <td className="p-2 text-center font-mono">{item.sellPrice.toFixed(2)}</td>}
                                        {displayOptions.showProfitMargin && <td className="p-2 text-center text-green-600 font-mono">{((item.sellPrice - item.purchasePrice) * item.currentBalance).toFixed(2)}</td>}
                                        {warehouses.map(w => <td key={w.id} className="p-2 text-center text-blue-800 font-mono">{item.warehouseStock[w.id] || 0}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ItemsInWarehouses;
