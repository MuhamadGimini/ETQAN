

import React, { useState, useMemo, useEffect } from 'react';
import type { TreasuryTransfer, Treasury, NotificationType, MgmtUser, CustomerReceipt, SupplierPayment, Expense, SalesInvoice, PurchaseInvoice, SalesReturn, PurchaseReturn, DefaultValues } from '../types';
import { ConfirmationModal, DeleteIcon, EditIcon, ViewIcon, PrintIcon, WhatsAppIcon } from './Shared';
import { useDateInput } from '../hooks/useDateInput';

import { calculateTreasuryBalance } from '../utils/calculations';

interface TreasuryTransferManagementProps {
    treasuryTransfers: TreasuryTransfer[];
    setTreasuryTransfers: React.Dispatch<React.SetStateAction<TreasuryTransfer[]>>;
    treasuries: Treasury[];
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
    customerReceipts: CustomerReceipt[];
    supplierPayments: SupplierPayment[];
    expenses: Expense[];
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    salesReturns: SalesReturn[];
    purchaseReturns: PurchaseReturn[];
    defaultValues: DefaultValues;
    // FIX: Added draft and isEditing props to resolve TS error in App.tsx
    draft: any;
    setDraft: React.Dispatch<React.SetStateAction<any>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

const TreasuryTransferManagement: React.FC<TreasuryTransferManagementProps> = ({
    treasuryTransfers,
    setTreasuryTransfers,
    treasuries,
    showNotification,
    currentUser,
    customerReceipts,
    supplierPayments,
    expenses,
    salesInvoices,
    purchaseInvoices,
    salesReturns,
    purchaseReturns,
    defaultValues,
    draft, setDraft, isEditing, setIsEditing
}) => {
    const getNextTransferId = () => {
        return treasuryTransfers.length > 0 ? Math.max(...treasuryTransfers.map(t => t.id)) + 1 : 1;
    };
    
    const initialTransferState: Omit<TreasuryTransfer, 'id' | 'createdBy' | 'createdAt'> & { id: number | null } = {
        id: null,
        date: new Date().toISOString().split('T')[0],
        fromTreasuryId: 0,
        toTreasuryId: 0,
        amount: NaN,
        notes: '',
    };

    // FIX: Use draft if available to persist form data across view switches.
    const newTransfer = draft || { ...initialTransferState, amount: NaN };
    const setNewTransfer = (action: any) => {
        if (typeof action === 'function') {
            setDraft(prev => action(prev || { ...initialTransferState, amount: NaN }));
        } else {
            setDraft(action);
        }
    };

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transferToDelete, setTransferToDelete] = useState<TreasuryTransfer | null>(null);
    const [isViewing, setIsViewing] = useState(false);

    const canDelete = currentUser.permissions.includes('treasuryTransfer_delete');
    const canEditDate = currentUser.permissions.includes('treasuryTransfer_editDate');
    const isAdmin = currentUser.id === 1; // Check if user is Admin

    const dateInputProps = useDateInput(newTransfer.date, (d) => setNewTransfer((prev: any) => ({ ...prev, date: d })));

    const calculateCurrentBalance = (treasuryId: number, currentTransfers: TreasuryTransfer[]) => {
        return calculateTreasuryBalance(treasuryId, treasuries, customerReceipts, supplierPayments, expenses, currentTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues);
    };

    const treasuryBalances = useMemo(() => {
        const balances = new Map<number, number>();
        treasuries.forEach(t => {
            // Calculate balance using existing transfers, NOT including the current form data (unless editing)
            // But for display we usually want the current state.
            balances.set(t.id, calculateCurrentBalance(t.id, treasuryTransfers));
        });
        return balances;
    }, [treasuries, customerReceipts, supplierPayments, expenses, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['fromTreasuryId', 'toTreasuryId', 'amount'].includes(name);
        setNewTransfer((prev: any) => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
    };
    
    const resetForm = () => {
        setDraft(null);
        setIsEditing(false);
        setIsViewing(false);
    };

    const handleSaveTransfer = () => {
        if (isViewing) return;

        if (!newTransfer.fromTreasuryId || !newTransfer.toTreasuryId || isNaN(newTransfer.amount) || newTransfer.amount <= 0) {
            alert("يرجى اختيار الخزائن وإدخال مبلغ صحيح.");
            return;
        }
        if (newTransfer.fromTreasuryId === newTransfer.toTreasuryId) {
            alert("لا يمكن التحويل إلى نفس الخزينة.");
            return;
        }

        // Balance Check
        // If editing, we should technically exclude the current transaction's effect, but simplistic check is usually acceptable for now
        // A better approach is checking balance BEFORE this transaction.
        const balanceBeforeTransfer = calculateCurrentBalance(newTransfer.fromTreasuryId, treasuryTransfers.filter(t => t.id !== newTransfer.id));
        
        if (newTransfer.amount > balanceBeforeTransfer) {
            alert(`خطأ: رصيد "من خزينة" غير كافٍ.\nالرصيد المتاح: ${balanceBeforeTransfer.toFixed(2)}\nالمبلغ المطلوب: ${newTransfer.amount.toFixed(2)}`);
            return;
        }
        
        if (isEditing && newTransfer.id) {
            setTreasuryTransfers(prev => prev.map(t => t.id === newTransfer.id ? { ...t, ...newTransfer, id: newTransfer.id! } : t));
            showNotification('edit');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل تحويل خزينة رقم ${newTransfer.id} بمبلغ ${newTransfer.amount}` }));
        } else {
            const createdTransfer = { ...newTransfer, amount: newTransfer.amount, id: getNextTransferId(), createdBy: currentUser.username, createdAt: new Date().toISOString() };
            setTreasuryTransfers(prev => [...prev, createdTransfer]);
            showNotification('add');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإنشاء تحويل خزينة رقم ${createdTransfer.id} بمبلغ ${createdTransfer.amount}` }));
        }
        
