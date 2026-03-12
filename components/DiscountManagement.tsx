
import React, { useState, useMemo, useEffect } from 'react';
import { PrintIcon, DeleteIcon, ChevronDownIcon, FormattedNumber } from './Shared';
import type { Item, CompanyData, NotificationType, StorableDiscountItem } from '../types';
import { searchMatch } from '../utils';
import BarcodePrintModal, { BarcodeItem } from './BarcodePrintModal';

interface DiscountManagementProps {
    items: Item[];
    companyData: CompanyData;
    activeDiscounts: Record<number, number>;
    setActiveDiscounts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
    showNotification: (type: NotificationType) => void;
    selectedDiscountItems: StorableDiscountItem[];
    setSelectedDiscountItems: React.Dispatch<React.SetStateAction<StorableDiscountItem[]>>;
}

interface DiscountItemRow {
    item: Item;
    discountPrice: number;
    printQty: number;
    totalAvailableQty: number;
}

const DiscountManagement: React.FC<DiscountManagementProps> = ({ 
    items, companyData, activeDiscounts, setActiveDiscounts, showNotification,
    selectedDiscountItems, setSelectedDiscountItems
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [listSearchQuery, setListSearchQuery] = useState('');
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [itemsToPrint, setItemsToPrint] = useState<BarcodeItem[]>([]);

    const selectedItems: DiscountItemRow[] = useMemo(() => {
        return selectedDiscountItems.map(storableItem => {
            const item = items.find(i => i.id === storableItem.itemId);
            if (!item) return null;

            const totalQuantity = items
                .filter(i => i.name === item.name)
                .reduce((sum, i) => sum + i.openingBalance, 0);

            return {
                item: item,
                discountPrice: storableItem.discountPrice,
                printQty: storableItem.printQty,
                totalAvailableQty: totalQuantity,
            };
        }).filter((item): item is DiscountItemRow => item !== null);
    }, [selectedDiscountItems, items]);

    const filteredSelectedItems = useMemo(() => {
        if (!listSearchQuery) {
            return selectedItems;
        }
        return selectedItems.filter(row => 
            searchMatch(`${row.item.name} ${row.item.barcode}`, listSearchQuery)
        );
    }, [selectedItems, listSearchQuery]);


    const suggestedItems = useMemo(() => {
        if (!searchQuery) return [];
        return items.filter(item => 
            searchMatch(`${item.name} ${item.barcode}`, searchQuery)
        );
    }, [searchQuery, items]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setIsSuggestionsOpen(true);
    };

    const handleAddItem = (item: Item) => {
        const itemIsAlreadySelected = selectedItems.some(row => row.item.name === item.name);
        if (itemIsAlreadySelected) {
            alert("هذا الصنف مضاف بالفعل للقائمة");
            setSearchQuery('');
            setIsSuggestionsOpen(false);
            return;
        }

        const totalQuantity = items
            .filter(i => i.name === item.name)
            .reduce((sum, i) => sum + i.openingBalance, 0);

        const activeDiscountForThisName = Object.entries(activeDiscounts).find(([itemId, price]) => {
            const itemDetails = items.find(i => i.id === Number(itemId));
            return itemDetails?.name === item.name;
        });

        const newStorableItem: StorableDiscountItem = {
            itemId: item.id,
            discountPrice: activeDiscountForThisName ? (activeDiscountForThisName[1] as number) : item.sellPrice,
            printQty: totalQuantity > 0 ? totalQuantity : 1,
        };

        setSelectedDiscountItems(prev => [...prev, newStorableItem]);
        setSearchQuery('');
        setIsSuggestionsOpen(false);
    };

    const handleRemoveItem = (index: number) => {
        setSelectedDiscountItems(prev => {
            const newItems = [...prev];
            newItems.splice(index, 1);
            return newItems;
        });
    };

    const handleUpdateRow = (index: number, field: 'discountPrice' | 'printQty', value: string) => {
        const val = parseFloat(value);
        if (isNaN(val) || val < 0) return;
        setSelectedDiscountItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: val };
            return newItems;
        });
    };

    const handleApplyDiscounts = () => {
        const updatedDiscounts = { ...activeDiscounts };
        let newDiscountsApplied = false;
        const itemNamesToKeep = new Set<string>();

        selectedItems.forEach(row => {
            const itemsToUpdate = items.filter(i => i.name === row.item.name);
            let hasActiveDiscount = false;
            
            itemsToUpdate.forEach(itemInstance => {
                if (row.discountPrice < itemInstance.sellPrice) {
                    if (updatedDiscounts[itemInstance.id] !== row.discountPrice) {
                        updatedDiscounts[itemInstance.id] = row.discountPrice;
                        newDiscountsApplied = true;
                    }
                    hasActiveDiscount = true;
                } else {
                    if (updatedDiscounts[itemInstance.id]){
                        delete updatedDiscounts[itemInstance.id];
                        newDiscountsApplied = true; 
                    }
                }
            });
            
            if (hasActiveDiscount) {
                itemNamesToKeep.add(row.item.name);
            }
        });

        setActiveDiscounts(updatedDiscounts);

        const newSelectedDiscountItems = selectedDiscountItems.filter(storableItem => {
            const item = items.find(i => i.id === storableItem.itemId);
            return item && itemNamesToKeep.has(item.name);
        });

        setSelectedDiscountItems(newSelectedDiscountItems);

        if (newDiscountsApplied) {
            showNotification('save');
            alert('تم تفعيل/تحديث الخصومات بنجاح.');
        } else {
            alert('لم يتم تحديد أسعار مخفضة جديدة لتطبيقها.');
        }
    };


    const handlePrintClick = () => {
        if (selectedItems.length === 0) {
            alert("لا يوجد أصناف للطباعة");
            return;
        }
        const barcodeItems: BarcodeItem[] = selectedItems.map(row => ({
            name: row.item.name,
            barcode: row.item.barcode,
            originalPrice: row.item.sellPrice,
            price: row.discountPrice,
            quantity: row.printQty
        })).filter(i => i.quantity > 0);

        if (barcodeItems.length === 0) {
            alert("يرجى تحديد كميات للطباعة");
            return;
        }
        setItemsToPrint(barcodeItems);
        setIsBarcodeModalOpen(true);
    };

    const handlePrintSingleItem = (row: DiscountItemRow) => {
        if (row.printQty <= 0) {
            alert("يرجى تحديد كمية للطباعة");
            return;
        }
        setItemsToPrint([{
            name: row.item.name,
            barcode: row.item.barcode,
            originalPrice: row.item.sellPrice,
            price: row.discountPrice,
            quantity: row.printQty
        }]);
        setIsBarcodeModalOpen(true);
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const tableInputClass = "w-24 px-2 py-1 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">طباعة ملصقات الخصومات</h1>

            <BarcodePrintModal 
                isOpen={isBarcodeModalOpen}
                onClose={() => setIsBarcodeModalOpen(false)}
                items={itemsToPrint}
                companyName={companyData.name}
            />

            <div className={`${cardClass} relative z-20`}>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">بحث وإضافة أصناف</label>
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => setIsSuggestionsOpen(true)}
                        onBlur={() => {
                            setTimeout(() => {
                                if (isSuggestionsOpen && suggestedItems.length > 0 && searchQuery) {
                                    handleAddItem(suggestedItems[0]);
                                }
                                setIsSuggestionsOpen(false);
                            }, 250);
                        }}
                        placeholder="ابحث بالاسم أو الباركود..."
                        className={inputClass}
                        autoComplete="off"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon />
                    </div>
                    
                    {isSuggestionsOpen && suggestedItems.length > 0 && (
                        <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                            {suggestedItems.map(item => (
                                <li 
                                    key={item.id} 
                                    onMouseDown={() => handleAddItem(item)} 
                                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between border-b border-gray-100 dark:border-gray-700 last:border-0"
                                >
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{item.name}</span>
                                    <span className="text-gray-500 text-sm">
                                        باركود: {item.barcode} | السعر: {item.sellPrice}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className={cardClass}>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">قائمة الأصناف المختارة</h2>
                    
                    <div className="flex-grow max-w-md">
                        <input
                            type="text"
                            placeholder="بحث في القائمة المختارة..."
                            value={listSearchQuery}
                            onChange={(e) => setListSearchQuery(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="flex space-x-2 space-x-reverse">
                         <button 
                            onClick={handleApplyDiscounts}
                            disabled={selectedItems.length === 0}
                            className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            تفعيل الخصومات
                        </button>
                        <button 
                            onClick={handlePrintClick}
                            disabled={selectedItems.length === 0}
                            className="flex items-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <PrintIcon />
                            <span className="mr-2">طباعة الكل</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                        <table className="w-full text-right">
                        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                            <tr className="bg-gray-200 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                                <th className="p-3 text-gray-700 dark:text-gray-300">الباركود</th>
                                <th className="p-3 text-gray-700 dark:text-gray-300">اسم الصنف</th>
                                <th className="p-3 text-gray-700 dark:text-gray-300">الرصيد الكلي</th>
                                <th className="p-3 text-gray-700 dark:text-gray-300">السعر الأصلي</th>
                                <th className="p-3 text-gray-700 dark:text-gray-300">السعر المخفض</th>
                                <th className="p-3 text-gray-700 dark:text-gray-300">الكمية للطباعة</th>
                                <th className="p-3 text-gray-700 dark:text-gray-300">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSelectedItems.length > 0 ? (
                                filteredSelectedItems.map((row) => {
                                    const originalIndex = selectedItems.findIndex(originalRow => originalRow.item.id === row.item.id);
                                    return (
                                    <tr key={row.item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                        <td className="p-3 font-mono text-gray-600 dark:text-gray-400">{row.item.barcode}</td>
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{row.item.name}</td>
                                        <td className="p-3 text-blue-600 dark:text-blue-400 font-bold">{row.totalAvailableQty}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400"><FormattedNumber value={row.item.sellPrice} /></td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                min="0"
                                                step="0.01"
                                                value={row.discountPrice}
                                                onChange={(e) => handleUpdateRow(originalIndex, 'discountPrice', e.target.value)}
                                                className={`${tableInputClass} text-green-600 font-bold`}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={row.printQty}
                                                onChange={(e) => handleUpdateRow(originalIndex, 'printQty', e.target.value)}
                                                className={tableInputClass}
                                            />
                                        </td>
                                        <td className="p-3 flex items-center justify-center space-x-2 space-x-reverse">
                                            <button 
                                                onClick={() => handlePrintSingleItem(row)}
                                                className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition-colors"
                                                title="طباعة"
                                            >
                                                <PrintIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveItem(originalIndex)}
                                                className="text-red-500 hover:bg-red-100 p-2 rounded-full transition-colors"
                                                title="حذف"
                                            >
                                                <DeleteIcon />
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        لم يتم اختيار أصناف بعد.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DiscountManagement;
