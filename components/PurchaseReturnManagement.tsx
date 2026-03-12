import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal, ConfirmationModal, PlusCircleIcon, DeleteIcon, EditIcon, PrintIcon, ViewIcon, FormattedNumber, ChevronDownIcon, WarningIcon, SwitchHorizontalIcon, BarcodeIcon } from './Shared';
import type { PurchaseReturn, PurchaseReturnItem, Item, Supplier, Warehouse, Unit, CompanyData, NotificationType, PurchaseInvoice, SupplierPayment, MgmtUser, DefaultValues, DocToView, SalesInvoice, SalesReturn, CustomerReceipt, Expense, TreasuryTransfer, Treasury } from '../types';
import QuickAddItemModal from './QuickAddItemModal';
import BarcodePrintModal, { BarcodeItem } from './BarcodePrintModal';
import { formatNumber, searchMatch, formatDateForDisplay, roundTo2 } from '../utils';
import { getReportPrintTemplate } from '../utils/printing';
import { useDateInput } from '../hooks/useDateInput';

interface PurchaseReturnManagementProps {
    purchaseReturns: PurchaseReturn[];
    setPurchaseReturns: React.Dispatch<React.SetStateAction<PurchaseReturn[]>>;
    purchaseInvoices: PurchaseInvoice[];
    supplierPayments: SupplierPayment[];
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    suppliers: Supplier[];
    warehouses: Warehouse[];
    units: Unit[];
    companyData: CompanyData;
    showNotification: (type: NotificationType) => void;
    docToView: DocToView;
    onClearDocToView: () => void;
    currentUser: MgmtUser;
    defaultValues: DefaultValues;
    draft: PurchaseReturn | null;
    setDraft: React.Dispatch<React.SetStateAction<PurchaseReturn | null>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    customerReceipts: CustomerReceipt[];
    setCustomerReceipts: React.Dispatch<React.SetStateAction<CustomerReceipt[]>>;
    expenses: Expense[];
    treasuryTransfers: TreasuryTransfer[];
    treasuries: Treasury[];
}

