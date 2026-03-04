
import React, { useState, useMemo } from 'react';
import { Modal, ConfirmationModal, EditIcon, DeleteIcon, ViewIcon, PlusCircleIcon } from './Shared';
import type { Warehouse, Item, NotificationType, MgmtUser, Employee } from '../types';

interface WarehouseManagementProps {
    warehouses: Warehouse[];
    setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
    employees: Employee[];
}

const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ warehouses, setWarehouses, items, setItems, showNotification, currentUser, employees }) => {
    const storeEmployees = useMemo(() => employees.filter(emp => emp.departmentId === 5), [employees]);
    const [formData, setFormData] = useState<Omit<Warehouse, 'id'> & { id: number | null }>({ id: null, code: '', name: '', keeper: '', phone: '', address: '', notes: '' });
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

    const canEdit = currentUser.permissions.includes('warehouseManagement_edit');
    const canDelete = currentUser.permissions.includes('warehouseManagement_delete');

    const getNextCode = () => {
        if (warehouses.length === 0) return '1';
        const numericCodes = warehouses
            .map(w => parseInt(w.code))
            .filter(n => !isNaN(n));
        if (numericCodes.length === 0) return '1';
        return (Math.max(...numericCodes) + 1).toString();
    };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;
        if (!formData.name) {
            alert("اسم المخزن مطلوب");
            return;
        }

        let finalCode = formData.code.trim();

        if (isEditing && formData.id) {
             if (!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
             if (finalCode && warehouses.some(wh => wh.code === finalCode && wh.id !== formData.id)) {
                alert("هذا الكود مستخدم بالفعل لمخزن آخر.");
                return;
            }
            setWarehouses(warehouses.map(wh => wh.id === formData.id ? { ...formData, code: finalCode, id: formData.id } : wh));
            showNotification('edit');
        } else {
            if (!finalCode) {
                finalCode = getNextCode();
            } else if (warehouses.some(wh => wh.code === finalCode)) {
                alert("هذا الكود مستخدم بالفعل لمخزن آخر.");
                return;
            }
            const newWarehouse: Warehouse = {
                id: Date.now(),
                code: finalCode,
                name: formData.name,
                keeper: formData.keeper,
                phone: formData.phone,
                address: formData.address,
                notes: formData.notes
            };
            setWarehouses([...warehouses, newWarehouse]);
            showNotification('add');
        }
        resetForm();
    };

    const handleEdit = (warehouse: Warehouse, viewOnly: boolean) => {
        setIsEditing(true);
        setIsViewing(viewOnly);
        setFormData(warehouse);
        setIsModalOpen(true);
    };

    const handleDelete = (warehouse: Warehouse) => {
        const hasItems = items.some(i => i.warehouseId === warehouse.id);
        
        if (hasItems) {
            const itemCount = items.filter(i => i.warehouseId === warehouse.id).length;
            alert(`تنبيه هام: لا يمكن حذف المخزن "${warehouse.name}" لأنه يحتوي على ${itemCount} صنف مسجل.\n\nيجب نقل الأصناف أو حذفها من هذا المخزن أولاً قبل التمكن من حذفه.`);
            return;
        }

        setWarehouseToDelete(warehouse);
        setIsDeleteModalOpen(true);
    };
    
    const performDelete = () => {
        if (warehouseToDelete) {
            setWarehouses(warehouses.filter(wh => wh.id !== warehouseToDelete.id));
            showNotification('delete');
        }
        setIsDeleteModalOpen(false);
        setWarehouseToDelete(null);
    };

    const resetForm = () => {
        setIsEditing(false);
        setIsViewing(false);
        setFormData({ id: null, code: '', name: '', keeper: '', phone: '', address: '', notes: '' });
        setIsModalOpen(false);
    }

    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <>
            {isDeleteModalOpen && warehouseToDelete && (
                <ConfirmationModal
                    title="تأكيد حذف المخزن"
                    message={`هل أنت متأكد من حذف المخزن "${warehouseToDelete.name}"؟`}
                    onConfirm={performDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                    confirmText="حذف"
                    confirmColor="bg-red-600"
                />
            )}
            <Modal
                title={isViewing ? 'عرض بيانات المخزن' : isEditing ? 'تعديل بيانات المخزن' : 'إضافة مخزن جديد'}
                show={isModalOpen}
                onClose={resetForm}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} htmlFor="code">كود المخزن</label>
                            <input id="code" name="code" type="text" value={formData.code} onChange={handleInputChange} className={inputClass} placeholder="اتركه فارغاً للتوليد التلقائي" disabled={isViewing} />
                        </div>
                        <div>
                                <label className={labelClass} htmlFor="name">
                                اسم المخزن 
                                <span className="text-red-500 dark:text-red-400 font-normal text-sm mr-1">(مطلوب)</span>
                            </label>
                            <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} className={inputClass} required disabled={isViewing} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass} htmlFor="keeper">أمين المخزن</label>
                            <select id="keeper" name="keeper" value={formData.keeper} onChange={handleInputChange} className={inputClass} disabled={isViewing}>
                                <option value="">اختر أمين المخزن</option>
                                {storeEmployees.map(emp => (
                                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="phone">رقم موبايل الأمين</label>
                            <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className={inputClass} disabled={isViewing} />
                        </div>
                            <div>
                            <label className={labelClass} htmlFor="address">عنوان المخزن</label>
                            <input id="address" name="address" type="text" value={formData.address} onChange={handleInputChange} className={inputClass} disabled={isViewing} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="notes">ملاحظات</label>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} className={inputClass + ' resize-none'} placeholder="أدخل أي ملاحظات (اختياري)" rows={3} disabled={isViewing}></textarea>
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        {!isViewing && (
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold h-12 rounded-lg shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                <PlusCircleIcon className="h-5 w-5" />
                                <span>{isEditing ? 'تحديث المخزن' : 'إضافة مخزن'}</span>
                            </button>
                        )}
                    </div>
                </form>
            </Modal>

            <div className="space-y-8">
                <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">سجل المخازن</h2>
                        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <PlusCircleIcon className="h-5 w-5" />
                            <span>إضافة مخزن جديد</span>
                        </button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="border-b-2 border-gray-300 dark:border-gray-600">
                                <tr>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الكود</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">اسم المخزن</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">أمين المخزن</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الموبايل</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {warehouses.map((wh) => (
                                <tr key={wh.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                    <td className="p-3 font-mono text-gray-700 dark:text-gray-300">{wh.code}</td>
                                    <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{wh.name}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{wh.keeper}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{wh.phone}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center space-x-2 space-x-reverse">
                                            <button onClick={() => handleEdit(wh, !canEdit)} className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors duration-200" title={canEdit ? 'تعديل' : 'عرض'}>
                                                {canEdit ? <EditIcon /> : <ViewIcon />}
                                            </button>
                                            {canDelete && <button onClick={() => handleDelete(wh)} className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors duration-200" title="حذف"><DeleteIcon /></button>}
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

export default WarehouseManagement;
