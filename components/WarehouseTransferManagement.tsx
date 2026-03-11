
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { WarehouseTransfer, WarehouseTransferItem, Item, Warehouse, NotificationType, MgmtUser, Unit, SalesInvoice, SalesReturn, PurchaseInvoice, PurchaseReturn } from '../types';
import { Modal, ConfirmationModal, PlusCircleIcon, DeleteIcon, EditIcon, PrintIcon, ViewIcon, ChevronDownIcon, FormattedNumber, ArchiveIcon, SwitchHorizontalIcon, WhatsAppIcon } from './Shared';
import QuickAddItemModal from './QuickAddItemModal';
import { searchMatch, formatDateForDisplay } from '../utils';
import { useDateInput } from '../hooks/useDateInput';

interface WarehouseTransferManagementProps {
    warehouseTransfers: WarehouseTransfer[];
    setWarehouseTransfers: React.Dispatch<React.SetStateAction<WarehouseTransfer[]>>;
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    warehouses: Warehouse[];
    units: Unit[];
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
    draft: any;
    setDraft: React.Dispatch<React.SetStateAction<any>>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    // Added missing props
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    defaultValues: any;
}

const WarehouseTransferManagement: React.FC<WarehouseTransferManagementProps> = ({
    warehouseTransfers,
    setWarehouseTransfers,
    items,
    setItems,
    warehouses,
    units,
    showNotification,
    currentUser,
    draft, setDraft, isEditing, setIsEditing,
    // Added missing props to destructuring
    salesInvoices, salesReturns, purchaseInvoices, purchaseReturns, defaultValues
}) => {
    
    const getNextTransferId = () => {
        if (warehouseTransfers.length === 0) return 1;
        const ids = warehouseTransfers.map(t => t.id).filter(id => !isNaN(id));
        return ids.length > 0 ? Math.max(...ids) + 1 : 1;
    };
    
    const initialTransferState = {
        id: null,
        date: new Date().toISOString().split('T')[0],
        fromWarehouseId: 0,
        toWarehouseId: 0,
        items: [],
        notes: '',
    };

    const newTransfer = draft || { ...initialTransferState, id: getNextTransferId() };
    
    const setNewTransfer = (action: any) => {
        if (typeof action === 'function') {
            setDraft(prev => action(prev || { ...initialTransferState, id: getNextTransferId() }));
        } else {
            setDraft(action);
        }
    };

    const [currentItemSelection, setCurrentItemSelection] = useState({ itemId: 0, quantity: 1 });
    const [isViewing, setIsViewing] = useState(false);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [isItemSuggestionsOpen, setIsItemSuggestionsOpen] = useState(false);
    const [logViewMode, setLogViewMode] = useState<'summary' | 'detailed'>('summary');
    
    // Log Search Filters
    const [logFilters, setLogFilters] = useState({
        date: '',
        itemName: '',
        warehouseName: ''
    });
    
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const itemSearchInputRef = useRef<HTMLInputElement>(null);

    const dateInputProps = useDateInput(newTransfer.date, (d) => setNewTransfer((prev: any) => ({ ...prev, date: d })));

    const getAvailableStock = (itemId: number) => {
        const item = items.find(i => i.id === itemId);
        return item ? item.openingBalance : 0;
    };

    const availableItems = useMemo(() => {
        if (!newTransfer.fromWarehouseId) return [];
        return items.filter(item => item.warehouseId === newTransfer.fromWarehouseId && item.openingBalance > 0);
    }, [items, newTransfer.fromWarehouseId]);
    
    const suggestedItems = useMemo(() => {
        const unselectedItems = availableItems.filter(item => 
            !newTransfer.items.some((transferItem: any) => transferItem.itemId === item.id)
        );
        if (!itemSearchQuery) return unselectedItems;
        const trimmedQuery = itemSearchQuery.trim();
        return unselectedItems.filter(item => 
            item.barcode === trimmedQuery || searchMatch(item.name, itemSearchQuery)
        );
    }, [itemSearchQuery, availableItems, newTransfer.items]);

    const resetForm = () => {
        setDraft(null);
        setIsEditing(false);
        setIsViewing(false);
        setCurrentItemSelection({ itemId: 0, quantity: 1 });
        setItemSearchQuery('');
    };

    const handleAddItemClick = () => {
        if (!currentItemSelection.itemId || currentItemSelection.quantity <= 0) {
            alert("يرجى اختيار صنف وكمية صالحة.");
            return;
        }
        const itemToAdd = items.find(i => i.id === currentItemSelection.itemId);
        if (!itemToAdd) return;
        
        if (newTransfer.items.some((i: any) => i.itemId === itemToAdd.id)) {
            alert("الصنف مضاف بالفعل.");
            return;
        }

        if (currentItemSelection.quantity > itemToAdd.openingBalance) {
            alert(`الكمية المطلوبة (${currentItemSelection.quantity}) أكبر من الرصيد المتاح (${itemToAdd.openingBalance}).`);
            return;
        }

        const newItem: WarehouseTransferItem = { 
            itemId: itemToAdd.id, 
            quantity: currentItemSelection.quantity
        };
        setNewTransfer((prev: any) => ({ ...prev, items: [...prev.items, newItem] }));
        setCurrentItemSelection({ itemId: 0, quantity: 1 });
        setItemSearchQuery('');
        itemSearchInputRef.current?.focus();
    };

    const handleRemoveItem = (itemId: number) => {
        setNewTransfer((prev: any) => ({ ...prev, items: prev.items.filter((i: any) => i.itemId !== itemId) }));
    };

    const handleSaveTransfer = () => {
        if (isViewing) return;
        if (!newTransfer.fromWarehouseId || !newTransfer.toWarehouseId || newTransfer.items.length === 0) {
            alert("يرجى اختيار المخازن وإضافة صنف واحد على الأقل.");
            return;
        }
        if (newTransfer.fromWarehouseId === newTransfer.toWarehouseId) {
            alert("لا يمكن التحويل لنفس المخزن.");
            return;
        }
        
        let updatedItems = [...items];

        for (const transferItem of newTransfer.items) {
            const fromItemIndex = updatedItems.findIndex(i => i.id === transferItem.itemId);
            if (fromItemIndex !== -1) {
                updatedItems[fromItemIndex] = { ...updatedItems[fromItemIndex], openingBalance: updatedItems[fromItemIndex].openingBalance - transferItem.quantity };
            }
            
            const originalItem = items.find(i => i.id === transferItem.itemId);
            if(originalItem) {
                const toItemIndex = updatedItems.findIndex(i => i.barcode === originalItem.barcode && i.warehouseId === newTransfer.toWarehouseId);
                if (toItemIndex !== -1) {
                    updatedItems[toItemIndex] = { ...updatedItems[toItemIndex], openingBalance: updatedItems[toItemIndex].openingBalance + transferItem.quantity };
                } else {
                    const newItemEntry: Item = {
                        ...originalItem,
                        id: Math.floor(Date.now() + Math.random() * 10000), 
                        warehouseId: newTransfer.toWarehouseId,
                        openingBalance: transferItem.quantity,
                    };
                    updatedItems.push(newItemEntry);
                }
            }
        }

        setItems(updatedItems);
        const createdTransfer = { ...newTransfer, id: newTransfer.id, createdBy: currentUser.username, createdAt: new Date().toISOString() };
        setWarehouseTransfers(prev => [...prev, createdTransfer]);
        showNotification('add');
        window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإنشاء تحويل مخزني رقم ${createdTransfer.id} من مخزن ${warehouses.find(w => w.id === createdTransfer.fromWarehouseId)?.name || ''} إلى مخزن ${warehouses.find(w => w.id === createdTransfer.toWarehouseId)?.name || ''}` }));
        resetForm();
    };

    const handlePrint = (transfer: WarehouseTransfer) => {
        const fromWh = warehouses.find(w => w.id === transfer.fromWarehouseId)?.name;
        const toWh = warehouses.find(w => w.id === transfer.toWarehouseId)?.name;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const rows = transfer.items.map((transferItem, index) => {
            const itemData = items.find(i => i.id === transferItem.itemId);
            return `<tr><td class="p-3 border text-center">${index + 1}</td><td class="p-3 border text-center font-mono">${itemData?.barcode || '-'}</td><td class="p-3 border text-right">${itemData?.name || 'صنف'}</td><td class="p-3 border text-center font-bold">${transferItem.quantity}</td></tr>`;
        }).join('');

        printWindow.document.write(`<html dir="rtl"><head><title>إذن تحويل #${transfer.id}</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet"><style>body { font-family: 'Cairo', sans-serif; margin: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #d1d5db; padding: 0.75rem; } thead { background-color: #1f2937; color: #ffffff; }</style></head><body onload="window.print();window.close()"><div class="container"><div class="header" style="text-align:center;"><h1>إذن تحويل مخزني</h1><p>رقم الإذن: ${transfer.id} | التاريخ: ${new Date(transfer.date).toLocaleDateString('ar-EG')}</p></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;padding:1rem;background-color:#f9fafb;border:1 solid #e5e7eb;border-radius:0.5rem;"><p><strong>من مخزن:</strong> ${fromWh}</p><p><strong>إلى مخزن:</strong> ${toWh}</p><p><strong>تم بواسطة:</strong> ${transfer.createdBy}</p></div><table><thead><tr><th>#</th><th>الباركود</th><th class="text-right">اسم الصنف</th><th>الكمية المحولة</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`);
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const compactCardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-4 border border-white/40 dark:bg-gray-700/30 dark:border-white/20 w-full"; 
    const inputClass = "h-11 w-full px-4 py-2 bg-white dark:bg-gray-800 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-black dark:text-white font-bold placeholder-gray-500 transition-all duration-200 disabled:opacity-70 text-base";
    const labelClass = "block text-black dark:text-gray-200 font-bold mb-1 text-sm";
    const filterInputClass = "h-9 w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:text-white";

    const totalQtyInDraft = useMemo(() => newTransfer.items.reduce((s: number, i: any) => s + i.quantity, 0), [newTransfer.items]);

    // Filtering logic for the transfer log
    const filteredTransfers = useMemo(() => {
        return warehouseTransfers.filter(t => {
            const fromWhName = warehouses.find(w => w.id === t.fromWarehouseId)?.name || '';
            const toWhName = warehouses.find(w => w.id === t.toWarehouseId)?.name || '';
            
            // Check Item Name or Barcode in items array
            const matchesItem = !logFilters.itemName || t.items.some(ti => {
                const itemData = items.find(i => i.id === ti.itemId);
                return itemData && (searchMatch(itemData.name, logFilters.itemName) || itemData.barcode === logFilters.itemName.trim());
            });

            return (
                (!logFilters.date || t.date.includes(logFilters.date)) &&
                (!logFilters.warehouseName || searchMatch(fromWhName, logFilters.warehouseName) || searchMatch(toWhName, logFilters.warehouseName)) &&
                matchesItem
            );
        }).slice().reverse();
    }, [warehouseTransfers, logFilters, warehouses, items]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                <div className={`${cardClass} lg:col-span-9 pb-10`}>
                    <div className="flex justify-between items-center mb-6 border-b border-indigo-100 dark:border-indigo-900 pb-3">
                        <h1 className="text-2xl font-bold text-indigo-800 dark:text-indigo-300">
                            {isViewing ? 'عرض تفاصيل التحويل' : 'إنشاء تحويل مخزني جديد'}
                        </h1>
                        <div className="bg-indigo-100 dark:bg-indigo-900/50 px-4 py-1 rounded-full border border-indigo-200">
                             <span className="text-xl font-black text-indigo-700 dark:text-indigo-300">رقم الإذن: {newTransfer.id}</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                            <div>
                                <label className={labelClass}>التاريخ</label>
                                <input type="text" {...dateInputProps} className={inputClass} disabled={isViewing} />
                            </div>
                            <div>
                                <label className={labelClass}>من مخزن (المصدر)</label>
                                <select value={newTransfer.fromWarehouseId} onChange={(e) => setNewTransfer((p: any) => ({ ...p, fromWarehouseId: +e.target.value, items: [] }))} className={inputClass} disabled={isViewing || newTransfer.items.length > 0}>
                                    <option value={0}>اختر مخزن المصدر...</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>إلى مخزن (الوجهة)</label>
                                <select value={newTransfer.toWarehouseId} onChange={(e) => setNewTransfer((p: any) => ({ ...p, toWarehouseId: +e.target.value }))} className={inputClass} disabled={isViewing}>
                                    <option value={0}>اختر مخزن الوجهة...</option>
                                    {warehouses.filter(w => w.id !== newTransfer.fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {!isViewing && (
                            <div className="relative">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/30 dark:bg-indigo-900/5 mt-2 pb-12">
                                    <div className="md:col-span-7 relative">
                                        <label className={labelClass}>بحث عن صنف في المصدر</label>
                                        <div className="relative">
                                            <input ref={itemSearchInputRef} type="text" value={itemSearchQuery} onChange={(e) => { setItemSearchQuery(e.target.value); setIsItemSuggestionsOpen(true); }} onFocus={() => setIsItemSuggestionsOpen(true)} onBlur={() => {
                                                setTimeout(() => {
                                                    if (isItemSuggestionsOpen && suggestedItems.length > 0 && itemSearchQuery) {
                                                        setCurrentItemSelection({ itemId: suggestedItems[0].id, quantity: 1 }); 
                                                        setItemSearchQuery(suggestedItems[0].name);
                                                    }
                                                    setIsItemSuggestionsOpen(false);
                                                }, 250);
                                            }} placeholder={newTransfer.fromWarehouseId ? "الاسم أو الباركود..." : "اختر مخزن المصدر أولاً"} disabled={!newTransfer.fromWarehouseId} className={inputClass} autoComplete="off" />
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                                        </div>
                                        {isItemSuggestionsOpen && suggestedItems.length > 0 && (
                                            <ul className="absolute z-[100] w-full bg-white dark:bg-gray-800 border-2 border-indigo-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-2xl top-full">
                                                {suggestedItems.map(item => (
                                                    <li key={item.id} onMouseDown={() => { setCurrentItemSelection({ itemId: item.id, quantity: 1 }); setItemSearchQuery(item.name); setIsItemSuggestionsOpen(false); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer flex justify-between font-bold border-b last:border-0 dark:text-white">
                                                        <span>{item.name}</span>
                                                        <span className="text-indigo-600 dark:text-indigo-400">المتاح: {item.openingBalance}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {currentItemSelection.itemId > 0 && (
                                            <div className="absolute top-full right-0 text-sm font-black mt-1 whitespace-nowrap z-0">
                                                <span className="text-red-800 dark:text-red-400">{warehouses.find(w => w.id === newTransfer.fromWarehouseId)?.name}</span>
                                                <span className="mx-2 text-gray-500">-</span>
                                                <span className="text-blue-800 dark:text-blue-400">المتاح: <span className="font-mono">{getAvailableStock(currentItemSelection.itemId)}</span></span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className={labelClass}>الكمية</label>
                                        <input ref={quantityInputRef} type="number" min="1" value={currentItemSelection.quantity} onChange={(e) => setCurrentItemSelection(prev => ({ ...prev, quantity: Math.max(1, +e.target.value) }))} className={inputClass} disabled={!currentItemSelection.itemId} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="h-6"></div>
                                        <button onClick={handleAddItemClick} disabled={!currentItemSelection.itemId} className="w-full bg-indigo-600 text-white font-bold h-11 rounded-lg shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all">
                                            <PlusCircleIcon className="h-5 w-5" />
                                            <span>إضافة</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto border-2 border-indigo-100 dark:border-indigo-900 rounded-xl overflow-hidden shadow-inner">
                            <table className="w-full text-right table-fixed">
                                <thead className="bg-indigo-50 dark:bg-indigo-900/40">
                                    <tr>
                                        <th className="p-3 text-xs font-bold w-24 text-center">الباركود</th>
                                        <th className="p-3 text-xs font-bold">اسم الصنف المحول</th>
                                        <th className="p-3 text-xs font-bold text-center w-28">الكمية</th>
                                        <th className="p-3 text-xs font-bold text-center w-24">المتبقي</th>
                                        {!isViewing && <th className="p-3 text-xs font-bold text-center w-16">حذف</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {newTransfer.items.map((item: any) => {
                                        const itemData = items.find(i => i.id === item.itemId);
                                        const sourceStock = getAvailableStock(item.itemId);
                                        const remaining = sourceStock - item.quantity;
                                        return (
                                            <tr key={item.itemId} className="border-t border-indigo-50 dark:border-indigo-900 hover:bg-indigo-50/20 transition-colors">
                                                <td className="p-3 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{itemData?.barcode || '-'}</td>
                                                <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{itemData?.name || 'صنف غير معروف'}</td>
                                                <td className="p-3 text-center">
                                                    {!isViewing ? (
                                                        <input type="number" min="1" value={item.quantity} onChange={(e) => {
                                                            const val = Math.max(1, +e.target.value);
                                                            if (val > sourceStock) { alert(`الكمية المتاحة ${sourceStock} فقط`); return; }
                                                            setNewTransfer((p: any) => ({ ...p, items: p.items.map((i: any) => i.itemId === item.itemId ? { ...i, quantity: val } : i) }));
                                                        }} className="w-full text-center border-2 border-indigo-200 rounded font-bold dark:bg-gray-700" />
                                                    ) : (
                                                        <span className="font-bold text-indigo-700 dark:text-indigo-400 text-lg">{item.quantity}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`font-mono text-sm ${remaining < 0 ? 'text-red-500' : 'text-gray-400'}`}>{remaining}</span>
                                                </td>
                                                {!isViewing && (
                                                    <td className="p-3 text-center">
                                                        <button onClick={() => handleRemoveItem(item.itemId)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                                            <DeleteIcon />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {newTransfer.items.length === 0 && (
                                        <tr>
                                            <td colSpan={isViewing ? 4 : 5} className="p-10 text-center text-gray-400 font-bold italic">يرجى إضافة أصناف للتحويل...</td>
                                        </tr>
                                    )}
                                </tbody>
                                {newTransfer.items.length > 0 && (
                                    <tfoot className="bg-indigo-50/50 dark:bg-indigo-900/20 font-black border-t-2 border-indigo-100">
                                        <tr>
                                            <td className="p-3 text-center text-gray-500 text-xs">إجمالي</td>
                                            <td className="p-3 text-indigo-800 dark:text-indigo-300">{newTransfer.items.length} صنف</td>
                                            <td className="p-3 text-center text-indigo-700 dark:text-indigo-300 text-lg">{totalQtyInDraft}</td>
                                            <td colSpan={isViewing ? 1 : 2}></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        <div>
                            <label className={labelClass}>ملاحظات أو بيان التحويل</label>
                            <textarea value={newTransfer.notes || ''} onChange={(e) => setNewTransfer((p: any) => ({ ...p, notes: e.target.value }))} className={`${inputClass} h-20 resize-none`} placeholder="أدخل أي تفاصيل إضافية هنا..." disabled={isViewing}></textarea>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <div className={compactCardClass}>
                        <h2 className="font-bold text-lg mb-4 text-indigo-800 dark:text-indigo-300 border-b pb-2 text-center">ملخص العملية</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">عدد الأصناف:</span>
                                <span className="font-black text-indigo-700 dark:text-indigo-300">{newTransfer.items.length}</span>
                            </div>
                            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">إجمالي القطع:</span>
                                <span className="font-black text-indigo-700 dark:text-indigo-300">{totalQtyInDraft}</span>
                            </div>
                            
                            {!isViewing && (
                                <button onClick={handleSaveTransfer} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transform hover:-translate-y-1 transition-all">
                                    <SwitchHorizontalIcon className="h-6 w-6" />
                                    <span>حفظ وتأكيد التحويل</span>
                                </button>
                            )}
                            {(isEditing || isViewing) && (
                                <button onClick={resetForm} className="w-full bg-gray-500 text-white font-bold py-3 rounded-xl shadow hover:bg-gray-600 transition-all">
                                    إلغاء / جديد
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                        <h3 className="text-amber-800 dark:text-amber-300 font-bold mb-2 flex items-center gap-2">
                            <ArchiveIcon className="h-5 w-5" />
                            <span>ملاحظة فنية</span>
                        </h3>
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-bold">
                            التحويل المخزني يقوم بخصم الكمية من المخزن المصدر وإضافتها لمخزن الوجهة فور التأكيد.
                        </p>
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-indigo-100 dark:border-indigo-900 pb-3 gap-4">
                    <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-300">سجل التحويلات السابقة</h2>
                    <div className="flex bg-indigo-50 dark:bg-indigo-900/30 p-1 rounded-lg border border-indigo-100">
                        <button 
                            onClick={() => setLogViewMode('summary')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${logViewMode === 'summary' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'}`}
                        >
                            عرض إجمالي
                        </button>
                        <button 
                            onClick={() => setLogViewMode('detailed')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${logViewMode === 'detailed' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'}`}
                        >
                            عرض تفصيلي
                        </button>
                    </div>
                </div>
                
                {/* Log Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-black/5 dark:bg-white/5 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                    <div>
                        <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">بحث بالتاريخ</label>
                        <input type="text" placeholder="يوم-شهر-سنة" className={filterInputClass} value={logFilters.date} onChange={e => setLogFilters({...logFilters, date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">بحث بالأصناف (اسم/باركود)</label>
                        <input type="text" placeholder="اسم الصنف أو الباركود..." className={filterInputClass} value={logFilters.itemName} onChange={e => setLogFilters({...logFilters, itemName: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold mb-1 dark:text-gray-400">بحث بالمخازن</label>
                        <input type="text" placeholder="اسم مخزن المصدر أو الوجهة..." className={filterInputClass} value={logFilters.warehouseName} onChange={e => setLogFilters({...logFilters, warehouseName: e.target.value})} />
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={() => setLogFilters({ date: '', itemName: '', warehouseName: '' })}
                            className="w-full h-9 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white text-xs font-bold rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center justify-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>تفريغ البحث</span>
                        </button>
                    </div>
                </div>
                
                <div className="overflow-auto relative max-h-[60vh] border border-indigo-100 dark:border-indigo-900 rounded-xl shadow-inner">
                    <table className="w-full text-right border-collapse">
                        <thead className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-800">
                            <tr className="text-gray-700 dark:text-gray-300 shadow-sm">
                                <th className="p-3 border-b-2 border-indigo-200 dark:border-indigo-900 w-24 text-center">رقم الإذن</th>
                                <th className="p-3 border-b-2 border-indigo-200 dark:border-indigo-900 text-center w-32">التاريخ</th>
                                <th className="p-3 border-b-2 border-indigo-200 dark:border-indigo-900">من مخزن</th>
                                <th className="p-3 border-b-2 border-indigo-200 dark:border-indigo-900">إلى مخزن</th>
                                <th className="p-3 border-b-2 border-indigo-200 dark:border-indigo-900">الأصناف</th>
                                <th className="p-3 border-b-2 border-indigo-200 dark:border-indigo-900 text-center w-24">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransfers.map((t) => {
                                const fromWh = warehouses.find(w => w.id === t.fromWarehouseId)?.name || '-';
                                const toWh = warehouses.find(w => w.id === t.toWarehouseId)?.name || '-';
                                return (
                                    <tr key={t.id} className="border-b border-indigo-50 dark:border-indigo-900 hover:bg-indigo-50/30 transition-colors">
                                        <td className="p-3 text-center font-bold text-indigo-700 dark:text-indigo-400">{t.id}</td>
                                        <td className="p-3 text-center text-gray-600 dark:text-gray-400 text-xs">{formatDateForDisplay(t.date)}</td>
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{fromWh}</td>
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{toWh}</td>
                                        <td className="p-3">
                                            {logViewMode === 'summary' ? (
                                                <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full text-[10px] font-black">
                                                    إجمالي {t.items.length} أصناف
                                                </span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {t.items.map((it, idx) => {
                                                        const itemData = items.find(i => i.id === it.itemId);
                                                        return (
                                                            <span key={idx} className="bg-white dark:bg-gray-700 border border-indigo-100 dark:border-indigo-900 text-[10px] px-2 py-0.5 rounded shadow-sm text-gray-700 dark:text-gray-300">
                                                                {itemData?.name} <span className="font-bold text-indigo-600">({it.quantity})</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setDraft(t); setIsViewing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors" title="عرض">
                                                    <ViewIcon />
                                                </button>
                                                <button onClick={() => handlePrint(t)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="طباعة">
                                                    <PrintIcon />
                                                </button>
                                                <button onClick={() => {
                                                    const fromWh = warehouses.find(w => w.id === t.fromWarehouseId)?.name || '-';
                                                    const toWh = warehouses.find(w => w.id === t.toWarehouseId)?.name || '-';
                                                    const text = `إذن تحويل مخزني رقم: ${t.id}%0Aالتاريخ: ${formatDateForDisplay(t.date)}%0Aمن: ${fromWh}%0Aإلى: ${toWh}%0Aعدد الأصناف: ${t.items.length}${defaultValues.whatsappFooter ? '%0A' + encodeURIComponent(defaultValues.whatsappFooter) : ''}`;
                                                    window.open(`https://wa.me/?text=${text}`, '_blank');
                                                }} className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors" title="واتساب"><WhatsAppIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTransfers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 italic">لا توجد عمليات تحويل مطابقة للبحث.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WarehouseTransferManagement;
