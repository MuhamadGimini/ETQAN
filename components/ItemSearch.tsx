
import React, { useState, useMemo } from 'react';
import type { Item, Warehouse } from '../types';
import { FormattedNumber } from './Shared';
import { searchMatch } from '../utils';

interface ItemSearchProps {
    items: Item[];
    warehouses: Warehouse[];
}

const ItemSearch: React.FC<ItemSearchProps> = ({ items, warehouses }) => {
    const [filters, setFilters] = useState({
        nameOrBarcode: '',
        sellPrice: '',
        purchasePrice: '',
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredItems = useMemo(() => {
        const { nameOrBarcode, sellPrice, purchasePrice } = filters;
        
        const sellPriceNum = sellPrice ? parseFloat(sellPrice) : null;
        const purchasePriceNum = purchasePrice ? parseFloat(purchasePrice) : null;

        if (!nameOrBarcode && sellPriceNum === null && purchasePriceNum === null) {
            return []; // Don't show anything if no filters are applied
        }

        return items?.filter(item => {
            const queryMatch = searchMatch(`${item.name} ${item.barcode}`, nameOrBarcode);
            const sellPriceMatch = sellPriceNum === null || item.sellPrice === sellPriceNum;
            const purchasePriceMatch = purchasePriceNum === null || item.purchasePrice === purchasePriceNum;

            return queryMatch && sellPriceMatch && purchasePriceMatch;
        }) || [];
    }, [items, filters]);

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-6 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-2";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">بحث الأصناف</h1>

            <div className={cardClass}>
                <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">فلاتر البحث</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass} htmlFor="nameOrBarcode">الاسم أو الكود أو الباركود</label>
                        <input
                            id="nameOrBarcode"
                            name="nameOrBarcode"
                            type="text"
                            value={filters.nameOrBarcode}
                            onChange={handleFilterChange}
                            className={inputClass}
                            placeholder="ابحث..."
                        />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="sellPrice">سعر البيع المطابق</label>
                        <input
                            id="sellPrice"
                            name="sellPrice"
                            type="number"
                            value={filters.sellPrice}
                            onChange={handleFilterChange}
                            className={inputClass}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="purchasePrice">سعر الشراء المطابق</label>
                        <input
                            id="purchasePrice"
                            name="purchasePrice"
                            type="number"
                            value={filters.purchasePrice}
                            onChange={handleFilterChange}
                            className={inputClass}
                            placeholder="0.00"
                        />
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">نتائج البحث ({filteredItems.length})</h2>
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full text-right">
                        <thead className="sticky top-0 bg-gray-200 dark:bg-gray-800 z-10">
                            <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                                <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الباركود</th>
                                <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">اسم الصنف</th>
                                <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">المخزن</th>
                                <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">الرصيد</th>
                                <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">سعر الشراء</th>
                                <th className="p-3 text-lg font-semibold text-gray-600 dark:text-gray-400">سعر البيع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => {
                                const warehouseName = warehouses?.find(w => w.id === item.warehouseId)?.name || 'غير معروف';
                                return (
                                    <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-white/20 dark:hover:bg-white/5">
                                        <td className="p-3 font-mono text-gray-700 dark:text-gray-300">{item.barcode}</td>
                                        <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{item.name}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{warehouseName}</td>
                                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{item.openingBalance}</td>
                                        <td className="p-3 text-red-600 dark:text-red-400"><FormattedNumber value={item.purchasePrice} /></td>
                                        <td className="p-3 text-green-600 dark:text-green-400"><FormattedNumber value={item.sellPrice} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ItemSearch;
