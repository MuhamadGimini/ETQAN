
import React, { useState, useMemo } from 'react';
import type { Item, Warehouse, SalesInvoice, SalesReturn, PurchaseInvoice, PurchaseReturn, WarehouseTransfer, CompanyData, DefaultValues, Customer, Supplier } from '../types';
import { ViewIcon, PrintIcon, FormattedNumber, ChevronDownIcon } from './Shared';
import { searchMatch, formatDateForDisplay } from '../utils';
import { getReportPrintTemplate } from '../utils/printing';

interface ItemMovementProps {
    items: Item[];
    warehouses: Warehouse[];
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    warehouseTransfers: WarehouseTransfer[];
    companyData: CompanyData;
    onViewDoc: (view: string, docId: number | string) => void;
    defaultValues: DefaultValues;
    customers: Customer[];
    suppliers: Supplier[];
}

interface ReportRow {
    date: string;
    docId: number | string;
    permissionNumber?: string;
    type: string;
    view: string;
    incoming: number;
    outgoing: number;
    balanceAfter: number;
    isOpening?: boolean;
    isClosing?: boolean;
}

const ItemMovement: React.FC<ItemMovementProps> = ({
    items, warehouses, salesInvoices, salesReturns, purchaseInvoices,
    purchaseReturns, warehouseTransfers, companyData, onViewDoc, defaultValues, customers, suppliers
}) => {
    const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);
    const [reportData, setReportData] = useState<{ rows: ReportRow[], currentBalance: number, itemName: string, warehouseName: string } | null>(null);

    const uniqueItemsList = useMemo(() => {
        const unique = new Map<string, { barcode: string, name: string }>();
        items?.forEach(item => {
            if (item.barcode && !unique.has(item.barcode)) {
                unique.set(item.barcode, { barcode: item.barcode, name: item.name });
            }
        });
        return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [items]);

    const suggestedItems = useMemo(() => {
        if (!itemSearchQuery) return uniqueItemsList;
        return uniqueItemsList?.filter(item => 
            item.barcode.includes(itemSearchQuery) || searchMatch(item.name, itemSearchQuery)
        );
    }, [itemSearchQuery, uniqueItemsList]);

    const handleItemSelect = (item: { barcode: string, name: string }) => {
        setItemSearchQuery(item.name);
        setSelectedBarcode(item.barcode);
        setIsItemSuggestionsOpen(false);
    };

    const generateReport = () => {
        if (!selectedBarcode || !selectedWarehouseId) return;

        // الصنف المستهدف في المخزن المختار
        const targetItem = items?.find(i => i.barcode === selectedBarcode && Number(i.warehouseId) === Number(selectedWarehouseId));
        if (!targetItem) {
            alert("هذا الصنف غير مسجل في المخزن المختار.");
            return;
        }

        const targetId = targetItem.id;
        const currentSystemStock = targetItem.openingBalance || 0;
        const allTransactions: { date: string, label: string, docId: any, permissionNumber?: string, view: string, change: number }[] = [];

        // 1. مبيعات (منصرف)
        salesInvoices?.forEach(inv => {
            inv.items?.forEach(line => {
                if (line.itemId === targetId) {
                    const customer = customers?.find(c => c.id === inv.customerId);
                    allTransactions.push({ 
                        date: inv.date, 
                        label: `فاتورة مبيعات - عميل: ${customer?.name || 'نقدي'}`, 
                        docId: inv.id, 
                        permissionNumber: inv.permissionNumber,
                        view: 'salesInvoice', 
                        change: -line.quantity 
                    });
                }
            });
        });

        // 2. مرتجع مبيعات (وارد)
        salesReturns?.forEach(ret => {
            ret.items?.forEach(line => {
                if (line.itemId === targetId) {
                    const customer = customers?.find(c => c.id === ret.customerId);
                    allTransactions.push({ 
                        date: ret.date, 
                        label: `مرتجع مبيعات - من: ${customer?.name || 'نقدي'}`, 
                        docId: ret.id, 
                        permissionNumber: ret.permissionNumber,
                        view: 'salesReturn', 
                        change: line.quantity 
                    });
                }
            });
        });

        // 3. مشتريات (وارد)
        purchaseInvoices?.forEach(inv => {
            inv.items?.forEach(line => {
                if (line.itemId === targetId) {
                    const supplier = suppliers?.find(s => s.id === inv.supplierId);
                    allTransactions.push({ 
                        date: inv.date, 
                        label: `فاتورة مشتريات - مورد: ${supplier?.name || 'غير معروف'}`, 
                        docId: inv.id, 
                        permissionNumber: inv.permissionNumber,
                        view: 'purchaseInvoice', 
                        change: line.quantity 
                    });
                }
            });
        });

        // 4. مرتجع مشتريات (منصرف)
        purchaseReturns?.forEach(ret => {
            ret.items?.forEach(line => {
                if (line.itemId === targetId) {
                    const supplier = suppliers?.find(s => s.id === ret.supplierId);
                    allTransactions.push({ 
                        date: ret.date, 
                        label: `مرتجع مشتريات - للمورد: ${supplier?.name || 'غير معروف'}`, 
                        docId: ret.id, 
                        permissionNumber: ret.permissionNumber,
                        view: 'purchaseReturn', 
                        change: -line.quantity 
                    });
                }
            });
        });

        // 5. تحويلات مخزنية
        warehouseTransfers?.forEach(t => {
            t.items?.forEach(line => {
                // التحويلات تعتمد على معرف الصنف المصدر، لذا نحتاج للتحقق من الباركود أيضاً للجهة الواردة
                const sourceItem = items.find(i => i.id === line.itemId);
                if (sourceItem && sourceItem.barcode === selectedBarcode) {
                    // صادر من المخزن المختار
                    if (Number(t.fromWarehouseId) === Number(selectedWarehouseId)) {
                        const toWh = warehouses?.find(w => w.id === t.toWarehouseId)?.name || 'مخزن آخر';
                        allTransactions.push({ date: t.date, label: `تحويل مخزني صادر إلى: ${toWh}`, docId: t.id, permissionNumber: '-', view: 'warehouseTransfer', change: -line.quantity });
                    }
                    // وارد إلى المخزن المختار
                    if (Number(t.toWarehouseId) === Number(selectedWarehouseId)) {
                        const fromWh = warehouses?.find(w => w.id === t.fromWarehouseId)?.name || 'مخزن آخر';
                        allTransactions.push({ date: t.date, label: `تحويل مخزني وارد من: ${fromWh}`, docId: t.id, permissionNumber: '-', view: 'warehouseTransfer', change: line.quantity });
                    }
                }
            });
        });

        // ترتيب الحركات زمنياً
        allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // حساب رصيد أول المدة بناءً على الحركات والرصيد الحالي
        const totalNetChange = allTransactions.reduce((acc, t) => acc + t.change, 0);
        const openingBalance = currentSystemStock - totalNetChange;

        let runningBalance = openingBalance;
        const rows: ReportRow[] = [];

        // إضافة سطر الرصيد الافتتاحي
        rows.push({
            date: '', docId: '-', permissionNumber: '-', type: 'رصيد سابق / افتتاحـي', view: '',
            incoming: 0, outgoing: 0, balanceAfter: openingBalance, isOpening: true
        });

        // إضافة حركات الفترة
        allTransactions.forEach(t => {
            runningBalance += t.change;
            rows.push({
                date: t.date,
                docId: t.docId,
                permissionNumber: t.permissionNumber || '-',
                type: t.label,
                view: t.view,
                incoming: t.change > 0 ? t.change : 0,
                outgoing: t.change < 0 ? Math.abs(t.change) : 0,
                balanceAfter: runningBalance
            });
        });

        // إضافة سطر الإجمالي النهائي
        rows.push({
            date: '', docId: '-', permissionNumber: '-', type: 'إجمالي الرصيد الحالي المتوفر', view: '',
            incoming: 0, outgoing: 0, balanceAfter: runningBalance, isClosing: true
        });

        setReportData({
            rows,
            currentBalance: runningBalance,
            itemName: targetItem.name,
            warehouseName: warehouses?.find(w => w.id === selectedWarehouseId)?.name || ''
        });
    };

    const handlePrint = () => {
        if (!reportData) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const headers = ['التاريخ', 'رقم المستند', 'رقم الاذن', 'البيان', 'وارد (+)', 'منصرف (-)', 'الرصيد'];

        const rowsHtml = reportData.rows.map(row => `
            <tr class="${row.isOpening || row.isClosing ? 'bg-gray-100 font-black' : ''}">
                <td class="whitespace-nowrap">${row.date ? formatDateForDisplay(row.date) : '-'}</td>
                <td>${row.docId}</td>
                <td>${row.permissionNumber || '-'}</td>
                <td class="text-right font-black">${row.type}</td>
                <td class="text-green font-black">${row.incoming || ''}</td>
                <td class="text-red font-black">${row.outgoing || ''}</td>
                <td class="font-black text-indigo">${row.balanceAfter}</td>
            </tr>
        `).join('');

        const summaryHtml = `
            <div class="w-full mt-4">
                <div class="summary-item"><span>الصنف:</span><span class="font-black">${reportData.itemName}</span></div>
                <div class="summary-item"><span>المخزن:</span><span class="font-black">${reportData.warehouseName}</span></div>
                <div class="summary-item font-black text-lg border-t-2 border-indigo mt-2 pt-2">
                    <span>الرصيد النهائي:</span><span class="text-indigo">${reportData.currentBalance}</span>
                </div>
            </div>
        `;

        const subtitle = `كشف حركة صنف تفصيلي: ${reportData.itemName} | مخزن: ${reportData.warehouseName}`;
        printWindow.document.write(getReportPrintTemplate('تقرير حركة صنف', subtitle, companyData, headers, rowsHtml, summaryHtml, undefined, undefined, 'A4', '#4f46e5'));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 transition duration-300 font-bold";

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">كشف حركة صنف تفصيلي</h1>
            
            <div className={`${cardClass} relative z-40`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 relative">
                        <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 text-sm">ابحث عن الصنف</label>
                         <div className="relative">
                            <input
                                type="text"
                                className={inputClass}
                                value={itemSearchQuery}
                                onChange={(e) => { setItemSearchQuery(e.target.value); setIsItemSuggestionsOpen(true); }}
                                onFocus={() => setIsItemSuggestionsOpen(true)}
                                onBlur={() => {
                                    setTimeout(() => {
                                        if (isItemSuggestionsOpen && suggestedItems && suggestedItems.length > 0 && itemSearchQuery) {
                                            handleItemSelect(suggestedItems[0]);
                                        }
                                        setIsItemSuggestionsOpen(false);
                                    }, 250);
                                }}
                                placeholder="اسم الصنف أو الباركود..."
                                autoComplete="off"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><ChevronDownIcon /></div>
                        </div>
                        {isItemSuggestionsOpen && suggestedItems && suggestedItems.length > 0 && (
                            <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border-2 border-blue-400 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-2xl">
                                {suggestedItems.map(item => (
                                    <li key={item.barcode} onMouseDown={() => handleItemSelect(item)} className="p-3 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between border-b last:border-0 dark:text-white font-bold">
                                        <span>{item.name}</span>
                                        <span className="text-xs text-gray-500 font-mono">{item.barcode}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                     <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2 text-sm">المخزن</label>
                        <select
                            className={inputClass}
                            value={selectedWarehouseId || ''}
                            onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                        >
                            <option value="" disabled>-- اختر المخزن --</option>
                            {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <button 
                        onClick={generateReport} 
                        disabled={!selectedBarcode || !selectedWarehouseId}
                        className="w-full bg-blue-600 text-white font-black h-12 rounded-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        عرض حركة الصنف
                    </button>
                </div>
            </div>

            {reportData && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-col md:flex-row gap-6">
                         <div className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-2xl shadow-xl p-8 text-center border-4 border-white/20">
                            <p className="text-sm font-bold opacity-80 mb-2 uppercase tracking-widest">الرصيد الفعلي الحالي</p>
                            <p className="text-6xl font-black font-mono tracking-tighter">
                                <FormattedNumber value={reportData.currentBalance} />
                            </p>
                            <p className="text-xs mt-3 opacity-70 font-bold">في مخزن: {reportData.warehouseName}</p>
                        </div>
                        <div className="flex-[2] bg-white/20 dark:bg-black/20 backdrop-blur rounded-2xl p-6 border border-white/30 flex flex-col justify-center">
                            <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100">{reportData.itemName}</h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-2 font-bold">كشف تفصيلي يوضح تسلسل الحركات التاريخية وتأثيرها على أرصدة المخازن.</p>
                             <div className="mt-6">
                                <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg">
                                    <PrintIcon /> <span>طباعة الكشف</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={cardClass}>
                        <div className="overflow-x-auto rounded-xl border-2 border-gray-100 dark:border-gray-700 shadow-inner max-h-[70vh] overflow-y-auto">
                        <table className="w-full text-right border-collapse">
                                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 border-b text-xs font-black text-gray-500 text-center w-32">التاريخ</th>
                                        <th className="p-4 border-b text-xs font-black text-gray-500 text-center w-24">رقم المستند</th>
                                        <th className="p-4 border-b text-xs font-black text-gray-500 text-center w-24">رقم الاذن</th>
                                        <th className="p-4 border-b text-xs font-black text-gray-500">البيان / الحركة</th>
                                        <th className="p-4 border-b text-xs font-black text-green-600 text-center w-24">وارد (+)</th>
                                        <th className="p-4 border-b text-xs font-black text-red-600 text-center w-24">منصرف (-)</th>
                                        <th className="p-4 border-b text-xs font-black text-blue-700 text-center w-32 bg-blue-50/50 dark:bg-blue-900/10 border-r border-l border-blue-200 dark:border-blue-800">الرصيد المتبقي</th>
                                        <th className="p-4 border-b text-xs font-black text-gray-500 text-center w-16">عرض</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.rows.map((row, index) => {
                                        const isSpecial = row.isOpening || row.isClosing;
                                        return (
                                            <tr key={index} className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${row.isOpening ? 'bg-green-50/30 dark:bg-green-900/10' : ''} ${row.isClosing ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''} ${!isSpecial ? 'hover:bg-gray-50 dark:hover:bg-white/5' : ''}`}>
                                                <td className="p-4 text-center text-xs text-gray-600 dark:text-gray-400 font-bold">{row.date ? formatDateForDisplay(row.date) : '-'}</td>
                                                <td className="p-4 text-center font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{row.docId}</td>
                                                <td className="p-4 text-center font-mono text-sm font-bold text-gray-600 dark:text-gray-400">{row.permissionNumber || '-'}</td>
                                                <td className={`p-4 text-sm font-bold ${isSpecial ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{row.type}</td>
                                                <td className="p-4 text-center font-black text-green-600">{row.incoming > 0 ? `+${row.incoming}` : ''}</td>
                                                <td className="p-4 text-center font-black text-red-600">{row.outgoing > 0 ? `-${row.outgoing}` : ''}</td>
                                                <td className="p-4 text-center font-black text-lg bg-blue-50/30 dark:bg-blue-900/5 border-r border-l border-blue-100 dark:border-blue-900"><FormattedNumber value={row.balanceAfter} /></td>
                                                <td className="p-4 text-center">
                                                    {!isSpecial && row.view && (
                                                        <button onClick={() => onViewDoc(row.view, row.docId)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-all"><ViewIcon /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemMovement;
