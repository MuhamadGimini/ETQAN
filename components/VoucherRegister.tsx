
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CustomerReceipt, SupplierPayment, Expense, TreasuryTransfer, Customer, Supplier, ExpenseCategory, Treasury } from '../types';

interface VoucherRegisterProps {
    customerReceipts: CustomerReceipt[];
    supplierPayments: SupplierPayment[];
    expenses: Expense[];
    treasuryTransfers: TreasuryTransfer[];
    customers: Customer[];
    suppliers: Supplier[];
    expenseCategories: ExpenseCategory[];
    treasuries: Treasury[];
}

interface VoucherItem {
    id: string;
    date: string;
    type: string;
    amount: number;
    beneficiary: string;
    notes: string;
    originalType: 'receipt' | 'payment' | 'expense' | 'transfer';
}

const VoucherRegister: React.FC<VoucherRegisterProps> = ({
    customerReceipts,
    supplierPayments,
    expenses,
    treasuryTransfers,
    customers,
    suppliers,
    expenseCategories,
    treasuries
}) => {
    const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
    const [displayVouchers, setDisplayVouchers] = useState<VoucherItem[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let filteredReceipts = customerReceipts;
        let filteredPayments = supplierPayments;
        let filteredExpenses = expenses;
        let filteredTransfers = treasuryTransfers;

        if (startDate) {
            filteredReceipts = filteredReceipts.filter(r => r.date >= startDate);
            filteredPayments = filteredPayments.filter(p => p.date >= startDate);
            filteredExpenses = filteredExpenses.filter(e => e.date >= startDate);
            filteredTransfers = filteredTransfers.filter(t => t.date >= startDate);
        }
        if (endDate) {
            filteredReceipts = filteredReceipts.filter(r => r.date <= endDate);
            filteredPayments = filteredPayments.filter(p => p.date <= endDate);
            filteredExpenses = filteredExpenses.filter(e => e.date <= endDate);
            filteredTransfers = filteredTransfers.filter(t => t.date <= endDate);
        }

        const allVouchers: VoucherItem[] = [
            ...filteredReceipts.map(r => ({
                id: `r-${r.id}`,
                date: r.date,
                type: 'سند قبض عميل',
                amount: r.amount,
                beneficiary: customers.find(c => c.id === r.customerId)?.name || 'عميل غير معروف',
                notes: r.notes,
                originalType: 'receipt' as const
            })),
            ...filteredPayments.map(p => ({
                id: `p-${p.id}`,
                date: p.date,
                type: 'سند دفع مورد',
                amount: p.amount,
                beneficiary: suppliers.find(s => s.id === p.supplierId)?.name || 'مورد غير معروف',
                notes: p.notes,
                originalType: 'payment' as const
            })),
            ...filteredExpenses.map(e => ({
                id: `e-${e.id}`,
                date: e.date,
                type: 'مصروف',
                amount: e.amount,
                beneficiary: expenseCategories.find(c => c.id === e.categoryId)?.name || 'مصروف عام',
                notes: e.notes,
                originalType: 'expense' as const
            })),
            ...filteredTransfers.map(t => ({
                id: `t-${t.id}`,
                date: t.date,
                type: 'تحويل خزينة',
                amount: t.amount,
                beneficiary: `من ${treasuries.find(tr => tr.id === t.fromTreasuryId)?.name || '؟'} إلى ${treasuries.find(tr => tr.id === t.toTreasuryId)?.name || '؟'}`,
                notes: t.notes,
                originalType: 'transfer' as const
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setVouchers(allVouchers);
        setDisplayVouchers(allVouchers.slice(0, 20)); // Keep a buffer
    }, [customerReceipts, supplierPayments, expenses, treasuryTransfers, customers, suppliers, expenseCategories, treasuries, startDate, endDate]);

    // Auto-scroll logic
    useEffect(() => {
        if (displayVouchers.length < 10) return;

        const interval = setInterval(() => {
            setDisplayVouchers(prev => {
                const next = [...prev];
                const first = next.shift();
                if (first) next.push(first);
                return next;
            });
        }, 3000); // Scroll every 3 seconds

        return () => clearInterval(interval);
    }, [displayVouchers.length]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">سجل السندات (عرض تلقائي)</h1>
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
                <div className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-bold animate-pulse">
                    تحديث تلقائي مفعل
                </div>
            </div>

            <div className={cardClass}>
                <div className="overflow-hidden relative h-[500px] border border-gray-200 dark:border-gray-600 rounded-lg flex flex-col">
                    <div className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-800 grid grid-cols-5 text-right font-bold p-3 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        <div>التاريخ</div>
                        <div>النوع</div>
                        <div>البيان / المستفيد</div>
                        <div>المبلغ</div>
                        <div>ملاحظات</div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                        <div className="flex flex-col">
                            <AnimatePresence initial={false}>
                                {displayVouchers.slice(0, 10).map((voucher) => (
                                    <motion.div
                                        key={voucher.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.5 }}
                                        className={`grid grid-cols-5 items-center p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                            voucher.originalType === 'receipt' ? 'text-green-600 dark:text-green-400' :
                                            voucher.originalType === 'payment' ? 'text-red-600 dark:text-red-400' :
                                            voucher.originalType === 'expense' ? 'text-orange-600 dark:text-orange-400' :
                                            'text-blue-600 dark:text-blue-400'
                                        }`}
                                    >
                                        <div className="text-sm font-mono">{voucher.date}</div>
                                        <div className="font-bold">{voucher.type}</div>
                                        <div className="text-gray-700 dark:text-gray-300 truncate">{voucher.beneficiary}</div>
                                        <div className="font-mono font-bold">{voucher.amount.toFixed(2)}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{voucher.notes || '-'}</div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-600 dark:text-green-400">إجمالي المقبوضات</p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300">
                            {vouchers.filter(v => v.originalType === 'receipt').reduce((sum, v) => sum + v.amount, 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-xs text-red-600 dark:text-red-400">إجمالي المدفوعات</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300">
                            {vouchers.filter(v => v.originalType === 'payment').reduce((sum, v) => sum + v.amount, 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <p className="text-xs text-orange-600 dark:text-orange-400">إجمالي المصروفات</p>
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                            {vouchers.filter(v => v.originalType === 'expense').reduce((sum, v) => sum + v.amount, 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400">عدد الحركات</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                            {vouchers.length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400 italic">
                * يتم عرض آخر 10 حركات مالية بشكل دوري
            </div>
        </div>
    );
};

export default VoucherRegister;
