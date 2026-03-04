import { Treasury, CustomerReceipt, SupplierPayment, Expense, TreasuryTransfer, SalesInvoice, PurchaseInvoice, SalesReturn, PurchaseReturn, DefaultValues } from '../types';

export const calculateTreasuryBalance = (
    treasuryId: number,
    treasuries: Treasury[],
    customerReceipts: CustomerReceipt[],
    supplierPayments: SupplierPayment[],
    expenses: Expense[],
    treasuryTransfers: TreasuryTransfer[],
    salesInvoices: SalesInvoice[],
    purchaseInvoices: PurchaseInvoice[],
    salesReturns: SalesReturn[],
    purchaseReturns: PurchaseReturn[],
    defaultValues: DefaultValues,
    currentDocId?: number | string,
    currentDocType?: 'purchaseInvoice' | 'salesInvoice' | 'salesReturn' | 'purchaseReturn' | 'customerReceipt' | 'supplierPayment' | 'expense' | 'treasuryTransfer'
) => {
    const treasury = treasuries.find(t => t.id === treasuryId);
    if (!treasury) return 0;

    let balance = treasury.openingBalance;

    customerReceipts.forEach(rec => {
        if (currentDocType === 'customerReceipt' && String(rec.id) === String(currentDocId)) return;
        if (rec.treasuryId === treasuryId && ['cash', 'check'].includes(rec.paymentMethod)) {
            balance += rec.amount;
        }
    });

    supplierPayments.forEach(p => {
        if (currentDocType === 'supplierPayment' && String(p.id) === String(currentDocId)) return;
        if (p.treasuryId === treasuryId && ['cash', 'check'].includes(p.paymentMethod)) {
            balance -= p.amount;
        }
    });

    expenses.forEach(exp => {
        if (currentDocType === 'expense' && String(exp.id) === String(currentDocId)) return;
        if (exp.treasuryId === treasuryId) {
            balance -= exp.amount;
        }
    });

    treasuryTransfers.forEach(t => {
        if (currentDocType === 'treasuryTransfer' && String(t.id) === String(currentDocId)) return;
        if (t.fromTreasuryId === treasuryId) balance -= t.amount;
        if (t.toTreasuryId === treasuryId) balance += t.amount;
    });

    if (treasuryId === defaultValues.defaultTreasuryId) {
        salesInvoices.forEach(inv => {
            if (currentDocType === 'salesInvoice' && String(inv.id) === String(currentDocId)) return;
            if (inv.paidAmount) balance += inv.paidAmount;
        });

        purchaseInvoices.forEach(inv => {
            if (currentDocType === 'purchaseInvoice' && String(inv.id) === String(currentDocId)) return;
            if (inv.paidAmount) balance -= inv.paidAmount;
        });

        salesReturns.forEach(ret => {
            if (currentDocType === 'salesReturn' && String(ret.id) === String(currentDocId)) return;
            if (ret.paidAmount) balance -= ret.paidAmount;
        });

        purchaseReturns.forEach(ret => {
            if (currentDocType === 'purchaseReturn' && String(ret.id) === String(currentDocId)) return;
            if (ret.paidAmount) balance += ret.paidAmount;
        });
    }

    return balance;
};
