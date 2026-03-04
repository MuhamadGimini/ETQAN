
import React, { useState, useMemo } from 'react';
import { Modal, ConfirmationModal, EditIcon, DeleteIcon, ViewIcon, FormattedNumber, PlusCircleIcon, ChevronDownIcon } from './Shared';
import type { SalesRepresentative, NotificationType, MgmtUser, SalesInvoice, SalesReturn, Employee } from '../types';
import { searchMatch } from '../utils';

interface SalesRepresentativeManagementProps {
    salesRepresentatives: SalesRepresentative[];
    setSalesRepresentatives: React.Dispatch<React.SetStateAction<SalesRepresentative[]>>;
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    employees: Employee[];
}

const SalesRepresentativeManagement: React.FC<SalesRepresentativeManagementProps> = ({ salesRepresentatives, setSalesRepresentatives, showNotification, currentUser, salesInvoices, salesReturns, employees }) => {
    const salesEmployees = useMemo(() => employees.filter(emp => emp.departmentId === 3), [employees]);
    const initialFormState: Omit<SalesRepresentative, 'id'> & { id: number | null } = { id: null, code: '', name: '', phone: '', nationalId: '', address: '' };
    const [formData, setFormData] = useState(initialFormState);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [repToDelete, setRepToDelete] = useState<SalesRepresentative | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const canEdit = currentUser.permissions.includes('salesRepresentativeManagement_edit');
    const canDelete = currentUser.permissions.includes('salesRepresentativeManagement_delete');

    const getNextCode = () => {
        if (salesRepresentatives.length === 0) return '1';
        const numericCodes = salesRepresentatives
            .map(r => parseInt(r.code))
            .filter(n => !isNaN(n));
        if (numericCodes.length === 0) return '1';
        return (Math.max(...numericCodes) + 1).toString();
    };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(isViewing) return;
        if (!formData.name) {
            alert("اسم المندوب مطلوب.");
            return;
        }

        let finalCode = formData.code.trim();

        if (isEditing && formData.id) {
            if (!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
            if (finalCode && salesRepresentatives.some(rep => rep.code === finalCode && rep.id !== formData.id)) {
                alert("هذا الكود مستخدم بالفعل لمندوب آخر.");
                return;
            }
            setSalesRepresentatives(salesRepresentatives.map(rep => rep.id === formData.id ? { ...formData, code: finalCode, id: formData.id! } : rep));
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل بيانات المندوب ${formData.name}` }));
            showNotification('edit');
        } else {
            if (!finalCode) {
                finalCode = getNextCode();
            } else if (salesRepresentatives.some(rep => rep.code === finalCode)) {
                alert("هذا الكود مستخدم بالفعل لمندوب آخر.");
                return;
            }
            const newRep: SalesRepresentative = { ...formData, code: finalCode, id: Date.now() };
            setSalesRepresentatives([...salesRepresentatives, newRep]);
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإضافة المندوب الجديد ${formData.name}` }));
            showNotification('add');
        }
        resetForm();
    };

    const handleEdit = (rep: SalesRepresentative, viewOnly: boolean) => {
        setIsEditing(true);
        setIsViewing(viewOnly);
        setFormData(rep);
        setIsModalOpen(true);
    };

    const handleDelete = (rep: SalesRepresentative) => {
        const hasTransactions = salesInvoices.some(inv => inv.salesRepId === rep.id) ||
                              salesReturns.some(ret => ret.salesRepId === rep.id);
        if (hasTransactions) {
            alert(`لا يمكن حذف المندوب "${rep.name}" لوجود فواتير مسجلة باسمه.`);
            return;
        }
        setRepToDelete(rep);
        setIsDeleteModalOpen(true);
    };

    const performDelete = () => {
        if (repToDelete) {
            setSalesRepresentatives(salesRepresentatives.filter(rep => rep.id !== repToDelete.id));
            showNotification('delete');
        }
        cancelDelete();
    };

    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setRepToDelete(null);
    };

    const resetForm = () => {
        setIsEditing(false);
        setIsViewing(false);
        setFormData(initialFormState);
        setIsModalOpen(false);
    };

    const displayedReps = useMemo(() => {
        return salesRepresentatives
            .filter(r => searchMatch(r.name, searchQuery) || searchMatch(r.phone, searchQuery) || searchMatch(r.code, searchQuery))
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [salesRepresentatives, searchQuery]);
    
    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-amber-300 dark:border-amber-700 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-black dark:text-white font-bold placeholder-gray-500 transition-all duration-200 disabled:opacity-70 text-base";
    const labelClass = "block text-black dark:text-gray-200 font-bold mb-1 text-sm";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none dark:text-white";

    return (
        <div className="space-y-6">
            {isDeleteModalOpen && repToDelete && (
                <ConfirmationModal 
                    title="تأكيد الحذف" 
                    message={`هل أنت متأكد من حذف المندوب "${repToDelete.name}"؟`} 
                    onConfirm={performDelete} 
                    onCancel={cancelDelete} 
                    confirmText="حذف" 
                    confirmColor="bg-red-600" 
                />
            )}

            <Modal
                title={isViewing ? 'عرض بيانات المندوب' : isEditing ? 'تعديل بيانات المندوب' : 'تكويد مندوب جديد'}
                show={isModalOpen}
                onClose={resetForm}
            >
                <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                    <div className="w-full">
                        <label className={labelClass}>كود / رقم المندوب</label>
                        <input name="code" type="text" value={formData.code} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="سيتم التوليد تلقائياً إذا ترك فارغاً" />
                    </div>

                    <div className="w-full">
                        <label className={labelClass}>اسم المندوب</label>
                        <select name="name" value={formData.name} onChange={handleInputChange} className={inputClass} required disabled={isViewing}>
                            <option value="">اختر مندوباً</option>
                            {salesEmployees.map(emp => (
                                <option key={emp.id} value={emp.name}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="w-full">
                        <label className={labelClass}>رقم الموبايل</label>
                        <input name="phone" type="text" value={formData.phone} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="01XXXXXXXXX" />
                    </div>

                    <div className="w-full">
                        <label className={labelClass}>الرقم القومي</label>
                        <input name="nationalId" type="text" value={formData.nationalId} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="14 رقم" />
                    </div>
                    
                    <div className="w-full">
                        <label className={labelClass}>العنوان</label>
                        <input name="address" type="text" value={formData.address} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="السكن الحالي" />
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        {!isViewing && (
                            <button type="submit" className="w-full bg-amber-600 text-white font-bold h-12 rounded-lg shadow-lg hover:bg-amber-700 transition-all flex items-center justify-center gap-2">
                                <PlusCircleIcon className="h-5 w-5" />
                                <span>{isEditing ? 'تحديث البيانات' : 'حفظ بيانات المندوب'}</span>
                            </button>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Permanent Sales Rep Log Section */}
            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-amber-800 dark:text-amber-300">سجل المناديب</h2>
                        <button onClick={() => setIsModalOpen(true)} className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <PlusCircleIcon className="h-5 w-5" />
                            <span>إضافة مندوب جديد</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي المناديب</p>
                            <p className="text-xl font-black text-amber-700 dark:text-amber-300">{displayedReps.length}</p>
                        </div>
                    </div>
                </div>

                <div className="animate-fade-in-up">
                    <div className="my-4 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">بحث سريع (بالاسم أو الكود أو الهاتف)</label>
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
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 w-16">الكود</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">الاسم</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">الموبايل</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">الرقم القومي</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">العنوان</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedReps.map((r) => (
                                    <tr key={r.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
                                        <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">{r.code}</td>
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{r.name}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300 font-mono">{r.phone || '-'}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400 text-sm font-mono">{r.nationalId || '-'}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400 text-xs">{r.address || '-'}</td>
                                        <td className="p-3">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(r, !canEdit)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-full transition-colors" title={canEdit ? 'تعديل' : 'عرض'}>
                                                    {canEdit ? <EditIcon /> : <ViewIcon />}
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => handleDelete(r)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف">
                                                        <DeleteIcon />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayedReps.length === 0 && (
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

export default SalesRepresentativeManagement;
