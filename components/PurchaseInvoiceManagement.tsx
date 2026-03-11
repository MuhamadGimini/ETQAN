
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal, ConfirmationModal, PlusCircleIcon, DeleteIcon, EditIcon, PrintIcon, ViewIcon, FormattedNumber, ChevronDownIcon, ArchiveIcon, WhatsAppIcon } from './Shared';
import type { PurchaseInvoice, PurchaseInvoiceItem, Item, Supplier, Warehouse, CompanyData, NotificationType, PurchaseReturn, SupplierPayment, MgmtUser, DefaultValues, Unit, DocToView, SalesInvoice, SalesReturn, CustomerReceipt, Expense, TreasuryTransfer, Treasury } from '../types';
import QuickAddItemModal from './QuickAddItemModal';
import QuickAddContactModal from './QuickAddContactModal';
import { formatNumber, normalizeText, searchMatch, formatDateForDisplay, roundTo2, formatPhoneNumberForWhatsApp } from '../utils';
import BarcodePrintModal, { BarcodeItem } from './BarcodePrintModal';
import { useDateInput } from '../hooks/useDateInput';

import { calculateTreasuryBalance } from '../utils/calculations';

interface PurchaseInvoiceManagementProps {
    purchaseInvoices: PurchaseInvoice[];
    setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
    heldPurchaseInvoices: PurchaseInvoice[];
    setHeldPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
    purchaseReturns: PurchaseReturn[];
    supplierPayments: SupplierPayment[];
    setSupplierPayments: React.Dispatch<React.SetStateAction<SupplierPayment[]>>;
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    warehouses: Warehouse[];
    units: Unit[];
    companyData: CompanyData;
    showNotification: (type: NotificationType) => void;
    docToView: DocToView;
    onClearDocToView: () => void;
    currentUser: MgmtUser;
    defaultValues: DefaultValues;
    draft: PurchaseInvoice | null;
    setDraft: React.Dispatch<React.SetStateAction<PurchaseInvoice | null>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    expenses: Expense[];
    customerReceipts: CustomerReceipt[];
    treasuryTransfers: TreasuryTransfer[];
    treasuries: Treasury[];
}

