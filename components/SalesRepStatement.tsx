
import React, { useState, useMemo, useEffect, useRef } from 'react';
// consolidated import of PreselectedSalesRep from types
import type { SalesRepresentative, SalesInvoice, SalesReturn, Customer, CompanyData, DefaultValues, PreselectedSalesRep } from '../types';
import { ViewIcon, PrintIcon, PdfIcon, ChevronDownIcon } from './Shared';
import { useDateInput } from '../hooks/useDateInput';
import { formatDateForDisplay } from '../utils';
import { getReportPrintTemplate } from '../utils/printing';

interface SalesRepStatementProps {
    salesRepresentatives: SalesRepresentative[];
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    customers: Customer[];
    companyData: CompanyData;
    // FIX: Updated docId type to number | string
    onViewDoc: (view: string, docId: number | string) => void;
    preselectedSalesRep: PreselectedSalesRep;
    onClearPreselectedSalesRep: () => void;
    defaultValues: DefaultValues;
}

// FIX: Updated docId to number | string
interface Transaction {
    date: string;
    type: string;
    docId: number | string;
    customerName: string;
    salesValue: number;
    returnsValue: number;
    salesQty: number;
    returnsQty: number;
    view: string;
}

interface ReportData {
    transactions: Transaction[];
    netSalesValue: number;
    netSalesQty: number;
}

