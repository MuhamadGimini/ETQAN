
import React from 'react';
import type { MgmtUser, NotificationType } from '../types';

interface AppUnlockProps {
    users: MgmtUser[];
    setUsers: React.Dispatch<React.SetStateAction<MgmtUser[]>>;
    showNotification: (type: NotificationType) => void;
}

const AppUnlock: React.FC<AppUnlockProps> = ({ users, setUsers, showNotification }) => {
    const handleTogglePermission = (userId: number) => {
        setUsers(prevUsers => prevUsers.map(user => {
            if (user.id === userId) {
                const hasPermission = user.permissions.includes('appUnlock');
                const newPermissions = hasPermission
                    ? user.permissions.filter(p => p !== 'appUnlock')
                    : [...user.permissions, 'appUnlock'];
                return { ...user, permissions: newPermissions };
            }
            return user;
        }));
        showNotification('save');
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const tableHeaderClass = "px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600";
    const tableCellClass = "px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700";

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-black dark:text-gray-200">صلاحية فك الحظر الأمني</h1>
            </div>

            <div className={cardClass}>
                <p className="text-gray-700 dark:text-gray-300 mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-r-4 border-blue-500">
                    هذه الشاشة مخصصة لتحديد المستخدمين المصرح لهم بفك الحظر الأمني عن البرنامج في حالة قفله. 
                    المستخدمون المختارون هنا سيتمكنون من استخدام كلمات مرورهم لتجاوز شاشة الحظر.
                </p>

                <div className="overflow-x-auto">
                    <table className="min-w-full bg-transparent">
                        <thead>
                            <tr>
                                <th className={tableHeaderClass}>اسم المستخدم</th>
                                <th className={tableHeaderClass}>الاسم الكامل</th>
                                <th className={tableHeaderClass}>الحالة</th>
                                <th className={tableHeaderClass}>منح الصلاحية</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const isAuthorized = user.permissions.includes('appUnlock') || user.id === 1;
                                const isAdmin = user.id === 1;

                                return (
                                    <tr key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className={tableCellClass}>{user.username}</td>
                                        <td className={tableCellClass}>{user.fullName}</td>
                                        <td className={tableCellClass}>
                                            {isAuthorized ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                                                    مصرح له
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                                                    غير مصرح
                                                </span>
                                            )}
                                        </td>
                                        <td className={tableCellClass}>
                                            {isAdmin ? (
                                                <span className="text-xs text-gray-500 italic">المدير لديه الصلاحية دائماً</span>
                                            ) : (
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={user.permissions.includes('appUnlock')}
                                                        onChange={() => handleTogglePermission(user.id)}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                </label>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AppUnlock;
