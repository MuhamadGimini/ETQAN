import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Customer, SalesInvoice, SalesReturn, CustomerReceipt, CompanyData, Item, DefaultValues } from '../types';
import { ViewIcon, PrintIcon, PdfIcon, FormattedNumber, ChevronDownIcon, WhatsAppIcon } from './Shared';
import { formatNumberWithSmallerDecimals, formatNumber, formatPhoneNumberForWhatsApp, formatDateForDisplay } from '../utils';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';

interface CustomerStatementProps {
    customers: Customer[];
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    customerReceipts: CustomerReceipt[];
    items: Item[];
    onViewDoc: (view: string, docId: number | string) => void;
    companyData: CompanyData;
    preselectedCustomer: number | null;
    onClearPreselectedCustomer: () => void;
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

const CustomerStatement: React.FC<CustomerStatementProps> = ({ 
    customers, salesInvoices, salesReturns, customerReceipts, items, onViewDoc, companyData,
    preselectedCustomer, onClearPreselectedCustomer, defaultValues
}) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(preselectedCustomer);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [isCustomerSuggestionsOpen, setIsCustomerSuggestionsOpen] = useState(false);
    
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const startDateInputProps = useDateInput(startDate, setStartDate);
    const endDateInputProps = useDateInput(endDate, setEndDate);

    const [statementData, setStatementData] = useState<{ rows: StatementRow[], openingBalance: number, closingBalance: number, type: 'summary' | 'detailed' } | null>(null);