const SalesRepStatement: React.FC<SalesRepStatementProps> = ({
    salesRepresentatives,
    salesInvoices,
    salesReturns,
    customers,
    companyData,
    onViewDoc,
    preselectedSalesRep,
    onClearPreselectedSalesRep,
    defaultValues,
}) => {
    const [selectedRepId, setSelectedRepId] = useState<number | null>(preselectedSalesRep?.repId || null);
    const [startDate, setStartDate] = useState<string>(preselectedSalesRep?.startDate || '');
    const [endDate, setEndDate] = useState<string>(preselectedSalesRep?.endDate || '');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [commissionPerPieceRate, setCommissionPerPieceRate] = useState(0);
    const [commissionPercentRate, setCommissionPercentRate] = useState(0);
    const [salesRepSearchQuery, setSalesRepSearchQuery] = useState('');
    const [isSalesRepSuggestionsOpen, setIsSalesRepSuggestionsOpen] = useState(false);

    const startDateInputProps = useDateInput(startDate, setStartDate);
    const endDateInputProps = useDateInput(endDate, setEndDate);

    const searchTrigger = useRef(!!preselectedSalesRep);

    useEffect(() => {
        if (preselectedSalesRep) {
            setSelectedRepId(preselectedSalesRep.repId);
            setStartDate(preselectedSalesRep.startDate);
            setEndDate(preselectedSalesRep.endDate);
            const rep = salesRepresentatives.find(r => r.id === preselectedSalesRep.repId);
            if(rep) setSalesRepSearchQuery(rep.name);
            searchTrigger.current = true;
            onClearPreselectedSalesRep();
        }
    }, [preselectedSalesRep, onClearPreselectedSalesRep, salesRepresentatives]);

    useEffect(() => {
        if (searchTrigger.current) {
            handleSearch();
            searchTrigger.current = false;
        }
    }, [selectedRepId, startDate, endDate]);


    const calculatedCommission = useMemo(() => {
        if (!reportData) return 0;
        const commissionFromPiece = reportData.netSalesQty * commissionPerPieceRate;
        const commissionFromPercent = reportData.netSalesValue * (commissionPercentRate / 100);
        return commissionFromPiece + commissionFromPercent;
    }, [reportData, commissionPerPieceRate, commissionPercentRate]);

    const suggestedSalesReps = useMemo(() => {
        if (!salesRepSearchQuery) return salesRepresentatives;
        return salesRepresentatives.filter(r => r.name.toLowerCase().includes(salesRepSearchQuery.toLowerCase()));
    }, [salesRepSearchQuery, salesRepresentatives]);
    
    const handleSalesRepSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSalesRepSearchQuery(e.target.value);
        setIsSalesRepSuggestionsOpen(true);
        if (e.target.value === '') setSelectedRepId(null);
    };

    const handleSalesRepSelect = (rep: SalesRepresentative) => {
        setSelectedRepId(rep.id);
        setSalesRepSearchQuery(rep.name);
        setIsSalesRepSuggestionsOpen(false);
    };
    
    const handleSearch = () => {
        if (!selectedRepId) {
            if(!searchTrigger.current) alert("يرجى اختيار بائع أولاً.");
            setReportData(null);
            return;
        }

        const repInvoices = salesInvoices.filter(inv => {
            const invDate = inv.date.split('T')[0];
            return inv.salesRepId === selectedRepId &&
                   (!startDate || invDate >= startDate) &&
                   (!endDate || invDate <= endDate);
        });
        const repReturns = salesReturns.filter(ret => {
            const retDate = ret.date.split('T')[0];
            return ret.salesRepId === selectedRepId &&
                   (!startDate || retDate >= startDate) &&
                   (!endDate || retDate <= endDate);
        });

        const transactions: Transaction[] = [];

        let totalSalesValue = 0;
        let totalSalesQty = 0;
        repInvoices.forEach(inv => {
            const customer = customers.find(c => c.id === inv.customerId);
            const value = (inv.items.reduce((sum, item) => sum + item.price * item.quantity, 0) - inv.discount);
            const qty = inv.items.reduce((sum, item) => sum + item.quantity, 0);
            totalSalesValue += value;
            totalSalesQty += qty;
            transactions.push({
                date: inv.date,
                type: 'فاتورة مبيعات',
                docId: inv.id,
                customerName: customer?.name || 'غير معروف',
                salesValue: value,
                returnsValue: 0,
                salesQty: qty,
                returnsQty: 0,
                view: 'salesInvoice',
            });
        });

        let totalReturnsValue = 0;
        let totalReturnsQty = 0;
        repReturns.forEach(ret => {
            const customer = customers.find(c => c.id === ret.customerId);
            const value = (ret.items.reduce((sum, item) => sum + item.price * item.quantity, 0) - ret.discount);
            const qty = ret.items.reduce((sum, item) => sum + item.quantity, 0);
            totalReturnsValue += value;
            totalReturnsQty += qty;
            transactions.push({
                date: ret.date,
                type: 'مرتجع مبيعات',
                docId: ret.id,
                customerName: customer?.name || 'غير معروف',
                salesValue: 0,
                returnsValue: value,
                salesQty: 0,
                returnsQty: qty,
                view: 'salesReturn',
            });
        });

        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setReportData({
            transactions,
            netSalesValue: totalSalesValue - totalReturnsValue,
            netSalesQty: totalSalesQty - totalReturnsQty,
        });
    };

    const handlePrint = () => {
        if (!reportData || !selectedRepId) return;
        const salesRep = salesRepresentatives.find(r => r.id === selectedRepId);
        if (!salesRep) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the report.');
            return;
        }

        const headers = ['التاريخ', 'البيان', 'رقم المستند', 'العميل', 'المبيعات', 'المرتجعات', 'القطع'];

        const rowsHtml = reportData.transactions.map(row => `
            <tr>
                <td class="whitespace-nowrap">${new Date(row.date).toLocaleDateString('ar-EG')}</td>
                <td class="text-right">${row.type}</td>
                <td>${row.docId}</td>
                <td class="text-right font-black">${row.customerName}</td>
                <td class="text-green">${row.salesValue > 0 ? row.salesValue.toFixed(2) : '-'}</td>
                <td class="text-red">${row.returnsValue > 0 ? row.returnsValue.toFixed(2) : '-'}</td>
                <td class="font-black">${row.salesQty > 0 ? row.salesQty : `-${row.returnsQty}`}</td>
            </tr>
        `).join('');

        const summaryHtml = `
            <div class="w-full mt-4">
                <div class="summary-item"><span>صافي المبيعات (قيمة):</span><span class="text-indigo">${reportData.netSalesValue.toFixed(2)}</span></div>
                <div class="summary-item"><span>صافي المبيعات (قطع):</span><span class="text-indigo">${reportData.netSalesQty}</span></div>
                <div class="summary-item font-black text-lg border-t-2 border-indigo mt-2 pt-2">
                    <span>العمولة المحسوبة:</span><span class="text-green">${calculatedCommission.toFixed(2)}</span>
                </div>
            </div>
        `;

        const subtitle = `كشف حساب بائع: ${salesRep.name} | الفترة: ${formatDateForDisplay(startDate) || 'البداية'} إلى ${formatDateForDisplay(endDate) || 'النهاية'}`;

        printWindow.document.write(getReportPrintTemplate('كشف حساب بائع', subtitle, companyData, headers, rowsHtml, summaryHtml));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">كشف حساب بائع</h1>
            
            <div className={`${cardClass} relative z-10`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="relative">
                        <label className={labelClass} htmlFor="rep-select">اختر البائع</label>
                        <div className="relative">
                            <input type="text" value={salesRepSearchQuery} onChange={handleSalesRepSearchChange} onFocus={() => setIsSalesRepSuggestionsOpen(true)} onBlur={() => {
                                setTimeout(() => {
                                    if (isSalesRepSuggestionsOpen && suggestedSalesReps.length > 0 && salesRepSearchQuery) {
                                        handleSalesRepSelect(suggestedSalesReps[0]);
                                    }
                                    setIsSalesRepSuggestionsOpen(false);
                                }, 200);
                            }} placeholder="-- اختر بائع --" className={inputClass} autoComplete="off" />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                        </div>
                        {isSalesRepSuggestionsOpen && (
                            <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                {suggestedSalesReps.map(r => <li key={r.id} onMouseDown={() => handleSalesRepSelect(r)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">{r.name}</li>)}
                            </ul>
                        )}
                    </div>
                     <div>
                        <label className={labelClass} htmlFor="start-date">من تاريخ</label>
                        <input id="start-date" type="text" className={inputClass} {...startDateInputProps} />
                    </div>
                     <div>
                        <label className={labelClass} htmlFor="end-date">إلى تاريخ</label>
                        <input id="end-date" type="text" className={inputClass} {...endDateInputProps} />
                    </div>
                    <div>
                        <button onClick={handleSearch} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300">
                            بحث
                        </button>
                    </div>
                </div>
                 {reportData && (
                    <div className="mt-6 flex space-x-2 space-x-reverse border-t border-gray-300 dark:border-gray-600 pt-4">
                        <button onClick={handlePrint} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
                            <PrintIcon /> <span className="mr-2">طباعة</span>
                        </button>
                        <button onClick={handlePrint} className="flex items-center justify-center bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700">
                            <PdfIcon /> <span className="mr-2">تصدير PDF</span>
                        </button>
                    </div>
                )}
            </div>

            {reportData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={cardClass}>
                             <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">ملخص الأداء</h3>
                             <div className="space-y-3">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-gray-600 dark:text-gray-400">صافي المبيعات (بالقيمة):</span>
                                    <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">{reportData.netSalesValue.toFixed(2)} ج.م</span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-gray-600 dark:text-gray-400">صافي المبيعات (بالقطعة):</span>
                                    <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">{reportData.netSalesQty}</span>
                                </div>
                             </div>
                        </div>
                        <div className={cardClass}>
                             <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">حساب العمولة</h3>
                              <div className="grid grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className={labelClass + " text-sm"}>العمولة لكل قطعة</label>
                                    <input type="number" step="0.01" placeholder="مثال: 0.50" className={inputClass} value={commissionPerPieceRate} onChange={e => setCommissionPerPieceRate(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div>
                                    <label className={labelClass + " text-sm"}>العمولة كنسبة %</label>
                                    <input type="number" step="0.1" placeholder="مثال: 2.5" className={inputClass} value={commissionPercentRate} onChange={e => setCommissionPercentRate(parseFloat(e.target.value) || 0)} />
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-300/50 dark:border-gray-600/50 flex justify-between items-center text-lg">
                                <span className="text-gray-600 dark:text-gray-400">إجمالي العمولة المستحقة:</span>
                                <span className="font-bold text-2xl text-green-600 dark:text-green-400">{calculatedCommission.toFixed(2)} ج.م</span>
                              </div>
                        </div>
                    </div>

                    <div className={cardClass}>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                            تفاصيل الحركات
                        </h2>
                        <div className="overflow-auto max-h-[60vh]">
                            <table className="w-full text-right">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gray-200 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                                        {['التاريخ', 'البيان', 'رقم المستند', 'العميل', 'قيمة المبيعات', 'قيمة المرتجعات', 'عدد القطع', 'عرض'].map(h => <th key={h} className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.transactions.map((row) => (
                                        <tr key={`${row.view}-${row.docId}`} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{formatDateForDisplay(row.date)}</td>
                                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{row.type}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{row.docId}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300">{row.customerName}</td>
                                            <td className="p-3 font-semibold text-green-600 dark:text-green-400">{row.salesValue > 0 ? row.salesValue.toFixed(2) : '-'}</td>
                                            <td className="p-3 font-semibold text-red-600 dark:text-red-400">{row.returnsValue > 0 ? row.returnsValue.toFixed(2) : '-'}</td>
                                            <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">{row.salesQty > 0 ? row.salesQty : `-${row.returnsQty}`}</td>
                                            <td className="p-3">
                                                <button onClick={() => onViewDoc(row.view, row.docId)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" title="عرض المستند الأصلي">
                                                    <ViewIcon />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesRepStatement;
