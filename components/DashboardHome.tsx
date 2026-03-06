
import React, { useMemo, useState } from 'react';
import { PlusCircleIcon, SwitchHorizontalIcon, FormattedNumber, ChevronDownIcon } from './Shared';
import Clock from './Clock';
import type { SalesInvoice, PurchaseInvoice, Customer, Item, Expense, Supplier, SalesReturn, PurchaseReturn, CustomerReceipt, SupplierPayment, Treasury, TreasuryTransfer, ExpenseCategory, Warehouse, DefaultValues } from '../types';
import { searchMatch } from '../utils';

interface DashboardHomeProps {
    setCurrentView: (view: string) => void;
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    customers: Customer[];
    customerReceipts: CustomerReceipt[];
    items: Item[];
    expenses: Expense[];
    expenseCategories: ExpenseCategory[];
    suppliers: Supplier[];
    supplierPayments: SupplierPayment[];
    treasuries: Treasury[];
    treasuryTransfers: TreasuryTransfer[];
    warehouses?: Warehouse[];
    defaultValues: DefaultValues;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ 
    setCurrentView, 
    salesInvoices = [], 
    salesReturns = [], 
    purchaseInvoices = [], 
    purchaseReturns = [], 
    customers = [], 
    customerReceipts = [], 
    items = [], 
    expenses = [], 
    expenseCategories = [], 
    suppliers = [], 
    supplierPayments = [], 
    treasuries = [], 
    treasuryTransfers = [], 
    warehouses = [],
    defaultValues
}) => {

    // --- Quick Lookup States ---
    const [itemQuery, setItemQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);
    
    const [customerQuery, setCustomerQuery] = useState('');
    const [isCustomerSuggestionsOpen, setIsCustomerSuggestionsOpen] = useState(false);
    
    const [supplierQuery, setSupplierQuery] = useState('');
    const [isSupplierSuggestionsOpen, setIsSupplierSuggestionsOpen] = useState(false);
    
    const [selectedTreasuryId, setSelectedTreasuryId] = useState<number>(0);

    const [foundItem, setFoundItem] = useState<Item | null>(null);
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [foundSupplier, setFoundSupplier] = useState<Supplier | null>(null);

    // --- Calculations for KPI Cards ---
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const getTotals = () => {
        const calculateInvoiceTotal = (inv: SalesInvoice | PurchaseInvoice | SalesReturn | PurchaseReturn) => {
            if (!inv || !inv.items) return 0;
            const itemsTotal = (inv.items as any[]).reduce((s: number, i: any) => s + (i.price || 0) * (i.quantity || 0), 0);
            return (itemsTotal - (inv.discount || 0)) * (1 + (inv.tax || 0) / 100);
        };

        // Sales (Revenue) - Net Monthly
        const salesMonth = salesInvoices
            .filter(inv => {
                const d = new Date(inv.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, inv) => sum + calculateInvoiceTotal(inv), 0);
        
        const salesLastMonth = salesInvoices
            .filter(inv => {
                const d = new Date(inv.date);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            })
            .reduce((sum, inv) => sum + calculateInvoiceTotal(inv), 0);

        const salesToday = salesInvoices
            .filter(inv => inv.date.startsWith(today))
            .reduce((sum, inv) => sum + calculateInvoiceTotal(inv), 0);

        // Purchases - Monthly
        const purchasesMonth = purchaseInvoices
            .filter(inv => {
                const d = new Date(inv.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, inv) => sum + calculateInvoiceTotal(inv), 0);

        const purchasesLastMonth = purchaseInvoices
            .filter(inv => {
                const d = new Date(inv.date);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            })
            .reduce((sum, inv) => sum + calculateInvoiceTotal(inv), 0);

        // Expenses - Monthly
        const expensesMonth = expenses
            .filter(exp => {
                const d = new Date(exp.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // --- Net Cash Flow Calculation (User Formula) ---
        // Formula: (Cash Sales + Customer Receipt + Cash Purchase Return) - (Cash Purchase + Supplier Payment + Cash Sales Return + Expenses)
        
        const cashInMonth = 
            // 1. مبيعات كاش (المقدم المدفوع في فواتير المبيعات)
            salesInvoices.filter(i => new Date(i.date).getMonth() === currentMonth && new Date(i.date).getFullYear() === currentYear)
                .reduce((sum, i) => sum + (i.paidAmount || 0), 0) +
            // 2. سندات قبض من عملاء (كاش أو شيك فقط، استبعاد الخصم المسموح به)
            customerReceipts.filter(r => new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear && ['cash', 'check'].includes(r.paymentMethod))
                .reduce((sum, r) => sum + (r.amount || 0), 0) +
            // 3. مرتجع مشتريات نقدي (المبالغ المستردة من الموردين)
            purchaseReturns.filter(r => new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear)
                .reduce((sum, r) => sum + (r.paidAmount || 0), 0);

        const cashOutMonth = 
            // 1. مشتريات نقدي (المقدم المدفوع في فواتير المشتريات)
            purchaseInvoices.filter(i => new Date(i.date).getMonth() === currentMonth && new Date(i.date).getFullYear() === currentYear)
                .reduce((sum, i) => sum + (i.paidAmount || 0), 0) +
            // 2. سندات دفع لموردين (كاش أو شيك فقط، استبعاد الخصم المكتسب)
            supplierPayments.filter(p => new Date(p.date).getMonth() === currentMonth && new Date(p.date).getFullYear() === currentYear && ['cash', 'check'].includes(p.paymentMethod))
                .reduce((sum, p) => sum + (p.amount || 0), 0) +
            // 3. مرتجع مبيعات نقدي (المبالغ المدفوعة للعملاء عند المرتجع)
            salesReturns.filter(r => new Date(r.date).getMonth() === currentMonth && new Date(r.date).getFullYear() === currentYear)
                .reduce((sum, r) => sum + (r.paidAmount || 0), 0) +
            // 4. المصروفات
            expensesMonth;

        const netCashMovement = cashInMonth - cashOutMonth;

        return { salesToday, salesMonth, salesLastMonth, purchasesMonth, purchasesLastMonth, netCashMovement };
    };

    const { salesMonth, salesLastMonth, purchasesMonth, purchasesLastMonth, netCashMovement } = getTotals();

    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const salesGrowth = calculateGrowth(salesMonth, salesLastMonth);
    const purchasesGrowth = calculateGrowth(purchasesMonth, purchasesLastMonth);

    // --- Advanced Financials ---
    const financialHealth = useMemo(() => {
        let totalReceivables = 0;
        customers.forEach(c => {
            let balance = c.openingBalance || 0;
            salesInvoices.filter(inv => inv.customerId === c.id).forEach(inv => {
                const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                balance += (total - (inv.paidAmount || 0));
            });
            salesReturns.filter(ret => ret.customerId === c.id).forEach(ret => {
                const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                balance -= (total - (ret.paidAmount || 0));
            });
            customerReceipts.filter(rec => rec.customerId === c.id).forEach(rec => {
                balance -= rec.amount;
            });
            if (balance > 0) totalReceivables += balance;
        });

        let totalPayables = 0;
        suppliers.forEach(s => {
            let balance = s.openingBalance || 0;
            purchaseInvoices.filter(inv => inv.supplierId === s.id).forEach(inv => {
                const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                balance += (total - (inv.paidAmount || 0));
            });
            purchaseReturns.filter(ret => ret.supplierId === s.id).forEach(ret => {
                 const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                 balance -= (total - (ret.paidAmount || 0));
            });
            supplierPayments.filter(p => p.supplierId === s.id).forEach(p => {
                balance -= p.amount;
            });
            if (balance > 0) totalPayables += balance;
        });

        const inventoryValue = items.reduce((sum, item) => sum + ((item.openingBalance || 0) * (item.purchasePrice || 0)), 0);

        let totalTreasuryBalance = 0;
        treasuries.forEach(t => {
             let balance = t.openingBalance || 0;
             customerReceipts.forEach(r => { if(r.treasuryId === t.id && ['cash','check'].includes(r.paymentMethod)) balance += r.amount; });
             supplierPayments.forEach(p => { if(p.treasuryId === t.id && ['cash','check'].includes(p.paymentMethod)) balance -= p.amount; });
             expenses.forEach(e => { if(e.treasuryId === t.id) balance -= e.amount; });
             treasuryTransfers.forEach(tr => {
                 if(tr.fromTreasuryId === t.id) balance -= tr.amount;
                 if(tr.toTreasuryId === t.id) balance += tr.amount;
             });
             totalTreasuryBalance += balance;
        });
        
        // Add invoice direct payments
        salesInvoices.forEach(inv => totalTreasuryBalance += (inv.paidAmount || 0));
        purchaseReturns.forEach(ret => totalTreasuryBalance += (ret.paidAmount || 0));
        purchaseInvoices.forEach(inv => totalTreasuryBalance -= (inv.paidAmount || 0));
        salesReturns.forEach(ret => totalTreasuryBalance -= (ret.paidAmount || 0));

        return { totalReceivables, totalPayables, inventoryValue, totalTreasuryBalance };
    }, [customers, salesInvoices, salesReturns, customerReceipts, suppliers, purchaseInvoices, purchaseReturns, supplierPayments, items, treasuries, expenses, treasuryTransfers]);


    // --- Top Customers ---
    const topCustomers = useMemo(() => {
        const custMap = new Map<number, number>();
        salesInvoices.forEach(inv => {
            const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
            custMap.set(inv.customerId, (custMap.get(inv.customerId) || 0) + total);
        });
        return Array.from(custMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, total]) => {
                const c = customers.find(cust => cust.id === id);
                return { name: c?.name || 'غير معروف', total };
            });
    }, [salesInvoices, customers]);

     // --- Top Expenses ---
    const topExpenses = useMemo(() => {
        const expMap = new Map<string, number>();
        expenses.forEach(exp => {
             const d = new Date(exp.date);
             if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const catName = expenseCategories.find(c => c.id === exp.categoryId)?.name || 'غير مصنف';
                expMap.set(catName, (expMap.get(catName) || 0) + exp.amount);
             }
        });
        return Array.from(expMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, amount]) => ({ name, amount }));
    }, [expenses, expenseCategories, currentMonth, currentYear]);


    // --- Daily Activity Metrics ---
    const dailyActivity = useMemo(() => {
        const todayInvoices = salesInvoices.filter(inv => inv.date.startsWith(today)).length;
        
        let cashIn = 0;
        salesInvoices.forEach(inv => { if(inv.date.startsWith(today)) cashIn += (inv.paidAmount || 0) }); 
        customerReceipts.forEach(rec => { if(rec.date === today) cashIn += rec.amount });
        
        let cashOut = 0;
        expenses.forEach(exp => { if(exp.date === today) cashOut += exp.amount });
        supplierPayments.forEach(pay => { if(pay.date === today) cashOut += pay.amount });
        purchaseInvoices.forEach(inv => { if(inv.date.startsWith(today)) cashOut += (inv.paidAmount || 0) });

        return { todayInvoices, net: cashIn - cashOut };
    }, [salesInvoices, customerReceipts, expenses, supplierPayments, purchaseInvoices, today]);

    // --- Quick Search Handlers ---
    
    // Items
    const handleItemSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setItemQuery(e.target.value);
        setIsItemSuggestionsOpen(true);
        if(!e.target.value) setFoundItem(null);
    };
    const handleItemSelect = (item: Item) => {
        setFoundItem(item);
        setItemQuery(item.name);
        setIsItemSuggestionsOpen(false);
    };
    const getSuggestedItems = () => {
        if(!itemQuery) return [];
        const matches = items.filter(i => searchMatch(i.name, itemQuery) || searchMatch(i.barcode, itemQuery));
        
        // Deduplicate by name to show unique items in suggestion list
        const uniqueMatches: Item[] = [];
        const seenNames = new Set<string>();
        matches.forEach(item => {
            if (!seenNames.has(item.name)) {
                seenNames.add(item.name);
                uniqueMatches.push(item);
            }
        });
        return uniqueMatches;
    };

    // Customers
    const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomerQuery(e.target.value);
        setIsCustomerSuggestionsOpen(true);
        if(!e.target.value) setFoundCustomer(null);
    };
    const handleCustomerSelect = (customer: Customer) => {
        setFoundCustomer(customer);
        setCustomerQuery(customer.name);
        setIsCustomerSuggestionsOpen(false);
    };
    const getSuggestedCustomers = () => {
        if(!customerQuery) return [];
        return customers.filter(c => searchMatch(c.name, customerQuery) || (c.phone && searchMatch(c.phone, customerQuery)));
    };
    const getCustomerBalance = (customerId: number) => {
        const c = customers.find(x => x.id === customerId);
        if(!c) return 0;
        let bal = c.openingBalance || 0;
        // Simplified calc for dashboard lookup
        salesInvoices.filter(i => i.customerId === c.id).forEach(inv => {
             const t = (inv.items.reduce((a, x) => a + x.price * x.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
             bal += (t - (inv.paidAmount || 0));
        });
        customerReceipts.filter(r => r.customerId === c.id).forEach(r => bal -= r.amount);
        return bal;
    };

    // Suppliers
    const handleSupplierSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSupplierQuery(e.target.value);
        setIsSupplierSuggestionsOpen(true);
        if(!e.target.value) setFoundSupplier(null);
    };
    const handleSupplierSelect = (supplier: Supplier) => {
        setFoundSupplier(supplier);
        setSupplierQuery(supplier.name);
        setIsSupplierSuggestionsOpen(false);
    };
    const getSuggestedSuppliers = () => {
        if(!supplierQuery) return [];
        return suppliers.filter(s => searchMatch(s.name, supplierQuery) || (s.phone && searchMatch(s.phone, supplierQuery)));
    };
    const getSupplierBalance = (supplierId: number) => {
        const s = suppliers.find(x => x.id === supplierId);
        if(!s) return 0;
        let bal = s.openingBalance || 0;
        purchaseInvoices.filter(i => i.supplierId === s.id).forEach(inv => {
             const t = (inv.items.reduce((a, x) => a + x.price * x.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
             bal += (t - (inv.paidAmount || 0));
        });
        supplierPayments.filter(p => p.supplierId === s.id).forEach(p => bal -= p.amount);
        return bal;
    };

    // Treasuries
    const getTreasuryBalance = (id: number) => {
        if(!id) return 0;
        const t = treasuries.find(x => x.id === id);
        if(!t) return 0;
        let bal = t.openingBalance;
        
        // Receipts (Cash/Check)
        customerReceipts.forEach(r => { if(r.treasuryId === id && ['cash', 'check'].includes(r.paymentMethod)) bal += r.amount });
        
        // Payments (Cash/Check)
        supplierPayments.forEach(p => { if(p.treasuryId === id && ['cash', 'check'].includes(p.paymentMethod)) bal -= p.amount });
        
        // Expenses
        expenses.forEach(e => { if(e.treasuryId === id) bal -= e.amount });
        
        // Transfers
        treasuryTransfers.forEach(tr => {
            if(tr.fromTreasuryId === id) bal -= tr.amount;
            if(tr.toTreasuryId === id) bal += tr.amount;
        });

        // Direct Invoice Payments (Assumed to go to DEFAULT TREASURY)
        // If this treasury is the default one, add direct invoice cash
        if (defaultValues && id === defaultValues.defaultTreasuryId) {
             salesInvoices.forEach(inv => { if (inv.paidAmount) bal += inv.paidAmount; });
             purchaseInvoices.forEach(inv => { if (inv.paidAmount) bal -= inv.paidAmount; });
             salesReturns.forEach(ret => { if (ret.paidAmount) bal -= ret.paidAmount; });
             purchaseReturns.forEach(ret => { if (ret.paidAmount) bal += ret.paidAmount; });
        }
        
        return bal;
    };


    const cardClass = "bg-gray-50/80 backdrop-blur-lg rounded-xl shadow-md p-6 border border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 transition-all duration-300";
    const inputClass = "w-full px-5 py-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 text-xl placeholder:text-lg";

    return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="max-w-sm mx-auto mb-8"><Clock /></div>
      
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">لوحة التحكم الرئيسية</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`${cardClass} hover:shadow-lg hover:-translate-y-1`}>
                <button onClick={() => setCurrentView('salesInvoice')} className="w-full flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-blue-700 transition-colors mb-4">
                    <PlusCircleIcon /> <span className="mr-2">فاتورة مبيعات</span>
                </button>
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">مبيعات الشهر</p>
                    <div className="flex justify-center items-baseline gap-2">
                        <FormattedNumber value={salesMonth} className="text-2xl font-bold text-blue-600 dark:text-blue-400" />
                        {salesGrowth !== 0 && (
                            <span className={`text-xs font-bold ${salesGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {salesGrowth > 0 ? '↑' : '↓'} {Math.abs(salesGrowth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className={`${cardClass} hover:shadow-lg hover:-translate-y-1`}>
                 <button onClick={() => setCurrentView('purchaseInvoice')} className="w-full flex items-center justify-center bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-green-700 transition-colors mb-4">
                    <PlusCircleIcon /> <span className="mr-2">فاتورة مشتريات</span>
                </button>
                 <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">مشتريات الشهر</p>
                     <div className="flex justify-center items-baseline gap-2">
                        <FormattedNumber value={purchasesMonth} className="text-2xl font-bold text-green-600 dark:text-green-400" />
                    </div>
                </div>
            </div>

             <div className={`${cardClass} hover:shadow-lg hover:-translate-y-1`}>
                <button onClick={() => setCurrentView('expenseManagement')} className="w-full flex items-center justify-center bg-purple-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-purple-700 transition-colors mb-4">
                    <PlusCircleIcon /> <span className="mr-2">تسجيل مصروف</span>
                </button>
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">صافي حركة النقدية (الشهر)</p>
                    <FormattedNumber value={netCashMovement} className={`text-2xl font-bold ${netCashMovement >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-500'}`} />
                    <p className="text-[10px] text-gray-400 mt-1">مقبوضات - مدفوعات - مصروفات</p>
                </div>
            </div>

             <div className={`${cardClass} hover:shadow-lg hover:-translate-y-1`}>
                <button onClick={() => setCurrentView('warehouseTransfer')} className="w-full flex items-center justify-center bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-yellow-600 transition-colors mb-4">
                    <SwitchHorizontalIcon /> <span className="mr-2">تحويل مخزني</span>
                </button>
                 <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">إجمالي الأصناف</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{items.length}</p>
                </div>
            </div>
      </div>

      {/* Lookup Section (Complete) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Item Lookup */}
            <div className={`${cardClass} relative`}>
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2 text-lg">بحث سريع عن صنف</h3>
                <div className="relative">
                    <input type="text" placeholder="الاسم أو الباركود" value={itemQuery} onChange={handleItemSearchChange} onFocus={() => setIsItemSuggestionsOpen(true)} className={inputClass} />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon className="h-6 w-6" /></div>
                    {isItemSuggestionsOpen && itemQuery && (
                        <ul className="absolute z-[100] w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md max-h-60 overflow-y-auto shadow-lg top-full left-0">
                            {getSuggestedItems().map(item => (
                                <li key={item.id} onMouseDown={() => { setFoundItem(item); setItemQuery(item.name); setIsItemSuggestionsOpen(false); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                    {item.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {foundItem && (
                    <div className="mt-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-sm">
                        <div className="flex justify-between items-center mb-2 border-b border-gray-300 dark:border-gray-600 pb-1">
                            <span className="text-gray-600 dark:text-gray-400">سعر البيع:</span> 
                            <span className="font-bold text-green-600 text-lg"><FormattedNumber value={foundItem.sellPrice} /></span>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">الأرصدة بالمخازن:</p>
                             {warehouses.map(w => {
                                // Find item specific to this warehouse based on name
                                const stockInWh = items
                                    .filter(i => i.name === foundItem.name && i.warehouseId === w.id)
                                    .reduce((sum, i) => sum + (i.openingBalance || 0), 0);

                                return (
                                    <div key={w.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded border border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-400">{w.name}</span>
                                        <span className={`font-bold ${stockInWh > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                                            {stockInWh}
                                        </span>
                                    </div>
                                );
                            })}
                             <div className="flex justify-between items-center border-t border-gray-300 dark:border-gray-600 pt-1 mt-1">
                                 <span className="font-bold text-gray-700 dark:text-gray-300">الإجمالي</span>
                                 <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                                    {items.filter(i => i.name === foundItem.name).reduce((sum, i) => sum + (i.openingBalance || 0), 0)}
                                 </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Customer Lookup */}
            <div className={`${cardClass} relative`}>
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2 text-lg">استعلام رصيد عميل</h3>
                <div className="relative">
                    <input type="text" placeholder="اسم العميل أو الهاتف" value={customerQuery} onChange={handleCustomerSearchChange} onFocus={() => setIsCustomerSuggestionsOpen(true)} className={inputClass} />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon className="h-6 w-6" /></div>
                    {isCustomerSuggestionsOpen && customerQuery && (
                        <ul className="absolute z-[100] w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md max-h-60 overflow-y-auto shadow-lg top-full left-0">
                            {getSuggestedCustomers().map(cust => (
                                <li key={cust.id} onMouseDown={() => { setFoundCustomer(cust); setCustomerQuery(cust.name); setIsCustomerSuggestionsOpen(false); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                    {cust.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {foundCustomer && (
                    <div className="mt-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">الرصيد:</span> 
                            <span className={`font-bold text-xl ${getCustomerBalance(foundCustomer.id) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                <FormattedNumber value={Math.abs(getCustomerBalance(foundCustomer.id))} /> {getCustomerBalance(foundCustomer.id) >= 0 ? 'عليه' : 'له'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Supplier Lookup */}
            <div className={`${cardClass} relative`}>
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2 text-lg">استعلام رصيد مورد</h3>
                <div className="relative">
                    <input type="text" placeholder="اسم المورد أو الهاتف" value={supplierQuery} onChange={handleSupplierSearchChange} onFocus={() => setIsSupplierSuggestionsOpen(true)} className={inputClass} />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon className="h-6 w-6" /></div>
                    {isSupplierSuggestionsOpen && supplierQuery && (
                        <ul className="absolute z-[100] w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md max-h-60 overflow-y-auto shadow-lg top-full left-0">
                            {getSuggestedSuppliers().map(supp => (
                                <li key={supp.id} onMouseDown={() => { setFoundSupplier(supp); setSupplierQuery(supp.name); setIsSupplierSuggestionsOpen(false); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                    {supp.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {foundSupplier && (
                    <div className="mt-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">الرصيد:</span> 
                            <span className={`font-bold text-xl ${getSupplierBalance(foundSupplier.id) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                <FormattedNumber value={Math.abs(getSupplierBalance(foundSupplier.id))} /> {getSupplierBalance(foundSupplier.id) >= 0 ? 'له' : 'عليه'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Treasury Lookup */}
            <div className={`${cardClass} relative`}>
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2 text-lg">رصيد الخزينة</h3>
                <div className="relative">
                    <select 
                        value={selectedTreasuryId} 
                        onChange={(e) => setSelectedTreasuryId(parseInt(e.target.value))} 
                        className={inputClass}
                    >
                        <option value={0}>اختر خزينة...</option>
                        {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                {selectedTreasuryId > 0 && (
                    <div className="mt-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">الرصيد الحالي:</span> 
                            <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                                <FormattedNumber value={getTreasuryBalance(selectedTreasuryId)} /> ج.م
                            </span>
                        </div>
                    </div>
                )}
            </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl p-4 shadow-md">
              <p className="text-sm opacity-80">السيولة النقدية الحالية</p>
              <p className="text-2xl font-bold"><FormattedNumber value={financialHealth.totalTreasuryBalance} /> ج.م</p>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-4 shadow-md">
              <p className="text-sm opacity-80">ديون العملاء (لنا)</p>
              <p className="text-2xl font-bold"><FormattedNumber value={financialHealth.totalReceivables} /> ج.م</p>
          </div>
          <div className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl p-4 shadow-md">
              <p className="text-sm opacity-80">قيمة المخزون (شراء)</p>
              <p className="text-2xl font-bold"><FormattedNumber value={financialHealth.inventoryValue} /> ج.م</p>
          </div>
          <div className="bg-gradient-to-r from-slate-600 to-slate-800 text-white rounded-xl p-4 shadow-md">
              <p className="text-sm opacity-80">مستحقات الموردين (علينا)</p>
              <p className="text-2xl font-bold"><FormattedNumber value={financialHealth.totalPayables} /> ج.م</p>
          </div>
      </div>

      {/* Activity & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Activity */}
            <div className={cardClass}>
                 <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-4">📅 نشاط اليوم</h3>
                 <div className="grid grid-cols-2 gap-4 text-center">
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border border-indigo-100 dark:border-indigo-800">
                         <p className="text-xs text-gray-500 dark:text-gray-400">فواتير اليوم</p>
                         <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{dailyActivity.todayInvoices}</p>
                     </div>
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border border-indigo-100 dark:border-indigo-800">
                         <p className="text-xs text-gray-500 dark:text-gray-400">صافي الكاش</p>
                         <p className={`text-sm font-bold ${dailyActivity.net >= 0 ? 'text-green-600' : 'text-red-600'}`}><FormattedNumber value={dailyActivity.net} /></p>
                     </div>
                 </div>
            </div>

            {/* Top Customers */}
             <div className={cardClass}>
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-4">🏆 كبار العملاء</h3>
                 {topCustomers.length > 0 ? (
                    <ul className="space-y-3">
                         {topCustomers.map((c, idx) => (
                            <li key={idx} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                                <span className="text-gray-700 dark:text-gray-300 text-sm truncate">{c.name}</span>
                                <FormattedNumber value={c.total} className="font-bold text-gray-600 dark:text-gray-400 text-xs" />
                            </li>
                         ))}
                    </ul>
                 ) : <p className="text-gray-400 text-sm text-center">لا توجد بيانات</p>}
            </div>

            {/* Top Expenses */}
            <div className={cardClass}>
                <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-4">💸 أعلى المصروفات</h3>
                 {topExpenses.length > 0 ? (
                    <ul className="space-y-3">
                         {topExpenses.map((ex, idx) => (
                            <li key={idx} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                                <span className="text-gray-700 dark:text-gray-300 text-sm truncate">{ex.name}</span>
                                <FormattedNumber value={ex.amount} className="font-bold text-purple-600 dark:text-purple-400 text-xs" />
                            </li>
                         ))}
                    </ul>
                 ) : <p className="text-gray-400 text-sm text-center">لا توجد مصروفات</p>}
            </div>
      </div>
    </div>
);
};

export default DashboardHome;
