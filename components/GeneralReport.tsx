
import React, { useState, useMemo } from 'react';
import type { 
    SalesInvoice, SalesReturn, PurchaseInvoice, PurchaseReturn, Expense, 
    Item, Warehouse, Treasury, ExpenseCategory, CustomerReceipt, 
    SupplierPayment, TreasuryTransfer, WarehouseTransfer, CompanyData, DefaultValues,
    Customer, Supplier
} from '../types';
import { PrintIcon, FormattedNumber, ViewIcon } from './Shared';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';
import { formatDateForDisplay, formatNumber } from '../utils';

interface GeneralReportProps {
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    expenses: Expense[];
    customerReceipts: CustomerReceipt[];
    supplierPayments: SupplierPayment[];
    treasuryTransfers: TreasuryTransfer[];
    warehouseTransfers: WarehouseTransfer[];
    items: Item[];
    warehouses: Warehouse[];
    treasuries: Treasury[];
    expenseCategories: ExpenseCategory[];
    customers: Customer[];
    suppliers: Supplier[];
    companyData: CompanyData;
    defaultValues: DefaultValues;
}

interface TreasuryOpeningBalance {
    id: number;
    name: string;
    balance: number;
}

interface InventoryOpeningBalance {
    warehouseId: number;
    warehouseName: string;
    balance: number; // at cost price
}

interface CustomerBalance {
    id: number;
    name: string;
    balance: number;
}

interface SupplierBalance {
    id: number;
    name: string;
    balance: number;
}

interface ReportData {
    startDate: string;
    endDate: string;
    treasuryOpeningBalances: TreasuryOpeningBalance[];
    totalTreasuryOpening: number;
    inventoryOpeningBalances: InventoryOpeningBalance[];
    totalInventoryOpening: number;
    customerOpeningBalances: CustomerBalance[];
    totalCustomerOpening: number;
    supplierOpeningBalances: SupplierBalance[];
    totalSupplierOpening: number;
    
    purchasesInPeriod: PurchaseInvoice[];
    totalPurchases: number;
    totalPurchaseReturns: number;
    inventoryPurchases: number;
    inventoryPurchaseReturns: number;
    salesInPeriod: number;
    returnsInPeriod: number;
    netSales: number;
    cogsInPeriod: number;
    salesCogsInPeriod: number;
    returnsCogsInPeriod: number;
    grossProfit: number;
    expensesInPeriod: Expense[];
    totalExpenses: number;
    groupedExpenses: { [key: string]: number };
    netProfit: number;
    
    // Cash Flow
    cashSales: number;
    cashSalesReturns: number;
    cashPurchases: number;
    cashPurchaseReturns: number;
    customerCollections: number;
    supplierPaymentsInPeriod: number;
    expensesPaid: number;
    transfersNet: number;
    treasuryTransfersIn: number;
    treasuryTransfersOut: number;
    
    // Closing Balances
    treasuryClosingBalances: TreasuryOpeningBalance[];
    totalTreasuryClosing: number;
    inventoryClosingBalances: InventoryOpeningBalance[];
    totalInventoryClosing: number;
    customerClosingBalances: CustomerBalance[];
    totalCustomerClosing: number;
    supplierClosingBalances: SupplierBalance[];
    totalSupplierClosing: number;
}

const generateAuditorReport = (data: ReportData) => {
    const analysis: string[] = [];
    const suggestions: string[] = [];

    // Profitability Analysis
    const profitMargin = data.netSales > 0 ? (data.grossProfit / data.netSales) * 100 : 0;
    const netProfitMargin = data.netSales > 0 ? (data.netProfit / data.netSales) * 100 : 0;

    if (data.netProfit > 0) {
        analysis.push(`الشركة تحقق أرباحاً صافية بقيمة ${formatNumber(data.netProfit)}، وهو مؤشر إيجابي على الأداء المالي خلال الفترة.`);
        if (netProfitMargin > 15) {
            analysis.push(`هامش الربح الصافي ممتاز (${netProfitMargin.toFixed(1)}%)، مما يدل على كفاءة عالية في إدارة التكاليف والمصروفات.`);
        } else if (netProfitMargin > 5) {
            analysis.push(`هامش الربح الصافي جيد (${netProfitMargin.toFixed(1)}%)، ولكن يوجد مجال لتحسينه بتقليل المصروفات أو زيادة المبيعات.`);
        } else {
            analysis.push(`هامش الربح الصافي ضعيف (${netProfitMargin.toFixed(1)}%)، يجب مراجعة هيكل التكاليف والمصروفات التشغيلية.`);
        }
    } else if (data.netProfit < 0) {
        analysis.push(`الشركة تحقق خسائر صافية بقيمة ${formatNumber(Math.abs(data.netProfit))}، مما يتطلب تدخلاً سريعاً لمراجعة المصروفات وتسعير المنتجات.`);
    } else {
        analysis.push(`الشركة في نقطة التعادل (لا ربح ولا خسارة)، الإيرادات تغطي التكاليف والمصروفات بالكاد.`);
    }

    // Sales vs COGS
    if (profitMargin < 20 && data.netSales > 0) {
        suggestions.push('مراجعة سياسة التسعير أو التفاوض مع الموردين للحصول على أسعار شراء أفضل لزيادة هامش مجمل الربح.');
    }

    // Expenses Analysis
    const expensesToSalesRatio = data.netSales > 0 ? (data.totalExpenses / data.netSales) * 100 : 0;
    if (expensesToSalesRatio > 30) {
        analysis.push(`المصروفات تمثل نسبة عالية من المبيعات (${expensesToSalesRatio.toFixed(1)}%).`);
        suggestions.push('ضرورة وضع خطة لترشيد المصروفات الإدارية والتشغيلية، خاصة البنود الأعلى تكلفة.');
    }

    // Cash Flow Analysis
    const cashIn = data.cashSales + data.customerCollections + data.cashPurchaseReturns;
    const cashOut = data.cashPurchases + data.cashSalesReturns + data.supplierPaymentsInPeriod + data.expensesPaid;
    const netCashFlow = cashIn - cashOut;

    if (netCashFlow < 0) {
        analysis.push(`يوجد عجز في التدفقات النقدية التشغيلية بقيمة ${formatNumber(Math.abs(netCashFlow))}، مما قد يؤثر على قدرة الشركة على سداد التزاماتها قصيرة الأجل.`);
        suggestions.push('تنشيط التحصيل من العملاء، ومحاولة جدولة المدفوعات للموردين لتحسين السيولة النقدية.');
    } else {
        analysis.push(`التدفقات النقدية التشغيلية موجبة بقيمة ${formatNumber(netCashFlow)}، مما يعكس سيولة جيدة لتغطية الالتزامات.`);
    }

    // Inventory Analysis
    if (data.totalInventoryClosing > data.totalInventoryOpening * 1.2) {
        analysis.push('يلاحظ زيادة كبيرة في رصيد المخزون آخر المدة مقارنة بأول المدة.');
        suggestions.push('تجنب تجميد السيولة في مخزون راكد، وعمل عروض ترويجية لتصريف البضاعة بطيئة الحركة.');
    }

    // Receivables vs Payables
    if (data.totalCustomerClosing > data.totalSupplierClosing * 1.5) {
        analysis.push('أرصدة العملاء (المديونية) تفوق أرصدة الموردين (الالتزامات) بشكل ملحوظ.');
        suggestions.push('تفعيل سياسات ائتمان أكثر صرامة مع العملاء، وتقديم خصومات تعجيل الدفع لتسريع التحصيل.');
    }

    if (suggestions.length === 0) {
        suggestions.push('الاستمرار في مراقبة الأداء المالي بشكل دوري للحفاظ على استقرار الشركة.');
        suggestions.push('البحث عن فرص استثمارية جديدة أو التوسع في خطوط المنتجات لزيادة الحصة السوقية.');
    }

    return { analysis, suggestions };
};