    const generateStatement = useCallback((customerId: number | null, type: 'summary' | 'detailed') => {
        if (!customerId) {
            setStatementData(null);
            return;
        }

        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        let dynamicOpeningBalance = customer.openingBalance;

        const isBeforeStart = (dateStr: string) => {
            if (!startDate) return false;
            return dateStr < startDate;
        };

        const isInRange = (dateStr: string) => {
            if (startDate && dateStr < startDate) return false;
            if (endDate && dateStr > endDate) return false;
            return true;
        };

        const customerInvoices = salesInvoices.filter(inv => inv.customerId === customerId);
        const customerReturns = salesReturns.filter(ret => ret.customerId === customerId);
        const customerReceiptsData = customerReceipts.filter(rec => rec.customerId === customerId);

        customerInvoices.forEach(inv => {
            if (isBeforeStart(inv.date)) {
                const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                dynamicOpeningBalance += total; 
                if (inv.paidAmount > 0) {
                    dynamicOpeningBalance -= inv.paidAmount; 
                }
            }
        });

        customerReturns.forEach(ret => {
            if (isBeforeStart(ret.date)) {
                const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                dynamicOpeningBalance -= total; 
                if (ret.paidAmount > 0) {
                    dynamicOpeningBalance += ret.paidAmount;
                }
            }
        });

        customerReceiptsData.forEach(rec => {
            if (isBeforeStart(rec.date)) {
                dynamicOpeningBalance -= rec.amount;
            }
        });

        let transactions: { id: string; date: string; type: string; typeId: number | string; debit: number; credit: number; view: string; qtyPrice?: string; quantity?: number; price?: number }[] = [];

        const invoicesInRange = customerInvoices.filter(inv => isInRange(inv.date));
        const returnsInRange = customerReturns.filter(ret => isInRange(ret.date));
        const receiptsInRange = customerReceiptsData.filter(rec => isInRange(rec.date));

        if (type === 'summary') {
            const invoiceTransactions = invoicesInRange.flatMap(inv => {
                const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                const entries: typeof transactions = [{ id: `inv-${inv.id}`, date: inv.date, type: 'فاتورة مبيعات', typeId: inv.id, debit: total, credit: 0, view: 'salesInvoice' }];
                if (inv.paidAmount > 0) {
                    entries.push({ id: `inv-pay-${inv.id}`, date: inv.date, type: `سداد فاتورة مبيعات رقم ${inv.id}`, typeId: inv.id, debit: 0, credit: inv.paidAmount, view: 'salesInvoice' });
                }
                return entries;
            });

            const returnTransactions = returnsInRange.flatMap(ret => {
                const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                const entries: typeof transactions = [{ id: `ret-${ret.id}`, date: ret.date, type: 'مرتجع مبيعات', typeId: ret.id, debit: 0, credit: total, view: 'salesReturn' }];
                if (ret.paidAmount > 0) {
                    entries.push({ id: `ret-pay-${ret.id}`, date: ret.date, type: `استرداد نقدية لمرتجع رقم ${ret.id}`, typeId: ret.id, debit: ret.paidAmount, credit: 0, view: 'salesReturn' });
                }
                return entries;
            });

            const receiptTransactions = receiptsInRange.map(rec => ({
                id: `rec-${rec.id}`, date: rec.date, type: rec.paymentMethod === 'discount' ? 'خصم مسموح به' : 'سند قبض', typeId: rec.id, debit: 0, credit: rec.amount, view: 'customerReceipt'
            }));

            transactions = [...invoiceTransactions, ...returnTransactions, ...receiptTransactions];

        } else { 
             const invoiceTransactions = invoicesInRange.flatMap(inv => {
                const itemRows: typeof transactions = inv.items.map((item, idx) => {
                    const itemData = items.find(i => i.id === item.itemId);
                    const lineTotal = item.price * item.quantity;
                    return { id: `inv-${inv.id}-item-${idx}`, date: inv.date, type: `فاتورة ${inv.id}: ${itemData?.name || 'صنف'}`, typeId: inv.id, debit: lineTotal, credit: 0, view: 'salesInvoice', qtyPrice: `${item.quantity} * ${item.price}`, quantity: item.quantity, price: item.price };
                });
                
                const itemsTotal = inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
                
                if (inv.discount > 0) {
                    itemRows.push({ id: `inv-${inv.id}-disc`, date: inv.date, type: `فاتورة ${inv.id}: خصم`, typeId: inv.id, debit: 0, credit: inv.discount, view: 'salesInvoice' });
                }

                const netAfterDiscount = itemsTotal - inv.discount;
                const taxAmount = netAfterDiscount * (inv.tax / 100);
                if (taxAmount > 0) {
                    itemRows.push({ id: `inv-${inv.id}-tax`, date: inv.date, type: `فاتورة ${inv.id}: ضريبة (${inv.tax}%)`, typeId: inv.id, debit: taxAmount, credit: 0, view: 'salesInvoice' });
                }

                if (inv.paidAmount > 0) {
                    itemRows.push({ id: `inv-pay-${inv.id}`, date: inv.date, type: `سداد فاتورة مبيعات رقم ${inv.id}`, typeId: inv.id, debit: 0, credit: inv.paidAmount, view: 'salesInvoice' });
                }
                return itemRows;
            });
             
             const returnTransactions = returnsInRange.flatMap(ret => {
                const itemRows: typeof transactions = ret.items.map((item, idx) => {
                    const itemData = items.find(i => i.id === item.itemId);
                    const lineTotal = item.price * item.quantity;
                    return { id: `ret-${ret.id}-item-${idx}`, date: ret.date, type: `مرتجع ${ret.id}: ${itemData?.name || 'صنف'}`, typeId: ret.id, debit: 0, credit: lineTotal, view: 'salesReturn', qtyPrice: `${item.quantity} * ${item.price}`, quantity: item.quantity, price: item.price };
                });

                const itemsTotal = ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0);

                if (ret.discount > 0) {
                    itemRows.push({ id: `ret-${ret.id}-disc`, date: ret.date, type: `مرتجع ${ret.id}: خصم`, typeId: ret.id, debit: ret.discount, credit: 0, view: 'salesReturn' });
                }

                const netAfterDiscount = itemsTotal - ret.discount;
                const taxAmount = netAfterDiscount * (ret.tax / 100);
                if (taxAmount > 0) {
                    itemRows.push({ id: `ret-${ret.id}-tax`, date: ret.date, type: `مرتجع ${ret.id}: ضريبة (${ret.tax}%)`, typeId: ret.id, debit: 0, credit: taxAmount, view: 'salesReturn' });
                }

                if (ret.paidAmount > 0) {
                    itemRows.push({ id: `ret-pay-${ret.id}`, date: ret.date, type: `استرداد نقدية لمرتجع رقم ${ret.id}`, typeId: ret.id, debit: ret.paidAmount, credit: 0, view: 'salesReturn' });
                }
                return itemRows;
            });

            const receiptTransactions = receiptsInRange.map(rec => ({
                id: `rec-${rec.id}`, date: rec.date, type: rec.paymentMethod === 'discount' ? 'خصم مسموح به' : 'سند قبض', typeId: rec.id, debit: 0, credit: rec.amount, view: 'customerReceipt'
            }));

            transactions = [...invoiceTransactions, ...returnTransactions, ...receiptTransactions];
        }
        
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentBalance = dynamicOpeningBalance;
        const transactionRows: StatementRow[] = [];

        transactions.forEach((trans) => {
            currentBalance = currentBalance + trans.debit - trans.credit;
            transactionRows.push({
                ...trans,
                balance: currentBalance,
                docId: trans.typeId,
            });
        });
        
        const closingBalance = currentBalance;

        const rows: StatementRow[] = [
            { id: 'opening-balance', date: '', type: 'رصيد سابق / أول المدة', typeId: 0, debit: 0, credit: 0, balance: dynamicOpeningBalance, docId: 0, view: '', qtyPrice: '' },
            ...transactionRows,
            { id: 'closing-balance', date: '', type: 'الرصيد النهائي في نهاية الفترة', typeId: 0, debit: 0, credit: 0, balance: closingBalance, docId: 0, view: '', qtyPrice: '' }
        ];
        
        setStatementData({ rows, openingBalance: dynamicOpeningBalance, closingBalance, type });
    }, [customers, salesInvoices, salesReturns, customerReceipts, items, startDate, endDate]);

    useEffect(() => {
        if (preselectedCustomer !== null) {
            const customer = customers.find(c => c.id === preselectedCustomer);
            if (customer) {
                setCustomerSearchQuery(customer.name);
            }
            setSelectedCustomerId(preselectedCustomer);
            generateStatement(preselectedCustomer, 'summary');
            onClearPreselectedCustomer();
        }
    }, [preselectedCustomer, customers, generateStatement, onClearPreselectedCustomer]);

    const suggestedCustomers = useMemo(() => {
        if (!customerSearchQuery) {
            return customers;
        }
        const lowercasedQuery = customerSearchQuery.toLowerCase();
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(lowercasedQuery) ||
            (customer.phone && customer.phone.includes(lowercasedQuery))
        );
    }, [customerSearchQuery, customers]);

    const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomerSearchQuery(e.target.value);
        setIsCustomerSuggestionsOpen(true);
        if (e.target.value === '') {
            setSelectedCustomerId(null);
        }
    };

    const handleCustomerSelect = (customer: Customer) => {
        setCustomerSearchQuery(customer.name);
        setSelectedCustomerId(customer.id);
        setIsCustomerSuggestionsOpen(false);
    };

    const handleSearch = (type: 'summary' | 'detailed') => {
        if (!selectedCustomerId) {
            alert("يرجى اختيار عميل أولاً.");
            return;
        }
        generateStatement(selectedCustomerId, type);
    };
    
    const getSummaryValues = () => {
        if (!statementData) return { totalSales: 0, totalReturns: 0, netSales: 0, payments: 0, discounts: 0 };
        const transRows = statementData.rows.filter(r => r.id !== 'opening-balance' && r.id !== 'closing-balance');
        
        const totalSales = transRows.filter(r => r.view === 'salesInvoice' && r.debit > 0).reduce((sum, r) => sum + r.debit, 0);
        const totalReturns = transRows.filter(r => r.view === 'salesReturn' && r.credit > 0).reduce((sum, r) => sum + r.credit, 0);
        const netSales = totalSales - totalReturns;

        const discounts = transRows
            .filter(r => (r.view === 'customerReceipt' || r.view === 'salesInvoice') && r.type.includes('خصم'))
            .reduce((sum, r) => sum + r.credit, 0);

        const totalCredits = transRows.reduce((sum, r) => sum + r.credit, 0);
        const refunds = transRows.filter(r => r.view === 'salesReturn' && r.debit > 0 && !r.type.includes('خصم')).reduce((sum, r) => sum + r.debit, 0);
        const payments = (totalCredits - totalReturns - discounts) - refunds;

        return { totalSales, totalReturns, netSales, payments, discounts };
    };

    const handleSendWhatsApp = () => {
        if (!statementData || !selectedCustomerId) return;
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer || !customer.phone) {
            alert('لا يوجد رقم هاتف مسجل لهذا العميل.');
            return;
        }
        const formattedPhone = formatPhoneNumberForWhatsApp(customer.phone);
        const summary = getSummaryValues();

        const message = `*كشف حساب عميل*
السادة: ${customer.name}
الفترة: ${startDate ? formatDateForDisplay(startDate) : 'البداية'} إلى ${endDate ? formatDateForDisplay(endDate) : 'الآن'}
------------------
رصيد سابق: ${formatNumber(statementData.openingBalance)}
إجمالي المبيعات: ${formatNumber(summary.totalSales)}
إجمالي المرتجعات: ${formatNumber(summary.totalReturns)}
صافي المبيعات: ${formatNumber(summary.netSales)}
------------------
المدفوعات: ${formatNumber(summary.payments)}
الخصم المسموح به: ${formatNumber(summary.discounts)}
------------------
*الرصيد النهائي (المستحق): ${formatNumber(statementData.closingBalance)}*
------------------
${defaultValues.whatsappFooter}`;

        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handlePrint = () => {
        if (!statementData || !selectedCustomerId) return;
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) return;

        const { totalSales, totalReturns, netSales, payments, discounts } = getSummaryValues();

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the report.');
            return;
        }

        const headers = ['م', 'رقم المستند', 'التاريخ', 'البيان', ...(statementData.type === 'detailed' ? ['الكمية * السعر'] : []), 'مدين', 'دائن', 'الرصيد'];

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
                <div class="summary-item"><span>إجمالي المبيعات:</span><span class="text-indigo">${totalSales.toFixed(2)}</span></div>
                <div class="summary-item"><span>إجمالي المرتجعات:</span><span class="text-red">-${totalReturns.toFixed(2)}</span></div>
                <div class="summary-item"><span>المدفوعات:</span><span class="text-green">-${payments.toFixed(2)}</span></div>
                <div class="summary-item"><span>الخصم المسموح:</span><span class="text-orange">-${discounts.toFixed(2)}</span></div>
                <div class="summary-item font-black text-lg border-t-2 border-indigo pt-2">
                    <span>الرصيد النهائي:</span>
                    <span class="${statementData.closingBalance >= 0 ? 'text-green' : 'text-red'}">${statementData.closingBalance.toFixed(2)}</span>
                </div>
            </div>
        `;

        const subtitle = `كشف حساب عميل: ${customer.name} | الفترة: ${startDate ? formatDateForDisplay(startDate) : 'البداية'} إلى ${endDate ? formatDateForDisplay(endDate) : 'الآن'}`;
        const title = `كشف حساب عميل ${statementData.type === 'detailed' ? '(تفصيلي)' : '(إجمالي)'}`;

        printWindow.document.write(getReportPrintTemplate(title, subtitle, companyData, headers, rowsHtml, summaryHtml));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    const summaryData = useMemo(() => getSummaryValues(), [statementData]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">كشف حساب عميل</h1>
            <div className={`${cardClass} relative z-10`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 relative">
                        <label className={labelClass} htmlFor="customer-search">اختر العميل</label>
                         <div className="relative">
                            <input
                                id="customer-search"
                                type="text"
                                className={inputClass}
                                value={customerSearchQuery}
                                onChange={handleCustomerSearchChange}
                                onFocus={() => setIsCustomerSuggestionsOpen(true)}
                                onBlur={() => setTimeout(() => setIsCustomerSuggestionsOpen(false), 200)}
                                placeholder="-- ابحث أو اختر عميل --"
                                autoComplete="off"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                        </div>
                        {isCustomerSuggestionsOpen && (
                            <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg top-full">
                                {suggestedCustomers.length > 0 ? suggestedCustomers.map(customer => (<li key={customer.id} onMouseDown={() => handleCustomerSelect(customer)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-200 font-bold border-b last:border-0">{customer.name}</li>)) : <li className="p-3 text-center text-gray-500">لا يوجد عملاء مطابقون</li>}
                            </ul>
                        )}
                    </div>
                    <div><label className={labelClass}>من تاريخ</label><input type="text" {...startDateInputProps} className={inputClass} /></div>
                    <div><label className={labelClass}>إلى تاريخ</label><input type="text" {...endDateInputProps} className={inputClass} /></div>
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={() => handleSearch('summary')} className="flex-1 bg-blue-600 text-white font-bold py-3 px-2 rounded-lg shadow-lg hover:bg-blue-700 transition-all">كشف إجمالي</button>
                    <button onClick={() => handleSearch('detailed')} className="flex-1 bg-purple-600 text-white font-bold py-3 px-2 rounded-lg shadow-lg hover:bg-purple-700 transition-all">كشف تفصيلي</button>
                </div>
                 {statementData && (
                    <div className="mt-6 flex space-x-2 space-x-reverse border-t border-gray-300 dark:border-gray-600 pt-4">
                        <button onClick={handleSendWhatsApp} className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700"><WhatsAppIcon /> <span className="mr-2">إرسال واتساب</span></button>
                        <button onClick={handlePrint} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700"><PrintIcon /> <span className="mr-2">طباعة</span></button>
                    </div>
                )}
            </div>

            {statementData && (
                <div className={cardClass}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b">
                        <div>
                            <h2 className="text-2xl font-bold">كشف حساب: {customers.find(c => c.id === selectedCustomerId)?.name}</h2>
                            <p className="text-sm text-gray-500 font-bold">{statementData.type === 'detailed' ? '(تفصيلي)' : '(إجمالي)'}</p>
                            <p className="text-sm text-gray-500 mt-1">الفترة: {startDate || 'البداية'} إلى {endDate || 'الآن'}</p>
                        </div>
                        <div className="text-left">
                            <p className="text-gray-600">رصيد سابق: <span className="font-bold"><FormattedNumber value={statementData.openingBalance} /></span></p>
                            <p className="text-gray-800 font-bold text-lg">الرصيد النهائي: <span className={statementData.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}><FormattedNumber value={statementData.closingBalance} /></span></p>
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[60vh]">
                        <table className="w-full text-right mb-6">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b-2 border-gray-300 bg-gray-200 dark:bg-gray-800"><th className="p-3">م</th><th className="p-3">رقم المستند</th><th className="p-3">التاريخ</th><th className="p-3">البيان</th>{statementData.type === 'detailed' && <th className="p-3">الكمية * السعر</th>}<th className="p-3">مدين</th><th className="p-3">دائن</th><th className="p-3">الرصيد</th><th className="p-3 text-center">عرض</th></tr>
                            </thead>
                            <tbody>
                                {statementData.rows.map((row, index) => {
                                     const isSummaryRow = row.id === 'opening-balance' || row.id === 'closing-balance';
                                     const sequenceNumber = isSummaryRow ? '-' : index;
                                     return (
                                        <tr key={row.id} className={`border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5 ${isSummaryRow ? 'bg-gray-100 dark:bg-gray-800 font-bold' : ''}`}>
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{sequenceNumber}</td>
                                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{row.docId !== 0 ? row.docId : '-'}</td>
                                            <td className="p-3 whitespace-nowrap">{row.date ? new Date(row.date).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                                            <td className="p-3">{row.type}</td>
                                            {statementData.type === 'detailed' && (
                                                <td className="p-3 text-sm whitespace-nowrap text-center font-bold">
                                                    {row.quantity !== undefined && row.price !== undefined ? `${row.quantity} * ${formatNumber(row.price)}` : (row.qtyPrice || '-')}
                                                </td>
                                            )}
                                            <td className="p-3 font-semibold text-green-600 dark:text-green-400"><FormattedNumber value={row.debit > 0 ? row.debit : 0} /></td>
                                            <td className="p-3 font-semibold text-red-600 dark:text-red-400"><FormattedNumber value={row.credit > 0 ? row.credit : 0} /></td>
                                            <td className="p-3 font-bold"><FormattedNumber value={row.balance} /></td>
                                            <td className="p-3 text-center">
                                                 {!isSummaryRow && row.view && (
                                                    <button onClick={() => onViewDoc(row.view, row.docId)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-full" title="عرض المستند الأصلي"><ViewIcon /></button>
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

export default CustomerStatement;