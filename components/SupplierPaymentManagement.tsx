import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ConfirmationModal, EditIcon, DeleteIcon, ViewIcon, FormattedNumber, ChevronDownIcon, WhatsAppIcon, PrintIcon } from './Shared';
// consolidated import of DocToView from types
import type { SupplierPayment, Supplier, Treasury, NotificationType, MgmtUser, PurchaseInvoice, PurchaseReturn, DefaultValues, CompanyData, CustomerReceipt, Expense, TreasuryTransfer, SalesInvoice, SalesReturn, DocToView } from '../types';
import { searchMatch, formatPhoneNumberForWhatsApp, formatDateForDisplay, formatNumber } from '../utils';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate } from '../utils/printing';

import { calculateTreasuryBalance } from '../utils/calculations';

interface SupplierPaymentManagementProps {
    supplierPayments: SupplierPayment[];
    setSupplierPayments: React.Dispatch<React.SetStateAction<SupplierPayment[]>>;
    suppliers: Supplier[];
    treasuries: Treasury[];
    showNotification: (type: NotificationType) => void;
    docToView: DocToView;
    onClearDocToView: () => void;
    currentUser: MgmtUser;
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    defaultValues: DefaultValues;
    companyData: CompanyData;
    customerReceipts: CustomerReceipt[];
    expenses: Expense[];
    treasuryTransfers: TreasuryTransfer[];
    draft: any;
    setDraft: React.Dispatch<React.SetStateAction<any>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

const SupplierPaymentManagement: React.FC<SupplierPaymentManagementProps> = ({
    supplierPayments, setSupplierPayments, suppliers, treasuries, showNotification,
    docToView, onClearDocToView, currentUser, purchaseInvoices, purchaseReturns,
    salesInvoices, salesReturns,
    defaultValues, companyData,
    customerReceipts, expenses, treasuryTransfers,
    draft, setDraft, isEditing, setIsEditing
}) => {
    const getNextId = () => {
        if (supplierPayments.length === 0) return 1;
        return Math.max(...supplierPayments.map(p => p.id)) + 1;
    };

    const initialFormState: Omit<SupplierPayment, 'id' | 'createdAt' | 'createdBy'> = {
        date: new Date().toISOString().split('T')[0],
        supplierId: 0,
        treasuryId: defaultValues.defaultTreasuryId,
        amount: NaN,
        notes: '',
        paymentMethod: defaultValues.defaultPaymentMethodReceipts 
    };

    const formData = draft || { ...initialFormState, id: getNextId() };
    const setFormData = (action: any) => {
        if (typeof action === 'function') {
            setDraft(prev => action(prev || { ...initialFormState, id: getNextId() }));
        } else {
            setDraft(action);
        }
    };

    const [isViewing, setIsViewing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<SupplierPayment | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;
    const [supplierBalance, setSupplierBalance] = useState<number | null>(null);
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [isSupplierSuggestionsOpen, setIsSupplierSuggestionsOpen] = useState(false);
    const supplierDropdownRef = useRef<HTMLDivElement>(null);
    
    const [searchFilters, setSearchFilters] = useState({
        id: '',
        date: '',
        name: '',
        method: '',
        amount: '',
        treasury: '',
        notes: ''
    });

    const canEdit = currentUser.permissions.includes('supplierPayment_edit');
    const canDelete = currentUser.permissions.includes('supplierPayment_delete');
    const canEditDate = currentUser.permissions.includes('supplierPayment_editDate');
    
    const dateInputProps = useDateInput(formData.date, (d) => setFormData((prev: any) => ({ ...prev, date: d })));
    const checkDateInputProps = useDateInput(formData.checkDueDate || '', (d) => setFormData((prev: any) => ({ ...prev, checkDueDate: d })));

    useEffect(() => {
        if (docToView && docToView.view === 'supplierPayment') {
            const payment = supplierPayments.find(p => p.id === docToView.docId);
            if (payment) handleEdit(payment, true);
            onClearDocToView();
        }
    }, [docToView, supplierPayments, onClearDocToView]);
    
    useEffect(() => {
        if (formData.supplierId) {
            const supplier = suppliers.find(s => s.id === formData.supplierId);
            if (supplier) setSupplierSearchQuery(supplier.name);
        } else if (!isSupplierSuggestionsOpen) {
             setSupplierSearchQuery('');
        }
    }, [formData.id, formData.supplierId, suppliers]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
                setIsSupplierSuggestionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (formData.supplierId) {
            const supplier = suppliers.find(s => s.id === formData.supplierId);
            if (supplier) {
                let balance = supplier.openingBalance;
                purchaseInvoices.forEach(inv => {
                    if (inv.supplierId === supplier.id) {
                        const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                        balance += (total - (inv.paidAmount || 0));
                    }
                });
                purchaseReturns.forEach(ret => {
                    if (ret.supplierId === supplier.id) {
                        const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                        balance -= (total - (ret.paidAmount || 0));
                    }
                });
                supplierPayments.forEach(p => {
                    if (p.supplierId === supplier.id && p.id !== formData.id) balance -= p.amount;
                });
                setSupplierBalance(balance);
            }
        } else setSupplierBalance(null);
    }, [formData.supplierId, formData.id, suppliers, purchaseInvoices, purchaseReturns, supplierPayments]);

    const currentTreasuryBalance = useMemo(() => {
        if (!formData.treasuryId) return 0;
        return calculateTreasuryBalance(formData.treasuryId, treasuries, customerReceipts, supplierPayments, expenses, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues, formData.id, 'supplierPayment');
    }, [formData.treasuryId, formData.id, treasuries, customerReceipts, supplierPayments, expenses, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['supplierId', 'treasuryId', 'amount'].includes(name);
        setFormData((prev: any) => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
    };
    
    const suggestedSuppliers = useMemo(() => {
        if (!supplierSearchQuery) return suppliers;
        return suppliers.filter(supplier => searchMatch(`${supplier.name} ${supplier.phone || ''}`, supplierSearchQuery));
    }, [supplierSearchQuery, suppliers]);

    const handleSupplierSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSupplierSearchQuery(e.target.value);
        setIsSupplierSuggestionsOpen(true);
        if (e.target.value === '') setFormData((p: any) => ({ ...p, supplierId: 0 }));
    };

    const handleSupplierSelect = (supplier: Supplier) => {
        setFormData((p: any) => ({ ...p, supplierId: supplier.id }));
        setSupplierSearchQuery(supplier.name);
        setIsSupplierSuggestionsOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(isViewing) return;
        if (!formData.supplierId || isNaN(formData.amount) || formData.amount <= 0) {
            alert("يرجى اختيار المورد وإدخال مبلغ صحيح.");
            return;
        }

        if (formData.paymentMethod !== 'discount' && formData.amount > currentTreasuryBalance) {
            alert(`خطأ: رصيد الخزينة غير كافٍ.\nالرصيد الحالي: ${currentTreasuryBalance.toFixed(2)}`);
            return;
        }

        if (isEditing && formData.id) {
            if (!canEdit) { alert("ليس لديك صلاحية التعديل."); return; }
            setSupplierPayments(prev => prev.map(p => p.id === formData.id ? { ...p, ...formData, id: formData.id!, lastModifiedBy: currentUser.username, lastModifiedAt: new Date().toISOString() } : p));
            showNotification('edit');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل سند دفع رقم ${formData.id} للمورد ${suppliers.find(s => s.id === formData.supplierId)?.name || ''} بمبلغ ${formData.amount}` }));
        } else {
            const newPayment: SupplierPayment = { ...formData, id: getNextId(), createdAt: new Date().toISOString(), createdBy: currentUser.username };
            setSupplierPayments(prev => [...prev, newPayment]);
            showNotification('add');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإنشاء سند دفع رقم ${newPayment.id} للمورد ${suppliers.find(s => s.id === formData.supplierId)?.name || ''} بمبلغ ${formData.amount}` }));
        }
        resetForm();
    };

    const handleEdit = (p: SupplierPayment, viewOnly: boolean) => {
        setIsEditing(true); setIsViewing(viewOnly); setDraft(p); window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (p: SupplierPayment) => { setPaymentToDelete(p); setIsDeleteModalOpen(true); };

    const performDelete = () => {
        if (paymentToDelete) { setSupplierPayments(prev => prev.filter(p => p.id !== paymentToDelete.id)); showNotification('delete'); }
        setIsDeleteModalOpen(false); setPaymentToDelete(null);
    };

    const resetForm = () => { setIsEditing(false); setIsViewing(false); setDraft(null); setSupplierBalance(null); setSupplierSearchQuery(''); };

    const handlePrint = (payment: SupplierPayment) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const supplier = suppliers.find(s => s.id === payment.supplierId)?.name || '';
        const treasury = treasuries.find(t => t.id === payment.treasuryId)?.name || '';
        const methodLabel = payment.paymentMethod === 'cash' ? 'نقدي' : payment.paymentMethod === 'check' ? 'شيك' : 'خصم مكتسب';

        const headers = ['رقم السند', 'التاريخ', 'المورد', 'طريقة الدفع', 'المبلغ', 'الخزينة'];
        const rowsHtml = `
            <tr>
                <td>${payment.id}</td>
                <td>${formatDateForDisplay(payment.date)}</td>
                <td>${supplier}</td>
                <td>${methodLabel}</td>
                <td class="font-black text-red">${payment.amount.toFixed(2)}</td>
                <td>${treasury}</td>
            </tr>
        `;

        const summaryHtml = `
            <div class="summary-item"><span>المبلغ:</span><span class="text-red">${payment.amount.toFixed(2)}</span></div>
            <div class="summary-item"><span>ملاحظات:</span><span>${payment.notes || '-'}</span></div>
        `;

        const signaturesHtml = `
            <div class="signature-box">
                <div class="signature-title">المورد</div>
                <div class="signature-line"></div>
            </div>
            <div class="signature-box">
                <div class="signature-title">أمين الخزينة</div>
                <div class="signature-line"></div>
            </div>
            <div class="signature-box">
                <div class="signature-title">مدير الحسابات</div>
                <div class="signature-line"></div>
            </div>
        `;

        printWindow.document.write(getReportPrintTemplate('سند دفع مورد', `مستند رقم ${payment.id}`, companyData, headers, rowsHtml, summaryHtml, undefined, signaturesHtml));
        printWindow.document.close();
    };

    const filteredPayments = useMemo(() => {
        return supplierPayments.filter(p => {
            const supplierName = suppliers.find(s => s.id === p.supplierId)?.name || '';
            const treasuryName = treasuries.find(t => t.id === p.treasuryId)?.name || '';
            const methodLabel = p.paymentMethod === 'cash' ? 'نقدي' : p.paymentMethod === 'check' ? 'شيك' : 'خصم مكتسب';
            
            return (
                (!searchFilters.id || p.id.toString().includes(searchFilters.id)) &&
                (!searchFilters.date || p.date.includes(searchFilters.date)) &&
                (!searchFilters.name || searchMatch(supplierName, searchFilters.name)) &&
                (!searchFilters.method || searchMatch(methodLabel, searchFilters.method)) &&
                (!searchFilters.amount || p.amount.toString().includes(searchFilters.amount)) &&
                (!searchFilters.treasury || searchMatch(treasuryName, searchFilters.treasury)) &&
                (!searchFilters.notes || searchMatch(p.notes, searchFilters.notes))
            );
        }).sort((a, b) => b.id - a.id);
    }, [supplierPayments, searchFilters, suppliers, treasuries]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchFilters]);

    const paginatedPayments = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPayments, currentPage]);

    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

    const filteredTotal = useMemo(() => paginatedPayments.reduce((sum, p) => sum + p.amount, 0), [paginatedPayments]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-teal-300 dark:border-teal-700 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-black dark:text-white font-bold placeholder-gray-500 transition duration-300 disabled:opacity-70 text-base font-bold";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none dark:text-white";

    return (
        <div className="space-y-6">
            {isDeleteModalOpen && paymentToDelete && (
                <ConfirmationModal title="تأكيد الحذف" message={`هل أنت متأكد من حذف سند الدفع رقم ${paymentToDelete.id}؟`} onConfirm={performDelete} onCancel={() => setIsDeleteModalOpen(false)} confirmText="حذف" confirmColor="bg-red-600" />
            )}

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300">سندات الدفع (الموردين)</h1>
                <div className="bg-teal-100 dark:bg-teal-900/40 px-4 py-2 rounded-lg border border-teal-200 dark:border-teal-800">
                    <span className="text-teal-800 dark:text-teal-200 font-bold text-xl">رقم السند: {formData.id}</span>
                </div>
            </div>

             <div className={`${cardClass} relative z-20`}>
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">{isViewing ? 'عرض سند دفع' : isEditing ? 'تعديل سند دفع' : 'إضافة سند دفع جديد'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-row flex-wrap md:flex-nowrap gap-3 items-end">
                         <div className="flex-[14%] min-w-[120px]">
                            <label className={labelClass}>التاريخ</label>
                            <input type="text" {...dateInputProps} className={inputClass} disabled={isViewing || (isEditing && !canEditDate)} />
                        </div>
                        <div className="flex-[30%] min-w-[200px] relative z-[40]" ref={supplierDropdownRef}>
                            <label className={labelClass}>المورد</label>
                            <div className="relative">
                                <input type="text" value={supplierSearchQuery} onChange={handleSupplierSearchChange} onFocus={() => setIsSupplierSuggestionsOpen(true)} onBlur={() => {
                                    setTimeout(() => {
                                        if (isSupplierSuggestionsOpen && suggestedSuppliers.length > 0 && supplierSearchQuery) {
                                            handleSupplierSelect(suggestedSuppliers[0]);
                                        }
                                        setIsSupplierSuggestionsOpen(false);
                                    }, 250);
                                }} placeholder="ابحث بالاسم..." className={inputClass} disabled={isViewing} autoComplete="off" />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                            </div>
                            {isSupplierSuggestionsOpen && suggestedSuppliers.length > 0 && (
                                <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg top-full">
                                    {suggestedSuppliers.slice(0, 50).map(s => <li key={s.id} onMouseDown={() => handleSupplierSelect(s)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold text-gray-800 dark:text-gray-200 border-b last:border-0">{s.name}</li>)}
                                </ul>
                            )}
                            {supplierBalance !== null && (
                                <div className="absolute top-full right-0 text-xl font-black mt-1 whitespace-nowrap z-[60]">
                                    <span className="text-gray-700 dark:text-gray-400">الرصيد: </span>
                                    <span className={supplierBalance >= 0 ? 'text-green-600' : 'text-red-600'}><FormattedNumber value={Math.abs(supplierBalance)} /></span>
                                    <span className="text-xs text-gray-500 mr-1">({supplierBalance >= 0 ? 'له' : 'عليه'})</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-[14%] min-w-[140px]">
                            <label className={labelClass}>طريقة الدفع</label>
                            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} className={inputClass} disabled={isViewing}>
                                <option value="cash">نقدي</option>
                                <option value="check">شيك</option>
                                <option value="discount">خصم مكتسب</option>
                            </select>
                        </div>
                        {formData.paymentMethod === 'check' && (
                            <>
                                <div className="flex-[14%] min-w-[140px]">
                                    <label className={labelClass}>رقم الشيك</label>
                                    <input type="text" name="checkNumber" value={formData.checkNumber || ''} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="رقم الشيك" />
                                </div>
                                <div className="flex-[14%] min-w-[140px]">
                                    <label className={labelClass}>تاريخ الاستحقاق</label>
                                    <input type="text" {...checkDateInputProps} className={inputClass} disabled={isViewing} placeholder="YYYY-MM-DD" />
                                </div>
                                <div className="flex-[14%] min-w-[140px]">
                                    <label className={labelClass}>اسم البنك</label>
                                    <input type="text" name="bankName" value={formData.bankName || ''} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="اسم البنك" />
                                </div>
                                <div className="flex-[14%] min-w-[140px]">
                                    <label className={labelClass}>حالة الشيك</label>
                                    <select name="checkStatus" value={formData.checkStatus || 'pending'} onChange={handleInputChange} className={inputClass} disabled={isViewing}>
                                        <option value="pending">تحت التحصيل</option>
                                        <option value="paid">تم الصرف</option>
                                        <option value="rejected">مرفوض</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div className="flex-[14%] min-w-[100px]">
                             <label className={labelClass}>المبلغ</label>
                             <input type="number" name="amount" min="0" step="0.01" value={isNaN(formData.amount) ? '' : formData.amount} onChange={handleInputChange} className={inputClass} required disabled={isViewing} />
                        </div>
                        <div className="flex-[14%] min-w-[140px] relative z-[35]">
                            <label className={labelClass}>الخزينة</label>
                            <select name="treasuryId" value={formData.treasuryId} onChange={handleInputChange} className={inputClass} disabled={isViewing || formData.paymentMethod === 'discount'}>
                                <option value={0} disabled>اختر...</option>
                                {treasuries.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                             {formData.treasuryId > 0 && formData.paymentMethod !== 'discount' && (
                                <div className="absolute top-full right-0 text-xl font-black mt-1 whitespace-nowrap text-teal-800 dark:text-teal-300">
                                    المتاح: <FormattedNumber value={currentTreasuryBalance} />
                                </div>
                            )}
                        </div>
                        <div className="flex-[14%] min-w-[120px]">
                            <button type="submit" className="w-full bg-teal-600 text-white font-bold rounded-lg shadow-lg hover:bg-teal-700 transition-all h-11">
                                {isEditing ? 'تحديث' : 'حفظ السند'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>ملاحظات</label>
                        <input type="text" name="notes" value={formData.notes || ''} onChange={handleInputChange} className={inputClass} placeholder="أدخل أي ملاحظات إضافية هنا..." disabled={isViewing} />
                    </div>
                    {(isEditing || isViewing) && (
                        <div className="flex justify-end">
                            <button type="button" onClick={resetForm} className="bg-gray-500 text-white font-bold py-2 px-8 rounded-lg hover:bg-gray-600 transition-all h-11">إلغاء</button>
                        </div>
                    )}
                </form>
            </div>

            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">سجل السندات</h2>
                    <div className="flex gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي السندات</p>
                            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{filteredPayments.length}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي المبالغ</p>
                            <p className="text-xl font-black text-red-700 dark:text-red-300"><FormattedNumber value={filteredTotal} /></p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-2 mb-6 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">رقم السند</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.id} onChange={e => setSearchFilters({...searchFilters, id: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">التاريخ</label><input type="text" placeholder="يوم-شهر-سنة" className={filterInputClass} value={searchFilters.date} onChange={e => setSearchFilters({...searchFilters, date: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المورد</label><input type="text" placeholder="اسم المورد..." className={filterInputClass} value={searchFilters.name} onChange={e => setSearchFilters({...searchFilters, name: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الطريقة</label><input type="text" placeholder="نقدي/شيك..." className={filterInputClass} value={searchFilters.method} onChange={e => setSearchFilters({...searchFilters, method: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المبلغ</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.amount} onChange={e => setSearchFilters({...searchFilters, amount: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الخزينة</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.treasury} onChange={e => setSearchFilters({...searchFilters, treasury: e.target.value})} /></div>
                    <div className="flex items-end gap-1">
                        <div className="flex-1"><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الملاحظات</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.notes} onChange={e => setSearchFilters({...searchFilters, notes: e.target.value})} /></div>
                        <button onClick={() => setSearchFilters({id:'', date:'', name:'', method:'', amount:'', treasury:'', notes:''})} className="bg-gray-200 dark:bg-gray-600 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white" title="تفريغ"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col">
                    <div className="overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">رقم السند</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">التاريخ</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">اسم المورد</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">طريقة الدفع</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">المبلغ</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">الخزينة</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">المستخدم</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPayments.map((p) => {
                                    const supplier = suppliers.find(s => s.id === p.supplierId);
                                    const treasury = treasuries.find(t => t.id === p.treasuryId);
                                    const methodLabel = p.paymentMethod === 'cash' ? 'نقدي' : p.paymentMethod === 'check' ? 'شيك' : 'خصم مكتسب';
                                    return (
                                        <tr key={p.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors">
                                            <td className="p-3 font-bold text-teal-600">{p.id}</td>
                                            <td className="p-3 text-gray-600 dark:text-gray-400">{new Date(p.date).toLocaleDateString('ar-EG')}</td>
                                            <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{supplier?.name}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300 text-sm">{methodLabel}</td>
                                            <td className="p-3 font-bold text-red-600"><FormattedNumber value={p.amount} /></td>
                                            <td className="p-3 text-gray-600 dark:text-gray-400">{treasury?.name || '-'}</td>
                                            <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{p.createdBy || '-'}</td>
                                            <td className="p-3">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handlePrint(p)} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="طباعة"><PrintIcon /></button>
                                                    <button onClick={() => handleEdit(p, false)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="تعديل"><EditIcon /></button>
                                                    <button onClick={() => handleEdit(p, true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="عرض"><ViewIcon /></button>
                                                    <button onClick={() => {
                                                        const supplier = suppliers.find(s => s.id === p.supplierId);
                                                        const phoneNumber = formatPhoneNumberForWhatsApp(supplier?.phone || '');
                                                        const text = `سند دفع رقم: ${p.id}%0Aالتاريخ: ${formatDateForDisplay(p.date)}%0Aالمورد: ${supplier?.name || ''}%0Aالمبلغ: ${formatNumber(p.amount)}${defaultValues.whatsappFooter ? '%0A' + encodeURIComponent(defaultValues.whatsappFooter) : ''}`;
                                                        window.open(phoneNumber ? `https://wa.me/${phoneNumber}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
                                                    }} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="واتساب"><WhatsAppIcon /></button>
                                                    {canDelete && <button onClick={() => handleDelete(p)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف"><DeleteIcon /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredPayments.length === 0 && (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">لا توجد سندات تطابق معايير البحث.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredPayments.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 font-bold p-3 border-t border-gray-300 dark:border-gray-600 flex justify-between items-center">
                            <span className="text-gray-700 dark:text-gray-300">إجمالي الصفحة:</span>
                            <span className="text-red-600 text-lg"><FormattedNumber value={filteredTotal} /></span>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1} 
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg disabled:opacity-50 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                السابق
                            </button>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                صفحة {currentPage} من {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages} 
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg disabled:opacity-50 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                التالي
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupplierPaymentManagement;