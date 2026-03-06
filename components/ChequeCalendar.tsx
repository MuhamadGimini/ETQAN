import React, { useState, useMemo } from 'react';
import { FormattedNumber } from './Shared';
import type { CustomerReceipt, SupplierPayment, Customer, Supplier } from '../types';
import { formatDateForDisplay } from '../utils';

interface ChequeCalendarProps {
    customerReceipts: CustomerReceipt[];
    supplierPayments: SupplierPayment[];
    customers: Customer[];
    suppliers: Supplier[];
}

const ChequeCalendar: React.FC<ChequeCalendarProps> = ({
    customerReceipts,
    supplierPayments,
    customers,
    suppliers
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ...
    
    // Adjust for Saturday start (0 = Saturday, 1 = Sunday, ...)
    // Standard JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    // We want: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
    // So if standard is 6 (Sat), we want 0. If 0 (Sun), we want 1.
    // Formula: (standardDay + 1) % 7
    const startDay = (firstDayOfMonth + 1) % 7;

    const checks = useMemo(() => {
        const receipts = customerReceipts
            .filter(r => r.paymentMethod === 'check' && r.checkDueDate)
            .map(r => ({
                type: 'receipt' as const,
                id: r.id,
                date: r.checkDueDate!,
                amount: r.amount,
                partyName: customers.find(c => c.id === r.customerId)?.name || 'Unknown',
                checkNumber: r.checkNumber,
                bankName: r.bankName,
                status: r.checkStatus
            }));

        const payments = supplierPayments
            .filter(p => p.paymentMethod === 'check' && p.checkDueDate)
            .map(p => ({
                type: 'payment' as const,
                id: p.id,
                date: p.checkDueDate!,
                amount: p.amount,
                partyName: suppliers.find(s => s.id === p.supplierId)?.name || 'Unknown',
                checkNumber: p.checkNumber,
                bankName: p.bankName,
                status: p.checkStatus
            }));

        return [...receipts, ...payments];
    }, [customerReceipts, supplierPayments, customers, suppliers]);

    const checksByDate = useMemo(() => {
        const map: Record<string, typeof checks> = {};
        checks.forEach(check => {
            if (!map[check.date]) map[check.date] = [];
            map[check.date].push(check);
        });
        return map;
    }, [checks]);

    const monthChecks = useMemo(() => {
        return checks.filter(c => {
            const d = new Date(c.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });
    }, [checks, year, month]);

    const totalReceipts = monthChecks.filter(c => c.type === 'receipt').reduce((sum, c) => sum + c.amount, 0);
    const totalPayments = monthChecks.filter(c => c.type === 'payment').reduce((sum, c) => sum + c.amount, 0);

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const handleToday = () => {
        const now = new Date();
        setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedDate(now.toISOString().split('T')[0]);
    };

    const renderCalendarDays = () => {
        const days = [];
        // Empty cells for days before start of month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayChecks = checksByDate[dateStr] || [];
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            const dayReceipts = dayChecks.filter(c => c.type === 'receipt');
            const dayPayments = dayChecks.filter(c => c.type === 'payment');

            days.push(
                <div 
                    key={day} 
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-24 border border-gray-200 dark:border-gray-700 p-1 relative cursor-pointer transition-colors
                        ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500 inset-0 z-10' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}
                        ${isToday ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                    `}
                >
                    <div className={`flex justify-between items-center px-1 ${isToday ? 'text-blue-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                        <span>{day}</span>
                        {dayChecks.length > 0 && <span className="text-[10px] bg-gray-200 dark:bg-gray-600 px-1 rounded-full text-gray-700 dark:text-gray-300">{dayChecks.length}</span>}
                    </div>
                    
                    <div className="mt-1 space-y-1 overflow-hidden">
                        {dayReceipts.length > 0 && (
                            <div className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-1 rounded truncate">
                                قبض: {dayReceipts.length}
                            </div>
                        )}
                        {dayPayments.length > 0 && (
                            <div className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-1 rounded truncate">
                                دفع: {dayPayments.length}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };

    const selectedDayChecks = selectedDate ? (checksByDate[selectedDate] || []) : [];

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">أجندة الشيكات</h1>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                        </button>
                        <span className="font-bold text-lg min-w-[140px] text-center">
                            {currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                    <button onClick={handleToday} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold hover:bg-indigo-200 transition-colors">اليوم</button>
                </div>
                <div className="flex gap-4 text-sm">
                    <div className="bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-lg border border-green-200 dark:border-green-800">
                        <span className="text-gray-500 dark:text-gray-400 ml-2">تحصيل:</span>
                        <span className="font-bold text-green-600"><FormattedNumber value={totalReceipts} /></span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-lg border border-red-200 dark:border-red-800">
                        <span className="text-gray-500 dark:text-gray-400 ml-2">سداد:</span>
                        <span className="font-bold text-red-600"><FormattedNumber value={totalPayments} /></span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(day => (
                            <div key={day} className="p-2 text-center font-bold text-gray-600 dark:text-gray-300 text-sm">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 flex-1 overflow-y-auto">
                        {renderCalendarDays()}
                    </div>
                </div>

                <div className="w-full lg:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                            {selectedDate ? `شيكات يوم ${formatDateForDisplay(selectedDate)}` : 'اختر يوماً لعرض التفاصيل'}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {selectedDayChecks.length > 0 ? (
                            selectedDayChecks.map((check, idx) => (
                                <div key={`${check.type}-${check.id}-${idx}`} className={`p-3 rounded-lg border ${check.type === 'receipt' ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${check.type === 'receipt' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {check.type === 'receipt' ? 'قبض' : 'دفع'}
                                        </span>
                                        <span className={`font-bold ${check.type === 'receipt' ? 'text-green-700' : 'text-red-700'}`}>
                                            <FormattedNumber value={check.amount} />
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">الطرف:</span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{check.partyName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">رقم الشيك:</span>
                                            <span className="font-mono text-gray-800 dark:text-gray-200">{check.checkNumber || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">البنك:</span>
                                            <span className="text-gray-800 dark:text-gray-200">{check.bankName || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">الحالة:</span>
                                            <span className="text-gray-800 dark:text-gray-200">
                                                {check.status === 'pending' ? 'تحت التحصيل' : 
                                                 check.status === 'collected' ? 'تم التحصيل' : 
                                                 check.status === 'paid' ? 'تم الصرف' : 
                                                 check.status === 'rejected' ? 'مرفوض' : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                {selectedDate ? 'لا توجد شيكات مستحقة في هذا اليوم' : 'اضغط على يوم في التقويم لعرض الشيكات'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChequeCalendar;
