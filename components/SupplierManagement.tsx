
import React, { useState, useMemo, useRef } from 'react';
import { Modal, ConfirmationModal, EditIcon, DeleteIcon, UploadIcon, DownloadIcon, ViewIcon, FormattedNumber, PlusCircleIcon } from './Shared';
import type { Supplier, NotificationType, MgmtUser, PurchaseInvoice, PurchaseReturn, SupplierPayment } from '../types';
import { exportToExcel, readFromExcel } from '../services/excel';
import { searchMatch } from '../utils';

interface SupplierManagementProps {
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    supplierPayments: SupplierPayment[];
}

const SupplierManagement: React.FC<SupplierManagementProps> = ({ suppliers, setSuppliers, showNotification, currentUser, purchaseInvoices, purchaseReturns, supplierPayments }) => {
    const initialFormState: Omit<Supplier, 'id' | 'createdBy' | 'createdAt'> & { id: number | null } = { id: null, name: '', phone: '', address: '', openingBalance: NaN };
    const [formData, setFormData] = useState(initialFormState);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const canEdit = currentUser.permissions.includes('supplierManagement_edit');
    const canDelete = currentUser.permissions.includes('supplierManagement_delete');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['openingBalance'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;
        if (!formData.name) {
            alert("اسم المورد مطلوب.");
            return;
        }

        if (isEditing && formData.id) {
             if (!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
            setSuppliers(suppliers.map(s => s.id === formData.id ? { 
                ...s, 
                ...formData, 
                id: formData.id!,
                openingBalance: formData.openingBalance || 0,
                lastModifiedBy: currentUser.username,
                lastModifiedAt: new Date().toISOString()
            } : s));
            showNotification('edit');
        } else {
            const newSupplier: Supplier = {
                id: Date.now(),
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                openingBalance: formData.openingBalance || 0,
                createdBy: currentUser.username,
                createdAt: new Date().toISOString()
            };
            setSuppliers([...suppliers, newSupplier]);
            showNotification('add');
        }
        resetForm();
    };
    
    const handleEdit = (supplier: Supplier, viewOnly: boolean) => { 
        setIsEditing(true); 
        setIsViewing(viewOnly);
        setFormData(supplier); 
        setIsModalOpen(true);
    };

    const handleDelete = (supplier: Supplier) => { 
        const hasTransactions = purchaseInvoices.some(inv => inv.supplierId === supplier.id) ||
                              purchaseReturns.some(ret => ret.supplierId === supplier.id) ||
                              supplierPayments.some(p => p.supplierId === supplier.id);
        if (hasTransactions) {
            alert(`لا يمكن حذف المورد "${supplier.name}" لوجود حركات مسجلة باسمه.`);
            return;
        }
        setSupplierToDelete(supplier); 
        setIsDeleteModalOpen(true); 
    };

    const performDelete = () => { 
        if (supplierToDelete) { 
            setSuppliers(suppliers.filter(s => s.id !== supplierToDelete.id)); 
            showNotification('delete'); 
        } 
        cancelDelete(); 
    };

    const cancelDelete = () => { setIsDeleteModalOpen(false); setSupplierToDelete(null); };

    const resetForm = () => { 
        setIsEditing(false); 
        setIsViewing(false);
        setFormData(initialFormState); 
        setIsModalOpen(false);
    };

    const displayedSuppliers = useMemo(() => {
        return suppliers
            .filter(s => searchMatch(s.name, searchQuery) || searchMatch(s.phone, searchQuery))
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [suppliers, searchQuery]);

    const stats = useMemo(() => {
        let debitTotal = 0; // علينا للمورد (رصيد موجب للمورد في النظام المحاسبي المورد دائن)
        let creditTotal = 0; // لنا عند المورد
        displayedSuppliers.forEach(s => {
            if (s.openingBalance > 0) debitTotal += s.openingBalance;
            else if (s.openingBalance < 0) creditTotal += Math.abs(s.openingBalance);
        });
        return { debitTotal, creditTotal, count: displayedSuppliers.length };
    }, [displayedSuppliers]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-black dark:text-white font-bold placeholder-gray-500 transition-all duration-200 disabled:opacity-70 text-base";
    const labelClass = "block text-black dark:text-gray-200 font-bold mb-1 text-sm";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:text-white";

    return (
        <div className="space-y-6">
            {isDeleteModalOpen && supplierToDelete && (
                <ConfirmationModal 
                    title="تأكيد الحذف" 
                    message={`هل أنت متأكد من حذف المورد "${supplierToDelete.name}"؟`} 
                    onConfirm={performDelete} 
                    onCancel={cancelDelete} 
                    confirmText="حذف" 
                    confirmColor="bg-red-600" 
                />
            )}

            <Modal
                title={isViewing ? 'عرض بيانات المورد' : isEditing ? 'تعديل بيانات المورد' : 'تكويد مورد جديد'}
                show={isModalOpen}
                onClose={resetForm}
            >
                <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
                    <div className="w-full">
                        <label className={labelClass}>اسم المورد</label>
                        <input name="name" type="text" value={formData.name} onChange={handleInputChange} className={inputClass} required disabled={isViewing} placeholder="مثال: شركة النيل للتجارة" />
                    </div>
                    
                    <div className="w-full">
                        <label className={labelClass}>رقم الموبايل</label>
                        <input name="phone" type="text" value={formData.phone} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="01XXXXXXXXX" />
                    </div>
                    
                    <div className="w-full">
                        <label className={labelClass}>العنوان / المقر</label>
                        <input name="address" type="text" value={formData.address} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="المحافظة - المدينة - المنطقة" />
                    </div>
                    
                    <div className="w-full">
                        <label className={labelClass}>رصيد أول المدة (له/دائن)</label>
                        <input name="openingBalance" type="number" step="0.01" value={isNaN(formData.openingBalance) ? '' : formData.openingBalance} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="0.00" />
                        <p className="text-[10px] text-gray-500 mt-1 dark:text-gray-400 font-bold">* المبالغ الموجبة تعني رصيد للمورد (علينا له)</p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        {!isViewing && (
                            <button type="submit" className="w-full bg-emerald-600 text-white font-bold h-12 rounded-lg shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 mb-3">
                                <PlusCircleIcon className="h-5 w-5" />
                                <span>{isEditing ? 'تحديث البيانات' : 'حفظ بيانات المورد'}</span>
                            </button>
                        )}
                        <input type="file" ref={importFileRef} onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                                const jsonData = await readFromExcel(file);
                                if (jsonData.length === 0) throw new Error("الملف فارغ");
                                const newSuppliers: Supplier[] = jsonData.map((row: any, i) => ({
                                    id: Date.now() + i,
                                    name: row['الاسم'] || row['name'] || row['Name'],
                                    phone: (row['رقم الهاتف'] || row['phone'] || row['Phone'] || '').toString(),
                                    address: (row['العنوان'] || row['address'] || row['Address'] || '').toString(),
                                    openingBalance: parseFloat(row['رصيد أول المدة'] || row['openingBalance'] || 0) || 0,
                                    createdBy: currentUser.username,
                                    createdAt: new Date().toISOString()
                                })).filter(s => s.name);
                                setSuppliers(prev => [...prev, ...newSuppliers]);
                                showNotification('add');
                            } catch (err) { alert('فشل الاستيراد'); }
                            if (e.target) e.target.value = '';
                        }} accept=".xlsx, .xls, .csv" className="hidden" />
                    </div>
                </form>
            </Modal>

            {/* Permanent Supplier Log Section */}
            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">سجل الموردين</h2>
                        <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <PlusCircleIcon className="h-5 w-5" />
                            <span>إضافة مورد جديد</span>
                        </button>
                        <button type="button" onClick={() => importFileRef.current?.click()} className="bg-gray-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <UploadIcon className="h-4 w-4 text-white" />
                            <span>استيراد Excel</span>
                        </button>
                        <button type="button" onClick={() => {
                            const data = displayedSuppliers.map(s => ({ 'الاسم': s.name, 'رقم الهاتف': s.phone, 'العنوان': s.address, 'رصيد أول المدة': s.openingBalance }));
                            exportToExcel(data, 'الموردين');
                        }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <DownloadIcon className="h-4 w-4 text-white" />
                            <span>تصدير Excel</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">عدد الموردين</p>
                            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{stats.count}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي أرصدة (لهم)</p>
                            <p className="text-xl font-black text-red-700 dark:text-red-300"><FormattedNumber value={stats.debitTotal} /></p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي أرصدة (عليهم)</p>
                            <p className="text-xl font-black text-green-700 dark:text-green-300"><FormattedNumber value={stats.creditTotal} /></p>
                        </div>
                    </div>
                </div>

                <div className="animate-fade-in-up">
                    <div className="my-4 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">بحث سريع (اسم المورد أو رقم الهاتف)</label>
                                <input
                                    type="text"
                                    placeholder="ابحث هنا..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={filterInputClass}
                                />
                            </div>
                            <button onClick={() => setSearchQuery('')} className="bg-gray-200 dark:bg-gray-600 px-4 h-9 rounded text-xs font-bold text-gray-700 dark:text-white hover:bg-gray-300 transition-colors">
                                تفريغ البحث
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto relative max-h-[60vh] border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-right border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
                                <tr className="text-gray-700 dark:text-gray-300 shadow-sm">
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 w-1/4">اسم المورد</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">رقم الموبايل</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">العنوان</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 text-center">الرصيد الافتتاحي</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">المستخدم</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedSuppliers.map((s) => (
                                    <tr key={s.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{s.name}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300 font-mono">{s.phone || '-'}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400 text-sm">{s.address || '-'}</td>
                                        <td className={`p-3 font-black text-center ${s.openingBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            <FormattedNumber value={Math.abs(s.openingBalance)} />
                                            <span className="text-[10px] mr-1 opacity-70">({s.openingBalance >= 0 ? 'له' : 'عليه'})</span>
                                        </td>
                                        <td className="p-3 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col">
                                                <span>{s.createdBy || 'غير معروف'}</span>
                                                {s.lastModifiedBy && <span className="text-[9px] text-emerald-500">تعديل: {s.lastModifiedBy}</span>}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(s, !canEdit)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors" title={canEdit ? 'تعديل' : 'عرض'}>
                                                    {canEdit ? <EditIcon /> : <ViewIcon />}
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => handleDelete(s)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف">
                                                        <DeleteIcon />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayedSuppliers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-500">لا توجد بيانات مطابقة للبحث.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierManagement;
