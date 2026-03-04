
import React, { useState, useEffect } from 'react';
import { ConfirmationModal, EditIcon, DeleteIcon, LockClosedIcon, LockOpenIcon } from './Shared';
import type { MgmtUser, NotificationType, Employee } from '../types';

interface UserManagementProps {
    users: MgmtUser[];
    setUsers: React.Dispatch<React.SetStateAction<MgmtUser[]>>;
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
    employees: Employee[];
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, showNotification, currentUser, employees }) => {
    const [formData, setFormData] = useState<{id: number | null, username: string, password: string, fullName: string}>({ id: null, username: '', password: '', fullName: '' });
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDeleteId, setUserToDeleteId] = useState<number | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

    const canEdit = currentUser.permissions.includes('userManagement_edit');
    const canDelete = currentUser.permissions.includes('userManagement_delete');

    useEffect(() => {
        if (selectedEmployeeId) {
            const selectedEmployee = employees.find(emp => emp.id === parseInt(selectedEmployeeId));
            if (selectedEmployee) {
                setFormData(prev => ({ ...prev, fullName: selectedEmployee.name }));
            }
        } else {
            setFormData(prev => ({ ...prev, fullName: '' }));
        }
    }, [selectedEmployeeId, employees]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'employeeSelect') {
            setSelectedEmployeeId(value);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || !formData.fullName || (!isEditing && !formData.password)) {
            alert("يرجى ملء جميع الحقول");
            return;
        }

        if (isEditing) {
            if(!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
            if (formData.id === 1) {
                alert("لا يمكن تعديل بيانات المدير الرئيسي من هنا.");
                return;
            }
            setUsers(users.map(user => user.id === formData.id ? { ...user, username: formData.username, fullName: formData.fullName } : user));
            showNotification('edit');
        } else {
            const newUser: MgmtUser = {
                id: Date.now(),
                username: formData.username,
                password: formData.password,
                fullName: formData.fullName,
                permissions: ['dashboard'], // Default permission
                isBlocked: false,
            };
            setUsers([...users, newUser]);
            showNotification('add');
        }
        resetForm();
    };

    const handleEdit = (user: MgmtUser) => {
        if (user.id === 1) return; // Prevent editing admin
        setIsEditing(true);
        setFormData({ ...user, password: '' });
    };

    const handleDelete = (userId: number) => {
        if (userId === 1) {
            alert("لا يمكن حذف المدير الرئيسي.");
            return;
        }
        setUserToDeleteId(userId);
        setIsDeleteModalOpen(true);
    };
    
    const confirmDelete = () => {
        if (userToDeleteId) {
            setUsers(users.filter(user => user.id !== userToDeleteId));
            showNotification('delete');
        }
        cancelDelete();
    };

    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setUserToDeleteId(null);
    };

    const handleToggleBlock = (user: MgmtUser) => {
        if (!canEdit) {
            alert("ليس لديك صلاحية التعديل.");
            return;
        }
        if (user.id === 1) {
            alert("لا يمكن حظر المدير الرئيسي.");
            return;
        }
        const updatedUsers = users.map(u => 
            u.id === user.id ? { ...u, isBlocked: !u.isBlocked } : u
        );
        setUsers(updatedUsers);
        showNotification('edit');
    };

    const resetForm = () => {
        setIsEditing(false);
        setFormData({ id: null, username: '', password: '', fullName: '' });
        setSelectedEmployeeId('');
    }

    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";

    return (
        <>
            {isDeleteModalOpen && <ConfirmationModal title="تأكيد الحذف" message="هل أنت متأكد من أنك تريد حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء." onConfirm={confirmDelete} onCancel={cancelDelete} confirmText="حذف" confirmColor="bg-red-600" />}
            <div className="space-y-8">
                 <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">إدارة وتكويد المستخدمين</h1>
                <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20 max-w-lg mx-auto">
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-6">{isEditing ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2" htmlFor="employeeSelect">اختيار موظف</label>
                            <select id="employeeSelect" name="employeeSelect" value={selectedEmployeeId} onChange={handleInputChange} className={`${inputClass} bg-white dark:bg-gray-800`}>
                                <option value="">-- اختر موظف --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2" htmlFor="fullName">الاسم بالكامل</label>
                            <input id="fullName" name="fullName" type="text" value={formData.fullName} onChange={handleInputChange} className={inputClass} required readOnly={!!selectedEmployeeId} />
                        </div>
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2" htmlFor="username">اسم المستخدم</label>
                            <input id="username" name="username" type="text" value={formData.username} onChange={handleInputChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2" htmlFor="password">كلمة المرور</label>
                            <input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} className={inputClass} placeholder={isEditing ? 'اتركها فارغة لعدم التغيير' : '********'} required={!isEditing} />
                        </div>
                        <div className="flex justify-end space-x-4 space-x-reverse pt-4">
                           {isEditing && (<button type="button" onClick={resetForm} className="bg-gray-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300 transform hover:-translate-y-1 transition-all duration-300">إلغاء</button>)}
                            <button type="submit" className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:-translate-y-1 transition-all duration-300">{isEditing ? 'تحديث' : 'اضافة مستخدم'}</button>
                        </div>
                    </form>
                </div>
                <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20">
                     <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">قائمة المستخدمين</h2>
                     <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="border-b-2 border-gray-300 dark:border-gray-600">
                                <tr>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الاسم بالكامل</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">اسم المستخدم</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الحالة</th>
                                    <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{user.fullName}</td>
                                        <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{user.username}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.isBlocked ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                                                {user.isBlocked ? 'محظور' : 'نشط'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex space-x-2 space-x-reverse">
                                                {canEdit && user.id !== 1 && (
                                                    <>
                                                        <button onClick={() => handleEdit(user)} className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors duration-200" title="تعديل">
                                                            <EditIcon />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleBlock(user)} 
                                                            className={`p-2 rounded-full transition-colors duration-200 ${user.isBlocked ? 'text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/50' : 'text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/50'}`}
                                                            title={user.isBlocked ? 'فك الحظر' : 'حظر المستخدم'}
                                                        >
                                                            {user.isBlocked ? <LockOpenIcon /> : <LockClosedIcon />}
                                                        </button>
                                                    </>
                                                )}
                                                {canDelete && user.id !== 1 && (
                                                    <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors duration-200" title="حذف">
                                                        <DeleteIcon />
                                                    </button>
                                                )}
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

export default UserManagement;
