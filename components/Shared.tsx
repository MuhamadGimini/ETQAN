

import React from 'react';
import type { NotificationType } from '../types';
import { formatNumber } from '../utils';

// --- Icons ---
// FIX: Added className prop to all icons to allow style overrides and resolve TS errors.
export const PlusCircleIcon = ({ className = "h-5 w-5 ml-2" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
export const SwitchHorizontalIcon = ({ className = "h-5 w-5 ml-2" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
export const EditIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
export const DeleteIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>;
export const SunIcon = ({ className = "h-6 w-6" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
export const MoonIcon = ({ className = "h-6 w-6" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
export const PrintIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
export const ViewIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>;
export const PdfIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
export const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l.287.468-1.173 4.249 4.35-1.14z" /></svg>;
export const DownloadIcon = ({ className = "h-6 w-6 mr-2 text-blue-500" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;

export const UploadIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6 mr-2 text-green-500" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
);
export const WarningIcon = ({ className = "h-16 w-16 text-yellow-500 mx-auto mb-4" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
export const DocumentIcon = ({ className = "h-16 w-16 text-blue-500 mx-auto mb-4" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
export const ChevronDownIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
export const RefreshIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
export const BarcodeIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14M8 5v14M12 5v14M16 5v14M21 5v14"/></svg>;
export const DatabaseIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>;
export const LockClosedIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>;
export const LockOpenIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" /></svg>;
export const CloudIcon = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;
export const ShoppingCartIcon = ({ className = "h-8 w-8" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
export const ArchiveIcon = ({ className = "h-8 w-8" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
export const CalculatorIcon = ({ className = "h-8 w-8" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
export const CogIcon = ({ className = "h-8 w-8" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
export const ShieldCheckIcon = ({ className = "h-8 w-8" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 22a12.02 12.02 0 009-1.056c.343-.343.672-.694.988-1.056A11.953 11.953 0 0121.618 11z" /></svg>;
export const ChartBarIcon = ({ className = "h-8 w-8" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;

export const DropboxIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 2.5L2 6.5l5 4 5-4-5-4zm10 0l-5 4 5 4 5-4-5-4zM2 14.5l5 4 5-4-5-4-5 4zm15 4l-5-4-5 4 5 3.5 5-3.5zm5-4l-5-4-5 4 5 4 5-4z"/>
    </svg>
);
export const GoogleDriveIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.33 3h7.34l7.15 12.44-3.65 6.36-7.37-12.83L8.33 3zm-1.12 1.94L1.18 15.5h7.37l6.06-10.56H7.21zM2.37 17l3.65 6.33h12.59l-3.65-6.33H2.37z"/>
    </svg>
);
export const OneDriveIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 5c-2.3 0-4.24 1.44-5.02 3.49C9.9 8.2 9.22 8 8.5 8c-2.48 0-4.5 2.02-4.5 4.5 0 .15.02.29.04.44C2.33 13.59 1 15.14 1 17c0 2.21 1.79 4 4 4h12.5c3.04 0 5.5-2.46 5.5-5.5 0-2.8-2.09-5.12-4.77-5.46C17.93 7.21 16.82 5 15.5 5z"/>
    </svg>
);

// --- Components ---

// Modal Component
export const Modal: React.FC<{ title: string, show: boolean, onClose: () => void, children: React.ReactNode }> = ({ title, show, onClose, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] print:hidden" onClick={onClose}>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-4xl border border-white/30 dark:border-gray-600 animate-fade-in-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-300 dark:border-gray-600 pb-2">{title}</h2>
                {children}
            </div>
        </div>
    );
};

// ConfirmationModal Component
export const ConfirmationModal: React.FC<{ title: string, message: string, onConfirm: () => void, onCancel: () => void, confirmText: string, confirmColor?: string }> = ({ title, message, onConfirm, onCancel, confirmText, confirmColor = 'bg-blue-600' }) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] print:hidden">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-white/30 dark:border-gray-600 text-center animate-fade-in-up">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">{title}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex justify-center space-x-4 space-x-reverse">
                    <button onClick={onCancel} className="bg-gray-500 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-gray-600 transition-colors">إلغاء</button>
                    <button onClick={onConfirm} className={`${confirmColor} text-white font-bold py-2 px-6 rounded-lg shadow-md hover:opacity-90 transition-opacity`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};
// ActionFeedback Component
export const ActionFeedback: React.FC<{ type: NotificationType }> = ({ type }) => {
    const messages = { add: 'تمت الإضافة بنجاح', save: 'تم الحفظ بنجاح', edit: 'تم التعديل بنجاح', delete: 'تم الحذف بنجاح', error: 'حدث خطأ ما' };
    const colors = { add: 'bg-green-500', save: 'bg-blue-500', edit: 'bg-yellow-500', delete: 'bg-red-500', error: 'bg-red-700' };
    return <div className={`fixed bottom-5 right-5 ${colors[type]} text-white py-3 px-6 rounded-lg shadow-lg animate-fade-in-up z-[200]`}>{messages[type]}</div>;
};

// FormattedNumber Component
export const FormattedNumber: React.FC<{ value: number | string | null | undefined, className?: string }> = ({ value, className = '' }) => {
    const formatted = formatNumber(value);
    const [integerPart, decimalPart] = formatted.split('.');

    return (
        <span className={className}>
            {integerPart}
            <span className="text-[75%] align-baseline">.{decimalPart}</span>
        </span>
    );
};
