
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal, ConfirmationModal, PlusCircleIcon, DeleteIcon, EditIcon, PrintIcon, PdfIcon, ViewIcon, WhatsAppIcon, FormattedNumber, ChevronDownIcon, ArchiveIcon, WarningIcon, SwitchHorizontalIcon, BarcodeIcon, DownloadIcon } from './Shared';
import type { SalesReturn, SalesReturnItem, SalesInvoice, Item, Customer, SalesRepresentative, Warehouse, Unit, CompanyData, NotificationType, CustomerReceipt, MgmtUser, DefaultValues, DocToView, PurchaseInvoice, PurchaseReturn, Expense, TreasuryTransfer, Treasury, SupplierPayment } from '../types';
import QuickAddItemModal from './QuickAddItemModal';
import BarcodePrintModal, { BarcodeItem } from './BarcodePrintModal';
import { formatNumber, formatNumberWithSmallerDecimals, searchMatch, formatDateForDisplay, formatPhoneNumberForWhatsApp } from '../utils';
import { useDateInput } from '../hooks/useDateInput';
import { exportToExcel } from '../services/excel';

interface SalesReturnManagementProps {
    salesReturns: SalesReturn[];
    setSalesReturns: React.Dispatch<React.SetStateAction<SalesReturn[]>>;
    salesInvoices: SalesInvoice[];
    customerReceipts: CustomerReceipt[];
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    customers: Customer[];
    salesRepresentatives: SalesRepresentative[];
    warehouses: Warehouse[];
    units: Unit[];
    companyData: CompanyData;
    showNotification: (type: NotificationType) => void;
    docToView: DocToView;
    onClearDocToView: () => void;
    currentUser: MgmtUser;
    defaultValues: DefaultValues;
    draft: SalesReturn | null;
    setDraft: React.Dispatch<React.SetStateAction<SalesReturn | null>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    expenses: Expense[];
    treasuryTransfers: TreasuryTransfer[];
    treasuries: Treasury[];
    supplierPayments: SupplierPayment[];
    setSupplierPayments: React.Dispatch<React.SetStateAction<SupplierPayment[]>>;
}

