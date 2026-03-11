
import React, { useState, useMemo } from 'react';
import type { PurchaseInvoice, PurchaseReturn, Item, Supplier, Warehouse, CompanyData } from '../types';
import { ViewIcon, PrintIcon, FormattedNumber } from './Shared';
import { searchMatch, formatDateForDisplay } from '../utils';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';

interface PurchaseReportProps {
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    items: Item[];
    suppliers: Supplier[];
    warehouses: Warehouse[];
    companyData: CompanyData;
    // FIX: Updated onViewDoc docId to accept string | number
    onViewDoc: (view: string, docId: number | string) => void;
}

// FIX: Updated docId to number | string
interface DetailedReportRow {
    date: string;
    type: 'مشتريات' | 'مرتجع';
    docId: number | string;
    permissionNumber: string; // New field
    supplierName: string;
    itemName: string;
    quantity: number;
    price: number;
    total: number;
    view: 'purchaseInvoice' | 'purchaseReturn';
}

// FIX: Updated docId to number | string
interface SummaryReportRow {
    date: string;
    type: 'مشتريات' | 'مرتجع';
    docId: number | string;
    permissionNumber: string; // New field
    supplierName: string;
    total: number;
    view: 'purchaseInvoice' | 'purchaseReturn';
}

interface DetailedReportData {
    type: 'detailed';
    rows: DetailedReportRow[];
    totalPurchases: number;
    totalReturns: number;
    netPurchases: number;
    totalPurchasesQty: number;
    totalReturnsQty: number;
    netPurchasesQty: number;
}
interface SummaryReportData {
    type: 'summary';
    rows: SummaryReportRow[];
    totalPurchases: number;
    totalReturns: number;
    netPurchases: number;
    totalPurchasesQty: number;
    totalReturnsQty: number;
    netPurchasesQty: number;
}

