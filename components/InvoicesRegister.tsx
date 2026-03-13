
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SalesInvoice, PurchaseInvoice, SalesReturn, PurchaseReturn, Customer, Supplier } from '../types';

interface InvoicesRegisterProps {
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    salesReturns: SalesReturn[];
    purchaseReturns: PurchaseReturn[];
    customers: Customer[];
    suppliers: Supplier[];
}

interface InvoiceLogItem {
    id: string;
    date: string;
    type: string;
    amount: number;
    party: string;
    notes: string;
    originalType: 'sales' | 'purchase' | 'sales_return' | 'purchase_return';
}

const InvoicesRegister: React.FC<InvoicesRegisterProps> = ({
    salesInvoices,
    purchaseInvoices,
    salesReturns,
    purchaseReturns,
    customers,
    suppliers
}) => {
    const [invoices, setInvoices] = useState<InvoiceLogItem[]>([]);
    const [displayInvoices, setDisplayInvoices] = useState<InvoiceLogItem[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        let filteredSales = salesInvoices;
        let filteredPurchases = purchaseInvoices;
        let filteredSalesReturns = salesReturns;
        let filteredPurchaseReturns = purchaseReturns;

        if (startDate) {
            filteredSales = filteredSales.filter(inv => inv.date >= startDate);
            filteredPurchases = filteredPurchases.filter(inv => inv.date >= startDate);
            filteredSalesReturns = filteredSalesReturns.filter(ret => ret.date >= startDate);
            filteredPurchaseReturns = filteredPurchaseReturns.filter(ret => ret.date >= startDate);
        }
        if (endDate) {
            filteredSales = filteredSales.filter(inv => inv.date <= endDate);
            filteredPurchases = filteredPurchases.filter(inv => inv.date <= endDate);
            filteredSalesReturns = filteredSalesReturns.filter(ret => ret.date <= endDate);
            filteredPurchaseReturns = filteredPurchaseReturns.filter(ret => ret.date <= endDate);
        }

        const allInvoices: InvoiceLogItem[] = [
            ...filteredSales.map(inv => ({
                id: `s-${inv.id}`,
                date: inv.date,
                type: 'فاتورة مبيعات',
                amount: inv.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) - inv.discount + inv.tax,
                party: customers.find(c => c.id === inv.customerId)?.name || 'عميل غير معروف',
                notes: inv.notes,
                originalType: 'sales' as const
            })),
            ...filteredPurchases.map(inv => ({
                id: `p-${inv.id}`,
                date: inv.date,
                type: 'فاتورة مشتريات',
                amount: inv.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) - inv.discount + inv.tax,
                party: suppliers.find(s => s.id === inv.supplierId)?.name || 'مورد غير معروف',
                notes: inv.notes,
                originalType: 'purchase' as const
            })),
            ...filteredSalesReturns.map(ret => ({
                id: `sr-${ret.id}`,
                date: ret.date,
                type: 'مرتجع مبيعات',
                amount: ret.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) - ret.discount + ret.tax,
                party: customers.find(c => c.id === ret.customerId)?.name || 'عميل غير معروف',
                notes: ret.notes,
                originalType: 'sales_return' as const
            })),
            ...filteredPurchaseReturns.map(ret => ({
                id: `pr-${ret.id}`,
                date: ret.date,
                type: 'مرتجع مشتريات',
                amount: ret.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) - ret.discount + ret.tax,
                party: suppliers.find(s => s.id === ret.supplierId)?.name || 'مورد غير معروف',
                notes: ret.notes,
                originalType: 'purchase_return' as const
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setInvoices(allInvoices);
        setDisplayInvoices(allInvoices.slice(0, 20));
    }, [salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, customers, suppliers, startDate, endDate]);

    useEffect(() => {
        if (displayInvoices.length < 10) return;

        const interval = setInterval(() => {
            setDisplayInvoices(prev => {
                const next = [...prev];
                const first = next.shift();
                if (first) next.push(first);
                return next;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [displayInvoices.length]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">سجل الفواتير (عرض تلقائي)</h1>
                <div className="flex items-center gap-4 bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg border border-white/40">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">من:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="text-xs p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">إلى:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="text-xs p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        />
                    </div>
                    {(startDate || endDate) && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            className="text-xs text-red-500 hover:text-red-700 font-bold"
                        >
                            إلغاء
                        </button>
                    )}
                </div>
                <div className="bg-indigo-100 text-indigo-800 px-4 py-1 rounded-full text-sm font-bold animate-pulse">
                    تحديث تلقائي مفعل
                </div>
            </div>

            <div className={cardClass}>
                <div className="overflow-hidden relative h-[500px] border border-gray-200 dark:border-gray-600 rounded-lg flex flex-col">
                    <div className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-800 grid grid-cols-5 text-right font-bold p-3 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        <div>التاريخ</div>
                        <div>النوع</div>
                        <div>الطرف الآخر</div>
                        <div>الصافي</div>
                        <div>ملاحظات</div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                        <div className="flex flex-col">
                            <AnimatePresence initial={false}>
                                {displayInvoices.slice(0, 10).map((inv) => (
                                    <motion.div
                                        key={inv.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.5 }}
                                        className={`grid grid-cols-5 items-center p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                            inv.originalType === 'sales' ? 'text-blue-600 dark:text-blue-400' :
                                            inv.originalType === 'purchase' ? 'text-green-600 dark:text-green-400' :
                                            inv.originalType === 'sales_return' ? 'text-red-600 dark:text-red-400' :
                                            'text-orange-600 dark:text-orange-400'
                                        }`}
                                    >
                                        <div className="text-sm font-mono">{inv.date}</div>
                                        <div className="font-bold">{inv.type}</div>
                                        <div className="text-gray-700 dark:text-gray-300 truncate">{inv.party}</div>
                                        <div className="font-mono font-bold">{inv.amount.toFixed(2)}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{inv.notes || '-'}</div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400">فواتير المبيعات</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                            {invoices.filter(inv => inv.originalType === 'sales').length}
                        </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-600 dark:text-green-400">فواتير المشتريات</p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300">
                            {invoices.filter(inv => inv.originalType === 'purchase').length}
                        </p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-xs text-red-600 dark:text-red-400">مرتجعات المبيعات</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300">
                            {invoices.filter(inv => inv.originalType === 'sales_return').length}
                        </p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <p className="text-xs text-orange-600 dark:text-orange-400">مرتجعات المشتريات</p>
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                            {invoices.filter(inv => inv.originalType === 'purchase_return').length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400 italic">
                * يتم عرض آخر 10 فواتير بشكل دوري
            </div>
        </div>
    );
};

export default InvoicesRegister;
