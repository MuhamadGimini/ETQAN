
import React, { useState, useMemo } from 'react';
import { Modal, ConfirmationModal, EditIcon, DeleteIcon, ViewIcon, FormattedNumber, PlusCircleIcon } from './Shared';
import type { Treasury, NotificationType, SalesInvoice, PurchaseInvoice, SalesReturn, PurchaseReturn, CustomerReceipt, SupplierPayment, Expense, MgmtUser, TreasuryTransfer, DefaultValues, Employee } from '../types';

interface TreasuryManagementProps {
    treasuries: Treasury[];
    setTreasuries: React.Dispatch<React.SetStateAction<Treasury[]>>;
    showNotification: (type: NotificationType) => void;
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    salesReturns: SalesReturn[];
    purchaseReturns: PurchaseReturn[];
    customerReceipts: CustomerReceipt[];
    supplierPayments: SupplierPayment[];
    expenses: Expense[];
    treasuryTransfers: TreasuryTransfer[];
    currentUser: MgmtUser;
    defaultValues: DefaultValues;
    employees: Employee[];
}

const TreasuryManagement: React.FC<TreasuryManagementProps> = ({ 
    treasuries, setTreasuries, showNotification, salesInvoices, purchaseInvoices, salesReturns,
    purchaseReturns, customerReceipts, supplierPayments, expenses, treasuryTransfers, currentUser, defaultValues, employees
}) => {
    const accountsEmployees = useMemo(() => employees.filter(emp => emp.departmentId === 2), [employees]);
    const initialFormState = { id: null, name: '', keeper: '', openingBalance: 0 };
    const [formData, setFormData] = useState<Omit<Treasury, 'id'> & { id: number | null }>({ ...initialFormState, openingBalance: NaN });
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [deleteConfirmationStep, setDeleteConfirmationStep] = useState(0);
    const [treasuryToDelete, setTreasuryToDelete] = useState<Treasury | null>(null);

    const canEdit = currentUser.permissions.includes('treasuryManagement_edit');
    const canDelete = currentUser.permissions.includes('treasuryManagement_delete');

    const calculateCurrentBalance = (treasuryId: number) => {
        const treasury = treasuries.find(t => t.id === treasuryId);
        if (!treasury) return 0;

        let balance = treasury.openingBalance;

        // 1. Receipts (Cash/Check)
        customerReceipts.forEach(rec => {
            if (rec.treasuryId === treasuryId && (rec.paymentMethod === 'cash' || rec.paymentMethod === 'check')) {
                balance += rec.amount;
            }
        });

        // 2. Payments (Cash/Check)
        supplierPayments.forEach(p => {
            if (p.treasuryId === treasuryId && (p.paymentMethod === 'cash' || p.paymentMethod === 'check')) {
                balance -= p.amount;
            }
        });
        
        // 3. Expenses
        expenses.forEach(exp => {
            if(exp.treasuryId === treasuryId){
                balance -= exp.amount;
            }
        });
        
        // 4. Transfers
        treasuryTransfers.forEach(t => {
            if (t.fromTreasuryId === treasuryId) {
                balance -= t.amount;
            }
            if (t.toTreasuryId === treasuryId) {
                balance += t.amount;
            }
        });

        // 5. Direct Invoice Payments (Assumed to go to DEFAULT TREASURY if not specified otherwise in a robust system, 
        // here we only count them if this treasury IS the default one, or if we assume single treasury logic for invoices)
        if (treasuryId === defaultValues.defaultTreasuryId) {
            // Add Sales Payments
            salesInvoices.forEach(inv => {
                if (inv.paidAmount && inv.paidAmount > 0) {
                    balance += inv.paidAmount;
                }
            });
            // Subtract Purchase Payments
            purchaseInvoices.forEach(inv => {
                if (inv.paidAmount && inv.paidAmount > 0) {
                    balance -= inv.paidAmount;
                }
            });
            // Subtract Sales Return Refunds
            salesReturns.forEach(ret => {
                if (ret.paidAmount && ret.paidAmount > 0) {
                    balance -= ret.paidAmount;
                }
            });
            // Add Purchase Return Refunds
            purchaseReturns.forEach(ret => {
                if (ret.paidAmount && ret.paidAmount > 0) {
                    balance += ret.paidAmount;
                }
            });
        }

        return balance;
    };


        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['openingBalance'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;
        if (!formData.name) {
            alert("اسم الخزينة مطلوب.");
            return;
        }

        if (isEditing && formData.id) {
            if (!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
            setTreasuries(treasuries.map(t => t.id === formData.id ? { ...t, name: formData.name, keeper: formData.keeper, openingBalance: formData.openingBalance || 0 } : t));
            showNotification('edit');
        } else {
            const newTreasury: Treasury = {
                id: Date.now(),
                name: formData.name,
                keeper: formData.keeper,
                openingBalance: formData.openingBalance || 0,
            };
            setTreasuries([...treasuries, newTreasury]);
            showNotification('add');
        }
        resetForm();
    };

    const handleEdit = (treasury: Treasury, viewOnly: boolean) => {
        setIsEditing(true);
        setIsViewing(viewOnly);
        setFormData(treasury);
        setIsModalOpen(true);
    };

    const handleDelete = (treasury: Treasury) => {
        setTreasuryToDelete(treasury);
        setDeleteConfirmationStep(1);
    };

    const performDelete = () => {
        if (treasuryToDelete) {
            setTreasuries(treasuries.filter(t => t.id !== treasuryToDelete.id));
            showNotification('delete');
        }
        resetDeleteProcess();
    };

    const resetDeleteProcess = () => {
        setDeleteConfirmationStep(0);
        setTreasuryToDelete(null);
    };

    const resetForm = () => {
        setIsEditing(false);
        setIsViewing(false);
        setFormData({ ...initialFormState, openingBalance: NaN });
        setIsModalOpen(false);
    };

    const renderDeleteConfirmationModal = () => {
        if (!treasuryToDelete) return null;
        switch (deleteConfirmationStep) {
            case 1: return <ConfirmationModal title="الخطوة 1 من 3" message={`هل أنت متأكد من حذف خزينة "${treasuryToDelete.name}"؟`} onConfirm={() => setDeleteConfirmationStep(2)} onCancel={resetDeleteProcess} confirmText="نعم، متابعة" confirmColor="bg-red-600" />;
            case 2: return <ConfirmationModal title="الخطوة 2 من 3" message="هذا الإجراء لا يمكن التراجع عنه." onConfirm={() => setDeleteConfirmationStep(3)} onCancel={resetDeleteProcess} confirmText="أنا أفهم، استمر" confirmColor="bg-red-700" />;
            case 3: return <ConfirmationModal title="الخطوة 3 من 3" message="سيتم حذف الخزينة نهائياً. اضغط 'حذف نهائي' للتأكيد." onConfirm={performDelete} onCancel={resetDeleteProcess} confirmText="حذف نهائي" confirmColor="bg-red-800" />;
            default: return null;
        }
    };

    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";
    const requiredSpan = <span className="text-red-500 dark:text-red-400 font-normal text-sm mr-1">(مطلوب)</span>;

    return (
        <>
            {renderDeleteConfirmationModal()}
            <Modal
                title={isViewing ? 'عرض بيانات الخزينة' : isEditing ? 'تعديل بيانات الخزينة' : 'إضافة خزينة جديدة'}
                show={isModalOpen}
                onClose={resetForm}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass} htmlFor="name">اسم الخزينة {requiredSpan}</label>
                            <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} className={inputClass} required disabled={isViewing} />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="keeper">أمين الخزينة</label>
                            <select id="keeper" name="keeper" value={formData.keeper} onChange={handleInputChange} className={inputClass} disabled={isViewing}>
                                <option value="">اختر أمين الخزينة</option>
                                {accountsEmployees.map(emp => (
                                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="openingBalance">رصيد أول المدة</label>
                            <input id="openingBalance" name="openingBalance" type="number" step="0.01" value={isNaN(formData.openingBalance) ? '' : formData.openingBalance} onChange={handleInputChange} className={inputClass} disabled={isViewing} />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        {!isViewing && (
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold h-12 rounded-lg shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                <PlusCircleIcon className="h-5 w-5" />
                                <span>{isEditing ? 'تحديث الخزينة' : 'إضافة خزينة'}</span>
                            </button>
                        )}
                    </div>
                </form>
            </Modal>
            <div className="space-y-8">
                <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">سجل الخزائن</h2>
                        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <PlusCircleIcon className="h-5 w-5" />
                            <span>إضافة خزينة جديدة</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="border-b-2 border-gray-300 dark:border-gray-600">
                                <tr>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">اسم الخزينة</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">أمين الخزينة</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">رصيد أول المدة</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الرصيد الحالي</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {treasuries.map((t) => (
                                    <tr key={t.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                        <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{t.name}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{t.keeper}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300"><FormattedNumber value={t.openingBalance} /></td>
                                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400"><FormattedNumber value={calculateCurrentBalance(t.id)} /></td>
                                        <td className="p-3">
                                            <div className="flex space-x-2 space-x-reverse">
                                                <button onClick={() => handleEdit(t, !canEdit)} className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors duration-200" title={canEdit ? 'تعديل' : 'عرض'}>
                                                    {canEdit ? <EditIcon /> : <ViewIcon />}
                                                </button>
                                                {canDelete && <button onClick={() => handleDelete(t)} className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors duration-200" title="حذف"><DeleteIcon /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TreasuryManagement;
