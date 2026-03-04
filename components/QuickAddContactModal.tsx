
import React, { useState, useEffect } from 'react';
import { Modal, PlusCircleIcon } from './Shared';
import type { Customer, Supplier, MgmtUser } from '../types';

interface QuickAddContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'customer' | 'supplier';
    initialQuery: string;
    onAdded: (contact: any) => void;
    currentUser: MgmtUser;
}

const QuickAddContactModal: React.FC<QuickAddContactModalProps> = ({
    isOpen, onClose, type, initialQuery, onAdded, currentUser
}) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        openingBalance: 0
    });

    useEffect(() => {
        if (isOpen) {
            // التحقق ذكياً: هل المدخل رقم موبايل أم اسم؟
            const isPhone = /^\d+$/.test(initialQuery.trim());
            if (isPhone) {
                setFormData({ name: '', phone: initialQuery.trim(), address: '', openingBalance: 0 });
            } else {
                setFormData({ name: initialQuery.trim(), phone: '', address: '', openingBalance: 0 });
            }
        }
    }, [isOpen, initialQuery]);

    const handleSave = () => {
        if (!formData.name.trim()) {
            alert('يرجى إدخال الاسم على الأقل');
            return;
        }

        const newContact = {
            id: Date.now(),
            ...formData,
            name: formData.name.trim(),
            createdBy: currentUser.username,
            createdAt: new Date().toISOString()
        };

        onAdded(newContact);
        onClose();
    };

    const inputClass = "h-11 w-full px-4 py-2 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";
    const labelClass = "block text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm";

    return (
        <Modal title={type === 'customer' ? 'إضافة عميل سريع' : 'إضافة مورد سريع'} show={isOpen} onClose={onClose}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>الاسم</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            className={inputClass} 
                            autoFocus={!formData.name}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>رقم الموبايل</label>
                        <input 
                            type="text" 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: e.target.value})} 
                            className={inputClass}
                            autoFocus={!!formData.phone}
                        />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>العنوان</label>
                    <input 
                        type="text" 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                        className={inputClass} 
                    />
                </div>
                <div>
                    <label className={labelClass}>رصيد أول المدة</label>
                    <input 
                        type="number" 
                        value={formData.openingBalance} 
                        onChange={e => setFormData({...formData, openingBalance: parseFloat(e.target.value) || 0})} 
                        className={inputClass} 
                    />
                </div>
                <div className="flex justify-end pt-4 gap-2">
                    <button onClick={onClose} className="bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">إلغاء</button>
                    <button onClick={handleSave} className="bg-green-600 text-white font-bold py-2 px-8 rounded-lg flex items-center gap-2">
                        <PlusCircleIcon className="h-5 w-5 ml-0" />
                        <span>حفظ وإضافة للفاتورة</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default QuickAddContactModal;
