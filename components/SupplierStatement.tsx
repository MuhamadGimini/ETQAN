import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Supplier, PurchaseInvoice, PurchaseReturn, SupplierPayment, CompanyData, DefaultValues, Item } from '../types';
import { ViewIcon, PrintIcon, PdfIcon, FormattedNumber, ChevronDownIcon, WhatsAppIcon } from './Shared';
// FIX: Added searchMatch to imports from utils
import { formatNumberWithSmallerDecimals, formatNumber, formatPhoneNumberForWhatsApp, formatDateForDisplay, searchMatch } from '../utils';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';

interface SupplierStatementProps {
    suppliers: Supplier[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    supplierPayments: SupplierPayment[];
    items: Item[];
    onViewDoc: (view: string, docId: number | string) => void;
    companyData: CompanyData;
    preselectedSupplier: number | null;
    onClearPreselectedSupplier: () => void;
    defaultValues: DefaultValues;
}

interface StatementRow {
    id: string;
    date: string;
    type: string;
    typeId: number | string;
    debit: number;
    credit: number;
    balance: number;
    docId: number | string;
    view: string;
    qtyPrice?: string;
    quantity?: number;
    price?: number;
}

const SupplierStatement: React.FC<SupplierStatementProps> = ({ 
    suppliers, purchaseInvoices, purchaseReturns, supplierPayments, items, onViewDoc, companyData,
    preselectedSupplier, onClearPreselectedSupplier, defaultValues
}) => {
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(preselectedSupplier);
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [isSupplierSuggestionsOpen, setIsSupplierSuggestionsOpen] = useState(false);

    // FIX: Added suggestedSuppliers memo to filter based on search query
    const suggestedSuppliers = useMemo(() => {
        if (!supplierSearchQuery) return suppliers;
        return suppliers.filter(supplier => searchMatch(`${supplier.name} ${supplier.phone || ''}`, supplierSearchQuery));
    }, [supplierSearchQuery, suppliers]);
    
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const startDateInputProps = useDateInput(startDate, setStartDate);
    const endDateInputProps = useDateInput(endDate, setEndDate);

    const [statementData, setStatementData] = useState<{ rows: StatementRow[], openingBalance: number, closingBalance: number, type: 'summary' | 'detailed' } | null>(null);

    const generateStatement = useCallback((supplierId: number | null, type: 'summary' | 'detailed') => {
        if (!supplierId) {
            setStatementData(null);
            return;
        }

        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return;

        let dynamicOpeningBalance = supplier.openingBalance;

        const isBeforeStart = (dateStr: string) => {
            if (!startDate) return false;
            return dateStr < startDate;
        };

        const isInRange = (dateStr: string) => {
            if (startDate && dateStr < startDate) return false;
            if (endDate && dateStr > endDate) return false;
            return true;
        };

        const supplierInvoices = purchaseInvoices.filter(inv => inv.supplierId === supplierId);
        const supplierReturns = purchaseReturns.filter(ret => ret.supplierId === supplierId);
        const supplierPaymentsData = supplierPayments.filter(p => p.supplierId === supplierId);

        supplierInvoices.forEach(inv => {
            if (isBeforeStart(inv.date)) {
                const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                dynamicOpeningBalance += total; 
                if (inv.paidAmount > 0) {
                    dynamicOpeningBalance -= inv.paidAmount; 
                }
            }
        });

        supplierReturns.forEach(ret => {
            if (isBeforeStart(ret.date)) {
                const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                dynamicOpeningBalance -= total; 
                if (ret.paidAmount > 0) {
                    dynamicOpeningBalance += ret.paidAmount; 
                }
            }
        });

        supplierPaymentsData.forEach(p => {
            if (isBeforeStart(p.date)) {
                dynamicOpeningBalance -= p.amount; 
            }
        });

        let transactions: { id: string; date: string; type: string; typeId: string | number; debit: number; credit: number; view: string; qtyPrice?: string; quantity?: number; price?: number }[] = [];

        const invoicesInRange = supplierInvoices.filter(inv => isInRange(inv.date));
        const returnsInRange = supplierReturns.filter(ret => isInRange(ret.date));
        const paymentsInRange = supplierPaymentsData.filter(p => isInRange(p.date));

        if (type === 'summary') {
            const invoiceTransactions = invoicesInRange.flatMap(inv => {
                const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                const entries: typeof transactions = [{ id: `inv-${inv.id}`, date: inv.date, type: 'فاتورة مشتريات', typeId: inv.id, debit: 0, credit: total, view: 'purchaseInvoice' }];
                if (inv.paidAmount > 0) {
                    entries.push({ id: `inv-pay-${inv.id}`, date: inv.date, type: `سداد فاتورة مشتريات رقم ${inv.id}`, typeId: inv.id, debit: inv.paidAmount, credit: 0, view: 'purchaseInvoice' });
                }
                return entries;
            });
            const returnTransactions = returnsInRange.flatMap(ret => {
                const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                const entries: typeof transactions = [{ id: `ret-${ret.id}`, date: ret.date, type: 'مرتجع مشتريات', typeId: ret.id, debit: total, credit: 0, view: 'purchaseReturn' }];
                if (ret.paidAmount > 0) {
                    entries.push({ id: `ret-pay-${ret.id}`, date: ret.date, type: `استلام نقدية لمرتجع رقم ${ret.id}`, typeId: ret.id, debit: 0, credit: ret.paidAmount, view: 'purchaseReturn' });
                }
                return entries;
            });
            const paymentTransactions = paymentsInRange.map(p => ({
                id: `pay-${p.id}`, date: p.date, type: p.paymentMethod === 'discount' ? 'خصم مكتسب' : 'سند دفع', typeId: p.id, debit: p.amount, credit: 0, view: 'supplierPayment'
            }));
            transactions = [...invoiceTransactions, ...returnTransactions, ...paymentTransactions];

        } else { 
            const invoiceTransactions = invoicesInRange.flatMap(inv => {
                const itemRows: typeof transactions = inv.items.map((item, idx) => {
                    const itemData = items.find(i => i.id === item.itemId);
                    const lineTotal = item.price * item.quantity;
                    return { id: `inv-${inv.id}-item-${idx}`, date: inv.date, type: `فاتورة ${inv.id}: ${itemData?.name || 'صنف'}`, typeId: inv.id, debit: 0, credit: lineTotal, view: 'purchaseInvoice', qtyPrice: `${item.quantity} * ${item.price}`, quantity: item.quantity, price: item.price };
                });
                const itemsTotal = inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
                const finalTotal = (itemsTotal - inv.discount) * (1 + inv.tax / 100);
                const adjustment = finalTotal - itemsTotal;
                if (Math.abs(adjustment) > 0.01) { itemRows.push({ id: `inv-${inv.id}-adj`, date: inv.date, type: `فاتورة ${inv.id}: ضريبة/خصم`, typeId: inv.id, debit: 0, credit: adjustment, view: 'purchaseInvoice', qtyPrice: '' }); }
                if (inv.paidAmount > 0) { itemRows.push({ id: `inv-pay-${inv.id}`, date: inv.date, type: `سداد فاتورة مشتريات رقم ${inv.id}`, typeId: inv.id, debit: inv.paidAmount, credit: 0, view: 'purchaseInvoice', qtyPrice: '' }); }
                return itemRows;
            });
            const returnTransactions = returnsInRange.flatMap(ret => {
                const itemRows: typeof transactions = ret.items.map((item, idx) => {
                    const itemData = items.find(i => i.id === item.itemId);
                    const lineTotal = item.price * item.quantity;
                    return { id: `ret-${ret.id}-item-${idx}`, date: ret.date, type: `مرتجع ${ret.id}: ${itemData?.name || 'صنف'}`, typeId: ret.id, debit: lineTotal, credit: 0, view: 'purchaseReturn', qtyPrice: `${item.quantity} * ${item.price}`, quantity: item.quantity, price: item.price };
                });
                const itemsTotal = ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
                const finalTotal = (itemsTotal - ret.discount) * (1 + ret.tax / 100);
                const adjustment = finalTotal - itemsTotal;
                if (Math.abs(adjustment) > 0.01) { itemRows.push({ id: `ret-${ret.id}-adj`, date: ret.date, type: `مرتجع ${ret.id}: ضريبة/خصم`, typeId: ret.id, debit: adjustment, credit: 0, view: 'purchaseReturn', qtyPrice: '' }); }
                if (ret.paidAmount > 0) { itemRows.push({ id: `ret-pay-${ret.id}`, date: ret.date, type: `استلام نقدية لمرتجع رقم ${ret.id}`, typeId: ret.id, debit: 0, credit: ret.paidAmount, view: 'purchaseReturn', qtyPrice: '' }); }
                return itemRows;
            });
            const paymentTransactions = paymentsInRange.map(p => ({
                id: `pay-${p.id}`, date: p.date, type: p.paymentMethod === 'discount' ? 'خصم مكتسب' : 'سند دفع', typeId: p.id, debit: p.amount, credit: 0, view: 'supplierPayment', qtyPrice: ''
            }));
            transactions = [...invoiceTransactions, ...returnTransactions, ...paymentTransactions];
        }
        
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentBalance = dynamicOpeningBalance;
        const transactionRows: StatementRow[] = [];

        transactions.forEach((trans) => {
            currentBalance = currentBalance - trans.debit + trans.credit;
            transactionRows.push({
                ...trans,
                balance: currentBalance,
                docId: trans.typeId,
            });
        });
        
        const closingBalance = currentBalance;

        const rows: StatementRow[] = [
            { id: 'opening-balance', date: '', type: 'رصيد سابق / أول المدة', typeId: 0, debit: 0, credit: 0, balance: dynamicOpeningBalance, docId: 0, view: '' },
            ...transactionRows,
            { id: 'closing-balance', date: '', type: 'الرصيد النهائي في نهاية الفترة', typeId: 0, debit: 0, credit: 0, balance: closingBalance, docId: 0, view: '' }
        ];
        
        setStatementData({ rows, openingBalance: dynamicOpeningBalance, closingBalance, type });
    }, [suppliers, purchaseInvoices, purchaseReturns, supplierPayments, items, startDate, endDate]);

    useEffect(() => {
        if (preselectedSupplier !== null) {
            const supplier = suppliers.find(s => s.id === preselectedSupplier);
            if (supplier) setSupplierSearchQuery(supplier.name);
            setSelectedSupplierId(preselectedSupplier);
            generateStatement(preselectedSupplier, 'summary');
            onClearPreselectedSupplier();
        }
    }, [preselectedSupplier, onClearPreselectedSupplier, generateStatement, suppliers]);

    const handleSupplierSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSupplierSearchQuery(e.target.value);
        setIsSupplierSuggestionsOpen(true);
        if (e.target.value === '') setSelectedSupplierId(null);
    };