const PurchaseReport: React.FC<PurchaseReportProps> = ({
    purchaseInvoices, purchaseReturns, items, suppliers, warehouses, companyData, onViewDoc
}) => {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        warehouseId: 'all',
        supplierId: 'all',
        itemBarcode: 'all',
        docId: '',
        type: 'all' as 'all' | 'purchases' | 'returns',
    });
    const [reportData, setReportData] = useState<DetailedReportData | SummaryReportData | null>(null);

    const startDateInputProps = useDateInput(filters.startDate, (newDate) => setFilters(prev => ({ ...prev, startDate: newDate })));
    const endDateInputProps = useDateInput(filters.endDate, (newDate) => setFilters(prev => ({ ...prev, endDate: newDate })));

    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [isSupplierSuggestionsOpen, setIsSupplierSuggestionsOpen] = useState(false);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);

    const uniqueItems = useMemo(() => {
        const unique = new Map<string, { barcode: string, name: string }>();
        items.forEach(item => {
            if (!unique.has(item.barcode)) {
                unique.set(item.barcode, { barcode: item.barcode, name: item.name });
            }
        });
        return Array.from(unique.values()).sort((a,b) => a.name.localeCompare(b.name));
    }, [items]);

    const suggestedSuppliers = useMemo(() => {
        if (!supplierSearchQuery) return [];
        return suppliers.filter(s => searchMatch(`${s.name} ${s.phone || ''}`, supplierSearchQuery));
    }, [supplierSearchQuery, suppliers]);
    
    const suggestedItems = useMemo(() => {
        if (!itemSearchQuery) return [];
        return uniqueItems.filter(i => searchMatch(`${i.name} ${i.barcode}`, itemSearchQuery));
    }, [itemSearchQuery, uniqueItems]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSupplierSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSupplierSearchQuery(e.target.value);
        setIsSupplierSuggestionsOpen(true);
        if (e.target.value === '') {
            setFilters(prev => ({ ...prev, supplierId: 'all' }));
        }
    };

    const handleSupplierSelect = (supplier: Supplier) => {
        setSupplierSearchQuery(supplier.name);
        setFilters(prev => ({ ...prev, supplierId: supplier.id.toString() }));
        setIsSupplierSuggestionsOpen(false);
    };
    
    const handleItemSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setItemSearchQuery(e.target.value);
        setIsItemSuggestionsOpen(true);
        if (e.target.value === '') {
            setFilters(prev => ({ ...prev, itemBarcode: 'all' }));
        }
    };

    const handleItemSelect = (item: { barcode: string, name: string }) => {
        setItemSearchQuery(item.name);
        setFilters(prev => ({ ...prev, itemBarcode: item.barcode }));
        setIsItemSuggestionsOpen(false);
    };

    const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (suggestedItems.length === 1) {
                e.preventDefault();
                handleItemSelect(suggestedItems[0]);
            } else if (suggestedItems.length > 0) {
                e.preventDefault();
            }
        }
    };

    const handleItemBlur = () => {
        setTimeout(() => {
            if (isItemSuggestionsOpen && suggestedItems.length > 0 && itemSearchQuery) {
                handleItemSelect(suggestedItems[0]);
            }
            setIsItemSuggestionsOpen(false);
        }, 250);
    };

    const handleSearch = (searchType: 'summary' | 'detailed') => {
        let filteredInvoices = purchaseInvoices.filter(inv =>
            (!filters.startDate || inv.date >= filters.startDate) &&
            (!filters.endDate || inv.date <= filters.endDate) &&
            (filters.warehouseId === 'all' || inv.warehouseId === parseInt(filters.warehouseId)) &&
            (filters.supplierId === 'all' || inv.supplierId === parseInt(filters.supplierId)) &&
            (filters.docId === '' || inv.id.toString() === filters.docId)
        );

        let filteredReturns = purchaseReturns.filter(ret =>
            (!filters.startDate || ret.date >= filters.startDate) &&
            (!filters.endDate || ret.date <= filters.endDate) &&
            (filters.warehouseId === 'all' || ret.warehouseId === parseInt(filters.warehouseId)) &&
            (filters.supplierId === 'all' || ret.supplierId === parseInt(filters.supplierId)) &&
            (filters.docId === '' || ret.id.toString() === filters.docId)
        );

        if (filters.type === 'purchases') {
            filteredReturns = [];
        } else if (filters.type === 'returns') {
            filteredInvoices = [];
        }


        if (searchType === 'summary') {
            const summaryRows: SummaryReportRow[] = [];
            let totalPurchasesQty = 0;
            let totalReturnsQty = 0;
            
            filteredInvoices.forEach(inv => {
                if (filters.itemBarcode !== 'all' && !inv.items.some(item => items.find(i => i.id === item.itemId)?.barcode === filters.itemBarcode)) return;
                const supplier = suppliers.find(s => s.id === inv.supplierId);
                const total = (inv.items.reduce((sum, item) => sum + item.price * item.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                totalPurchasesQty += inv.items.reduce((sum, item) => sum + item.quantity, 0);
                summaryRows.push({
                    date: inv.date, type: 'مشتريات', docId: inv.id,
                    permissionNumber: inv.permissionNumber || '-',
                    supplierName: supplier?.name || 'غير معروف',
                    total, view: 'purchaseInvoice',
                });
            });

            filteredReturns.forEach(ret => {
                if (filters.itemBarcode !== 'all' && !ret.items.some(item => items.find(i => i.id === item.itemId)?.barcode === filters.itemBarcode)) return;
                const supplier = suppliers.find(s => s.id === ret.supplierId);
                const total = (ret.items.reduce((sum, item) => sum + item.price * item.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                totalReturnsQty += ret.items.reduce((sum, item) => sum + item.quantity, 0);
                summaryRows.push({
                    date: ret.date, type: 'مرتجع', docId: ret.id,
                    permissionNumber: ret.permissionNumber || '-',
                    supplierName: supplier?.name || 'غير معروف',
                    total, view: 'purchaseReturn',
                });
            });
            
            summaryRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const totalPurchases = summaryRows.filter(r => r.type === 'مشتريات').reduce((sum, r) => sum + r.total, 0);
            const totalReturns = summaryRows.filter(r => r.type === 'مرتجع').reduce((sum, r) => sum + r.total, 0);

            setReportData({
                type: 'summary', rows: summaryRows, totalPurchases, totalReturns,
                netPurchases: totalPurchases - totalReturns,
                totalPurchasesQty, totalReturnsQty, netPurchasesQty: totalPurchasesQty - totalReturnsQty
            });

        } else { // detailed
            const detailedRows: DetailedReportRow[] = [];
            let totalPurchasesQty = 0;
            let totalReturnsQty = 0;

            filteredInvoices.forEach(inv => {
                inv.items.forEach(item => {
                    const itemDetails = items.find(i => i.id === item.itemId);
                    if (!itemDetails || (filters.itemBarcode !== 'all' && itemDetails.barcode !== filters.itemBarcode)) return;
                    const supplier = suppliers.find(s => s.id === inv.supplierId);
                    totalPurchasesQty += item.quantity;
                    detailedRows.push({
                        date: inv.date, type: 'مشتريات', docId: inv.id,
                        permissionNumber: inv.permissionNumber || '-',
                        supplierName: supplier?.name || 'غير معروف',
                        itemName: itemDetails.name, quantity: item.quantity,
                        price: item.price, total: item.quantity * item.price, view: 'purchaseInvoice',
                    });
                });
            });

            filteredReturns.forEach(ret => {
                ret.items.forEach(item => {
                    const itemDetails = items.find(i => i.id === item.itemId);
                    if (!itemDetails || (filters.itemBarcode !== 'all' && itemDetails.barcode !== filters.itemBarcode)) return;
                    const supplier = suppliers.find(s => s.id === ret.supplierId);
                    totalReturnsQty += item.quantity;
                    detailedRows.push({
                        date: ret.date, type: 'مرتجع', docId: ret.id,
                        permissionNumber: ret.permissionNumber || '-',
                        supplierName: supplier?.name || 'غير معروف',
                        itemName: itemDetails.name, quantity: item.quantity,
                        price: item.price, total: item.quantity * item.price, view: 'purchaseReturn',
                    });
                });
            });
            
            detailedRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const totalPurchases = detailedRows.filter(r => r.type === 'مشتريات').reduce((sum, r) => sum + r.total, 0);
            const totalReturns = detailedRows.filter(r => r.type === 'مرتجع').reduce((sum, r) => sum + r.total, 0);

            setReportData({
                type: 'detailed', rows: detailedRows, totalPurchases, totalReturns,
                netPurchases: totalPurchases - totalReturns,
                totalPurchasesQty, totalReturnsQty, netPurchasesQty: totalPurchasesQty - totalReturnsQty
            });
        }
    };
    
    const handlePrint = () => {
        if (!reportData) return;
        const isSummary = reportData.type === 'summary';
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const headers = isSummary
            ? ['التاريخ', 'رقم الفاتورة', 'رقم الإذن', 'النوع', 'المورد', 'الإجمالي']
            : ['التاريخ', 'رقم الفاتورة', 'رقم الإذن', 'النوع', 'المورد', 'الصنف', 'الكمية', 'السعر', 'الإجمالي'];

        const rowsHtml = reportData.rows.map(row => {
            if(isSummary) {
                const r = row as SummaryReportRow;
                return `<tr>
                    <td>${formatDateForDisplay(r.date)}</td>
                    <td>${r.docId}</td>
                    <td>${r.permissionNumber}</td>
                    <td class="${r.type === 'مرتجع' ? 'text-red' : 'text-green'}">${r.type}</td>
                    <td class="text-right">${r.supplierName}</td>
                    <td class="font-black text-indigo">${r.total.toFixed(2)}</td>
                </tr>`;
            } else {
                const r = row as DetailedReportRow;
                return `<tr>
                    <td>${formatDateForDisplay(r.date)}</td>
                    <td>${r.docId}</td>
                    <td>${r.permissionNumber}</td>
                    <td class="${r.type === 'مرتجع' ? 'text-red' : 'text-green'}">${r.type}</td>
                    <td class="text-right">${r.supplierName}</td>
                    <td class="text-right">${r.itemName}</td>
                    <td>${Math.floor(r.quantity)}</td>
                    <td>${r.price.toFixed(2)}</td>
                    <td class="font-black text-indigo">${r.total.toFixed(2)}</td>
                </tr>`;
            }
        }).join('');

        const summaryHtml = `
            <div class="summary-item"><span>إجمالي المشتريات:</span><span>${reportData.totalPurchases.toFixed(2)}</span></div>
            <div class="summary-item"><span>إجمالي المرتجعات:</span><span class="text-red">-${reportData.totalReturns.toFixed(2)}</span></div>
            <div class="summary-item"><span>صافي المشتريات:</span><span class="text-green">${reportData.netPurchases.toFixed(2)}</span></div>
            <div class="summary-item"><span>صافي عدد القطع:</span><span>${reportData.netPurchasesQty}</span></div>
        `;

        const subtitle = `الفترة من ${formatDateForDisplay(filters.startDate) || 'البداية'} إلى ${formatDateForDisplay(filters.endDate) || 'النهاية'}`;
        const title = `تقرير مشتريات ${isSummary ? 'إجمالي' : 'تفصيلي'}`;

        printWindow.document.write(getReportPrintTemplate(title, subtitle, companyData, headers, rowsHtml, summaryHtml));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">تقرير المشتريات</h1>
            <div className={`${cardClass} relative z-20`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    <div><label className={labelClass}>من تاريخ</label><input type="text" {...startDateInputProps} className={inputClass} /></div>
                    <div><label className={labelClass}>إلى تاريخ</label><input type="text" {...endDateInputProps} className={inputClass} /></div>
                    <div><label className={labelClass}>رقم الفاتورة</label><input type="text" name="docId" value={filters.docId} onChange={handleFilterChange} className={inputClass} placeholder="بحث بالرقم..." /></div>
                    <div><label className={labelClass}>النوع</label><select name="type" value={filters.type} onChange={handleFilterChange} className={inputClass}><option value="all">الكل</option><option value="purchases">مشتريات</option><option value="returns">مرتجع</option></select></div>
                    <div><label className={labelClass}>المخزن</label><select name="warehouseId" value={filters.warehouseId} onChange={handleFilterChange} className={inputClass}><option value="all">الكل</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                    <div className="relative"><label className={labelClass}>المورد</label><input type="text" value={supplierSearchQuery} placeholder="الكل" onChange={handleSupplierSearchChange} onFocus={() => setIsSupplierSuggestionsOpen(true)} onBlur={() => { setTimeout(() => { if (isSupplierSuggestionsOpen && suggestedSuppliers.length > 0 && supplierSearchQuery) { handleSupplierSelect(suggestedSuppliers[0]); } setIsSupplierSuggestionsOpen(false); }, 250); }} className={inputClass} autoComplete="off" />{isSupplierSuggestionsOpen && suggestedSuppliers.length > 0 && (<ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">{suggestedSuppliers.map(s => <li key={s.id} onMouseDown={() => handleSupplierSelect(s)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">{s.name}</li>)}</ul>)}</div>
                    <div className="relative"><label className={labelClass}>الصنف</label><input type="text" value={itemSearchQuery} placeholder="الكل" onChange={handleItemSearchChange} onKeyDown={handleItemKeyDown} onFocus={() => setIsItemSuggestionsOpen(true)} onBlur={handleItemBlur} className={inputClass} autoComplete="off" />{isItemSuggestionsOpen && suggestedItems.length > 0 && (<ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">{suggestedItems.map(i => <li key={i.barcode} onMouseDown={() => handleItemSelect(i)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">{i.name}</li>)}</ul>)}</div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                     <button onClick={() => handleSearch('summary')} className="w-full md:w-auto bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-700">بحث إجمالي</button>
                    <button onClick={() => handleSearch('detailed')} className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-700">بحث تفصيلي</button>
                </div>
            </div>

            {reportData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className={`${cardClass} text-center`}><p className="text-gray-500 dark:text-gray-400">إجمالي المشتريات</p><p className="text-3xl font-bold text-blue-600 dark:text-blue-400"><FormattedNumber value={reportData.totalPurchases} /></p></div>
                        <div className={`${cardClass} text-center`}><p className="text-gray-500 dark:text-gray-400">إجمالي المرتجعات</p><p className="text-3xl font-bold text-red-600 dark:text-red-400"><FormattedNumber value={reportData.totalReturns} /></p></div>
                        <div className={`${cardClass} text-center`}><p className="text-gray-500 dark:text-gray-400">صافي المشتريات</p><p className="text-3xl font-bold text-black dark:text-white"><FormattedNumber value={reportData.netPurchases} /></p></div>
                        <div className={`${cardClass} text-center`}><p className="text-gray-500 dark:text-gray-400">صافي عدد القطع</p><p className="text-3xl font-bold text-black dark:text-white">{reportData.netPurchasesQty}</p></div>
                    </div>
                    <div className={cardClass}>
                         <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">التفاصيل ({reportData.type === 'summary' ? 'إجمالي' : 'تفصيلي'})</h2><button onClick={handlePrint} className="flex items-center justify-center bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700"><PrintIcon /> <span className="mr-2">طباعة</span></button></div>
                        <div className="overflow-auto max-h-[60vh]">
                            {reportData.type === 'summary' ? (
                                <table className="w-full text-right"><thead className="sticky top-0 bg-gray-200 dark:bg-gray-800 z-10"><tr>{['التاريخ', 'رقم الفاتورة', 'رقم الإذن', 'النوع', 'المورد', 'إجمالي', 'عرض'].map(h => <th key={h} className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">{h}</th>)}</tr></thead>
                                <tbody>{reportData.rows.map((row, index) => { const r = row as SummaryReportRow; return (<tr key={index} className={`border-b border-gray-200 dark:border-gray-700 ${r.type === 'مرتجع' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}><td className="p-2 text-gray-700 dark:text-gray-300">{formatDateForDisplay(r.date)}</td><td className="p-2 text-gray-700 dark:text-gray-300">{r.docId}</td><td className="p-2 text-gray-700 dark:text-gray-300 font-mono">{r.permissionNumber}</td><td className={`p-2 font-bold ${r.type === 'مرتجع' ? 'text-red-600' : 'text-green-600'}`}>{r.type}</td><td className="p-2 text-gray-700 dark:text-gray-300 font-bold">{r.supplierName}</td><td className="p-2 font-semibold text-gray-800 dark:text-gray-200"><FormattedNumber value={r.total} /></td><td className="p-2"><button onClick={() => onViewDoc(r.view, r.docId)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><ViewIcon /></button></td></tr>)})}</tbody></table>
                            ) : (
                                <table className="w-full text-right"><thead className="sticky top-0 bg-gray-200 dark:bg-gray-800 z-10"><tr>{['التاريخ', 'رقم الفاتورة', 'رقم الإذن', 'النوع', 'المورد', 'الصنف', 'الكمية', 'السعر', 'إجمالي', 'عرض'].map(h => <th key={h} className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">{h}</th>)}</tr></thead>
                                <tbody>{reportData.rows.map((row, index) => { const r = row as DetailedReportRow; return (<tr key={index} className={`border-b border-gray-200 dark:border-gray-700 ${r.type === 'مرتجع' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}><td className="p-2 text-gray-700 dark:text-gray-300">{formatDateForDisplay(r.date)}</td><td className="p-2 text-gray-700 dark:text-gray-300">{r.docId}</td><td className="p-2 text-gray-700 dark:text-gray-300 font-mono">{r.permissionNumber}</td><td className={`p-2 font-bold ${r.type === 'مرتجع' ? 'text-red-600' : 'text-green-600'}`}>{r.type}</td><td className="p-2 text-gray-700 dark:text-gray-300 font-bold">{r.supplierName}</td><td className="p-2 font-semibold text-gray-800 dark:text-gray-200">{r.itemName}</td><td className="p-2 text-gray-700 dark:text-gray-300">{r.quantity}</td><td className="p-2 text-gray-700 dark:text-gray-300"><FormattedNumber value={r.price} /></td><td className="p-2 font-semibold text-gray-800 dark:text-gray-200"><FormattedNumber value={r.total} /></td><td className="p-2"><button onClick={() => onViewDoc(r.view, r.docId)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><ViewIcon /></button></td></tr>)})}</tbody></table>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PurchaseReport;
