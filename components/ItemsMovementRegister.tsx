
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SalesInvoice, PurchaseInvoice, SalesReturn, PurchaseReturn, Item } from '../types';

interface ItemsMovementRegisterProps {
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    salesReturns: SalesReturn[];
    purchaseReturns: PurchaseReturn[];
    items: Item[];
}

interface ItemMovementLog {
    id: string;
    date: string;
    itemName: string;
    type: string;
    quantity: number;
    price: number;
    total: number;
    originalType: 'sales' | 'purchase' | 'sales_return' | 'purchase_return';
}

const ItemsMovementRegister: React.FC<ItemsMovementRegisterProps> = ({
    salesInvoices,
    purchaseInvoices,
    salesReturns,
    purchaseReturns,
    items
}) => {
    const [movements, setMovements] = useState<ItemMovementLog[]>([]);
    const [displayMovements, setDisplayMovements] = useState<ItemMovementLog[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const allMovements: ItemMovementLog[] = [];

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

        filteredSales.forEach(inv => {
            inv.items.forEach((it, idx) => {
                allMovements.push({
                    id: `s-${inv.id}-${idx}`,
                    date: inv.date,
                    itemName: items.find(i => i.id === it.itemId)?.name || 'صنف غير معروف',
                    type: 'بيع',
                    quantity: it.quantity,
                    price: it.price,
                    total: it.quantity * it.price,
                    originalType: 'sales'
                });
            });
        });

        filteredPurchases.forEach(inv => {
            inv.items.forEach((it, idx) => {
                allMovements.push({
                    id: `p-${inv.id}-${idx}`,
                    date: inv.date,
                    itemName: items.find(i => i.id === it.itemId)?.name || 'صنف غير معروف',
                    type: 'شراء',
                    quantity: it.quantity,
                    price: it.price,
                    total: it.quantity * it.price,
                    originalType: 'purchase'
                });
            });
        });

        filteredSalesReturns.forEach(ret => {
            ret.items.forEach((it, idx) => {
                allMovements.push({
                    id: `sr-${ret.id}-${idx}`,
                    date: ret.date,
                    itemName: items.find(i => i.id === it.itemId)?.name || 'صنف غير معروف',
                    type: 'مرتجع بيع',
                    quantity: it.quantity,
                    price: it.price,
                    total: it.quantity * it.price,
                    originalType: 'sales_return'
                });
            });
        });

        filteredPurchaseReturns.forEach(ret => {
            ret.items.forEach((it, idx) => {
                allMovements.push({
                    id: `pr-${ret.id}-${idx}`,
                    date: ret.date,
                    itemName: items.find(i => i.id === it.itemId)?.name || 'صنف غير معروف',
                    type: 'مرتجع شراء',
                    quantity: it.quantity,
                    price: it.price,
                    total: it.quantity * it.price,
                    originalType: 'purchase_return'
                });
            });
        });

        const sorted = allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMovements(sorted);
        setDisplayMovements(sorted.slice(0, 20));
    }, [salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, items, startDate, endDate]);

    useEffect(() => {
        if (displayMovements.length < 10) return;

        const interval = setInterval(() => {
            setDisplayMovements(prev => {
                const next = [...prev];
                const first = next.shift();
                if (first) next.push(first);
                return next;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [displayMovements.length]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">سجل حركة الأصناف (عرض تلقائي)</h1>
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
                <div className="bg-emerald-100 text-emerald-800 px-4 py-1 rounded-full text-sm font-bold animate-pulse">
                    تحديث تلقائي مفعل
                </div>
            </div>

            <div className={cardClass}>
                <div className="overflow-hidden relative h-[500px] border border-gray-200 dark:border-gray-600 rounded-lg flex flex-col">
                    <div className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-800 grid grid-cols-6 text-right font-bold p-3 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        <div>التاريخ</div>
                        <div className="col-span-2">اسم الصنف</div>
                        <div>النوع</div>
                        <div>الكمية</div>
                        <div>الإجمالي</div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                        <div className="flex flex-col">
                            <AnimatePresence initial={false}>
                                {displayMovements.slice(0, 10).map((mov) => (
                                    <motion.div
                                        key={mov.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.5 }}
                                        className={`grid grid-cols-6 items-center p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                            mov.originalType === 'sales' ? 'text-blue-600 dark:text-blue-400' :
                                            mov.originalType === 'purchase' ? 'text-green-600 dark:text-green-400' :
                                            mov.originalType === 'sales_return' ? 'text-red-600 dark:text-red-400' :
                                            'text-orange-600 dark:text-orange-400'
                                        }`}
                                    >
                                        <div className="text-sm font-mono">{mov.date}</div>
                                        <div className="col-span-2 text-gray-700 dark:text-gray-300 truncate font-bold">{mov.itemName}</div>
                                        <div className="font-bold">{mov.type}</div>
                                        <div className="font-mono font-bold">{mov.quantity}</div>
                                        <div className="font-mono font-bold">{mov.total.toFixed(2)}</div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400">إجمالي كمية المبيعات</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                            {movements.filter(m => m.originalType === 'sales').reduce((sum, m) => sum + m.quantity, 0)}
                        </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-600 dark:text-green-400">إجمالي كمية المشتريات</p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300">
                            {movements.filter(m => m.originalType === 'purchase').reduce((sum, m) => sum + m.quantity, 0)}
                        </p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-xs text-red-600 dark:text-red-400">إجمالي كمية المرتجعات</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300">
                            {movements.filter(m => m.originalType.includes('return')).reduce((sum, m) => sum + m.quantity, 0)}
                        </p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">عدد الحركات</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                            {movements.length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400 italic">
                * يتم عرض آخر 10 حركات أصناف بشكل دوري
            </div>
        </div>
    );
};

export default ItemsMovementRegister;