    const handleSupplierSelect = (supplier: Supplier) => {
        setSupplierSearchQuery(supplier.name);
        setSelectedSupplierId(supplier.id);
        setIsSupplierSuggestionsOpen(false);
    };

    const handleSearch = (type: 'summary' | 'detailed') => {
        if (!selectedSupplierId) { alert("يرجى اختيار مورد أولاً."); return; }
        generateStatement(selectedSupplierId, type);
    };

    const getSummaryValues = () => {
        if (!statementData) return { totalPurchases: 0, totalReturns: 0, netPurchases: 0, payments: 0, discounts: 0 };
        const transRows = statementData.rows.filter(r => r.id !== 'opening-balance' && r.id !== 'closing-balance');
        const totalPurchases = transRows.filter(r => r.view === 'purchaseInvoice' && r.credit > 0).reduce((sum, r) => sum + r.credit, 0);
        const totalReturns = transRows.filter(r => r.view === 'purchaseReturn' && r.debit > 0).reduce((sum, r) => sum + r.debit, 0);
        const netPurchases = totalPurchases - totalReturns;
        const discounts = transRows.filter(r => r.type.includes('خصم')).reduce((sum, r) => sum + r.debit, 0);
        const invoicePayments = transRows.filter(r => r.type.includes('سداد فاتورة')).reduce((sum, r) => sum + r.debit, 0);
        const standalonePayments = transRows.filter(r => r.view === 'supplierPayment' && !r.type.includes('خصم')).reduce((sum, r) => sum + r.debit, 0);
        return { totalPurchases, totalReturns, netPurchases, payments: invoicePayments + standalonePayments, discounts };
    };