const PurchaseInvoiceManagement: React.FC<PurchaseInvoiceManagementProps> = React.memo(({ 
    purchaseInvoices, setPurchaseInvoices, heldPurchaseInvoices, setHeldPurchaseInvoices, purchaseReturns, supplierPayments, setSupplierPayments, items, setItems, suppliers, setSuppliers,
    warehouses, units, companyData, showNotification, docToView, onClearDocToView, currentUser, defaultValues,
    draft, setDraft, isEditing, setIsEditing, salesInvoices, salesReturns, expenses, customerReceipts, treasuryTransfers, treasuries
}) => {
    
    const getNextInvoiceId = () => {
        const numericIds = purchaseInvoices.map(inv => typeof inv.id === 'number' ? inv.id : 0);
        if (numericIds.length === 0) return 1;
        return Math.max(...numericIds) + 1;
    };

    const getNextHeldId = () => {
        const numericParts = heldPurchaseInvoices
            .map(inv => typeof inv.id === 'string' && inv.id.startsWith('GRN-') ? parseInt(inv.id.split('-')[1]) : 0)
            .filter(n => !isNaN(n));
        const max = numericParts.length > 0 ? Math.max(...numericParts) : 0;
        return `GRN-${String(max + 1).padStart(2, '0')}`;
    };

    const initialInvoiceState: PurchaseInvoice = useMemo(() => ({
        id: getNextInvoiceId(),
        date: new Date().toISOString().split('T')[0],
        supplierId: 0,
        supplierInvoiceNumber: '',
        permissionNumber: '',
        warehouseId: defaultValues.defaultWarehouseId,
        items: [],
        discount: 0,
        tax: 0, 
        paidAmount: 0,
        notes: '',
        type: defaultValues.defaultPaymentMethodInvoices,
    }), [purchaseInvoices.length, defaultValues]);

    const newInvoice = draft || initialInvoiceState;
    const setNewInvoice = (action: any) => {
        if (typeof action === 'function') setDraft(prev => action(prev || initialInvoiceState));
        else setDraft(action);
    };

    const [supplierBalance, setSupplierBalance] = useState<number | null>(null);
    const [currentItemSelection, setCurrentItemSelection] = useState<{itemId: number, quantity: number, price: number, warehouseId: number}>({ itemId: 0, quantity: 1, price: 0, warehouseId: 0 });
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [isSupplierSuggestionsOpen, setIsSupplierSuggestionsOpen] = useState(false);
    const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
    const [isWarehouseSuggestionsOpen, setIsWarehouseSuggestionsOpen] = useState(false);
    const [isQuickAddSupplierOpen, setIsQuickAddSupplierOpen] = useState(false);

    const [isLogVisible, setIsLogVisible] = useState(false);
    const [logFilters, setLogFilters] = useState({ id: '', supplierInvoiceNumber: '', supplierName: '', itemSearch: '', type: 'all', total: '' });

    const quantityInputRef = useRef<HTMLInputElement>(null);
    const itemSearchInputRef = useRef<HTMLInputElement>(null);
    const itemsTableRef = useRef<HTMLDivElement>(null);
    const prevItemsLength = useRef(0);

    useEffect(() => {
        if (itemsTableRef.current && newInvoice.items.length > prevItemsLength.current) {
            itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
        }
        prevItemsLength.current = newInvoice.items.length;
    }, [newInvoice.items.length]);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<PurchaseInvoice | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;
    const [isQuickAddItemModalOpen, setIsQuickAddItemModalOpen] = useState(false);
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [isHeldInvoicesModalOpen, setIsHeldInvoicesModalOpen] = useState(false);
    const [itemsToPrint, setItemsToPrint] = useState<BarcodeItem[]>([]);

    const [heldFilters, setHeldFilters] = useState({
        date: '',
        supplierName: '',
        total: '',
        itemSearch: ''
    });

    const canEdit = currentUser.permissions.includes('purchaseInvoice_edit');
    const canDelete = currentUser.permissions.includes('purchaseInvoice_delete');
    const canEditDate = currentUser.permissions.includes('purchaseInvoice_editDate');

    const dateInputProps = useDateInput(newInvoice.date, (newDate) => { setNewInvoice((p: any) => ({ ...p, date: newDate })); });

    const getAvailableStock = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return 0;
        return item.openingBalance;
    };

    const currentTreasuryBalance = useMemo(() => {
        return calculateTreasuryBalance(defaultValues.defaultTreasuryId, treasuries, customerReceipts, supplierPayments, expenses, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues, newInvoice.id, 'purchaseInvoice');
    }, [newInvoice.id, treasuries, customerReceipts, supplierPayments, expenses, treasuryTransfers, salesInvoices, purchaseInvoices, salesReturns, purchaseReturns, defaultValues]);

    useEffect(() => {
        if (newInvoice.supplierId) {
            const supplier = suppliers.find(s => s.id === newInvoice.supplierId);
            if (supplier) {
                let balance = supplier.openingBalance;
                purchaseInvoices.forEach(inv => { if (inv.supplierId === supplier.id) balance += ((inv.items.reduce((s, i) => s + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100) - (inv.paidAmount || 0)); });
                purchaseReturns.forEach(ret => { if (ret.supplierId === supplier.id) balance -= ((ret.items.reduce((s, i) => s + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100) - (ret.paidAmount || 0)); });
                supplierPayments.forEach(p => { if (p.supplierId === supplier.id) balance -= p.amount; });
                setSupplierBalance(roundTo2(balance));
            }
        } else setSupplierBalance(null);
    }, [newInvoice.supplierId, suppliers, purchaseInvoices, purchaseReturns, supplierPayments, newInvoice.id]);

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

    const handleItemSelect = (item: Item) => {
        setItemSearchQuery(item.name);
        setCurrentItemSelection({ quantity: 1, itemId: item.id, price: item.purchasePrice, warehouseId: item.warehouseId || newInvoice.warehouseId });
        setIsItemSuggestionsOpen(false);
    };

    const handleSupplierSelect = (supplier: Supplier) => {
        setNewInvoice((prev: any) => ({ ...prev, supplierId: supplier.id }));
        setSupplierSearchQuery(supplier.name);
        setIsSupplierSuggestionsOpen(false);
    };

    const handleWarehouseSelect = (warehouse: Warehouse) => {
        setNewInvoice((prev: any) => ({ ...prev, warehouseId: warehouse.id }));
        setWarehouseSearchQuery(warehouse.name);
        setIsWarehouseSuggestionsOpen(false);
    };

    const handleItemQuickAdded = (newItem: Item) => {
        setItems(prev => [...prev, newItem]);
        const newPurchaseItem: PurchaseInvoiceItem = { itemId: newItem.id, quantity: 1, price: newItem.purchasePrice };
        setNewInvoice((prev: any) => ({ ...prev, items: [...prev.items, newPurchaseItem] }));
        setIsQuickAddItemModalOpen(false);
        showNotification('add');
        handleItemSelect(newItem);
    };

    const resetForm = () => { setIsEditing(false); setDraft(null); setItemSearchQuery(''); setSupplierSearchQuery(''); setSupplierBalance(null); closeAllDropdowns(); };

    const handleAddItemClick = () => {
        if (!currentItemSelection.itemId) { alert("يرجى اختيار صنف أولاً"); return; }
        const itemToAdd = items.find(i => i.id === currentItemSelection.itemId);
        if (itemToAdd) {
            if (newInvoice.items.some(i => i.itemId === itemToAdd.id)) { alert("الصنف مضاف بالفعل"); return; }
            const newItem: PurchaseInvoiceItem = { 
                itemId: itemToAdd.id, 
                quantity: currentItemSelection.quantity, 
                price: currentItemSelection.price,
                warehouseId: currentItemSelection.warehouseId || newInvoice.warehouseId
            };
            setNewInvoice((prev: any) => ({ ...prev, items: [...prev.items, newItem] }));
            setCurrentItemSelection({ itemId: 0, quantity: 1, price: 0, warehouseId: 0 });
            setItemSearchQuery('');
            itemSearchInputRef.current?.focus();
        }
    };

    const handleRemoveItem = (itemId: number) => {
        setNewInvoice((prev: any) => ({ ...prev, items: prev.items.filter((i: any) => i.itemId !== itemId) }));
    };

    const handleItemChange = (itemId: number, field: 'quantity' | 'price' | 'warehouseId', value: number) => { setNewInvoice((prev: any) => ({ ...prev, items: prev.items.map((item: any) => item.itemId === itemId ? { ...item, [field]: value } : item ) })); };

    const closeAllDropdowns = () => { setIsItemSuggestionsOpen(false); setIsSupplierSuggestionsOpen(false); setIsWarehouseSuggestionsOpen(false); };
    const openDropdown = (type: 'item' | 'supplier' | 'warehouse') => { closeAllDropdowns(); if (type === 'item') setIsItemSuggestionsOpen(true); if (type === 'supplier') setIsSupplierSuggestionsOpen(true); if (type === 'warehouse') setIsWarehouseSuggestionsOpen(true); };

    const suggestedItems = useMemo(() => {
        const unselectedItems = items.filter(item => 
            !newInvoice.items.some(invItem => invItem.itemId === item.id) &&
            item.warehouseId === newInvoice.warehouseId
        );
        let results = unselectedItems;
        if (itemSearchQuery) results = unselectedItems.filter(item => item.barcode === itemSearchQuery.trim() || searchMatch(item.name, itemSearchQuery));
        return results.sort((a, b) => a.name.localeCompare(b.name, 'ar')).slice(0, 20);
    }, [itemSearchQuery, items, newInvoice.items, newInvoice.warehouseId]);

    const suggestedSuppliers = useMemo(() => {
        if (!supplierSearchQuery) return suppliers;
        return suppliers.filter(s => searchMatch(s.name, supplierSearchQuery));
    }, [supplierSearchQuery, suppliers]);

    const suggestedWarehouses = useMemo(() => {
        if (!warehouseSearchQuery) return warehouses;
        return warehouses.filter(w => searchMatch(w.name, warehouseSearchQuery));
    }, [warehouseSearchQuery, warehouses]);

    const handleHoldInvoice = () => {
        if (newInvoice.items.length === 0) { alert("لا يمكن تعليق فاتورة فارغة."); return; }
        if (isEditing) {
            const originalInvoice = purchaseInvoices.find(inv => inv.id === newInvoice.id);
            if (originalInvoice) {
                let updatedItems = [...items];
                originalInvoice.items.forEach(oldItem => {
                    const idx = updatedItems.findIndex(i => i.id === oldItem.itemId);
                    if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance - oldItem.quantity };
                });
                setItems(updatedItems);
                setPurchaseInvoices(prev => prev.filter(inv => inv.id !== originalInvoice.id));
            }
        }
        const heldId = typeof newInvoice.id === 'string' && newInvoice.id.startsWith('GRN-') ? newInvoice.id : getNextHeldId();
        setHeldPurchaseInvoices(prev => [...prev, { ...newInvoice, id: heldId, notes: (newInvoice.notes || '') + (isEditing ? " (محولة لمعلقة)" : " (معلقة)"), createdAt: new Date().toISOString(), createdBy: currentUser.username }]);
        resetForm(); showNotification('save');
    };

    const handleSaveInvoice = (printAfterSave: boolean = false) => {
        if (!newInvoice.supplierId || newInvoice.items.length === 0) { alert("بيانات ناقصة."); return; }
        let updatedItems = [...items];
        const originalInvoice = isEditing ? purchaseInvoices.find(inv => inv.id === newInvoice.id) : null;
        if (originalInvoice) originalInvoice.items.forEach(oldItem => { 
            const idx = updatedItems.findIndex(i => i.id === oldItem.itemId); 
            if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance - oldItem.quantity }; 
        });
        newInvoice.items.forEach(newItem => { 
            const idx = updatedItems.findIndex(i => i.id === newItem.itemId); 
            if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance + newItem.quantity, purchasePrice: newItem.price, warehouseId: newItem.warehouseId || updatedItems[idx].warehouseId }; 
        });
        setItems(updatedItems);
        
        const finalizedId = typeof newInvoice.id === 'string' && newInvoice.id.startsWith('GRN-') ? getNextInvoiceId() : newInvoice.id;
        
        const invoiceToSave = { ...newInvoice };
        if (invoiceToSave.type === 'cash') {
            invoiceToSave.paidAmount = total;
        } else {
            invoiceToSave.paidAmount = 0;
        }

        if (isEditing) {
            const updated = { ...invoiceToSave, id: finalizedId, lastModifiedBy: currentUser.username, lastModifiedAt: new Date().toISOString() };
            setPurchaseInvoices(prev => prev.map(inv => inv.id === newInvoice.id ? updated : inv));
            
            // Clean up old auto-generated payment if it exists
            setSupplierPayments(prev => prev.filter(p => p.notes !== `سداد فاتورة مشتريات رقم ${invoiceToSave.id}`));

            showNotification('edit'); if (printAfterSave) handlePrint(updated);
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل فاتورة مشتريات رقم ${finalizedId} للمورد ${suppliers.find(s => s.id === invoiceToSave.supplierId)?.name || ''}` }));
        } else {
            const created = { ...invoiceToSave, id: finalizedId, createdBy: currentUser.username, createdAt: new Date().toISOString() };
            setPurchaseInvoices(prev => [...prev, created]);
            
            showNotification('add'); if (printAfterSave) handlePrint(created);
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإنشاء فاتورة مشتريات رقم ${finalizedId} للمورد ${suppliers.find(s => s.id === invoiceToSave.supplierId)?.name || ''}` }));
        }
        resetForm();
    };

    const handleEdit = (inv: PurchaseInvoice) => { setIsEditing(true); setDraft(inv); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    
    const handlePrint = (inv: PurchaseInvoice) => {
        const supplier = suppliers.find(s => s.id === inv.supplierId);
        const balanceBefore = calculateBalanceAtPoint(inv.supplierId, inv.date, inv.id);
        const invNet = (inv.items.reduce((s, i) => s + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
        const balanceAfter = balanceBefore + (invNet - (inv.paidAmount || 0));

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const itemsRows = inv.items.map((it, idx) => {
            const itemData = items.find(i => i.id === it.itemId);
            const rowTotal = it.price * it.quantity;
            return `
                <tr class="item-row">
                    <td>${idx + 1}</td>
                    <td style="text-align: right;">${itemData?.name || '-'}</td>
                    <td>${it.quantity}</td>
                    <td>${it.price.toFixed(2)}</td>
                    <td class="bold">${rowTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <html dir="rtl">
            <head>
                <title>فاتورة مشتريات رقم ${inv.id}</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.4; }
                    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    .logo-section { width: 33%; text-align: left; }
                    .logo-section img { max-width: 140px; max-height: 90px; object-fit: contain; }
                    .company-center { width: 33%; text-align: center; }
                    .company-center h1 { margin: 0; font-size: 1.6rem; font-weight: 900; color: #047857; }
                    .invoice-badge { display: inline-block; border: 2px solid #047857; color: #047857; padding: 4px 15px; border-radius: 6px; margin-top: 8px; font-weight: 900; font-size: 1.1rem; }
                    .doc-info { width: 33%; text-align: right; }
                    
                    .details-block { margin: 15px 0; font-size: 12pt; border-right: 4px solid #047857; padding-right: 12px; }
                    .details-block p { margin: 4px 0; font-weight: bold; }
                    .bold { font-weight: bold; }
                    .heavy { font-weight: 900; }

                    table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #047857; }
                    th { background: #047857; color: white; padding: 8px; text-align: center; font-size: 12pt; border: 1px solid #047857; }
                    td { padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11pt; }
                    
                    .item-row:nth-child(even) { background-color: #f0fdf4; }
                    
                    @media print {
                        .item-row:nth-child(even) { background-color: transparent !important; }
                        th { background: #047857 !important; color: white !important; -webkit-print-color-adjust: exact !important; }
                        .invoice-badge { border-color: #047857 !important; color: #047857 !important; -webkit-print-color-adjust: exact !important; }
                        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }

                    .summary-section { display: flex; justify-content: flex-end; margin-top: 15px; }
                    .summary-box { width: 280px; border: 1px solid #047857; border-radius: 8px; padding: 10px; background: #f0fdf4; }
                    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #ddd; font-weight: bold; font-size: 11pt; }
                    .summary-row.total { border-bottom: none; border-top: 2px solid #047857; margin-top: 5px; padding-top: 8px; color: #047857; font-size: 12pt; }
                    
                    .footer-block { margin-top: 40px; border-top: 2px solid #047857; padding-top: 15px; display: flex; justify-content: space-between; font-size: 10pt; font-weight: bold; }
                    .thanks { text-align: center; margin-top: 20px; font-weight: 900; color: #475569; font-size: 11pt; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="header-top">
                    <div class="doc-info">
                         <p class="heavy">التاريخ: ${formatDateForDisplay(inv.date)}</p>
                         <p class="heavy">الرقم: ${inv.id}</p>
                    </div>
                    <div class="company-center">
                        <h1>${companyData.name}</h1>
                        <div class="invoice-badge">فاتورة مشتريات</div>
                    </div>
                    <div class="logo-section">
                        ${companyData.logo ? `<img src="${companyData.logo}" />` : ''}
                    </div>
                </div>

                <div class="details-block">
                    <p>المورد: ${supplier?.name || '-'}</p>
                    <p>فاتورة المورد: ${inv.supplierInvoiceNumber || '-'}</p>
                    <p>الرصيد قبل الفاتورة: <span style="color: #047857;">${balanceBefore.toFixed(2)}</span></p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">م</th>
                            <th>الصنف</th>
                            <th style="width: 70px;">الكمية</th>
                            <th style="width: 100px;">السعر</th>
                            <th style="width: 120px;">إجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                    <tr style="background: #f0fdf4; font-weight: 900;">
                        <td colspan="2" style="text-align: right;">إجمالي الأصناف: ${inv.items.length} | القطع: ${inv.items.reduce((s, i) => s + i.quantity, 0)}</td>
                        <td></td>
                        <td>-</td>
                        <td>${inv.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</td>
                    </tr>
                </table>

                <div class="summary-section">
                    <div class="summary-box">
                        <div class="summary-row"><span>الإجمالي:</span><span>${inv.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span></div>
                        <div class="summary-row"><span>الخصم:</span><span style="color: #b91c1c;">-${inv.discount.toFixed(2)}</span></div>
                        <div class="summary-row total"><span class="heavy">الصافي:</span><span class="heavy">${invNet.toFixed(2)}</span></div>
                        <div class="summary-row" style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 6px;">
                            <span>الرصيد بعد الفاتورة:</span>
                            <span style="color: #047857;">${balanceAfter.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div class="footer-block">
                    <div style="text-align: right; width: 50%;">العنوان: ${companyData.address}</div>
                    <div style="text-align: left; width: 50%;">تليفون: ${companyData.phone1} ${companyData.phone2 ? ' - ' + companyData.phone2 : ''}</div>
                </div>

                <div class="thanks">
                    ${defaultValues.invoiceFooter || 'تم استلام البضاعة بحالة جيدة'}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDeleteInvoice = () => {
        if (invoiceToDelete) {
            let updatedItems = [...items];
            invoiceToDelete.items.forEach(oldItem => {
                const idx = updatedItems.findIndex(i => i.id === oldItem.itemId);
                if (idx > -1) {
                    updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance - oldItem.quantity };
                }
            });
            setItems(updatedItems);
            setPurchaseInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
            setSupplierPayments(prev => prev.filter(p => p.notes !== `سداد فاتورة مشتريات رقم ${invoiceToDelete.id}`));
            showNotification('delete');
        }
        setIsDeleteModalOpen(false);
        setInvoiceToDelete(null);
    };

    const filteredHeldInvoices = useMemo(() => {
        return heldPurchaseInvoices.filter(inv => {
            const supplier = suppliers.find(s => s.id === inv.supplierId);
            const itemsTotal = inv.items.reduce((s, i) => s + i.price * i.quantity, 0);
            const netTotal = (itemsTotal - inv.discount) * (1 + inv.tax / 100);
            const matchesItem = !heldFilters.itemSearch || inv.items.some(it => {
                const itemData = items.find(i => i.id === it.itemId);
                return searchMatch(`${itemData?.name} ${itemData?.barcode}`, heldFilters.itemSearch);
            });
            return (
                (!heldFilters.date || inv.date.includes(heldFilters.date)) &&
                (!heldFilters.supplierName || searchMatch(supplier?.name || '', heldFilters.supplierName)) &&
                (!heldFilters.total || netTotal.toString().includes(heldFilters.total)) &&
                matchesItem
            );
        }).sort((a, b) => b.id.toString().localeCompare(a.id.toString()));
    }, [heldPurchaseInvoices, heldFilters, suppliers, items]);

    const filteredLog = useMemo(() => {
        return purchaseInvoices.filter(inv => {
            const supplier = suppliers.find(s => s.id === inv.supplierId);
            const itemsTotal = inv.items.reduce((s, i) => s + i.price * i.quantity, 0);
            const netTotal = (itemsTotal - inv.discount) * (1 + inv.tax / 100);
            const matchesItem = !logFilters.itemSearch || inv.items.some(it => {
                const itemData = items.find(i => i.id === it.itemId);
                return searchMatch(`${itemData?.name} ${itemData?.barcode}`, logFilters.itemSearch);
            });
            return (
                (!logFilters.id || inv.id.toString().includes(logFilters.id)) &&
                (!logFilters.supplierInvoiceNumber || (inv.supplierInvoiceNumber || '').includes(logFilters.supplierInvoiceNumber)) &&
                (!logFilters.supplierName || searchMatch(supplier?.name || '', logFilters.supplierName)) &&
                matchesItem &&
                (logFilters.type === 'all' || inv.type === logFilters.type) &&
                (!logFilters.total || netTotal.toString().includes(logFilters.total))
            );
        }).sort((a, b) => (b.id as number) - (a.id as number));
    }, [purchaseInvoices, logFilters, suppliers, items]);

    useEffect(() => {
        setCurrentPage(1);
    }, [logFilters]);

    const paginatedLog = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLog.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLog, currentPage]);

    const totalPages = Math.ceil(filteredLog.length / itemsPerPage);

    const totalInLog = useMemo(() => filteredLog.reduce((sum, inv) => sum + (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100), 0), [filteredLog]);

    const subtotal = useMemo(() => newInvoice.items.reduce((acc, item) => acc + item.quantity * item.price, 0), [newInvoice.items]);
    const total = (subtotal - newInvoice.discount) * (1 + newInvoice.tax / 100);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const compactCardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-4 border border-white/40 dark:bg-gray-700/30 dark:border-white/20 w-full"; 
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-600 text-black dark:text-white font-bold text-base transition duration-300 disabled:opacity-70 font-bold";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:text-white font-bold";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm";

    return (
        <div className="space-y-6">
            <QuickAddContactModal 
                isOpen={isQuickAddSupplierOpen}
                onClose={() => setIsQuickAddSupplierOpen(false)}
                type="supplier"
                initialQuery={supplierSearchQuery}
                currentUser={currentUser}
                onAdded={(s) => {
                    setSuppliers(prev => [...prev, s]);
                    setNewInvoice((prev: any) => ({ ...prev, supplierId: s.id }));
                    setSupplierSearchQuery(s.name);
                    showNotification('add');
                }}
            />

            {isDeleteModalOpen && (
                <ConfirmationModal 
                    title="تأكيد الحذف" 
                    message={`هل أنت متأكد من حذف الفاتورة رقم ${invoiceToDelete?.id}؟ سيتم خصم الكميات من المخزن.`} 
                    onConfirm={handleDeleteInvoice} 
                    onCancel={() => setIsDeleteModalOpen(false)} 
                    confirmText="حذف" confirmColor="bg-red-600" 
                />
            )}

            <Modal title="فواتير المشتريات المعلقة" show={isHeldInvoicesModalOpen} onClose={() => { setIsHeldInvoicesModalOpen(false); setHeldFilters({date:'', supplierName:'', total:'', itemSearch:''}); }}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800 mb-4 text-sm font-bold">
                        <div><label className="block text-xs font-bold mb-1">التاريخ</label><input type="text" value={heldFilters.date} onChange={(e) => setHeldFilters(prev => ({...prev, date: e.target.value}))} className="h-9 w-full px-3 border-2 border-emerald-200 rounded focus:border-emerald-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="يوم-شهر-سنة" /></div>
                        <div><label className="block text-xs font-bold mb-1">المورد</label><input type="text" value={heldFilters.supplierName} onChange={(e) => setHeldFilters(prev => ({...prev, supplierName: e.target.value}))} className="h-9 w-full px-3 border-2 border-emerald-200 rounded focus:border-emerald-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="بحث بالمورد..." /></div>
                        <div><label className="block text-xs font-bold mb-1">المبلغ</label><input type="text" value={heldFilters.total} onChange={(e) => setHeldFilters(prev => ({...prev, total: e.target.value}))} className="h-9 w-full px-3 border-2 border-emerald-200 rounded focus:border-emerald-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="القيمة..." /></div>
                        <div><label className="block text-xs font-bold mb-1">صنف / باركود</label><input type="text" value={heldFilters.itemSearch} onChange={(e) => setHeldFilters(prev => ({...prev, itemSearch: e.target.value}))} className="h-9 w-full px-3 border-2 border-emerald-200 rounded focus:border-emerald-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="بحث بالأصناف..." /></div>
                    </div>
                    <div className="overflow-auto max-h-[60vh] border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                                <tr className="border-b"><th className="p-3 border-b text-sm font-bold">التاريخ</th><th className="p-3 border-b text-sm font-bold">الرقم المؤقت</th><th className="p-3 border-b text-sm font-bold">المورد</th><th className="p-3 border-b text-sm font-bold text-center">الأصناف</th><th className="p-3 border-b text-sm font-bold text-center">إجمالي</th><th className="p-3 border-b text-sm font-bold text-center">إجراء</th></tr>
                            </thead>
                            <tbody>
                                {filteredHeldInvoices.map(inv => {
                                    const invTotal = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                                    return (
                                        <tr key={inv.id} className="border-b hover:bg-emerald-50/50 dark:hover:bg-white/5 transition-colors font-bold text-sm">
                                            <td className="p-3 text-xs text-gray-600 dark:text-gray-400">{formatDateForDisplay(inv.date)}</td>
                                            <td className="p-3 text-indigo-600 dark:text-indigo-400">{inv.id}</td>
                                            <td className="p-3 text-gray-800 dark:text-gray-200">{suppliers.find(s => s.id === inv.supplierId)?.name || 'غير معروف'}</td>
                                            <td className="p-3 text-center font-bold text-blue-600">{inv.items.length}</td>
                                            <td className="p-3 text-center font-black text-emerald-700 dark:text-emerald-400"><FormattedNumber value={invTotal} /></td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => { if (newInvoice.items.length > 0 && !confirm("سيتم استبدال البيانات الحالية. هل أنت متأكد؟")) return; setDraft(inv); setHeldPurchaseInvoices(p => p.filter(x => x.id !== inv.id)); setIsHeldInvoicesModalOpen(false); }} className="bg-emerald-600 text-white px-4 py-1 rounded text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors">استعادة</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            <QuickAddItemModal isOpen={isQuickAddItemModalOpen} onClose={() => setIsQuickAddItemModalOpen(false)} onItemAdded={handleItemQuickAdded} items={items} units={units} warehouses={warehouses} defaultWarehouseId={newInvoice.warehouseId} currentUser={currentUser} />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                <div className={`${cardClass} lg:col-span-9 pb-10 relative z-30`}>
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{isEditing ? 'تعديل فاتورة مشتريات' : 'فاتورة مشتريات جديدة'}</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">رقم: {newInvoice.id}</span>
                            <button onClick={() => setIsHeldInvoicesModalOpen(true)} className="relative bg-emerald-100 text-emerald-600 p-2 rounded-lg font-bold flex items-center gap-2 shadow-sm border border-emerald-200"><ArchiveIcon className="h-5 w-5"/><span className="text-sm">المعلقة</span>{heldPurchaseInvoices.length > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{heldPurchaseInvoices.length}</span>}</button>
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
                                        }} className={inputClass} placeholder="بحث بالاسم أو الهاتف..." autoComplete="off" />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                    </div>
                                    {isSupplierSuggestionsOpen && (
                                        <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-emerald-300 rounded mt-1 max-h-40 overflow-y-auto top-full shadow-2xl">
                                            {suggestedSuppliers.length > 0 ? suggestedSuppliers.slice(0, 50).map(s => (
                                                <li key={s.id} onMouseDown={() => handleSupplierSelect(s)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold border-b last:border-0 dark:text-white">
                                                    {s.name}
                                                </li>
                                            )) : (
                                                <li onMouseDown={() => setIsQuickAddSupplierOpen(true)} className="p-4 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-blue-600 dark:text-blue-400 font-black flex items-center gap-2 border-b last:border-0">
                                                    <PlusCircleIcon className="h-5 w-5 ml-0" />
                                                    <span>غير موجود، إضافة مورد جديد باسم "{supplierSearchQuery}"؟</span>
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                {supplierBalance !== null && <div className="mt-2 text-xl font-black whitespace-nowrap z-0"><span className="text-gray-700 dark:text-gray-400">الرصيد: </span><span className={supplierBalance >= 0 ? 'text-green-600' : 'text-red-600'}><FormattedNumber value={Math.abs(supplierBalance)} /></span><span className="text-xs text-gray-500 mr-1">({supplierBalance >= 0 ? 'له' : 'عليه'})</span></div>}
                             </div>
                             <div className="lg:col-span-2"><label className={labelClass}>فاتورة المورد</label><input type="text" value={newInvoice.supplierInvoiceNumber} onChange={(e) => setNewInvoice(p=>({...p, supplierInvoiceNumber: e.target.value}))} className={inputClass} /></div>
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
                                    }} className={inputClass} autoComplete="off" />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                </div>
                                {isWarehouseSuggestionsOpen && <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-emerald-300 rounded mt-1 max-h-40 overflow-y-auto top-full shadow-2xl">{suggestedWarehouses.slice(0, 50).map(w => <li key={w.id} onMouseDown={() => handleWarehouseSelect(w)} className="p-3 hover:bg-gray-100 font-bold border-b last:border-0 dark:text-white">{w.name}</li>)}</ul>}
                             </div>
                             <div className="lg:col-span-2 relative">
                                <label className={labelClass}>النوع</label>
                                <select value={newInvoice.type} onChange={(e) => setNewInvoice(p=>({...p, type: e.target.value}))} className={inputClass}>
                                    <option value="credit">آجل</option>
                                    <option value="cash">نقدي</option>
                                </select>
                                {newInvoice.type === 'cash' && (
                                     <div className="absolute top-full right-0 text-xl font-black mt-1 whitespace-nowrap z-0">
                                        <span className="text-gray-700 dark:text-gray-400">رصيد الخزينة: </span>
                                        <span className="text-blue-600"><FormattedNumber value={currentTreasuryBalance} /></span>
                                     </div>
                                )}
                             </div>
                             <div className="lg:col-span-2"><label className={labelClass}>التاريخ</label><input type="text" {...dateInputProps} className={inputClass} disabled={isEditing && !canEditDate} /></div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 border rounded-lg bg-black/5 dark:bg-white/5 mt-6 border-emerald-200 pb-12">
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
                                    }} placeholder="بحث..." className={inputClass} autoComplete="off" />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                </div>
                                {isItemSuggestionsOpen && suggestedItems.length > 0 && (
                                    <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-emerald-300 rounded mt-1 max-h-60 overflow-y-auto shadow-2xl top-full">
                                        {suggestedItems.map(item => (
                                            <li key={item.id} onMouseDown={() => handleItemSelect(item)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between font-bold border-b last:border-0 dark:text-white text-xs">
                                                <span>{item.name}</span><span className="text-xs text-blue-600">المتاح: {getAvailableStock(item.id)}</span>
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
                            <div className="md:col-span-1"><div className="h-6"></div><button onClick={() => setIsQuickAddItemModalOpen(true)} className="w-full bg-orange-500 text-white font-bold rounded-lg h-11 shadow-md hover:bg-orange-600 transition-all text-xl">+</button></div>
                            <div className="md:col-span-2"><label className={labelClass}>الكمية</label><input ref={quantityInputRef} type="number" min="1" value={currentItemSelection.quantity} onChange={(e) => setCurrentItemSelection(prev => ({ ...prev, quantity: Math.max(1, +e.target.value) }))} className={inputClass} disabled={!currentItemSelection.itemId} /></div>
                            <div className="md:col-span-2"><label className={labelClass}>السعر</label><input type="number" min="0" step="0.01" value={currentItemSelection.price} onChange={(e) => setCurrentItemSelection(prev => ({ ...prev, price: +e.target.value }))} className={inputClass} disabled={!currentItemSelection.itemId} /></div>
                            <div className="md:col-span-2"><div className="h-6"></div><button onClick={handleAddItemClick} disabled={!currentItemSelection.itemId} className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg h-11 flex items-center justify-center transition-all shadow-md">إضافة</button></div>
                         </div>
                    </div>
                </div>
                
                <div className={`${compactCardClass} lg:col-span-3 flex flex-col relative z-0`}>
                    <h2 className="font-bold text-sm mb-3 text-black dark:text-gray-200 border-b pb-1 text-center font-bold">إجمالي الفاتورة</h2>
                    <div className="flex-1 flex flex-col justify-center space-y-4">
                        <div className="flex justify-between items-center bg-black/5 p-2 rounded">
                            <span className="text-gray-600 dark:text-gray-400 text-xs font-bold">عدد الأصناف:</span>
                            <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{newInvoice.items.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/5 p-2 rounded">
                            <span className="text-gray-600 dark:text-gray-400 text-xs font-bold">إجمالي القطع:</span>
                            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{newInvoice.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded border border-emerald-200 dark:border-emerald-800">
                            <span className="text-emerald-800 dark:text-green-300 text-sm font-black">صافي القيمة:</span>
                            <span className="font-black text-xl text-emerald-700 dark:text-emerald-300"><FormattedNumber value={total} /></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${cardClass} relative z-0`}>
                 <div ref={itemsTableRef} className="overflow-x-auto font-bold text-sm max-h-[500px] overflow-y-auto">
                    <table className="w-full text-right table-fixed border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-400/50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-2 text-sm font-bold text-center" style={{ width: '10%' }}>الباركود</th>
                                <th className="p-2 text-sm font-bold text-right" style={{ width: '25%' }}>الصنف</th>
                                <th className="p-2 text-sm font-bold text-center" style={{ width: '15%' }}>المخزن</th>
                                <th className="p-2 text-sm font-bold text-center" style={{ width: '8%' }}>المتاح</th>
                                <th className="p-2 text-sm font-bold text-center" style={{ width: '10%' }}>الكمية</th>
                                <th className="p-2 text-sm font-bold text-center" style={{ width: '12%' }}>السعر</th>
                                <th className="p-2 text-sm font-bold text-center" style={{ width: '12%' }}>الاجمالي</th>
                                <th className="p-2 text-sm font-bold text-center" style={{ width: '8%' }}>حذف</th>
                            </tr>
                        </thead>
                        <tbody>
                            {newInvoice.items.map(invItem => {
                                const itemData = items.find(i => i.id === invItem.itemId);
                                const warehouseName = itemData ? warehouses.find(w => w.id === itemData.warehouseId)?.name : '';
                                return itemData ? (
                                <tr key={invItem.itemId} className="border-b hover:bg-emerald-50/30 transition-colors text-sm font-bold">
                                    <td className="p-2 text-center text-xs font-mono dark:text-gray-300">{itemData.barcode}</td>
                                    <td className="p-2 text-right dark:text-gray-200">{itemData.name}</td>
                                    <td className="p-2 text-center">
                                        <select 
                                            value={invItem.warehouseId || itemData.warehouseId} 
                                            onChange={(e) => handleItemChange(invItem.itemId, 'warehouseId', +e.target.value)}
                                            className="w-full text-center border-2 border-gray-200 rounded font-bold dark:bg-gray-700 dark:text-white text-xs"
                                        >
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 text-center text-blue-600">{getAvailableStock(itemData.id)}</td>
                                    <td className="p-2 text-center"><input type="number" min="1" value={invItem.quantity} onChange={(e) => handleItemChange(invItem.itemId, 'quantity', +e.target.value)} className="w-full text-center border-2 border-gray-200 rounded font-bold dark:bg-gray-700 dark:text-white" /></td>
                                    <td className="p-2 text-center"><input type="number" min="0" step="0.01" value={invItem.price} onChange={(e) => handleItemChange(invItem.itemId, 'price', +e.target.value)} className="w-full text-center border-2 border-gray-200 rounded font-bold dark:bg-gray-700 dark:text-white" /></td>
                                    <td className="p-2 text-center text-emerald-600"><FormattedNumber value={invItem.quantity * invItem.price} /></td>
                                    <td className="p-2 text-center"><button onClick={() => handleRemoveItem(invItem.itemId)} className="p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"><DeleteIcon /></button></td>
                                </tr> ) : null
                            })}
                        </tbody>
                    </table>
                 </div>
            </div>

            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4 items-end font-bold text-sm">
                    <div className="lg:col-span-1"><label className={labelClass}>المجموع</label><input type="text" value={formatNumber(subtotal)} className={inputClass} disabled /></div>
                    <div className="lg:col-span-1"><label className={labelClass}>الخصم</label><input type="number" min="0" value={newInvoice.discount} onChange={(e) => setNewInvoice(p => ({...p, discount: +e.target.value}))} className={inputClass} /></div>
                    <div className="lg:col-span-1"><label className={labelClass}>صافي القيمة</label><input type="text" value={formatNumber(total)} className={inputClass} disabled /></div>
                    <div className="lg:col-span-5 flex flex-row gap-2 w-full h-11">
                        <button onClick={resetForm} className="flex-1 bg-gray-500 text-white font-bold h-full rounded-lg shadow hover:bg-gray-600 transition-all text-sm">فاتورة جديدة</button>
                        <button onClick={handleHoldInvoice} className="flex-1 bg-orange-500 text-white font-bold h-full rounded-lg shadow hover:bg-orange-600 flex items-center justify-center transition-all text-sm"><ArchiveIcon className="h-5 w-5 mr-1" /><span>{isEditing ? 'إعادة للتعليق' : 'تعليق'}</span></button>
                        <button onClick={() => handleSaveInvoice(false)} className="flex-1 bg-emerald-600 text-white font-bold h-full rounded-lg shadow-lg hover:bg-emerald-700 transition-all text-sm">{isEditing ? 'تحديث' : 'حفظ'}</button>
                        {!isEditing && <button onClick={() => handleSaveInvoice(true)} className="flex-1 bg-blue-600 text-white font-bold h-full rounded-lg shadow-lg hover:bg-blue-700 transition-all text-sm">حفظ وطباعة</button>}
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-4 cursor-pointer select-none" onClick={() => setIsLogVisible(!isLogVisible)}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">سجل فواتير المشتريات</h2>
                        <ChevronDownIcon className={`w-6 h-6 transition-transform duration-300 ${isLogVisible ? 'rotate-180' : ''}`} />
                    </div>
                    {isLogVisible && (
                        <div className="flex items-center gap-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2 px-4 rounded-lg text-center shadow-sm">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي الفواتير</p>
                                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{filteredLog.length}</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 px-4 rounded-lg text-center shadow-sm">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي القيمة</p>
                                <p className="text-xl font-black text-blue-700 dark:text-blue-300"><FormattedNumber value={totalInLog} /></p>
                            </div>
                        </div>
                    )}
                </div>
                {isLogVisible && (
                    <div className="animate-fade-in-up mt-4 font-bold text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6 bg-black/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">رقم الفاتورة</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.id} onChange={e => setLogFilters({...logFilters, id: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">فاتورة المورد</label><input type="text" placeholder="رقم فاتورة المورد..." className={filterInputClass} value={logFilters.supplierInvoiceNumber} onChange={e => setLogFilters({...logFilters, supplierInvoiceNumber: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">اسم المورد</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.supplierName} onChange={e => setLogFilters({...logFilters, supplierName: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الصنف/الباركود</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.itemSearch} onChange={e => setLogFilters({...logFilters, itemSearch: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">النوع</label><select className={filterInputClass} value={logFilters.type} onChange={e => setLogFilters({...logFilters, type: e.target.value as any})}><option value="all">الكل</option><option value="cash">نقدي</option><option value="credit">آجل</option></select></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المبلغ</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.total} onChange={e => setLogFilters({...logFilters, total: e.target.value})} /></div>
                            <div className="flex items-end">
                                <button onClick={() => setLogFilters({id:'', supplierInvoiceNumber: '', supplierName:'', itemSearch:'', type:'all', total:''})} className="w-full h-9 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded hover:bg-gray-300 transition-colors flex items-center justify-center font-bold text-xs" title="تفريغ البحث">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    تفريغ
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto relative max-h-[60vh] border border-gray-200 rounded-lg shadow-inner dark:border-gray-700">
                            <table className="w-full text-right border-collapse">
                                <thead className="sticky top-0 z-20 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    <tr className="shadow-sm">
                                        <th className="p-3 border-b-2 text-sm font-bold">رقم الفاتورة</th><th className="p-3 border-b-2 text-sm font-bold">فاتورة المورد</th><th className="p-3 border-b-2 text-sm font-bold">التاريخ</th><th className="p-3 border-b-2 text-sm font-bold">المورد</th><th className="p-3 border-b-2 text-sm font-bold">نوع الفاتورة</th><th className="p-3 border-b-2 text-sm font-bold">المبلغ</th><th className="p-3 border-b-2 text-sm font-bold text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLog.map(inv => {
                                        const itemsTotal = inv.items.reduce((s,i)=>s+i.price*i.quantity,0);
                                        const invTotal = (itemsTotal - inv.discount) * (1 + inv.tax / 100);
                                        return (
                                            <tr key={inv.id} className="border-b hover:bg-emerald-50 transition-colors dark:hover:bg-emerald-900/10 text-sm font-bold">
                                                <td className="p-3 text-emerald-700 dark:text-green-400">{inv.id}</td><td className="p-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{inv.supplierInvoiceNumber || '-'}</td><td className="p-3 text-gray-700 dark:text-gray-300">{formatDateForDisplay(inv.date)}</td><td className="p-3 text-gray-800 dark:text-gray-200">{suppliers.find(s=>s.id===inv.supplierId)?.name || 'غير معروف'}</td>
                                                <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-black ${inv.type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{inv.type === 'cash' ? 'نقدي' : 'آجل'}</span></td>
                                                <td className="p-3 font-black text-gray-900 dark:text-white"><FormattedNumber value={invTotal} /></td>
                                                <td className="p-3"><div className="flex justify-center gap-2"><button onClick={() => handleEdit(inv)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="تعديل"><EditIcon /></button><button onClick={() => handlePrint(inv)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="طباعة"><PrintIcon /></button><button onClick={() => {
                                                    const supplier = suppliers.find(s => s.id === inv.supplierId);
                                                    const phoneNumber = formatPhoneNumberForWhatsApp(supplier?.phone || '');
                                                    const itemsTotal = inv.items.reduce((s,i)=>s+i.price*i.quantity,0);
                                                    const invTotal = (itemsTotal - inv.discount) * (1 + inv.tax / 100);
                                                    const text = `فاتورة مشتريات رقم: ${inv.id}%0Aالتاريخ: ${formatDateForDisplay(inv.date)}%0Aالمورد: ${supplier?.name || ''}%0Aالإجمالي: ${formatNumber(invTotal)}${defaultValues.whatsappFooter ? '%0A' + encodeURIComponent(defaultValues.whatsappFooter) : ''}`;
                                                    window.open(phoneNumber ? `https://wa.me/${phoneNumber}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
                                                }} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="واتساب"><WhatsAppIcon /></button>{canDelete && <button onClick={() => {setInvoiceToDelete(inv); setIsDeleteModalOpen(true);}} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف"><DeleteIcon /></button>}</div></td>
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
});

export default PurchaseInvoiceManagement;
