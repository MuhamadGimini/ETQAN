import React, { useState, useMemo } from 'react';
import type { Department, MgmtUser } from '../types';
import { EditIcon, DeleteIcon, PlusCircleIcon, ConfirmationModal } from './Shared';

interface DepartmentManagementProps {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  currentUser: MgmtUser;
}

const DepartmentManagement: React.FC<DepartmentManagementProps> = ({ departments, setDepartments, currentUser }) => {
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentCode, setNewDepartmentCode] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  const getNextCode = () => {
    if (departments.length === 0) return '1';
    const numericCodes = departments
      .map(d => parseInt(d.code || '0'))
      .filter(n => !isNaN(n));
    if (numericCodes.length === 0) return '1';
    return (Math.max(...numericCodes) + 1).toString();
  };

  // Set default code when adding a new department
  React.useEffect(() => {
    if (!isEditing && !newDepartmentCode) {
      setNewDepartmentCode(getNextCode());
    }
  }, [departments, isEditing]);

  const handleAddOrUpdateDepartment = () => {
    if (newDepartmentName.trim() === '') {
      alert('اسم القسم مطلوب');
      return;
    }

    const finalCode = newDepartmentCode.trim() || getNextCode();

    if (isEditing && editingId) {
      // Check for duplicate code
      if (departments.some(d => d.code === finalCode && d.id !== editingId)) {
        alert('كود الإدارة مستخدم بالفعل');
        return;
      }
      
      setDepartments(departments.map(d => 
        d.id === editingId ? { ...d, name: newDepartmentName.trim(), code: finalCode } : d
      ));
      window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل بيانات القسم ${newDepartmentName.trim()}` }));
      setIsEditing(false);
      setEditingId(null);
    } else {
      // Check for duplicate code
      if (departments.some(d => d.code === finalCode)) {
        alert('كود الإدارة مستخدم بالفعل');
        return;
      }
      
      const newDepartment: Department = {
        id: Date.now(),
        code: finalCode,
        name: newDepartmentName.trim(),
      };
      setDepartments([...departments, newDepartment]);
      window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإضافة قسم جديد ${newDepartment.name}` }));
    }
    
    setNewDepartmentName('');
    setNewDepartmentCode(getNextCode());
  };

  const handleEdit = (dept: Department) => {
    setIsEditing(true);
    setEditingId(dept.id);
    setNewDepartmentName(dept.name);
    setNewDepartmentCode(dept.code || '');
  };

  const handleDeleteClick = (dept: Department) => {
    setDeptToDelete(dept);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deptToDelete) {
      setDepartments(departments.filter(d => d.id !== deptToDelete.id));
    }
    setIsDeleteModalOpen(false);
    setDeptToDelete(null);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setNewDepartmentName('');
    setNewDepartmentCode(getNextCode());
  };

  return (
    <div className="flex flex-col gap-6 items-start">
      <div className="w-full flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          إدارة الأقسام
        </h1>
      </div>

      <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          {isEditing ? 'تعديل قسم' : 'إضافة قسم جديد'}
        </h2>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">كود الإدارة</label>
            <input
              type="text"
              value={newDepartmentCode}
              onChange={(e) => setNewDepartmentCode(e.target.value)}
              placeholder="كود الإدارة"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex-[2]">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم القسم</label>
            <input
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="اسم القسم"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleAddOrUpdateDepartment} 
              className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              {isEditing ? 'حفظ التعديلات' : <><PlusCircleIcon className="w-5 h-5" /> إضافة</>}
            </button>
            {isEditing && (
              <button 
                onClick={cancelEdit} 
                className="bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors">
                إلغاء
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center w-32">كود الإدارة</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300">قائمة الأقسام</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center w-32">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    لا توجد أقسام مسجلة
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4 text-center font-mono text-gray-600 dark:text-gray-400 font-bold">{dept.code || '-'}</td>
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-200">{dept.name}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <EditIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(dept)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <DeleteIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDeleteModalOpen && (
        <ConfirmationModal
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف القسم "${deptToDelete?.name}"؟`}
          confirmText="حذف"
          confirmColor="bg-red-600"
        />
      )}
    </div>
  );
};

export default DepartmentManagement;
