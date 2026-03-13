import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ConfirmationModal, EditIcon, DeleteIcon, ViewIcon, FormattedNumber, ChevronDownIcon, WhatsAppIcon, PrintIcon } from './Shared';
// consolidated import of DocToView from types
import type { CustomerReceipt, Customer, Treasury, NotificationType, MgmtUser, SalesInvoice, SalesReturn, DefaultValues, CompanyData, SupplierPayment, Expense, TreasuryTransfer, PurchaseInvoice, PurchaseReturn, DocToView } from '../types';
import { searchMatch, formatPhoneNumberForWhatsApp, formatDateForDisplay, formatNumber } from '../utils';
import { useDateInput } from '../hooks/useDateInput';
import { getReportPrintTemplate, getVoucherPrintTemplate } from '../utils/printing';

import { calculateTreasuryBalance } from '../utils/calculations';

interface CustomerReceiptManagementProps {
    customerReceipts: CustomerReceipt[];
    setCustomerReceipts: React.Dispatch<React.SetStateAction<CustomerReceipt[]>>;
    customers: Customer[];
    treasuries: Treasury[];
    showNotification: (type: NotificationType) => void;
    docToView: DocToView;
    onClearDocToView: () => void;
    currentUser: MgmtUser;
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    defaultValues: DefaultValues;
    companyData: CompanyData;
    supplierPayments: SupplierPayment[];
    expenses: Expense[];
    treasuryTransfers: TreasuryTransfer[];
    draft: any;
    setDraft: React.Dispatch<React.SetStateAction<any>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

const CustomerReceiptManagement: React.FC<CustomerReceiptManagementProps> = ({
    customerReceipts, setCustomerReceipts, customers, treasuries, showNotification,
    docToView, onClearDocToView, currentUser, salesInvoices, salesReturns, 
    purchaseInvoices, purchaseReturns,
    defaultValues, companyData,
    supplierPayments, expenses, treasuryTransfers,
    draft, setDraft, isEditing, setIsEditing
}) => {
    const getNextId = () => {
        if (customerReceipts.length === 0) return 1;
        return Math.max(...customerReceipts.map(r => r.id)) + 1;
    };

    const initialFormState: Omit<CustomerReceipt, 'id' | 'createdAt' | 'createdBy'> = {
        date: new Date().toISOString().split('T')[0],
        customerId: 0,
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
    const [receiptToDelete, setReceiptToDelete] = useState<CustomerReceipt | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;
    const [customerBalance, setCustomerBalance] = useState<number | null>(null);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [isCustomerSuggestionsOpen, setIsCustomerSuggestionsOpen] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);
    
    const [searchFilters, setSearchFilters] = useState({
        id: '',
        date: '',
        name: '',
        method: '',
        amount: '',
        treasury: '',
        notes: ''
    });

    const canEdit = currentUser.permissions.includes('customerReceipt_edit');
    const canDelete = currentUser.permissions.includes('customerReceipt_delete');
    const canEditDate = currentUser.permissions.includes('customerReceipt_editDate');
    
    const dateInputProps = useDateInput(formData.date, (d) => setFormData((prev: any) => ({ ...prev, date: d })));
    const checkDateInputProps = useDateInput(formData.checkDueDate || '', (d) => setFormData((prev: any) => ({ ...prev, checkDueDate: d })));

    useEffect(() => {
        if (docToView && docToView.view === 'customerReceipt') {
            const receipt = customerReceipts.find(r => r.id === docToView.docId);
            if (receipt) handleEdit(receipt, true);
            onClearDocToView();
        }
    }, [docToView, customerReceipts, onClearDocToView]);

    useEffect(() => {
        if (formData.id && formData.customerId) {
            const customer = customers.find(c => c.id === formData.customerId);
            if (customer) setCustomerSearchQuery(customer.name);
        } else if (!isCustomerSuggestionsOpen) {
             setCustomerSearchQuery('');
        }
    }, [formData.id, formData.customerId, customers]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
                setIsCustomerSuggestionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (formData.customerId) {
            const customer = customers.find(c => c.id === formData.customerId);
            if (customer) {
                let balance = customer.openingBalance;
                salesInvoices.forEach(inv => {
                    if (inv.customerId === customer.id) {
                        const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                        balance += (total - (inv.paidAmount || 0));
                    }
                });
                salesReturns.forEach(ret => {
                    if (ret.customerId === customer.id) {
                        const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                        balance -= (total - (ret.paidAmount || 0));
                    }
                });
                customerReceipts.forEach(rec => {
                    if (rec.customerId === customer.id && rec.id !== formData.id) balance -= rec.amount;
                });
                setCustomerBalance(balance);
            }
        } else setCustomerBalance(null);
    }, [formData.customerId, formData.id, customers, salesInvoices, salesReturns, customerReceipts]);

