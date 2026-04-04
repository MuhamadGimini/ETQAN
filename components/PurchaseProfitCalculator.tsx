
import React, { useState, useMemo } from 'react';
import type { PurchaseInvoice, Item, Supplier, CompanyData } from '../types';
import { PrintIcon, FormattedNumber } from './Shared';
import { formatDateForDisplay, formatNumber } from '../utils';
import { getReportPrintTemplate } from '../utils/printing';

interface PurchaseProfitCalculatorProps {
    purchaseInvoices: PurchaseInvoice[];
    items: Item[];
    suppliers: Supplier[];
    companyData: CompanyData;
}

const PurchaseProfitCalculator: React.FC<PurchaseProfitCalculatorProps> = ({
    purchaseInvoices, items, suppliers, companyData
}) => {
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

    const profitDetails = useMemo(() => {
        if (!selectedInvoiceId) return null;
        const invoice = purchaseInvoices.find(inv => inv.id === selectedInvoiceId);
        if (!invoice) return null;

        const subtotal = invoice.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const totalCost = (subtotal - invoice.discount) * (1 + invoice.tax / 100);
        
        const potentialSellingValue = invoice.items.reduce((sum, item) => {
            const currentItem = items.find(i => i.id === item.itemId);
            return sum + (currentItem ? currentItem.sellPrice * item.quantity : 0);
        }, 0);

        const potentialProfit = potentialSellingValue - totalCost;
        const profitMargin = potentialSellingValue > 0 ? (potentialProfit / potentialSellingValue) * 100 : 0;

        return {
            totalCost,
            potentialSellingValue,
            potentialProfit,
            profitMargin,
            invoice
        };
    }, [selectedInvoiceId, purchaseInvoices, items]);

    const handlePrint = () => {
        if (!profitDetails) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const title = `تحليل أرباح فاتورة مشتريات`;
        const subtitle = `فاتورة رقم ${profitDetails.invoice.id} - بتاريخ ${formatDateForDisplay(profitDetails.invoice.date)}`;
        
        const html = `
            <style>
                .report-card {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .report-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                .report-row:last-child { border-bottom: none; }
                .bold { font-weight: bold; }
                .text-blue { color: #2563eb; }
                .text-green { color: #16a34a; }
                .text-red { color: #dc2626; }
                .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .items-table th, .items-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: right; }
                .items-table th { background-color: #f8fafc; }
            </style>

            <div class="report-card">
                <div class="report-row"><span>المورد:</span><span>${suppliers.find(s => s.id === profitDetails.invoice.supplierId)?.name || 'غير معروف'}</span></div>
                <div class="report-row bold"><span>إجمالي تكلفة الفاتورة:</span><span>${formatNumber(profitDetails.totalCost)}</span></div>
                <div class="report-row text-blue"><span>القيمة البيعية المتوقعة:</span><span>${formatNumber(profitDetails.potentialSellingValue)}</span></div>
                <div class="report-row bold text-green" style="font-size: 1.2rem; margin-top: 10px; border-top: 2px solid #eee; padding-top: 10px;">
                    <span>الربح المتوقع:</span>
                    <span>${formatNumber(profitDetails.potentialProfit)}</span>
                </div>
                <div class="report-row italic" style="color: #64748b;">
                    <span>هامش الربح:</span>
                    <span>${profitDetails.profitMargin.toFixed(2)}%</span>
                </div>
            </div>

            <h3 style="margin-top: 30px;">تفاصيل الأصناف بالفاتورة:</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>الصنف</th>
                        <th>الكمية</th>
                        <th>سعر الشراء</th>
                        <th>سعر البيع الحالي</th>
                        <th>إجمالي التكلفة</th>
                        <th>إجمالي البيع المتوقع</th>
                    </tr>
                </thead>
                <tbody>
                    ${profitDetails.invoice.items.map(item => {
                        const itemDetails = items.find(i => i.id === item.itemId);
                        const cost = item.price * item.quantity;
                        const sell = (itemDetails?.sellPrice || 0) * item.quantity;
                        return `
                            <tr>
                                <td>${itemDetails?.name || 'صنف غير معروف'}</td>
                                <td>${item.quantity}</td>
                                <td>${formatNumber(item.price)}</td>
                                <td>${formatNumber(itemDetails?.sellPrice || 0)}</td>
                                <td>${formatNumber(cost)}</td>
                                <td>${formatNumber(sell)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        printWindow.document.write(getReportPrintTemplate(title, subtitle, companyData, [], html, undefined, undefined, undefined, 'A4', '#7c3aed'));
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">حاسبة أرباح فواتير المشتريات</h1>
            
            <div className={cardClass}>
                <div className="max-w-xl">
                    <label className={labelClass}>اختر فاتورة المشتريات للتحليل</label>
                    <select 
                        className={inputClass}
                        value={selectedInvoiceId || ''}
                        onChange={(e) => setSelectedInvoiceId(Number(e.target.value) || null)}
                    >
                        <option value="">-- اختر فاتورة --</option>
                        {[...purchaseInvoices].sort((a,b) => Number(b.id) - Number(a.id)).map(p => (
                            <option key={p.id} value={p.id}>
                                فاتورة رقم {p.id} - {suppliers.find(s => s.id === p.supplierId)?.name} ({formatDateForDisplay(p.date)})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {profitDetails && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-end">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 shadow-md">
                            <PrintIcon /> طباعة التحليل
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className={`${cardClass} text-center`}>
                            <p className="text-gray-500 dark:text-gray-400">إجمالي تكلفة الفاتورة</p>
                            <p className="text-3xl font-bold text-gray-800 dark:text-gray-200"><FormattedNumber value={profitDetails.totalCost} /></p>
                        </div>
                        <div className={`${cardClass} text-center`}>
                            <p className="text-gray-500 dark:text-gray-400">القيمة البيعية المتوقعة</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400"><FormattedNumber value={profitDetails.potentialSellingValue} /></p>
                        </div>
                        <div className={`${cardClass} text-center`}>
                            <p className="text-gray-500 dark:text-gray-400">الربح المتوقع</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400"><FormattedNumber value={profitDetails.potentialProfit} /></p>
                            <p className="text-sm text-gray-500 italic mt-1">هامش الربح: {profitDetails.profitMargin.toFixed(2)}%</p>
                        </div>
                    </div>

                    <div className={cardClass}>
                        <h3 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800 dark:text-gray-200">تفاصيل الأصناف</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-800">
                                        <th className="p-3">الصنف</th>
                                        <th className="p-3">الكمية</th>
                                        <th className="p-3">سعر الشراء</th>
                                        <th className="p-3">سعر البيع الحالي</th>
                                        <th className="p-3">إجمالي التكلفة</th>
                                        <th className="p-3">إجمالي البيع المتوقع</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profitDetails.invoice.items.map((item, idx) => {
                                        const itemDetails = items.find(i => i.id === item.itemId);
                                        const cost = item.price * item.quantity;
                                        const sell = (itemDetails?.sellPrice || 0) * item.quantity;
                                        return (
                                            <tr key={idx} className="border-b dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5">
                                                <td className="p-3">{itemDetails?.name || 'صنف غير معروف'}</td>
                                                <td className="p-3">{item.quantity}</td>
                                                <td className="p-3"><FormattedNumber value={item.price} /></td>
                                                <td className="p-3"><FormattedNumber value={itemDetails?.sellPrice || 0} /></td>
                                                <td className="p-3 font-bold"><FormattedNumber value={cost} /></td>
                                                <td className="p-3 font-bold text-blue-600 dark:text-blue-400"><FormattedNumber value={sell} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 border-r-4 border-yellow-400 rounded-l-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                <strong>تنبيه:</strong> يتم حساب القيمة البيعية المتوقعة بناءً على أسعار البيع الحالية المسجلة للأصناف. قد تختلف الأرباح الفعلية في حال تم البيع بأسعار ترويجية أو خصومات خاصة.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseProfitCalculator;