const SalesReturnManagement: React.FC<SalesReturnManagementProps> = ({ 
    salesReturns, setSalesReturns, salesInvoices, customerReceipts, items, setItems, customers,
    salesRepresentatives, warehouses, units, companyData, showNotification, docToView, onClearDocToView, currentUser, defaultValues,
    draft, setDraft, isEditing, setIsEditing, purchaseInvoices, purchaseReturns,
    expenses, treasuryTransfers, treasuries, supplierPayments, setSupplierPayments
}) => {
    
    const getNextReturnId = () => {
        if (salesReturns.length === 0) return 1;
        const numericIds = salesReturns.map(inv => typeof inv.id === 'number' ? inv.id : 0);
        return Math.max(...numericIds) + 1;
    };

    const initialReturnState: SalesReturn = useMemo(() => ({
        id: getNextReturnId(),
        date: new Date().toISOString().split('T')[0],
        customerId: 0,
        salesRepId: defaultValues.defaultSalesRepId,
        warehouseId: defaultValues.defaultWarehouseId,
        items: [],
        discount: 0,
        tax: 0,
        paidAmount: 0,
        notes: '',
        type: defaultValues.defaultPaymentMethodInvoices,
        permissionNumber: '',
    }), [salesReturns.length, defaultValues]);

    const newReturn = draft || initialReturnState;
    const setNewReturn = (action: any) => {
        if (typeof action === 'function') setDraft(prev => action(prev || initialReturnState));
        else setDraft(action);
    };

    const [isViewing, setIsViewing] = useState(false);
    const [customerBalance, setCustomerBalance] = useState<number | null>(null);
    const [currentItemSelection, setCurrentItemSelection] = useState<{itemId: number, quantity: number, price: number, warehouseId: number}>({ itemId: 0, quantity: 1, price: 0, warehouseId: 0 });
    
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [isCustomerSuggestionsOpen, setIsCustomerSuggestionsOpen] = useState(false);
    const [salesRepSearchQuery, setSalesRepSearchQuery] = useState('');
    const [isSalesRepSuggestionsOpen, setIsSalesRepSuggestionsOpen] = useState(false);
    const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
    const [isWarehouseSuggestionsOpen, setIsWarehouseSuggestionsOpen] = useState(false);

    const [isLogVisible, setIsLogVisible] = useState(false);

    const closeAllDropdowns = () => {
        setIsItemSuggestionsOpen(false);
        setIsCustomerSuggestionsOpen(false);
        setIsSalesRepSuggestionsOpen(false);
        setIsWarehouseSuggestionsOpen(false);
    };

    const openDropdown = (type: 'item' | 'customer' | 'salesRep' | 'warehouse') => {
        closeAllDropdowns();
        if (type === 'item') setIsItemSuggestionsOpen(true);
        if (type === 'customer') setIsCustomerSuggestionsOpen(true);
        if (type === 'salesRep') setIsSalesRepSuggestionsOpen(true);
        if (type === 'warehouse') setIsWarehouseSuggestionsOpen(true);
    };

    const handleWarehouseSelect = (warehouse: Warehouse) => {
        setNewReturn((p: any) => ({ ...p, warehouseId: warehouse.id, items: [] })); 
        setWarehouseSearchQuery(warehouse.name);
        setIsWarehouseSuggestionsOpen(false);
    };

    const [logFilters, setLogFilters] = useState({
        id: '',
        permissionNumber: '',
        date: '',
        customerName: '',
        salesRepName: '',
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
    const [returnToDelete, setReturnToDelete] = useState<SalesReturn | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;
    const [isQuickAddItemModalOpen, setIsQuickAddItemModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [itemsToPrint, setItemsToPrint] = useState<BarcodeItem[]>([]);

    const [fetchInvoiceId, setFetchInvoiceId] = useState('');
    const [fetchPermissionNumber, setFetchPermissionNumber] = useState('');
    const [fetchDate, setFetchDate] = useState('');
    const [fetchCustomerName, setFetchCustomerName] = useState('');
    const [fetchItemSearch, setFetchItemSearch] = useState('');

    const dateInputProps = useDateInput(newReturn.date, (d) => setNewReturn((prev: any) => ({...prev, date: d})));
    const canEdit = currentUser.permissions.includes('salesReturn_edit');
    const canDelete = currentUser.permissions.includes('salesReturn_delete');
    const canEditDate = currentUser.permissions.includes('salesReturn_editDate');

    const getAvailableStock = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return 0;

        let available = item.openingBalance;
        
        if (isEditing) {
            const originalReturn = salesReturns.find(r => r.id === newReturn.id);
            if (originalReturn) {
                const originalItem = originalReturn.items.find(i => i.itemId === itemId);
                if (originalItem) available -= originalItem.quantity;
            }
        }
        return available;
    };

    useEffect(() => { if (docToView && docToView.view === 'salesReturn') { const ret = salesReturns.find(r => r.id === docToView.docId); if (ret) handleEdit(ret, true); onClearDocToView(); } }, [docToView, salesReturns, onClearDocToView]);

    useEffect(() => {
        if (newReturn.id && newReturn.customerId) { const c = customers.find(x => x.id === newReturn.customerId); if (c) setCustomerSearchQuery(c.name); } else if (!isCustomerSuggestionsOpen) setCustomerSearchQuery('');
        if (newReturn.salesRepId) { const r = salesRepresentatives.find(r => r.id === newReturn.salesRepId); if (r) setSalesRepSearchQuery(r.name); } else if (!isSalesRepSuggestionsOpen) setSalesRepSearchQuery('');
        if (newReturn.warehouseId) { const w = warehouses.find(x => x.id === newReturn.warehouseId); if (w) setWarehouseSearchQuery(w.name); } else if (!isWarehouseSuggestionsOpen) setWarehouseSearchQuery('');
    }, [newReturn.id, newReturn.customerId, newReturn.salesRepId, newReturn.warehouseId, customers, salesRepresentatives, warehouses]);

    useEffect(() => {
        if (newReturn.customerId) {
            const customer = customers.find(c => c.id === newReturn.customerId);
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
                    if (rec.customerId === customer.id && rec.id !== newReturn.id) balance -= rec.amount;
                });
                setCustomerBalance(balance);
            }
        } else setCustomerBalance(null);
    }, [newReturn.customerId, customers, salesInvoices, salesReturns, customerReceipts, newReturn.id]);

    const calculateBalanceAtPoint = (customerId: number, date: string, id: number | string) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return 0;
        let balance = customer.openingBalance;
        salesInvoices.forEach(inv => {
            if (inv.customerId === customerId && (inv.date < date || (inv.date === date && String(inv.id) < String(id)))) {
                const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                balance += (total - (inv.paidAmount || 0));
            }
        });
        salesReturns.forEach(ret => {
            if (ret.customerId === customerId && (ret.date < date || (ret.date === date && String(ret.id) < String(id)))) {
                const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                balance -= (total - (ret.paidAmount || 0));
            }
        });
        customerReceipts.forEach(rec => {
            if (rec.customerId === customerId && (rec.date < date || (rec.date === date && String(rec.id) < String(id)))) {
                balance -= rec.amount;
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
        let results = unselectedItems;
        if (itemSearchQuery) {
            const trimmedQuery = itemSearchQuery.trim();
            results = unselectedItems.filter(item => item.barcode === trimmedQuery || searchMatch(item.name, itemSearchQuery));
        }
        return results.sort((a, b) => a.name.localeCompare(b.name, 'ar')).slice(0, 20);
    }, [itemSearchQuery, items, newReturn.items, newReturn.warehouseId]);

    const suggestedCustomers = useMemo(() => {
        let results = customers;
        if (customerSearchQuery) {
            results = customers.filter(customer => searchMatch(`${customer.name} ${customer.phone || ''}`, customerSearchQuery));
        }
        return results.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [customerSearchQuery, customers]);

    const suggestedSalesReps = useMemo(() => {
        let results = salesRepresentatives;
        if (salesRepSearchQuery) {
            results = salesRepresentatives.filter(rep => searchMatch(`${rep.name} ${rep.code}`, salesRepSearchQuery));
        }
        return results.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [salesRepSearchQuery, salesRepresentatives]);

    const suggestedWarehouses = useMemo(() => {
        if (!warehouseSearchQuery) return warehouses.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        return warehouses.filter(w => searchMatch(w.name, warehouseSearchQuery)).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [warehouseSearchQuery, warehouses]);

    const handleCustomerSelect = (customer: Customer) => {
        setNewReturn(p => ({ ...p, customerId: customer.id }));
        setCustomerSearchQuery(customer.name);
        setIsCustomerSuggestionsOpen(false);
    };

    const handleSalesRepSelect = (rep: SalesRepresentative) => {
        setNewReturn(p => ({ ...p, salesRepId: rep.id }));
        setSalesRepSearchQuery(rep.name);
        setIsSalesRepSuggestionsOpen(false);
    };

    const handleItemSelect = (item: Item) => {
        setItemSearchQuery(item.name);
        setCurrentItemSelection({ quantity: 1, itemId: item.id, price: item.sellPrice, warehouseId: item.warehouseId || newReturn.warehouseId });
        setIsItemSuggestionsOpen(false);
    };

    const handleAddItemClick = () => {
        if (!currentItemSelection.itemId) { alert("يرجى اختيار صنف أولاً"); return; }
        const itemToAdd = items.find(i => i.id === currentItemSelection.itemId);
        if (itemToAdd) {
            if (newReturn.items.some(i => i.itemId === itemToAdd.id)) { alert("الصنف مضاف بالفعل"); return; }
            const newItem: SalesReturnItem = { 
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
        if (!newReturn.customerId || !newReturn.warehouseId || newReturn.items.length === 0) { alert("بيانات ناقصة (العميل/المخزن/الأصناف)."); return; }
        try {
            let updatedItems = [...items];
            const originalReturn = isEditing ? salesReturns.find(inv => inv.id === newReturn.id) : null;
            if (originalReturn) { originalReturn.items.forEach(oldItem => { const idx = updatedItems.findIndex(i => i.id === oldItem.itemId); if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance - oldItem.quantity }; }); }
            newReturn.items.forEach(newItem => { const idx = updatedItems.findIndex(i => i.id === newItem.itemId); if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance + newItem.quantity }; });
            setItems(updatedItems);
            
            const returnToSave = { ...newReturn };
            if (returnToSave.type === 'cash') {
                returnToSave.paidAmount = total;
            } else {
                returnToSave.paidAmount = 0;
            }

            if (isEditing) { 
                const updatedReturn = { ...returnToSave, lastModifiedBy: currentUser.username, lastModifiedAt: new Date().toISOString() }; 
                setSalesReturns(prev => prev.map(inv => inv.id === returnToSave.id ? updatedReturn : inv)); 
                showNotification('edit'); 
                if (printAfterSave) handlePrint(updatedReturn);
                window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل مرتجع مبيعات رقم ${updatedReturn.id} للعميل ${customers.find(c => c.id === updatedReturn.customerId)?.name || ''}` }));
            } else { 
                const createdReturn = { ...returnToSave, createdBy: currentUser.username, createdAt: new Date().toISOString() }; 
                setSalesReturns(prev => [...prev, createdReturn]); 
                showNotification('add'); 
                if (printAfterSave) handlePrint(createdReturn);
                window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإنشاء مرتجع مبيعات رقم ${createdReturn.id} للعميل ${customers.find(c => c.id === createdReturn.customerId)?.name || ''}` }));
            }
            resetForm();
        } catch (error) { alert("حدث خطأ أثناء الحفظ."); }
    };

    const handleEdit = (ret: SalesReturn, viewOnly: boolean = false) => { setIsEditing(true); setIsViewing(viewOnly); setDraft(ret); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const resetRestoreFilters = () => { setFetchInvoiceId(''); setFetchPermissionNumber(''); setFetchDate(''); setFetchCustomerName(''); setFetchItemSearch(''); };
    const resetForm = () => { setIsEditing(false); setIsViewing(false); setDraft(null); setItemSearchQuery(''); setCustomerSearchQuery(''); setSalesRepSearchQuery(''); setWarehouseSearchQuery(''); setCustomerBalance(null); closeAllDropdowns(); resetRestoreFilters(); };
    
    const handlePrint = (ret: SalesReturn) => {
        const customer = customers.find(c => c.id === ret.customerId);
        const balanceBefore = calculateBalanceAtPoint(ret.customerId, ret.date, ret.id);
        const invNet = (ret.items.reduce((s, i) => s + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
        const balanceAfter = balanceBefore - (invNet - (ret.paidAmount || 0));

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const itemsRows = ret.items.map((it, idx) => {
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
                <title>مرتجع مبيعات رقم ${ret.id}</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.4; }
                    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    .logo-section { width: 33%; text-align: left; }
                    .logo-section img { max-width: 140px; max-height: 90px; object-fit: contain; margin-bottom: 5px; }
                    .company-center { width: 33%; text-align: center; }
                    .company-center h1 { margin: 0; font-size: 1.6rem; font-weight: 900; color: #dc2626; }
                    .invoice-badge { display: inline-block; border: 2px solid #dc2626; color: #dc2626; padding: 4px 15px; border-radius: 6px; margin-top: 8px; font-weight: 900; font-size: 1.1rem; }
                    .doc-info { width: 33%; text-align: right; }
                    .tax-info { font-size: 9pt; font-weight: bold; color: #475569; line-height: 1.2; }
                    .details-block { margin: 15px 0; font-size: 12pt; border-right: 4px solid #dc2626; padding-right: 12px; }
                    .details-block p { margin: 4px 0; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #dc2626; }
                    th { background: #dc2626; color: white; padding: 8px; text-align: center; font-size: 12pt; border: 1px solid #dc2626; }
                    td { padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11pt; }
                    .item-row:nth-child(even) { background-color: #fef2f2; }
                    @media print {
                        .item-row:nth-child(even) { background-color: transparent !important; }
                        th { background: #dc2626 !important; color: white !important; -webkit-print-color-adjust: exact; }
                        .invoice-badge { border-color: #dc2626 !important; color: #dc2626 !important; -webkit-print-color-adjust: exact; }
                        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                    .summary-section { display: flex; justify-content: flex-end; margin-top: 15px; }
                    .summary-box { width: 280px; border: 1px solid #dc2626; border-radius: 8px; padding: 10px; background: #fef2f2; }
                    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #ddd; font-weight: bold; font-size: 11pt; }
                    .summary-row.total { border-bottom: none; border-top: 2px solid #dc2626; margin-top: 5px; padding-top: 8px; color: #dc2626; font-size: 12pt; }
                    .footer-block { margin-top: 40px; border-top: 2px solid #dc2626; padding-top: 15px; display: flex; justify-content: space-between; font-size: 10pt; font-weight: bold; }
                    .thanks { text-align: center; margin-top: 20px; font-weight: 900; color: #475569; font-size: 11pt; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="header-top">
                    <div class="doc-info"><p class="heavy">التاريخ: ${formatDateForDisplay(ret.date)}</p><p class="heavy">رقم المرتجع: ${ret.id}</p></div>
                    <div class="company-center"><h1>${companyData.name}</h1><div class="invoice-badge">مرتجع مبيعات</div></div>
                    <div class="logo-section">${companyData.logo ? `<img src="${companyData.logo}" />` : ''}<div class="tax-info">${companyData.tr ? `<div>رقم التسجيل: ${companyData.tr}</div>` : ''}${companyData.cr ? `<div>سجل تجاري: ${companyData.cr}</div>` : ''}</div></div>
                </div>
                <div class="details-block"><p>العميل: ${customer?.name || 'عميل نقدي'}</p><p>الرصيد قبل المرتجع: <span style="color: #dc2626;">${balanceBefore.toFixed(2)}</span></p></div>
                <table>
                    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800"><tr><th style="width: 40px;">م</th><th>الصنف</th><th style="width: 70px;">الكمية</th><th style="width: 100px;">السعر</th><th style="width: 120px;">إجمالي</th></tr></thead>
                    <tbody>${itemsRows}</tbody>
                    <tr style="background: #fef2f2; font-weight: 900;"><td colspan="2" style="text-align: right;">إجمالي الأصناف: ${ret.items.length} | القطع: ${ret.items.reduce((s, i) => s + i.quantity, 0)}</td><td></td><td>-</td><td>${ret.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</td></tr>
                </table>
                <div class="summary-section">
                    <div class="summary-box">
                        <div class="summary-row"><span>إجمالي المرتجع:</span><span>${ret.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span></div>
                        <div class="summary-row"><span>الخصم المسترد:</span><span style="color: #dc2626;">-${ret.discount.toFixed(2)}</span></div>
                        <div class="summary-row total"><span class="heavy">الصافي:</span><span class="heavy">${invNet.toFixed(2)}</span></div>
                        <div class="summary-row" style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 6px;"><span>الرصيد بعد المرتجع:</span><span style="color: #1e3a8a;">${balanceAfter.toFixed(2)}</span></div>
                    </div>
                </div>
                <div class="footer-block"><div style="text-align: right; width: 50%;">العنوان: ${companyData.address}</div><div style="text-align: left; width: 50%;">تليفون: ${companyData.phone1} ${companyData.phone2 ? ' - ' + companyData.phone2 : ''}</div></div>
                <div class="thanks">${defaultValues.invoiceFooter || 'شكراً لتعاملكم معنا'}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDeleteReturn = (ret: SalesReturn) => { setReturnToDelete(ret); setIsDeleteModalOpen(true); };

    const performDeleteReturn = () => {
        if (returnToDelete) {
            let updatedItems = [...items];
            returnToDelete.items.forEach(oldItem => { const idx = updatedItems.findIndex(i => i.id === oldItem.itemId); if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance - oldItem.quantity }; });
            setItems(updatedItems);
            setSalesReturns(prev => prev.filter(r => r.id !== returnToDelete.id));
            showNotification('delete');
        }
        setIsDeleteModalOpen(false);
        setReturnToDelete(null);
    };

    const handlePrintBarcodes = (ret: SalesReturn) => {
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
        return salesReturns.filter(ret => {
            const customer = customers.find(c => c.id === ret.customerId);
            const salesRep = salesRepresentatives.find(r => r.id === ret.salesRepId);
            const retTotal = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
            const matchesItem = !logFilters.itemSearch || ret.items.some(it => {
                const itemData = items.find(i => i.id === it.itemId);
                return searchMatch(`${itemData?.name} ${itemData?.barcode}`, logFilters.itemSearch);
            });
            return (
                (!logFilters.id || ret.id.toString().includes(logFilters.id)) &&
                (!logFilters.permissionNumber || (ret.permissionNumber || '').includes(logFilters.permissionNumber)) &&
                (!logFilters.date || ret.date.includes(logFilters.date)) &&
                (!logFilters.customerName || searchMatch(customer?.name || '', logFilters.customerName)) &&
                (!logFilters.salesRepName || searchMatch(salesRep?.name || '', logFilters.salesRepName)) &&
                matchesItem &&
                (logFilters.type === 'all' || ret.type === logFilters.type) &&
                (!logFilters.total || retTotal.toString().includes(logFilters.total))
            );
        }).sort((a, b) => (b.id as number) - (a.id as number));
    }, [salesReturns, logFilters, customers, salesRepresentatives, items]);

    useEffect(() => {
        setCurrentPage(1);
    }, [logFilters]);

    const paginatedLog = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLog.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLog, currentPage]);

    const totalPages = Math.ceil(filteredLog.length / itemsPerPage);

    const totalInLog = useMemo(() => filteredLog.reduce((sum, ret) => sum + (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100), 0), [filteredLog]);

    const handleExportExcel = () => {
        const dataToExport = filteredLog.map(ret => {
            const customer = customers.find(c => c.id === ret.customerId);
            const salesRep = salesRepresentatives.find(r => r.id === ret.salesRepId);
            const retTotal = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
            
            return {
                'رقم المرتجع': ret.id,
                'رقم الإذن': ret.permissionNumber || '',
                'التاريخ': ret.date,
                'العميل': customer?.name || 'غير معروف',
                'المندوب': salesRep?.name || 'غير معروف',
                'النوع': ret.type === 'cash' ? 'نقدي' : 'آجل',
                'الإجمالي': retTotal,
                'ملاحظات': ret.notes || ''
            };
        });
        exportToExcel(dataToExport, 'مرتجعات_المبيعات');
    };

    const exportSingleReturn = (ret: SalesReturn) => {
        const customer = customers.find(c => c.id === ret.customerId);
        const retTotal = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
        
        const data = ret.items.map(item => {
            const itemData = items.find(i => i.id === item.itemId);
            const warehouse = warehouses.find(w => w.id === (item.warehouseId !== undefined ? item.warehouseId : ret.warehouseId));
            return {
                'رقم المرتجع': ret.id,
                'التاريخ': ret.date,
                'العميل': customer?.name || 'غير معروف',
                'الباركود': itemData?.barcode || '',
                'الصنف': itemData?.name || 'غير معروف',
                'المخزن': warehouse?.name || 'غير معروف',
                'الكمية': item.quantity,
                'السعر': item.price,
                'الإجمالي': item.price * item.quantity
            };
        });

        // Add total row
        data.push({
            'رقم المرتجع': '',
            'التاريخ': '',
            'العميل': '',
            'الباركود': '',
            'الصنف': 'إجمالي قيمة المرتجع',
            'المخزن': '',
            'الكمية': 0,
            'السعر': 0,
            'الإجمالي': retTotal
        });

        exportToExcel(data, `مرتجع_مبيعات_${ret.id}`);
    };

    const modalInvoicesToSelect = useMemo(() => {
        return salesInvoices
            .filter(inv => {
                const customer = customers.find(c => c.id === inv.customerId);
                const matchesItem = !fetchItemSearch || inv.items.some(it => {
                    const itemData = items.find(i => i.id === it.itemId);
                    return searchMatch(`${itemData?.name} ${itemData?.barcode}`, fetchItemSearch);
                });
                return (
                    (!fetchInvoiceId || inv.id.toString().includes(fetchInvoiceId)) &&
                    (!fetchPermissionNumber || (inv.permissionNumber || '').includes(fetchPermissionNumber)) &&
                    (!fetchDate || inv.date.includes(fetchDate)) &&
                    (!fetchCustomerName || searchMatch(customer?.name || '', fetchCustomerName)) &&
                    matchesItem
                );
            })
            .slice().reverse().slice(0, 100);
    }, [salesInvoices, fetchInvoiceId, fetchPermissionNumber, fetchDate, fetchCustomerName, fetchItemSearch, customers, items]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const compactCardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-4 border border-white/40 dark:bg-gray-700/30 dark:border-white/20 w-full"; 
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-red-300 dark:border-red-700 rounded-lg focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-black dark:text-white font-bold text-base transition duration-300 disabled:opacity-70 font-bold";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-red-500 focus:outline-none dark:text-white";
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
            <QuickAddItemModal isOpen={isQuickAddItemModalOpen} onClose={() => setIsQuickAddItemModalOpen(false)} onItemAdded={(ni) => { setItems(p => [...p, ni]); handleItemSelect(ni); setIsQuickAddItemModalOpen(false); showNotification('add'); }} items={items} units={units} warehouses={warehouses} defaultWarehouseId={newReturn.warehouseId} defaultUnitId={defaultValues.defaultUnitId} currentUser={currentUser} />
            <BarcodePrintModal isOpen={isBarcodeModalOpen} onClose={() => setIsBarcodeModalOpen(false)} items={itemsToPrint} companyName={companyData.name} />
            <Modal title="استعادة بيانات من فاتورة مبيعات" show={isRestoreModalOpen} onClose={() => { setIsRestoreModalOpen(false); resetRestoreFilters(); }}>
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
                            <label className="block text-xs font-bold mb-1">اسم العميل</label>
                            <input type="text" value={fetchCustomerName} onChange={(e) => setFetchCustomerName(e.target.value)} className="h-9 w-full px-3 border-2 border-blue-200 rounded focus:border-blue-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="اسم العميل..." />
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
                                    <th className="p-3 border-b text-sm font-bold">العميل</th>
                                    <th className="p-3 border-b text-sm font-bold text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modalInvoicesToSelect.map((inv) => (
                                    <tr key={inv.id} className="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-3 border-b font-bold text-blue-700 dark:text-blue-400">{inv.id}</td>
                                        <td className="p-3 border-b font-mono text-xs">{inv.permissionNumber || '-'}</td>
                                        <td className="p-3 border-b text-sm">{formatDateForDisplay(inv.date)}</td>
                                        <td className="p-3 border-b font-bold text-gray-800 dark:text-gray-200">{customers.find(c => c.id === inv.customerId)?.name || 'غير معروف'}</td>
                                        <td className="p-3 border-b text-center">
                                            <button onClick={() => { 
                                                if (newReturn.items.length > 0 && !confirm('سيتم استبدال البيانات الحالية ببيانات الفاتورة. هل تريد الاستمرار؟')) return;
                                                setNewReturn(prev => ({ ...prev, customerId: inv.customerId, salesRepId: inv.salesRepId, warehouseId: inv.warehouseId, items: inv.items.map(i => ({ ...i })), tax: inv.tax, notes: `مرتجع من فاتورة رقم ${inv.id}` }));
                                                setIsRestoreModalOpen(false);
                                                resetRestoreFilters();
                                            }} className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">جلب البيانات</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                <div className={`${cardClass} lg:col-span-9 pb-10 relative z-30`}>
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-red-800 dark:text-red-300">{isViewing ? 'عرض مرتجع مبيعات' : isEditing ? `تعديل مرتجع مبيعات` : 'مرتجع مبيعات جديد'}</h1>
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
                                <label className={labelClass}>العميل</label>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <div className="relative flex-grow">
                                        <input type="text" value={customerSearchQuery} onChange={(e) => { setCustomerSearchQuery(e.target.value); openDropdown('customer'); }} onFocus={() => openDropdown('customer')} onBlur={() => {
                                            setTimeout(() => {
                                                if (isCustomerSuggestionsOpen && suggestedCustomers.length > 0 && customerSearchQuery) {
                                                    handleCustomerSelect(suggestedCustomers[0]);
                                                }
                                                setIsCustomerSuggestionsOpen(false);
                                            }, 250);
                                        }} className={inputClass} disabled={isViewing || (isEditing && !canEdit)} placeholder="بحث..." autoComplete="off" />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                    </div>
                                    {isCustomerSuggestionsOpen && <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-red-300 rounded mt-1 max-h-40 overflow-y-auto top-full shadow-2xl">{suggestedCustomers.slice(0, 50).map(c => <li key={c.id} onMouseDown={() => { handleCustomerSelect(c); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white">{c.name}</li>)}</ul>}
                                </div>
                                 {customerBalance !== null && (
                                     <div className="mt-2 text-xl font-black whitespace-nowrap z-0">
                                         <span className="text-gray-700 dark:text-gray-400">الرصيد: </span>
                                         <span className={customerBalance >= 0 ? 'text-red-600' : 'text-green-600'}><FormattedNumber value={Math.abs(customerBalance)} /></span>
                                         <span className="text-xs text-gray-500 mr-1">({customerBalance >= 0 ? 'عليه' : 'له'})</span>
                                     </div>
                                 )}
                             </div>
                             <div className="lg:col-span-2"><label className={labelClass}>رقم الإذن</label><input type="text" value={newReturn.permissionNumber || ''} onChange={(e) => setNewReturn((p: any) => ({...p, permissionNumber: e.target.value}))} className={inputClass} disabled={isViewing || (isEditing && !canEdit)} /></div>
                             <div className="lg:col-span-2 relative z-[90]">
                                <label className={labelClass}>المندوب</label>
                                <div className="relative">
                                    <input type="text" value={salesRepSearchQuery} onChange={(e) => { setSalesRepSearchQuery(e.target.value); openDropdown('salesRep'); }} onFocus={() => openDropdown('salesRep')} onBlur={() => {
                                        setTimeout(() => {
                                            if (isSalesRepSuggestionsOpen && suggestedSalesReps.length > 0 && salesRepSearchQuery) {
                                                handleSalesRepSelect(suggestedSalesReps[0]);
                                            }
                                            setIsSalesRepSuggestionsOpen(false);
                                        }, 250);
                                    }} className={inputClass} disabled={isViewing || (isEditing && !canEdit)} autoComplete="off"/>
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                </div>
                                {isSalesRepSuggestionsOpen && <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-red-300 rounded mt-1 max-h-40 overflow-y-auto shadow-2xl">{suggestedSalesReps.slice(0, 50).map(r => <li key={r.id} onMouseDown={() => { handleSalesRepSelect(r); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white">{r.name}</li>)}</ul>}
                             </div>
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
                                                <li key={item.id} onMouseDown={() => handleItemSelect(item)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between font-bold border-b dark:border-gray-700 last:border-0 dark:text-white">
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
                        <h2 className="text-xl font-bold text-red-800 dark:text-red-300">سجل مرتجعات المبيعات</h2>
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
                            <button onClick={(e) => { e.stopPropagation(); handleExportExcel(); }} className="bg-blue-600 text-white p-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center" title="تصدير إلى إكسيل">
                                <DownloadIcon className="w-6 h-6 m-0 text-white" />
                            </button>
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
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">اسم العميل</label>
                                <input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.customerName} onChange={e => setLogFilters({...logFilters, customerName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المندوب</label>
                                <input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.salesRepName} onChange={e => setLogFilters({...logFilters, salesRepName: e.target.value})} />
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
                            <div className="flex items-end">
                                <button 
                                    onClick={() => setLogFilters({id:'', permissionNumber:'', date:'', customerName:'', salesRepName:'', itemSearch:'', type:'all', total:''})}
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
                                        <th className="p-3 border-b-2 text-sm font-bold">العميل</th>
                                        <th className="p-3 border-b-2 text-sm font-bold">نوع المرتجع</th>
                                        <th className="p-3 border-b-2 text-sm font-bold">المبلغ</th>
                                        <th className="p-3 border-b-2 text-sm font-bold text-center">تصدير</th>
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
                                                <td className="p-3 font-bold dark:text-gray-200">{customers.find(c=>c.id===ret.customerId)?.name || 'غير معروف'}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-black ${ret.type === 'cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-green-300'}`}>
                                                        {ret.type === 'cash' ? 'نقدي' : 'آجل'}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-black dark:text-white"><FormattedNumber value={retTotal} /></td>
                                                <td className="p-3 text-center"><button onClick={() => exportSingleReturn(ret)} className="p-1 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="تصدير إكسيل"><DownloadIcon className="w-5 h-5"/></button></td>
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

export default SalesReturnManagement;
