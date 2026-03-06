
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal, ConfirmationModal, PlusCircleIcon, DeleteIcon, EditIcon, PrintIcon, PdfIcon, ViewIcon, WhatsAppIcon, FormattedNumber, ChevronDownIcon, ArchiveIcon, WarningIcon, SwitchHorizontalIcon, ShoppingCartIcon } from './Shared';
import type { SalesInvoice, SalesInvoiceItem, Item, Customer, SalesRepresentative, Warehouse, Unit, CompanyData, NotificationType, SalesReturn, CustomerReceipt, MgmtUser, DefaultValues, DocToView, PurchaseInvoice, PurchaseReturn } from '../types';
import QuickAddItemModal from './QuickAddItemModal';
import QuickAddContactModal from './QuickAddContactModal';
import { formatNumber, formatNumberWithSmallerDecimals, searchMatch, formatDateForDisplay, formatPhoneNumberForWhatsApp } from '../utils';
import { useDateInput } from '../hooks/useDateInput';

interface SalesInvoiceManagementProps {
    salesInvoices: SalesInvoice[];
    setSalesInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
    heldInvoices: SalesInvoice[];
    setHeldInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
    salesReturns: SalesReturn[];
    customerReceipts: CustomerReceipt[];
    setCustomerReceipts: React.Dispatch<React.SetStateAction<CustomerReceipt[]>>;
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    salesRepresentatives: SalesRepresentative[];
    warehouses: Warehouse[];
    units: Unit[];
    companyData: CompanyData;
    showNotification: (type: NotificationType) => void;
    docToView: DocToView;
    onClearDocToView: () => void;
    currentUser: MgmtUser;
    defaultValues: DefaultValues;
    activeDiscounts: Record<number, number>;
    draft: SalesInvoice | null;
    setDraft: React.Dispatch<React.SetStateAction<SalesInvoice | null>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
}

