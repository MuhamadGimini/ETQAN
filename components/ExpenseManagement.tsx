
import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { Expense, ExpenseCategory, Treasury, NotificationType, MgmtUser, DefaultValues, CustomerReceipt, SupplierPayment, TreasuryTransfer, SalesInvoice, PurchaseInvoice, SalesReturn, PurchaseReturn, CompanyData } from '../types';
import { ConfirmationModal, EditIcon, DeleteIcon, ViewIcon, FormattedNumber, ChevronDownIcon, PrintIcon } from './Shared';
import { useDateInput } from '../hooks/useDateInput';
import { searchMatch, formatDateForDisplay } from '../utils';
import { getReportPrintTemplate } from '../utils/printing';

import { calculateTreasuryBalance } from '../utils/calculations';

interface ExpenseManagementProps {
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    expenseCategories: ExpenseCategory[];
    treasuries: Treasury[];
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
    defaultValues: DefaultValues;
    customerReceipts: CustomerReceipt[];
    supplierPayments: SupplierPayment[];
    treasuryTransfers: TreasuryTransfer[];
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    salesReturns: SalesReturn[];
    purchaseReturns: PurchaseReturn[];
    draft: any;
    setDraft: React.Dispatch<React.SetStateAction<any>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    companyData: CompanyData;
}

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ 
    expenses, setExpenses, expenseCategories, treasuries, showNotification, currentUser, defaultValues,
    customerReceipts, supplierPayments, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns,
    draft, setDraft, isEditing, setIsEditing, companyData
}) => {
    
    const getNextExpenseId = () => {
        if (expenses.length === 0) return 1;
        return Math.max(...expenses.map(exp => exp.id)) + 1;
    };

    const initialFormState: Omit<Expense, 'createdAt' | 'createdBy'> = { 
        id: getNextExpenseId(), 
        date: new Date().toISOString().split('T')[0], 
        categoryId: 0, 
        treasuryId: defaultValues.defaultTreasuryId, 
        beneficiary: '',
        amount: NaN, 
        notes: '' 
    };
    
    const formData = draft || initialFormState;
    const setFormData = (action: any) => {
        if (typeof action === 'function') {
            setDraft(prev => action(prev || initialFormState));
        } else {
            setDraft(action);
        }
    };

    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const [categorySearchQuery, setCategorySearchQuery] = useState('');
    const [isCategorySuggestionsOpen, setIsCategorySuggestionsOpen] = useState(false);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const [treasurySearchQuery, setTreasurySearchQuery] = useState('');
    const [isTreasurySuggestionsOpen, setIsTreasurySuggestionsOpen] = useState(false);
    const treasuryDropdownRef = useRef<HTMLDivElement>(null);

    // Search filters for the log
    const [searchFilters, setSearchFilters] = useState({
        date: '',
        type: '',
        beneficiary: '',
        amount: '',
        treasury: '',
        notes: ''
    });

    const treasuryInputRef = useRef<HTMLInputElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);

    const canEdit = currentUser.permissions.includes('expenseManagement_edit');
    const canDelete = currentUser.permissions.includes('expenseManagement_delete');
    const canEditDate = currentUser.permissions.includes('expenseManagement_editDate');

    const dateInputProps = useDateInput(formData.date, (d) => setFormData((prev: any) => ({ ...prev, date: d })));

    useEffect(() => {
        if (formData.categoryId) {
            const cat = expenseCategories.find(c => c.id === formData.categoryId);
            if (cat) setCategorySearchQuery(cat.name);
        } else if (!isCategorySuggestionsOpen) {
            setCategorySearchQuery('');
        }
        if (formData.treasuryId) {
            const t = treasuries.find(t => t.id === formData.treasuryId);
            if (t) setTreasurySearchQuery(t.name);
        } else if (!isTreasurySuggestionsOpen) {
            setTreasurySearchQuery('');
        }
    }, [formData.categoryId, formData.treasuryId, expenseCategories, treasuries]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategorySuggestionsOpen(false);
            }
            if (treasuryDropdownRef.current && !treasuryDropdownRef.current.contains(event.target as Node)) {
                setIsTreasurySuggestionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const currentTreasuryBalance = useMemo(() => {
        if (!formData.treasuryId) return 0;
        return calculateTreasuryBalance(formData.treasuryId, treasuries, customerReceipts, supplierPayments, expenses, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues, formData.id, 'expense');
    }, [formData.treasuryId, formData.id, treasuries, customerReceipts, supplierPayments, expenses, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['categoryId', 'treasuryId', 'amount'].includes(name);
        setFormData((prev: any) => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;
        if (!formData.date || !formData.categoryId || !formData.treasuryId || isNaN(formData.amount) || formData.amount <= 0) {
            alert("يرجى ملء جميع الحقول المطلوبة بمبالغ صحيحة.");
            return;
        }

        if (formData.amount > currentTreasuryBalance) {
            alert(`خطأ: رصيد الخزينة غير كافٍ.\nالرصيد الحالي: ${currentTreasuryBalance.toFixed(2)}`);
            return;
        }

        if (isEditing && formData.id) {
            if (!canEdit) { alert("ليس لديك صلاحية التعديل."); return; }
            setExpenses(expenses.map(exp => exp.id === formData.id ? { ...(exp as any), ...formData, lastModifiedBy: currentUser.username, lastModifiedAt: new Date().toISOString() } : exp));
            showNotification('edit');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل مصروف رقم ${formData.id} بقيمة ${formData.amount}` }));
        } else {
            const newExpense: Expense = { ...formData, id: getNextExpenseId(), createdBy: currentUser.username, createdAt: new Date().toISOString() };
            setExpenses([...expenses, newExpense]);
            showNotification('add');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإضافة مصروف جديد رقم ${newExpense.id} بقيمة ${formData.amount}` }));
        }
        resetForm();
    };

    const handleEdit = (expense: Expense, viewOnly: boolean) => { 
        setIsEditing(true); 
        setIsViewing(viewOnly); 
        setDraft(expense); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };
    
    const handleDelete = (expense: Expense) => { 
        setExpenseToDelete(expense); 
        setIsDeleteModalOpen(true); 
    };
    
    const performDelete = () => { 
        if (expenseToDelete) { 
            setExpenses(expenses.filter(exp => exp.id !== expenseToDelete.id)); 
            showNotification('delete'); 
        } 
        cancelDelete(); 
    };
    
    const cancelDelete = () => { 
        setIsDeleteModalOpen(false); 
        setExpenseToDelete(null); 
    };
    
    const resetForm = () => { 
        setIsEditing(false); 
        setIsViewing(false); 
        setDraft(null); 
        setCategorySearchQuery(''); 
        setTreasurySearchQuery(''); 
    };

    const handlePrint = (expense: Expense) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const category = expenseCategories.find(c => c.id === expense.categoryId)?.name || '';
        const treasury = treasuries.find(t => t.id === expense.treasuryId)?.name || '';

        const headers = ['رقم السند', 'التاريخ', 'نوع المصروف', 'المستفيد', 'المبلغ', 'الخزينة'];
        const rowsHtml = `
            <tr>
                <td>${expense.id}</td>
                <td>${formatDateForDisplay(expense.date)}</td>
                <td>${category}</td>
                <td>${expense.beneficiary || '-'}</td>
                <td class="font-black text-red">${expense.amount.toFixed(2)}</td>
                <td>${treasury}</td>
            </tr>
        `;

        const summaryHtml = `
            <div class="summary-item"><span>المبلغ:</span><span class="text-red">${expense.amount.toFixed(2)}</span></div>
            <div class="summary-item"><span>ملاحظات:</span><span>${expense.notes || '-'}</span></div>
        `;

        const signaturesHtml = `
            <div class="signature-box">
                <div class="signature-title">المستلم</div>
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

        printWindow.document.write(getReportPrintTemplate('سند صرف مصروفات', `مستند رقم ${expense.id}`, companyData, headers, rowsHtml, summaryHtml, undefined, signaturesHtml));
        printWindow.document.close();
    };
    
    const suggestedCategories = React.useMemo(() => {
        const query = categorySearchQuery.trim();
        if (!query) return expenseCategories;
        return expenseCategories.filter(c => {
            const isNumber = /^\d+$/.test(query);
            if (isNumber) {
                // Strict match for code or ID when input is a number
                return c.code === query || c.id.toString() === query;
            }
            return c.name && c.name.toLowerCase().includes(query.toLowerCase());
        });
    }, [categorySearchQuery, expenseCategories]);

    const handleCategorySelect = (category: ExpenseCategory) => { 
        setFormData((p: any) => ({ ...p, categoryId: category.id })); 
        setCategorySearchQuery(category.name); 
        setIsCategorySuggestionsOpen(false); 
    };

    const suggestedTreasuries = React.useMemo(() => {
        if (!treasurySearchQuery) return treasuries;
        return treasuries.filter(t => t.name.toLowerCase().includes(treasurySearchQuery.toLowerCase()));
    }, [treasurySearchQuery, treasuries]);
    
    const handleTreasurySelect = (treasury: Treasury) => { 
        setFormData((p: any) => ({ ...p, treasuryId: treasury.id })); 
        setTreasurySearchQuery(treasury.name); 
        setIsTreasurySuggestionsOpen(false); 
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const catName = expenseCategories.find(c => c.id === exp.categoryId)?.name || '';
            const trName = treasuries.find(t => t.id === exp.treasuryId)?.name || '';
            
            return (
                (!searchFilters.date || exp.date.includes(searchFilters.date)) &&
                (!searchFilters.type || searchMatch(catName, searchFilters.type)) &&
                (!searchFilters.beneficiary || searchMatch(exp.beneficiary, searchFilters.beneficiary)) &&
                (!searchFilters.amount || exp.amount.toString().includes(searchFilters.amount)) &&
                (!searchFilters.treasury || searchMatch(trName, searchFilters.treasury)) &&
                (!searchFilters.notes || searchMatch(exp.notes, searchFilters.notes))
            );
        }).sort((a, b) => b.id - a.id);
    }, [expenses, searchFilters, expenseCategories, treasuries]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchFilters]);

    const paginatedExpenses = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredExpenses, currentPage]);

    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

    const filteredTotalAmount = useMemo(() => paginatedExpenses.reduce((sum, e) => sum + e.amount, 0), [paginatedExpenses]);

    const clearFilters = () => {
        setSearchFilters({ date: '', type: '', beneficiary: '', amount: '', treasury: '', notes: '' });
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-black dark:text-white font-bold placeholder-gray-500 transition-all duration-200 disabled:opacity-70 text-base";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none dark:text-white";

    return (
        <div className="space-y-8">
            {isDeleteModalOpen && expenseToDelete && (
                <ConfirmationModal 
                    title="تأكيد الحذف" 
                    message={`هل أنت متأكد من حذف المصروف رقم ${expenseToDelete.id}؟`} 
                    onConfirm={performDelete} 
                    onCancel={cancelDelete} 
                    confirmText="حذف" 
                    confirmColor="bg-red-600" 
                />
            )}

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-purple-800 dark:text-purple-300">إدارة المصروفات</h1>
                <div className="bg-purple-100 dark:bg-purple-900/40 px-4 py-2 rounded-lg border border-purple-200 dark:border-purple-800">
                    <span className="text-purple-800 dark:text-purple-200 font-bold text-xl">رقم المستند: {formData.id}</span>
                </div>
            </div>

            <div className={`${cardClass} relative z-20`}>
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">{isViewing ? 'عرض مصروف' : isEditing ? 'تعديل مصروف' : 'إضافة مصروف جديد'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-row flex-wrap md:flex-nowrap gap-3 items-end">
                        <div className="flex-[14%] min-w-[120px]">
                            <label className={labelClass}>التاريخ</label>
                            <input type="text" {...dateInputProps} className={inputClass} disabled={isViewing || (isEditing && !canEditDate)} />
                        </div>
                        <div className="flex-[14%] min-w-[150px] relative z-[40]" ref={categoryDropdownRef}>
                            <label className={labelClass}>نوع المصروف</label>
                            <div className="relative">
                                <input type="text" value={categorySearchQuery} onChange={(e) => {setCategorySearchQuery(e.target.value); setIsCategorySuggestionsOpen(true);}} onFocus={() => setIsCategorySuggestionsOpen(true)} onBlur={() => {
                                    setTimeout(() => {
                                        if (isCategorySuggestionsOpen && suggestedCategories.length > 0 && categorySearchQuery) {
                                            handleCategorySelect(suggestedCategories[0]);
                                        }
                                        setIsCategorySuggestionsOpen(false);
                                    }, 250);
                                }} placeholder="ابحث..." className={inputClass} required disabled={isViewing} autoComplete="off"/>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                            </div>
                            {isCategorySuggestionsOpen && suggestedCategories.length > 0 && (
                                <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg top-full">
                                    {suggestedCategories.map(cat => <li key={cat.id} onMouseDown={() => handleCategorySelect(cat)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white flex justify-between"><span>{cat.name}</span><span className="text-gray-400 text-sm">{cat.code}</span></li>)}
                                </ul>
                            )}
                        </div>
                        <div className="flex-[30%] min-w-[200px]">
                            <label className={labelClass}>المستفيد</label>
                            <input name="beneficiary" type="text" value={formData.beneficiary || ''} onChange={handleInputChange} placeholder="اسم الشخص أو الجهة" className={inputClass} disabled={isViewing} />
                        </div>
                        <div className="flex-[14%] min-w-[100px]">
                            <label className={labelClass}>المبلغ</label>
                            <input ref={amountInputRef} id="amount" name="amount" type="number" step="0.01" value={isNaN(formData.amount) ? '' : formData.amount} onChange={handleInputChange} className={inputClass} required disabled={isViewing} />
                        </div>
                        <div className="flex-[14%] min-w-[150px] relative z-[35]" ref={treasuryDropdownRef}>
                            <label className={labelClass}>الخزينة</label>
                            <div className="relative">
                                <input ref={treasuryInputRef} type="text" value={treasurySearchQuery} onChange={(e) => {setTreasurySearchQuery(e.target.value); setIsTreasurySuggestionsOpen(true);}} onFocus={() => setIsTreasurySuggestionsOpen(true)} onBlur={() => {
                                    setTimeout(() => {
                                        if (isTreasurySuggestionsOpen && suggestedTreasuries.length > 0 && treasurySearchQuery) {
                                            handleTreasurySelect(suggestedTreasuries[0]);
                                        }
                                        setIsTreasurySuggestionsOpen(false);
                                    }, 250);
                                }} placeholder="اختر..." className={inputClass} required disabled={isViewing} autoComplete="off"/>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                            </div>
                             {isTreasurySuggestionsOpen && (
                                <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg top-full">
                                    {suggestedTreasuries.map(t => <li key={t.id} onMouseDown={() => handleTreasurySelect(t)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white">{t.name}</li>)}
                                </ul>
                            )}
                            {/* Treasury Balance Display */}
                            {formData.treasuryId > 0 && (
                                <div className="absolute top-full right-0 text-xl font-black mt-1 whitespace-nowrap text-purple-800 dark:text-purple-300">
                                    المتاح: <FormattedNumber value={currentTreasuryBalance} />
                                </div>
                            )}
                        </div>
                        <div className="flex-[14%] min-w-[120px]">
                            <button type="submit" className="w-full bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700 transition-all h-11 flex items-center justify-center">
                                {isEditing ? 'تحديث' : 'إضافة'}
                            </button>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <div className="w-full">
                            <label className={labelClass}>ملاحظات</label>
                            <input id="notes" name="notes" type="text" value={formData.notes || ''} onChange={handleInputChange} className={inputClass} placeholder="أدخل ملاحظات إضافية هنا..." disabled={isViewing} />
                        </div>
                        {(isEditing || isViewing) && (
                            <div className="flex justify-end">
                                <button type="button" onClick={resetForm} className="bg-gray-500 text-white font-bold py-2 px-8 rounded-lg hover:bg-gray-600 transition-all h-11">إلغاء التعديل والعودة</button>
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Expenses Log Section */}
            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">سجل المصروفات</h2>
                    
                    {/* Top Totals Bar */}
                    <div className="flex gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي الحركات</p>
                            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{filteredExpenses.length}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي المبالغ</p>
                            <p className="text-xl font-black text-red-700 dark:text-red-300"><FormattedNumber value={filteredTotalAmount} /></p>
                        </div>
                    </div>
                </div>
                
                {/* Search Filters */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                        <label className="block text-xs font-bold mb-1 dark:text-gray-400">بالتاريخ</label>
                        <input type="text" placeholder="يوم-شهر-سنة" className={filterInputClass} value={searchFilters.date} onChange={e => setSearchFilters({...searchFilters, date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 dark:text-gray-400">بنوع المصروف</label>
                        <input type="text" placeholder="بحث بالنوع..." className={filterInputClass} value={searchFilters.type} onChange={e => setSearchFilters({...searchFilters, type: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 dark:text-gray-400">بالمستفيد</label>
                        <input type="text" placeholder="بحث بالمستفيد..." className={filterInputClass} value={searchFilters.beneficiary} onChange={e => setSearchFilters({...searchFilters, beneficiary: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 dark:text-gray-400">بالمبلغ</label>
                        <input type="text" placeholder="بحث بالمبلغ..." className={filterInputClass} value={searchFilters.amount} onChange={e => setSearchFilters({...searchFilters, amount: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1 dark:text-gray-400">بالخزينة</label>
                        <input type="text" placeholder="بحث بالخزينة..." className={filterInputClass} value={searchFilters.treasury} onChange={e => setSearchFilters({...searchFilters, treasury: e.target.value})} />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="block text-xs font-bold mb-1 dark:text-gray-400">بالملاحظات</label>
                            <input type="text" placeholder="بحث..." className={filterInputClass} value={searchFilters.notes} onChange={e => setSearchFilters({...searchFilters, notes: e.target.value})} />
                        </div>
                        <button onClick={clearFilters} className="bg-gray-200 dark:bg-gray-600 p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white" title="تفريغ الحقول">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[65vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-right border-collapse">
                        <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm">
                            <tr>
                                <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">رقم المستند</th>
                                <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">التاريخ</th>
                                <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">نوع المصروف</th>
                                <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 w-[20%]">المستفيد</th>
                                <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">المبلغ</th>
                                <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">الخزينة</th>
                                <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">المستخدم</th>
                                <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 text-center">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedExpenses.map((exp) => {
                                const category = expenseCategories.find(c => c.id === exp.categoryId);
                                const treasury = treasuries.find(t => t.id === exp.treasuryId);
                                return (
                                    <tr key={exp.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors">
                                        <td className="p-3 font-bold text-purple-600">{exp.id}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400">{new Date(exp.date).toLocaleDateString('ar-EG')}</td>
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{category?.name}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300 font-semibold">{exp.beneficiary || '-'}</td>
                                        <td className="p-3 font-bold text-red-600"><FormattedNumber value={exp.amount} /></td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400">{treasury?.name}</td>
                                        <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{exp.createdBy || '-'}</td>
                                        <td className="p-3">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handlePrint(exp)} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="طباعة"><PrintIcon /></button>
                                                <button onClick={() => handleEdit(exp, false)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="تعديل"><EditIcon /></button>
                                                <button onClick={() => handleEdit(exp, true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="عرض"><ViewIcon /></button>
                                                {canDelete && <button onClick={() => handleDelete(exp)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف"><DeleteIcon /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">لا توجد مصروفات تطابق معايير البحث.</td>
                                </tr>
                            )}
                        </tbody>
                        {filteredExpenses.length > 0 && (
                            <tfoot className="bg-gray-50 dark:bg-gray-800 font-bold">
                                <tr>
                                    <td colSpan={4} className="p-3 text-left">إجمالي الصفحة:</td>
                                    <td className="p-3 text-red-600 text-lg"><FormattedNumber value={filteredTotalAmount} /></td>
                                    <td colSpan={3}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

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
    );
};

export default ExpenseManagement;
