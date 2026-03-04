import React, { useState } from 'react';
import { ConfirmationModal, WarningIcon } from './Shared';

interface FactoryResetProps {
    onConfirmReset: () => void;
}

const FactoryReset: React.FC<FactoryResetProps> = ({ onConfirmReset }) => {
    const [confirmationStep, setConfirmationStep] = useState(0);

    const resetConfirmation = () => setConfirmationStep(0);

    const renderConfirmationModal = () => {
        switch (confirmationStep) {
            case 1:
                return (
                    <ConfirmationModal
                        title="الخطوة 1 من 3: هل أنت متأكد؟"
                        message="سيؤدي هذا الإجراء إلى حذف جميع البيانات. هل ترغب في المتابعة؟"
                        onConfirm={() => setConfirmationStep(2)}
                        onCancel={resetConfirmation}
                        confirmText="نعم، متابعة"
                        confirmColor="bg-red-600"
                    />
                );
            case 2:
                return (
                    <ConfirmationModal
                        title="الخطوة 2 من 3: تأكيد نهائي"
                        message="هذا الإجراء لا يمكن التراجع عنه. سيتم مسح كل شيء بشكل دائم."
                        onConfirm={() => setConfirmationStep(3)}
                        onCancel={resetConfirmation}
                        confirmText="أنا أفهم، استمر"
                        confirmColor="bg-red-700"
                    />
                );
            case 3:
                return (
                    <ConfirmationModal
                        title="الخطوة 3 من 3: تحذير أخير!"
                        message="سيتم الآن حذف جميع بياناتك. اضغط على 'حذف نهائي' للمتابعة."
                        onConfirm={() => { onConfirmReset(); resetConfirmation(); }}
                        onCancel={resetConfirmation}
                        confirmText="حذف نهائي"
                        confirmColor="bg-red-800"
                    />
                );
            default:
                return null;
        }
    };

    return (
        <>
            {renderConfirmationModal()}
            <div className="w-full h-full flex items-center justify-center p-4">
                <div 
                    className="w-full max-w-3xl text-center p-8 md:p-12 rounded-2xl shadow-lg dark:bg-gray-700/30 dark:border-white/20 bg-white/30 backdrop-blur-lg border border-white/40" 
                >
                    <WarningIcon />
                    <h1 className="text-4xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                        ضبط المصنع
                    </h1>
                    <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-10">
                        سيؤدي هذا الإجراء إلى حذف جميع البيانات المخزنة محليًا في متصفحك بشكل كامل ونهائي.
                        لا يمكن التراجع عن هذا الإجراء.
                    </p>
                     <button 
                        onClick={() => setConfirmationStep(1)} 
                        className="text-white bg-red-600 font-bold py-3 px-10 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transform hover:-translate-y-1 transition-all duration-300 text-lg"
                    >
                        <span>تأكيد ومتابعة عملية ضبط المصنع</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default FactoryReset;
