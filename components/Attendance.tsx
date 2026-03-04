import React, { useState, useMemo, useEffect } from 'react';
import type { Employee, AttendanceRecord, MgmtUser, Department } from '../types';
import { SaveIcon, CalendarIcon, ClockIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon, Upload, Trash2, Edit3, MessageSquare, EyeIcon, EyeOffIcon, SearchIcon, XIcon } from 'lucide-react';

interface AttendanceProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  currentUser: MgmtUser;
  departments: Department[];
}

const Attendance: React.FC<AttendanceProps> = ({ employees, attendanceRecords, setAttendanceRecords, currentUser, departments }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyRecords, setDailyRecords] = useState<Record<number, Partial<AttendanceRecord>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Attendance Log State
  const [showAttendanceLog, setShowAttendanceLog] = useState(false);
  const [searchEmpCode, setSearchEmpCode] = useState('');
  const [searchEmpName, setSearchEmpName] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter(record => {
      const emp = employees.find(e => e.id === record.employeeId);
      if (!emp) return false;
      
      const matchCode = searchEmpCode ? (emp.code || '').toLowerCase().includes(searchEmpCode.toLowerCase()) : true;
      const matchName = searchEmpName ? (emp.name || '').toLowerCase().includes(searchEmpName.toLowerCase()) : true;
      const matchDateFrom = searchDateFrom ? record.date >= searchDateFrom : true;
      const matchDateTo = searchDateTo ? record.date <= searchDateTo : true;
      
      return matchCode && matchName && matchDateFrom && matchDateTo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceRecords, employees, searchEmpCode, searchEmpName, searchDateFrom, searchDateTo]);

  const clearFilters = () => {
    setSearchEmpCode('');
    setSearchEmpName('');
    setSearchDateFrom('');
    setSearchDateTo('');
  };

  // Initialize daily records when date or employees change
  useEffect(() => {
    const recordsForDate = attendanceRecords.filter(r => r.date === selectedDate);
    const initialRecords: Record<number, Partial<AttendanceRecord>> = {};
    
    employees.forEach(emp => {
      const existingRecord = recordsForDate.find(r => r.employeeId === emp.id);
      if (existingRecord) {
        initialRecords[emp.id] = { ...existingRecord };
      } else {
        // Determine default status based on vacation days
        const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }) as any;
        const isVacation = emp.vacationDays?.includes(dayOfWeek);
        
        initialRecords[emp.id] = {
          employeeId: emp.id,
          date: selectedDate,
          status: isVacation ? 'vacation' : 'present',
          checkInTime: emp.scheduledCheckInTime || '',
          checkOutTime: emp.scheduledCheckOutTime || '',
          notes: '',
          dataSource: 'manual'
        };
      }
    });
    
    setDailyRecords(initialRecords);
  }, [selectedDate, employees, attendanceRecords]);

  const handleRecordChange = (employeeId: number, field: keyof AttendanceRecord, value: any) => {
    setDailyRecords(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    
    const newRecords = Object.values(dailyRecords).map(record => {
      const existingRecord = attendanceRecords.find(r => r.employeeId === record.employeeId && r.date === selectedDate);
      
      if (existingRecord) {
        return {
          ...existingRecord,
          ...record,
          lastModifiedAt: new Date().toISOString(),
          lastModifiedBy: currentUser.username
        } as AttendanceRecord;
      } else {
        return {
          ...record,
          id: Date.now() + Math.random(),
          createdAt: new Date().toISOString(),
          createdBy: currentUser.username
        } as AttendanceRecord;
      }
    });

    // Remove old records for this date and add new ones
    const filteredRecords = attendanceRecords.filter(r => r.date !== selectedDate);
    setAttendanceRecords([...filteredRecords, ...newRecords]);
    
    window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتحديث سجل الحضور والانصراف ليوم ${selectedDate}` }));
    
    setTimeout(() => {
      setIsSaving(false);
      alert('تم حفظ سجل الحضور والانصراف بنجاح!');
    }, 500);
  };

  const stats = useMemo(() => {
    const records = Object.values(dailyRecords);
    return {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
      vacation: records.filter(r => r.status === 'vacation').length,
    };
  }, [dailyRecords]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'vacation': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const calculateDuration = (checkIn?: string | null, checkOut?: string | null) => {
    if (!checkIn || !checkOut) return '-';
    const [inHours, inMinutes] = checkIn.split(':').map(Number);
    const [outHours, outMinutes] = checkOut.split(':').map(Number);
    
    let diffMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight shifts
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `${hours}س ${minutes}د`;
  };

  const calculateLateAndOvertime = (emp: Employee, checkIn?: string | null, checkOut?: string | null) => {
    let lateMinutes = 0;
    let overtimeMinutes = 0;

    if (emp.scheduledCheckInTime && checkIn) {
      const [schedInH, schedInM] = emp.scheduledCheckInTime.split(':').map(Number);
      const [actualInH, actualInM] = checkIn.split(':').map(Number);
      
      const schedInTotal = schedInH * 60 + schedInM;
      const actualInTotal = actualInH * 60 + actualInM;
      
      if (actualInTotal > schedInTotal) {
        lateMinutes += (actualInTotal - schedInTotal);
      }
    }

    if (emp.scheduledCheckOutTime && checkOut) {
      const [schedOutH, schedOutM] = emp.scheduledCheckOutTime.split(':').map(Number);
      const [actualOutH, actualOutM] = checkOut.split(':').map(Number);
      
      let schedOutTotal = schedOutH * 60 + schedOutM;
      let actualOutTotal = actualOutH * 60 + actualOutM;
      
      // Handle overnight shifts for checkout
      if (actualOutTotal < actualOutTotal - 12 * 60) actualOutTotal += 24 * 60;
      if (schedOutTotal < schedOutTotal - 12 * 60) schedOutTotal += 24 * 60;

      if (actualOutTotal < schedOutTotal) {
        // Left early - counts as late
        lateMinutes += (schedOutTotal - actualOutTotal);
      } else if (actualOutTotal > schedOutTotal) {
        // Left late - counts as overtime
        overtimeMinutes += (actualOutTotal - schedOutTotal);
      }
    }

    return { lateMinutes, overtimeMinutes };
  };

  const formatMinutes = (totalMinutes: number) => {
    if (totalMinutes === 0) return '-';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}س ${minutes}د`;
    return `${minutes}د`;
  };

  const getDataSourceLabel = (source?: string) => {
    switch (source) {
      case 'excel': return 'ملف Excel';
      case 'device': return 'جهاز بصمة';
      default: return 'يدوي';
    }
  };

  const getDataSourceColor = (source?: string) => {
    switch (source) {
      case 'excel': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'device': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const inputClass = "h-10 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200 text-sm transition-colors";

  return (
    <div className="flex flex-col gap-6 items-start">
      {/* Top Bar with Date and Bulk Operations */}
      <div className="w-full flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            سجل الحضور والانصراف
          </h1>
          
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <label className="font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap px-2">التاريخ:</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-200 font-bold"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
            onClick={() => alert('سيتم إضافة ميزة رفع ملف Excel قريباً')}
          >
            <Upload className="w-4 h-4 text-green-400" />
            <span>تحميل ملف Excel</span>
          </button>
          <button 
            className="bg-[#9ca3af] hover:bg-gray-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
            onClick={() => alert('سيتم إضافة ميزة المزامنة مع جهاز البصمة قريباً')}
          >
            <ClockIcon className="w-4 h-4" />
            <span>مزامنة مع جهاز البصمة</span>
          </button>
          <button
            onClick={() => setShowAttendanceLog(!showAttendanceLog)}
            className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
          >
            {showAttendanceLog ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            <span>{showAttendanceLog ? 'إخفاء السجل' : 'عرض السجل'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 w-full">
        {/* Attendance Log Section */}
        {showAttendanceLog && (
          <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  سجل الحضور والانصراف الكامل
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">كود الموظف</label>
                    <input
                      type="text"
                      value={searchEmpCode}
                      onChange={(e) => setSearchEmpCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="بحث بالكود..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">اسم الموظف</label>
                    <input
                      type="text"
                      value={searchEmpName}
                      onChange={(e) => setSearchEmpName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="بحث بالاسم..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">التاريخ من</label>
                    <input
                      type="date"
                      value={searchDateFrom}
                      onChange={(e) => setSearchDateFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">التاريخ إلى</label>
                    <input
                      type="date"
                      value={searchDateTo}
                      onChange={(e) => setSearchDateTo(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-bold text-sm"
                    >
                      <XIcon className="w-4 h-4" />
                      <span>تفريغ الحقول</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-white dark:bg-gray-800 sticky top-0 shadow-sm">
                      <tr>
                        <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">التاريخ</th>
                        <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">كود الموظف</th>
                        <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">اسم الموظف</th>
                        <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">الحضور</th>
                        <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">الانصراف</th>
                        <th className="p-3 font-bold text-gray-700 dark:text-gray-300 text-sm">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">
                            لا توجد سجلات مطابقة للبحث
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map(record => {
                          const emp = employees.find(e => e.id === record.employeeId);
                          return (
                            <tr key={record.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="p-3 text-sm text-gray-800 dark:text-gray-200 font-mono">{record.date}</td>
                              <td className="p-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{emp?.code || '-'}</td>
                              <td className="p-3 text-sm font-bold text-gray-800 dark:text-gray-200">{emp?.name || '-'}</td>
                              <td className="p-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{record.checkInTime || '-'}</td>
                              <td className="p-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{record.checkOutTime || '-'}</td>
                              <td className="p-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  record.status === 'present' ? 'bg-green-100 text-green-800' :
                                  record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                  record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                  record.status === 'excused' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {record.status === 'present' ? 'حضور' :
                                   record.status === 'absent' ? 'غياب' :
                                   record.status === 'late' ? 'تأخير' :
                                   record.status === 'excused' ? 'إذن' : 'إجازة'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 font-bold mb-1">الإجمالي</span>
          <span className="text-2xl font-black text-gray-800 dark:text-white">{stats.total}</span>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl shadow-sm border border-green-100 dark:border-green-800/30 flex flex-col items-center justify-center">
          <span className="text-sm text-green-600 dark:text-green-400 font-bold mb-1">حضور</span>
          <span className="text-2xl font-black text-green-700 dark:text-green-300">{stats.present}</span>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl shadow-sm border border-red-100 dark:border-red-800/30 flex flex-col items-center justify-center">
          <span className="text-sm text-red-600 dark:text-red-400 font-bold mb-1">غياب</span>
          <span className="text-2xl font-black text-red-700 dark:text-red-300">{stats.absent}</span>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl shadow-sm border border-yellow-100 dark:border-yellow-800/30 flex flex-col items-center justify-center">
          <span className="text-sm text-yellow-600 dark:text-yellow-400 font-bold mb-1">تأخير</span>
          <span className="text-2xl font-black text-yellow-700 dark:text-yellow-300">{stats.late}</span>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/30 flex flex-col items-center justify-center">
          <span className="text-sm text-blue-600 dark:text-blue-400 font-bold mb-1">إذن</span>
          <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.excused}</span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-bold mb-1">إجازة</span>
          <span className="text-2xl font-black text-gray-700 dark:text-gray-300">{stats.vacation}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center">كود الموظف</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300">اسم الموظف</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300">الإدارة</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 w-32">وقت الحضور</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 w-32">وقت الانصراف</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center">مدة العمل</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center">تأخير</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center">إضافي</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 w-36">الحالة</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center">مصدر البيانات</th>
                <th className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    لا يوجد موظفين مسجلين في النظام.
                  </td>
                </tr>
              ) : (
                employees.map(emp => {
                  const record = dailyRecords[emp.id] || {};
                  const dept = departments.find(d => d.id === emp.departmentId);
                  return (
                    <tr key={emp.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4 text-center font-mono text-gray-600 dark:text-gray-400">{emp.code || '-'}</td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800 dark:text-gray-200">{emp.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{emp.jobTitle}</div>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{dept?.name || '-'}</td>
                      <td className="p-4">
                        <div className="relative">
                          <input 
                            type="time" 
                            value={record.checkInTime || ''} 
                            onChange={(e) => handleRecordChange(emp.id, 'checkInTime', e.target.value)}
                            disabled={record.status === 'absent' || record.status === 'vacation'}
                            className={`${inputClass} disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900`}
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="relative">
                          <input 
                            type="time" 
                            value={record.checkOutTime || ''} 
                            onChange={(e) => handleRecordChange(emp.id, 'checkOutTime', e.target.value)}
                            disabled={record.status === 'absent' || record.status === 'vacation'}
                            className={`${inputClass} disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900`}
                          />
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {calculateDuration(record.checkInTime, record.checkOutTime)}
                      </td>
                      <td className="p-4 text-center font-bold text-red-600 dark:text-red-400">
                        {formatMinutes(calculateLateAndOvertime(emp, record.checkInTime, record.checkOutTime).lateMinutes)}
                      </td>
                      <td className="p-4 text-center font-bold text-green-600 dark:text-green-400">
                        {formatMinutes(calculateLateAndOvertime(emp, record.checkInTime, record.checkOutTime).overtimeMinutes)}
                      </td>
                      <td className="p-4">
                        <select 
                          value={record.status || 'present'} 
                          onChange={(e) => handleRecordChange(emp.id, 'status', e.target.value)}
                          className={`h-10 w-full px-3 py-1 rounded-lg border font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${getStatusColor(record.status)}`}
                        >
                          <option value="present">حضور</option>
                          <option value="absent">غياب</option>
                          <option value="late">تأخير</option>
                          <option value="excused">إذن</option>
                          <option value="vacation">إجازة</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDataSourceColor(record.dataSource)}`}>
                          {getDataSourceLabel(record.dataSource)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => {
                              const note = prompt('إضافة ملاحظة:', record.notes || '');
                              if (note !== null) handleRecordChange(emp.id, 'notes', note);
                            }}
                            className={`p-2 rounded-lg transition-colors ${record.notes ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            title={record.notes || 'إضافة ملاحظة'}
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              if(window.confirm('هل أنت متأكد من مسح بيانات الحضور والانصراف لهذا الموظف؟')) {
                                handleRecordChange(emp.id, 'checkInTime', '');
                                handleRecordChange(emp.id, 'checkOutTime', '');
                                handleRecordChange(emp.id, 'status', 'absent');
                                handleRecordChange(emp.id, 'notes', '');
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="مسح البيانات"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {employees.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <SaveIcon className="h-5 w-5" />
              )}
              <span>حفظ سجل الحضور والانصراف</span>
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Attendance;