const SalesInvoiceManagement: React.FC<SalesInvoiceManagementProps> = React.memo(({ 
    salesInvoices, setSalesInvoices, heldInvoices, setHeldInvoices, salesReturns, customerReceipts, setCustomerReceipts, items, setItems, customers, setCustomers,
    salesRepresentatives, warehouses, units, companyData, showNotification, docToView, onClearDocToView, currentUser, defaultValues, activeDiscounts,
    draft, setDraft, isEditing, setIsEditing, purchaseInvoices, purchaseReturns
}) => {
    
    const getNextInvoiceId = () => {
        const numericIds = salesInvoices.map(inv => typeof inv.id === 'number' ? inv.id : 0);
        if (numericIds.length === 0) return 1;
        return Math.max(...numericIds) + 1;
    };

    const getNextHeldId = () => {
        const numericParts = heldInvoices
            .map(inv => typeof inv.id === 'string' && inv.id.startsWith('PO-') ? parseInt(inv.id.split('-')[1]) : 0)
            .filter(n => !isNaN(n));
        const max = numericParts.length > 0 ? Math.max(...numericParts) : 0;
        return `PO-${String(max + 1).padStart(2, '0')}`;
    };

    const initialInvoiceState: SalesInvoice = useMemo(() => ({
        id: getNextInvoiceId(),
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
    }), [salesInvoices.length, defaultValues]);

    const newInvoice = draft || initialInvoiceState;
    const setNewInvoice = (action: any) => {
        if (typeof action === 'function') setDraft(prev => action(prev || initialInvoiceState));
        else setDraft(action);
    };

    const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number | null>(null);
    const [currentItemSelection, setCurrentItemSelection] = useState<{itemId: number, quantity: number, price: number}>({ itemId: 0, quantity: 1, price: 0 });
    
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [isCustomerSuggestionsOpen, setIsCustomerSuggestionsOpen] = useState(false);
    const [salesRepSearchQuery, setSalesRepSearchQuery] = useState('');
    const [isSalesRepSuggestionsOpen, setIsSalesRepSuggestionsOpen] = useState(false);

    const [priceWarningModalOpen, setPriceWarningModalOpen] = useState(false);
    const [itemsBelowCost, setItemsBelowCost] = useState<{name: string, buy: number, sell: number}[]>([]);
    const [pendingPrintAfterSave, setPendingPrintAfterSave] = useState(false);
    const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);

    const [heldFilters, setHeldFilters] = useState({
        date: '',
        customerName: '',
        salesRepName: '',
        total: '',
        itemSearch: ''
    });

    const closeAllDropdowns = () => {
        setIsItemSuggestionsOpen(false);
        setIsCustomerSuggestionsOpen(false);
        setIsSalesRepSuggestionsOpen(false);
    };

    const openDropdown = (type: 'item' | 'customer' | 'salesRep') => {
        closeAllDropdowns();
        if (type === 'item') setIsItemSuggestionsOpen(true);
        if (type === 'customer') setIsCustomerSuggestionsOpen(true);
        if (type === 'salesRep') setIsSalesRepSuggestionsOpen(true);
    };

    const quantityInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const itemSearchInputRef = useRef<HTMLInputElement>(null);
    const itemsTableRef = useRef<HTMLDivElement>(null);
    const prevItemsLength = useRef(0);

    useEffect(() => {
        if (itemsTableRef.current && newInvoice.items.length > prevItemsLength.current) {
            itemsTableRef.current.scrollTop = itemsTableRef.current.scrollHeight;
        }
        prevItemsLength.current = newInvoice.items.length;
    }, [newInvoice.items.length]);

    const [isLogVisible, setIsLogVisible] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<SalesInvoice | null>(null);
    const [isQuickAddItemModalOpen, setIsQuickAddItemModalOpen] = useState(false);
    const [isHeldInvoicesModalOpen, setIsHeldInvoicesModalOpen] = useState(false);

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

    const filteredHeldInvoices = useMemo(() => {
        const getNumericId = (id: string | number) => {
            if (typeof id === 'number') return id;
            const match = id.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        };

        return heldInvoices.filter(inv => {
            const customer = customers.find(c => c.id === inv.customerId);
            const salesRep = salesRepresentatives.find(r => r.id === inv.salesRepId);
            const itemsTotal = inv.items.reduce((s, i) => s + i.price * i.quantity, 0);
            const netTotal = (itemsTotal - inv.discount) * (1 + inv.tax / 100);
            
            const matchesItem = !heldFilters.itemSearch || inv.items.some(it => {
                const itemData = items.find(i => i.id === it.itemId);
                return searchMatch(`${itemData?.name} ${itemData?.barcode}`, heldFilters.itemSearch);
            });

            return (
                (!heldFilters.date || inv.date.includes(heldFilters.date)) &&
                (!heldFilters.customerName || searchMatch(customer?.name || '', heldFilters.customerName)) &&
                (!heldFilters.salesRepName || searchMatch(salesRep?.name || '', heldFilters.salesRepName)) &&
                (!heldFilters.total || netTotal.toString().includes(heldFilters.total)) &&
                matchesItem
            );
        }).sort((a, b) => getNumericId(b.id) - getNumericId(a.id));
    }, [heldInvoices, heldFilters, customers, salesRepresentatives, items]);
    
    const canEdit = currentUser.permissions.includes('salesInvoice_edit');
    const canDelete = currentUser.permissions.includes('salesInvoice_delete');
    const canEditDate = currentUser.permissions.includes('salesInvoice_editDate');

    const dateInputProps = useDateInput(newInvoice.date, (newDate) => {
        setNewInvoice((p: any) => ({ ...p, date: newDate }));
    });

    const getAvailableStock = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return 0;

        let available = item.openingBalance;

        if (isEditing) {
            const originalInvoice = salesInvoices.find(inv => inv.id === newInvoice.id);
            if (originalInvoice) {
                const originalItem = originalInvoice.items.find(i => i.itemId === itemId);
                if (originalItem) available += originalItem.quantity;
            }
        }
        return available;
    };

    useEffect(() => {
        if (docToView && docToView.view === 'salesInvoice') {
            const invoice = salesInvoices.find(inv => inv.id === docToView.docId);
            if (invoice) handleEdit(invoice);
            onClearDocToView();
        }
    }, [docToView, salesInvoices, onClearDocToView]);

    useEffect(() => {
        if (newInvoice.customerId) {
            const c = customers.find(x => x.id === newInvoice.customerId);
            if (c) setCustomerSearchQuery(c.name);
        } else if (!isCustomerSuggestionsOpen) setCustomerSearchQuery('');

        if (newInvoice.salesRepId) {
            const r = salesRepresentatives.find(x => x.id === newInvoice.salesRepId);
            if (r) setSalesRepSearchQuery(r.name);
        } else if (!isSalesRepSuggestionsOpen) setSalesRepSearchQuery('');
    }, [newInvoice.id, newInvoice.customerId, newInvoice.salesRepId, customers, salesRepresentatives]);

    useEffect(() => {
        if (newInvoice.customerId) {
            const customer = customers.find(c => c.id === newInvoice.customerId);
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
                    if (rec.customerId === customer.id) balance -= rec.amount;
                });
                setSelectedCustomerBalance(balance);
            }
        } else setSelectedCustomerBalance(null);
    }, [newInvoice.customerId, customers, salesInvoices, salesReturns, customerReceipts]);

    const calculateBalanceAtPoint = (customerId: number, date: string, id: number | string) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return 0;
        let balance = customer.openingBalance;
        
        salesInvoices.forEach(inv => {
            if (inv.customerId === customer.id && (inv.date < date || (inv.date === date && String(inv.id) < String(id)))) {
                const total = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                balance += (total - (inv.paidAmount || 0));
            }
        });
        salesReturns.forEach(ret => {
            if (ret.customerId === customer.id && (ret.date < date || (ret.date === date && String(ret.id) < String(id)))) {
                const total = (ret.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - ret.discount) * (1 + ret.tax / 100);
                balance -= (total - (ret.paidAmount || 0));
            }
        });
        customerReceipts.forEach(rec => {
            if (rec.customerId === customer.id && (rec.date < date || (rec.date === date && String(rec.id) < String(id)))) {
                balance -= rec.amount;
            }
        });
        return balance;
    };

    const suggestedItems = useMemo(() => {
        const unselectedItems = items.filter(item => 
            !newInvoice.items.some(invItem => invItem.itemId === item.id) &&
            getAvailableStock(item.id) > 0 
        );
        let results = unselectedItems;
        if (itemSearchQuery) {
            const trimmedQuery = itemSearchQuery.trim();
            results = unselectedItems.filter(item => item.barcode === trimmedQuery || searchMatch(item.name, itemSearchQuery));
        }
        return results.sort((a, b) => a.name.localeCompare(b.name, 'ar')).slice(0, 30);
    }, [itemSearchQuery, items, newInvoice.items, salesInvoices, salesReturns, purchaseInvoices, purchaseReturns]);

    const suggestedCustomers = useMemo(() => {
        let results = customers;
        if (customerSearchQuery) {
            results = customers.filter(customer => searchMatch(`${customer.name} ${customer.phone || ''}`, customerSearchQuery));
        }
        return results.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [customerSearchQuery, customers]);

    const suggestedSalesReps = useMemo(() => {
        if (!salesRepSearchQuery) return salesRepresentatives.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        return salesRepresentatives.filter(rep => searchMatch(`${rep.name} ${rep.code}`, salesRepSearchQuery)).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [salesRepSearchQuery, salesRepresentatives]);

    const handleCustomerSelect = (customer: Customer) => {
        setNewInvoice((prev: any) => ({ ...prev, customerId: customer.id }));
        setCustomerSearchQuery(customer.name);
        setIsCustomerSuggestionsOpen(false);
    };

    const handleItemSelect = (item: Item) => {
        const discountedPrice = activeDiscounts[item.id];
        const priceToUse = discountedPrice !== undefined ? discountedPrice : item.sellPrice;
        setItemSearchQuery(item.name);
        setCurrentItemSelection({ quantity: 1, itemId: item.id, price: priceToUse });
        setIsItemSuggestionsOpen(false);
    };

    const handleAddItemClick = () => {
        if (!currentItemSelection.itemId) { alert("يرجى اختيار صنف أولاً"); return; }
        const itemToAdd = items.find(i => i.id === currentItemSelection.itemId);
        if (itemToAdd) {
            if (newInvoice.items.some(i => i.itemId === itemToAdd.id)) { alert("الصنف مضاف بالفعل"); return; }
            const availableStock = getAvailableStock(itemToAdd.id);
            if (currentItemSelection.quantity > availableStock) { alert(`الكمية المطلوبة (${currentItemSelection.quantity}) أكبر من الرصيد المتاح (${availableStock}).`); return; }
            const newItem: SalesInvoiceItem = { itemId: itemToAdd.id, quantity: currentItemSelection.quantity, price: currentItemSelection.price };
            setNewInvoice((prev: any) => ({ ...prev, items: [...prev.items, newItem] }));
            setCurrentItemSelection({ itemId: 0, quantity: 1, price: 0 });
            setItemSearchQuery('');
            itemSearchInputRef.current?.focus();
        }
    };

    const handleItemChange = (itemId: number, field: 'quantity' | 'price', value: number) => {
        if (field === 'quantity') {
            const availableStock = getAvailableStock(itemId);
            if (value > availableStock) { alert(`الكمية المطلوبة (${value}) أكبر من الرصيد المتاح (${availableStock}).`); return; }
        }
        setNewInvoice((prev: any) => ({ ...prev, items: prev.items.map((item: any) => item.itemId === itemId ? { ...item, [field]: value } : item ) }));
    };

    const subtotal = useMemo(() => newInvoice.items.reduce((acc, item) => acc + item.quantity * item.price, 0), [newInvoice.items]);
    const total = (subtotal - newInvoice.discount) * (1 + newInvoice.tax / 100);

    const performActualSave = (printAfterSave: boolean) => {
        let updatedItems = [...items];
        const originalInvoice = isEditing ? salesInvoices.find(inv => inv.id === newInvoice.id) : null;
        
        if (originalInvoice) {
            originalInvoice.items.forEach(oldItem => {
                const idx = updatedItems.findIndex(i => i.id === oldItem.itemId);
                if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance + oldItem.quantity };
            });
        }
        
        for (const newItem of newInvoice.items) {
            const idx = updatedItems.findIndex(i => i.id === newItem.itemId);
            if (idx > -1) {
                const newStock = updatedItems[idx].openingBalance - newItem.quantity;
                if (newStock < 0) { alert(`رصيد غير كافي للصنف ${updatedItems[idx].name}`); return; }
                updatedItems[idx] = { ...updatedItems[idx], openingBalance: newStock };
            }
        }

        setItems(updatedItems);
        
        const invoiceToSave = { ...newInvoice };
        if (invoiceToSave.type === 'cash') {
            invoiceToSave.paidAmount = total;
        } else {
            invoiceToSave.paidAmount = 0;
        }

        if (isEditing) {
            const finalizedId = typeof invoiceToSave.id === 'string' ? getNextInvoiceId() : invoiceToSave.id;
            const updated = { ...invoiceToSave, id: finalizedId, lastModifiedBy: currentUser.username, lastModifiedAt: new Date().toISOString() };
            setSalesInvoices(prev => prev.map(inv => inv.id === invoiceToSave.id ? updated : inv));
            
            showNotification('edit'); if (printAfterSave) handlePrint(updated);
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل فاتورة مبيعات رقم ${finalizedId} للعميل ${customers.find(c => c.id === invoiceToSave.customerId)?.name || ''}` }));
        } else {
            const created = { ...invoiceToSave, id: getNextInvoiceId(), createdBy: currentUser.username, createdAt: new Date().toISOString() };
            setSalesInvoices(prev => [...prev, created]);
            
            showNotification('add'); if (printAfterSave) handlePrint(created);
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإنشاء فاتورة مبيعات رقم ${created.id} للعميل ${customers.find(c => c.id === invoiceToSave.customerId)?.name || ''}` }));
        }
        resetForm();
        setPriceWarningModalOpen(false);
    };

    const handleSaveInvoice = (printAfterSave: boolean = false) => {
        if (isEditing && !canEdit) { alert("ليس لديك صلاحية التعديل."); return; }
        if (!newInvoice.customerId || newInvoice.items.length === 0) { alert("بيانات ناقصة (العميل/الأصناف)."); return; }
        
        const belowCost: typeof itemsBelowCost = [];
        newInvoice.items.forEach(invItem => {
            const originalItem = items.find(i => i.id === invItem.itemId);
            if (originalItem && originalItem.purchasePrice > 0 && invItem.price < originalItem.purchasePrice) {
                belowCost.push({
                    name: originalItem.name,
                    buy: originalItem.purchasePrice,
                    sell: invItem.price
                });
            }
        });

        if (belowCost.length > 0) {
            setItemsBelowCost(belowCost);
            setPendingPrintAfterSave(printAfterSave);
            setPriceWarningModalOpen(true);
        } else {
            performActualSave(printAfterSave);
        }
    };

    const handleEdit = (invoice: SalesInvoice) => { setIsEditing(true); setDraft(invoice); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const resetForm = () => { 
        setIsEditing(false); 
        setDraft(null); 
        setItemSearchQuery(''); 
        setCustomerSearchQuery(''); 
        setSalesRepSearchQuery(''); 
        setSelectedCustomerBalance(null); 
        closeAllDropdowns();
        setItemsBelowCost([]);
        setPriceWarningModalOpen(false);
    };

    const handlePrint = (invoice: SalesInvoice, isHeld: boolean = false) => {
        const customer = customers.find(c => c.id === invoice.customerId);
        const salesRep = salesRepresentatives.find(r => r.id === invoice.salesRepId);
        const balanceBefore = calculateBalanceAtPoint(invoice.customerId, invoice.date, invoice.id);
        const invNet = (invoice.items.reduce((s, i) => s + i.price * i.quantity, 0) - invoice.discount) * (1 + invoice.tax / 100);
        const balanceAfter = balanceBefore + (invNet - (invoice.paidAmount || 0));

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const itemsRows = invoice.items.map((it, idx) => {
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

        const docTitle = isHeld ? "إذن تسليم بضاعة" : "فاتورة مبيعات";

        printWindow.document.write(`
            <html dir="rtl">
            <head>
                <title>${docTitle} رقم ${invoice.id}</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.4; }
                    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    .logo-section { width: 33%; text-align: left; }
                    .logo-section img { max-width: 140px; max-height: 90px; object-fit: contain; }
                    .company-center { width: 33%; text-align: center; }
                    .company-center h1 { margin: 0; font-size: 1.6rem; font-weight: 900; color: #1e3a8a; }
                    .invoice-badge { display: inline-block; border: 2px solid #1e3a8a; color: #1e3a8a; padding: 4px 15px; border-radius: 6px; margin-top: 8px; font-weight: 900; font-size: 1.1rem; }
                    .doc-info { width: 33%; text-align: right; }
                    
                    .details-block { margin: 15px 0; font-size: 12pt; border-right: 4px solid #1e3a8a; padding-right: 12px; }
                    .details-block p { margin: 4px 0; font-weight: bold; }
                    .bold { font-weight: bold; }
                    .heavy { font-weight: 900; }

                    table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #1e3a8a; }
                    th { background: #1e3a8a; color: white; padding: 8px; text-align: center; font-size: 12pt; border: 1px solid #1e3a8a; }
                    td { padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11pt; }
                    
                    .item-row:nth-child(even) { background-color: #f1f5f9; }
                    
                    @media print {
                        .item-row:nth-child(even) { background-color: transparent !important; }
                        th { background: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; }
                        .invoice-badge { border-color: #1e3a8a !important; color: #1e3a8a !important; -webkit-print-color-adjust: exact !important; }
                        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }

                    .summary-section { display: flex; justify-content: flex-end; margin-top: 15px; }
                    .summary-box { width: 280px; border: 1px solid #1e3a8a; border-radius: 8px; padding: 10px; background: #f8fafc; }
                    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #ddd; font-weight: bold; font-size: 11pt; }
                    .summary-row.total { border-bottom: none; border-top: 2px solid #1e3a8a; margin-top: 5px; padding-top: 8px; color: #1e3a8a; font-size: 12pt; }
                    
                    .footer-block { margin-top: 40px; border-top: 2px solid #1e3a8a; padding-top: 15px; display: flex; justify-content: space-between; font-size: 10pt; font-weight: bold; }
                    .thanks { text-align: center; margin-top: 20px; font-weight: 900; color: #475569; font-size: 11pt; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="header-top">
                    <div class="doc-info">
                         <p class="heavy">التاريخ: ${formatDateForDisplay(invoice.date)}</p>
                         <p class="heavy">الرقم: ${invoice.id}</p>
                    </div>
                    <div class="company-center">
                        <h1>${companyData.name}</h1>
                        <div class="invoice-badge">${docTitle}</div>
                    </div>
                    <div class="logo-section">
                        ${companyData.logo ? `<img src="${companyData.logo}" />` : ''}
                    </div>
                </div>

                <div class="details-block">
                    <p>العميل: ${customer?.name || 'عميل نقدي'}</p>
                    <p>الرصيد قبل الفاتورة: <span style="color: #dc2626;">${balanceBefore.toFixed(2)}</span></p>
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
                    <tr style="background: #f8fafc; font-weight: 900;">
                        <td colspan="2" style="text-align: right;">إجمالي الأصناف: ${invoice.items.length} | القطع: ${invoice.items.reduce((s, i) => s + i.quantity, 0)}</td>
                        <td></td>
                        <td>-</td>
                        <td>${invoice.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</td>
                    </tr>
                </table>

                <div class="summary-section">
                    <div class="summary-box">
                        <div class="summary-row"><span>الإجمالي:</span><span>${invoice.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span></div>
                        <div class="summary-row"><span>الخصم:</span><span style="color: #dc2626;">-${invoice.discount.toFixed(2)}</span></div>
                        <div class="summary-row total"><span class="heavy">الصافي:</span><span class="heavy">${invNet.toFixed(2)}</span></div>
                        <div class="summary-row" style="margin-top: 8px; border-top: 1px solid #ccc; padding-top: 6px;">
                            <span>رصيد بعد الفاتورة:</span>
                            <span style="color: #dc2626;">${balanceAfter.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div class="footer-block">
                    <div>العنوان: ${companyData.address}</div>
                    <div>تليفون: ${companyData.phone1} ${companyData.phone2 ? ' - ' + companyData.phone2 : ''}</div>
                </div>

                <div class="thanks">
                    ${defaultValues.invoiceFooter || 'شكراً لزيارتكم ونتمنى رؤيتكم مرة أخرى'}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleHoldInvoice = () => {
        if (newInvoice.items.length === 0) { alert("لا يمكن تعليق فاتورة فارغة."); return; }
        
        if (isEditing) {
            const originalInvoice = salesInvoices.find(inv => inv.id === newInvoice.id);
            if (originalInvoice) {
                let updatedItems = [...items];
                originalInvoice.items.forEach(oldItem => {
                    const idx = updatedItems.findIndex(i => i.id === oldItem.itemId);
                    if (idx > -1) updatedItems[idx] = { ...updatedItems[idx], openingBalance: updatedItems[idx].openingBalance + oldItem.quantity };
                });
                setItems(updatedItems);
                setSalesInvoices(prev => prev.filter(inv => inv.id !== originalInvoice.id));
            }
        }

        const heldId = typeof newInvoice.id === 'string' && newInvoice.id.startsWith('PO-') ? newInvoice.id : getNextHeldId();
        setHeldInvoices(prev => [...prev, { ...newInvoice, id: heldId, notes: newInvoice.notes + (isEditing ? " (محولة لمعلقة)" : " (معلقة)"), createdAt: new Date().toISOString(), createdBy: currentUser.username }]);
        resetForm(); showNotification('save');
    };

    const filteredLog = useMemo(() => {
        return salesInvoices.filter(inv => {
            const customer = customers.find(c => c.id === inv.customerId);
            const salesRep = salesRepresentatives.find(r => r.id === inv.salesRepId);
            const itemsTotal = inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
            const netTotal = (itemsTotal - inv.discount) * (1 + inv.tax / 100);
            
            const matchesItem = !logFilters.itemSearch || inv.items.some(it => {
                const itemData = items.find(i => i.id === it.itemId);
                return searchMatch(`${itemData?.name} ${itemData?.barcode}`, logFilters.itemSearch);
            });
            return (
                (!logFilters.id || inv.id.toString().includes(logFilters.id)) &&
                (!logFilters.permissionNumber || (inv.permissionNumber || '').includes(logFilters.permissionNumber)) &&
                (!logFilters.date || inv.date.includes(logFilters.date)) &&
                (!logFilters.customerName || searchMatch(customer?.name || '', logFilters.customerName)) &&
                (!logFilters.salesRepName || searchMatch(salesRep?.name || '', logFilters.salesRepName)) &&
                matchesItem &&
                (logFilters.type === 'all' || inv.type === logFilters.type) &&
                (!logFilters.total || netTotal.toString().includes(logFilters.total))
            );
        }).sort((a, b) => (b.id as number) - (a.id as number));
    }, [salesInvoices, logFilters, customers, salesRepresentatives, items]);

    const totalInLog = useMemo(() => filteredLog.reduce((sum, inv) => {
        const invTotal = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
        return sum + invTotal;
    }, 0), [filteredLog]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const compactCardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-4 border border-white/40 dark:bg-gray-700/30 dark:border-white/20 w-full"; 
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 rounded-lg focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 text-black dark:text-white font-bold placeholder-gray-500 transition duration-300 disabled:opacity-70 text-base font-bold";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-green-500 focus:outline-none dark:text-white font-bold";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm";

    return (
        <div className="space-y-6">
            <QuickAddContactModal 
                isOpen={isQuickAddCustomerOpen}
                onClose={() => setIsQuickAddCustomerOpen(false)}
                type="customer"
                initialQuery={customerSearchQuery}
                currentUser={currentUser}
                onAdded={(c) => {
                    setCustomers(prev => [...prev, c]);
                    handleCustomerSelect(c);
                    showNotification('add');
                }}
            />

            <Modal title="⚠️ تحذير: البيع بأقل من سعر الشراء" show={priceWarningModalOpen} onClose={() => setPriceWarningModalOpen(false)}>
                <div className="p-4">
                    <div className="flex items-center gap-3 text-red-600 mb-6 bg-red-50 p-4 rounded-lg border border-red-200">
                        <WarningIcon className="h-10 w-10" />
                        <div><p className="font-black text-lg">تنبيه مالي هام!</p><p className="text-sm">يوجد أصناف في هذه الفاتورة سعر بيعها أقل من سعر تكلفتها المسجل.</p></div>
                    </div>
                    <div className="overflow-hidden border border-gray-200 rounded-xl mb-6">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-gray-50">
                                <tr><th className="p-3 border-b font-bold">اسم الصنف</th><th className="p-3 border-b font-bold text-center">سعر الشراء</th><th className="p-3 border-b font-bold text-center">سعر البيع</th><th className="p-3 border-b font-bold text-center">الخسارة</th></tr>
                            </thead>
                            <tbody>
                                {itemsBelowCost.map((item, i) => (
                                    <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-3 font-bold text-gray-800">{item.name}</td>
                                        <td className="p-3 text-center text-gray-600 font-mono">{item.buy.toFixed(2)}</td>
                                        <td className="p-3 text-center text-red-600 font-black font-mono">{item.sell.toFixed(2)}</td>
                                        <td className="p-3 text-center text-red-700 bg-red-50 font-black font-mono">{(item.sell - item.buy).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => performActualSave(pendingPrintAfterSave)} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-red-700 transition-all">نعم، أقبل البيع بخسارة</button>
                        <button onClick={() => setPriceWarningModalOpen(false)} className="flex-1 bg-gray-500 text-white font-bold py-3 rounded-xl shadow hover:bg-gray-600 transition-all">تراجع لتعديل الأسعار</button>
                    </div>
                </div>
            </Modal>

            {isDeleteModalOpen && (
                <ConfirmationModal 
                    title="تأكيد الحذف" 
                    message={`هل أنت متأكد من حذف الفاتورة رقم ${invoiceToDelete?.id}؟`} 
                    onConfirm={() => { if (invoiceToDelete) { let upd = [...items]; invoiceToDelete.items.forEach(old => { const idx = upd.findIndex(i => i.id === old.itemId); if (idx > -1) upd[idx] = { ...upd[idx], openingBalance: upd[idx].openingBalance + old.quantity }; }); setItems(upd); setSalesInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id)); showNotification('delete'); } setIsDeleteModalOpen(false); setInvoiceToDelete(null); }} 
                    onCancel={() => setIsDeleteModalOpen(false)} 
                    confirmText="حذف" confirmColor="bg-red-600" 
                />
            )}
            <QuickAddItemModal isOpen={isQuickAddItemModalOpen} onClose={() => setIsQuickAddItemModalOpen(false)} onItemAdded={(ni) => { setItems(p => [...p, ni]); handleItemSelect(ni); setIsQuickAddItemModalOpen(false); showNotification('add'); }} items={items} units={units} warehouses={warehouses} defaultWarehouseId={newInvoice.warehouseId} currentUser={currentUser} />
            <Modal title="الفواتير المعلقة" show={isHeldInvoicesModalOpen} onClose={() => { setIsHeldInvoicesModalOpen(false); setHeldFilters({date:'', customerName:'', salesRepName:'', total:'', itemSearch:''}); }}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-800 mb-4 text-sm font-bold">
                        <div><label className="block text-xs font-bold mb-1">التاريخ</label><input type="text" value={heldFilters.date} onChange={(e) => setHeldFilters(prev => ({...prev, date: e.target.value}))} className="h-9 w-full px-3 border-2 border-orange-200 rounded focus:border-orange-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="يوم-شهر-سنة" /></div>
                        <div><label className="block text-xs font-bold mb-1">اسم العميل</label><input type="text" value={heldFilters.customerName} onChange={(e) => setHeldFilters(prev => ({...prev, customerName: e.target.value}))} className="h-9 w-full px-3 border-2 border-orange-200 rounded focus:border-orange-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="بحث بالاسم..." /></div>
                        <div><label className="block text-xs font-bold mb-1">اسم المندوب</label><input type="text" value={heldFilters.salesRepName} onChange={(e) => setHeldFilters(prev => ({...prev, salesRepName: e.target.value}))} className="h-9 w-full px-3 border-2 border-orange-200 rounded focus:border-orange-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="بحث..." /></div>
                        <div><label className="block text-xs font-bold mb-1">المبلغ</label><input type="text" value={heldFilters.total} onChange={(e) => setHeldFilters(prev => ({...prev, total: e.target.value}))} className="h-9 w-full px-3 border-2 border-orange-200 rounded focus:border-orange-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="القيمة..." /></div>
                        <div><label className="block text-xs font-bold mb-1">صنف / باركود</label><input type="text" value={heldFilters.itemSearch} onChange={(e) => setHeldFilters(prev => ({...prev, itemSearch: e.target.value}))} className="h-9 w-full px-3 border-2 border-orange-200 rounded focus:border-orange-500 focus:outline-none text-sm dark:bg-gray-800 dark:text-white" placeholder="بحث في محتوى الفاتورة..." /></div>
                    </div>
                    <div className="overflow-auto max-h-[60vh] border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                                <tr className="border-b"><th className="p-3 border-b text-sm font-bold">التاريخ</th><th className="p-3 border-b text-sm font-bold">الرقم</th><th className="p-3 border-b text-sm font-bold">العميل</th><th className="p-3 border-b text-sm font-bold">المندوب</th><th className="p-3 border-b text-sm font-bold text-center">الأصناف</th><th className="p-3 border-b text-sm font-bold text-center">الكمية</th><th className="p-3 border-b text-sm font-bold text-center">الإجمالي</th><th className="p-3 border-b text-sm font-bold text-center">إجراء</th></tr>
                            </thead>
                            <tbody>
                                {filteredHeldInvoices.map(inv => {
                                    const itemsCount = inv.items.length;
                                    const totalQty = inv.items.reduce((s, i) => s + i.quantity, 0);
                                    const invTotal = (inv.items.reduce((acc, i) => acc + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                                    return (
                                        <tr key={inv.id} className="border-b hover:bg-orange-50/50 dark:hover:bg-white/5 transition-colors font-bold text-sm">
                                            <td className="p-3 text-xs text-gray-600 dark:text-gray-400">{formatDateForDisplay(inv.date)}</td>
                                            <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{inv.id}</td>
                                            <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{customers.find(c => c.id === inv.customerId)?.name || 'غير معروف'}</td>
                                            <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{salesRepresentatives.find(r => r.id === inv.salesRepId)?.name || '-'}</td>
                                            <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">{itemsCount}</td>
                                            <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{totalQty}</td>
                                            <td className="p-3 text-center font-black text-orange-700 dark:text-orange-400"><FormattedNumber value={invTotal} /></td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    <button onClick={() => handlePrint(inv, true)} className="text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors" title="طباعة إذن تسليم"><PrintIcon /></button>
                                                    <button onClick={() => { if (newInvoice.items.length > 0 && !confirm("سيتم استبدال الفاتورة الحالية بالفاتورة المعلقة. هل أنت متأكد؟")) return; setDraft(inv); setHeldInvoices(p => p.filter(x => x.id !== inv.id)); setIsHeldInvoicesModalOpen(false); setHeldFilters({date:'', customerName:'', salesRepName:'', total:'', itemSearch:''}); }} className="bg-orange-600 text-white px-4 py-1 rounded text-sm font-bold hover:bg-orange-700 shadow-sm transition-colors">استعادة</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                <div className={`${cardClass} lg:col-span-9 pb-10 relative z-30`}>
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-green-800 dark:text-green-300 font-bold">{isEditing ? `عرض / تعديل فاتورة` : 'فاتورة مبيعات جديدة'}</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold text-green-800 dark:text-green-300 font-bold">رقم الفاتورة : {newInvoice.id}</span>
                            <button onClick={() => setIsHeldInvoicesModalOpen(true)} className="relative bg-orange-100 text-orange-600 p-2 rounded-lg font-bold flex items-center gap-2 shadow-sm border border-orange-200"><ArchiveIcon className="h-5 w-5"/><span className="text-sm">المعلقة</span>{heldInvoices.length > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{heldInvoices.length}</span>}</button>
                        </div>
                    </div>

                    <div className="space-y-4 font-bold text-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start relative z-50">
                             <div className="lg:col-span-4 relative pb-2 z-[100]">
                                <label className={labelClass}>العميل</label>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <div className="relative flex-grow">
                                        <input type="text" value={customerSearchQuery} onChange={(e) => { setCustomerSearchQuery(e.target.value); openDropdown('customer'); }} onFocus={() => openDropdown('customer')} onBlur={() => setTimeout(() => setIsCustomerSuggestionsOpen(false), 250)} className={inputClass} disabled={isEditing && !canEdit} placeholder="بحث بالاسم أو الهاتف..." autoComplete="off" />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                    </div>
                                    {isCustomerSuggestionsOpen && (
                                        <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-green-300 rounded mt-1 max-h-60 overflow-y-auto top-full shadow-2xl">
                                            {suggestedCustomers.length > 0 ? suggestedCustomers.map(c => (
                                                <li key={c.id} onMouseDown={() => { handleCustomerSelect(c); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white">
                                                    {c.name}
                                                </li>
                                            )) : (
                                                <li onMouseDown={() => setIsQuickAddCustomerOpen(true)} className="p-4 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-blue-600 dark:text-blue-400 font-black flex items-center gap-2 border-b last:border-0">
                                                    <PlusCircleIcon className="h-5 w-5 ml-0" />
                                                    <span>غير موجود، إضافة عميل جديد باسم "{customerSearchQuery}"؟</span>
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                 {selectedCustomerBalance !== null && (
                                     <div className="mt-2 text-xl font-black whitespace-nowrap z-0">
                                         <span className="text-gray-700 dark:text-gray-400">الرصيد: </span>
                                         <span className={selectedCustomerBalance >= 0 ? 'text-red-600' : 'text-green-600'}><FormattedNumber value={Math.abs(selectedCustomerBalance)} /></span>
                                         <span className="text-xs text-gray-500 mr-1">({selectedCustomerBalance >= 0 ? 'عليه' : 'له'})</span>
                                     </div>
                                 )}
                             </div>
                             <div className="lg:col-span-2"><label className={labelClass}>رقم الإذن</label><input type="text" value={newInvoice.permissionNumber || ''} onChange={(e) => setNewInvoice((p: any) => ({...p, permissionNumber: e.target.value}))} className={inputClass} disabled={isEditing && !canEdit} /></div>
                             <div className="lg:col-span-2 relative z-[90]">
                                <label className={labelClass}>المندوب</label>
                                <div className="relative">
                                    <input type="text" value={salesRepSearchQuery} onChange={(e) => { setSalesRepSearchQuery(e.target.value); openDropdown('salesRep'); }} onFocus={() => openDropdown('salesRep')} onBlur={() => setTimeout(() => setIsSalesRepSuggestionsOpen(false), 250)} className={inputClass} disabled={isEditing && !canEdit} autoComplete="off"/>
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                </div>
                                {isSalesRepSuggestionsOpen && <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-green-300 rounded mt-1 max-h-40 overflow-y-auto shadow-2xl">{suggestedSalesReps.map(r => <li key={r.id} onMouseDown={() => { setNewInvoice(p=>({...p, salesRepId: r.id})); setSalesRepSearchQuery(r.name); setIsSalesRepSuggestionsOpen(false); }} className="p-3 hover:bg-gray-100 font-bold border-b last:border-0 dark:text-white">{r.name}</li>)}</ul>}
                             </div>
                             <div className="lg:col-span-2">
                                <label className={labelClass}>نوع الفاتورة</label>
                                <select 
                                    value={newInvoice.type} 
                                    onChange={(e) => setNewInvoice((p: any) => ({ ...p, type: e.target.value as 'cash' | 'credit' }))} 
                                    className={inputClass} 
                                    disabled={isEditing && !canEdit}
                                >
                                    <option value="cash">نقدي</option>
                                    <option value="credit">آجل</option>
                                </select>
                             </div>
                              <div className="lg:col-span-2"><label className={labelClass}>التاريخ</label><input type="text" value={newInvoice.date} {...dateInputProps} className={inputClass} disabled={isEditing && !canEditDate} /></div>
                        </div>

                        <div className="relative z-10 font-bold text-sm">
                             <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 border rounded-lg bg-black/5 dark:bg-white/5 mt-6 border-green-200 pb-12">
                                <div className="md:col-span-5 relative z-[45]">
                                    <label className={labelClass}>الصنف</label>
                                    <div className="relative">
                                        <input ref={itemSearchInputRef} type="text" value={itemSearchQuery} onChange={(e) => { setItemSearchQuery(e.target.value); openDropdown('item'); }} onFocus={() => openDropdown('item')} onBlur={() => setTimeout(() => setIsItemSuggestionsOpen(false), 250)} placeholder="بحث بالاسم أو الباركود..." className={inputClass} autoComplete="off" />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                    </div>
                                    {isItemSuggestionsOpen && suggestedItems.length > 0 && (
                                        <ul className="absolute z-[1000] w-full bg-white dark:bg-gray-800 border-2 border-green-300 rounded mt-1 max-h-60 overflow-y-auto shadow-2xl top-full">
                                            {suggestedItems.map(item => {
                                                const warehouseName = warehouses.find(w => w.id === item.warehouseId)?.name || '';
                                                return (
                                                    <li key={item.id} onMouseDown={() => handleItemSelect(item)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between font-bold border-b dark:border-gray-700 last:border-0 dark:text-white">
                                                        <div>
                                                            <span>{item.name}</span>
                                                            <span className="text-xs text-blue-500 mr-2">({warehouseName})</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500 font-bold">المتاح: {getAvailableStock(item.id)}</span>
                                                    </li>
                                                );
                                            })}
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
                                    <button onClick={handleAddItemClick} disabled={!currentItemSelection.itemId} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg shadow-md hover:bg-green-700 h-11 flex items-center justify-center transition-all"><PlusCircleIcon className="h-5 w-5" /><span className="mr-2">إضافة</span></button>
                                </div>
                             </div>
                         </div>
                    </div>
                </div>
                
                <div className={`${compactCardClass} lg:col-span-3 flex flex-col relative z-0`}>
                    <h2 className="font-bold text-sm mb-3 text-black dark:text-gray-200 border-b pb-1 text-center font-bold">ملخص الحساب</h2>
                    <div className="flex-1 flex flex-col justify-center space-y-4">
                        <div className="flex justify-between items-center bg-black/5 p-2 rounded">
                            <span className="text-gray-600 dark:text-gray-400 text-xs font-bold">عدد الأصناف:</span>
                            <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{newInvoice.items.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/5 p-2 rounded">
                            <span className="text-gray-600 dark:text-gray-400 text-xs font-bold">إجمالي القطع:</span>
                            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{newInvoice.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                            <span className="text-green-800 dark:text-green-300 text-sm font-black">صافي القيمة:</span>
                            <span className="font-black text-xl text-green-700 dark:text-green-300"><FormattedNumber value={total} /></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${cardClass} relative z-0`}>
                 <div ref={itemsTableRef} className="overflow-x-auto font-bold text-sm max-h-[500px] overflow-y-auto">
                     <table className="w-full text-right table-fixed">
                         <thead className="border-b-2 border-gray-400/50 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                             <tr>
                                 <th className="p-2 text-sm font-bold text-black dark:text-gray-100 text-center" style={{ width: '10%' }}>الباركود</th>
                                 <th className="p-2 text-sm font-bold text-black dark:text-gray-100 text-right" style={{ width: '25%' }}>الصنف</th>
                                 <th className="p-2 text-sm font-bold text-black dark:text-gray-100 text-center" style={{ width: '15%' }}>المخزن</th>
                                 <th className="p-2 text-sm font-bold text-black dark:text-gray-100 text-center" style={{ width: '8%' }}>المتاح</th>
                                 <th className="p-2 text-sm font-bold text-black dark:text-gray-100 text-center" style={{ width: '10%' }}>الكمية</th>
                                 <th className="p-2 text-sm font-bold text-black dark:text-gray-100 text-center" style={{ width: '12%' }}>السعر</th>
                                 <th className="p-2 text-sm font-bold text-black dark:text-gray-100 text-center" style={{ width: '12%' }}>الاجمالي</th>
                                 <th className="p-2 text-sm font-bold text-black dark:text-gray-100 text-center" style={{ width: '8%' }}>حذف</th>
                             </tr>
                         </thead>
                         <tbody>
                            {newInvoice.items.map(invItem => {
                                const itemData = items.find(i => i.id === invItem.itemId);
                                const warehouseName = itemData ? warehouses.find(w => w.id === itemData.warehouseId)?.name : '';
                                return itemData ? (
                                <tr key={invItem.itemId} className="border-b hover:bg-green-50/30 transition-colors text-sm font-bold">
                                    <td className="p-2 text-center text-xs font-mono dark:text-gray-300">{itemData.barcode}</td>
                                    <td className="p-2 text-right dark:text-gray-200">{itemData.name}</td>
                                    <td className="p-2 text-center text-xs text-blue-600 dark:text-blue-400">{warehouseName}</td>
                                    <td className="p-2 text-center text-blue-600">{getAvailableStock(itemData.id)}</td>
                                    <td className="p-2 text-center"><input type="number" min="1" value={invItem.quantity} onChange={(e) => handleItemChange(invItem.itemId, 'quantity', +e.target.value)} className="w-full text-center border-2 border-gray-200 rounded font-bold dark:bg-gray-700 dark:text-white" /></td>
                                    <td className="p-2 text-center"><input type="number" min="0" step="0.01" value={invItem.price} onChange={(e) => handleItemChange(invItem.itemId, 'price', +e.target.value)} className="w-full text-center border-2 border-gray-200 rounded font-bold dark:bg-gray-700 dark:text-white" /></td>
                                    <td className="p-2 text-center text-green-600"><FormattedNumber value={invItem.quantity * invItem.price} /></td>
                                    <td className="p-2 text-center"><button onClick={() => setNewInvoice(p=>({...p, items: p.items.filter(i=>i.itemId!==invItem.itemId)}))} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><DeleteIcon /></button></td>
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
                        <button onClick={() => handleSaveInvoice(false)} className="flex-1 bg-green-600 text-white font-bold h-full rounded-lg shadow-lg hover:bg-green-700 transition-all text-sm">{isEditing ? 'تحديث' : 'حفظ'}</button>
                        {!isEditing && <button onClick={() => handleSaveInvoice(true)} className="flex-1 bg-blue-600 text-white font-bold h-full rounded-lg shadow-lg hover:bg-blue-700 transition-all text-sm">حفظ وطباعة</button>}
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-4 cursor-pointer select-none" onClick={() => setIsLogVisible(!isLogVisible)}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-green-800 dark:text-green-300">سجل فواتير المبيعات</h2>
                        <ChevronDownIcon className={`w-6 h-6 transition-transform duration-300 ${isLogVisible ? 'rotate-180' : ''}`} />
                    </div>
                    {isLogVisible && (
                        <div className="flex items-center gap-4">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 px-4 rounded-lg text-center shadow-sm">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي الفواتير</p>
                                <p className="text-xl font-black text-green-700 dark:text-green-300">{filteredLog.length}</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 px-4 rounded-lg text-center shadow-sm">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">إجمالي القيمة</p>
                                <p className="text-xl font-black text-blue-700 dark:text-blue-300"><FormattedNumber value={totalInLog} /></p>
                            </div>
                        </div>
                    )}
                </div>
                {isLogVisible && (
                    <div className="animate-fade-in-up mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-6 bg-black/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">رقم الفاتورة</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.id} onChange={e => setLogFilters({...logFilters, id: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">رقم الإذن</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.permissionNumber} onChange={e => setLogFilters({...logFilters, permissionNumber: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">التاريخ</label><input type="text" placeholder="يوم-شهر-سنة" className={filterInputClass} value={logFilters.date} onChange={e => setLogFilters({...logFilters, date: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">اسم العميل</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.customerName} onChange={e => setLogFilters({...logFilters, customerName: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المندوب</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.salesRepName} onChange={e => setLogFilters({...logFilters, salesRepName: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">الصنف/الباركود</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.itemSearch} onChange={e => setLogFilters({...logFilters, itemSearch: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">النوع</label><select className={filterInputClass} value={logFilters.type} onChange={e => setLogFilters({...logFilters, type: e.target.value as any})}><option value="all">الكل</option><option value="cash">نقدي</option><option value="credit">آجل</option></select></div>
                            <div className="flex items-end gap-1">
                                <div className="flex-1"><label className="block text-[10px] font-bold mb-1 dark:text-gray-400">المبلغ</label><input type="text" placeholder="بحث..." className={filterInputClass} value={logFilters.total} onChange={e => setLogFilters({...logFilters, total: e.target.value})} /></div>
                                <button onClick={() => setLogFilters({id:'', permissionNumber:'', date:'', customerName:'', salesRepName:'', itemSearch:'', type:'all', total:''})} className="w-10 h-9 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded hover:bg-gray-300 transition-colors flex items-center justify-center" title="تفريغ البحث"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        </div>
                        <div className="overflow-auto relative max-h-[60vh] border border-gray-200 rounded-lg shadow-inner dark:border-gray-700">
                            <table className="w-full text-right border-collapse">
                                <thead className="sticky top-0 z-20 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    <tr className="shadow-sm">
                                        <th className="p-3 border-b-2 text-sm font-bold">رقم الفاتورة</th><th className="p-3 border-b-2 text-sm font-bold">رقم الإذن</th><th className="p-3 border-b-2 text-sm font-bold">التاريخ</th><th className="p-3 border-b-2 text-sm font-bold">العميل</th><th className="p-3 border-b-2 text-sm font-bold">المندوب</th><th className="p-3 border-b-2 text-sm font-bold">نوع الفاتورة</th><th className="p-3 border-b-2 text-sm font-bold">المبلغ</th><th className="p-3 border-b-2 text-sm font-bold text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLog.map(inv => {
                                        const salesRep = salesRepresentatives.find(r => r.id === inv.salesRepId);
                                        const itemsTotal = inv.items.reduce((s,i)=>s+i.price*i.quantity,0);
                                        const invTotal = (itemsTotal - inv.discount) * (1 + inv.tax / 100);
                                        return (
                                            <tr key={inv.id} className="border-b hover:bg-green-50 transition-colors dark:hover:bg-green-900/10 text-sm font-bold">
                                                <td className="p-3 text-green-700 dark:text-green-400">{inv.id}</td><td className="p-3 text-gray-600 dark:text-gray-400 font-mono">{inv.permissionNumber || '-'}</td><td className="p-3 text-gray-700 dark:text-gray-300">{formatDateForDisplay(inv.date)}</td><td className="p-3 text-gray-800 dark:text-gray-200">{customers.find(c=>c.id===inv.customerId)?.name || 'غير معروف'}</td><td className="p-3 text-gray-700 dark:text-gray-300">{salesRep?.name || '-'}</td>
                                                <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-black ${inv.type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{inv.type === 'cash' ? 'نقدي' : 'آجل'}</span></td>
                                                <td className="p-3 font-black text-gray-900 dark:text-white"><FormattedNumber value={invTotal} /></td>
                                                <td className="p-3"><div className="flex justify-center gap-2"><button onClick={() => handleEdit(inv)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="تعديل"><EditIcon /></button><button onClick={() => handlePrint(inv)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="طباعة"><PrintIcon /></button><button onClick={() => {
                                                    const customer = customers.find(c => c.id === inv.customerId);
                                                    const phoneNumber = formatPhoneNumberForWhatsApp(customer?.phone || '');
                                                    const invTotal = (inv.items.reduce((s, i) => s + i.price * i.quantity, 0) - inv.discount) * (1 + inv.tax / 100);
                                                    const text = `فاتورة مبيعات رقم: ${inv.id}%0Aالتاريخ: ${formatDateForDisplay(inv.date)}%0Aالعميل: ${customer?.name || ''}%0Aالإجمالي: ${formatNumber(invTotal)}${defaultValues.whatsappFooter ? '%0A' + encodeURIComponent(defaultValues.whatsappFooter) : ''}`;
                                                    window.open(phoneNumber ? `https://wa.me/${phoneNumber}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
                                                }} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="واتساب"><WhatsAppIcon /></button>{canDelete && <button onClick={() => {setInvoiceToDelete(inv); setIsDeleteModalOpen(true);}} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors" title="حذف"><DeleteIcon /></button>}</div></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default SalesInvoiceManagement;