        resetForm();
    };
    
    const handleDelete = (transfer: TreasuryTransfer) => {
        setTransferToDelete(transfer);
        setIsDeleteModalOpen(true);
    };

    const performDelete = () => {
        if (!transferToDelete) return;

        setTreasuryTransfers(prev => prev.filter(t => t.id !== transferToDelete.id));
        showNotification('delete');
        setIsDeleteModalOpen(false);
        setTransferToDelete(null);
    };

    const handleEdit = (transfer: TreasuryTransfer) => {
        setDraft(transfer);
        setIsEditing(true);
        setIsViewing(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleView = (transfer: TreasuryTransfer) => {
        setDraft(transfer);
        setIsEditing(false);
        setIsViewing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrint = (transfer: TreasuryTransfer) => {
        const fromTreasury = treasuries.find(t => t.id === transfer.fromTreasuryId)?.name;
        const toTreasury = treasuries.find(t => t.id === transfer.toTreasuryId)?.name;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html dir="rtl">
                <head>
                    <title>إيصال تحويل نقدية #${transfer.id}</title>
                    <style>
                        body { font-family: 'Cairo', sans-serif; padding: 40px; }
                        .container { border: 2px solid #000; padding: 20px; border-radius: 10px; }
                        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 18px; }
                        .amount { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; border: 1px solid #ccc; padding: 10px; }
                        .footer { margin-top: 50px; display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>إيصال تحويل نقدية</h2>
                            <p>رقم التحويل: ${transfer.id}</p>
                            <p>التاريخ: ${new Date(transfer.date).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <div class="row">
                            <div><strong>من خزينة:</strong> ${fromTreasury}</div>
                            <div><strong>إلى خزينة:</strong> ${toTreasury}</div>
                        </div>
                        <div class="amount">
                            المبلغ: ${transfer.amount.toFixed(2)} ج.م
                        </div>
                        <p><strong>ملاحظات:</strong> ${transfer.notes || 'لا يوجد'}</p>
                        <p><strong>تم بواسطة:</strong> ${transfer.createdBy || 'غير معروف'}</p>
                        
                        <div class="footer">
                            <div>توقيع المستلم</div>
                            <div>توقيع المسلم</div>
                            <div>المدير المسؤول</div>
                        </div>
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-1";
    
    return (
        <div className="space-y-6">
             {isDeleteModalOpen && <ConfirmationModal title="تأكيد الحذف" message={`هل أنت متأكد من حذف التحويل رقم ${transferToDelete?.id}؟`} onConfirm={performDelete} onCancel={() => setIsDeleteModalOpen(false)} confirmText="حذف" confirmColor="bg-red-600" />}

             <h1 className="text-3xl font-bold text-amber-800 dark:text-amber-300">إدارة تحويلات الخزينة</h1>
            <div className={cardClass}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                    {isViewing ? `عرض تفاصيل التحويل رقم ${newTransfer.id}` : isEditing ? `تعديل التحويل رقم ${newTransfer.id}` : 'إنشاء تحويل جديد'}
                </h2>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveTransfer(); }} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start mb-4">
                    <div>
                        <label className={labelClass}>التاريخ</label>
                        <input type="text" {...dateInputProps} className={inputClass} disabled={isViewing || (isEditing && !canEditDate)} />
                    </div>
                    <div>
                        <label className={labelClass}>من خزينة</label>
                        <select name="fromTreasuryId" value={newTransfer.fromTreasuryId} onChange={handleInputChange} className={inputClass} required disabled={isViewing}>
                            <option value={0} disabled>اختر خزينة...</option>
                            {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                         {newTransfer.fromTreasuryId > 0 && 
                            <p className="text-lg mt-1 font-bold text-blue-800 dark:text-blue-300">الرصيد: {treasuryBalances.get(newTransfer.fromTreasuryId)?.toFixed(2)}</p>
                        }
                    </div>
                     <div>
                        <label className={labelClass}>إلى خزينة</label>
                        <select name="toTreasuryId" value={newTransfer.toTreasuryId} onChange={handleInputChange} className={inputClass} required disabled={isViewing}>
                            <option value={0} disabled>اختر خزينة...</option>
                            {treasuries.filter(t => t.id !== newTransfer.fromTreasuryId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        {newTransfer.toTreasuryId > 0 && 
                            <p className="text-lg mt-1 font-bold text-blue-800 dark:text-blue-300">الرصيد: {treasuryBalances.get(newTransfer.toTreasuryId)?.toFixed(2)}</p>
                        }
                    </div>
                     <div>
                        <label className={labelClass}>المبلغ</label>
                        <input type="number" name="amount" min="0.01" step="0.01" placeholder="0.00" value={isNaN(newTransfer.amount) ? '' : newTransfer.amount} onChange={handleInputChange} className={inputClass} required disabled={isViewing}/>
                    </div>
                    <div className="md:col-span-4">
                        <label className={labelClass}>ملاحظات</label>
                        <input type="text" name="notes" value={newTransfer.notes || ''} onChange={handleInputChange} className={inputClass} disabled={isViewing}/>
                    </div>
                    <div className="flex items-end space-x-2 space-x-reverse">
                        {(isEditing || isViewing) && <button onClick={resetForm} type="button" className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-600 h-11">إلغاء / عودة</button>}
                        {!isViewing && <button type="submit" className="bg-amber-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-amber-600 h-11">{isEditing ? 'حفظ التعديل' : 'حفظ التحويل'}</button>}
                    </div>
                </form>
            </div>

             <div className={cardClass}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">التحويلات السابقة</h2>
                 <div className="overflow-auto max-h-[60vh]">
                     <table className="w-full text-right">
                         <thead className="sticky top-0 z-10">
                             <tr className="border-b-2 border-gray-400/50 dark:border-gray-500/50 bg-gray-200 dark:bg-gray-800">
                                 {['رقم التحويل', 'التاريخ', 'من خزينة', 'إلى خزينة', 'المبلغ', 'ملاحظات', 'تم بواسطة', 'إجراءات'].map(h => <th key={h} className="p-2 text-md font-semibold text-gray-600 dark:text-gray-400">{h}</th>)}
                             </tr>
                         </thead>
                         <tbody>
                            {treasuryTransfers.slice().reverse().map(t => (
                                <tr key={t.id} className="border-b border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-200">
                                    <td className="p-2 font-medium">{t.id}</td>
                                    <td className="p-2">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                                    <td className="p-2">{treasuries.find(tr=>tr.id === t.fromTreasuryId)?.name || 'N/A'}</td>
                                    <td className="p-2">{treasuries.find(tr=>tr.id === t.toTreasuryId)?.name || 'N/A'}</td>
                                    <td className="p-2 font-semibold">{t.amount.toFixed(2)}</td>
                                    <td className="p-2">{t.notes}</td>
                                    <td className="p-2">{t.createdBy || 'غير مسجل'}</td>
                                    <td className="p-2">
                                        <div className="flex space-x-1 space-x-reverse">
                                            {isAdmin && (
                                                <button onClick={() => handleEdit(t)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" title="تعديل (مدير فقط)">
                                                    <EditIcon />
                                                </button>
                                            )}
                                            <button onClick={() => handleView(t)} className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title="عرض التفاصيل">
                                                <ViewIcon />
                                            </button>
                                            <button onClick={() => handlePrint(t)} className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title="طباعة">
                                                <PrintIcon />
                                            </button>
                                            <button onClick={() => {
                                                const fromTreasury = treasuries.find(tr => tr.id === t.fromTreasuryId)?.name || 'N/A';
                                                const toTreasury = treasuries.find(tr => tr.id === t.toTreasuryId)?.name || 'N/A';
                                                const text = `تحويل خزينة رقم: ${t.id}%0Aالتاريخ: ${new Date(t.date).toLocaleDateString('ar-EG')}%0Aمن: ${fromTreasury}%0Aإلى: ${toTreasury}%0Aالمبلغ: ${t.amount.toFixed(2)}${defaultValues.whatsappFooter ? '%0A' + encodeURIComponent(defaultValues.whatsappFooter) : ''}`;
                                                window.open(`https://wa.me/?text=${text}`, '_blank');
                                            }} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="واتساب"><WhatsAppIcon /></button>
                                            {canDelete && <button onClick={() => handleDelete(t)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                                <DeleteIcon />
                                            </button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                 </div>
            </div>
        </div>
    )
}

export default TreasuryTransferManagement;
