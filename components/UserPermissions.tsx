
import React, { useState, useMemo, useEffect } from 'react';
import type { MgmtUser, NotificationType } from '../types';
import { menuItems } from './navigation';

interface UserPermissionsProps {
    users: MgmtUser[];
    setUsers: React.Dispatch<React.SetStateAction<MgmtUser[]>>;
    showNotification: (type: NotificationType) => void;
}

const granularLabels: { [key: string]: string } = {
    edit: 'تعديل',
    delete: 'حذف',
    editDate: 'تعديل التاريخ',
};
const allGranularPermissions = ['edit', 'delete', 'editDate'];


const UserPermissions: React.FC<UserPermissionsProps> = ({ users, setUsers, showNotification }) => {
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [currentUserPermissions, setCurrentUserPermissions] = useState<Set<string>>(new Set());

    const selectedUser = useMemo(() => {
        return users.find(u => u.id === selectedUserId);
    }, [selectedUserId, users]);

    useEffect(() => {
        if (selectedUser) {
            setCurrentUserPermissions(new Set(selectedUser.permissions));
        } else {
            setCurrentUserPermissions(new Set());
        }
    }, [selectedUser]);
    

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const userId = e.target.value ? Number(e.target.value) : null;
        setSelectedUserId(userId);
    };

    const handlePermissionChange = (permissionId: string, isChecked: boolean) => {
        setCurrentUserPermissions(prev => {
            const newPermissions = new Set(prev);
            if (isChecked) {
                newPermissions.add(permissionId);
            } else {
                newPermissions.delete(permissionId);
            }
            return newPermissions;
        });
    };

    const handleSave = () => {
        if (!selectedUserId) return;
        setUsers(users.map(u => 
            u.id === selectedUserId 
            ? { ...u, permissions: Array.from(currentUserPermissions) } 
            : u
        ));
        showNotification('save');
    };

    const handleSelectAllForRow = (item: any, isChecked: boolean) => {
        setCurrentUserPermissions(prev => {
            const newPermissions = new Set(prev);
            if(isChecked) {
                newPermissions.add(item.id);
                item.granular?.forEach((p: string) => newPermissions.add(`${item.id}_${p}`));
            } else {
                newPermissions.delete(item.id);
                 item.granular?.forEach((p: string) => newPermissions.delete(`${item.id}_${p}`));
            }
            return newPermissions;
        });
    }

    const isAdminSelected = selectedUser?.id === 1;
    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-black dark:text-gray-300 font-bold mb-2";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-black dark:text-gray-200">صلاحيات المستخدمين</h1>
            
            <div className={cardClass}>
                <div className="max-w-md mb-8">
                    <label className={labelClass} htmlFor="user-select">اختر مستخدم لتعديل صلاحياته</label>
                    <select id="user-select" value={selectedUserId || ''} onChange={handleUserChange} className={inputClass}>
                        <option value="" disabled>-- اختر مستخدم --</option>
                        {users.filter(u => u.id !== 1).map(user => (
                            <option key={user.id} value={user.id}>{user.fullName} ({user.username})</option>
                        ))}
                    </select>
                </div>

                {selectedUser && (
                    <>
                        <div className="mb-6 border-b border-gray-400/50 pb-3">
                            <h2 className="text-2xl font-bold text-black dark:text-gray-300">
                                تعديل صلاحيات المستخدم
                            </h2>
                            <p className="text-gray-800 dark:text-gray-400 mt-1">
                                المستخدم المحدد: <span className="font-semibold">{selectedUser.fullName}</span>
                            </p>
                        </div>
                        {isAdminSelected ? (
                            <p className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg mb-6">
                                لا يمكن تعديل صلاحيات المدير. المدير يمتلك جميع الصلاحيات دائماً.
                            </p>
                        ) : (
                        <div className="space-y-4">
                            {menuItems.filter(item => item.id !== 'dashboard' && item.subItems).map(group => (
                                <div key={group.id} className="border border-gray-300/50 dark:border-gray-600/50 rounded-lg p-3">
                                    <h3 className="text-xl font-bold text-black dark:text-gray-200 mb-3">{group.label}</h3>
                                    <div className="space-y-1">
                                        {group.subItems?.map(item => {
                                            const hasGranular = item.granular && item.granular.length > 0;

                                            if (hasGranular) {
                                                const allChecked = item.granular ? [item.id, ...item.granular.map(p => `${item.id}_${p}`)].every(p => currentUserPermissions.has(p)) : currentUserPermissions.has(item.id);
                                                return (
                                                    <div key={item.id} className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
                                                        <div className="flex items-center">
                                                            <span className="w-48 font-bold text-black dark:text-gray-100 flex-shrink-0">{item.label}</span>
                                                            <div className="flex items-center gap-x-6">
                                                                <label className="flex items-center space-x-2 space-x-reverse text-black dark:text-gray-300">
                                                                    <input type="checkbox" className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" checked={currentUserPermissions.has(item.id)} onChange={(e) => handlePermissionChange(item.id, e.target.checked)} />
                                                                    <span>عرض</span>
                                                                </label>
                                                                {item.granular?.map(perm => (
                                                                    <label key={perm} className="flex items-center space-x-2 space-x-reverse text-black dark:text-gray-300">
                                                                        <input type="checkbox" className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" checked={currentUserPermissions.has(`${item.id}_${perm}`)} onChange={(e) => handlePermissionChange(`${item.id}_${perm}`, e.target.checked)} />
                                                                        <span>{granularLabels[perm]}</span>
                                                                    </label>
                                                                ))}
                                                                <label className="flex items-center space-x-2 space-x-reverse font-bold text-blue-600 dark:text-blue-400">
                                                                    <input type="checkbox" className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" checked={allChecked} onChange={(e) => handleSelectAllForRow(item, e.target.checked)} />
                                                                    <span>الكل</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div key={item.id} className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
                                                        <div className="flex items-center">
                                                            <span className="w-48 font-bold text-black dark:text-gray-100 flex-shrink-0">{item.label}</span>
                                                            <label className="flex items-center space-x-2 space-x-reverse text-black dark:text-gray-300">
                                                                <input type="checkbox" className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" checked={currentUserPermissions.has(item.id)} onChange={(e) => handlePermissionChange(item.id, e.target.checked)} />
                                                                <span>عرض</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        )}
                        {!isAdminSelected && (
                            <div className="flex justify-end mt-8 border-t border-gray-400/50 pt-6">
                                <button 
                                    onClick={handleSave} 
                                    className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transform hover:-translate-y-1 transition-all duration-300"
                                >
                                    حفظ الصلاحيات
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UserPermissions;
