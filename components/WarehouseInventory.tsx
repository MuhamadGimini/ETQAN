
import React, { useState, useMemo } from 'react';
import type { Item, Warehouse, CompanyData, MgmtUser, NotificationType, SalesInvoice, SalesReturn, PurchaseInvoice, PurchaseReturn } from '../types';
import { PrintIcon, Modal, ChevronDownIcon, ConfirmationModal, FormattedNumber } from './Shared';
import { searchMatch } from '../utils';

// FIX: Added missing transaction props to WarehouseInventoryProps to resolve TS error in App.tsx
interface WarehouseInventoryProps {
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    warehouses: Warehouse[];
    companyData: CompanyData;
    users: MgmtUser[];
    showNotification: (type: NotificationType) => void;
    salesInvoices: SalesInvoice[];
    salesReturns: SalesReturn[];
    purchaseInvoices: PurchaseInvoice[];
    purchaseReturns: PurchaseReturn[];
}

const WarehouseInventory: React.FC<WarehouseInventoryProps> = ({ items, setItems, warehouses, companyData, users, showNotification }) => {
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
    const [balanceFilter, setBalanceFilter] = useState<'all' | 'positive' | 'zero'>('all');
    const [actualCounts, setActualCounts] = useState<{ [itemName: string]: { [warehouseId: string]: number | undefined } }>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showDifferencesOnly, setSearchFiltersOnly] = useState(false); // Refactored state name for consistency internally

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [adjustmentTarget, setAdjustmentTarget] = useState<{ type: 'single' | 'all'; itemName?: string } | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);


    const inventoryData = useMemo(() => {
        const itemMap = new Map<string, { name: string, barcode: string, stock: Map<number, number> }>();
        items.forEach(item => {
            if (!itemMap.has(item.name)) {
                itemMap.set(item.name, { name: item.name, barcode: item.barcode, stock: new Map<number, number>() });
            }
            const currentStock = itemMap.get(item.name)!.stock.get(item.warehouseId) || 0;
            itemMap.get(item.name)!.stock.set(item.warehouseId, currentStock + item.openingBalance);
        });
        return Array.from(itemMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [items]);

    const displayedWarehouses = useMemo(() => {
        if (selectedWarehouseId === 'all') {
            return warehouses;
        }
        return warehouses.filter(w => w.id === parseInt(selectedWarehouseId));
    }, [warehouses, selectedWarehouseId]);

    const filteredInventoryData = useMemo(() => {
        let data = inventoryData;
        
        if (searchQuery) {
            data = data.filter(item => searchMatch(`${item.name} ${item.barcode}`, searchQuery));
        }

        data = data.filter(item => {
            return displayedWarehouses.some(w => {
                const systemStock = item.stock.get(w.id) || 0;
                let matchesBalance = true;
                if (balanceFilter === 'positive') matchesBalance = systemStock > 0;
                else if (balanceFilter === 'zero') matchesBalance = systemStock === 0;
                return matchesBalance;
            });
        });

        if (showDifferencesOnly) {
            data = data.filter(item => {
                return displayedWarehouses.some(w => {
                    const systemStock = item.stock.get(w.id) || 0;
                    const actualStockValue = actualCounts[item.name]?.[w.id];
                    return actualStockValue !== undefined && actualStockValue !== systemStock;
                });
            });
        }

        return data;
    }, [inventoryData, searchQuery, balanceFilter, showDifferencesOnly, actualCounts, displayedWarehouses]);
    

    const handleCountChange = (itemName: string, warehouseId: number, value: string) => {
        const newCount = parseInt(value, 10);
        setActualCounts(prev => ({
            ...prev,
            [itemName]: {
                ...prev[itemName],
                [warehouseId]: isNaN(newCount) ? undefined : newCount,
            },
        }));
    };
    
    const performResetCounts = () => {
        setActualCounts({});
        setIsResetModalOpen(false);
    };
    
    const openPasswordModal = (type: 'single' | 'all', itemName?: string) => {
        setAdjustmentTarget({ type, itemName });
        setIsPasswordModalOpen(true);
        setPassword('');
        setPasswordError('');
    };

    const handleConfirmAdjustment = () => {
        const admin = users.find(u => u.id === 1);
        const adminPass = admin ? admin.password : '8603';

        if (password !== adminPass) {
            setPasswordError('كلمة المرور غير صحيحة.');
            return;
        }

        let updatedItems = [...items];
        let adjustmentsMade = false;

        const adjustItemInWarehouses = (itemName: string) => {
            displayedWarehouses.forEach(w => {
                const itemToAdjust = items.find(i => i.name === itemName && i.warehouseId === w.id);
                const systemStock = itemToAdjust ? itemToAdjust.openingBalance : 0;
                const actualStockValue = actualCounts[itemName]?.[w.id];
                
                if (actualStockValue !== undefined) {
                    const actualStock = actualStockValue;
                    const difference = systemStock - actualStock;

                    if (difference !== 0) {
                        if (itemToAdjust) {
                            const itemIndex = updatedItems.findIndex(i => i.id === itemToAdjust.id);
                            if (itemIndex !== -1) {
                                updatedItems[itemIndex] = { ...updatedItems[itemIndex], openingBalance: actualStock };
                                adjustmentsMade = true;
                            }
                        } else if (actualStock > 0) {
                            const templateItem = items.find(i => i.name === itemName);
                            if (templateItem) {
                                 const newItemInWarehouse: Item = {
                                    ...templateItem,
                                    id: Date.now() + Math.random(),
                                    warehouseId: w.id,
                                    openingBalance: actualStock,
                                };
                                updatedItems.push(newItemInWarehouse);
                                adjustmentsMade = true;
                            }
                        }
                    }
                }
            });
        };

        if (adjustmentTarget?.type === 'single' && adjustmentTarget.itemName) {
            adjustItemInWarehouses(adjustmentTarget.itemName);
        } else if (adjustmentTarget?.type === 'all') {
            filteredInventoryData.forEach(item => {
                adjustItemInWarehouses(item.name);
            });
        }
        
        if (adjustmentsMade) {
            setItems(updatedItems);
            setActualCounts({});
            showNotification('save');
            alert("تمت تسوية المخزون بنجاح.");
        } else {
            alert("لا توجد فروقات مسجلة للتسوية.");
        }
        
        setIsPasswordModalOpen(false);
        setAdjustmentTarget(null);
    };
    
    const anyDifferenceExists = useMemo(() => {
        return filteredInventoryData.some(item => 
            displayedWarehouses.some(w => {
                const systemStock = item.stock.get(w.id) || 0;
                const actualStockValue = actualCounts[item.name]?.[w.id];
                return actualStockValue !== undefined && actualStockValue !== systemStock;
            })
        );
    }, [filteredInventoryData, displayedWarehouses, actualCounts]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableRows = filteredInventoryData.flatMap(item => {
            return displayedWarehouses.map(w => {
                const systemStock = item.stock.get(w.id) || 0;
                return `
                    <tr class="item-row">
                        <td class="p-1 border border-black text-right">${item.name}</td>
                        <td class="p-1 border border-black text-center font-mono">${item.barcode}</td>
                        <td class="p-1 border border-black text-right">${w.name}</td>
                        <td class="p-1 border border-black text-center font-mono">${systemStock}</td>
                        <td class="p-1 border border-black text-center" style="width: 70px;"></td>
                        <td class="p-1 border border-black text-center" style="width: 90px;"></td>
                    </tr>
                `;
            }).join('');
        }).join('');


        const tableContent = `
            <table class="w-full text-right border-collapse mt-2">
                <thead>
                    <tr class="header-bg">
                        <th class="p-2 border border-black w-1/3">اسم الصنف</th>
                        <th class="p-2 border border-black w-24">الباركود</th>
                        <th class="p-2 border border-black w-1/6">المخزن</th>
                        <th class="p-2 border border-black w-1/6">الرصيد الدفتري</th>
                        <th class="p-2 border border-black w-1/6">الجرد الفعلي</th>
                        <th class="p-2 border border-black w-1/6">ملاحظات / الفرق</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>ورقة جرد المخازن - ${companyData.name}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 10px; color: #000; }
                        * { color: #000 !important; font-weight: 900 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        @page { size: A4; margin: 0.5cm; }
                        table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
                        th, td { border: 1px solid #000; padding: 5px; font-size: 8pt; line-height: 1.2; }
                        th { background-color: #e5e5e5 !important; font-size: 9pt; }
                        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 8px; }
                        .header h1 { font-size: 14pt; margin: 0; }
                        .header h2 { font-size: 11pt; margin: 5px 0 2px 0; }
                        .header p { font-size: 8pt; margin: 0; }
                        .item-row td { vertical-align: middle; }
                        .signature-section { display: flex; justify-content: space-between; padding: 0 20px; margin-top: 30px; font-size: 9pt; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                     <div class="header">
                        <h1>${companyData.name}</h1>
                        <h2>قائمة جرد وتسوية المخازن</h2>
                        <p>تاريخ الجرد: ${new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    ${tableContent}
                    <div class="signature-section">
                        <p>توقيع أمين المخزن: .........................</p>
                        <p>توقيع لجنة الجرد: .........................</p>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2 text-xs";

    return (
        <>
        <Modal title="تسوية المخزون (مدير النظام)" show={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)}>
            <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                    تنبيه: سيتم تعديل أرصدة المخزون في البرنامج لتتطابق تماماً مع الكميات الفعلية المدخلة الآن.
                    <br/>
                    يرجى إدخال كلمة مرور المدير للمتابعة.
                </p>
                <div>
                    <label className={labelClass}>كلمة المرور</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass}
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleConfirmAdjustment()}
                    />
                    {passwordError && <p className="text-red-500 text-sm mt-1 font-bold">{passwordError}</p>}
                </div>
                <div className="flex justify-end pt-4 space-x-2 space-x-reverse">
                    <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow">إلغاء</button>
                    <button type="button" onClick={handleConfirmAdjustment} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-green-700 transition-all">
                        تأكيد تسوية الأرصدة
                    </button>
                </div>
            </div>
        </Modal>
        
        {isResetModalOpen && (
            <ConfirmationModal
                title="تأكيد تصفير الجرد"
                message="هل أنت متأكد من مسح جميع الأرصدة الفعلية المدخلة؟ لن يتم تعديل أرصدة البرنامج."
                onConfirm={performResetCounts}
                onCancel={() => setIsResetModalOpen(false)}
                confirmText="نعم، قم بالتصفير"
                confirmColor="bg-orange-600"
            />
        )}


        <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">جرد وتسوية المخازن</h1>

            <div className={`${cardClass} print:hidden relative z-40`}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className={labelClass} htmlFor="item-search">بحث سريع (اسم الصنف أو الباركود)</label>
                        <input
                            id="item-search"
                            type="text"
                            placeholder="ابحث هنا..."
                            className={inputClass}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="warehouse-filter">المخزن</label>
                        <select
                            id="warehouse-filter"
                            value={selectedWarehouseId}
                            onChange={e => setSelectedWarehouseId(e.target.value)}
                            className={inputClass}
                        >
                            <option value="all">كل المخازن</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="balance-filter">فلتر الأرصدة</label>
                        <select
                            id="balance-filter"
                            value={balanceFilter}
                            onChange={e => setBalanceFilter(e.target.value as any)}
                            className={inputClass}
                        >
                            <option value="all">كل الأصناف</option>
                            <option value="positive">أصناف بها رصيد</option>
                            <option value="zero">أصناف صفرية</option>
                        </select>
                    </div>
                     <div>
                        <button onClick={handlePrint} className="w-full h-12 flex items-center justify-center bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-700 transition-all">
                            <PrintIcon /> <span className="mr-2">طباعة ورقة الجرد</span>
                        </button>
                    </div>
                </div>
                
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-300 dark:border-gray-600 pt-4">
                    <div className="flex gap-4">
                        <label className="flex items-center space-x-2 space-x-reverse cursor-pointer bg-black/5 dark:bg-white/5 px-4 py-2 rounded-lg hover:bg-black/10 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={showDifferencesOnly} 
                                onChange={(e) => setSearchFiltersOnly(e.target.checked)} 
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="font-bold text-gray-700 dark:text-gray-300">إظهار الفروقات فقط</span>
                        </label>
                        
                        <button 
                            onClick={() => setIsResetModalOpen(true)}
                            className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition-colors text-sm"
                        >
                            تصفير الجرد الفعلي
                        </button>
                    </div>

                    <button 
                        onClick={() => openPasswordModal('all')} 
                        disabled={!anyDifferenceExists}
                        className="bg-green-600 text-white font-black py-3 px-8 rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 transition-all"
                    >
                        تسوية الفروقات النهائية بالبرنامج
                    </button>
                </div>
            </div>

            <div id="print-area" className={cardClass}>
                <div className="overflow-auto max-h-[65vh] border rounded-lg shadow-inner">
                    <table className="w-full text-center border-collapse">
                        <thead className="sticky top-0 z-10 shadow-sm">
                             <tr className="bg-gray-200 dark:bg-gray-800">
                                <th rowSpan={2} className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-bold w-48 text-right">الصنف / الباركود</th>
                                {displayedWarehouses.map(w => (
                                    <th key={w.id} colSpan={3} className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-bold">{w.name}</th>
                                ))}
                                <th rowSpan={2} className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-bold w-24 print:hidden text-center">إجراء</th>
                            </tr>
                            <tr className="bg-gray-100 dark:bg-gray-700 text-xs">
                                {displayedWarehouses.map(w => (
                                    <React.Fragment key={w.id}>
                                        <th className="p-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold">البرنامج</th>
                                        <th className="p-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold w-24">الفعلي</th>
                                        <th className="p-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold">الفرق</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventoryData.length > 0 ? (
                                filteredInventoryData.map((item, index) => {
                                    const rowHasDifference = displayedWarehouses.some(w => {
                                        const systemStock = item.stock.get(w.id) || 0;
                                        const actualStockValue = actualCounts[item.name]?.[w.id];
                                        return actualStockValue !== undefined && actualStockValue !== systemStock;
                                    });

                                    return (
                                        <tr key={item.name} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}>
                                            <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold text-right">
                                                <div className="text-base font-bold">{item.name}</div>
                                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">{item.barcode}</div>
                                            </td>
                                            {displayedWarehouses.map(w => {
                                                const systemStock = item.stock.get(w.id) || 0;
                                                const actualStockValue = actualCounts[item.name]?.[w.id];
                                                const difference = actualStockValue !== undefined ? (systemStock - actualStockValue) : null;
                                                
                                                return (
                                                    <React.Fragment key={w.id}>
                                                        <td className="p-2 border border-gray-300 dark:border-gray-600 dark:text-gray-300 font-mono text-lg font-bold">
                                                            {systemStock}
                                                        </td>
                                                        <td className="p-2 border border-gray-300 dark:border-gray-600">
                                                            <input 
                                                                type="number"
                                                                inputMode="numeric"
                                                                className={`w-20 p-1 text-center rounded focus:outline-none focus:ring-2 focus:ring-blue-400 font-black text-lg
                                                                    ${actualStockValue !== undefined ? 'bg-yellow-100 dark:bg-yellow-900/40 text-blue-800 dark:text-blue-200 border border-blue-400' : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700'}
                                                                `}
                                                                value={actualStockValue === undefined ? '' : actualStockValue}
                                                                onChange={e => handleCountChange(item.name, w.id, e.target.value)}
                                                            />
                                                        </td>
                                                         <td className={`p-2 border border-gray-300 dark:border-gray-600 font-black text-lg`}>
                                                            {difference !== null ? (
                                                                <span className={difference > 0 ? 'text-red-600' : difference < 0 ? 'text-green-600' : 'text-gray-400'}>
                                                                    {difference === 0 ? '0' : difference > 0 ? `-${difference}` : `+${Math.abs(difference)}`}
                                                                </span>
                                                            ) : ''}
                                                        </td>
                                                    </React.Fragment>
                                                )
                                            })}
                                            <td className="p-2 border border-gray-300 dark:border-gray-600 print:hidden text-center">
                                                {rowHasDifference && (
                                                    <button 
                                                        onClick={() => openPasswordModal('single', item.name)} 
                                                        className="bg-blue-600 text-white font-bold py-1 px-3 rounded-lg shadow hover:bg-blue-700 text-xs transition-colors"
                                                        title="تسوية هذا الصنف فقط"
                                                    >
                                                        تسوية
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={displayedWarehouses.length * 3 + 2} className="p-12 text-center text-gray-500 font-bold italic">
                                        لا توجد أصناف مطابقة لمعايير البحث أو الفلترة المحددة.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </>
    );
};

export default WarehouseInventory;
