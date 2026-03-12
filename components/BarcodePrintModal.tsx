
import React, { useState, useEffect, useRef } from 'react';
import { Modal, PrintIcon } from './Shared';
import { generateBarcodeSVG } from '../services/barcode';
import { FormattedNumber } from './Shared';

export interface BarcodeItem {
    name: string;
    barcode: string;
    price: number;
    originalPrice?: number;
    quantity: number;
}

interface BarcodePrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: BarcodeItem[];
    companyName: string;
}

interface PrintSettings {
    labelWidth: number; // mm
    labelHeight: number; // mm
    fontSize: number; // pt
    barcodeHeight: number; // px (relative)
    showCompanyName: boolean;
    showItemName: boolean;
    showPrice: boolean;
    gap: number; // mm
}

const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({ isOpen, onClose, items, companyName }) => {
    const [localItems, setLocalItems] = useState<BarcodeItem[]>([]);
    const [settings, setSettings] = useState<PrintSettings>({
        labelWidth: 38,
        labelHeight: 25,
        fontSize: 10,
        barcodeHeight: 40,
        showCompanyName: true,
        showItemName: true,
        showPrice: true,
        gap: 2
    });

    useEffect(() => {
        if (isOpen) {
            // Clone items to avoid mutating props and set default quantities if needed
            setLocalItems(items.map(i => ({ ...i, quantity: i.quantity > 0 ? i.quantity : 1 })));
        }
    }, [isOpen, items]);

    const handleQuantityChange = (index: number, val: string) => {
        const newQty = parseInt(val) || 0;
        const updated = [...localItems];
        updated[index].quantity = newQty;
        setLocalItems(updated);
    };

    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : parseFloat(value)
        }));
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const getPriceHtmlForPrint = (item: BarcodeItem) => {
            if (!settings.showPrice) return '';

            const showDiscount = item.originalPrice !== undefined && item.originalPrice !== item.price;
            
            if (showDiscount) {
                return `
                    <div style="display: flex; align-items: baseline; justify-content: center; gap: 8px; width: 100%; margin-top: 1px; font-weight: bold;">
                        <div style="display: flex; align-items: baseline; gap: 3px; text-decoration: line-through; color: #555;">
                            <span style="font-size: ${settings.fontSize - 2}pt;">قبل:</span>
                            <span style="font-size: ${settings.fontSize}pt;">
                                ${item.originalPrice?.toFixed(2)}
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 3px; color: #000;">
                            <span style="font-size: ${settings.fontSize - 2}pt;">بعد:</span>
                            <span style="font-size: ${settings.fontSize + 2}pt;">
                                ${item.price.toFixed(2)}
                            </span>
                        </div>
                    </div>
                `;
            } else {
                return `<div class="price">${item.price.toFixed(2)}</div>`;
            }
        };

        const style = `
            @page {
                size: ${settings.labelWidth}mm ${settings.labelHeight}mm;
                margin: 0;
            }
            body {
                margin: 0;
                padding: 0;
                font-family: sans-serif;
            }
            .label-container {
                width: ${settings.labelWidth}mm;
                height: ${settings.labelHeight}mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                page-break-after: always;
                overflow: hidden;
                box-sizing: border-box;
                padding: 1mm;
            }
            .company-name { font-size: ${settings.fontSize - 2}pt; font-weight: normal; margin-bottom: 1px; white-space: nowrap; }
            .item-name { font-size: ${settings.fontSize + 1}pt; font-weight: bold; margin-bottom: 1px; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
            .barcode-svg { height: ${settings.barcodeHeight}px; width: 90%; display: block; margin: 0 auto; }
            .barcode-text { font-size: ${settings.fontSize}pt; letter-spacing: 1px; font-weight: bold; }
            .price { font-size: ${settings.fontSize + 2}pt; font-weight: bold; margin-top: 1px; }
        `;

        // Generate HTML for all labels
        let htmlContent = '';
        localItems.forEach(item => {
            if (item.quantity > 0) {
                const svg = generateBarcodeSVG(item.barcode);
                const labelHtml = `
                    <div class="label-container">
                        ${settings.showCompanyName ? `<div class="company-name">${companyName}</div>` : ''}
                        ${settings.showItemName ? `<div class="item-name">${item.name}</div>` : ''}
                        <div class="barcode-wrapper">
                             ${svg.replace('<svg', `<svg class="barcode-svg"`)}
                             <div class="barcode-text">${item.barcode}</div>
                        </div>
                        ${getPriceHtmlForPrint(item)}
                    </div>
                `;

                for (let i = 0; i < item.quantity; i++) {
                    htmlContent += labelHtml;
                }
            }
        });

        printWindow.document.write(`
            <html>
            <head>
                <title>Print Barcodes</title>
                <style>${style}</style>
            </head>
            <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
                ${htmlContent}
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const renderPreviewPrice = (item?: BarcodeItem) => {
        if (!settings.showPrice || !item) {
            return null;
        }

        const showDiscount = item.originalPrice !== undefined && item.originalPrice !== item.price;

        if (showDiscount) {
            return (
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px', marginTop: '1px', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', textDecoration: 'line-through', color: '#555' }}>
                        <span style={{ fontSize: `${settings.fontSize - 2}pt` }}>قبل:</span>
                        <span style={{ fontSize: `${settings.fontSize}pt` }}>
                            {item.originalPrice?.toFixed(2)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', color: '#000' }}>
                        <span style={{ fontSize: `${settings.fontSize - 2}pt` }}>بعد:</span>
                        <span style={{ fontSize: `${settings.fontSize + 2}pt` }}>
                            {item.price.toFixed(2)}
                        </span>
                    </div>
                </div>
            );
        } else {
            return (
                <div style={{ fontSize: `${settings.fontSize + 2}pt`, fontWeight: 'bold', marginTop: '1px' }}>
                    {(item.price || 0).toFixed(2)}
                </div>
            );
        }
    };

    const inputClass = "w-full px-2 py-1 bg-white border border-gray-300 rounded text-sm text-black";
    const labelClass = "block text-xs text-gray-600 dark:text-gray-300 mb-1";

    return (
        <Modal title="طباعة الباركود" show={isOpen} onClose={onClose}>
            <div className="flex flex-col md:flex-row gap-4 h-[70vh]">
                
                {/* Left Column: Settings & Item List */}
                <div className="w-full md:w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
                    
                    {/* Settings Panel */}
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg border border-gray-300 dark:border-gray-600">
                        <h3 className="font-bold text-sm mb-2 text-gray-700 dark:text-gray-200">إعدادات الملصق</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className={labelClass}>العرض (mm)</label><input type="number" name="labelWidth" value={settings.labelWidth} onChange={handleSettingChange} className={inputClass} /></div>
                            <div><label className={labelClass}>الارتفاع (mm)</label><input type="number" name="labelHeight" value={settings.labelHeight} onChange={handleSettingChange} className={inputClass} /></div>
                            <div><label className={labelClass}>حجم الخط (pt)</label><input type="number" name="fontSize" value={settings.fontSize} onChange={handleSettingChange} className={inputClass} /></div>
                            <div><label className={labelClass}>ارتفاع الباركود</label><input type="number" name="barcodeHeight" value={settings.barcodeHeight} onChange={handleSettingChange} className={inputClass} /></div>
                        </div>
                        <div className="mt-2 space-y-1">
                            <label className="flex items-center text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" name="showCompanyName" checked={settings.showCompanyName} onChange={handleSettingChange} className="ml-2" /> إظهار اسم الشركة</label>
                            <label className="flex items-center text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" name="showItemName" checked={settings.showItemName} onChange={handleSettingChange} className="ml-2" /> إظهار اسم الصنف</label>
                            <label className="flex items-center text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" name="showPrice" checked={settings.showPrice} onChange={handleSettingChange} className="ml-2" /> إظهار السعر</label>
                        </div>
                    </div>

                    {/* Item List with Quantities */}
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg max-h-[70vh]">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                                <tr>
                                    <th className="p-2">الصنف</th>
                                    <th className="p-2 w-20">العدد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {localItems.map((item, idx) => (
                                    <tr key={idx} className="border-b dark:border-gray-700">
                                        <td className="p-2 text-gray-800 dark:text-gray-200">
                                            <div className="font-bold">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.barcode}</div>
                                        </td>
                                        <td className="p-2">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                value={item.quantity} 
                                                onChange={(e) => handleQuantityChange(idx, e.target.value)} 
                                                className="w-full p-1 border rounded text-center text-black"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Preview */}
                <div className="w-full md:w-1/2 bg-gray-200 dark:bg-gray-900 p-4 rounded-lg flex flex-col items-center justify-center border border-gray-300 dark:border-gray-600">
                    <h3 className="font-bold text-gray-600 dark:text-gray-400 mb-4">معاينة الملصق (تقريبي)</h3>
                    <div 
                        className="bg-white shadow-lg flex flex-col items-center justify-center text-center overflow-hidden text-black"
                        style={{
                            width: `${settings.labelWidth}mm`,
                            height: `${settings.labelHeight}mm`,
                            padding: '1mm',
                            transform: 'scale(2)',
                            transformOrigin: 'center'
                        }}
                    >
                        {settings.showCompanyName && <div style={{ fontSize: `${settings.fontSize - 2}pt`, fontWeight: 'normal', margin: '0', whiteSpace: 'nowrap' }}>{companyName}</div>}
                        {settings.showItemName && <div style={{ fontSize: `${settings.fontSize + 1}pt`, fontWeight: 'bold', margin: '1px 0', whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{localItems[0]?.name || 'اسم الصنف'}</div>}
                        
                        <div className="w-[90%] my-1" dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(localItems[0]?.barcode || '123456') }} style={{ height: `${settings.barcodeHeight}px` }} />
                        <div style={{ fontSize: `${settings.fontSize}pt`, letterSpacing: '1px', margin: '0', fontWeight: 'bold' }}>{localItems[0]?.barcode || '123456'}</div>

                        {renderPreviewPrice(localItems[0])}
                    </div>
                </div>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-gray-300 dark:border-gray-600 space-x-2 space-x-reverse">
                <button onClick={onClose} className="bg-gray-500 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-gray-600">إلغاء</button>
                <button onClick={handlePrint} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-blue-700 flex items-center">
                    <PrintIcon /> <span className="mr-2">طباعة الملصقات</span>
                </button>
            </div>
        </Modal>
    );
};

export default BarcodePrintModal;
