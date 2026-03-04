import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FormattedNumber, CalculatorIcon, PlusCircleIcon, DeleteIcon, PrintIcon, ArchiveIcon, Modal, EditIcon, ViewIcon, SwitchHorizontalIcon, ChevronDownIcon, RefreshIcon } from './Shared';
import type { CompanyData, Item, Unit, Warehouse, DefaultValues, NotificationType, PurchaseInvoice, Supplier, MgmtUser, PurchaseInvoiceItem, SavedImport, ImportItem, SalesInvoice, SalesReturn, PurchaseReturn } from '../types';
import { normalizeText, getNextBarcode, generateUniqueId, formatDateForDisplay, searchMatch, roundTo2 } from '../utils';
import { useDateInput } from '../hooks/useDateInput';

interface ImportCostCalculatorProps {
  companyData: CompanyData;
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  units: Unit[];
  warehouses: Warehouse[];
  defaultValues: DefaultValues;
  showNotification: (type: NotificationType) => void;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  currentUser: MgmtUser;
  savedMessages: SavedImport[];
  setSavedMessages: React.Dispatch<React.SetStateAction<SavedImport[]>>;
  salesInvoices: SalesInvoice[];
  salesReturns: SalesReturn[];
  purchaseReturns: PurchaseReturn[];
}

