
import React, { useState, useMemo } from 'react';
import type { Expense, ExpenseCategory, Treasury, CompanyData, DefaultValues } from '../types';
import { PrintIcon, FormattedNumber } from './Shared';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';
import { formatDateForDisplay } from '../utils';

interface ExpenseReportProps {
    expenses: Expense[];
    expenseCategories: ExpenseCategory[];
    treasuries: Treasury[];
    companyData: CompanyData;
    defaultValues: DefaultValues;
}

const ExpenseReport: React.FC<ExpenseReportProps> = ({
    expenses,
    expenseCategories,
    treasuries,
    companyData,
    defaultValues,
}) => {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
    const [endDate, setEndDate] = useState<string>(today);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('all');
    
    const [reportData, setReportData] = useState<Expense[] | null>(null);

    const startDateInputProps = useDateInput(startDate, setStartDate);
    const endDateInputProps = useDateInput(endDate, setEndDate);

    const handleSearch = () => {
        const filtered = expenses.filter(exp => {
            const expDate = exp.date.split('T')[0];
            const dateMatch = expDate >= startDate && expDate <= endDate;
            const categoryMatch = selectedCategoryId === 'all' || exp.categoryId === parseInt(selectedCategoryId);
            const treasuryMatch = selectedTreasuryId === 'all' || exp.treasuryId === parseInt(selectedTreasuryId);
            return dateMatch && categoryMatch && treasuryMatch;
        });

        // Sort by date descending
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setReportData(filtered);
    };

    const totalAmount = useMemo(() => {
        return reportData ? reportData.reduce((sum, exp) => sum + exp.amount, 0) : 0;
    }, [reportData]);

    const handlePrint = () => {
        if (!reportData) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the report.');
            return;
        }

        const headers = ['م', 'التاريخ', 'بند المصروف', 'الخزينة', 'ملاحظات', 'المبلغ', 'بواسطة'];

        const rowsHtml = reportData.map((exp, index) => {
            const category = expenseCategories.find(c => c.id === exp.categoryId)?.name || 'غير معروف';
            const treasury = treasuries.find(t => t.id === exp.treasuryId)?.name || 'غير معروف';
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${formatDateForDisplay(exp.date)}</td>
                    <td class="text-right">${category}</td>
                    <td class="text-right">${treasury}</td>
                    <td class="text-right text-sm">${exp.notes || '-'}</td>
                    <td class="font-black text-red">${exp.amount.toFixed(2)}</td>
                    <td class="text-sm">${exp.createdBy || ''}</td>
                </tr>
            `;
        }).join('');

        const summaryHtml = `
            <div class="summary-item"><span>عدد الحركات:</span><span>${reportData.length}</span></div>
            <div class="summary-item"><span>إجمالي المصروفات:</span><span class="text-red">${totalAmount.toFixed(2)}</span></div>
        `;

        const subtitle = `الفترة من ${formatDateForDisplay(startDate)} إلى ${formatDateForDisplay(endDate)}`;
        const title = `تقرير المصروفات التفصيلي`;

        printWindow.document.write(getReportPrintTemplate(title, subtitle, companyData, headers, rowsHtml, summaryHtml));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">تقرير المصروفات التفصيلي</h1>
            
            <div className={`${cardClass} relative z-10`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className={labelClass}>من تاريخ</label>
                        <input type="text" {...startDateInputProps} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>إلى تاريخ</label>
                        <input type="text" {...endDateInputProps} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>بند المصروف</label>
                        <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)} className={inputClass}>
                            <option value="all">الكل</option>
                            {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>الخزينة</label>
                        <select value={selectedTreasuryId} onChange={e => setSelectedTreasuryId(e.target.value)} className={inputClass}>
                            <option value="all">الكل</option>
                            {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <button onClick={handleSearch} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300">
                            بحث
                        </button>
                    </div>
                </div>
            </div>

            {reportData && (
                <div className={cardClass}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-300 dark:border-gray-600">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                           نتائج البحث
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                الإجمالي: <span className="text-red-600 dark:text-red-400"><FormattedNumber value={totalAmount} /></span>
                            </div>
                            <button onClick={handlePrint} className="flex items-center justify-center bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700">
                                <PrintIcon /> <span className="mr-2">طباعة</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[60vh]">
                        <table className="w-full text-right">
                            <thead className="sticky top-0 bg-gray-200 dark:bg-gray-800 z-10">
                                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                                    {['التاريخ', 'بند المصروف', 'الخزينة', 'ملاحظات', 'المبلغ', 'بواسطة'].map(h => <th key={h} className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((exp) => {
                                    const category = expenseCategories.find(c => c.id === exp.categoryId);
                                    const treasury = treasuries.find(t => t.id === exp.treasuryId);
                                    return (
                                        <tr key={exp.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{new Date(exp.date).toLocaleDateString('ar-EG')}</td>
                                            <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{category?.name}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{treasury?.name}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{exp.notes}</td>
                                            <td className="p-3 font-bold text-red-600 dark:text-red-400"><FormattedNumber value={exp.amount} /></td>
                                            <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{exp.createdBy}</td>
                                        </tr>
                                    );
                                })}
                                {reportData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-gray-500">لا توجد مصروفات في هذه الفترة.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseReport;