const PurchaseReturnManagement: React.FC<PurchaseReturnManagementProps> = ({ 
    purchaseReturns, setPurchaseReturns, purchaseInvoices, supplierPayments, items, setItems, suppliers,
    warehouses, units, companyData, showNotification, docToView, onClearDocToView, currentUser, defaultValues,
    draft, setDraft, isEditing, setIsEditing, salesInvoices, salesReturns,
    customerReceipts, setCustomerReceipts, expenses, treasuryTransfers, treasuries
}) => {
    
    const getNextReturnId = () => {
        if (purchaseReturns.length === 0) return 1;
        const numericIds = purchaseReturns.map(inv => typeof inv.id === 'number' ? inv.id : 0);
        return Math.max(...numericIds) + 1;
    };

    const initialReturnState: PurchaseReturn = useMemo(() => ({
        id: getNextReturnId(),
        date: new Date().toISOString().split('T')[0],
        supplierId: 0,
        warehouseId: defaultValues.defaultWarehouseId,
        items: [],
        discount: 0,
        tax: 0,
        paidAmount: 0,
        notes: '',
        type: defaultValues.defaultPaymentMethodInvoices,
        permissionNumber: '',
    }), [purchaseReturns.length, defaultValues]);

    const newReturn = draft || initialReturnState;
    const setNewReturn = (action: any) => {
        if (typeof action === 'function') setDraft(prev => action(prev || initialReturnState));
        else setDraft(action);
    };

    const [isViewing, setIsViewing] = useState(false);
    const [supplierBalance, setSupplierBalance] = useState<number | null>(null);
    const [currentItemSelection, setCurrentItemSelection] = useState<{itemId: number, quantity: number, price: number, warehouseId: number}>({ itemId: 0, quantity: 1, price: 0, warehouseId: 0 });
    
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [isSupplierSuggestionsOpen, setIsSupplierSuggestionsOpen] = useState(false);
    const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
    const [isWarehouseSuggestionsOpen, setIsWarehouseSuggestionsOpen] = useState(false);

    const [isLogVisible, setIsLogVisible] = useState(false);

    const closeAllDropdowns = () => {
        setIsItemSuggestionsOpen(false);
        setIsSupplierSuggestionsOpen(false);
        setIsWarehouseSuggestionsOpen(false);
    };

    const openDropdown = (type: 'item' | 'supplier' | 'warehouse') => {
        closeAllDropdowns();
        if (type === 'item') setIsItemSuggestionsOpen(true);
        if (type === 'supplier') setIsSupplierSuggestionsOpen(true);
        if (type === 'warehouse') setIsWarehouseSuggestionsOpen(true);
    };

    const handleWarehouseSelect = (warehouse: Warehouse) => {
        setNewReturn((p: any) => ({ ...p, warehouseId: warehouse.id })); 
        setWarehouseSearchQuery(warehouse.name);
        setIsWarehouseSuggestionsOpen(false);
    };

    const [logFilters, setLogFilters] = useState({
        id: '',
        permissionNumber: '',
        date: '',
        supplierName: '',
        itemSearch: '',
        type: 'all',
        total: ''
    });

    const quantityInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const itemSearchInputRef = useRef<HTMLInputElement>(null);
    const itemsTableRef = useRef<HTMLDivElement>(null);
    const prevItemsLength = useRef(0);

    useEffect(() => {
        if (itemsTableRef.current && newReturn.items.length > prevItemsLength.current) {
            itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
        }
        prevItemsLength.current = newReturn.items.length;
    }, [newReturn.items.length]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [returnToDelete, setReturnToDelete] = useState<PurchaseReturn | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;
    const [isQuickAddItemModalOpen, setIsQuickAddItemModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [itemsToPrint, setItemsToPrint] = useState<BarcodeItem[]>([]);

    const [fetchInvoiceId, setFetchInvoiceId] = useState('');
    const [fetchPermissionNumber, setFetchPermissionNumber] = useState('');
    const [fetchDate, setFetchDate] = useState('');
    const [fetchSupplierName, setFetchSupplierName] = useState('');
    const [fetchItemSearch, setFetchItemSearch] = useState('');

    const dateInputProps = useDateInput(newReturn.date, (d) => setNewReturn((prev: any) => ({...prev, date: d})));
    const canEdit = currentUser.permissions.includes('purchaseReturn_edit');
    const canDelete = currentUser.permissions.includes('purchaseReturn_delete');
    const canEditDate = currentUser.permissions.includes('purchaseReturn_editDate');

    const getAvailableStock = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return 0;

        let available = item.openingBalance;

        if (isEditing) {
            const originalReturn = purchaseReturns.find(r => r.id === newReturn.id);
            if (originalReturn) {
                const originalItem = originalReturn.items.find(i => i.itemId === itemId);
                if (originalItem) available += originalItem.quantity;
            }
        }
        return available;
    };

    useEffect(() => { 
        if (docToView && docToView.view === 'purchaseReturn') { 
            const ret = purchaseReturns.find(r => r.id === docToView.docId); 
            if (ret) handleEdit(ret, true); 
            onClearDocToView(); 
        } 
    }, [docToView, purchaseReturns, onClearDocToView]);

    useEffect(() => {
        if (newReturn.id && newReturn.supplierId) { 
            const s = suppliers.find(x => x.id === newReturn.supplierId); 
            if (s) setSupplierSearchQuery(s.name); 
        } else if (!isSupplierSuggestionsOpen) {
            setSupplierSearchQuery('');
        }
        if (newReturn.warehouseId) { 
            const w = warehouses.find(x => x.id === newReturn.warehouseId); 
            if (w) setWarehouseSearchQuery(w.name); 
        } else if (!isWarehouseSuggestionsOpen) {
            setWarehouseSearchQuery('');
        }
    }, [newReturn.id, newReturn.supplierId, newReturn.warehouseId, suppliers, warehouses, isSupplierSuggestionsOpen, isWarehouseSuggestionsOpen]);

    useEffect(() => {
        if (newReturn.supplierId) {
            const supplier = suppliers.find(s => s.id === newReturn.supplierId);
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
                supplierPayments.forEach(pay => {
                    if (pay.supplierId === supplier.id) balance -= pay.amount;
                });
                setSupplierBalance(balance);
            }
        } else setSupplierBalance(null);
    }, [newReturn.supplierId, suppliers, purchaseInvoices, purchaseReturns, supplierPayments, newReturn.id]);

    const calculateBalanceAtPoint = (supplierId: number, date: string, id: number | string) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return 0;
        let balance = supplier.openingBalance;
        purchaseInvoices.forEach(inv => {
            if (inv.supplierId === supplierId && (inv.date < date || (inv.date === date && String(inv.id) < String(id)))) {
                const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                balance += (total - (inv.paidAmount || 0));
            }
        });
        purchaseReturns.forEach(ret => {
            if (ret.supplierId === supplierId && (ret.date < date || (ret.date === date && String(ret.id) < String(id)))) {
                const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                balance -= (total - (ret.paidAmount || 0));
            }
        });
        supplierPayments.forEach(pay => {
            if (pay.supplierId === supplierId && (pay.date < date || (pay.date === date && String(pay.id) < String(id)))) {
                balance -= pay.amount;
            }
        });
        return balance;
    };

    const suggestedItems = useMemo(() => {
        if (!newReturn.warehouseId) return [];
        const unselectedItems = items.filter(item => 
            item.warehouseId === newReturn.warehouseId && 
            !newReturn.items.some(invItem => invItem.itemId === item.id)
        );
        if (!itemSearchQuery) return unselectedItems.slice(0, 20);
        const trimmedQuery = itemSearchQuery.trim();
        return unselectedItems.filter(item => item.barcode === trimmedQuery || searchMatch(item.name, itemSearchQuery));
    }, [itemSearchQuery, items, newReturn.items, newReturn.warehouseId]);

    const suggestedSuppliers = useMemo(() => {
        if (!supplierSearchQuery) return suppliers;
        return suppliers.filter(supplier => searchMatch(`${supplier.name} ${supplier.phone || ''}`, supplierSearchQuery));
    }, [supplierSearchQuery, suppliers]);

    const suggestedWarehouses = useMemo(() => {
        if (!warehouseSearchQuery) return warehouses;
        return warehouses.filter(w => searchMatch(w.name, warehouseSearchQuery));
    }, [warehouseSearchQuery, warehouses]);

    const handleSupplierSelect = (supplier: Supplier) => {
        setNewReturn(p => ({ ...p, supplierId: supplier.id }));
        setSupplierSearchQuery(supplier.name);
        setIsSupplierSuggestionsOpen(false);
    };

    const handleItemSelect = (item: Item) => {
        setItemSearchQuery(item.name);
        setCurrentItemSelection({ quantity: 1, itemId: item.id, price: item.purchasePrice, warehouseId: item.warehouseId || newReturn.warehouseId });
        setIsItemSuggestionsOpen(false);
    };

    const handleAddItemClick = () => {
        if (!currentItemSelection.itemId) { alert("يرجى اختيار صنف أولاً"); return; }
        const itemToAdd = items.find(i => i.id === currentItemSelection.itemId);
        if (itemToAdd) {
            if (newReturn.items.some(i => i.itemId === itemToAdd.id)) { alert("الصنف مضاف بالفعل"); return; }
            const availableStock = getAvailableStock(itemToAdd.id);
            if (currentItemSelection.quantity > availableStock) { alert(`الكمية المطلوبة (${currentItemSelection.quantity}) أكبر من الرصيد المتاح (${availableStock}).`); return; }
            const newItem: PurchaseReturnItem = { 
                itemId: itemToAdd.id, 
                quantity: currentItemSelection.quantity, 
                price: currentItemSelection.price,
                warehouseId: currentItemSelection.warehouseId || newReturn.warehouseId
            };
            setNewReturn((prev: any) => ({ ...prev, items: [...prev.items, newItem] }));
            setCurrentItemSelection({ itemId: 0, quantity: 1, price: 0, warehouseId: 0 });
            setItemSearchQuery('');
            itemSearchInputRef.current?.focus();
        }
    };

    const handleItemChange = (itemId: number, field: 'quantity' | 'price' | 'warehouseId', value: number) => {
        setNewReturn((prev: any) => ({ ...prev, items: prev.items.map((item: any) => item.itemId === itemId ? { ...item, [field]: value } : item ) }));
    };

    const subtotal = useMemo(() => newReturn.items.reduce((acc, item) => acc + item.quantity * item.price, 0), [newReturn.items]);
    const total = (subtotal - newReturn.discount) * (1 + newReturn.tax / 100);

    const handleSaveReturn = (printAfterSave: boolean = false) => {
        if (isViewing) return;
        if (!newReturn.supplierId || !newReturn.warehouseId || newReturn.items.length === 0) { alert("بيانات ناقصة (المورد/المخزن/الأصناف)."); return; }
        try {
            let updatedItems = [...items];
            const originalReturn = isEditing ? purchaseReturns.find(inv => inv.id === newReturn.id) : null;
            if (originalReturn) { originalReturn.items.forEach(oldItem => { const idx = updatedItems.findIndex(i => i.id === oldItem.itemId); if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance + oldItem.quantity }; }); }
            newReturn.items.forEach(newItem => { const idx = updatedItems.findIndex(i => i.id === newItem.itemId); if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance - newItem.quantity }; });
            setItems(updatedItems);
            
            const returnToSave = { ...newReturn };
            if (returnToSave.type === 'cash') {
                returnToSave.paidAmount = total;
            } else {
                returnToSave.paidAmount = 0;
            }

            if (isEditing) { 
                const updatedReturn = { ...returnToSave, lastModifiedBy: currentUser.username, lastModifiedAt: new Date().toISOString() }; 
                setPurchaseReturns(prev => prev.map(inv => inv.id === returnToSave.id ? updatedReturn : inv)); 
                showNotification('edit'); 
                if (printAfterSave) handlePrint(updatedReturn);
                window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل مرتجع مشتريات رقم ${updatedReturn.id} للمورد ${suppliers.find(s => s.id === updatedReturn.supplierId)?.name || ''}` }));
            } else { 
                const createdReturn = { ...returnToSave, createdBy: currentUser.username, createdAt: new Date().toISOString() }; 
                setPurchaseReturns(prev => [...prev, createdReturn]); 
                showNotification('add'); 
                if (printAfterSave) handlePrint(createdReturn);
                window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإنشاء مرتجع مشتريات رقم ${createdReturn.id} للمورد ${suppliers.find(s => s.id === createdReturn.supplierId)?.name || ''}` }));
            }
            resetForm();
        } catch (error) { alert("حدث خطأ أثناء الحفظ."); }
    };

    const handleEdit = (ret: PurchaseReturn, viewOnly: boolean = false) => { setIsEditing(true); setIsViewing(viewOnly); setDraft(ret); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    
    const resetRestoreFilters = () => {
        setFetchInvoiceId('');
        setFetchPermissionNumber('');
        setFetchDate('');
        setFetchSupplierName('');
        setFetchItemSearch('');
    };

    const resetForm = () => { setIsEditing(false); setIsViewing(false); setDraft(null); setItemSearchQuery(''); setSupplierSearchQuery(''); setWarehouseSearchQuery(''); setSupplierBalance(null); closeAllDropdowns(); resetRestoreFilters(); };
    
    const handlePrint = (ret: PurchaseReturn) => {
        const supplier = suppliers.find(s => s.id === ret.supplierId);
        const balanceBefore = calculateBalanceAtPoint(ret.supplierId, ret.date, ret.id);
        const invNet = (ret.items.reduce((s, i) => s + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
        const balanceAfter = balanceBefore - (invNet - (ret.paidAmount || 0));

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const headers = ['م', 'الصنف', 'الكمية', 'السعر', 'إجمالي'];
        const rowsHtml = ret.items.map((it, idx) => {
            const itemData = items.find(i => i.id === it.itemId);
            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td style="text-align: right;">${itemData?.name || '-'}</td>
                    <td>${it.quantity}</td>
                    <td>${it.price.toFixed(2)}</td>
                    <td class="font-black">${(it.price * it.quantity).toFixed(2)}</td>
                </tr>
            `;
        }).join('') + `
            <tr style="background: #fef2f2; font-weight: 900;">
                <td colspan="2" style="text-align: right;">إجمالي الأصناف: ${ret.items.length} | القطع: ${ret.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td></td>
                <td>-</td>
                <td>${ret.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</td>
            </tr>
        `;

        const summaryHtml = `
            <div class="summary-item"><span>إجمالي المرتجع:</span><span>${ret.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span></div>
            <div class="summary-item"><span>الخصم المسترد:</span><span class="text-red">-${ret.discount.toFixed(2)}</span></div>
            <div class="summary-item"><span>الصافي:</span><span class="text-red">${invNet.toFixed(2)}</span></div>
        `;

        const secondarySummaryHtml = `
            <div class="summary-item"><span>المورد:</span><span>${supplier?.name || '-'}</span></div>
            <div class="summary-item"><span>رصيد سابق:</span><span class="text-green">${balanceBefore.toFixed(2)}</span></div>
            <div class="summary-item"><span>رصيد بعد المرتجع:</span><span class="text-green">${balanceAfter.toFixed(2)}</span></div>
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

        printWindow.document.write(getReportPrintTemplate('مرتجع مشتريات', `مستند رقم ${ret.id}`, companyData, headers, rowsHtml, summaryHtml, secondarySummaryHtml, signaturesHtml));
        printWindow.document.close();
    };

    const handleDeleteReturn = (ret: PurchaseReturn) => { setReturnToDelete(ret); setIsDeleteModalOpen(true); };

    const performDeleteReturn = () => {
        if (returnToDelete) {
            let updatedItems = [...items];
            returnToDelete.items.forEach(oldItem => { const idx = updatedItems.findIndex(i => i.id === oldItem.itemId); if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance + oldItem.quantity }; });
            setItems(updatedItems);
            setPurchaseReturns(prev => prev.filter(r => r.id !== returnToDelete.id));
            showNotification('delete');
        }
        setIsDeleteModalOpen(false);
        setReturnToDelete(null);
    };

    const handlePrintBarcodes = (ret: PurchaseReturn) => {
        const barcodeItems: BarcodeItem[] = ret.items.map(invItem => {
            const item = items.find(i => i.id === invItem.itemId);
            return {
                name: item?.name || 'صنف',
                barcode: item?.barcode || '',
                price: item?.sellPrice || 0,
                quantity: invItem.quantity
            };
        });
        setItemsToPrint(barcodeItems);
        setIsBarcodeModalOpen(true);
    };

    const filteredLog = useMemo(() => {
        return purchaseReturns.filter(ret => {
            const supplier = suppliers.find(s => s.id === ret.supplierId);
            const retTotal = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
            const matchesItem = !logFilters.itemSearch || ret.items.some(it => {
                const itemData = items.find(i => i.id === it.itemId);
                return searchMatch(`${itemData?.name} ${itemData?.barcode}`, logFilters.itemSearch);
            });
            return (
                (!logFilters.id || ret.id.toString().includes(logFilters.id)) &&
                (!logFilters.permissionNumber || (ret.permissionNumber || '').includes(logFilters.permissionNumber)) &&
                (!logFilters.date || ret.date.includes(logFilters.date)) &&
                (!logFilters.supplierName || searchMatch(supplier?.name || '', logFilters.supplierName)) &&
                matchesItem &&
                (logFilters.type === 'all' || ret.type === logFilters.type) &&
                (!logFilters.total || retTotal.toString().includes(logFilters.total))
            );
        }).sort((a, b) => (b.id as number) - (a.id as number));
    }, [purchaseReturns, logFilters, suppliers, items]);

    useEffect(() => {
        setCurrentPage(1);
    }, [logFilters]);

    const paginatedLog = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLog.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLog, currentPage]);

    const totalPages = Math.ceil(filteredLog.length / itemsPerPage);

    const totalInLog = useMemo(() => filteredLog.reduce((sum, ret) => sum + (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100), 0), [filteredLog]);

    const modalInvoicesToSelect = useMemo(() => {
        return purchaseInvoices
            .filter(inv => {
                const matchesItem = !fetchItemSearch || inv.items.some(it => {
                    const itemData = items.find(i => i.id === it.itemId);
                    return searchMatch(`${itemData?.name} ${itemData?.barcode}`, fetchItemSearch);
                });
                return (
                    (!fetchInvoiceId || inv.id.toString().includes(fetchInvoiceId)) &&
                    (!fetchPermissionNumber || (inv.permissionNumber || '').includes(fetchPermissionNumber)) &&
                    (!fetchDate || inv.date.includes(fetchDate)) &&
                    (!fetchSupplierName || searchMatch(suppliers.find(s => s.id === inv.supplierId)?.name || '', fetchSupplierName)) &&
                    matchesItem
                );
            })
            .slice().reverse().slice(0, 100);
    }, [purchaseInvoices, fetchInvoiceId, fetchPermissionNumber, fetchDate, fetchSupplierName, fetchItemSearch, suppliers, items]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const compactCardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-4 border border-white/40 dark:bg-gray-700/30 dark:border-white/20 w-full"; 
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-red-300 dark:border-red-700 rounded-lg focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-black dark:text-white font-bold text-base transition duration-300 disabled:opacity-70 font-bold";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none dark:text-white font-bold";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm";

    return (
        <div className="space-y-6">
            {isDeleteModalOpen && (
                <ConfirmationModal 
                    title="تأكيد الحذف" 
                    message={`هل أنت متأكد من حذف المرتجع رقم ${returnToDelete?.id}؟`} 
                    onConfirm={performDeleteReturn} 
                    onCancel={() => setIsDeleteModalOpen(false)} 
                    confirmText="حذف" 
                    confirmColor="bg-red-600" 
                />
            )}
            <QuickAddItemModal isOpen={isQuickAddItemModalOpen} onClose={() => setIsQuickAddItemModalOpen(false)} onItemAdded={(ni) => { setItems(p => [...p, ni]); handleItemSelect(ni); setIsQuickAddItemModalOpen(false); showNotification('add'); }} items={items} units={units} warehouses={warehouses} defaultWarehouseId={newReturn.warehouseId} currentUser={currentUser} />
            <BarcodePrintModal isOpen={isBarcodeModalOpen} onClose={() => setIsBarcodeModalOpen(false)} items={itemsToPrint} companyName={companyData.name} />
            <Modal title="استعادة بيانات من فاتورة مشتريات" show={isRestoreModalOpen} onClose={() => { setIsRestoreModalOpen(false); resetRestoreFilters(); }}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4 text-sm font-bold">
                        <div>
                            <label className="block text-xs font-bold mb-1">رقم الفاتورة</label>
                            <input type="text" value={fetchInvoiceId} onChange={(e) => setFetchInvoiceId(e.target.value)} className="h-9 w-full px-3 border-2 border-blue-200 rounded focus:border-blue-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="بحث..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">رقم الإذن</label>
                            <input type="text" value={fetchPermissionNumber} onChange={(e) => setFetchPermissionNumber(e.target.value)} className="h-9 w-full px-3 border-2 border-blue-200 rounded focus:border-blue-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="بحث..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">التاريخ</label>
                            <input type="text" value={fetchDate} onChange={(e) => setFetchDate(e.target.value)} className="h-9 w-full px-3 border-2 border-blue-200 rounded focus:border-blue-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="سنة-شهر-يوم" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">اسم المورد</label>
                            <input type="text" value={fetchSupplierName} onChange={(e) => setFetchSupplierName(e.target.value)} className="h-9 w-full px-3 border-2 border-blue-200 rounded focus:border-blue-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="اسم المورد..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">صنف / باركود</label>
                            <input type="text" value={fetchItemSearch} onChange={(e) => setFetchItemSearch(e.target.value)} className="h-9 w-full px-3 border-2 border-blue-200 rounded focus:border-blue-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="بحث في محتوى الفاتورة..." />
                        </div>
                    </div>
                    <div className="overflow-auto max-h-[60vh] border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                                <tr className="border-b">
                                    <th className="p-3 border-b text-sm font-bold">رقم الفاتورة</th>
                                    <th className="p-3 border-b text-sm font-bold">رقم الإذن</th>
                                    <th className="p-3 border-b text-sm font-bold">التاريخ</th>
                                    <th className="p-3 border-b text-sm font-bold">المورد</th>
                                    <th className="p-3 border-b text-sm font-bold text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modalInvoicesToSelect.map((inv) => (
                                    <tr key={inv.id} className="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-3 border-b font-bold text-blue-700 dark:text-blue-400">{inv.id}</td>
                                        <td className="p-3 border-b font-mono text-xs">{inv.permissionNumber || '-'}</td>
                                        <td className="p-3 border-b text-sm">{formatDateForDisplay(inv.date)}</td>
                                        <td className="p-3 border-b font-bold text-gray-800 dark:text-gray-200">{suppliers.find(s => s.id === inv.supplierId)?.name || 'غير معروف'}</td>
                                        <td className="p-3 border-b text-center">
                                            <button onClick={() => { 
                                                if (newReturn.items.length > 0 && !confirm('سيتم استبدال البيانات الحالية ببيانات الفاتورة. هل تريد الاستمرار؟')) return;
                                                setNewReturn(prev => ({ ...prev, supplierId: inv.supplierId, warehouseId: inv.warehouseId, items: inv.items.map(i => ({ ...i })), tax: inv.tax, notes: `مرتجع من فاتورة مشتريات رقم ${inv.id}` }));
                                                setIsRestoreModalOpen(false);
                                                resetRestoreFilters();
                                            }} className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">جلب البيانات</button>
                                        </td>
                                    </tr>
                                ))}
                                {modalInvoicesToSelect.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-gray-500 font-bold italic">لا توجد فواتير مطابقة للبحث</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                <div className={`${cardClass} lg:col-span-9 pb-10 relative z-30`}>
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-red-800 dark:text-red-300">{isViewing ? 'عرض مرتجع مشتريات' : isEditing ? `تعديل مرتجع مشتريات` : 'مرتجع مشتريات جديد'}</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold text-red-800 dark:text-red-300">رقم المرتجع: {newReturn.id}</span>
                            {!isEditing && (
                                <button onClick={() => setIsRestoreModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 transition-colors">
                                    <SwitchHorizontalIcon className="h-5 w-5 rotate-90" />
                                    <span>جلب من فاتورة</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 font-bold text-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start relative z-50">
                             <div className="lg:col-span-4 relative pb-2 z-[100]">
                                <label className={labelClass}>المورد</label>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <div className="relative flex-grow">
                                        <input type="text" value={supplierSearchQuery} onChange={(e) => { setSupplierSearchQuery(e.target.value); openDropdown('supplier'); }} onFocus={() => openDropdown('supplier')} onBlur={() => {
                                            setTimeout(() => {
                                                if (isSupplierSuggestionsOpen && suggestedSuppliers.length > 0 && supplierSearchQuery) {
                                                    handleSupplierSelect(suggestedSuppliers[0]);
                                                }
                                                setIsSupplierSuggestionsOpen(false);
                                            }, 250);
                                        }} className={inputClass} disabled={isViewing || (isEditing && !canEdit)} placeholder="بحث..." autoComplete="off" />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                    </div>
                                    {isSupplierSuggestionsOpen && <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-red-300 rounded mt-1 max-h-40 overflow-y-auto top-full shadow-2xl">{suggestedSuppliers.slice(0, 50).map(s => <li key={s.id} onMouseDown={() => { handleSupplierSelect(s); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white">{s.name}</li>)}</ul>}
                                </div>
                                 {supplierBalance !== null && (
                                     <div className="mt-2 text-xl font-black whitespace-nowrap z-0">
                                         <span className="text-gray-700 dark:text-gray-400">الرصيد: </span>
                                         <span className={supplierBalance >= 0 ? 'text-green-600' : 'text-red-600'}><FormattedNumber value={Math.abs(supplierBalance)} /></span>
                                         <span className="text-xs text-gray-500 mr-1">({supplierBalance >= 0 ? 'له' : 'عليه'})</span>
                                     </div>
                                 )}
                             </div>
                             <div className="lg:col-span-2"><label className={labelClass}>رقم الإذن</label><input type="text" value={newReturn.permissionNumber || ''} onChange={(e) => setNewReturn((p: any) => ({...p, permissionNumber: e.target.value}))} className={inputClass} disabled={isViewing || (isEditing && !canEdit)} /></div>
                             <div className="lg:col-span-2 relative z-[80]">
                                <label className={labelClass}>المخزن</label>
                                <div className="relative">
                                    <input type="text" value={warehouseSearchQuery} onChange={(e) => { setWarehouseSearchQuery(e.target.value); openDropdown('warehouse'); }} onFocus={() => openDropdown('warehouse')} onBlur={() => {
                                        setTimeout(() => {
                                            if (isWarehouseSuggestionsOpen && suggestedWarehouses.length > 0 && warehouseSearchQuery) {
                                                handleWarehouseSelect(suggestedWarehouses[0]);
                                            }
                                            setIsWarehouseSuggestionsOpen(false);
                                        }, 250);
                                    }} className={inputClass} disabled={isViewing || (isEditing && !canEdit)} autoComplete="off" />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                </div>
                                {isWarehouseSuggestionsOpen && <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-red-300 rounded mt-1 max-h-40 overflow-y-auto top-full shadow-2xl">{suggestedWarehouses.slice(0, 50).map(w => <li key={w.id} onMouseDown={() => { handleWarehouseSelect(w); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-bold border-b last:border-0 dark:text-white">{w.name}</li>)}</ul>}
                             </div>
                             <div className="lg:col-span-2">
                                <label className={labelClass}>نوع المرتجع</label>
                                <select 
                                    value={newReturn.type} 
                                    onChange={(e) => setNewReturn((p: any) => ({ ...p, type: e.target.value as 'cash' | 'credit' }))} 
                                    className={inputClass} 
                                    disabled={isViewing || (isEditing && !canEdit)}
                                >
                                    <option value="cash">نقدي</option>
                                    <option value="credit">آجل</option>
                                </select>
                             </div>
                              <div className="lg:col-span-2"><label className={labelClass}>التاريخ</label><input type="text" {...dateInputProps} className={inputClass} disabled={isViewing || (isEditing && !canEditDate)} /></div>
                        </div>

                        {!isViewing && (
                        <div className="relative z-10">
                             <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 border rounded-lg bg-black/5 dark:bg-white/5 mt-6 border-red-200 pb-12">
                                <div className="md:col-span-5 relative z-[45]">
                                    <label className={labelClass}>الصنف</label>
                                    <div className="relative">
                                        <input ref={itemSearchInputRef} type="text" value={itemSearchQuery} onChange={(e) => { setItemSearchQuery(e.target.value); openDropdown('item'); }} onFocus={() => openDropdown('item')} onBlur={() => {
                                            setTimeout(() => {
                                                if (isItemSuggestionsOpen && suggestedItems.length > 0 && itemSearchQuery) {
                                                    handleItemSelect(suggestedItems[0]);
                                                }
                                                setIsItemSuggestionsOpen(false);
                                            }, 250);
                                        }} placeholder="بحث بالاسم أو الباركود..." disabled={!newReturn.warehouseId} className={inputClass} autoComplete="off" />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                    </div>
                                    {isItemSuggestionsOpen && suggestedItems.length > 0 && (
                                        <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-red-300 rounded mt-1 max-h-60 overflow-y-auto shadow-2xl top-full">
                                            {suggestedItems.map(item => (
                                                <li key={item.id} onMouseDown={() => handleItemSelect(item)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between font-bold border-b dark:border-gray-700 last:border-0 dark:text-white text-xs">
                                                    <div><span>{item.name}</span></div>
                                                    <span className="text-xs text-blue-600 font-bold">المتاح: {getAvailableStock(item.id)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {currentItemSelection.itemId > 0 && (
                                        <div className="absolute top-full right-0 text-sm font-black mt-1 whitespace-nowrap z-0">
                                            <span className="text-red-800 dark:text-red-400">{warehouses.find(w => w.id === (items.find(i => i.id === currentItemSelection.itemId)?.warehouseId))?.name}</span>
                                            <span className="mx-2 text-gray-500">-</span>
                                            <span className="text-blue-800 dark:text-blue-400">المتاح: <span className="font-mono">{getAvailableStock(currentItemSelection.itemId)}</span></span>
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-1">
                                    <div className="h-6"></div>
                                    <button onClick={() => setIsQuickAddItemModalOpen(true)} disabled={isEditing && !canEdit} className="w-full bg-orange-500 text-white font-bold rounded-lg h-11 shadow-md hover:bg-orange-600 flex items-center justify-center transition-all">
                                        <span className="text-xl">+</span>
                                    </button>
                                </div>
                                <div className="md:col-span-2"><label className={labelClass}>الكمية</label><input ref={quantityInputRef} type="number" min="1" value={currentItemSelection.quantity} onChange={(e) => setCurrentItemSelection(prev => ({ ...prev, quantity: Math.max(1, +e.target.value) }))} className={inputClass} disabled={!currentItemSelection.itemId} /></div>
                                <div className="md:col-span-2"><label className={labelClass}>السعر</label><input ref={priceInputRef} type="number" min="0" step="0.01" value={currentItemSelection.price} onChange={(e) => setCurrentItemSelection(prev => ({ ...prev, price: +e.target.value }))} className={inputClass} disabled={!currentItemSelection.itemId} /></div>
                                <div className="md:col-span-2">
                                    <div className="h-6"></div>
                                    <button onClick={handleAddItemClick} disabled={!currentItemSelection.itemId} className="w-full bg-red-600 text-white font-bold py-2 rounded-lg h-11 flex items-center justify-center transition-all"><PlusCircleIcon className="h-5 w-5" /><span className="mr-2">إضافة</span></button>
                                </div>
                             </div>
                         </div>
                        )}
                    </div>
                </div>
                
                <div className={`${compactCardClass} lg:col-span-3 flex flex-col relative z-0`}>
                    <h2 className="font-bold text-sm mb-3 text-black dark:text-gray-200 border-b pb-1 text-center">إجمالي المرتجع</h2>
                    <div className="flex-1 flex flex-col justify-center space-y-4">
                        <div className="flex justify-between items-center bg-black/5 p-2 rounded">
                            <span className="text-gray-600 dark:text-gray-400 text-xs font-bold">عدد الأصناف:</span>
                            <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{newReturn.items.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/5 p-2 rounded">
                            <span className="text-gray-600 dark:text-gray-400 text-xs font-bold">إجمالي القطع:</span>
                            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{newReturn.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                            <span className="text-red-800 dark:text-red-300 text-sm font-black">صافي القيمة:</span>
                            <span className="font-black text-xl text-red-700 dark:text-red-300"><FormattedNumber value={total} /></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${cardClass} relative z-0`}>
                 <div ref={itemsTableRef} className="overflow-x-auto max-h-[500px] overflow-y-auto">
                     <table className="w-full text-right table-fixed border-collapse">
                         <thead className="border-b-2 border-gray-400/50 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                             <tr>
                                 <th className="p-2 text-sm font-bold text-center" style={{ width: '10%' }}>الباركود</th>
                                 <th className="p-2 text-sm font-bold text-right" style={{ width: '30%' }}>الصنف</th>
                                 <th className="p-2 text-sm font-bold text-center" style={{ width: '15%' }}>المخزن</th>
                                 <th className="p-2 text-sm font-bold text-center" style={{ width: '10%' }}>المتاح</th>
                                 <th className="p-2 text-sm font-bold text-center" style={{ width: '10%' }}>الكمية</th>
                                 <th className="p-2 text-sm font-bold text-center" style={{ width: '13%' }}>السعر</th>
                                 <th className="p-2 text-sm font-bold text-center" style={{ width: '13%' }}>الاجمالي</th>
                                 {!isViewing && <th className="p-2 text-sm font-bold text-center" style={{ width: '9%' }}>حذف</th>}
                             </tr>
                         </thead>
                         <tbody>
                            {newReturn.items.map(invItem => {
                                const itemData = items.find(i => i.id === invItem.itemId);
                                return itemData ? (
                                <tr key={invItem.itemId} className="border-b hover:bg-red-50/30 transition-colors text-sm font-bold">
                                    <td className="p-2 text-center text-xs font-mono dark:text-gray-300">{itemData.barcode}</td>
                                    <td className="p-2 text-right dark:text-gray-200">{itemData.name}</td>
                                    <td className="p-2 text-center">
                                        <select 
                                            value={invItem.warehouseId || itemData.warehouseId} 
                                            onChange={(e) => handleItemChange(invItem.itemId, 'warehouseId', +e.target.value)}
                                            disabled={isViewing}
                                            className="w-full text-center border-2 border-gray-200 rounded font-bold dark:bg-gray-700 dark:text-white text-xs"
                                        >
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 text-center text-blue-600">{getAvailableStock(itemData.id)}</td>
                                    <td className="p-2 text-center">
                                        {!isViewing ? (
                                            <input type="number" min="1" value={invItem.quantity} onChange={(e) => handleItemChange(invItem.itemId, 'quantity', +e.target.value)} className="w-full text-center border-2 border-gray-200 rounded font-bold dark:bg-gray-700 dark:text-white" />
                                        ) : (
                                            <span className="font-bold">{invItem.quantity}</span>
                                        )}
                                    </td>
                                    <td className="p-2 text-center">
                                        {!isViewing ? (
                                            <input type="number" min="0" step="0.01" value={invItem.price} onChange={(e) => handleItemChange(invItem.itemId, 'price', +e.target.value)} className="w-full text-center border-2 border-gray-200 rounded font-bold dark:bg-gray-700 dark:text-white" />
                                        ) : (
                                            <FormattedNumber value={invItem.price} />
                                        )}
                                    </td>
                                    <td className="p-2 text-center text-red-600"><FormattedNumber value={invItem.quantity * invItem.price} /></td>
                                    {!isViewing && <td className="p-2 text-center"><button onClick={() => setNewReturn(p=>({...p, items: p.items.filter(i=>i.itemId!==invItem.itemId)}))} className="p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"><DeleteIcon /></button></td>}
                                </tr> ) : null
                            })}
                         </tbody>
                     </table>
                 </div>
            </div>

            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4 items-end">
                    <div className="lg:col-span-1"><label className={labelClass}>المجموع</label><input type="text" value={formatNumber(subtotal)} className={inputClass} disabled /></div>
                    <div className="lg:col-span-1"><label className={labelClass}>الخصم</label><input type="number" min="0" value={newReturn.discount} onChange={(e) => setNewReturn(p => ({...p, discount: +e.target.value}))} className={inputClass} disabled={isViewing} /></div>
                    <div className="lg:col-span-1"><label className={labelClass}>صافي القيمة</label><input type="text" value={formatNumber(total)} className={inputClass} disabled /></div>
                    <div className="lg:col-span-5 flex flex-row gap-2 w-full h-11">
                        <button onClick={resetForm} className="flex-1 bg-gray-500 text-white font-bold h-full rounded-lg shadow hover:bg-gray-600 transition-all text-sm">مرتجع جديد</button>
                        {!isEditing && <button onClick={() => setIsRestoreModalOpen(true)} className="flex-1 bg-blue-600 text-white font-bold h-full rounded-lg shadow hover:bg-blue-700 text-sm">جلب بيانات</button>}
                        <button onClick={() => handlePrintBarcodes(newReturn)} className="flex-1 bg-purple-600 text-white font-bold h-full rounded-lg shadow hover:bg-purple-700 flex items-center justify-center transition-all text-sm"><BarcodeIcon className="h-5 w-5 mr-1" /><span>باركود</span></button>
                        {!isViewing && (
                            <>
                                <button onClick={() => handleSaveReturn(false)} className="flex-1 bg-green-600 text-white font-bold h-full rounded-lg shadow-lg hover:bg-green-700 transition-all text-sm">{isEditing ? 'تحديث' : 'حفظ'}</button>
                                {!isEditing && <button onClick={() => handleSaveReturn(true)} className="flex-1 bg-indigo-600 text-white font-bold h-full rounded-lg shadow-lg hover:bg-indigo-700 transition-all text-sm">حفظ وطباعة</button>}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-4 cursor-pointer select-none" onClick={() => setIsLogVisible(!isLogVisible)}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-red-800 dark:text-red-300">سجل مرتجعات المشتريات</h2>
                        <ChevronDownIcon className={`w-6 h-6 transition-transform duration-300 ${isLogVisible ? 'rotate-180' : ''}`} />
                    </div>
                    {isLogVisible && (
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 px-4 rounded-lg text-center shadow-sm">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي المرتجعات</p>
                                <p className="text-xl font-black text-blue-700 dark:text-blue-300">{filteredLog.length}</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 px-4 rounded-lg text-center shadow-sm">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي القيمة</p>
                                <p className="text-xl font-black text-red-700 dark:text-red-300"><FormattedNumber value={totalInLog} /></p>
                            </div>
                        </div>
                    )}
                </div>
                {isLogVisible && (
                    <div className="animate-fade-in-up mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-6 bg-black/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div>
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">رقم المرتجع</label>
                                <input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.id} onChange={e => setLogFilters({...logFilters, id: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">رقم الإذن</label>
                                <input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.permissionNumber} onChange={e => setLogFilters({...logFilters, permissionNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">التاريخ</label>
                                <input type="text" placeholder="يوم-شهر-سنة" className={filterInputClass} value={logFilters.date} onChange={e => setLogFilters({...logFilters, date: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">اسم المورد</label>
                                <input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.supplierName} onChange={e => setLogFilters({...logFilters, supplierName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الصنف/الباركود</label>
                                <input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.itemSearch} onChange={e => setLogFilters({...logFilters, itemSearch: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">النوع</label>
                                <select className={filterInputClass} value={logFilters.type} onChange={e => setLogFilters({...logFilters, type: e.target.value as any})}>
                                    <option value="all">الكل</option>
                                    <option value="cash">نقدي</option>
                                    <option value="credit">آجل</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المبلغ</label>
                                <input type="text" placeholder="بحث بالمبلغ..." className={filterInputClass} value={logFilters.total} onChange={e => setLogFilters({...logFilters, total: e.target.value})} />
                            </div>
                            <div className="flex items-end">
                                <button 
                                    onClick={() => setLogFilters({id:'', permissionNumber:'', date:'', supplierName:'', itemSearch:'', type:'all', total:''})}
                                    className="w-full h-9 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white text-xs font-bold rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center justify-center gap-1"
                                    title="تفريغ البحث"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    <span>تفريغ</span>
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto relative max-h-[60vh] border border-gray-200 dark:border-gray-700 rounded-lg shadow-inner">
                            <table className="w-full text-right border-collapse">
                                <thead className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                    <tr className="shadow-sm">
                                        <th className="p-3 border-b-2 text-sm font-bold">رقم المرتجع</th>
                                        <th className="p-3 border-b-2 text-sm font-bold">رقم الإذن</th>
                                        <th className="p-3 border-b-2 text-sm font-bold">التاريخ</th>
                                        <th className="p-3 border-b-2 text-sm font-bold">المورد</th>
                                        <th className="p-3 border-b-2 text-sm font-bold">نوع المرتجع</th>
                                        <th className="p-3 border-b-2 text-sm font-bold">المبلغ</th>
                                        <th className="p-3 border-b-2 text-sm font-bold text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLog.map(ret => {
                                        const itemsTotal = ret.items.reduce((s,i)=>s+i.price*i.quantity,0);
                                        const retTotal = (itemsTotal - ret.discount)*(1+ret.tax/100);
                                        return (
                                            <tr key={ret.id} className="border-b hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-bold">
                                                <td className="p-3 font-bold text-red-700 dark:text-red-400">{ret.id}</td>
                                                <td className="p-3 text-gray-600 dark:text-gray-400 font-mono">{ret.permissionNumber || '-'}</td>
                                                <td className="p-3 dark:text-gray-300">{formatDateForDisplay(ret.date)}</td>
                                                <td className="p-3 font-bold dark:text-gray-200">{suppliers.find(s => s.id === ret.supplierId)?.name || 'غير معروف'}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-black ${ret.type === 'cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-green-300'}`}>
                                                        {ret.type === 'cash' ? 'نقدي' : 'آجل'}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-black dark:text-white"><FormattedNumber value={retTotal} /></td>
                                                <td className="p-3">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleEdit(ret)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="تعديل"><EditIcon /></button>
                                                        <button onClick={() => handlePrint(ret)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="طباعة"><PrintIcon /></button>
                                                        {canDelete && <button onClick={() => handleDeleteReturn(ret)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف"><DeleteIcon /></button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
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
                )}
            </div>
        </div>
    );
};

export default PurchaseReturnManagement;