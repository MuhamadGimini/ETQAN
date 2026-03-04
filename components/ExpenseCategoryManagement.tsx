
import React, { useState, useMemo } from 'react';
import { Modal, ConfirmationModal, EditIcon, DeleteIcon, ViewIcon, PlusCircleIcon } from './Shared';
import type { ExpenseCategory, NotificationType, MgmtUser } from '../types';

interface ExpenseCategoryManagementProps {
    expenseCategories: ExpenseCategory[];
    setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
}

const ExpenseCategoryManagement: React.FC<ExpenseCategoryManagementProps> = ({ expenseCategories, setExpenseCategories, showNotification, currentUser }) => {
    const [formData, setFormData] = useState<Omit<ExpenseCategory, 'id'> & { id: number | null }>({ id: null, code: '', name: '', description: '' });
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);

    const canEdit = currentUser.permissions.includes('expenseCategoryManagement_edit');
    const canDelete = currentUser.permissions.includes('expenseCategoryManagement_delete');

    const getNextCode = () => {
        if (expenseCategories.length === 0) return '101';
        const numericCodes = expenseCategories
            .map(c => parseInt(c.code))
            .filter(n => !isNaN(n));
        if (numericCodes.length === 0) return '101';
        return (Math.max(...numericCodes) + 1).toString();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;
        if (!formData.name) {
            alert("اسم المصروف مطلوب");
            return;
        }
        
        let finalCode = formData.code.trim();

        if (isEditing && formData.id) {
            if(!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
            if (finalCode && expenseCategories.some(cat => cat.code === finalCode && cat.id !== formData.id)) {
                alert("هذا الكود مستخدم بالفعل لمصروف آخر.");
                return;
            }
            setExpenseCategories(expenseCategories.map(cat => cat.id === formData.id ? { ...cat, ...formData, code: finalCode, id: formData.id } : cat));
            showNotification('edit');
        } else {
            if (!finalCode) {
                finalCode = getNextCode();
            } else if (expenseCategories.some(cat => cat.code === finalCode)) {
                alert("هذا الكود مستخدم بالفعل لمصروف آخر.");
                return;
            }

            const newCategory: ExpenseCategory = {
                id: Date.now(),
                code: finalCode,
                name: formData.name,
                description: formData.description,
            };
            setExpenseCategories([...expenseCategories, newCategory]);
            showNotification('add');
        }
        resetForm();
    };

    const handleEdit = (category: ExpenseCategory, viewOnly: boolean) => {
        setIsEditing(true);
        setIsViewing(viewOnly);
        setFormData(category);
        setIsModalOpen(true);
    };

    const handleDelete = (category: ExpenseCategory) => {
        setCategoryToDelete(category);
        setIsDeleteModalOpen(true);
    };
    
    const performDelete = () => {
        if (categoryToDelete) {
            setExpenseCategories(expenseCategories.filter(cat => cat.id !== categoryToDelete.id));
            showNotification('delete');
        }
        cancelDelete();
    };

    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setCategoryToDelete(null);
    };

    const resetForm = () => {
        setIsEditing(false);
        setIsViewing(false);
        setFormData({ id: null, code: '', name: '', description: '' });
        setIsModalOpen(false);
    }

    // Sort categories alphabetically
    const sortedCategories = useMemo(() => {
        return [...expenseCategories].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [expenseCategories]);
    
    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <>
            {isDeleteModalOpen && categoryToDelete && (
                <ConfirmationModal 
                    title="تأكيد الحذف" 
                    message={`هل أنت متأكد من حذف مصروف "${categoryToDelete.name}"؟`} 
                    onConfirm={performDelete} 
                    onCancel={cancelDelete} 
                    confirmText="حذف" 
                    confirmColor="bg-red-600" 
                />
            )}
            <Modal
                title={isViewing ? 'عرض بيانات المصروف' : isEditing ? 'تعديل بيانات المصروف' : 'إضافة مصروف جديد'}
                show={isModalOpen}
                onClose={resetForm}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass} htmlFor="code">كود المصروف</label>
                            <input id="code" name="code" type="text" value={formData.code} onChange={handleInputChange} className={inputClass} placeholder="اتركه فارغاً للتوليد التلقائي" disabled={isViewing} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClass} htmlFor="name">
                                اسم المصروف
                                <span className="text-red-500 dark:text-red-400 font-normal text-sm mr-1">(مطلوب)</span>
                            </label>
                            <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} className={inputClass} required disabled={isViewing} />
                        </div>
                    </div>
                        <div>
                            <label className={labelClass} htmlFor="description">الوصف</label>
                            <input id="description" name="description" type="text" value={formData.description} onChange={handleInputChange} className={inputClass} disabled={isViewing} />
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        {!isViewing && (
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold h-12 rounded-lg shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                <PlusCircleIcon className="h-5 w-5" />
                                <span>{isEditing ? 'تحديث المصروف' : 'إضافة مصروف'}</span>
                            </button>
                        )}
                    </div>
                </form>
            </Modal>
            <div className="space-y-8">
                <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">سجل المصروفات</h2>
                        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <PlusCircleIcon className="h-5 w-5" />
                            <span>إضافة مصروف جديد</span>
                        </button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="border-b-2 border-gray-300 dark:border-gray-600">
                                <tr>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الكود</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">اسم المصروف</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الوصف</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedCategories.map((cat) => (
                                <tr key={cat.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                    <td className="p-3 font-mono text-gray-700 dark:text-gray-300">{cat.code}</td>
                                    <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{cat.name}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{cat.description}</td>
                                    <td className="p-3">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <button onClick={() => handleEdit(cat, !canEdit)} className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors duration-200" title={canEdit ? 'تعديل' : 'عرض'}>
                                                {canEdit ? <EditIcon /> : <ViewIcon />}
                                            </button>
                                            {canDelete && <button onClick={() => handleDelete(cat)} className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors duration-200" title="حذف"><DeleteIcon /></button>}
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

export default ExpenseCategoryManagement;
