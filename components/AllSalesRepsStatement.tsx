
import React, { useState } from 'react';
import type { SalesRepresentative, SalesInvoice, SalesReturn } from '../types';
import { ViewIcon, PrintIcon } from './Shared';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';
import { formatDateForDisplay } from '../utils';

interface AllSalesRepsStatementProps {
    salesRepresentatives: SalesRepresentative[];
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    onViewSalesRepStatement: (repId: number, startDate: string, endDate: string) => void;
    companyData: any;
}

interface SalesRepSummary {
    repId: number;
    repName: string;
    netSalesValue: number;
    netSalesQty: number;
}

const AllSalesRepsStatement: React.FC<AllSalesRepsStatementProps> = ({
    salesRepresentatives,
    salesInvoices,
    salesReturns,
    onViewSalesRepStatement,
    companyData,
}) => {
    const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<SalesRepSummary[] | null>(null);

    const startDateInputProps = useDateInput(startDate, setStartDate);
    const endDateInputProps = useDateInput(endDate, setEndDate);

    const handlePrint = () => {
        if (!reportData) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const headers = ['م', 'اسم البائع', 'صافي المبيعات (قيمة)', 'صافي المبيعات (قطع)'];

        const rowsHtml = reportData.map((summary, index) => `
            <tr>
                <td>${index + 1}</td>
                <td class="text-right font-black">${summary.repName}</td>
                <td class="text-blue font-black">${summary.netSalesValue.toFixed(2)}</td>
                <td class="font-black">${summary.netSalesQty}</td>
            </tr>
        `).join('');

        const subtitle = `الفترة من ${formatDateForDisplay(startDate)} إلى ${formatDateForDisplay(endDate)}`;
        printWindow.document.write(getReportPrintTemplate('تقرير أداء البائعين', subtitle, companyData, headers, rowsHtml, '', undefined, undefined, 'A4', '#1e3a8a'));
        printWindow.document.close();
    };

    const handleSearch = () => {
        const summaries = salesRepresentatives.map(rep => {
            const repInvoices = salesInvoices.filter(inv => {
                const invDate = inv.date.split('T')[0];
                return inv.salesRepId === rep.id &&
                       invDate >= startDate &&
                       invDate <= endDate;
            });
            const repReturns = salesReturns.filter(ret => {
                const retDate = ret.date.split('T')[0];
                return ret.salesRepId === rep.id &&
                       retDate >= startDate &&
                       retDate <= endDate;
            });

            const totalSalesValue = repInvoices.reduce((sum, inv) => sum + (inv.items.reduce((s, i) => s + i.price * i.quantity, 0) - inv.discount), 0);
            const totalSalesQty = repInvoices.reduce((sum, inv) => sum + inv.items.reduce((s, i) => s + i.quantity, 0), 0);
            
            const totalReturnsValue = repReturns.reduce((sum, ret) => sum + (ret.items.reduce((s, i) => s + i.price * i.quantity, 0) - ret.discount), 0);
            const totalReturnsQty = repReturns.reduce((sum, ret) => sum + ret.items.reduce((s, i) => s + i.quantity, 0), 0);

            return {
                repId: rep.id,
                repName: rep.name,
                netSalesValue: totalSalesValue - totalReturnsValue,
                netSalesQty: totalSalesQty - totalReturnsQty,
            };
        });
        setReportData(summaries);
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">كشف حسابات البائعين</h1>

            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className={labelClass} htmlFor="start-date">من تاريخ</label>
                        <input id="start-date" type="text" className={inputClass} {...startDateInputProps} />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="end-date">إلى تاريخ</label>
                        <input id="end-date" type="text" className={inputClass} {...endDateInputProps} />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                        <button onClick={handleSearch} className="flex-1 bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300">
                            بحث
                        </button>
                        {reportData && (
                            <button onClick={handlePrint} className="flex-1 bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center justify-center">
                                <PrintIcon /> <span className="mr-2">طباعة</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {reportData && (
                <div className={cardClass}>
                    <div className="overflow-auto max-h-[60vh]">
                        <table className="w-full text-right">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-200 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                                    {['اسم البائع', 'صافي المبيعات (بالقيمة)', 'صافي المبيعات (بالقطعة)', 'إجراءات'].map(h => <th key={h} className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map(summary => (
                                    <tr key={summary.repId} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{summary.repName}</td>
                                        <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{summary.netSalesValue.toFixed(2)}</td>
                                        <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{summary.netSalesQty}</td>
                                        <td className="p-3">
                                            <button 
                                                onClick={() => onViewSalesRepStatement(summary.repId, startDate, endDate)} 
                                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" 
                                                title="عرض كشف الحساب التفصيلي"
                                            >
                                                <ViewIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllSalesRepsStatement;