const GeneralReport: React.FC<GeneralReportProps> = ({
    salesInvoices, salesReturns, purchaseInvoices, purchaseReturns, expenses,
    customerReceipts, supplierPayments, treasuryTransfers, warehouseTransfers,
    items, warehouses, treasuries, expenseCategories, customers, suppliers, companyData, defaultValues
}) => {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<ReportData | null>(null);

    // Visibility states for details
    const [showOpeningDetails, setShowOpeningDetails] = useState(false);
    const [showPurchaseDetails, setShowPurchaseDetails] = useState(false);
    const [showInventoryMovementDetails, setShowInventoryMovementDetails] = useState(false);
    const [showSalesDetails, setShowSalesDetails] = useState(false);
    const [showExpenseDetails, setShowExpenseDetails] = useState(false);
    const [showCashFlowDetails, setShowCashFlowDetails] = useState(false);
    const [showClosingDetails, setShowClosingDetails] = useState(false);

    const startDateInputProps = useDateInput(startDate, setStartDate);
    const endDateInputProps = useDateInput(endDate, setEndDate);

    const calculateReport = () => {
        const start = startDate || '1970-01-01';
        const end = endDate || new Date().toISOString().split('T')[0];
        const nextDayAfterEnd = new Date(new Date(end).getTime() + 86400000).toISOString().split('T')[0];

        const getTreasuryBalanceAt = (t: Treasury, date: string) => {
            let balance = t.openingBalance;
            customerReceipts.forEach(rec => {
                if (rec.treasuryId === t.id && rec.date < date && (rec.paymentMethod === 'cash' || rec.paymentMethod === 'check')) balance += rec.amount;
            });
            supplierPayments.forEach(p => {
                if (p.treasuryId === t.id && p.date < date && (p.paymentMethod === 'cash' || p.paymentMethod === 'check')) balance -= p.amount;
            });
            expenses.forEach(exp => {
                if (exp.treasuryId === t.id && exp.date < date) balance -= exp.amount;
            });
            treasuryTransfers.forEach(tr => {
                if (tr.fromTreasuryId === t.id && tr.date < date) balance -= tr.amount;
                if (tr.toTreasuryId === t.id && tr.date < date) balance += tr.amount;
            });
            if (t.id === defaultValues.defaultTreasuryId) {
                salesInvoices.forEach(inv => { if (inv.date < date && inv.paidAmount) balance += inv.paidAmount; });
                purchaseInvoices.forEach(inv => { if (inv.date < date && inv.paidAmount) balance -= inv.paidAmount; });
                salesReturns.forEach(ret => { if (ret.date < date && ret.paidAmount) balance -= ret.paidAmount; });
                purchaseReturns.forEach(ret => { if (ret.date < date && ret.paidAmount) balance += ret.paidAmount; });
            }
            return balance;
        };

        const getInventoryBalanceAt = (w: Warehouse, date: string) => {
            let balance = 0;
            items.filter(item => item.warehouseId === w.id).forEach(item => {
                let qty = item.openingBalance;
                
                // Reverse transactions that happened ON OR AFTER `date`
                purchaseInvoices.forEach(inv => {
                    if (inv.date >= date) inv.items.forEach(ii => { if (ii.itemId === item.id) qty -= ii.quantity; });
                });
                purchaseReturns.forEach(ret => {
                    if (ret.date >= date) ret.items.forEach(ri => { if (ri.itemId === item.id) qty += ri.quantity; });
                });
                salesInvoices.forEach(inv => {
                    if (inv.date >= date) inv.items.forEach(si => { if (si.itemId === item.id) qty += si.quantity; });
                });
                salesReturns.forEach(ret => {
                    if (ret.date >= date) ret.items.forEach(ri => { if (ri.itemId === item.id) qty -= ri.quantity; });
                });
                warehouseTransfers.forEach(tr => {
                    if (tr.date >= date) {
                        tr.items.forEach(ti => { 
                            if (ti.itemId === item.id) qty += ti.quantity; 
                        });
                        if (tr.toWarehouseId === w.id) {
                            tr.items.forEach(ti => { 
                                const fromItem = items.find(i => i.id === ti.itemId);
                                if (fromItem && fromItem.barcode === item.barcode) qty -= ti.quantity; 
                            });
                        }
                    }
                });
                balance += qty * item.purchasePrice;
            });
            return balance;
        };

        const getCustomerBalanceAt = (c: Customer, date: string) => {
            let balance = c.openingBalance;
            salesInvoices.forEach(inv => {
                if (inv.customerId === c.id && inv.date < date) {
                    const total = inv.items.reduce((s, i) => s + i.price * i.quantity, 0);
                    balance += (total - (inv.paidAmount || 0));
                }
            });
            salesReturns.forEach(ret => {
                if (ret.customerId === c.id && ret.date < date) {
                    const total = ret.items.reduce((s, i) => s + i.price * i.quantity, 0);
                    balance -= (total - (ret.paidAmount || 0));
                }
            });
            customerReceipts.forEach(rec => {
                if (rec.customerId === c.id && rec.date < date) balance -= rec.amount;
            });
            return balance;
        };

        const getSupplierBalanceAt = (s: Supplier, date: string) => {
            let balance = s.openingBalance;
            purchaseInvoices.forEach(inv => {
                if (inv.supplierId === s.id && inv.date < date) {
                    const total = (inv.items.reduce((sum, i) => sum + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                    balance += (total - (inv.paidAmount || 0));
                }
            });
            purchaseReturns.forEach(ret => {
                if (ret.supplierId === s.id && ret.date < date) {
                    const total = (ret.items.reduce((sum, i) => sum + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                    balance -= (total - (ret.paidAmount || 0));
                }
            });
            supplierPayments.forEach(p => {
                if (p.supplierId === s.id && p.date < date) balance -= p.amount;
            });
            return balance;
        };

        // OPENING BALANCES
        const treasuryOpeningBalances = treasuries.map(t => ({ id: t.id, name: t.name, balance: getTreasuryBalanceAt(t, start) }));
        const totalTreasuryOpening = treasuryOpeningBalances.reduce((sum, b) => sum + b.balance, 0);

        const inventoryOpeningBalances = warehouses.map(w => ({ warehouseId: w.id, warehouseName: w.name, balance: getInventoryBalanceAt(w, start) }));
        const totalInventoryOpening = inventoryOpeningBalances.reduce((sum, b) => sum + b.balance, 0);

        const customerOpeningBalances = customers.map(c => ({ id: c.id, name: c.name, balance: getCustomerBalanceAt(c, start) }));
        const totalCustomerOpening = customerOpeningBalances.reduce((sum, b) => sum + b.balance, 0);

        const supplierOpeningBalances = suppliers.map(s => ({ id: s.id, name: s.name, balance: getSupplierBalanceAt(s, start) }));
        const totalSupplierOpening = supplierOpeningBalances.reduce((sum, b) => sum + b.balance, 0);

        // CLOSING BALANCES
        const treasuryClosingBalances = treasuries.map(t => ({ id: t.id, name: t.name, balance: getTreasuryBalanceAt(t, nextDayAfterEnd) }));
        const totalTreasuryClosing = treasuryClosingBalances.reduce((sum, b) => sum + b.balance, 0);

        const inventoryClosingBalances = warehouses.map(w => ({ warehouseId: w.id, warehouseName: w.name, balance: getInventoryBalanceAt(w, nextDayAfterEnd) }));
        const totalInventoryClosing = inventoryClosingBalances.reduce((sum, b) => sum + b.balance, 0);

        const customerClosingBalances = customers.map(c => ({ id: c.id, name: c.name, balance: getCustomerBalanceAt(c, nextDayAfterEnd) }));
        const totalCustomerClosing = customerClosingBalances.reduce((sum, b) => sum + b.balance, 0);

        const supplierClosingBalances = suppliers.map(s => ({ id: s.id, name: s.name, balance: getSupplierBalanceAt(s, nextDayAfterEnd) }));
        const totalSupplierClosing = supplierClosingBalances.reduce((sum, b) => sum + b.balance, 0);

        // PERIOD DATA
        const purchasesInPeriod = purchaseInvoices.filter(inv => inv.date >= start && inv.date <= end);
        const purchaseReturnsInPeriod = purchaseReturns.filter(ret => ret.date >= start && ret.date <= end);

        const totalPurchases = purchasesInPeriod.reduce((sum, inv) => {
            const subtotal = inv.items.reduce((s, i) => s + i.price * i.quantity, 0);
            return sum + (subtotal - inv.discount) * (1 + inv.tax / 100);
        }, 0);

        const totalPurchaseReturns = purchaseReturnsInPeriod.reduce((sum, ret) => {
            const subtotal = ret.items.reduce((s, i) => s + i.price * i.quantity, 0);
            return sum + (subtotal - ret.discount) * (1 + ret.tax / 100);
        }, 0);

        // Inventory Movement Values (using purchasePrice to match getInventoryBalanceAt)
        const inventoryPurchases = purchasesInPeriod.reduce((sum, inv) => sum + inv.items.reduce((invSum, item) => {
            const itemDetails = items.find(i => i.id === item.itemId);
            return invSum + (itemDetails ? itemDetails.purchasePrice * item.quantity : 0);
        }, 0), 0);

        const inventoryPurchaseReturns = purchaseReturnsInPeriod.reduce((sum, ret) => sum + ret.items.reduce((retSum, item) => {
            const itemDetails = items.find(i => i.id === item.itemId);
            return retSum + (itemDetails ? itemDetails.purchasePrice * item.quantity : 0);
        }, 0), 0);

        const invoicesInRange = salesInvoices.filter(inv => inv.date >= start && inv.date <= end);
        const returnsInRange = salesReturns.filter(ret => ret.date >= start && ret.date <= end);
        const salesInPeriod = invoicesInRange.reduce((sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0), 0);
        const returnsInPeriod = returnsInRange.reduce((sum, ret) => sum + ret.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0), 0);
        const netSales = salesInPeriod - returnsInPeriod;

        const salesCogsInPeriod = invoicesInRange.reduce((totalCogs, inv) => totalCogs + inv.items.reduce((invSum, saleItem) => {
            const itemDetails = items.find(i => i.id === saleItem.itemId);
            return invSum + (itemDetails ? itemDetails.purchasePrice * saleItem.quantity : 0);
        }, 0), 0);
        
        const returnsCogsInPeriod = returnsInRange.reduce((totalCogs, ret) => totalCogs + ret.items.reduce((retSum, returnItem) => {
            const itemDetails = items.find(i => i.id === returnItem.itemId);
            return retSum + (itemDetails ? itemDetails.purchasePrice * returnItem.quantity : 0);
        }, 0), 0);

        const cogsInPeriod = salesCogsInPeriod - returnsCogsInPeriod;
        const grossProfit = netSales - cogsInPeriod;

        const expensesInRange = expenses.filter(exp => exp.date >= start && exp.date <= end);
        const totalExpenses = expensesInRange.reduce((sum, exp) => sum + exp.amount, 0);
        const groupedExpenses = expensesInRange.reduce((acc, exp) => {
            const categoryName = expenseCategories.find(c => c.id === exp.categoryId)?.name || 'غير مصنف';
            acc[categoryName] = (acc[categoryName] || 0) + exp.amount;
            return acc;
        }, {} as { [key: string]: number });
        const netProfit = grossProfit - totalExpenses;

        const cashSales = invoicesInRange.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const cashSalesReturns = returnsInRange.reduce((sum, ret) => sum + (ret.paidAmount || 0), 0);
        const cashPurchases = purchasesInPeriod.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        const cashPurchaseReturns = purchaseReturnsInPeriod.reduce((sum, ret) => sum + (ret.paidAmount || 0), 0);
        
        const customerCollections = customerReceipts.filter(rec => rec.date >= start && rec.date <= end && (rec.paymentMethod === 'cash' || rec.paymentMethod === 'check')).reduce((sum, rec) => sum + rec.amount, 0);
        const supplierPaymentsInPeriod = supplierPayments.filter(p => p.date >= start && p.date <= end && (p.paymentMethod === 'cash' || p.paymentMethod === 'check')).reduce((sum, p) => sum + p.amount, 0);
        const expensesPaid = totalExpenses; // All expenses are paid from treasury
        
        const transfersInRange = treasuryTransfers.filter(tr => tr.date >= start && tr.date <= end);
        const treasuryTransfersIn = transfersInRange.reduce((sum, tr) => sum + tr.amount, 0);
        const treasuryTransfersOut = transfersInRange.reduce((sum, tr) => sum + tr.amount, 0);
        const transfersNet = 0; // Net is always 0 for the whole company, but we can show details

        setReportData({
            startDate: start,
            endDate: end,
            treasuryOpeningBalances,
            totalTreasuryOpening,
            inventoryOpeningBalances,
            totalInventoryOpening,
            customerOpeningBalances,
            totalCustomerOpening,
            supplierOpeningBalances,
            totalSupplierOpening,
            purchasesInPeriod,
            totalPurchases,
            totalPurchaseReturns,
            inventoryPurchases,
            inventoryPurchaseReturns,
            salesInPeriod,
            returnsInPeriod,
            netSales,
            cogsInPeriod,
            salesCogsInPeriod,
            returnsCogsInPeriod,
            grossProfit,
            expensesInPeriod: expensesInRange,
            totalExpenses,
            groupedExpenses,
            netProfit,
            cashSales,
            cashSalesReturns,
            cashPurchases,
            cashPurchaseReturns,
            customerCollections,
            supplierPaymentsInPeriod,
            expensesPaid,
            transfersNet,
            treasuryTransfersIn,
            treasuryTransfersOut,
            treasuryClosingBalances,
            totalTreasuryClosing,
            inventoryClosingBalances,
            totalInventoryClosing,
            customerClosingBalances,
            totalCustomerClosing,
            supplierClosingBalances,
            totalSupplierClosing
        });
    };

    const handlePrint = () => {
        if (!reportData) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert('الرجاء السماح بالنوافذ المنبثقة للطباعة.'); return; }

        const title = `التقرير العام`;
        const subtitle = `للفترة من ${formatDateForDisplay(reportData.startDate)} إلى ${formatDateForDisplay(reportData.endDate)}`;
        
        let html = `
            <style>
                .report-card {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 15px;
                    margin-bottom: 15px;
                    break-inside: avoid;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    width: 100%;
                    box-sizing: border-box;
                }
                .card-title {
                    font-size: 1.1rem;
                    font-weight: 900;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 8px;
                    margin-bottom: 12px;
                }
                .report-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                    font-size: 10pt;
                }
                .report-row.bold {
                    font-weight: 900;
                }
                .report-row.sub-item {
                    padding-right: 20px;
                    font-size: 9pt;
                    color: #4b5563;
                }
                .text-blue { color: #2563eb; }
                .text-purple { color: #9333ea; }
                .text-indigo { color: #4f46e5; }
                .text-red { color: #dc2626; }
                .text-green { color: #16a34a; }
                .text-orange { color: #ea580c; }
                .text-gray { color: #4b5563; }
                .bg-gray-50 { background-color: #f9fafb; }
            </style>

            <!-- 1. Opening Balances -->
            <div class="report-card">
                <h3 class="card-title text-blue">أرصدة أول المدة</h3>
                <div class="report-row bold"><span>إجمالي رصيد الخزينة أول المدة</span><span>${formatNumber(reportData.totalTreasuryOpening)}</span></div>
                ${reportData.treasuryOpeningBalances.map(b => `<div class="report-row sub-item"><span>- ${b.name}</span><span>${formatNumber(b.balance)}</span></div>`).join('')}
                <div class="report-row bold"><span>إجمالي رصيد البضاعة أول المدة (تكلفة)</span><span>${formatNumber(reportData.totalInventoryOpening)}</span></div>
                ${reportData.inventoryOpeningBalances.map(b => `<div class="report-row sub-item"><span>- ${b.warehouseName}</span><span>${formatNumber(b.balance)}</span></div>`).join('')}
                <div class="report-row bold"><span>إجمالي رصيد العملاء أول المدة</span><span>${formatNumber(reportData.totalCustomerOpening)}</span></div>
                <div class="report-row bold"><span>إجمالي رصيد الموردين أول المدة</span><span>${formatNumber(reportData.totalSupplierOpening)}</span></div>
            </div>

            <!-- 2. Purchases -->
            <div class="report-card">
                <h3 class="card-title text-purple">المشتريات خلال الفترة</h3>
                <div class="report-row bold"><span>إجمالي المشتريات</span><span>${formatNumber(reportData.totalPurchases)}</span></div>
                <div class="report-row bold text-red"><span>إجمالي مرتجع المشتريات</span><span>(${formatNumber(reportData.totalPurchaseReturns)})</span></div>
            </div>

            <!-- 2.1 Inventory Movement -->
            <div class="report-card">
                <h3 class="card-title text-green">حركة قيمة البضاعة بالمخازن</h3>
                <div class="report-row"><span>رصيد أول المدة (تكلفة)</span><span>${formatNumber(reportData.totalInventoryOpening)}</span></div>
                <div class="report-row text-green"><span>(+) مشتريات (تكلفة)</span><span>${formatNumber(reportData.inventoryPurchases)}</span></div>
                <div class="report-row text-red"><span>(-) مرتجع مشتريات (تكلفة)</span><span>(${formatNumber(reportData.inventoryPurchaseReturns)})</span></div>
                <div class="report-row text-red"><span>(-) تكلفة المبيعات</span><span>(${formatNumber(reportData.salesCogsInPeriod)})</span></div>
                <div class="report-row text-green"><span>(+) تكلفة مرتجع المبيعات</span><span>${formatNumber(reportData.returnsCogsInPeriod)}</span></div>
                <div class="report-row bold" style="border-top: 1px solid #eee; margin-top: 5px; padding-top: 5px;">
                    <span>رصيد آخر المدة (تكلفة)</span>
                    <span>${formatNumber(reportData.totalInventoryClosing)}</span>
                </div>
            </div>

            <!-- 3. Sales & Profits -->
            <div class="report-card">
                <h3 class="card-title text-indigo">المبيعات والأرباح</h3>
                <div class="report-row"><span>إجمالي المبيعات</span><span>${formatNumber(reportData.salesInPeriod)}</span></div>
                <div class="report-row"><span>إجمالي المرتجعات</span><span>${formatNumber(reportData.returnsInPeriod)}</span></div>
                <div class="report-row bold"><span>صافي المبيعات</span><span>${formatNumber(reportData.netSales)}</span></div>
                <div class="report-row text-red"><span>(-) تكلفة صافي المبيعات</span><span>(${formatNumber(reportData.cogsInPeriod)})</span></div>
                <div class="report-row bold text-blue"><span>هامش الربح (مجمل الربح)</span><span>${formatNumber(reportData.grossProfit)}</span></div>
            </div>

            <!-- 4. Expenses -->
            <div class="report-card">
                <h3 class="card-title text-red">المصروفات</h3>
                <div class="report-row bold text-red"><span>إجمالي المصروفات</span><span>(${formatNumber(reportData.totalExpenses)})</span></div>
                ${Object.entries(reportData.groupedExpenses).map(([name, amount]) => `<div class="report-row sub-item text-red"><span>- ${name}</span><span>(${formatNumber(amount)})</span></div>`).join('')}
            </div>

            <!-- 5. Net Profit -->
            <div class="report-card">
                <h3 class="card-title ${reportData.netProfit >= 0 ? 'text-green' : 'text-red'}">صافي الربح</h3>
                <div class="report-row bold" style="font-size: 1.2rem; color: ${reportData.netProfit >= 0 ? '#16a34a' : '#dc2626'};">
                    <span>صافي الربح للفترة</span>
                    <span>${formatNumber(reportData.netProfit)}</span>
                </div>
            </div>

            <!-- 6. Cash Flow -->
            <div class="report-card">
                <h3 class="card-title text-orange">تفاصيل حركة الخزينة</h3>
                <div class="report-row"><span>رصيد أول المدة</span><span>${formatNumber(reportData.totalTreasuryOpening)}</span></div>
                <div class="report-row text-green"><span>(+) مبيعات نقدية</span><span>${formatNumber(reportData.cashSales)}</span></div>
                <div class="report-row text-green"><span>(+) تحصيلات عملاء</span><span>${formatNumber(reportData.customerCollections)}</span></div>
                <div class="report-row text-green"><span>(+) مرتجع مشتريات نقدي</span><span>${formatNumber(reportData.cashPurchaseReturns)}</span></div>
                <div class="report-row text-red"><span>(-) مشتريات نقدية</span><span>(${formatNumber(reportData.cashPurchases)})</span></div>
                <div class="report-row text-red"><span>(-) مرتجع مبيعات نقدي</span><span>(${formatNumber(reportData.cashSalesReturns)})</span></div>
                <div class="report-row text-red"><span>(-) مدفوعات موردين</span><span>(${formatNumber(reportData.supplierPaymentsInPeriod)})</span></div>
                <div class="report-row text-red"><span>(-) مصروفات</span><span>(${formatNumber(reportData.expensesPaid)})</span></div>
                <div class="report-row bold" style="font-size: 1.1rem;"><span>رصيد الخزينة آخر المدة</span><span>${formatNumber(reportData.totalTreasuryClosing)}</span></div>
                <div style="margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px;">
                    <h4 style="font-size: 10pt; color: #666; margin-bottom: 5px;">التحويلات بين الخزائن خلال الفترة:</h4>
                    ${treasuryTransfers.filter(tr => tr.date >= reportData.startDate && tr.date <= reportData.endDate).length > 0 ? 
                        treasuryTransfers.filter(tr => tr.date >= reportData.startDate && tr.date <= reportData.endDate).map(tr => 
                            `<div class="report-row sub-item"><span>من ${treasuries.find(t => t.id === tr.fromTreasuryId)?.name} إلى ${treasuries.find(t => t.id === tr.toTreasuryId)?.name}</span><span>${formatNumber(tr.amount)}</span></div>`
                        ).join('') 
                        : '<div class="report-row sub-item"><span>لا توجد تحويلات</span><span></span></div>'
                    }
                </div>
            </div>

            <!-- 7. Closing Balances -->
            <div class="report-card">
                <h3 class="card-title text-gray">أرصدة آخر المدة</h3>
                <div class="report-row bold"><span>إجمالي رصيد الخزينة آخر المدة</span><span>${formatNumber(reportData.totalTreasuryClosing)}</span></div>
                ${reportData.treasuryClosingBalances.map(b => `<div class="report-row sub-item"><span>- ${b.name}</span><span>${formatNumber(b.balance)}</span></div>`).join('')}
                <div class="report-row bold"><span>إجمالي رصيد البضاعة آخر المدة (تكلفة)</span><span>${formatNumber(reportData.totalInventoryClosing)}</span></div>
                ${reportData.inventoryClosingBalances.map(b => `<div class="report-row sub-item"><span>- ${b.warehouseName}</span><span>${formatNumber(b.balance)}</span></div>`).join('')}
                <div class="report-row bold"><span>إجمالي رصيد العملاء آخر المدة</span><span>${formatNumber(reportData.totalCustomerClosing)}</span></div>
                <div class="report-row bold"><span>إجمالي رصيد الموردين آخر المدة</span><span>${formatNumber(reportData.totalSupplierClosing)}</span></div>
            </div>

            <!-- 8. Auditor Report -->
            <div class="report-card" style="background-color: #f8fafc; border-color: #cbd5e1;">
                <h3 class="card-title" style="color: #0f172a; border-bottom-color: #cbd5e1;">تقرير مراقب الحسابات (تحليل الأداء والتوصيات)</h3>
                <div style="margin-bottom: 15px;">
                    <h4 style="font-weight: bold; color: #334155; margin-bottom: 8px; font-size: 10pt;">تحليل الموقف المالي:</h4>
                    <ul style="margin: 0; padding-right: 20px; font-size: 10pt; color: #475569; line-height: 1.6;">
                        ${generateAuditorReport(reportData).analysis.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                <div>
                    <h4 style="font-weight: bold; color: #334155; margin-bottom: 8px; font-size: 10pt;">التوصيات لزيادة الإنتاج والربحية:</h4>
                    <ul style="margin: 0; padding-right: 20px; font-size: 10pt; color: #475569; line-height: 1.6;">
                        ${generateAuditorReport(reportData).suggestions.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;

        printWindow.document.write(getReportPrintTemplate(title, subtitle, companyData, [], html, undefined, undefined, undefined, 'A4', '#1e40af'));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-black dark:text-white">التقرير العام</h1>
            </div>

            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className={labelClass}>من تاريخ</label>
                        <input type="text" className={inputClass} {...startDateInputProps} />
                    </div>
                    <div>
                        <label className={labelClass}>إلى تاريخ</label>
                        <input type="text" className={inputClass} {...endDateInputProps} />
                    </div>
                    <button onClick={calculateReport} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-700 transition-all">
                        عرض التقرير
                    </button>
                </div>
            </div>

            {reportData && (
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="flex justify-end">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md">
                            <PrintIcon /> طباعة التقرير
                        </button>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* 1. Opening Balances */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">أرصدة أول المدة</h3>
                                <button onClick={() => setShowOpeningDetails(!showOpeningDetails)} className="text-gray-500 hover:text-blue-600 transition-colors">
                                    <ViewIcon />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between font-bold"><span>إجمالي رصيد الخزينة</span><FormattedNumber value={reportData.totalTreasuryOpening} /></div>
                                <div className="flex justify-between font-bold text-green-600"><span>إجمالي رصيد البضاعة (تكلفة)</span><FormattedNumber value={reportData.totalInventoryOpening} /></div>
                                <div className="flex justify-between font-bold text-orange-600"><span>إجمالي رصيد العملاء</span><FormattedNumber value={reportData.totalCustomerOpening} /></div>
                                <div className="flex justify-between font-bold text-red-600"><span>إجمالي رصيد الموردين</span><FormattedNumber value={reportData.totalSupplierOpening} /></div>
                                
                                {showOpeningDetails && (
                                    <div className="mt-4 pt-4 border-t space-y-6 animate-fade-in">
                                        <div>
                                            <h4 className="font-bold mb-2 text-sm text-gray-500">تفاصيل الخزائن:</h4>
                                            {reportData.treasuryOpeningBalances.map(b => (
                                                <div key={b.id} className="flex justify-between text-sm pr-4"><span>{b.name}</span><FormattedNumber value={b.balance} /></div>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2 text-sm text-gray-500">تفاصيل المخازن:</h4>
                                            {reportData.inventoryOpeningBalances.map(b => (
                                                <div key={b.warehouseId} className="flex justify-between text-sm pr-4"><span>{b.warehouseName}</span><FormattedNumber value={b.balance} /></div>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2 text-sm text-gray-500">تفاصيل العملاء:</h4>
                                            <div className="max-h-40 overflow-y-auto pr-4">
                                                {reportData.customerOpeningBalances.filter(b => b.balance !== 0).map(b => (
                                                    <div key={b.id} className="flex justify-between text-sm"><span>{b.name}</span><FormattedNumber value={b.balance} /></div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2 text-sm text-gray-500">تفاصيل الموردين:</h4>
                                            <div className="max-h-40 overflow-y-auto pr-4">
                                                {reportData.supplierOpeningBalances.filter(b => b.balance !== 0).map(b => (
                                                    <div key={b.id} className="flex justify-between text-sm"><span>{b.name}</span><FormattedNumber value={b.balance} /></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Purchases */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold text-purple-700 dark:text-purple-400">المشتريات خلال الفترة</h3>
                                <button onClick={() => setShowPurchaseDetails(!showPurchaseDetails)} className="text-gray-500 hover:text-purple-600 transition-colors">
                                    <ViewIcon />
                                </button>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between font-bold"><span>إجمالي المشتريات</span><FormattedNumber value={reportData.totalPurchases} /></div>
                                <div className="flex justify-between font-bold text-red-600"><span>إجمالي مرتجع المشتريات</span><span>(<FormattedNumber value={reportData.totalPurchaseReturns} />)</span></div>
                            </div>
                            {showPurchaseDetails && (
                                <div className="mt-4 pt-4 border-t space-y-2 max-h-60 overflow-y-auto animate-fade-in">
                                    <h4 className="font-bold text-xs text-gray-500 mb-2">الفواتير:</h4>
                                    {reportData.purchasesInPeriod.map(p => (
                                        <div key={p.id} className="flex justify-between text-xs p-1 border-b border-gray-50">
                                            <span>فاتورة {p.id} - {suppliers.find(s => s.id === p.supplierId)?.name}</span>
                                            <FormattedNumber value={(p.items.reduce((s, i) => s + i.price * i.quantity, 0) - p.discount) * (1 + p.tax / 100)} />
                                        </div>
                                    ))}
                                    {reportData.purchasesInPeriod.length === 0 && <p className="text-center text-gray-400">لا توجد مشتريات</p>}
                                </div>
                            )}
                        </div>

                        {/* 2.1 Inventory Movement */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold text-green-700 dark:text-green-400">حركة قيمة البضاعة بالمخازن</h3>
                                <button onClick={() => setShowInventoryMovementDetails(!showInventoryMovementDetails)} className="text-gray-500 hover:text-green-600 transition-colors">
                                    <ViewIcon />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm"><span>رصيد أول المدة (تكلفة)</span><FormattedNumber value={reportData.totalInventoryOpening} /></div>
                                <div className="flex justify-between text-sm text-green-600"><span>(+) مشتريات (تكلفة)</span><FormattedNumber value={reportData.inventoryPurchases} /></div>
                                <div className="flex justify-between text-sm text-red-600"><span>(-) مرتجع مشتريات (تكلفة)</span><span>(<FormattedNumber value={reportData.inventoryPurchaseReturns} />)</span></div>
                                <div className="flex justify-between text-sm text-red-600"><span>(-) تكلفة المبيعات</span><span>(<FormattedNumber value={reportData.salesCogsInPeriod} />)</span></div>
                                <div className="flex justify-between text-sm text-green-600"><span>(+) تكلفة مرتجع المبيعات</span><FormattedNumber value={reportData.returnsCogsInPeriod} /></div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2 text-green-700 dark:text-green-400">
                                    <span>رصيد آخر المدة (تكلفة)</span>
                                    <FormattedNumber value={reportData.totalInventoryClosing} />
                                </div>
                                {showInventoryMovementDetails && (
                                    <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs space-y-2 animate-fade-in">
                                        <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">معادلة رصيد المخزن:</p>
                                        <p className="flex justify-between"><span>رصيد أول:</span><FormattedNumber value={reportData.totalInventoryOpening} /></p>
                                        <p className="flex justify-between"><span>+ المشتريات:</span><FormattedNumber value={reportData.inventoryPurchases} /></p>
                                        <p className="flex justify-between"><span>- مرتجع مشتريات:</span><span>(<FormattedNumber value={reportData.inventoryPurchaseReturns} />)</span></p>
                                        <p className="flex justify-between"><span>- تكلفة المبيعات:</span><span>(<FormattedNumber value={reportData.salesCogsInPeriod} />)</span></p>
                                        <p className="flex justify-between"><span>+ تكلفة مرتجع مبيعات:</span><FormattedNumber value={reportData.returnsCogsInPeriod} /></p>
                                        <p className="flex justify-between border-t border-emerald-200 pt-1 font-bold"><span>= رصيد آخر:</span><FormattedNumber value={reportData.totalInventoryClosing} /></p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Sales & Profits */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400">المبيعات والأرباح</h3>
                                <button onClick={() => setShowSalesDetails(!showSalesDetails)} className="text-gray-500 hover:text-indigo-600 transition-colors">
                                    <ViewIcon />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between"><span>إجمالي المبيعات</span><FormattedNumber value={reportData.salesInPeriod} /></div>
                                <div className="flex justify-between text-red-500"><span>إجمالي المرتجعات</span><span>(<FormattedNumber value={reportData.returnsInPeriod} />)</span></div>
                                <div className="flex justify-between font-bold border-t pt-2"><span>صافي المبيعات</span><FormattedNumber value={reportData.netSales} /></div>
                                <div className="flex justify-between text-red-600 font-semibold"><span>(-) تكلفة صافي المبيعات</span><span>(<FormattedNumber value={reportData.cogsInPeriod} />)</span></div>
                                <div className="flex justify-between font-bold text-xl text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded mt-2">
                                    <span>هامش الربح (مجمل الربح)</span>
                                    <FormattedNumber value={reportData.grossProfit} />
                                </div>
                                {showSalesDetails && (
                                    <div className="mt-4 pt-4 border-t space-y-4 animate-fade-in">
                                        <div>
                                            <h4 className="font-bold mb-2 text-sm text-gray-500">أعلى الفواتير قيمة:</h4>
                                            {salesInvoices.filter(inv => inv.date >= reportData.startDate && inv.date <= reportData.endDate)
                                                .sort((a, b) => (b.items.reduce((s, i) => s + i.price * i.quantity, 0)) - (a.items.reduce((s, i) => s + i.price * i.quantity, 0)))
                                                .slice(0, 5)
                                                .map(inv => (
                                                    <div key={inv.id} className="flex justify-between text-xs pr-4">
                                                        <span>فاتورة {inv.id} - {customers.find(c => c.id === inv.customerId)?.name || 'نقدي'}</span>
                                                        <FormattedNumber value={inv.items.reduce((s, i) => s + i.price * i.quantity, 0)} />
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Expenses */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold text-red-700 dark:text-red-400">المصروفات</h3>
                                <button onClick={() => setShowExpenseDetails(!showExpenseDetails)} className="text-gray-500 hover:text-red-600 transition-colors">
                                    <ViewIcon />
                                </button>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-red-600"><span>إجمالي المصروفات</span><span>(<FormattedNumber value={reportData.totalExpenses} />)</span></div>
                            {showExpenseDetails && (
                                <div className="mt-4 pt-4 border-t space-y-2 animate-fade-in">
                                    {Object.entries(reportData.groupedExpenses).map(([name, amount]) => (
                                        <div key={name} className="flex justify-between text-sm pr-4"><span>{name}</span><span>(<FormattedNumber value={amount} />)</span></div>
                                    ))}
                                    <div className="mt-4">
                                        <h4 className="font-bold mb-2 text-sm text-gray-500">تفاصيل المصروفات:</h4>
                                        <div className="max-h-40 overflow-y-auto pr-4">
                                            {reportData.expensesInPeriod.map(e => (
                                                <div key={e.id} className="flex justify-between text-xs border-b border-gray-50 p-1">
                                                    <span>{formatDateForDisplay(e.date)} - {e.beneficiary}</span>
                                                    <FormattedNumber value={e.amount} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 5. Net Profit */}
                        <div className={`${cardClass} ${reportData.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <h3 className="text-xl font-bold mb-4 border-b pb-2 text-center">صافي الربح</h3>
                            <div className={`flex justify-between font-bold text-3xl p-4 rounded-lg ${reportData.netProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                <span>صافي الربح للفترة</span>
                                <FormattedNumber value={reportData.netProfit} />
                            </div>
                        </div>

                        {/* 6. Cash Flow */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400">تفاصيل حركة الخزينة</h3>
                                <button onClick={() => setShowCashFlowDetails(!showCashFlowDetails)} className="text-gray-500 hover:text-orange-600 transition-colors">
                                    <ViewIcon />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span>رصيد أول المدة</span><FormattedNumber value={reportData.totalTreasuryOpening} /></div>
                                    <div className="flex justify-between text-sm text-green-600"><span>(+) مبيعات نقدية</span><FormattedNumber value={reportData.cashSales} /></div>
                                    <div className="flex justify-between text-sm text-green-600"><span>(+) تحصيلات عملاء</span><FormattedNumber value={reportData.customerCollections} /></div>
                                    <div className="flex justify-between text-sm text-green-600"><span>(+) مرتجع مشتريات نقدي</span><FormattedNumber value={reportData.cashPurchaseReturns} /></div>
                                    <div className="flex justify-between text-sm text-red-600"><span>(-) مشتريات نقدية</span><span>(<FormattedNumber value={reportData.cashPurchases} />)</span></div>
                                    <div className="flex justify-between text-sm text-red-600"><span>(-) مرتجع مبيعات نقدي</span><span>(<FormattedNumber value={reportData.cashSalesReturns} />)</span></div>
                                    <div className="flex justify-between text-sm text-red-600"><span>(-) مدفوعات موردين</span><span>(<FormattedNumber value={reportData.supplierPaymentsInPeriod} />)</span></div>
                                    <div className="flex justify-between text-sm text-red-600"><span>(-) مصروفات</span><span>(<FormattedNumber value={reportData.expensesPaid} />)</span></div>
                                </div>
                                <div className="flex flex-col justify-center items-center bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                                    <span className="text-sm text-orange-600 font-bold mb-1">رصيد الخزينة آخر المدة</span>
                                    <span className="text-2xl font-bold text-orange-800"><FormattedNumber value={reportData.totalTreasuryClosing} /></span>
                                </div>
                            </div>
                            {showCashFlowDetails && (
                                <div className="mt-4 pt-4 border-t space-y-4 animate-fade-in">
                                    <div>
                                        <h4 className="font-bold mb-2 text-sm text-gray-500">آخر التحصيلات (نقدية وشيكات):</h4>
                                        {customerReceipts.filter(r => r.date >= reportData.startDate && r.date <= reportData.endDate && (r.paymentMethod === 'cash' || r.paymentMethod === 'check')).slice(-5).map(r => (
                                            <div key={r.id} className="flex justify-between text-xs pr-4"><span>{customers.find(c => c.id === r.customerId)?.name}</span><FormattedNumber value={r.amount} /></div>
                                        ))}
                                    </div>
                                    <div>
                                        <h4 className="font-bold mb-2 text-sm text-gray-500">آخر المدفوعات (نقدية وشيكات):</h4>
                                        {supplierPayments.filter(p => p.date >= reportData.startDate && p.date <= reportData.endDate && (p.paymentMethod === 'cash' || p.paymentMethod === 'check')).slice(-5).map(p => (
                                            <div key={p.id} className="flex justify-between text-xs pr-4"><span>{suppliers.find(s => s.id === p.supplierId)?.name}</span><FormattedNumber value={p.amount} /></div>
                                        ))}
                                    </div>
                                    <div>
                                        <h4 className="font-bold mb-2 text-sm text-gray-500">آخر التحويلات بين الخزائن:</h4>
                                        {treasuryTransfers.filter(tr => tr.date >= reportData.startDate && tr.date <= reportData.endDate).slice(-5).map(tr => (
                                            <div key={tr.id} className="flex justify-between text-xs pr-4">
                                                <span>من {treasuries.find(t => t.id === tr.fromTreasuryId)?.name} إلى {treasuries.find(t => t.id === tr.toTreasuryId)?.name}</span>
                                                <FormattedNumber value={tr.amount} />
                                            </div>
                                        ))}
                                        {treasuryTransfers.filter(tr => tr.date >= reportData.startDate && tr.date <= reportData.endDate).length === 0 && (
                                            <p className="text-xs text-gray-400 pr-4">لا توجد تحويلات خلال الفترة</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 7. Closing Balances */}
                        <div className={cardClass}>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-400">أرصدة آخر المدة</h3>
                                <button onClick={() => setShowClosingDetails(!showClosingDetails)} className="text-gray-500 hover:text-gray-600 transition-colors">
                                    <ViewIcon />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between font-bold"><span>إجمالي رصيد الخزينة</span><FormattedNumber value={reportData.totalTreasuryClosing} /></div>
                                <div className="flex justify-between font-bold text-green-600"><span>إجمالي رصيد البضاعة (تكلفة)</span><FormattedNumber value={reportData.totalInventoryClosing} /></div>
                                <div className="flex justify-between font-bold text-orange-600"><span>إجمالي رصيد العملاء</span><FormattedNumber value={reportData.totalCustomerClosing} /></div>
                                <div className="flex justify-between font-bold text-red-600"><span>إجمالي رصيد الموردين</span><FormattedNumber value={reportData.totalSupplierClosing} /></div>
                                
                                {showClosingDetails && (
                                    <div className="mt-4 pt-4 border-t space-y-6 animate-fade-in">
                                        <div>
                                            <h4 className="font-bold mb-2 text-sm text-gray-500">تفاصيل الخزائن:</h4>
                                            {reportData.treasuryClosingBalances.map(b => (
                                                <div key={b.id} className="flex justify-between text-sm pr-4"><span>{b.name}</span><FormattedNumber value={b.balance} /></div>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2 text-sm text-gray-500">تفاصيل المخازن:</h4>
                                            {reportData.inventoryClosingBalances.map(b => (
                                                <div key={b.warehouseId} className="flex justify-between text-sm pr-4"><span>{b.warehouseName}</span><FormattedNumber value={b.balance} /></div>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2 text-sm text-gray-500">تفاصيل العملاء:</h4>
                                            <div className="max-h-40 overflow-y-auto pr-4">
                                                {reportData.customerClosingBalances.filter(b => b.balance !== 0).map(b => (
                                                    <div key={b.id} className="flex justify-between text-sm"><span>{b.name}</span><FormattedNumber value={b.balance} /></div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2 text-sm text-gray-500">تفاصيل الموردين:</h4>
                                            <div className="max-h-40 overflow-y-auto pr-4">
                                                {reportData.supplierClosingBalances.filter(b => b.balance !== 0).map(b => (
                                                    <div key={b.id} className="flex justify-between text-sm"><span>{b.name}</span><FormattedNumber value={b.balance} /></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 8. Auditor Report */}
                        <div className={`${cardClass} bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 col-span-1 md:col-span-2 lg:col-span-3`}>
                            <h3 className="text-xl font-bold mb-4 border-b pb-2 text-slate-800 dark:text-slate-200">
                                تقرير مراقب الحسابات (تحليل الأداء والتوصيات)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-lg">تحليل الموقف المالي:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                        {generateAuditorReport(reportData).analysis.map((item, index) => (
                                            <li key={index} className="leading-relaxed">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-lg">التوصيات لزيادة الإنتاج والربحية:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                                        {generateAuditorReport(reportData).suggestions.map((item, index) => (
                                            <li key={index} className="leading-relaxed">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralReport;
