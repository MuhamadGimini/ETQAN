import React, { useState, useEffect, useRef } from 'react';
import type { Employee, AttendanceRecord, SalaryRecord, MgmtUser, SalesInvoice, SalesReturn, SalesRepresentative, Department, Expense, ExpenseCategory } from '../types';
import { SaveIcon, DollarSignIcon, PrinterIcon, FileTextIcon, MessageCircle } from 'lucide-react';

interface SalariesProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  salaryRecords: SalaryRecord[];
  setSalaryRecords: React.Dispatch<React.SetStateAction<SalaryRecord[]>>;
  currentUser: MgmtUser;
  salesInvoices: SalesInvoice[];
  salesReturns: SalesReturn[];
  salesRepresentatives: SalesRepresentative[];
  departments: Department[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
}

const Salaries: React.FC<SalariesProps> = ({ employees, attendanceRecords, salaryRecords, setSalaryRecords, currentUser, salesInvoices, salesReturns, salesRepresentatives, departments, expenses, expenseCategories }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [currentRecords, setCurrentRecords] = useState<Record<number, Partial<SalaryRecord>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [printingEmpId, setPrintingEmpId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Initialize records for the selected month
  useEffect(() => {
    const recordsForMonth = salaryRecords.filter(r => r.month === selectedMonth);
    const initialRecords: Record<number, Partial<SalaryRecord>> = {};
    
    employees.forEach(emp => {
      const existingRecord = recordsForMonth.find(r => r.employeeId === emp.id);
      
      // Calculate working days and late days from attendance
      const empAttendance = attendanceRecords.filter(r => 
        r.employeeId === emp.id && 
        r.date.startsWith(selectedMonth)
      );
      
      const workingDays = empAttendance.filter(r => 
        ['present', 'late', 'excused', 'vacation'].includes(r.status)
      ).length;
      
      const lateDays = empAttendance.filter(r => r.status === 'late').length;

      // Calculate total late and overtime minutes
      let totalLateMinutes = 0;
      let totalOvertimeMinutes = 0;

      empAttendance.forEach(r => {
        if (emp.scheduledCheckInTime && r.checkInTime) {
          const [schedInH, schedInM] = emp.scheduledCheckInTime.split(':').map(Number);
          const [actualInH, actualInM] = r.checkInTime.split(':').map(Number);
          const schedInTotal = schedInH * 60 + schedInM;
          const actualInTotal = actualInH * 60 + actualInM;
          if (actualInTotal > schedInTotal) totalLateMinutes += (actualInTotal - schedInTotal);
        }

        if (emp.scheduledCheckOutTime && r.checkOutTime) {
          const [schedOutH, schedOutM] = emp.scheduledCheckOutTime.split(':').map(Number);
          const [actualOutH, actualOutM] = r.checkOutTime.split(':').map(Number);
          let schedOutTotal = schedOutH * 60 + schedOutM;
          let actualOutTotal = actualOutH * 60 + actualOutM;
          if (actualOutTotal < actualOutTotal - 12 * 60) actualOutTotal += 24 * 60;
          if (schedOutTotal < schedOutTotal - 12 * 60) schedOutTotal += 24 * 60;

          if (actualOutTotal < schedOutTotal) {
            totalLateMinutes += (schedOutTotal - actualOutTotal);
          } else if (actualOutTotal > schedOutTotal) {
            totalOvertimeMinutes += (actualOutTotal - schedOutTotal);
          }
        }
      });

      // Calculate financial values
      const baseMonthlySalary = emp.salary || 0;
      const workingHoursPerDay = emp.workingHoursPerDay || 8;
      
      // Calculate working days in month (assuming 30 days minus vacation days)
      const vacationDaysPerWeek = emp.vacationDays?.length || 0;
      const averageWorkingDaysPerMonth = 30 - (vacationDaysPerWeek * 4); // Rough estimate
      
      const dayValue = baseMonthlySalary / (averageWorkingDaysPerMonth > 0 ? averageWorkingDaysPerMonth : 26);
      const hourValue = dayValue / workingHoursPerDay;
      const minuteValue = hourValue / 60;

      const calculatedBasicSalary = Math.round(dayValue * workingDays);
      const calculatedLates = Math.round(totalLateMinutes * minuteValue);
      const calculatedOvertime = Math.round(totalOvertimeMinutes * minuteValue);

      // Calculate sales commission
      let calculatedCommission = 0;
      const empDepartment = departments.find(d => d.id === emp.departmentId);
      if (empDepartment && empDepartment.name.includes('مبيعات') && emp.commissionType && emp.commissionType !== 'none') {
        // Find corresponding sales representative
        const salesRep = salesRepresentatives.find(rep => rep.name === emp.name);
        
        if (salesRep) {
          // Find sales invoices and returns for this employee in the selected month
          const empSales = salesInvoices.filter(inv => 
            inv.salesRepId === salesRep.id && 
            inv.date.startsWith(selectedMonth)
          );
          const empReturns = salesReturns.filter(ret => 
            ret.salesRepId === salesRep.id && 
            ret.date.startsWith(selectedMonth)
          );

          if (emp.commissionType === 'percentage') {
            const totalSalesAmount = empSales.reduce((sum, inv) => {
              const itemsTotal = inv.items.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
              return sum + itemsTotal - (inv.discount || 0) + (inv.tax || 0);
            }, 0);
            const totalReturnsAmount = empReturns.reduce((sum, ret) => {
              const itemsTotal = ret.items.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
              return sum + itemsTotal - (ret.discount || 0) + (ret.tax || 0);
            }, 0);
            
            const netSalesAmount = totalSalesAmount - totalReturnsAmount;
            calculatedCommission = Math.round(netSalesAmount * ((emp.commissionValue || 0) / 100));
          } else if (emp.commissionType === 'per_item') {
            const totalItemsSold = empSales.reduce((sum, inv) => {
              return sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
            }, 0);
            const totalItemsReturned = empReturns.reduce((sum, ret) => {
              return sum + ret.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
            }, 0);
            
            const netItemsSold = totalItemsSold - totalItemsReturned;
            calculatedCommission = Math.round(netItemsSold * (emp.commissionValue || 0));
          }
        }
      }

      // Calculate advances from expenses
      const advancesCategory = expenseCategories.find(c => c.name?.includes('سلف') || c.name?.includes('مرتبات'));
      let calculatedAdvances = 0;
      
      if (advancesCategory) {
        const empAdvances = expenses.filter(exp => 
          exp.categoryId === advancesCategory.id && 
          exp.date?.startsWith(selectedMonth) &&
          (exp.beneficiary?.includes(emp.name) || exp.notes?.includes(emp.name))
        );
        calculatedAdvances = empAdvances.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      }

      if (existingRecord) {
        // If attendance changed, we might want to recalculate, but we'll respect saved values if they exist.
        // To be smart, if workingDays changed since last save, we recalculate basicSalary.
        const shouldRecalculate = existingRecord.workingDays !== workingDays;
        
        const basic = Number(shouldRecalculate ? calculatedBasicSalary : (existingRecord.basicSalary ?? calculatedBasicSalary)) || 0;
        const lates = Number(shouldRecalculate ? calculatedLates : (existingRecord.lates ?? calculatedLates)) || 0;
        const overtime = Number(shouldRecalculate ? calculatedOvertime : (existingRecord.overtime ?? calculatedOvertime)) || 0;
        const commission = Number(existingRecord.commission ?? calculatedCommission) || 0;
        const bonuses = Number(existingRecord.bonuses ?? 0) || 0;
        const deductions = Number(existingRecord.deductions ?? 0) || 0;
        const advances = Number(calculatedAdvances) || 0;

        initialRecords[emp.id] = { 
          ...existingRecord,
          workingDays: workingDays,
          basicSalary: basic,
          lates: lates,
          overtime: overtime,
          commission: commission,
          advances: advances, // Always update advances from expenses
          netSalary: basic + overtime + commission + bonuses - lates - deductions - advances
        };
      } else {
        const basic = Number(calculatedBasicSalary) || 0;
        const lates = Number(calculatedLates) || 0;
        const overtime = Number(calculatedOvertime) || 0;
        const commission = Number(calculatedCommission) || 0;
        const advances = Number(calculatedAdvances) || 0;

        initialRecords[emp.id] = {
          employeeId: emp.id,
          month: selectedMonth,
          basicSalary: basic,
          workingDays: workingDays,
          lates: lates,
          overtime: overtime,
          commission: commission,
          deductions: 0,
          bonuses: 0,
          advances: advances,
          netSalary: basic + overtime + commission - lates - advances,
          isPaid: false
        };
      }
    });
    
    setCurrentRecords(initialRecords);
  }, [selectedMonth, employees, attendanceRecords, salaryRecords, expenses, expenseCategories]);

  const handleRecordChange = (employeeId: number, field: keyof SalaryRecord, value: any) => {
    setCurrentRecords(prev => {
      const record = { ...prev[employeeId], [field]: value };
      
      // Recalculate net salary
      const basic = Number(record.basicSalary) || 0;
      const overtime = Number(record.overtime) || 0;
      const commission = Number(record.commission) || 0;
      const bonuses = Number(record.bonuses) || 0;
      const lates = Number(record.lates) || 0;
      const deductions = Number(record.deductions) || 0;
      const advances = Number(record.advances) || 0;
      
      record.netSalary = basic + overtime + commission + bonuses - lates - deductions - advances;
      
      return {
        ...prev,
        [employeeId]: record
      };
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    
    const newRecords = Object.values(currentRecords).map(record => {
      const existingRecord = salaryRecords.find(r => r.employeeId === record.employeeId && r.month === selectedMonth);
      
      if (existingRecord) {
        return {
          ...existingRecord,
          ...record,
          lastModifiedAt: new Date().toISOString(),
          lastModifiedBy: currentUser.username
        } as SalaryRecord;
      } else {
        return {
          ...record,
          id: Date.now() + Math.random(),
          createdAt: new Date().toISOString(),
          createdBy: currentUser.username
        } as SalaryRecord;
      }
    });

    const filteredRecords = salaryRecords.filter(r => r.month !== selectedMonth);
    setSalaryRecords([...filteredRecords, ...newRecords]);
    
    window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتحديث سجل المرتبات لشهر ${selectedMonth}` }));
    
    setTimeout(() => {
      setIsSaving(false);
      alert('تم حفظ سجل المرتبات بنجاح!');
    }, 500);
  };

  const handlePrintEmployee = (empId: number) => {
    setPrintingEmpId(empId);
    // Give React enough time to render the print view
    setTimeout(() => {
      window.print();
      // Reset after print dialog closes (or after a reasonable delay)
      // Note: In some browsers, window.print() blocks, so this runs after the dialog closes.
      setPrintingEmpId(null);
    }, 500);
  };

  const inputClass = "h-10 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200 text-sm font-bold text-center transition-colors print:appearance-none print:border-none print:bg-transparent print:p-0 print:m-0 print:text-gray-900";

  return (
    <div className="flex flex-col gap-6 items-start">
      {/* Top Bar */}
      <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <DollarSignIcon className="h-7 w-7 text-green-600 dark:text-green-400" />
            سجل المرتبات
          </h1>
          
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <label className="font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap px-2">الشهر:</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-800 dark:text-gray-200 font-bold dir-ltr"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
            onClick={() => window.print()}
          >
            <PrinterIcon className="w-4 h-4" />
            <span>طباعة</span>
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm disabled:opacity-70"
          >
            {isSaving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SaveIcon className="w-4 h-4" />
            )}
            <span>حفظ المرتبات</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden print:overflow-visible print:shadow-none print:border-none">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center print:hidden">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">جدول المرتبات</h2>
        </div>

        <div className={`overflow-x-auto print:overflow-visible ${printingEmpId ? 'print:hidden' : 'print:block'}`}>
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">كشف مرتبات الموظفين</h1>
            <p className="text-lg">عن شهر: {selectedMonth}</p>
          </div>
          <table className="w-full text-right border-collapse table-fixed print:table-auto print:border print:border-gray-300">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 print:bg-gray-100">
              <tr>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">كود الموظف</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap w-2/12 text-xs print:border print:border-gray-300">اسم الموظف</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">الراتب الأساسي</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">أيام العمل</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">الراتب المستحق</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">سلف</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">تأخيرات</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">إضافي</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">عمولة مبيعات</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">خصم</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:border print:border-gray-300">مكافآت</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 bg-green-50 dark:bg-green-900/20 text-xs print:border print:border-gray-300">صافي المرتب</th>
                <th className="p-2 font-bold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap w-1/12 text-xs print:hidden">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    لا يوجد موظفين مسجلين في النظام.
                  </td>
                </tr>
              ) : (
                employees.map(emp => {
                  const record = currentRecords[emp.id] || {};
                  
                  // Get late days count for hint
                  const empAttendance = attendanceRecords.filter(r => 
                    r.employeeId === emp.id && 
                    r.date.startsWith(selectedMonth)
                  );
                  
                  let totalLateMinutes = 0;
                  let totalOvertimeMinutes = 0;

                  empAttendance.forEach(r => {
                    if (emp.scheduledCheckInTime && r.checkInTime) {
                      const [schedInH, schedInM] = emp.scheduledCheckInTime.split(':').map(Number);
                      const [actualInH, actualInM] = r.checkInTime.split(':').map(Number);
                      const schedInTotal = schedInH * 60 + schedInM;
                      const actualInTotal = actualInH * 60 + actualInM;
                      if (actualInTotal > schedInTotal) totalLateMinutes += (actualInTotal - schedInTotal);
                    }

                    if (emp.scheduledCheckOutTime && r.checkOutTime) {
                      const [schedOutH, schedOutM] = emp.scheduledCheckOutTime.split(':').map(Number);
                      const [actualOutH, actualOutM] = r.checkOutTime.split(':').map(Number);
                      let schedOutTotal = schedOutH * 60 + schedOutM;
                      let actualOutTotal = actualOutH * 60 + actualOutM;
                      if (actualOutTotal < actualOutTotal - 12 * 60) actualOutTotal += 24 * 60;
                      if (schedOutTotal < schedOutTotal - 12 * 60) schedOutTotal += 24 * 60;

                      if (actualOutTotal < schedOutTotal) {
                        totalLateMinutes += (schedOutTotal - actualOutTotal);
                      } else if (actualOutTotal > schedOutTotal) {
                        totalOvertimeMinutes += (actualOutTotal - schedOutTotal);
                      }
                    }
                  });

                  const formatMinutes = (m: number) => {
                    if (m === 0) return '';
                    const h = Math.floor(m / 60);
                    const mins = m % 60;
                    return h > 0 ? `${h}س ${mins}د` : `${mins}د`;
                  };

                  return (
                    <React.Fragment key={emp.id}>
                      <tr className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors print:border-b print:border-gray-300">
                        <td className="p-2 text-center font-mono text-gray-600 dark:text-gray-400 text-xs print:border print:border-gray-300">{emp.code || '-'}</td>
                        <td className="p-2 print:border print:border-gray-300">
                          <div className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate" title={emp.name}>{emp.name}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{emp.jobTitle}</div>
                        </td>
                        <td className="p-2 text-center font-bold text-gray-700 dark:text-gray-300 text-xs print:border print:border-gray-300">
                          {emp.salary?.toLocaleString() || 0}
                        </td>
                        <td className="p-2 text-center font-bold text-gray-700 dark:text-gray-300 text-xs print:border print:border-gray-300">
                          {record.workingDays || 0}
                        </td>
                        <td className="p-2 text-center print:border print:border-gray-300">
                          <input 
                            type="number" 
                            value={record.basicSalary || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'basicSalary', parseFloat(e.target.value) || 0)}
                            className={inputClass}
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center print:border print:border-gray-300">
                          <input 
                            type="number" 
                            value={record.advances || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'advances', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-orange-600 dark:text-orange-400`}
                            min="0"
                            readOnly
                            title="يتم حساب السلف تلقائياً من شاشة المصروفات"
                          />
                        </td>
                        <td className="p-2 text-center relative group print:border print:border-gray-300">
                          <input 
                            type="number" 
                            value={record.lates || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'lates', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-red-600 dark:text-red-400`}
                            min="0"
                          />
                          {totalLateMinutes > 0 && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 print:hidden" title={`إجمالي التأخير: ${formatMinutes(totalLateMinutes)}`}>
                              {formatMinutes(totalLateMinutes)}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center relative group print:border print:border-gray-300">
                          <input 
                            type="number" 
                            value={record.overtime || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'overtime', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-green-600 dark:text-green-400`}
                            min="0"
                          />
                          {totalOvertimeMinutes > 0 && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 print:hidden" title={`إجمالي الإضافي: ${formatMinutes(totalOvertimeMinutes)}`}>
                              {formatMinutes(totalOvertimeMinutes)}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center print:border print:border-gray-300">
                          <input 
                            type="number" 
                            value={record.commission || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'commission', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-blue-600 dark:text-blue-400`}
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center print:border print:border-gray-300">
                          <input 
                            type="number" 
                            value={record.deductions || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'deductions', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-red-600 dark:text-red-400`}
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center print:border print:border-gray-300">
                          <input 
                            type="number" 
                            value={record.bonuses || 0} 
                            onChange={(e) => handleRecordChange(emp.id, 'bonuses', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-green-600 dark:text-green-400`}
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center bg-green-50 dark:bg-green-900/20 font-black text-sm text-green-700 dark:text-green-300 print:border print:border-gray-300 print:bg-transparent">
                          {(record.netSalary || 0).toLocaleString()}
                        </td>
                        <td className="p-2 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handlePrintEmployee(emp.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="طباعة تقرير الموظف"
                            >
                              <FileTextIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const msg = `مرحباً ${emp.name}،\nتفاصيل راتبك لشهر ${selectedMonth}:\nالراتب الأساسي: ${record.basicSalary}\nإضافي: ${record.overtime}\nعمولة: ${record.commission}\nمكافآت: ${record.bonuses}\nتأخيرات: ${record.lates}\nسلف: ${record.advances}\nخصومات: ${record.deductions}\nصافي المرتب: ${record.netSalary}`;
                                const url = `https://wa.me/${emp.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
                                window.open(url, '_blank');
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                              title="إرسال عبر واتساب"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 print:hidden">
                        <td colSpan={13} className="p-2 px-4">
                          <input
                            type="text"
                            placeholder="ملاحظات على الراتب..."
                            value={record.notes || ''}
                            onChange={(e) => handleRecordChange(emp.id, 'notes', e.target.value)}
                            className="w-full text-sm bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Employee Report */}
        {printingEmpId && (
          <div className="hidden print:block p-8" ref={printRef}>
            {(() => {
              const emp = employees.find(e => e.id === printingEmpId);
              if (!emp) return null;
              const record = currentRecords[emp.id] || {};
              const empAttendance = attendanceRecords.filter(r => 
                r.employeeId === emp.id && 
                r.date.startsWith(selectedMonth)
              ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              return (
                <div className="space-y-8" dir="rtl">
                  {/* Header */}
                  <div className="text-center border-b-2 border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold mb-2">تقرير راتب موظف</h1>
                    <p className="text-xl">عن شهر: {selectedMonth}</p>
                  </div>

                  {/* Employee Info */}
                  <div className="grid grid-cols-2 gap-4 text-lg">
                    <div><span className="font-bold">اسم الموظف:</span> {emp.name}</div>
                    <div><span className="font-bold">كود الموظف:</span> {emp.code || '-'}</div>
                    <div><span className="font-bold">المسمى الوظيفي:</span> {emp.jobTitle || '-'}</div>
                    <div><span className="font-bold">الراتب الأساسي:</span> {emp.salary?.toLocaleString()}</div>
                  </div>

                  {/* Salary Details Table */}
                  <div>
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">تفاصيل الراتب</h2>
                    <table className="w-full text-right border-collapse border border-gray-300">
                      <tbody>
                        <tr className="border-b border-gray-300">
                          <th className="p-3 bg-gray-100 w-1/2 border-l border-gray-300">الراتب الأساسي (لأيام العمل)</th>
                          <td className="p-3">{record.basicSalary?.toLocaleString() || 0}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <th className="p-3 bg-gray-100 border-l border-gray-300">أيام العمل</th>
                          <td className="p-3">{record.workingDays || 0}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <th className="p-3 bg-gray-100 border-l border-gray-300 text-green-600">إضافي</th>
                          <td className="p-3 text-green-600">{record.overtime?.toLocaleString() || 0}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <th className="p-3 bg-gray-100 border-l border-gray-300 text-blue-600">عمولة مبيعات</th>
                          <td className="p-3 text-blue-600">{record.commission?.toLocaleString() || 0}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <th className="p-3 bg-gray-100 border-l border-gray-300 text-green-600">مكافآت</th>
                          <td className="p-3 text-green-600">{record.bonuses?.toLocaleString() || 0}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <th className="p-3 bg-gray-100 border-l border-gray-300 text-red-600">تأخيرات</th>
                          <td className="p-3 text-red-600">{record.lates?.toLocaleString() || 0}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <th className="p-3 bg-gray-100 border-l border-gray-300 text-orange-600">سلف</th>
                          <td className="p-3 text-orange-600">{record.advances?.toLocaleString() || 0}</td>
                        </tr>
                        <tr className="border-b border-gray-300">
                          <th className="p-3 bg-gray-100 border-l border-gray-300 text-red-600">خصومات</th>
                          <td className="p-3 text-red-600">{record.deductions?.toLocaleString() || 0}</td>
                        </tr>
                        <tr className="border-b-2 border-gray-800 text-xl">
                          <th className="p-4 bg-gray-200 border-l border-gray-300 font-black">صافي المرتب</th>
                          <td className="p-4 font-black">{record.netSalary?.toLocaleString() || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                    {record.notes && (
                      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                        <span className="font-bold">ملاحظات: </span> {record.notes}
                      </div>
                    )}
                  </div>

                  {/* Attendance Log */}
                  <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">سجل الحضور والانصراف</h2>
                    <table className="w-full text-right border-collapse border border-gray-300 text-sm">
                      <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 bg-gray-100">
                        <tr>
                          <th className="p-2 border border-gray-300">التاريخ</th>
                          <th className="p-2 border border-gray-300">الحضور</th>
                          <th className="p-2 border border-gray-300">الانصراف</th>
                          <th className="p-2 border border-gray-300">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empAttendance.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center border border-gray-300">لا توجد سجلات حضور لهذا الشهر</td>
                          </tr>
                        ) : (
                          empAttendance.map(att => (
                            <tr key={att.id}>
                              <td className="p-2 border border-gray-300">{att.date}</td>
                              <td className="p-2 border border-gray-300">{att.checkInTime || '-'}</td>
                              <td className="p-2 border border-gray-300">{att.checkOutTime || '-'}</td>
                              <td className="p-2 border border-gray-300">
                                {att.status === 'present' ? 'حضور' :
                                 att.status === 'absent' ? 'غياب' :
                                 att.status === 'late' ? 'تأخير' :
                                 att.status === 'excused' ? 'إذن' : 'إجازة'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-8 mt-16 text-center text-lg">
                    <div>
                      <p className="font-bold mb-8">توقيع الموظف</p>
                      <div className="border-b border-gray-400 w-48 mx-auto"></div>
                    </div>
                    <div>
                      <p className="font-bold mb-8">توقيع المدير</p>
                      <div className="border-b border-gray-400 w-48 mx-auto"></div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Salaries;