    const handlePrint = () => {
        if (!statementData || !selectedSupplierId) return;
        const supplier = suppliers.find(c => c.id === selectedSupplierId);
        if (!supplier) return;

        const { totalPurchases, totalReturns, netPurchases, payments, discounts } = getSummaryValues();

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const headers = ['م', 'رقم المستند', 'التاريخ', 'البيان', ...(statementData.type === 'detailed' ? ['الكمية * السعر'] : []), 'مدين (له)', 'دائن (عليه)', 'الرصيد'];

        const rowsHtml = statementData.rows.map((row, index) => {
            const isSummaryRow = row.id === 'opening-balance' || row.id === 'closing-balance';
            const dateCell = row.date ? new Date(row.date).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
            return `
                <tr class="${isSummaryRow ? 'bg-gray-100 font-black' : ''}">
                    <td>${isSummaryRow ? '-' : index}</td>
                    <td>${row.docId !== 0 ? row.docId : '-'}</td>
                    <td class="whitespace-nowrap">${dateCell}</td>
                    <td class="text-right">${row.type}</td>
                    ${statementData.type === 'detailed' ? `<td>${row.qtyPrice || '-'}</td>` : ''}
                    <td class="text-green">${row.debit > 0 ? row.debit.toFixed(2) : '-'}</td>
                    <td class="text-red">${row.credit > 0 ? row.credit.toFixed(2) : '-'}</td>
                    <td class="font-black">${row.balance.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        const summaryHtml = `
            <div class="w-full mt-4">
                <div class="summary-item"><span>رصيد سابق:</span><span>${statementData.openingBalance.toFixed(2)}</span></div>
                <div class="summary-item"><span>إجمالي المشتريات:</span><span class="text-red">${totalPurchases.toFixed(2)}</span></div>
                <div class="summary-item"><span>إجمالي المرتجعات:</span><span class="text-green">-${totalReturns.toFixed(2)}</span></div>
                <div class="summary-item"><span>المدفوعات:</span><span class="text-indigo">-${payments.toFixed(2)}</span></div>
                <div class="summary-item"><span>خصم مكتسب:</span><span class="text-orange">-${discounts.toFixed(2)}</span></div>
                <div class="summary-item font-black text-lg border-t-2 border-green pt-2">
                    <span>الرصيد النهائي:</span>
                    <span class="${statementData.closingBalance > 0 ? 'text-red' : 'text-green'}">${statementData.closingBalance.toFixed(2)}</span>
                </div>
            </div>
        `;

        const subtitle = `كشف حساب مورد: ${supplier.name} | الفترة: ${startDate ? formatDateForDisplay(startDate) : 'البداية'} إلى ${endDate ? formatDateForDisplay(endDate) : 'الآن'}`;
        const title = `كشف حساب مورد ${statementData.type === 'detailed' ? '(تفصيلي)' : '(إجمالي)'}`;

        printWindow.document.write(getReportPrintTemplate(title, subtitle, companyData, headers, rowsHtml, summaryHtml));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    const summaryData = useMemo(() => getSummaryValues(), [statementData]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">كشف حساب مورد</h1>
            
            <div className={`${cardClass} relative z-10`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 relative">
                        <label className={labelClass} htmlFor="supplier-search">اختر المورد</label>
                         <div className="relative">
                            <input
                                id="supplier-search"
                                type="text"
                                className={inputClass}
                                value={supplierSearchQuery}
                                onChange={handleSupplierSearchChange}
                                onFocus={() => setIsSupplierSuggestionsOpen(true)}
                                onBlur={() => {
                                    setTimeout(() => {
                                        if (isSupplierSuggestionsOpen && suggestedSuppliers.length > 0 && supplierSearchQuery) {
                                            handleSupplierSelect(suggestedSuppliers[0]);
                                        }
                                        setIsSupplierSuggestionsOpen(false);
                                    }, 200);
                                }}
                                placeholder="-- ابحث أو اختر مورد --"
                                autoComplete="off"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDownIcon />
                            </div>
                        </div>
                        {isSupplierSuggestionsOpen && (
                            <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg top-full">
                                {suggestedSuppliers.length > 0 ? (
                                    suggestedSuppliers.map(supplier => (
                                        <li
                                            key={supplier.id}
                                            onMouseDown={() => handleSupplierSelect(supplier)}
                                            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-200 font-bold border-b last:border-0"
                                        >
                                            {supplier.name}
                                        </li>
                                    ))
                                ) : (
                                    <li className="p-3 text-center text-gray-500">لا يوجد موردون مطابقون</li>
                                )}
                            </ul>
                        )}
                    </div>
                    <div>
                        <label className={labelClass}>من تاريخ</label>
                        <input type="text" {...startDateInputProps} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>إلى تاريخ</label>
                        <input type="text" {...endDateInputProps} className={inputClass} />
                    </div>
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={() => handleSearch('summary')} className="flex-1 bg-blue-600 text-white font-bold py-3 px-2 rounded-lg shadow-lg hover:bg-blue-700 transition-all text-sm">
                        كشف إجمالي
                    </button>
                    <button onClick={() => handleSearch('detailed')} className="flex-1 bg-purple-600 text-white font-bold py-3 px-2 rounded-lg shadow-lg hover:bg-purple-700 transition-all text-sm">
                        كشف تفصيلي
                    </button>
                </div>
                 {statementData && (
                    <div className="mt-6 flex space-x-2 space-x-reverse border-t border-gray-300 dark:border-gray-600 pt-4">
                        <button onClick={() => {}} className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700">
                            <WhatsAppIcon /> <span className="mr-2">إرسال واتساب</span>
                        </button>
                        <button onClick={handlePrint} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
                            <PrintIcon /> <span className="mr-2">طباعة</span>
                        </button>
                    </div>
                )}
            </div>

            {statementData && (
                <div className={cardClass}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-300 dark:border-gray-600">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                                كشف حساب: {suppliers.find(s => s.id === selectedSupplierId)?.name}
                            </h2>
                            <p className="text-sm text-gray-500 font-bold">{statementData.type === 'detailed' ? '(تفصيلي)' : '(إجمالي)'}</p>
                            <p className="text-sm text-gray-500 mt-1">الفترة: {startDate ? formatDateForDisplay(startDate) : 'البداية'} إلى {endDate ? formatDateForDisplay(endDate) : 'الآن'}</p>
                        </div>
                        <div className="text-left">
                            <p className="text-gray-600 dark:text-gray-400">رصيد أول المدة: <span className="font-bold"><FormattedNumber value={statementData.openingBalance} /></span></p>
                            <p className="text-gray-800 dark:text-gray-200 font-bold text-lg">الرصيد النهائي: <span className={statementData.closingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}><FormattedNumber value={statementData.closingBalance} /></span></p>
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[60vh]">
                        <table className="w-full text-right">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-800">
                                    {['م', 'رقم المستند', 'التاريخ', 'البيان', ...(statementData.type === 'detailed' ? ['الكمية * السعر'] : []), 'مدين (له)', 'دائن (عليه)', 'الرصيد', 'عرض'].map(h => <th key={h} className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {statementData.rows.map((row, index) => {
                                     const isSummaryRow = row.id === 'opening-balance' || row.id === 'closing-balance';
                                     const sequenceNumber = isSummaryRow ? '-' : index;
                                     return (
                                        <tr key={row.id} className={`border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5 ${isSummaryRow ? 'bg-gray-100 dark:bg-gray-800 font-bold' : ''}`}>
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{sequenceNumber}</td>
                                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{row.docId !== 0 ? row.docId : '-'}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{row.date ? new Date(row.date).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{row.type}</td>
                                            {statementData.type === 'detailed' && <td className="p-3 text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap">{row.qtyPrice || '-'}</td>}
                                            <td className="p-3 font-semibold text-green-600 dark:text-green-400"><FormattedNumber value={row.debit > 0 ? row.debit : 0} /></td>
                                            <td className="p-3 font-semibold text-red-600 dark:text-red-400"><FormattedNumber value={row.credit > 0 ? row.credit : 0} /></td>
                                            <td className="p-3 font-bold text-gray-800 dark:text-gray-200"><FormattedNumber value={row.balance} /></td>
                                            <td className="p-3">
                                                 {row.view && (
                                                    <button onClick={() => onViewDoc(row.view, row.docId)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" title="عرض المستند الأصلي">
                                                        <ViewIcon />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierStatement;