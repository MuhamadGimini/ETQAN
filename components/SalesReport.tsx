
import React, { useState, useMemo } from 'react';
import type { SalesInvoice, SalesReturn, Item, Customer, SalesRepresentative, Warehouse, CompanyData } from '../types';
import { ViewIcon, PrintIcon, ChevronDownIcon, FormattedNumber, ArchiveIcon, SwitchHorizontalIcon, ShoppingCartIcon } from './Shared';
import { searchMatch, formatDateForDisplay } from '../utils';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';

interface SalesReportProps {
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    items: Item[];
    customers: Customer[];
    salesRepresentatives: SalesRepresentative[];
    warehouses: Warehouse[];
    companyData: CompanyData;
    onViewDoc: (view: string, docId: number) => void;
}

interface DetailedReportRow {
    date: string;
    type: 'مبيعات' | 'مرتجع';
    paymentType: string;
    docId: number;
    permissionNumber: string;
    customerName: string;
    salesRepName: string;
    barcode: string;
    itemName: string;
    quantity: number;
    price: number;
    total: number;
    profit: number;
    view: 'salesInvoice' | 'salesReturn';
}

interface SummaryReportRow {
    date: string;
    type: 'مبيعات' | 'مرتجع';
    paymentType: string;
    docId: number;
    permissionNumber: string;
    customerName: string;
    salesRepName: string;
    total: number;
    discount: number;
    tax: number;
    net: number;
    profit: number;
    view: 'salesInvoice' | 'salesReturn';
}

interface DetailedReportData {
    type: 'detailed';
    rows: DetailedReportRow[];
    totalSales: number;
    totalReturns: number;
    netSales: number;
    totalProfit: number;
    netSalesQty: number;
}

interface SummaryReportData {
    type: 'summary';
    rows: SummaryReportRow[];
    totalSales: number;
    totalReturns: number;
    netSales: number;
    totalProfit: number;
    netSalesQty: number;
}

const SalesReport: React.FC<SalesReportProps> = ({
    salesInvoices, salesReturns, items, customers, salesRepresentatives, warehouses, companyData, onViewDoc
}) => {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        warehouseId: 'all',
        customerId: 'all',
        salesRepId: 'all',
        itemBarcode: 'all',
        docId: '',
        permissionNumber: '',
        type: 'all' as 'all' | 'sales' | 'returns',
        paymentMethod: 'all' as 'all' | 'cash' | 'credit'
    });
    const [reportData, setReportData] = useState<DetailedReportData | SummaryReportData | null>(null);

    const startDateInputProps = useDateInput(filters.startDate, (d) => setFilters(p => ({ ...p, startDate: d })));
    const endDateInputProps = useDateInput(filters.endDate, (d) => setFilters(p => ({ ...p, endDate: d })));

    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [isCustomerSuggestionsOpen, setIsCustomerSuggestionsOpen] = useState(false);
    const [salesRepSearchQuery, setSalesRepSearchQuery] = useState('');
    const [isSalesRepSuggestionsOpen, setIsSalesRepSuggestionsOpen] = useState(false);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);

    // handleFilterChange handles changes for standard input and select elements
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // handleCustomerSelect updates the filters and state when a customer is picked from suggestions
    const handleCustomerSelect = (customer: Customer) => {
        setFilters(prev => ({ ...prev, customerId: customer.id.toString() }));
        setCustomerSearchQuery(customer.name);
        setIsCustomerSuggestionsOpen(false);
    };

    // handleSalesRepSelect updates the filters and state when a rep is picked from suggestions
    const handleSalesRepSelect = (rep: SalesRepresentative) => {
        setFilters(prev => ({ ...prev, salesRepId: rep.id.toString() }));
        setSalesRepSearchQuery(rep.name);
        setIsSalesRepSuggestionsOpen(false);
    };

    // handleItemSelect updates the filters and state when an item is picked from suggestions
    const handleItemSelect = (item: { barcode: string, name: string }) => {
        setFilters(prev => ({ ...prev, itemBarcode: item.barcode }));
        setItemSearchQuery(item.name);
        setIsItemSuggestionsOpen(false);
    };

    const uniqueItems = useMemo(() => {
        const unique = new Map<string, { barcode: string, name: string }>();
        items.forEach(item => {
            if (!unique.has(item.barcode)) {
                unique.set(item.barcode, { barcode: item.barcode, name: item.name });
            }
        });
        return Array.from(unique.values()).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
    }, [items]);

    const handleSearch = (searchType: 'summary' | 'detailed') => {
        let filteredInvoices = salesInvoices.filter(inv =>
            (!filters.startDate || inv.date >= filters.startDate) &&
            (!filters.endDate || inv.date <= filters.endDate) &&
            (filters.warehouseId === 'all' || inv.warehouseId === parseInt(filters.warehouseId)) &&
            (filters.customerId === 'all' || inv.customerId === parseInt(filters.customerId)) &&
            (filters.salesRepId === 'all' || inv.salesRepId === parseInt(filters.salesRepId)) &&
            (filters.docId === '' || inv.id.toString() === filters.docId) &&
            (filters.permissionNumber === '' || (inv.permissionNumber || '').includes(filters.permissionNumber)) &&
            (filters.paymentMethod === 'all' || inv.type === filters.paymentMethod)
        );

        let filteredReturns = salesReturns.filter(ret =>
            (!filters.startDate || ret.date >= filters.startDate) &&
            (!filters.endDate || ret.date <= filters.endDate) &&
            (filters.warehouseId === 'all' || ret.warehouseId === parseInt(filters.warehouseId)) &&
            (filters.customerId === 'all' || ret.customerId === parseInt(filters.customerId)) &&
            (filters.salesRepId === 'all' || ret.salesRepId === parseInt(filters.salesRepId)) &&
            (filters.docId === '' || ret.id.toString() === filters.docId) &&
            (filters.permissionNumber === '' || (ret.permissionNumber || '').includes(filters.permissionNumber)) &&
            (filters.paymentMethod === 'all' || ret.type === filters.paymentMethod)
        );

        if (filters.type === 'sales') filteredReturns = [];
        else if (filters.type === 'returns') filteredInvoices = [];

        if (searchType === 'summary') {
            const rows: SummaryReportRow[] = [];
            let totalSales = 0, totalReturns = 0, totalProfit = 0, netQty = 0;

            const processList = (list: any[], type: 'مبيعات' | 'مرتجع') => {
                list.forEach(doc => {
                    if (filters.itemBarcode !== 'all' && !doc.items.some((i: any) => items.find(it => it.id === i.itemId)?.barcode === filters.itemBarcode)) return;
                    
                    const itemsTotal = doc.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
                    const netTotal = (itemsTotal - doc.discount) * (1 + doc.tax / 100);
                    const docQty = doc.items.reduce((s: number, i: any) => s + i.quantity, 0);
                    
                    const cost = doc.items.reduce((s: number, i: any) => {
                        const itemDef = items.find(it => it.id === i.itemId);
                        return s + (itemDef ? itemDef.purchasePrice * i.quantity : 0);
                    }, 0);

                    const profit = (itemsTotal - doc.discount) - cost;

                    if (type === 'مبيعات') { totalSales += netTotal; totalProfit += profit; netQty += docQty; }
                    else { totalReturns += netTotal; totalProfit -= profit; netQty -= docQty; }

                    rows.push({
                        date: doc.date, type, docId: doc.id,
                        paymentType: doc.type === 'cash' ? 'نقدي' : 'آجل',
                        permissionNumber: doc.permissionNumber || '-',
                        customerName: customers.find(c => c.id === doc.customerId)?.name || 'غير معروف',
                        salesRepName: salesRepresentatives.find(r => r.id === doc.salesRepId)?.name || '-',
                        total: itemsTotal, discount: doc.discount, tax: doc.tax, net: netTotal, profit,
                        view: type === 'مبيعات' ? 'salesInvoice' : 'salesReturn'
                    });
                });
            };

            processList(filteredInvoices, 'مبيعات');
            processList(filteredReturns, 'مرتجع');
            rows.sort((a, b) => b.docId - a.docId);

            setReportData({ type: 'summary', rows, totalSales, totalReturns, netSales: totalSales - totalReturns, totalProfit, netSalesQty: netQty });
        } else {
            const rows: DetailedReportRow[] = [];
            let totalSales = 0, totalReturns = 0, totalProfit = 0, netQty = 0;

            const processList = (list: any[], type: 'مبيعات' | 'مرتجع') => {
                list.forEach(doc => {
                    doc.items.forEach((line: any) => {
                        const itemDef = items.find(it => it.id === line.itemId);
                        if (!itemDef || (filters.itemBarcode !== 'all' && itemDef.barcode !== filters.itemBarcode)) return;

                        const lineTotal = line.quantity * line.price;
                        const lineCost = line.quantity * itemDef.purchasePrice;
                        const lineProfit = lineTotal - lineCost;

                        if (type === 'مبيعات') { totalSales += lineTotal; totalProfit += lineProfit; netQty += line.quantity; }
                        else { totalReturns += lineTotal; totalProfit -= lineProfit; netQty -= line.quantity; }

                        rows.push({
                            date: doc.date, type, docId: doc.id,
                            paymentType: doc.type === 'cash' ? 'نقدي' : 'آجل',
                            permissionNumber: doc.permissionNumber || '-',
                            customerName: customers.find(c => c.id === doc.customerId)?.name || 'غير معروف',
                            salesRepName: salesRepresentatives.find(r => r.id === doc.salesRepId)?.name || '-',
                            barcode: itemDef.barcode, itemName: itemDef.name,
                            quantity: line.quantity, price: line.price, total: lineTotal, profit: lineProfit,
                            view: type === 'مبيعات' ? 'salesInvoice' : 'salesReturn'
                        });
                    });
                });
            };

            processList(filteredInvoices, 'مبيعات');
            processList(filteredReturns, 'مرتجع');
            rows.sort((a, b) => b.docId - a.docId);

            setReportData({ type: 'detailed', rows, totalSales, totalReturns, netSales: totalSales - totalReturns, totalProfit, netSalesQty: netQty });
        }
    };

    const handlePrint = () => {
        if (!reportData) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const isSummary = reportData.type === 'summary';
        const headers = isSummary 
            ? ['رقم', 'التاريخ', 'العميل', 'النوع', 'الصافي']
            : ['الفاتورة', 'التاريخ', 'الصنف', 'الكمية', 'السعر', 'الإجمالي'];

        const rowsHtml = reportData.rows.map(r => `
            <tr>
                <td>${r.docId}</td>
                <td>${formatDateForDisplay(r.date)}</td>
                <td class="text-right">${isSummary ? r.customerName : (r as DetailedReportRow).itemName}</td>
                <td>${isSummary ? `${r.type} (${r.paymentType})` : Math.floor((r as DetailedReportRow).quantity)}</td>
                ${!isSummary ? `<td>${(r as DetailedReportRow).price.toFixed(2)}</td>` : ''}
                <td class="font-black text-indigo">${isSummary ? (r as SummaryReportRow).net.toFixed(2) : (r as DetailedReportRow).total.toFixed(2)}</td>
            </tr>
        `).join('');

        const summaryHtml = `
            <div class="summary-item"><span>إجمالي المبيعات:</span><span>${reportData.totalSales.toFixed(2)}</span></div>
            <div class="summary-item"><span>إجمالي المرتجعات:</span><span class="text-red">-${reportData.totalReturns.toFixed(2)}</span></div>
            <div class="summary-item"><span>صافي المبيعات:</span><span class="text-green">${reportData.netSales.toFixed(2)}</span></div>
            <div class="summary-item"><span>صافي الأرباح:</span><span class="text-indigo">${reportData.totalProfit.toFixed(2)}</span></div>
        `;

        const subtitle = `الفترة من ${formatDateForDisplay(filters.startDate) || 'البداية'} إلى ${formatDateForDisplay(filters.endDate) || 'النهاية'}`;
        const title = `تقرير مبيعات ${isSummary ? 'إجمالي' : 'تفصيلي'}`;

        printWindow.document.write(getReportPrintTemplate(title, subtitle, companyData, headers, rowsHtml, summaryHtml));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-black dark:text-white font-bold placeholder-gray-500 transition-all duration-200 text-base";
    const labelClass = "block text-black dark:text-gray-200 font-bold mb-1 text-xs";

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-indigo-800 dark:text-indigo-300">تقرير المبيعات والارباح</h1>

            <div className={`${cardClass} relative z-40`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div><label className={labelClass}>من تاريخ</label><input type="text" {...startDateInputProps} className={inputClass} /></div>
                    <div><label className={labelClass}>إلى تاريخ</label><input type="text" {...endDateInputProps} className={inputClass} /></div>
                    
                    <div className="relative">
                        <label className={labelClass}>العميل</label>
                        <div className="relative">
                            <input type="text" value={customerSearchQuery} onChange={(e) => { setCustomerSearchQuery(e.target.value); setIsCustomerSuggestionsOpen(true); }} onFocus={() => setIsCustomerSuggestionsOpen(true)} onBlur={() => setTimeout(() => setIsCustomerSuggestionsOpen(false), 250)} placeholder="كل العملاء" className={inputClass} autoComplete="off" />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                        </div>
                        {isCustomerSuggestionsOpen && (
                            <ul className="absolute z-[100] w-full bg-white dark:bg-gray-800 border-2 border-indigo-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-2xl">
                                <li onMouseDown={() => { setFilters(f=>({...f, customerId: 'all'})); setCustomerSearchQuery(''); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer font-bold border-b dark:text-white">الكل</li>
                                {customers.filter(c => searchMatch(c.name, customerSearchQuery)).map(c => <li key={c.id} onMouseDown={() => handleCustomerSelect(c)} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white">{c.name}</li>)}
                            </ul>
                        )}
                    </div>

                    <div className="relative">
                        <label className={labelClass}>المندوب</label>
                        <div className="relative">
                            <input type="text" value={salesRepSearchQuery} onChange={(e) => { setSalesRepSearchQuery(e.target.value); setIsSalesRepSuggestionsOpen(true); }} onFocus={() => setIsSalesRepSuggestionsOpen(true)} onBlur={() => setTimeout(() => setIsSalesRepSuggestionsOpen(false), 250)} placeholder="كل المناديب" className={inputClass} autoComplete="off" />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                        </div>
                        {isSalesRepSuggestionsOpen && (
                            <ul className="absolute z-[100] w-full bg-white dark:bg-gray-800 border-2 border-indigo-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-2xl">
                                <li onMouseDown={() => { setFilters(f=>({...f, salesRepId: 'all'})); setSalesRepSearchQuery(''); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer font-bold border-b dark:text-white">الكل</li>
                                {salesRepresentatives.filter(r => searchMatch(r.name, salesRepSearchQuery)).map(r => <li key={r.id} onMouseDown={() => handleSalesRepSelect(r)} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white">{r.name}</li>)}
                            </ul>
                        )}
                    </div>

                    <div className="relative">
                        <label className={labelClass}>الصنف</label>
                        <div className="relative">
                            <input type="text" value={itemSearchQuery} onChange={(e) => { setItemSearchQuery(e.target.value); setIsItemSuggestionsOpen(true); }} onFocus={() => setIsItemSuggestionsOpen(true)} onBlur={() => setTimeout(() => setIsItemSuggestionsOpen(false), 250)} placeholder="كل الأصناف" className={inputClass} autoComplete="off" />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                        </div>
                        {isItemSuggestionsOpen && (
                            <ul className="absolute z-[100] w-full bg-white dark:bg-gray-800 border-2 border-indigo-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-2xl">
                                <li onMouseDown={() => { setFilters(f=>({...f, itemBarcode: 'all'})); setItemSearchQuery(''); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer font-bold border-b dark:text-white">الكل</li>
                                {uniqueItems.filter(i => searchMatch(i.name, itemSearchQuery)).map(i => <li key={i.barcode} onMouseDown={() => handleItemSelect(i)} className="p-3 hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white">{i.name}</li>)}
                            </ul>
                        )}
                    </div>

                    <div><label className={labelClass}>رقم الفاتورة</label><input type="text" name="docId" value={filters.docId} onChange={handleFilterChange} className={inputClass} placeholder="بحث بالرقم..." /></div>
                    <div><label className={labelClass}>رقم الإذن</label><input type="text" name="permissionNumber" value={filters.permissionNumber} onChange={handleFilterChange} className={inputClass} placeholder="بحث..." /></div>
                    
                    <div>
                        <label className={labelClass}>المخزن</label>
                        <select name="warehouseId" value={filters.warehouseId} onChange={handleFilterChange} className={inputClass}>
                            <option value="all">كل المخازن</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>نوع العملية</label>
                        <select name="type" value={filters.type} onChange={handleFilterChange} className={inputClass}>
                            <option value="all">الكل (مبيعات ومرتجع)</option>
                            <option value="sales">مبيعات فقط</option>
                            <option value="returns">مرتجع فقط</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>طريقة الدفع</label>
                        <select name="paymentMethod" value={filters.paymentMethod} onChange={handleFilterChange} className={inputClass}>
                            <option value="all">الكل (نقدي وآجل)</option>
                            <option value="cash">نقدي فقط</option>
                            <option value="credit">آجل فقط</option>
                        </select>
                    </div>

                    <div className="lg:col-span-2 flex gap-2">
                        <button onClick={() => handleSearch('summary')} className="flex-1 bg-indigo-600 text-white font-black h-11 rounded-lg shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all">
                            <SwitchHorizontalIcon className="h-5 w-5" />
                            <span>عرض إجمالي</span>
                        </button>
                        <button onClick={() => handleSearch('detailed')} className="flex-1 bg-blue-600 text-white font-black h-11 rounded-lg shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all">
                            <ShoppingCartIcon className="h-5 w-5" />
                            <span>عرض تفصيلي</span>
                        </button>
                    </div>
                </div>
            </div>

            {reportData && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-4 rounded-xl shadow-lg">
                            <p className="text-xs opacity-80 font-bold">إجمالي المبيعات</p>
                            <p className="text-2xl font-black"><FormattedNumber value={reportData.totalSales} /></p>
                        </div>
                        <div className="bg-gradient-to-br from-red-500 to-red-700 text-white p-4 rounded-xl shadow-lg">
                            <p className="text-xs opacity-80 font-bold">إجمالي المرتجعات</p>
                            <p className="text-2xl font-black"><FormattedNumber value={reportData.totalReturns} /></p>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-4 rounded-xl shadow-lg">
                            <p className="text-xs opacity-80 font-bold">صافي المبيعات</p>
                            <p className="text-2xl font-black"><FormattedNumber value={reportData.netSales} /></p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-4 rounded-xl shadow-lg">
                            <p className="text-xs opacity-80 font-bold">صافي الأرباح</p>
                            <p className="text-2xl font-black"><FormattedNumber value={reportData.totalProfit} /></p>
                        </div>
                    </div>

                    <div className={cardClass}>
                        <div className="flex justify-between items-center mb-6 border-b border-indigo-100 dark:border-indigo-900 pb-3">
                            <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-300">نتائج التقرير ({reportData.type === 'summary' ? 'إجمالي الفواتير' : 'تفصيلي بالأصناف'})</h2>
                            <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-700 transition-all">
                                <PrintIcon />
                                <span>طباعة التقرير</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-indigo-100 dark:border-indigo-900 rounded-xl">
                            <table className="w-full text-right">
                                <thead className="bg-indigo-50 dark:bg-indigo-900/40">
                                    {reportData.type === 'summary' ? (
                                        <tr>
                                            <th className="p-3 text-xs font-bold w-16 text-center">الرقم</th>
                                            <th className="p-3 text-xs font-bold text-center">التاريخ</th>
                                            <th className="p-3 text-xs font-bold">العميل</th>
                                            <th className="p-3 text-xs font-bold text-center">طريقة الدفع</th>
                                            <th className="p-3 text-xs font-bold text-center">إجمالي</th>
                                            <th className="p-3 text-xs font-bold text-center">الربح</th>
                                            <th className="p-3 text-xs font-bold text-center w-16">عرض</th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th className="p-3 text-xs font-bold w-16 text-center">الفاتورة</th>
                                            <th className="p-3 text-xs font-bold text-center">التاريخ</th>
                                            <th className="p-3 text-xs font-bold">الصنف</th>
                                            <th className="p-3 text-xs font-bold text-center">الكمية</th>
                                            <th className="p-3 text-xs font-bold text-center">السعر</th>
                                            <th className="p-3 text-xs font-bold text-center">الإجمالي</th>
                                            <th className="p-3 text-xs font-bold text-center">الربح</th>
                                            <th className="p-3 text-xs font-bold text-center w-16">عرض</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {reportData.rows.map((row, idx) => {
                                        const isReturn = row.type === 'مرتجع';
                                        return (
                                            <tr key={idx} className={`border-t border-indigo-50 dark:border-indigo-900 hover:bg-indigo-50/20 transition-colors ${isReturn ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                                <td className="p-3 text-center font-bold text-indigo-700 dark:text-indigo-400">{row.docId}</td>
                                                <td className="p-3 text-center text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDateForDisplay(row.date)}</td>
                                                
                                                {reportData.type === 'summary' ? (
                                                    <>
                                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{row.customerName}</td>
                                                        <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${row.paymentType === 'نقدي' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{row.paymentType}</span></td>
                                                        <td className="p-3 text-center font-black text-indigo-700 dark:text-indigo-300"><FormattedNumber value={(row as SummaryReportRow).net} /></td>
                                                        <td className={`p-3 text-center font-black ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}><FormattedNumber value={row.profit} /></td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">
                                                            <div>{(row as DetailedReportRow).itemName}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono">{(row as DetailedReportRow).barcode}</div>
                                                        </td>
                                                        <td className="p-3 text-center font-black">{(row as DetailedReportRow).quantity}</td>
                                                        <td className="p-3 text-center font-bold"><FormattedNumber value={(row as DetailedReportRow).price} /></td>
                                                        <td className="p-3 text-center font-black text-indigo-700 dark:text-indigo-300"><FormattedNumber value={(row as DetailedReportRow).total} /></td>
                                                        <td className={`p-3 text-center font-black ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}><FormattedNumber value={row.profit} /></td>
                                                    </>
                                                )}
                                                
                                                <td className="p-3 text-center">
                                                    <button onClick={() => onViewDoc(row.view, row.docId)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors">
                                                        <ViewIcon />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesReport;
