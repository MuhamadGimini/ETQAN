
import React, { useState, useMemo, useRef } from 'react';
import { Modal, ConfirmationModal, EditIcon, DeleteIcon, UploadIcon, DownloadIcon, ViewIcon, FormattedNumber, PlusCircleIcon } from './Shared';
import type { Customer, NotificationType, MgmtUser, SalesInvoice, SalesReturn, CustomerReceipt } from '../types';
import { exportToExcel, readFromExcel } from '../services/excel';
import { searchMatch, normalizeText, generateUniqueId } from '../utils';

interface CustomerManagementProps {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    customerReceipts: CustomerReceipt[];
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, setCustomers, showNotification, currentUser, salesInvoices, salesReturns, customerReceipts }) => {
    const initialFormState: Omit<Customer, 'id' | 'createdBy' | 'createdAt'> & { id: number | null } = { id: null, name: '', phone: '', address: '', openingBalance: NaN };
    const [formData, setFormData] = useState(initialFormState);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const canEdit = currentUser.permissions.includes('customerManagement_edit');
    const canDelete = currentUser.permissions.includes('customerManagement_delete');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['openingBalance'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;
        if (!formData.name) {
            alert("اسم العميل مطلوب.");
            return;
        }

        if (isEditing && formData.id) {
            if (!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
            setCustomers(customers.map(c => c.id === formData.id ? { 
                ...c, 
                ...formData, 
                id: formData.id!,
                openingBalance: formData.openingBalance || 0,
                lastModifiedBy: currentUser.username,
                lastModifiedAt: new Date().toISOString()
            } : c));
            showNotification('edit');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل بيانات العميل "${formData.name}"` }));
        } else {
            const newCustomer: Customer = {
                id: Date.now(),
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                openingBalance: formData.openingBalance || 0,
                createdBy: currentUser.username,
                createdAt: new Date().toISOString()
            };
            setCustomers([...customers, newCustomer]);
            showNotification('add');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإضافة عميل جديد "${newCustomer.name}"` }));
        }
        resetForm();
    };

    const handleEdit = (customer: Customer, viewOnly: boolean) => {
        setIsEditing(true);
        setIsViewing(viewOnly);
        setFormData(customer);
        setIsModalOpen(true);
    };

    const handleDelete = (customer: Customer) => {
        const hasTransactions = salesInvoices.some(inv => inv.customerId === customer.id) ||
                              salesReturns.some(ret => ret.customerId === customer.id) ||
                              customerReceipts.some(rec => rec.customerId === customer.id);
        
        if (hasTransactions) {
            alert(`لا يمكن حذف العميل "${customer.name}" لوجود حركات مسجلة باسمه.`);
            return;
        }
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
    };

    const performDelete = () => {
        if (customerToDelete) {
            setCustomers(customers.filter(c => c.id !== customerToDelete.id));
            showNotification('delete');
        }
        cancelDelete();
    };

    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);
    };

    const resetForm = () => {
        setIsEditing(false);
        setIsViewing(false);
        setFormData(initialFormState);
        setIsModalOpen(false);
    };

    const processExcelImport = async (file: File) => {
        try {
            const jsonData = await readFromExcel(file);
            if (jsonData.length === 0) {
                alert("الملف فارغ!");
                return;
            }

            const findKey = (row: any, keys: string[]) => {
                const rowKeys = Object.keys(row);
                for (const key of keys) {
                    const normalizedKey = normalizeText(key);
                    const found = rowKeys.find(k => normalizeText(k) === normalizedKey);
                    if (found) return found;
                }
                return undefined;
            };

            const newCustomers: Customer[] = [];
            let skippedCount = 0;
            const existingNames = new Set(customers.map(c => normalizeText(c.name)));

            jsonData.forEach((row: any, i: number) => {
                const nameKey = findKey(row, ['الاسم', 'اسم العميل', 'name', 'Name', 'العميل']);
                const name = nameKey ? row[nameKey]?.toString().trim() : undefined;

                if (!name) return;

                const normalizedName = normalizeText(name);
                if (existingNames.has(normalizedName)) {
                    skippedCount++;
                    return;
                }

                const phoneKey = findKey(row, ['رقم الهاتف', 'موبايل', 'تليفون', 'phone', 'Phone', 'mobile']);
                const addressKey = findKey(row, ['العنوان', 'address', 'Address', 'المكان']);
                const balanceKey = findKey(row, ['رصيد أول المدة', 'الرصيد', 'openingBalance', 'balance', 'رصيد اول']);

                newCustomers.push({
                    id: Date.now() + i,
                    name: name,
                    phone: (phoneKey ? row[phoneKey] : '').toString(),
                    address: (addressKey ? row[addressKey] : '').toString(),
                    openingBalance: parseFloat(balanceKey ? row[balanceKey] : 0) || 0,
                    createdBy: currentUser.username,
                    createdAt: new Date().toISOString()
                });
                
                existingNames.add(normalizedName);
            });

            if (newCustomers.length > 0) {
                setCustomers(prev => [...prev, ...newCustomers]);
                showNotification('add');
                let msg = `تم استيراد ${newCustomers.length} عميل بنجاح.`;
                if (skippedCount > 0) msg += `\nتم تخطي ${skippedCount} عميل لأنهم مضافون مسبقاً.`;
                alert(msg);
            } else {
                alert("لم يتم إضافة أي عملاء جدد (ربما الأسماء مكررة أو الأعمدة غير صحيحة).");
            }

        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء معالجة ملف Excel. تأكد من أن الملف صالح.');
        }
    };

    const displayedCustomers = useMemo(() => {
        return customers
            .filter(c => searchMatch(c.name, searchQuery) || searchMatch(c.phone, searchQuery))
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [customers, searchQuery]);

    const stats = useMemo(() => {
        let debitTotal = 0;
        let creditTotal = 0;
        displayedCustomers.forEach(c => {
            if (c.openingBalance > 0) debitTotal += c.openingBalance;
            else if (c.openingBalance < 0) creditTotal += Math.abs(c.openingBalance);
        });
        return { debitTotal, creditTotal, count: displayedCustomers.length };
    }, [displayedCustomers]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-black dark:text-white font-bold placeholder-gray-500 transition-all duration-200 disabled:opacity-70 text-base";
    const labelClass = "block text-black dark:text-gray-200 font-bold mb-1 text-sm";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none dark:text-white";

    return (
        <div className="space-y-6">
            {isDeleteModalOpen && customerToDelete && (
                <ConfirmationModal 
                    title="تأكيد الحذف" 
                    message={`هل أنت متأكد من حذف العميل "${customerToDelete.name}"؟`} 
                    onConfirm={performDelete} 
                    onCancel={cancelDelete} 
                    confirmText="حذف" 
                    confirmColor="bg-red-600" 
                />
            )}

            <Modal
                title={isViewing ? 'عرض بيانات العميل' : isEditing ? 'تعديل بيانات العميل' : 'تكويد عميل جديد'}
                show={isModalOpen}
                onClose={resetForm}
            >
                <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
                    <div className="w-full">
                        <label className={labelClass}>اسم العميل</label>
                        <input name="name" type="text" value={formData.name} onChange={handleInputChange} className={inputClass} required disabled={isViewing} placeholder="مثال: شركة التوريدات الهندسية" />
                    </div>
                    
                    <div className="w-full">
                        <label className={labelClass}>رقم الموبايل</label>
                        <input name="phone" type="text" value={formData.phone} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="01XXXXXXXXX" />
                    </div>
                    
                    <div className="w-full">
                        <label className={labelClass}>العنوان</label>
                        <input name="address" type="text" value={formData.address} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="المحافظة - المدينة - الشارع" />
                    </div>
                    
                    <div className="w-full">
                        <label className={labelClass}>رصيد أول المدة (مدين/عليه)</label>
                        <input name="openingBalance" type="number" step="0.01" value={isNaN(formData.openingBalance) ? '' : formData.openingBalance} onChange={handleInputChange} className={inputClass} disabled={isViewing} placeholder="0.00" />
                        <p className="text-[10px] text-gray-500 mt-1 dark:text-gray-400 font-bold">* المبالغ السالبة تعني رصيد دائن (له)</p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                        {!isViewing && (
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold h-12 rounded-lg shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mb-3">
                                <PlusCircleIcon className="h-5 w-5" />
                                <span>{isEditing ? 'تحديث البيانات' : 'حفظ بيانات العميل'}</span>
                            </button>
                        )}
                        
                        <input 
                            type="file" 
                            ref={importFileRef} 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) processExcelImport(file);
                                e.target.value = '';
                            }} 
                            accept=".xlsx, .xls, .csv" 
                            className="hidden" 
                        />
                    </div>
                </form>
            </Modal>

            {/* Permanent Customer Log Section */}
            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-blue-800 dark:text-blue-300">سجل العملاء</h2>
                        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <PlusCircleIcon className="h-5 w-5" />
                            <span>إضافة عميل جديد</span>
                        </button>
                        <button type="button" onClick={() => importFileRef.current?.click()} className="bg-gray-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <UploadIcon className="h-4 w-4 text-white" />
                            <span>استيراد Excel</span>
                        </button>
                        <button type="button" onClick={() => {
                            const data = displayedCustomers.map(c => ({ 'الاسم': c.name, 'رقم الهاتف': c.phone, 'العنوان': c.address, 'رصيد أول المدة': c.openingBalance }));
                            exportToExcel(data, 'العملاء');
                        }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
                            <DownloadIcon className="h-4 w-4 text-white" />
                            <span>تصدير Excel</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">عدد العملاء</p>
                            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.count}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي أرصدة (عليهم)</p>
                            <p className="text-xl font-black text-red-700 dark:text-red-300"><FormattedNumber value={stats.debitTotal} /></p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 px-4 rounded-lg text-center shadow-sm">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي أرصدة (لهم)</p>
                            <p className="text-xl font-black text-green-700 dark:text-green-300"><FormattedNumber value={stats.creditTotal} /></p>
                        </div>
                    </div>
                </div>

                <div className="animate-fade-in-up">
                    <div className="my-4 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">بحث سريع (اسم العميل أو رقم الهاتف)</label>
                                <input
                                    type="text"
                                    placeholder="ابحث هنا..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={filterInputClass}
                                />
                            </div>
                            <button onClick={() => setSearchQuery('')} className="bg-gray-200 dark:bg-gray-600 px-4 h-9 rounded text-xs font-bold text-gray-700 dark:text-white hover:bg-gray-300 transition-colors">
                                تفريغ البحث
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto relative max-h-[60vh] border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-right border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
                                <tr className="text-gray-700 dark:text-gray-300 shadow-sm">
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 w-1/4">اسم العميل</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">رقم الموبايل</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">العنوان</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 text-center">النقاط</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 text-center">رصيد أول المدة</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600">المستخدم</th>
                                    <th className="p-3 border-b-2 border-gray-300 dark:border-gray-600 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedCustomers.map((c) => (
                                    <tr key={c.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{c.name}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300 font-mono">{c.phone || '-'}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400 text-sm">{c.address || '-'}</td>
                                        <td className="p-3 text-center font-bold text-orange-600 dark:text-orange-400">{c.points || 0}</td>
                                        <td className={`p-3 font-black text-center ${c.openingBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            <FormattedNumber value={Math.abs(c.openingBalance)} />
                                            <span className="text-[10px] mr-1 opacity-70">({c.openingBalance >= 0 ? 'عليه' : 'له'})</span>
                                        </td>
                                        <td className="p-3 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col">
                                                <span>{c.createdBy || 'غير معروف'}</span>
                                                {c.lastModifiedBy && <span className="text-[9px] text-blue-500">تعديل: {c.lastModifiedBy}</span>}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleEdit(c, !canEdit)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title={canEdit ? 'تعديل' : 'عرض'}>
                                                    {canEdit ? <EditIcon /> : <ViewIcon />}
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => handleDelete(c)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف">
                                                        <DeleteIcon />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayedCustomers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-500">لا توجد بيانات مطابقة للبحث.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerManagement;