    const currentTreasuryBalance = useMemo(() => {
        if (!formData.treasuryId) return 0;
        return calculateTreasuryBalance(formData.treasuryId, treasuries, customerReceipts, supplierPayments, expenses, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues, formData.id, 'customerReceipt');
    }, [formData.treasuryId, formData.id, treasuries, customerReceipts, supplierPayments, expenses, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['customerId', 'treasuryId', 'amount'].includes(name);
        setFormData((prev: any) => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
    };
    
    const suggestedCustomers = useMemo(() => {
        if (!customerSearchQuery) return customers;
        return customers.filter(customer => searchMatch(`${customer.name} ${customer.phone || ''}`, customerSearchQuery));
    }, [customerSearchQuery, customers]);

    const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomerSearchQuery(e.target.value);
        setIsCustomerSuggestionsOpen(true);
        if (e.target.value === '') setFormData((p: any) => ({ ...p, customerId: 0 }));
    };

    const handleCustomerSelect = (customer: Customer) => {
        setFormData((p: any) => ({ ...p, customerId: customer.id }));
        setCustomerSearchQuery(customer.name);
        setIsCustomerSuggestionsOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(isViewing) return;
        if (!formData.customerId || isNaN(formData.amount) || formData.amount <= 0) {
            alert("يرجى اختيار العميل وإدخال مبلغ صحيح.");
            return;
        }

        if (isEditing && formData.id) {
            if (!canEdit) { alert("ليس لديك صلاحية التعديل."); return; }
            setCustomerReceipts(prev => prev.map(r => r.id === formData.id ? { ...r, ...formData, id: formData.id!, lastModifiedBy: currentUser.username, lastModifiedAt: new Date().toISOString() } : r));
            showNotification('edit');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل سند قبض رقم ${formData.id} من العميل ${customers.find(c => c.id === formData.customerId)?.name || ''} بمبلغ ${formData.amount}` }));
        } else {
            const newReceipt: CustomerReceipt = { ...formData, id: getNextId(), createdAt: new Date().toISOString(), createdBy: currentUser.username };
            setCustomerReceipts(prev => [...prev, newReceipt]);
            showNotification('add');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإنشاء سند قبض رقم ${newReceipt.id} من العميل ${customers.find(c => c.id === formData.customerId)?.name || ''} بمبلغ ${formData.amount}` }));
        }
        resetForm();
    };

    const handleEdit = (rec: CustomerReceipt, viewOnly: boolean) => {
        setIsEditing(true); setIsViewing(viewOnly); setDraft(rec); window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (rec: CustomerReceipt) => { setReceiptToDelete(rec); setIsDeleteModalOpen(true); };

    const performDelete = () => {
        if (receiptToDelete) { setCustomerReceipts(prev => prev.filter(r => r.id !== receiptToDelete.id)); showNotification('delete'); }
        setIsDeleteModalOpen(false); setReceiptToDelete(null);
    };

    const resetForm = () => { setIsEditing(false); setIsViewing(false); setDraft(null); setCustomerBalance(null); setCustomerSearchQuery(''); };

    const handlePrint = (receipt: CustomerReceipt) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const customer = customers.find(c => c.id === receipt.customerId)?.name || '';
        const treasury = treasuries.find(t => t.id === receipt.treasuryId)?.name || '';
        const methodLabel = receipt.paymentMethod === 'cash' ? 'نقدي' : receipt.paymentMethod === 'check' ? 'شيك' : 'خصم مسموح به';

        const detailsHtml = `
            <p>استلمنا من السيد/ة: ${customer}</p>
            <p>مبلغ وقدره: ${receipt.amount.toFixed(2)} ج.م</p>
            <p>طريقة الدفع: ${methodLabel}</p>
            <p>الخزينة: ${treasury}</p>
            <p>ملاحظات: ${receipt.notes || '-'}</p>
        `;

        const headers = ['م', 'البيان', 'المبلغ'];
        const rowsHtml = `
            <tr class="item-row">
                <td>1</td>
                <td>دفعة من الحساب</td>
                <td class="bold">${receipt.amount.toFixed(2)}</td>
            </tr>
        `;

        const summaryHtml = `
            <div class="summary-row total"><span>الإجمالي:</span><span>${receipt.amount.toFixed(2)}</span></div>
        `;

        const signaturesHtml = `
            <div class="signature-box">
                <div class="signature-title">المستلم</div>
                <div class="signature-line"></div>
            </div>
            <div class="signature-box">
                <div class="signature-title">العميل</div>
                <div class="signature-line"></div>
            </div>
        `;

        printWindow.document.write(getVoucherPrintTemplate(
            'سند قبض',
            receipt.id.toString(),
            formatDateForDisplay(receipt.date),
            companyData,
            detailsHtml,
            headers,
            rowsHtml,
            summaryHtml,
            signaturesHtml,
            'A4',
            '#16a34a' // Green for receipts
        ));
        printWindow.document.close();
    };

    const filteredReceipts = useMemo(() => {
        return customerReceipts.filter(rec => {
            const customerName = customers.find(c => c.id === rec.customerId)?.name || '';
            const treasuryName = treasuries.find(t => t.id === rec.treasuryId)?.name || '';
            const methodLabel = rec.paymentMethod === 'cash' ? 'نقدي' : rec.paymentMethod === 'check' ? 'شيك' : 'خصم مسموح به';
            
            return (
                (!searchFilters.id || rec.id.toString().includes(searchFilters.id)) &&
                (!searchFilters.date || rec.date.includes(searchFilters.date)) &&
                (!searchFilters.name || searchMatch(customerName, searchFilters.name)) &&
                (!searchFilters.method || searchMatch(methodLabel, searchFilters.method)) &&
                (!searchFilters.amount || rec.amount.toString().includes(searchFilters.amount)) &&
                (!searchFilters.treasury || searchMatch(treasuryName, searchFilters.treasury)) &&
                (!searchFilters.notes || searchMatch(rec.notes, searchFilters.notes))
            );
        }).sort((a, b) => b.id - a.id);
    }, [customerReceipts, searchFilters, customers, treasuries]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchFilters]);

    const paginatedReceipts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReceipts, currentPage]);

    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

    const filteredTotal = useMemo(() => filteredReceipts.reduce((sum, r) => sum + r.amount, 0), [filteredReceipts]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-black dark:text-white font-bold placeholder-gray-500 transition-all duration-200 disabled:opacity-70 text-base";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:text-white";

    return (
        <div className="space-y-6">
             {isDeleteModalOpen && receiptToDelete && (
                <ConfirmationModal title="تأكيد الحذف" message={`هل أنت متأكد من حذف سند القبض رقم ${receiptToDelete.id}؟`} onConfirm={performDelete} onCancel={() => setIsDeleteModalOpen(false)} confirmText="حذف" confirmColor="bg-red-600" />
            )}

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-indigo-800 dark:text-indigo-300">سندات القبض (العملاء)</h1>
                <div className="bg-indigo-100 dark:bg-indigo-900/40 px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <span className="text-indigo-800 dark:text-indigo-200 font-bold text-xl">رقم السند: {formData.id}</span>
                </div>
            </div>

             <div className={`${cardClass} relative z-20`}>
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">{isViewing ? 'عرض سند قبض' : isEditing ? 'تعديل سند قبض' : 'إضافة سند قبض جديد'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-row flex-wrap md:flex-nowrap gap-3 items-end">
                         <div className="flex-[14%] min-w-[120px]">
                            <label className={labelClass}>التاريخ</label>
                            <input type="text" {...dateInputProps} className={inputClass} disabled={isViewing || (isEditing && !canEditDate)} />
                        </div>
                        <div className="flex-[30%] min-w-[200px] relative z-[40]" ref={customerDropdownRef}>
                            <label className={labelClass}>العميل</label>
                            <div className="relative">
                                <input type="text" value={customerSearchQuery} onChange={handleCustomerSearchChange} onFocus={() => setIsCustomerSuggestionsOpen(true)} onBlur={() => {
                                    setTimeout(() => {
                                        if (isCustomerSuggestionsOpen && suggestedCustomers.length > 0 && customerSearchQuery) {
                                            handleCustomerSelect(suggestedCustomers[0]);
                                        }
                                        setIsCustomerSuggestionsOpen(false);
                                    }, 250);
                                }} placeholder="ابحث بالاسم..." className={inputClass} disabled={isViewing} autoComplete="off" />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                            </div>
                            {isCustomerSuggestionsOpen && suggestedCustomers.length > 0 && (
                                <ul className="absolute z-[100] w-full bg-white dark:bg-gray-800 border-2 border-indigo-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-xl top-full">
                                    {suggestedCustomers.slice(0, 50).map(customer => <li key={customer.id} onMouseDown={() => handleCustomerSelect(customer)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold text-gray-800 dark:text-gray-200 border-b last:border-0">{customer.name}</li>)}
                                </ul>
                            )}
                            {customerBalance !== null && (
                                <div className="absolute top-full right-0 text-xl font-black mt-1 whitespace-nowrap z-0">
                                    <span className="text-gray-700 dark:text-gray-400">الرصيد: </span>
                                    <span className={customerBalance >= 0 ? 'text-red-600' : 'text-green-600'}><FormattedNumber value={Math.abs(customerBalance)} /></span>
                                    <span className="text-xs text-gray-500 mr-1">({customerBalance >= 0 ? 'عليه' : 'له'})</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-[14%] min-w-[140px]">
                            <label className={labelClass}>طريقة القبض</label>
                            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} className={inputClass} disabled={isViewing}>
                                <option value="cash">نقدي</option>
                                <option value="check">شيك</option>
                                <option value="discount">خصم مسموح به</option>
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
                                        <option value="collected">تم التحصيل</option>
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
                                <div className="absolute top-full right-0 text-xl font-black mt-1 whitespace-nowrap text-indigo-800 dark:text-indigo-300">
                                    المتاح: <FormattedNumber value={currentTreasuryBalance} />
                                </div>
                            )}
                        </div>
                        <div className="flex-[14%] min-w-[120px]">
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-all h-11">
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
                            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{filteredReceipts.length}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-blue-900/20 border border-green-200 dark:border-green-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي المبالغ</p>
                            <p className="text-xl font-black text-green-700 dark:text-green-300"><FormattedNumber value={filteredTotal} /></p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-2 mb-6 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">رقم السند</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.id} onChange={e => setSearchFilters({...searchFilters, id: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">التاريخ</label><input type="text" placeholder="يوم-شهر-سنة" className={filterInputClass} value={searchFilters.date} onChange={e => setSearchFilters({...searchFilters, date: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">العميل</label><input type="text" placeholder="اسم العميل..." className={filterInputClass} value={searchFilters.name} onChange={e => setSearchFilters({...searchFilters, name: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الطريقة</label><input type="text" placeholder="نقدي/شيك..." className={filterInputClass} value={searchFilters.method} onChange={e => setSearchFilters({...searchFilters, method: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المبلغ</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.amount} onChange={e => setSearchFilters({...searchFilters, amount: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الخزينة</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.treasury} onChange={e => setSearchFilters({...searchFilters, treasury: e.target.value})} /></div>
                    <div className="flex items-end gap-1">
                        <div className="flex-1"><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الملاحظات</label><input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.notes} onChange={e => setSearchFilters({...searchFilters, notes: e.target.value})} /></div>
                        <button onClick={() => setSearchFilters({id:'', date:'', name:'', method:'', amount:'', treasury:'', notes:''})} className="bg-gray-200 dark:bg-gray-600 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white" title="تفريغ"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col">
                    <div className="overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">رقم السند</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">التاريخ</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">اسم العميل</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">طريقة القبض</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">المبلغ</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">الخزينة</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">المستخدم</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedReceipts.map((r) => {
                                    const customer = customers.find(c => c.id === r.customerId);
                                    const treasury = treasuries.find(t => t.id === r.treasuryId);
                                    const methodLabel = r.paymentMethod === 'cash' ? 'نقدي' : r.paymentMethod === 'check' ? 'شيك' : 'خصم مسموح به';
                                    return (
                                        <tr key={r.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors">
                                            <td className="p-3 font-bold text-indigo-600">{r.id}</td>
                                            <td className="p-3 text-gray-600 dark:text-gray-400">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                                            <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{customer?.name}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-300 text-sm">{methodLabel}</td>
                                            <td className="p-3 font-bold text-green-600"><FormattedNumber value={r.amount} /></td>
                                            <td className="p-3 text-gray-600 dark:text-gray-400">{treasury?.name || '-'}</td>
                                            <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{r.createdBy || '-'}</td>
                                            <td className="p-3">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handlePrint(r)} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="طباعة"><PrintIcon /></button>
                                                    <button onClick={() => handleEdit(r, false)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="تعديل"><EditIcon /></button>
                                                    <button onClick={() => handleEdit(r, true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="عرض"><ViewIcon /></button>
                                                    <button onClick={() => {
                                                        const customer = customers.find(c => c.id === r.customerId);
                                                        const phoneNumber = formatPhoneNumberForWhatsApp(customer?.phone || '');
                                                        const text = `سند قبض رقم: ${r.id}%0Aالتاريخ: ${formatDateForDisplay(r.date)}%0Aالعميل: ${customer?.name || ''}%0Aالمبلغ: ${formatNumber(r.amount)}${defaultValues.whatsappFooter ? '%0A' + encodeURIComponent(defaultValues.whatsappFooter) : ''}`;
                                                        window.open(phoneNumber ? `https://wa.me/${phoneNumber}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
                                                    }} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="واتساب"><WhatsAppIcon /></button>
                                                    {canDelete && <button onClick={() => handleDelete(r)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف"><DeleteIcon /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredReceipts.length === 0 && (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">لا توجد سندات تطابق معايير البحث.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredReceipts.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 font-bold p-3 border-t border-gray-300 dark:border-gray-600 flex justify-between items-center">
                            <span className="text-gray-700 dark:text-gray-300">إجمالي الصفحة:</span>
                            <span className="text-green-600 text-lg"><FormattedNumber value={filteredTotal} /></span>
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

export default CustomerReceiptManagement;