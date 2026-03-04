import React, { useState } from 'react';
import { PlusCircleIcon, PencilIcon, TrashIcon, BanIcon, CheckCircleIcon, SearchIcon, XIcon, SaveIcon } from 'lucide-react';
import type { Employee, DayOfWeek, Department, MgmtUser } from '../types';

interface EmployeeManagementProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  currentUser: MgmtUser;
  departments: Department[];
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ employees, setEmployees, currentUser, departments }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const initialEmployeeState: Omit<Employee, 'id' | 'createdAt' | 'createdBy'> = {
    code: '',
    name: '',
    phone: '',
    nationalId: '',
    address: '',
    jobTitle: '',
    departmentId: departments.length > 0 ? departments[0].id : 0,
    salary: 0,
    vacationDays: [],
    scheduledCheckInTime: '',
    scheduledCheckOutTime: '',
    workingHoursPerDay: 8,
    commissionType: 'none',
    commissionValue: 0,
    isBlocked: false,
  };

  const [currentEmployee, setCurrentEmployee] = useState<Employee | Omit<Employee, 'id'>>({ ...initialEmployeeState });

  const daysOfWeek: { key: DayOfWeek; label: string }[] = [
    { key: 'Saturday', label: 'السبت' },
    { key: 'Sunday', label: 'الأحد' },
    { key: 'Monday', label: 'الاثنين' },
    { key: 'Tuesday', label: 'الثلاثاء' },
    { key: 'Wednesday', label: 'الأربعاء' },
    { key: 'Thursday', label: 'الخميس' },
    { key: 'Friday', label: 'الجمعة' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentEmployee({ 
      ...currentEmployee, 
      [name]: name === 'departmentId' || name === 'salary' || name === 'workingHoursPerDay' || name === 'commissionValue' ? Number(value) : value 
    });
  };

  const handleDayToggle = (day: DayOfWeek) => {
    const currentVacationDays = currentEmployee.vacationDays || [];
    const vacationDays = currentVacationDays.includes(day)
      ? currentVacationDays.filter((d) => d !== day)
      : [...currentVacationDays, day];
    setCurrentEmployee({ ...currentEmployee, vacationDays });
  };

  const handleSubmit = () => {
    if (!currentEmployee.name || !currentEmployee.code) {
      alert('يرجى إدخال اسم العامل وكود العامل');
      return;
    }

    if (isEditing && 'id' in currentEmployee) {
      setEmployees(employees.map(emp => emp.id === currentEmployee.id ? { ...currentEmployee, lastModifiedAt: new Date().toISOString(), lastModifiedBy: currentUser.username } as Employee : emp));
      window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل بيانات العامل ${currentEmployee.name}` }));
    } else {
      const newId = Math.max(...employees.map(e => e.id), 0) + 1;
      setEmployees([...employees, { ...currentEmployee, id: newId, createdAt: new Date().toISOString(), createdBy: currentUser.username } as Employee]);
      window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإضافة العامل الجديد ${currentEmployee.name}` }));
    }
    closeModal();
  };

  const handleEdit = (employee: Employee) => {
    setCurrentEmployee({ ...employee });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العامل؟')) {
      const employee = employees.find(e => e.id === id);
      setEmployees(employees.filter(e => e.id !== id));
      window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بحذف العامل ${employee?.name}` }));
    }
  };

  const handleToggleBlock = (id: number) => {
    const employee = employees.find(e => e.id === id);
    if (employee) {
      const newStatus = !employee.isBlocked;
      setEmployees(employees.map(e => e.id === id ? { ...e, isBlocked: newStatus } : e));
      window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} ${newStatus ? 'بحظر' : 'بفك حظر'} العامل ${employee.name}` }));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentEmployee({ ...initialEmployeeState, departmentId: departments.length > 0 ? departments[0].id : 0 });
  };

  const handleAddEmployee = () => {
    // Generate code starting from 1
    const maxCode = employees.reduce((max, emp) => {
      const codeNum = parseInt(emp.code || '0', 10);
      return !isNaN(codeNum) && codeNum > max ? codeNum : max;
    }, 0);
    const nextCode = (maxCode + 1).toString();

    setCurrentEmployee({
      ...initialEmployeeState,
      code: nextCode,
      departmentId: departments.length > 0 ? departments[0].id : 0
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const filteredEmployees = employees.filter(emp => 
    (emp.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (emp.code || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (emp.phone || '').includes(searchQuery || '')
  );

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span className="text-blue-600">إدارة</span> العاملين
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة بيانات الموظفين والرواتب والإجازات</p>
            </div>
            <button 
                onClick={handleAddEmployee}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 font-bold"
            >
                <PlusCircleIcon className="w-5 h-5" />
                <span>إضافة عامل جديد</span>
            </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="relative max-w-md">
                    <input 
                        type="text" 
                        placeholder="بحث بكود العامل، الاسم، أو رقم الهاتف..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 font-bold">
                        <tr>
                            <th className="p-4">الكود</th>
                            <th className="p-4">اسم العامل</th>
                            <th className="p-4">القسم / الوظيفة</th>
                            <th className="p-4">رقم الهاتف</th>
                            <th className="p-4">الراتب الأساسي</th>
                            <th className="p-4">أيام الإجازات</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((employee) => (
                                <tr key={employee.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${employee.isBlocked ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                    <td className="p-4 font-mono text-blue-600 dark:text-blue-400 font-bold">{employee.code || '-'}</td>
                                    <td className="p-4 font-bold text-gray-800 dark:text-gray-100">
                                        <div>{employee.name}</div>
                                        <div className="text-xs text-gray-400 font-normal mt-1">{employee.nationalId || '-'}</div>
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300">
                                        <div className="font-bold">{departments.find(d => d.id === employee.departmentId)?.name}</div>
                                        <div className="text-xs">{employee.jobTitle}</div>
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300 font-mono" dir="ltr">{employee.phone || '-'}</td>
                                    <td className="p-4 text-blue-600 dark:text-blue-400 font-bold">{(employee.salary || 0).toLocaleString()}</td>
                                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">
                                        {employee.vacationDays?.map(day => daysOfWeek.find(d => d.key === day)?.label).join('، ') || '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${employee.isBlocked ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                            {employee.isBlocked ? 'محظور' : 'نشط'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handleEdit(employee)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="تعديل"
                                            >
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => handleToggleBlock(employee.id)}
                                                className={`p-2 rounded-lg transition-colors ${employee.isBlocked ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
                                                title={employee.isBlocked ? "فك الحظر" : "حظر"}
                                            >
                                                {employee.isBlocked ? <CheckCircleIcon className="w-5 h-5" /> : <BanIcon className="w-5 h-5" />}
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(employee.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="حذف"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    لا يوجد عاملين مضافين حالياً
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {isEditing ? <PencilIcon className="w-5 h-5 text-blue-500" /> : <PlusCircleIcon className="w-5 h-5 text-blue-500" />}
                        {isEditing ? 'تعديل بيانات عامل' : 'إضافة عامل جديد'}
                    </h2>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">كود العامل <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="code"
                                value={currentEmployee.code}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                                placeholder="مثال: EMP-001"
                            />
                        </div>
                        
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم العامل <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={currentEmployee.name}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="الاسم ثلاثي"
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف</label>
                            <input
                                type="text"
                                name="phone"
                                value={currentEmployee.phone}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                                dir="ltr"
                                placeholder="01xxxxxxxxx"
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الرقم القومي</label>
                            <input
                                type="text"
                                name="nationalId"
                                value={currentEmployee.nationalId}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                                maxLength={14}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">العنوان</label>
                            <input
                                type="text"
                                name="address"
                                value={currentEmployee.address}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الإدارة</label>
                            <select
                                name="departmentId"
                                value={currentEmployee.departmentId}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">المسمى الوظيفي</label>
                            <input
                                type="text"
                                name="jobTitle"
                                value={currentEmployee.jobTitle}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الراتب الأساسي</label>
                                <input
                                    type="number"
                                    name="salary"
                                    value={currentEmployee.salary}
                                    onChange={handleInputChange}
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                    min="0"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ساعات العمل في اليوم</label>
                                <input
                                    type="number"
                                    name="workingHoursPerDay"
                                    value={currentEmployee.workingHoursPerDay || 8}
                                    onChange={handleInputChange}
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                    min="1"
                                    max="24"
                                />
                            </div>
                        </div>

                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">موعد الحضور</label>
                                <input
                                    type="time"
                                    name="scheduledCheckInTime"
                                    value={currentEmployee.scheduledCheckInTime || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">موعد الانصراف</label>
                                <input
                                    type="time"
                                    name="scheduledCheckOutTime"
                                    value={currentEmployee.scheduledCheckOutTime || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نوع العمولة</label>
                                <select
                                    name="commissionType"
                                    value={currentEmployee.commissionType || 'none'}
                                    onChange={handleInputChange}
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="none">بدون عمولة</option>
                                    <option value="percentage">نسبة مئوية (%)</option>
                                    <option value="per_item">مبلغ ثابت للقطعة</option>
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">قيمة العمولة</label>
                                <input
                                    type="number"
                                    name="commissionValue"
                                    value={currentEmployee.commissionValue || 0}
                                    onChange={handleInputChange}
                                    disabled={!currentEmployee.commissionType || currentEmployee.commissionType === 'none'}
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">أيام الإجازات الأسبوعية</label>
                            <div className="flex flex-wrap gap-2">
                                {daysOfWeek.map((day) => {
                                    const isSelected = (currentEmployee.vacationDays || []).includes(day.key);
                                    return (
                                    <button
                                        key={day.key}
                                        onClick={() => handleDayToggle(day.key)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                                            isSelected
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                )})}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <button 
                        onClick={closeModal}
                        className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 transition-all"
                    >
                        <SaveIcon className="w-5 h-5" />
                        <span>{isEditing ? 'حفظ التعديلات' : 'إضافة العامل'}</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
