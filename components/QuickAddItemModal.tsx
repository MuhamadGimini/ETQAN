
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ChevronDownIcon } from './Shared';
import type { Item, Unit, Warehouse, MgmtUser } from '../types';
import { normalizeText, getNextBarcode } from '../utils';

interface QuickAddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemAdded: (newItem: Item) => void;
    items: Item[];
    units: Unit[];
    warehouses: Warehouse[];
    defaultWarehouseId: number;
    defaultUnitId?: number;
    currentUser: MgmtUser;
}

const QuickAddItemModal: React.FC<QuickAddItemModalProps> = ({
    isOpen,
    onClose,
    onItemAdded,
    items,
    units,
    warehouses,
    defaultWarehouseId,
    defaultUnitId,
    currentUser,
}) => {
    const initialFormState = {
        name: '',
        unitId: defaultUnitId || (units && units[0]?.id) || 0,
        warehouseId: defaultWarehouseId,
        purchasePrice: NaN,
        sellPrice: NaN,
        openingBalance: 0,
    };

    const [newItemData, setNewItemData] = useState(initialFormState);
    
    // Search States
    const [unitSearchQuery, setUnitSearchQuery] = useState('');
    const [isUnitSuggestionsOpen, setIsUnitSuggestionsOpen] = useState(false);
    const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
    const [isWarehouseSuggestionsOpen, setIsWarehouseSuggestionsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNewItemData({
                ...initialFormState,
                warehouseId: defaultWarehouseId,
                unitId: defaultUnitId || (units && units[0]?.id) || 0,
            });
            
            // Set initial search queries
            const defaultUnit = units && units.find(u => u.id === defaultUnitId) || (units && units[0]);
            if (defaultUnit) setUnitSearchQuery(defaultUnit.name);
            else setUnitSearchQuery('');

            const defaultWh = warehouses.find(w => w.id === defaultWarehouseId);
            if (defaultWh) setWarehouseSearchQuery(defaultWh.name);
            else setWarehouseSearchQuery('');
        }
    }, [isOpen, defaultWarehouseId, defaultUnitId, units, warehouses]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['unitId', 'warehouseId', 'openingBalance', 'purchasePrice', 'sellPrice'].includes(name);
        setNewItemData(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
    };

    // Dropdown Logic
    const suggestedUnits = useMemo(() => {
        if (!units) return [];
        if (!unitSearchQuery) return units;
        const normalizedQuery = normalizeText(unitSearchQuery);
        // If the query matches an exact unit name (normalized), show all to allow switching
        if (units.some(u => normalizeText(u.name) === normalizedQuery)) return units;
        return units.filter(u => normalizeText(u.name).includes(normalizedQuery));
    }, [units, unitSearchQuery]);

    const suggestedWarehouses = useMemo(() => {
        if (!warehouses) return [];
        if (!warehouseSearchQuery) return warehouses;
        const normalizedQuery = normalizeText(warehouseSearchQuery);
        // If the query matches an exact warehouse name (normalized), show all to allow switching
        if (warehouses.some(w => normalizeText(w.name) === normalizedQuery)) return warehouses;
        return warehouses.filter(w => normalizeText(w.name).includes(normalizedQuery));
    }, [warehouses, warehouseSearchQuery]);

    const handleSave = () => {
        if (!newItemData.name.trim() || !newItemData.unitId || !newItemData.warehouseId || isNaN(newItemData.purchasePrice) || isNaN(newItemData.sellPrice)) {
            alert('يرجى ملء جميع الحقول المطلوبة (الاسم، الوحدة، المخزن، الأسعار).');
            return;
        }

        const normalizedName = normalizeText(newItemData.name.trim());

        const isDuplicate = items.some(item =>
            normalizeText(item.name) === normalizedName &&
            item.warehouseId === newItemData.warehouseId
        );

        if (isDuplicate) {
            alert("هذا الصنف موجود بالفعل في هذا المخزن.");
            return;
        }

        // --- BARCODE LOGIC (Consistent with ItemManagement) ---
        let barcodeToUse = '';
        const existingItemSameName = items.find(item => normalizeText(item.name) === normalizedName);

        if (existingItemSameName) {
            barcodeToUse = existingItemSameName.barcode;
        } else {
            // New Item: Generate Sequential Barcode
            let newGenBarcode = getNextBarcode(items);
            while (items.some(i => i.barcode === newGenBarcode)) {
                newGenBarcode = (parseInt(newGenBarcode) + 1).toString();
            }
            barcodeToUse = newGenBarcode;
        }
        // --- END BARCODE LOGIC ---

        // Ensure ID is unique
        let newId = Date.now();
        while (items.some(i => i.id === newId)) {
            newId++;
        }

        const newItem: Item = {
            id: newId,
            barcode: barcodeToUse,
            name: newItemData.name.trim(),
            unitId: newItemData.unitId || (units && units.length > 0 ? units[0].id : 1),
            warehouseId: newItemData.warehouseId,
            purchasePrice: newItemData.purchasePrice,
            sellPrice: newItemData.sellPrice,
            openingBalance: newItemData.openingBalance || 0,
            initialBalance: newItemData.openingBalance || 0,
            createdBy: currentUser.username,
            createdAt: new Date().toISOString(),
        };

        onItemAdded(newItem);
    };

    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <Modal title="إضافة صنف سريع" show={isOpen} onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className={labelClass}>اسم الصنف</label>
                    <input type="text" name="name" value={newItemData.name} onChange={handleInputChange} className={inputClass} autoFocus autoComplete="off" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <label className={labelClass}>الوحدة</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={unitSearchQuery} 
                                onChange={(e) => {
                                    setUnitSearchQuery(e.target.value);
                                    setIsUnitSuggestionsOpen(true);
                                    if(e.target.value === '') setNewItemData(prev => ({...prev, unitId: 0}));
                                }}
                                onFocus={() => setIsUnitSuggestionsOpen(true)}
                                onBlur={() => {
                                    setTimeout(() => {
                                        if (isUnitSuggestionsOpen && suggestedUnits.length > 0 && unitSearchQuery) {
                                            setNewItemData(prev => ({...prev, unitId: suggestedUnits[0].id}));
                                            setUnitSearchQuery(suggestedUnits[0].name);
                                        }
                                        setIsUnitSuggestionsOpen(false);
                                    }, 250);
                                }}
                                className={inputClass}
                                placeholder="اختر الوحدة..."
                                autoComplete="off"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                        </div>
                        {isUnitSuggestionsOpen && (
                            <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                {suggestedUnits.map(u => (
                                    <li key={u.id} 
                                        onMouseDown={() => {
                                            setNewItemData(prev => ({...prev, unitId: u.id}));
                                            setUnitSearchQuery(u.name);
                                            setIsUnitSuggestionsOpen(false);
                                        }} 
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-200"
                                    >
                                        {u.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="relative">
                        <label className={labelClass}>المخزن</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={warehouseSearchQuery} 
                                onChange={(e) => {
                                    setWarehouseSearchQuery(e.target.value);
                                    setIsWarehouseSuggestionsOpen(true);
                                    if(e.target.value === '') setNewItemData(prev => ({...prev, warehouseId: 0}));
                                }}
                                onFocus={() => setIsWarehouseSuggestionsOpen(true)}
                                onBlur={() => {
                                    setTimeout(() => {
                                        if (isWarehouseSuggestionsOpen && suggestedWarehouses.length > 0 && warehouseSearchQuery) {
                                            setNewItemData(prev => ({...prev, warehouseId: suggestedWarehouses[0].id}));
                                            setWarehouseSearchQuery(suggestedWarehouses[0].name);
                                        }
                                        setIsWarehouseSuggestionsOpen(false);
                                    }, 250);
                                }}
                                className={inputClass}
                                placeholder="اختر المخزن..."
                                autoComplete="off"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                        </div>
                        {isWarehouseSuggestionsOpen && (
                            <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                {suggestedWarehouses.map(w => (
                                    <li key={w.id} 
                                        onMouseDown={() => {
                                            setNewItemData(prev => ({...prev, warehouseId: w.id}));
                                            setWarehouseSearchQuery(w.name);
                                            setIsWarehouseSuggestionsOpen(false);
                                        }} 
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-200"
                                    >
                                        {w.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>سعر الشراء</label>
                        <input type="number" step="0.01" name="purchasePrice" value={isNaN(newItemData.purchasePrice) ? '' : newItemData.purchasePrice} onChange={handleInputChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>سعر البيع</label>
                        <input type="number" step="0.01" name="sellPrice" value={isNaN(newItemData.sellPrice) ? '' : newItemData.sellPrice} onChange={handleInputChange} className={inputClass} />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>رصيد أول المدة</label>
                    <input type="number" name="openingBalance" value={newItemData.openingBalance} onChange={handleInputChange} className={inputClass} />
                </div>
                <div className="flex justify-end pt-4 space-x-2 space-x-reverse">
                    <button type="button" onClick={onClose} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">إلغاء</button>
                    <button type="button" onClick={handleSave} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg">حفظ الصنف</button>
                </div>
            </div>
        </Modal>
    );
};

export default QuickAddItemModal;
