
import React, { useState } from 'react';
import { Modal, ConfirmationModal, EditIcon, DeleteIcon, ViewIcon, PlusCircleIcon } from './Shared';
import type { Unit, Item, NotificationType, MgmtUser } from '../types';

interface UnitManagementProps {
    units: Unit[];
    setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
}

const UnitManagement: React.FC<UnitManagementProps> = ({ units, setUnits, items, setItems, showNotification, currentUser }) => {
    const [formData, setFormData] = useState<Omit<Unit, 'id' | 'createdBy' | 'createdAt'> & { id: number | null }>({ id: null, name: '', description: '' });
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

    const canEdit = currentUser.permissions.includes('unitManagement_edit');
    const canDelete = currentUser.permissions.includes('unitManagement_delete');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;
        if (!formData.name) {
            alert("اسم الوحدة مطلوب");
            return;
        }

        if (isEditing && formData.id) {
             if (!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
            setUnits(units.map(u => u.id === formData.id ? { 
                ...u, 
                ...formData, 
                id: formData.id!,
                lastModifiedBy: currentUser.username,
                lastModifiedAt: new Date().toISOString()
            } : u));
            showNotification('edit');
        } else {
            const newUnit: Unit = {
                id: Date.now(),
                name: formData.name,
                description: formData.description,
                createdBy: currentUser.username,
                createdAt: new Date().toISOString()
            };
            setUnits([...units, newUnit]);
            showNotification('add');
        }
        resetForm();
    };

    const handleEdit = (unit: Unit, viewOnly: boolean) => {
        setIsEditing(true);
        setIsViewing(viewOnly);
        setFormData(unit);
        setIsModalOpen(true);
    };

    const handleDelete = (unit: Unit) => {
        // Protection: Check if unit is used in items
        const isUsed = items.some(item => item.unitId === unit.id);
        
        if (isUsed) {
            const usageCount = items.filter(item => item.unitId === unit.id).length;
            alert(`لا يمكن حذف الوحدة "${unit.name}" لأنها مستخدمة في ${usageCount} صنف.\n\nيرجى تعديل الأصناف المرتبطة أولاً لاختيار وحدة أخرى.`);
            return;
        }

        setUnitToDelete(unit);
        setIsDeleteModalOpen(true);
    };
    
    const performDelete = () => {
        if (unitToDelete) {
            setUnits(units.filter(u => u.id !== unitToDelete.id));
            showNotification('delete');
        }
        setIsDeleteModalOpen(false);
        setUnitToDelete(null);
    };

    const resetForm = () => {
        setIsEditing(false);
        setIsViewing(false);
        setFormData({ id: null, name: '', description: '' });
        setIsModalOpen(false);
    }

    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <>
            {isDeleteModalOpen && unitToDelete && (
                <ConfirmationModal
                    title="تأكيد حذف الوحدة"
                    message={`هل أنت متأكد من حذف الوحدة "${unitToDelete.name}"؟`}
                    onConfirm={performDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                    confirmText="حذف"
                    confirmColor="bg-red-600"
                />
            )}
            <Modal
                title={isViewing ? 'عرض بيانات الوحدة' : isEditing ? 'تعديل بيانات الوحدة' : 'إضافة وحدة جديدة'}
                show={isModalOpen}
                onClose={resetForm}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass} htmlFor="name">
                                اسم الوحدة
                                <span className="text-red-500 dark:text-red-400 font-normal text-sm mr-1">(مطلوب)</span>
                            </label>
                            <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} className={inputClass} required disabled={isViewing} />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="description">الوصف</label>
                            <input id="description" name="description" type="text" value={formData.description} onChange={handleInputChange} className={inputClass} disabled={isViewing} />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        {!isViewing && (
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold h-12 rounded-lg shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                <PlusCircleIcon className="h-5 w-5" />
                                <span>{isEditing ? 'تحديث الوحدة' : 'إضافة وحدة'}</span>
                            </button>
                        )}
                    </div>
                </form>
            </Modal>
            <div className="space-y-8">
                <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">سجل الوحدات</h2>
                        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <PlusCircleIcon className="h-5 w-5" />
                            <span>إضافة وحدة جديدة</span>
                        </button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="border-b-2 border-gray-300 dark:border-gray-600">
                                <tr>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">اسم الوحدة</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الوصف</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">تم بواسطة</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map((unit) => (
                                <tr key={unit.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                    <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{unit.name}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{unit.description}</td>
                                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex flex-col">
                                            <span>{unit.createdBy || 'غير معروف'}</span>
                                            {unit.lastModifiedBy && <span className="text-xs text-gray-500">تعديل: {unit.lastModifiedBy}</span>}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <button onClick={() => handleEdit(unit, !canEdit)} className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors duration-200" title={canEdit ? 'تعديل' : 'عرض'}>
                                                {canEdit ? <EditIcon /> : <ViewIcon />}
                                            </button>
                                            {canDelete && <button onClick={() => handleDelete(unit)} className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors duration-200" title="حذف"><DeleteIcon /></button>}
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

export default UnitManagement;
