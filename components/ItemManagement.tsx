
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Modal, ConfirmationModal, PlusCircleIcon, EditIcon, DeleteIcon, DownloadIcon, UploadIcon, ViewIcon, DocumentIcon, FormattedNumber, ChevronDownIcon, BarcodeIcon, SwitchHorizontalIcon } from './Shared';
import type { Item, Unit, Warehouse, NotificationType, MgmtUser, DefaultValues, SalesInvoice, SalesReturn, PurchaseInvoice, PurchaseReturn, WarehouseTransfer, CompanyData } from '../types';
import { exportToExcel, readFromExcel } from '../services/excel';
import { normalizeText, getNextBarcode, searchMatch, generateUniqueId } from '../utils';
import BarcodePrintModal, { BarcodeItem } from './BarcodePrintModal';

interface ItemManagementProps {
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    units: Unit[];
    warehouses: Warehouse[];
    showNotification: (type: NotificationType) => void;
    currentUser: MgmtUser;
    defaultValues: DefaultValues;
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
    warehouseTransfers: WarehouseTransfer[];
    companyData: CompanyData; 
}

const ItemManagement: React.FC<ItemManagementProps> = React.memo(({ 
    items, setItems, units, warehouses, showNotification, currentUser, defaultValues,
    salesInvoices, salesReturns, purchaseInvoices, purchaseReturns, warehouseTransfers, companyData
}) => {
    const initialFormState = { id: null, barcode: '', name: '', unitId: defaultValues.defaultUnitId, warehouseId: defaultValues.defaultWarehouseId, openingBalance: 0, initialBalance: 0, purchasePrice: NaN, sellPrice: NaN };
    const [formData, setFormData] = useState<Omit<Item, 'id'> & { id: number | null }>(initialFormState);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isViewing, setIsViewing] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirmationStep, setDeleteConfirmationStep] = useState(0);
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
    const [filterWarehouse, setFilterWarehouse] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isQuickEditMode, setIsQuickEditMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;
    const importFileRef = useRef<HTMLInputElement>(null);

    // Barcode Modal State
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [itemsToPrint, setItemsToPrint] = useState<BarcodeItem[]>([]);

    // Sync Feature State
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    // Searchable dropdown states for the modal
    const [unitSearchQuery, setUnitSearchQuery] = useState('');
    const [isUnitSuggestionsOpen, setIsUnitSuggestionsOpen] = useState(false);
    const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
    const [isWarehouseSuggestionsOpen, setIsWarehouseSuggestionsOpen] = useState(false);
    
    // Searchable dropdown states for the main filter
    const [warehouseFilterSearchQuery, setWarehouseFilterSearchQuery] = useState('');
    const [isWarehouseFilterSuggestionsOpen, setIsWarehouseFilterSuggestionsOpen] = useState(false);

    const canEdit = currentUser.permissions.includes('itemManagement_edit');
    const canDelete = currentUser.permissions.includes('itemManagement_delete');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['unitId', 'warehouseId', 'openingBalance', 'initialBalance', 'purchasePrice', 'sellPrice'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
    };

    const handleQuickEditChange = (itemId: number, field: keyof Item, value: string) => {
        const numValue = parseFloat(value) || 0;
        setItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, [field]: numValue } : item
        ));
    };
    
    const resetForm = () => {
        setIsEditing(false);
        setIsViewing(false);
        setFormData(initialFormState);
        setUnitSearchQuery('');
        setWarehouseSearchQuery('');
    };

    const handleAddNewClick = () => {
        resetForm();
        const defaultUnit = units.find(u => u.id === defaultValues.defaultUnitId);
        const defaultWarehouse = warehouses.find(w => w.id === defaultValues.defaultWarehouseId);
        if (defaultUnit) setUnitSearchQuery(defaultUnit.name);
        if (defaultWarehouse) setWarehouseSearchQuery(defaultWarehouse.name);
        setIsModalOpen(true);
    };
    
    const handleEditClick = (item: Item, viewOnly: boolean) => {
        setIsEditing(true);
        setIsViewing(viewOnly);
        setFormData(item);
        const unit = units.find(u => u.id === item.unitId);
        const warehouse = warehouses.find(w => w.id === item.warehouseId);
        if (unit) setUnitSearchQuery(unit.name);
        if (warehouse) setWarehouseSearchQuery(warehouse.name);
        setIsModalOpen(true);
    };

    const handlePrintBarcodeClick = (item: Item) => {
        setItemsToPrint([{
            name: item.name,
            barcode: item.barcode,
            price: item.sellPrice,
            quantity: 1
        }]);
        setIsBarcodeModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const calculateActualStock = (item: Item) => {
        return item.openingBalance;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;
        if (!formData.name || !formData.unitId || !formData.warehouseId || isNaN(formData.purchasePrice) || isNaN(formData.sellPrice)) {
            alert("يرجى ملء جميع الحقول المطلوبة.");
            return;
        }

        const normalizedFormName = normalizeText(formData.name.trim());
        let finalBarcode = formData.barcode ? formData.barcode.trim() : '';

        const isWarehouseDuplicate = items.some(item => 
            normalizeText(item.name) === normalizedFormName &&
            item.warehouseId === formData.warehouseId &&
            item.id !== formData.id
        );
        if (isWarehouseDuplicate) {
            alert("هذا الصنف موجود بالفعل في هذا المخزن.");
            return;
        }

        const existingItemSameName = items.find(item => normalizeText(item.name) === normalizedFormName);

        if (existingItemSameName) {
            if (finalBarcode && finalBarcode !== existingItemSameName.barcode) {
                const proceed = confirm(`تنبيه: الصنف "${existingItemSameName.name}" مسجل مسبقاً بباركود "${existingItemSameName.barcode}". هل تريد استخدام الباركود الأصلي لتوحيد البيانات؟`);
                if (proceed) {
                    finalBarcode = existingItemSameName.barcode;
                }
            } else if (!finalBarcode) {
                finalBarcode = existingItemSameName.barcode;
            }
        } else {
            if (finalBarcode) {
                const barcodeConflict = items.find(item => item.barcode === finalBarcode && item.id !== formData.id);
                if (barcodeConflict) {
                    alert(`خطأ: الباركود "${finalBarcode}" مستخدم بالفعل للصنف "${barcodeConflict.name}". لا يمكن تكرار الباركود لأصناف مختلفة.`);
                    return;
                }
            } else {
                let newGenBarcode = getNextBarcode(items);
                while (items.some(i => i.barcode === newGenBarcode)) {
                    newGenBarcode = (parseInt(newGenBarcode) + 1).toString();
                }
                finalBarcode = newGenBarcode;
            }
        }
        
        if (isEditing && formData.id) {
            if (!canEdit) {
                alert("ليس لديك صلاحية التعديل.");
                return;
            }
            setItems(items.map(item => item.id === formData.id ? { 
                ...item, 
                ...formData, 
                name: formData.name.trim(),
                barcode: finalBarcode,
                lastModifiedBy: currentUser.username,
                lastModifiedAt: new Date().toISOString()
            } : item));
            showNotification('edit');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بتعديل بيانات الصنف "${formData.name}" (كود: ${formData.id})` }));
        } else {
            let newId = parseInt(generateUniqueId());
            while (items.some(i => i.id === newId)) {
                newId++;
            }

            const newItem: Item = {
                id: newId,
                barcode: finalBarcode,
                name: formData.name.trim(),
                unitId: formData.unitId,
                warehouseId: formData.warehouseId,
                openingBalance: formData.initialBalance || 0,
                initialBalance: formData.initialBalance || 0,
                purchasePrice: formData.purchasePrice,
                sellPrice: formData.sellPrice,
                createdBy: currentUser.username,
                createdAt: new Date().toISOString()
            };
            setItems([...items, newItem]);
            showNotification('add');
            window.dispatchEvent(new CustomEvent('logTransaction', { detail: `قام المستخدم ${currentUser.fullName} بإضافة صنف جديد "${newItem.name}" (كود: ${newItem.id})` }));
        }
        handleCloseModal();
    };

    const handleDelete = (item: Item) => {
        const isUsedInSales = salesInvoices.some(inv => inv.items.some(i => i.itemId === item.id));
        const isUsedInSalesReturns = salesReturns.some(ret => ret.items.some(i => i.itemId === item.id));
        const isUsedInPurchases = purchaseInvoices.some(inv => inv.items.some(i => i.itemId === item.id));
        const isUsedInPurchaseReturns = purchaseReturns.some(ret => ret.items.some(i => i.itemId === item.id));
        const isUsedInTransfers = warehouseTransfers.some(t => t.items.some(i => i.itemId === item.id));

        if (isUsedInSales || isUsedInSalesReturns || isUsedInPurchases || isUsedInPurchaseReturns || isUsedInTransfers) {
            alert(`لا يمكن حذف الصنف "${item.name}" لأنه مستخدم في فواتير أو تحويلات سابقة.\nالحذف سيؤدي إلى أخطاء في التقارير والحسابات.`);
            return;
        }

        setItemToDelete(item);
        setDeleteConfirmationStep(1);
    };

    const performDelete = () => {
        if (itemToDelete) {
            setItems(items.filter(item => item.id !== itemToDelete.id));
            showNotification('delete');
        }
        resetDeleteProcess();
    };

    const resetDeleteProcess = () => {
        setDeleteConfirmationStep(0);
        setItemToDelete(null);
    };

    const renderDeleteConfirmationModal = () => {
        if (!itemToDelete) return null;
        switch (deleteConfirmationStep) {
            case 1: return <ConfirmationModal title="تأكيد الحذف" message={`هل أنت متأكد من حذف صنف "${itemToDelete.name}"؟`} onConfirm={() => setDeleteConfirmationStep(2)} onCancel={resetDeleteProcess} confirmText="نعم، متابعة" confirmColor="bg-red-600" />;
            case 2: return <ConfirmationModal title="تحذير نهائي" message="هذا الإجراء لا يمكن التراجع عنه وسيتم حذف الصنف نهائياً." onConfirm={performDelete} onCancel={resetDeleteProcess} confirmText="حذف نهائي" confirmColor="bg-red-800" />;
            default: return null;
        }
    };

    const filteredItems = useMemo(() => {
        return items
            .filter(item => filterWarehouse === 'all' || item.warehouseId === parseInt(filterWarehouse))
            .filter(item => {
                if (!searchQuery.trim()) return true;
                if (item.barcode === searchQuery.trim()) return true;
                return searchMatch(item.name, searchQuery) || searchMatch(item.barcode, searchQuery);
            });
    }, [items, searchQuery, filterWarehouse]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterWarehouse]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredItems, currentPage]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    const handleDownloadTemplate = () => {
        const exampleUnit = units[0]?.name || 'عدد';
        const exampleWarehouse = warehouses[0]?.name || 'الفرع الرئيسي';
        const template = [
            {
                'الباركود': '1001',
                'اسم الصنف': 'صنف تجريبي',
                'الوحدة': exampleUnit,
                'المخزن': exampleWarehouse,
                'رصيد أول المدة': 10,
                'سعر الشراء': 50,
                'سعر البيع': 75
            }
        ];
        exportToExcel(template, 'نموذج_استيراد_الاصناف');
    };

    const handleExport = () => {
        if (items.length === 0) {
            handleDownloadTemplate();
            return;
        }

        const dataToExport = filteredItems.map(item => {
            const unitName = units.find(u => u.id === item.unitId)?.name || '';
            const warehouseName = warehouses.find(w => w.id === item.warehouseId)?.name || '';
            return {
                'الباركود': item.barcode,
                'اسم الصنف': item.name,
                'الوحدة': unitName,
                'المخزن': warehouseName,
                'رصيد أول المدة': item.initialBalance,
                'الرصيد الحالي': calculateActualStock(item),
                'سعر الشراء': item.purchasePrice,
                'سعر البيع': item.sellPrice
            };
        });
        
        exportToExcel(dataToExport, 'الأصناف');
        showNotification('save');
    };

    const handleImportClick = async () => {
        if (window.electronAPI) {
            const result = await window.electronAPI.openFile({
                title: 'Import Items from Excel',
                filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] }],
                properties: ['openFile'],
                readAsBuffer: true
            });
            if (result && result.content instanceof Uint8Array) {
                await processExcelFile(result.content);
            }
        } else {
            importFileRef.current?.click();
        }
    };
    
    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await processExcelFile(file);

        if(e.target) e.target.value = '';
    };

    const processExcelFile = async (fileOrBuffer: File | Uint8Array) => {
        try {
            const jsonData = await readFromExcel(fileOrBuffer);
            if (jsonData.length === 0) throw new Error("الملف فارغ");
            const newItems: Item[] = [];
            const importErrors: string[] = [];
            
            const findKey = (row: any, keys: string[]) => {
                const rowKeys = Object.keys(row);
                for (const key of keys) {
                    const normalizedKey = normalizeText(key);
                    const found = rowKeys.find(k => normalizeText(k) === normalizedKey);
                    if (found) return found;
                }
                return undefined;
            };
            
            const findInList = (list: any[], name: string) => {
                if (!name || !name.trim) return null;
                const normalizedName = normalizeText(name);
                return list.find(item => normalizeText(item.name) === normalizedName);
            };

            const existingBarcodes = new Set(items.map(i => i.barcode));
            const existingNamesToBarcodes = new Map<string, string>();
            items.forEach(i => existingNamesToBarcodes.set(normalizeText(i.name), i.barcode));

            let currentMaxBarcode = 1000;
            const existingNumericBarcodes = items.map(i => parseInt(i.barcode)).filter(n => !isNaN(n));
            if (existingNumericBarcodes.length > 0) currentMaxBarcode = Math.max(...existingNumericBarcodes);
            if (currentMaxBarcode < 1000) currentMaxBarcode = 1000;

            for (let i = 0; i < jsonData.length; i++) {
                const row: any = jsonData[i];
                const nameKey = findKey(row, ['اسم الصنف', 'name', 'Name']);
                const name = nameKey ? row[nameKey] : undefined;
                if (!name) continue; 
                
                const normalizedName = normalizeText(name.toString());
                const unitKey = findKey(row, ['الوحدة', 'unitName', 'Unit']);
                const warehouseKey = findKey(row, ['المخزن', 'warehouseName', 'Warehouse']);
                const unitNameRaw = unitKey ? row[unitKey] : '';
                const warehouseNameRaw = warehouseKey ? row[warehouseKey] : '';
                const unit = findInList(units, unitNameRaw.toString());
                const warehouse = findInList(warehouses, warehouseNameRaw.toString());

                if (!unit || !warehouse) {
                    importErrors.push(`السطر ${i+2}: لم يتم العثور على الوحدة أو المخزن للصنف "${name}".`);
                    continue;
                }

                const isDuplicate = [...items, ...newItems].some(it => 
                    normalizeText(it.name) === normalizedName && it.warehouseId === warehouse.id
                );
                if(isDuplicate) continue;

                let barcodeToUse = '';
                if (existingNamesToBarcodes.has(normalizedName)) {
                    barcodeToUse = existingNamesToBarcodes.get(normalizedName)!;
                } else {
                    const batchItem = newItems.find(it => normalizeText(it.name) === normalizedName);
                    if (batchItem) barcodeToUse = batchItem.barcode;
                }

                if (!barcodeToUse) {
                    const barcodeKey = findKey(row, ['الباركود', 'barcode', 'Barcode', 'code', 'الكود', 'serial']);
                    let rowBarcode = barcodeKey ? row[barcodeKey] : undefined;
                    if (typeof rowBarcode === 'number') rowBarcode = Math.floor(rowBarcode).toString();
                    else if (typeof rowBarcode === 'string') rowBarcode = rowBarcode.split('.')[0];
                    
                    if (rowBarcode) {
                        rowBarcode = rowBarcode.toString();
                        const conflictingInDB = items.find(it => it.barcode === rowBarcode && normalizeText(it.name) !== normalizedName);
                        const conflictingInBatch = newItems.find(it => it.barcode === rowBarcode && normalizeText(it.name) !== normalizedName);
                        if (conflictingInDB || conflictingInBatch) {
                            importErrors.push(`السطر ${i+2}: الباركود ${rowBarcode} للصنف "${name}" مستخدم بالفعل لصنف آخر.`);
                            continue;
                        }
                        barcodeToUse = rowBarcode;
                    } else {
                        currentMaxBarcode++;
                        let newGen = currentMaxBarcode.toString();
                        while (existingBarcodes.has(newGen) || newItems.some(it => it.barcode === newGen)) {
                             currentMaxBarcode++;
                             newGen = currentMaxBarcode.toString();
                        }
                        barcodeToUse = newGen;
                    }
                }
                
                existingNamesToBarcodes.set(normalizedName, barcodeToUse);
                existingBarcodes.add(barcodeToUse);

                const obKey = findKey(row, ['رصيد أول المدة', 'openingBalance', 'initialBalance']);
                const ppKey = findKey(row, ['سعر الشراء', 'purchasePrice']);
                const spKey = findKey(row, ['سعر البيع', 'sellPrice']);

                const initialBalance = parseFloat(obKey ? row[obKey] : 0);
                const purchasePrice = parseFloat(ppKey ? row[ppKey] : 0);
                const sellPrice = parseFloat(spKey ? row[spKey] : 0);

                newItems.push({
                    id: parseInt(generateUniqueId().substring(7)) + i, 
                    barcode: barcodeToUse,
                    name: name.toString(),
                    unitId: unit.id,
                    warehouseId: warehouse.id,
                    openingBalance: isNaN(initialBalance) ? 0 : initialBalance,
                    initialBalance: isNaN(initialBalance) ? 0 : initialBalance,
                    purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
                    sellPrice: isNaN(sellPrice) ? 0 : sellPrice,
                    createdBy: currentUser.username,
                    createdAt: new Date().toISOString()
                });
            }

            if (newItems.length > 0) {
                setItems(prev => [...prev, ...newItems]);
                showNotification('add');
            }
            if(importErrors.length > 0) alert("بعض الأخطاء حدثت أثناء الاستيراد:\n" + importErrors.join('\n'));

        } catch (error) { showNotification('error'); }
    };
    
    const suggestedUnits = useMemo(() => {
        if (!unitSearchQuery) return units.sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        const normalizedQuery = normalizeText(unitSearchQuery);
        return units.filter(u => normalizeText(u.name).includes(normalizedQuery)).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
    }, [unitSearchQuery, units]);

    const handleUnitSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUnitSearchQuery(e.target.value);
        setIsUnitSuggestionsOpen(true);
        if (e.target.value === '') setFormData(p => ({ ...p, unitId: 0 }));
    };

    const handleUnitSelect = (unit: Unit) => {
        setFormData(p => ({ ...p, unitId: unit.id }));
        setUnitSearchQuery(unit.name);
        setIsUnitSuggestionsOpen(false);
    };
    
    const suggestedWarehouses = useMemo(() => {
        if (!warehouseSearchQuery) return warehouses.sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        const normalizedQuery = normalizeText(warehouseSearchQuery);
        return warehouses.filter(w => normalizeText(w.name).includes(normalizedQuery)).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
    }, [warehouseSearchQuery, warehouses]);
    
    const handleWarehouseSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWarehouseSearchQuery(e.target.value);
        setIsWarehouseSuggestionsOpen(true);
        if (e.target.value === '') setFormData(p => ({ ...p, warehouseId: 0 }));
    };

    const handleWarehouseSelect = (warehouse: Warehouse) => {
        setFormData(p => ({ ...p, warehouseId: warehouse.id }));
        setWarehouseSearchQuery(warehouse.name);
        setIsWarehouseSuggestionsOpen(false);
    };

    const suggestedFilterWarehouses = useMemo(() => {
        if (!warehouseFilterSearchQuery) return warehouses.sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        const normalizedQuery = normalizeText(warehouseFilterSearchQuery);
        return warehouses.filter(w => normalizeText(w.name).includes(normalizedQuery)).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
    }, [warehouseFilterSearchQuery, warehouses]);

    const handleWarehouseFilterSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWarehouseFilterSearchQuery(e.target.value);
        setIsWarehouseFilterSuggestionsOpen(true);
        if (e.target.value === '') setFilterWarehouse('all');
    };

    const handleWarehouseFilterSelect = (warehouse: Warehouse | 'all') => {
        if(warehouse === 'all') {
            setFilterWarehouse('all');
            setWarehouseFilterSearchQuery(''); 
        } else {
            setFilterWarehouse(warehouse.id.toString());
            setWarehouseFilterSearchQuery(warehouse.name);
        }
        setIsWarehouseFilterSuggestionsOpen(false);
    };

    // SYNC Logic
    const missingItemsAnalysis = useMemo(() => {
        const uniqueItemsMap = new Map<string, Item>();
        items.forEach(item => {
            const key = `${normalizeText(item.name)}_${item.barcode}`;
            if (!uniqueItemsMap.has(key)) uniqueItemsMap.set(key, item);
        });
        const missing: { warehouse: Warehouse, items: Item[] }[] = [];
        warehouses.forEach(wh => {
            const missingInWh: Item[] = [];
            uniqueItemsMap.forEach((template) => {
                const alreadyExists = items.some(i => i.warehouseId === wh.id && normalizeText(i.name) === normalizeText(template.name) && i.barcode === template.barcode);
                if (!alreadyExists) missingInWh.push(template);
            });
            if (missingInWh.length > 0) missing.push({ warehouse: wh, items: missingInWh });
        });
        return missing;
    }, [items, warehouses]);

    const handleApplySync = () => {
        if (missingItemsAnalysis.length === 0) { alert("جميع الأصناف موجودة بالفعل في كل المخازن."); return; }
        const newEntries: Item[] = [];
        let baseId = Date.now();
        missingItemsAnalysis.forEach(group => {
            group.items.forEach(template => {
                newEntries.push({ ...template, id: baseId++, warehouseId: group.warehouse.id, openingBalance: 0, initialBalance: 0, createdBy: currentUser.username, createdAt: new Date().toISOString() });
            });
        });
        setItems(prev => [...prev, ...newEntries]);
        showNotification('add');
        setIsSyncModalOpen(false);
    };

    const tableInputClass = "w-24 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-center text-sm font-bold focus:ring-2 focus:ring-blue-400 focus:outline-none";
    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-white font-bold placeholder-gray-500 dark:placeholder-gray-400 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed text-base";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";
    const requiredSpan = <span className="text-red-500 dark:text-red-400 font-normal text-sm mr-1">(مطلوب)</span>;

    return (
        <>
        {renderDeleteConfirmationModal()}
        <BarcodePrintModal 
            isOpen={isBarcodeModalOpen}
            onClose={() => setIsBarcodeModalOpen(false)}
            items={itemsToPrint}
            companyName={companyData.name}
        />

        <Modal title="معاينة مزامنة الأصناف عبر المخازن" show={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)}>
            <div className="space-y-4">
                <p className="text-blue-800 dark:text-blue-200 font-bold">تنبيه: سيتم إنشاء نسخة من الأصناف المفقودة في المخازن الأخرى برصيد صفر.</p>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <table className="w-full text-right border-collapse">
                        <thead><tr><th className="p-2 border">المخزن</th><th className="p-2 border">الأصناف المفقودة</th></tr></thead>
                        <tbody>{missingItemsAnalysis.map(g => <tr key={g.warehouse.id} className="border-b"><td className="p-2 border">{g.warehouse.name}</td><td className="p-2 border font-bold text-red-600">{g.items.length} صنف</td></tr>)}</tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-3 pt-4"><button onClick={() => setIsSyncModalOpen(false)} className="bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">إلغاء</button><button onClick={handleApplySync} className="bg-green-600 text-white font-bold py-2 px-8 rounded-lg">تطبيق</button></div>
            </div>
        </Modal>

        <Modal title={isViewing ? 'عرض بيانات الصنف' : isEditing ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد'} show={isModalOpen} onClose={handleCloseModal}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className={labelClass}>اسم الصنف {requiredSpan}</label><input name="name" type="text" value={formData.name} onChange={handleInputChange} className={inputClass} required disabled={isViewing} /></div>
                    <div className="relative"><label className={labelClass}>الوحدة {requiredSpan}</label><input type="text" value={unitSearchQuery} onChange={handleUnitSearchChange} onFocus={() => setIsUnitSuggestionsOpen(true)} className={inputClass} required disabled={isViewing} autoComplete="off" />{isUnitSuggestionsOpen && <ul className="absolute z-60 w-full bg-white dark:bg-gray-800 border rounded mt-1 max-h-40 overflow-y-auto shadow-lg">{suggestedUnits.map(u => <li key={u.id} onMouseDown={() => handleUnitSelect(u)} className="p-2 hover:bg-gray-100 cursor-pointer">{u.name}</li>)}</ul>}</div>
                    <div className="relative"><label className={labelClass}>المخزن {requiredSpan}</label><input type="text" value={warehouseSearchQuery} onChange={handleWarehouseSearchChange} onFocus={() => setIsWarehouseSuggestionsOpen(true)} className={inputClass} required disabled={isViewing} autoComplete="off" />{isWarehouseSuggestionsOpen && <ul className="absolute z-60 w-full bg-white dark:bg-gray-800 border rounded mt-1 max-h-40 overflow-y-auto shadow-lg">{suggestedWarehouses.map(w => <li key={w.id} onMouseDown={() => handleWarehouseSelect(w)} className="p-2 hover:bg-gray-100 cursor-pointer">{w.name}</li>)}</ul>}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className={labelClass}>الباركود</label><input name="barcode" type="text" value={formData.barcode} onChange={handleInputChange} className={inputClass} disabled={isViewing} /></div>
                    <div><label className={labelClass}>رصيد أول المدة</label><input name="initialBalance" type="number" value={formData.initialBalance} onChange={handleInputChange} className={inputClass} disabled={isViewing || (isEditing && currentUser.id !== 1)} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>سعر الشراء {requiredSpan}</label><input name="purchasePrice" type="number" step="0.01" value={isNaN(formData.purchasePrice) ? '' : formData.purchasePrice} onChange={handleInputChange} className={inputClass} required disabled={isViewing} /></div>
                    <div><label className={labelClass}>سعر البيع {requiredSpan}</label><input name="sellPrice" type="number" step="0.01" value={isNaN(formData.sellPrice) ? '' : formData.sellPrice} onChange={handleInputChange} className={inputClass} required disabled={isViewing} /></div>
                </div>
                <div className="flex justify-end space-x-4 space-x-reverse pt-4 border-t"><button type="button" onClick={handleCloseModal} className="bg-gray-500 text-white font-bold py-3 px-6 rounded-lg">إلغاء</button>{!isViewing && <button type="submit" className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg">{isEditing ? 'تحديث' : 'إضافة'}</button>}</div>
            </form>
        </Modal>

        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">تكويد الأصناف</h1>
             <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20">
                 
                 {/* Toolbar Logic */}
                 <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-30">
                    <div className="flex gap-2">
                        <button onClick={handleAddNewClick} className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all">
                            <PlusCircleIcon /><span>إضافة صنف جديد</span>
                        </button>
                        <button onClick={() => setIsSyncModalOpen(true)} className="flex items-center justify-center bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition-all gap-2">
                            <SwitchHorizontalIcon className="w-5 h-5 ml-0" /><span>استنساخ الأصناف</span>
                        </button>
                        <button onClick={() => setIsQuickEditMode(!isQuickEditMode)} className={`flex items-center justify-center font-bold py-2 px-4 rounded-lg shadow-md transition-all gap-2 ${isQuickEditMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                            <EditIcon className="w-5 h-5" /><span>{isQuickEditMode ? 'إنهاء التعديل' : 'التعديل السريع'}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="ابحث بالاسم أو الباركود..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${inputClass} w-64`} />
                         <div className="relative w-48">
                            <input type="text" value={warehouseFilterSearchQuery} onChange={handleWarehouseFilterSearchChange} onFocus={() => setIsWarehouseFilterSuggestionsOpen(true)} onBlur={() => setTimeout(() => setIsWarehouseFilterSuggestionsOpen(false), 200)} placeholder="فلتر المخزن..." className={inputClass} autoComplete="off" />
                            {isWarehouseFilterSuggestionsOpen && (
                                <ul className="absolute z-[100] w-full bg-white dark:bg-gray-800 border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                    <li onMouseDown={() => handleWarehouseFilterSelect('all')} className="p-2 hover:bg-gray-100 cursor-pointer font-bold">كل المخازن</li>
                                    {suggestedFilterWarehouses.map(w => <li key={w.id} onMouseDown={() => handleWarehouseFilterSelect(w)} className="p-2 hover:bg-gray-100 cursor-pointer">{w.name}</li>)}
                                </ul>
                            )}
                        </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 mb-4">
                     <button onClick={handleImportClick} className="flex items-center justify-center bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700 transition-all"><UploadIcon /><span>استيراد Excel</span></button>
                     <button onClick={handleExport} className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-all"><DownloadIcon /><span>تصدير Excel</span></button>
                     <input type="file" ref={importFileRef} onChange={handleFileSelected} accept=".xlsx, .xls, .csv" className="hidden" />
                 </div>

                 <div className="overflow-auto max-h-[60vh]">
                     <table className="w-full text-right">
                         <thead className="sticky top-0 z-10">
                             <tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 font-bold text-sm">
                                 {['الباركود', 'اسم الصنف', 'الوحدة', 'المخزن', 'سعر الشراء', 'سعر البيع', 'رصيد أول', 'رصيد آخر', 'تم بواسطة', 'إجراءات'].map(h => <th key={h} className="p-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>)}
                             </tr>
                         </thead>
                         <tbody>
                             {paginatedItems.map((item) => {
                                 const unitName = units.find(u => u.id === item.unitId)?.name || 'غير محدد';
                                 const warehouseName = warehouses.find(w => w.id === item.warehouseId)?.name || 'غير محدد';
                                 const actualStock = calculateActualStock(item);
                                 return (
                                     <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                         <td className="p-3 text-gray-700 dark:text-gray-300 font-mono">{item.barcode}</td>
                                         <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{item.name}</td>
                                         <td className="p-3 text-gray-700 dark:text-gray-300">{unitName}</td>
                                         <td className="p-3 text-gray-700 dark:text-gray-300">{warehouseName}</td>
                                         
                                         {/* Quick Edit Cells */}
                                         <td className="p-3">
                                            {isQuickEditMode ? <input type="number" value={item.purchasePrice} onChange={e => handleQuickEditChange(item.id, 'purchasePrice', e.target.value)} className={tableInputClass} /> : <FormattedNumber value={item.purchasePrice} />}
                                         </td>
                                         <td className="p-3">
                                            {isQuickEditMode ? <input type="number" value={item.sellPrice} onChange={e => handleQuickEditChange(item.id, 'sellPrice', e.target.value)} className={tableInputClass} /> : <FormattedNumber value={item.sellPrice} />}
                                         </td>
                                         <td className="p-3">
                                            {isQuickEditMode ? <input type="number" value={item.initialBalance} onChange={e => handleQuickEditChange(item.id, 'initialBalance', e.target.value)} className={tableInputClass} /> : <span className="font-bold">{item.initialBalance}</span>}
                                         </td>
                                         <td className="p-3">
                                            {isQuickEditMode ? <input type="number" value={item.openingBalance} onChange={e => handleQuickEditChange(item.id, 'openingBalance', e.target.value)} className={tableInputClass} /> : <span className="font-bold text-blue-600">{actualStock}</span>}
                                         </td>

                                         <td className="p-3 text-xs text-gray-600 dark:text-gray-400">
                                            <div className="flex flex-col"><span>{item.createdBy || 'غير معروف'}</span>{item.lastModifiedBy && <span className="text-[10px]">تعديل: {item.lastModifiedBy}</span>}</div>
                                         </td>
                                         <td className="p-3">
                                             <div className="flex space-x-2 space-x-reverse">
                                                <button onClick={() => handlePrintBarcodeClick(item)} className="p-2 text-purple-600 hover:bg-purple-100 rounded-full transition-all"><BarcodeIcon /></button>
                                                <button onClick={() => handleEditClick(item, !canEdit)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-all">{canEdit ? <EditIcon /> : <ViewIcon />}</button>
                                                {canDelete && <button onClick={() => handleDelete(item)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-all"><DeleteIcon /></button>}
                                            </div>
                                        </td>
                                     </tr>
                                 );
                             })}
                         </tbody>
                     </table>
                 </div>

                 {totalPages > 1 && (
                     <div className="flex justify-center items-center gap-4 mt-4 p-4 border-t border-gray-200 dark:border-gray-700">
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
        </>
    );
});

export default ItemManagement;