const ImportCostCalculator: React.FC<ImportCostCalculatorProps> = ({ 
  companyData, items, setItems, units, warehouses, defaultValues, showNotification,
  purchaseInvoices, setPurchaseInvoices, suppliers, setSuppliers, currentUser,
  savedMessages, setSavedMessages,
  salesInvoices, salesReturns, purchaseReturns
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [usdToRmb, setUsdToRmb] = useState<number>(7.25);
  const [usdToEgp, setUsdToEgp] = useState<number>(50.00);

  async function fetchExchangeRates() {
    if (viewOnly) return;
    setIsFetchingRates(true);
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!response.ok) throw new Error('Failed to fetch rates');
      const data = await response.json();
      
      if (data.rates) {
        if (data.rates.CNY) setUsdToRmb(roundTo2(data.rates.CNY));
        if (data.rates.EGP) setUsdToEgp(roundTo2(data.rates.EGP));
        showNotification('save');
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
      alert('فشل تحديث أسعار الصرف تلقائياً. يرجى المحاولة لاحقاً أو الإدخال يدوياً.');
    } finally {
      setIsFetchingRates(false);
    }
  }

  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0);
  const [targetWarehouseId, setTargetWarehouseId] = useState<number>(defaultValues.defaultWarehouseId);
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('credit');
  const [entryDate, setEntryDate] = useState(today);
  const entryDateInputProps = useDateInput(entryDate, setEntryDate);

  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierSuggestionsOpen, setIsSupplierSuggestionsOpen] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  const [expenses, setExpenses] = useState({
    shipping: 0, customs: 0, clearance: 0, commissions: 0, others: 0
  });

  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  
  const [newItem, setNewItem] = useState({ name: '', qty: 1, priceRmb: 0, barcode: '' });
  const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);
  const itemNameRef = useRef<HTMLInputElement>(null);

  const handleExpenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExpenses(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const suggestedSuppliers = useMemo(() => {
    if (!supplierSearchQuery) return suppliers;
    return suppliers.filter(s => searchMatch(s.name, supplierSearchQuery));
  }, [supplierSearchQuery, suppliers]);

  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplierId(supplier.id);
    setSupplierSearchQuery(supplier.name);
    setIsSupplierSuggestionsOpen(false);
  };

  const uniqueInventoryItems = useMemo(() => {
    const unique = new Map<string, Item>();
    items.forEach(item => {
      const norm = normalizeText(item.name);
      if (!unique.has(norm)) unique.set(norm, item);
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [items]);

  const suggestedItems = useMemo(() => {
    if (!newItem.name.trim()) return [];
    return uniqueInventoryItems.filter(item => searchMatch(item.name, newItem.name));
  }, [newItem.name, uniqueInventoryItems]);

  const addItem = () => {
    if (viewOnly) return;
    if (!newItem.name.trim() || newItem.qty <= 0 || newItem.priceRmb <= 0) {
      alert("يرجى إكمال بيانات الصنف");
      return;
    }
    setImportItems([...importItems, { ...newItem, id: Date.now().toString() }]);
    setNewItem({ name: '', qty: 1, priceRmb: 0, barcode: '' });
    itemNameRef.current?.focus();
  };

  const removeItem = (id: string) => {
    if (viewOnly) return;
    setImportItems(importItems.filter(item => item.id !== id));
  };

  const getCalculatedTotals = (currentItems: ImportItem[], currentExpenses: typeof expenses, currentUsdRmb: number, currentUsdEgp: number) => {
    const rmbToEgp = currentUsdRmb > 0 ? (1 / currentUsdRmb) * currentUsdEgp : 0;
    const rmbToUsd = currentUsdRmb > 0 ? (1 / currentUsdRmb) : 0;
    const totalRmb = currentItems.reduce((sum, item) => sum + (item.priceRmb * item.qty), 0);
    const totalUsd = roundTo2(totalRmb * rmbToUsd);
    const totalFobEgp = roundTo2(totalRmb * rmbToEgp);
    const totalAdditionalFees = (Object.values(currentExpenses) as number[]).reduce((a, b) => a + b, 0);
    const grandTotalEgp = roundTo2(totalFobEgp + totalAdditionalFees);
    const overheadRatio = totalFobEgp > 0 ? (totalAdditionalFees as number) / totalFobEgp : 0;

    const calculatedRows = currentItems.map(item => {
      const priceUsd = roundTo2(item.priceRmb * rmbToUsd);
      const priceEgp = roundTo2(item.priceRmb * rmbToEgp);
      const itemFobTotalEgp = priceEgp * item.qty;
      const itemShareOfFees = itemFobTotalEgp * overheadRatio;
      const unitShareOfFees = roundTo2(itemShareOfFees / item.qty);
      const unitLandedCostEgp = roundTo2(priceEgp + unitShareOfFees);
      const rowTotalEgp = roundTo2(unitLandedCostEgp * item.qty);
      return { ...item, priceUsd, priceEgp, unitShareOfFees, unitLandedCostEgp, rowTotalEgp };
    });

    return { totalRmb, totalUsd, rmbToEgp, totalFobEgp, totalAdditionalFees, grandTotalEgp, calculatedRows, overheadRatio, rmbToEgpValue: rmbToEgp };
  };

  const totals = useMemo(() => getCalculatedTotals(importItems, expenses, usdToRmb, usdToEgp), [importItems, usdToRmb, usdToEgp, expenses]);

  const filteredLog = useMemo(() => {
    let results = savedMessages;
    if (logSearchQuery) {
        results = savedMessages.filter(m => 
            searchMatch(m.messageName, logSearchQuery) || 
            (m.supplierInvoiceNumber && m.supplierInvoiceNumber.includes(logSearchQuery)) ||
            (m.linkedPurchaseInvoiceId && m.linkedPurchaseInvoiceId.toString().includes(logSearchQuery))
        );
    }
    return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [savedMessages, logSearchQuery]);

  const syncInventoryLogic = (msgItems: ImportItem[], msgExpenses: typeof expenses, msgUsdRmb: number, msgUsdEgp: number, warehouseId: number, suppId: number, dateStr: string, invNo: string, msgName: string, invType: 'cash' | 'credit', existingPurchaseId?: number | string) => {
    let updatedItemsList = [...items];
    let purchaseItems: PurchaseInvoiceItem[] = [];
    
    const msgTotals = getCalculatedTotals(msgItems, msgExpenses, msgUsdRmb, msgUsdEgp);
    const overheadRatio = msgTotals.overheadRatio;
    const rmbToEgp = msgTotals.rmbToEgpValue;

    if (existingPurchaseId) {
        const oldInvoice = purchaseInvoices.find(inv => inv.id === existingPurchaseId);
        if (oldInvoice) {
            oldInvoice.items.forEach(oldItem => {
                const itemIdx = updatedItemsList.findIndex(i => i.id === oldItem.itemId);
                if (itemIdx > -1) {
                    const item = updatedItemsList[itemIdx];
                    const revertedQty = (item.openingBalance || 0) - oldItem.quantity;
                    updatedItemsList[itemIdx] = { ...item, openingBalance: revertedQty };
                }
            });
        }
    }

    msgItems.forEach(importItem => {
        const itemLandedCostEgp = roundTo2((importItem.priceRmb * rmbToEgp) * (1 + overheadRatio));
        const normalizedImportName = normalizeText(importItem.name);
        
        let existingItemInTarget = updatedItemsList.find(i => normalizeText(i.name) === normalizedImportName && i.warehouseId === warehouseId);
        let existingItemAnywhere = updatedItemsList.find(i => normalizeText(i.name) === normalizedImportName);

        let finalItemId: number;

        if (existingItemInTarget) {
            const currentQty = existingItemInTarget.openingBalance || 0;
            const currentCost = existingItemInTarget.purchasePrice || 0;
            const newTotalQty = currentQty + importItem.qty;
            const newPrice = roundTo2(((currentQty * currentCost) + (importItem.qty * itemLandedCostEgp)) / newTotalQty);

            updatedItemsList = updatedItemsList.map(i => 
                i.id === existingItemInTarget!.id ? { ...i, openingBalance: newTotalQty, purchasePrice: newPrice } : i
            );
            finalItemId = existingItemInTarget.id;
        } else if (existingItemAnywhere) {
            finalItemId = Date.now() + Math.floor(Math.random() * 1000);
            updatedItemsList.push({
                ...existingItemAnywhere,
                id: finalItemId,
                warehouseId: warehouseId,
                openingBalance: importItem.qty,
                initialBalance: 0,
                purchasePrice: itemLandedCostEgp,
                lastModifiedBy: currentUser.username,
                lastModifiedAt: new Date().toISOString()
            });
        } else {
            finalItemId = Date.now() + Math.floor(Math.random() * 1000);
            updatedItemsList.push({
                id: finalItemId,
                barcode: importItem.barcode || getNextBarcode(updatedItemsList),
                name: importItem.name.trim(),
                unitId: defaultValues.defaultUnitId,
                warehouseId: warehouseId,
                openingBalance: importItem.qty, 
                initialBalance: 0,
                purchasePrice: itemLandedCostEgp,
                sellPrice: 0, 
                createdBy: "حاسبة الاستيراد",
                createdAt: dateStr
            });
        }
        purchaseItems.push({ itemId: finalItemId, quantity: importItem.qty, price: itemLandedCostEgp });
    });

    const finalInvoiceTotal = roundTo2(purchaseItems.reduce((s, i) => s + (i.price * i.quantity), 0));
    
    let finalizedPurchaseId = existingPurchaseId;
    if (existingPurchaseId) {
        setPurchaseInvoices(prev => prev.map(inv => inv.id === existingPurchaseId ? {
            ...inv,
            date: dateStr,
            supplierId: suppId,
            warehouseId: warehouseId,
            supplierInvoiceNumber: invNo,
            items: purchaseItems,
            paidAmount: finalInvoiceTotal,
            lastModifiedBy: currentUser.username,
            lastModifiedAt: new Date().toISOString()
        } : inv));
    } else {
        const numericIds = purchaseInvoices.map(inv => typeof inv.id === 'number' ? inv.id : 0);
        finalizedPurchaseId = numericIds.length === 0 ? 1 : Math.max(...numericIds) + 1;
        
        const newInvoice: PurchaseInvoice = {
            id: finalizedPurchaseId,
            date: dateStr,
            supplierId: suppId,
            warehouseId: warehouseId,
            supplierInvoiceNumber: invNo,
            permissionNumber: 'رسالة استيرادية',
            items: purchaseItems,
            discount: 0, tax: 0,
            paidAmount: invType === 'cash' ? finalInvoiceTotal : 0,
            notes: `مزامنة من حاسبة الاستيراد: ${msgName}`,
            type: invType,
            createdBy: currentUser.username,
            createdAt: new Date().toISOString()
        };
        setPurchaseInvoices(prev => [...prev, newInvoice]);
    }

    setItems(updatedItemsList);
    return finalizedPurchaseId;
  };

  const handleSaveMessage = () => {
    if (importItems.length === 0) {
      alert("لا يمكن حفظ رسالة فارغة");
      return;
    }

    const existingMsg = currentEditId ? savedMessages.find(m => m.id === currentEditId) : null;
    const isExistingSynced = existingMsg?.status === 'synced';
    const linkedId = existingMsg?.linkedPurchaseInvoiceId;

    let messageName = "";
    if (currentEditId && existingMsg) {
        messageName = existingMsg.messageName;
    } else {
        const input = prompt("أدخل اسماً للرسالة الاستيرادية لحفظها:", `رسالة استيرادية ${new Date().toLocaleDateString('ar-EG')}`);
        if (input === null) return; 
        messageName = input.trim() || `رسالة استيرادية ${new Date().toLocaleDateString('ar-EG')}`;
    }

    let finalLinkedId = linkedId;
    if (isExistingSynced && linkedId) {
        if (confirm("هذه الرسالة تمت مزامنتها مسبقاً مع المخازن. هل تريد تحديث بيانات المخازن وفاتورة الشراء المرتبطة بها؟")) {
             finalLinkedId = syncInventoryLogic(importItems, expenses, usdToRmb, usdToEgp, targetWarehouseId, selectedSupplierId, entryDate, supplierInvoiceNumber, messageName, invoiceType, linkedId);
        }
    }

    const newSave: SavedImport = {
      id: currentEditId || Date.now().toString(),
      timestamp: new Date().toISOString(),
      messageName,
      supplierInvoiceNumber,
      supplierId: selectedSupplierId,
      entryDate,
      warehouseId: targetWarehouseId,
      invoiceType,
      status: isExistingSynced ? 'synced' : 'draft',
      linkedPurchaseInvoiceId: finalLinkedId,
      usdToRmb,
      usdToEgp,
      expenses: { ...expenses },
      items: [...importItems]
    };

    if (currentEditId) {
        setSavedMessages(prev => prev.map(m => m.id === currentEditId ? newSave : m));
    } else {
        setSavedMessages(prev => [newSave, ...prev]);
    }

    showNotification('save');
    resetCalculator();
  };

  const handleSyncToInventory = (msg: SavedImport) => {
    if (msg.status === 'synced') {
        alert("هذه الرسالة تم تحويلها للمخزن بالفعل.");
        return;
    }

    const warehouseName = warehouses.find(w => w.id === msg.warehouseId)?.name || 'المخزن المختار';
    if (!confirm(`سيتم الآن تحويل الرسالة إلى رصيد في "${warehouseName}" وإنشاء فاتورة مشتريات.\nهل تريد المتابعة؟`)) return;

    let suppId = msg.supplierId || 0;
    if (suppId === 0) {
        let importSupp = suppliers.find(s => normalizeText(s.name) === normalizeText('مورد استيراد'));
        if (!importSupp) {
            suppId = Date.now();
            setSuppliers(prev => [...prev, { id: suppId, name: 'مورد استيراد', phone: '-', address: '-', openingBalance: 0, createdBy: 'النظام', createdAt: new Date().toISOString() }]);
        } else suppId = importSupp.id;
    }

    const purchaseId = syncInventoryLogic(msg.items, msg.expenses, msg.usdToRmb, msg.usdToEgp, msg.warehouseId, suppId, msg.entryDate || today, msg.supplierInvoiceNumber || '-', msg.messageName, msg.invoiceType || 'credit', undefined);

    setSavedMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'synced', linkedPurchaseInvoiceId: purchaseId } : m));
    showNotification('save');
    alert(`تم تحويل الرسالة بنجاح وإنشاء فاتورة مشتريات رقم ${purchaseId}`);
  };

  const loadSavedMessage = (msg: SavedImport, viewMode: boolean) => {
    setViewOnly(viewMode);
    setCurrentEditId(msg.id);
    setSupplierInvoiceNumber(msg.supplierInvoiceNumber || '');
    setSelectedSupplierId(msg.supplierId || 0);
    const supp = suppliers.find(s => s.id === msg.supplierId);
    setSupplierSearchQuery(supp ? supp.name : '');
    setTargetWarehouseId(msg.warehouseId);
    setInvoiceType(msg.invoiceType || 'credit');
    setEntryDate(msg.entryDate || today);
    setUsdToRmb(msg.usdToRmb);
    setUsdToEgp(msg.usdToEgp);
    setExpenses(msg.expenses);
    setImportItems(msg.items);
    setIsLogModalOpen(false);
  };

  const deleteSavedMessage = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة من السجل؟")) return;
    setSavedMessages(prev => prev.filter(m => m.id !== id));
    showNotification('delete');
  };

  const resetCalculator = () => {
    setViewOnly(false);
    setCurrentEditId(null);
    setSupplierInvoiceNumber('');
    setSelectedSupplierId(0);
    setSupplierSearchQuery('');
    setTargetWarehouseId(defaultValues.defaultWarehouseId);
    setInvoiceType('credit');
    setEntryDate(today);
    setExpenses({ shipping: 0, customs: 0, clearance: 0, commissions: 0, others: 0 });
    setImportItems([]);
    setNewItem({ name: '', qty: 1, priceRmb: 0, barcode: '' });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = totals.calculatedRows.map((it, idx) => `
        <tr class="border-b">
            <td class="p-2 border border-gray-300 text-center">${idx + 1}</td>
            <td class="p-2 border border-gray-300">${it.name}</td>
            <td class="p-2 border border-gray-300 text-center">${it.qty}</td>
            <td class="p-2 border border-gray-300 text-center">${it.priceRmb.toFixed(2)}</td>
            <td class="p-2 border border-gray-300 text-center">${it.priceEgp.toFixed(2)}</td>
            <td class="p-2 border border-gray-300 text-center">${it.unitShareOfFees.toFixed(2)}</td>
            <td class="p-2 border border-gray-300 text-center">${it.unitLandedCostEgp.toFixed(2)}</td>
            <td class="p-2 border border-gray-300 text-center font-bold">${it.rowTotalEgp.toFixed(2)}</td>
        </tr>
    `).join('');

    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>تحليل تكاليف الاستيراد</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>body { font-family: 'Cairo', sans-serif; padding: 20px; } @page { size: A4 landscape; margin: 0.5in; }</style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="text-center mb-6">
                <h1 class="text-2xl font-bold">${companyData.name}</h1>
                <h2 class="text-xl">تحليل تكلفة الرسالة الاستيرادية</h2>
            </div>
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm border p-4 rounded-lg bg-gray-50">
                <div>المورد: <span class="font-bold">${supplierSearchQuery || 'غير محدد'}</span></div>
                <div>رقم اذن الافراج: <span class="font-bold">${supplierInvoiceNumber || '-'}</span></div>
                <div>التاريخ: <span class="font-bold">${formatDateForDisplay(entryDate)}</span></div>
                <div>سعر الـ USD/RMB: <span class="font-bold">${usdToRmb}</span></div>
                <div>سعر الـ USD/EGP: <span class="font-bold">${usdToEgp}</span></div>
                <div>نسبة المصاريف الإضافية: <span class="font-bold text-red-600">${(totals.overheadRatio * 100).toFixed(2)}%</span></div>
            </div>
            <table class="w-full text-right border-collapse border border-gray-400 text-[10px]">
                <thead><tr class="bg-gray-200">
                    <th class="p-2 border border-gray-400">م</th><th class="p-2 border border-gray-400">الصنف</th><th class="p-2 border border-gray-400">الكمية</th><th class="p-2 border border-gray-400">السعر RMB</th><th class="p-2 border border-gray-400">سعر FOB (ج.م)</th><th class="p-2 border border-gray-400">نصيب الوحدة</th><th class="p-2 border border-gray-400">تكلفة الوحدة نهائي</th><th class="p-2 border border-gray-400">الإجمالي (ج.م)</th>
                </tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <div class="flex justify-end mt-4">
                <div class="w-64 space-y-1 text-sm border p-3 rounded bg-gray-50">
                    <div class="flex justify-between"><span>إجمالي FOB (ج.م):</span><span class="font-bold">${totals.totalFobEgp.toFixed(2)}</span></div>
                    <div class="flex justify-between"><span>إجمالي المصاريف (ج.م):</span><span class="font-bold">${totals.totalAdditionalFees.toFixed(2)}</span></div>
                    <div class="flex justify-between text-lg border-t pt-1 mt-1"><span>الصافي النهائي:</span><span class="font-bold text-blue-700">${totals.grandTotalEgp.toFixed(2)}</span></div>
                </div>
            </div>
        </body></html>
    `);
    printWindow.document.close();
  };

  const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
  const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:border-indigo-600 text-black dark:text-white font-bold text-sm transition-all";
  const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-1 text-xs";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-3"><CalculatorIcon className="w-10 h-10" /> حاسبة تكلفة الاستيراد</h1>
          <div className="flex gap-2">
            <button onClick={() => setIsLogModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-indigo-700 transition-all"><ArchiveIcon className="w-5 h-5"/><span>سجل الرسائل</span></button>
            <button onClick={resetCalculator} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-gray-600 transition-all">رسالة جديدة</button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardClass} lg:col-span-1 space-y-6`}>
              <div className="flex justify-between items-center border-b pb-1 mb-2">
                  <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-400">إعدادات العملة والمورد</h2>
                  <button 
                    onClick={fetchExchangeRates} 
                    disabled={isFetchingRates || viewOnly}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-all disabled:opacity-50"
                    title="تحديث أسعار الصرف الآن"
                  >
                    <RefreshIcon className={`w-5 h-5 ${isFetchingRates ? 'animate-spin' : ''}`} />
                  </button>
              </div>
           
           <div className="space-y-4">
              <div className="relative">
                <label className={labelClass}>المورد (اختياري)</label>
                <div className="relative">
                    <input type="text" value={supplierSearchQuery} onChange={(e) => {setSupplierSearchQuery(e.target.value); setIsSupplierSuggestionsOpen(true);}} onFocus={() => setIsSupplierSuggestionsOpen(true)} onBlur={() => setTimeout(()=>setIsSupplierSuggestionsOpen(false), 200)} placeholder="ابحث..." className={inputClass} disabled={viewOnly} autoComplete="off" />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                </div>
                {isSupplierSuggestionsOpen && (
                    <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg top-full">
                        {suggestedSuppliers.map(s => <li key={s.id} onMouseDown={() => handleSupplierSelect(s)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold border-b last:border-0 dark:text-white">{s.name}</li>)}
                    </ul>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>رقم اذن الافراج</label><input type="text" value={supplierInvoiceNumber} onChange={e => setSupplierInvoiceNumber(e.target.value)} className={inputClass} disabled={viewOnly} /></div>
                  <div><label className={labelClass}>تاريخ التوريد</label><input type="text" {...entryDateInputProps} className={inputClass} disabled={viewOnly} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className={labelClass}>المخزن المستهدف (للمزامنة)</label>
                      <select value={targetWarehouseId} onChange={e => setTargetWarehouseId(Number(e.target.value))} className={inputClass} disabled={viewOnly}>
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className={labelClass}>نوع الفاتورة</label>
                      <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as 'cash' | 'credit')} className={inputClass} disabled={viewOnly}>
                          <option value="credit">آجل (على الحساب)</option>
                          <option value="cash">نقدي (تم السداد)</option>
                      </select>
                  </div>
              </div>
              <hr />
              <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>سعر الصرف (USD/RMB)</label><input type="number" step="0.001" value={usdToRmb} onChange={e => setUsdToRmb(parseFloat(e.target.value) || 0)} className={inputClass} disabled={viewOnly} /></div>
                  <div><label className={labelClass}>سعر الصرف (USD/EGP)</label><input type="number" step="0.01" value={usdToEgp} onChange={e => setUsdToEgp(parseFloat(e.target.value) || 0)} className={inputClass} disabled={viewOnly} /></div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 text-center">
                  <p className="text-xs text-gray-500 font-bold mb-1">سعر التحويل المباشر (RMB/EGP)</p>
                  <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">≈ {totals.rmbToEgp.toFixed(4)}</p>
              </div>
           </div>
        </div>

        <div className={`${cardClass} lg:col-span-2 space-y-6`}>
           <h2 className="text-xl font-bold border-b pb-2 mb-4 text-indigo-700 dark:text-indigo-400">المصاريف الإضافية (بالجنيه المصري)</h2>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><label className={labelClass}>نولون الشحن</label><input type="number" name="shipping" value={expenses.shipping} onChange={handleExpenseChange} className={inputClass} disabled={viewOnly} /></div>
              <div><label className={labelClass}>جمارك</label><input type="number" name="customs" value={expenses.customs} onChange={handleExpenseChange} className={inputClass} disabled={viewOnly} /></div>
              <div><label className={labelClass}>تخليص ومصاريف ميناء</label><input type="number" name="clearance" value={expenses.clearance} onChange={handleExpenseChange} className={inputClass} disabled={viewOnly} /></div>
              <div><label className={labelClass}>عمولات ومصاريف بنكية</label><input type="number" name="commissions" value={expenses.commissions} onChange={handleExpenseChange} className={inputClass} disabled={viewOnly} /></div>
              <div><label className={labelClass}>مصاريف أخرى</label><input type="number" name="others" value={expenses.others} onChange={handleExpenseChange} className={inputClass} disabled={viewOnly} /></div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 text-center flex flex-col justify-center">
                  <p className="text-xs text-gray-500 font-bold mb-1">إجمالي الإضافات</p>
                  <p className="text-xl font-black text-red-700 dark:text-red-300"><FormattedNumber value={totals.totalAdditionalFees} /></p>
              </div>
           </div>
           <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                    💡 نسبة التحميل الإضافية: <span className="font-black">{(totals.overheadRatio * 100).toFixed(2)}%</span> من قيمة الـ FOB
                </p>
           </div>
        </div>
      </div>

      <div className={cardClass}>
          <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-400">قائمة الأصناف</h2>
          
          {!viewOnly && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 items-end bg-black/5 p-4 rounded-xl relative z-30">
                <div className="md:col-span-5 relative">
                    <label className={labelClass}>اسم الصنف</label>
                    <input ref={itemNameRef} type="text" value={newItem.name} onChange={e => { setNewItem({...newItem, name: e.target.value}); setIsItemSuggestionsOpen(true); }} onFocus={()=>setIsItemSuggestionsOpen(true)} onBlur={()=>setTimeout(()=>setIsItemSuggestionsOpen(false), 200)} placeholder="اكتب اسم الصنف..." className={inputClass} autoComplete="off" />
                    {isItemSuggestionsOpen && suggestedItems.length > 0 && (
                        <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border-2 border-indigo-300 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-2xl top-full">
                            {suggestedItems.map(item => <li key={item.id} onMouseDown={() => setNewItem({ ...newItem, name: item.name, barcode: item.barcode })} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer font-bold border-b last:border-0 dark:text-white text-sm">{item.name}</li>)}
                        </ul>
                    )}
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>الكمية</label>
                    <input type="number" min="1" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: parseInt(e.target.value) || 0})} className={inputClass} />
                </div>
                <div className="md:col-span-3">
                    <label className={labelClass}>السعر بالـ RMB</label>
                    <input type="number" step="0.01" value={newItem.priceRmb} onChange={e => setNewItem({...newItem, priceRmb: parseFloat(e.target.value) || 0})} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                    <button onClick={addItem} className="w-full bg-indigo-600 text-white font-bold h-11 rounded-lg shadow hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all"><PlusCircleIcon className="w-5 h-5 ml-0" /><span>إضافة</span></button>
                </div>
            </div>
          )}

          <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-right border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-800 font-bold">
                      <tr>
                          <th className="p-3 border text-xs font-bold">اسم الصنف</th>
                          <th className="p-3 border text-xs font-bold text-center">الكمية</th>
                          <th className="p-3 border text-xs font-bold text-center">السعر RMB</th>
                          <th className="p-3 border text-xs font-bold text-center">سعر FOB (ج.م)</th>
                          <th className="p-3 border text-xs font-bold text-center">نصيب الوحدة</th>
                          <th className="p-3 border text-xs font-bold text-center bg-indigo-50 dark:bg-indigo-900/30">تكلفة الوحدة نهائي</th>
                          <th className="p-3 border text-xs font-bold text-center">إجمالي (ج.م)</th>
                          {!viewOnly && <th className="p-3 border text-xs font-bold text-center">حذف</th>}
                      </tr>
                  </thead>
                  <tbody>
                      {totals.calculatedRows.map(it => (
                          <tr key={it.id} className="border-b hover:bg-gray-50 transition-colors font-bold">
                              <td className="p-3 border font-bold text-gray-800 dark:text-gray-200">{it.name}</td>
                              <td className="p-3 border text-center font-mono">{it.qty}</td>
                              <td className="p-3 border text-center font-mono">{it.priceRmb.toFixed(2)}</td>
                              <td className="p-3 border text-center font-mono text-gray-500">{it.priceEgp.toFixed(2)}</td>
                              <td className="p-3 border text-center font-mono text-red-500">{it.unitShareOfFees.toFixed(2)}</td>
                              <td className="p-3 border text-center font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-900/10">{it.unitLandedCostEgp.toFixed(2)}</td>
                              <td className="p-3 border text-center font-bold"><FormattedNumber value={it.rowTotalEgp} /></td>
                              {!viewOnly && <td className="p-3 border text-center"><button onClick={() => removeItem(it.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><DeleteIcon /></button></td>}
                          </tr>
                      ))}
                      {importItems.length === 0 && (
                          <tr><td colSpan={8} className="p-10 text-center text-gray-400 italic">أضف أصنافاً للبدء في التحليل...</td></tr>
                      )}
                  </tbody>
                  {importItems.length > 0 && (
                      <tfoot className="bg-gray-50 dark:bg-gray-900 font-black border-t-2">
                          <tr>
                              <td className="p-3 border text-center">الإجمالي الكلي</td>
                              <td className="p-3 border text-center">{importItems.reduce((s,i)=>s+i.qty,0)}</td>
                              <td className="p-3 border text-center text-blue-600 font-mono">{totals.totalRmb.toFixed(2)} RMB</td>
                              <td className="p-3 border text-center font-mono"><FormattedNumber value={totals.totalFobEgp} /></td>
                              <td className="p-3 border text-center text-red-600"><FormattedNumber value={totals.totalAdditionalFees} /></td>
                              <td className="p-3 border bg-indigo-100 dark:bg-indigo-900/50" colSpan={2}>
                                  <div className="flex justify-between items-center px-4">
                                      <span className="text-indigo-800 dark:text-indigo-200">صافي تكلفة الرسالة:</span>
                                      <span className="text-2xl text-indigo-700 dark:text-indigo-300"><FormattedNumber value={totals.grandTotalEgp} /> ج.م</span>
                                  </div>
                              </td>
                              {!viewOnly && <td className="p-3 border"></td>}
                          </tr>
                      </tfoot>
                  )}
              </table>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
              <div className="flex gap-2">
                <button onClick={handlePrint} disabled={importItems.length === 0} className="flex items-center gap-2 bg-gray-700 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-gray-800 disabled:opacity-50 transition-all"><PrintIcon className="w-5 h-5"/><span>طباعة التحليل</span></button>
                
                {viewOnly ? (
                  // FIX: Replaced undefined setViewMode with correct setter setViewOnly
                  <button onClick={() => setViewOnly(false)} className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-blue-700 transition-all"><EditIcon className="w-5 h-5"/><span>تعديل البيانات</span></button>
                ) : (
                  <button onClick={handleSaveMessage} className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-green-700 transition-all"><ArchiveIcon className="w-5 h-5"/><span>{currentEditId ? 'تحديث الرسالة المحفوظة' : 'حفظ الرسالة في السجل'}</span></button>
                )}
              </div>
          </div>
      </div>

      {/* History Log Modal */}
      <Modal title="سجل الرسائل الاستيرادية" show={isLogModalOpen} onClose={() => setIsLogModalOpen(false)}>
          <div className="space-y-4">
              <input type="text" value={logSearchQuery} onChange={e => setLogSearchQuery(e.target.value)} placeholder="بحث باسم الرسالة أو رقم اذن الافراج..." className={inputClass} />
              <div className="overflow-auto max-h-[60vh] border rounded-lg">
                  <table className="w-full text-right border-collapse">
                      <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 font-bold">
                          <tr>
                              <th className="p-3 border text-sm font-bold">اسم الرسالة</th>
                              <th className="p-3 border text-sm font-bold text-center">التاريخ</th>
                              <th className="p-3 border text-sm font-bold text-center">الأصناف</th>
                              <th className="p-3 border text-sm font-bold text-center">الإجمالي (ج.م)</th>
                              <th className="p-3 border text-sm font-bold text-center">الحالة</th>
                              <th className="p-3 border text-sm font-bold text-center">إجراءات</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredLog.map(msg => (
                              <tr key={msg.id} className="border-b hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors font-bold">
                                  <td className="p-3 border font-bold text-gray-800 dark:text-gray-200">{msg.messageName}</td>
                                  <td className="p-3 border text-center text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString('ar-EG')}</td>
                                  <td className="p-3 border text-center font-bold text-blue-600">{msg.items.length}</td>
                                  <td className="p-3 border text-center font-bold text-indigo-700 dark:text-indigo-300">
                                      <FormattedNumber value={getCalculatedTotals(msg.items, msg.expenses, msg.usdToRmb, msg.usdToEgp).grandTotalEgp} />
                                  </td>
                                  <td className="p-3 border text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${msg.status === 'synced' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                          {msg.status === 'synced' ? 'مُحول للمخزن' : 'مسودة'}
                                      </span>
                                  </td>
                                  <td className="p-3 border text-center">
                                      <div className="flex justify-center gap-2">
                                          <button onClick={() => loadSavedMessage(msg, true)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-all" title="عرض"><ViewIcon /></button>
                                          <button onClick={() => loadSavedMessage(msg, false)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full transition-all" title="تعديل واستعادة"><EditIcon /></button>
                                          {msg.status !== 'synced' && (
                                              <button onClick={() => handleSyncToInventory(msg)} className="p-1.5 text-green-600 hover:bg-green-100 rounded-full transition-all" title="تحويل للأرصدة والمخازن"><SwitchHorizontalIcon className="w-5 h-5 ml-0 rotate-90" /></button>
                                          )}
                                          <button onClick={() => deleteSavedMessage(msg.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-full transition-all" title="حذف من السجل"><DeleteIcon /></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredLog.length === 0 && (
                              <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">السجل فارغ...</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default ImportCostCalculator;