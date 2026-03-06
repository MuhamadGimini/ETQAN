
import React, { useState } from 'react';
import { APP_VERSION, BUILD_DATE } from '../constants/version';
import { DownloadIcon, WarningIcon, UploadIcon } from './Shared';
import { exportDB } from '../services/db';
import type { LicenseStatus } from '../services/license';

interface UpdateManagementProps {
    licenseStatus: LicenseStatus | null;
    latestVersion?: string;
    downloadUrl?: string;
    releaseNotes?: string;
    onNavigate: (view: string) => void;
}

const UpdateManagement: React.FC<UpdateManagementProps> = ({ licenseStatus, latestVersion, downloadUrl, releaseNotes, onNavigate }) => {
    const [isChecking, setIsChecking] = useState(false);
    
    const hasUpdate = latestVersion && latestVersion !== APP_VERSION;

    const handleCheckUpdate = () => {
        setIsChecking(true);
        // In a real app, this might trigger a re-fetch in the parent or here.
        // For now, we rely on the parent's auto-check or just simulate a delay if no repo is set.
        setTimeout(() => {
            setIsChecking(false);
            if (latestVersion) {
                if (latestVersion === APP_VERSION) {
                    alert(`نسختك محدثة بالفعل. الإصدار الحالي ${APP_VERSION} هو الأحدث.`);
                } else {
                    alert(`يوجد تحديث جديد متاح! الإصدار الجديد هو ${latestVersion}.`);
                }
            } else {
                alert("لم يتم العثور على تحديثات أو لم يتم إعداد مستودع GitHub في الإعدادات.");
            }
        }, 1500);
    };

    const handleBackup = async () => {
        const binary = await exportDB();
        if (!binary) return;
        
        const blob = new Blob([binary], { type: 'application/vnd.sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos_backup_pre_update_${new Date().toISOString().slice(0, 10)}.sqlite`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("تم حفظ النسخة الاحتياطية بنجاح. يمكنك الآن المتابعة في التحديث بأمان.");
    };

    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-8 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">تحديث النظام</h1>

            {/* Current Version Info */}
            <div className={cardClass}>
                <div className="flex items-center justify-between mb-6 border-b border-gray-300 dark:border-gray-600 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">الإصدار الحالي</h2>
                        <p className="text-gray-600 dark:text-gray-400">تاريخ البناء: {BUILD_DATE}</p>
                    </div>
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                        v{APP_VERSION}
                    </div>
                </div>

                {licenseStatus && !licenseStatus.isActivated ? (
                    <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-xl border border-red-200 dark:border-red-800 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-red-200 dark:bg-red-800 rounded-full text-red-600 dark:text-red-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">خدمة التحديثات غير متاحة</h3>
                        <p className="text-gray-700 dark:text-gray-300 text-lg mb-4">
                            للحصول على تحديثات البرنامج والميزات الجديدة، يجب تفعيل النسخة أولاً.
                        </p>
                        <button 
                            onClick={() => onNavigate('settingsActivation')}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md"
                        >
                            للتفعيل اضغط هنا للتحويل الى تفعيل البرنامج
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 mb-6">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <WarningIcon />
                                </div>
                                <div className="mr-3">
                                    <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">آلية التحديث الآمن</h3>
                                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                                        <p>نظامنا يستخدم تقنية تخزين البيانات المحلية المتقدمة (IndexedDB + SQLite).</p>
                                        <p className="font-bold">عند تثبيت تحديث جديد (استبدال ملفات البرنامج)، تظل قاعدة بياناتك وأرصدتك كما هي دون تغيير.</p>
                                        <p>ومع ذلك، نوصي دائمًا بأخذ نسخة احتياطية قبل أي تحديث.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mt-8">
                            <button 
                                onClick={handleBackup}
                                className="flex items-center justify-center bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-700 transition-all w-full md:w-auto"
                            >
                                <DownloadIcon />
                                <span className="mr-2">1. تحميل نسخة احتياطية (يوصى به)</span>
                            </button>
                            
                            <button 
                                onClick={handleCheckUpdate}
                                disabled={isChecking}
                                className="flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-blue-400 transition-all w-full md:w-auto"
                            >
                                {isChecking ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        جاري التحقق...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <UploadIcon />
                                        <span className="mr-2">2. التحقق من وجود تحديثات</span>
                                    </span>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Update Status Result */}
            {latestVersion && licenseStatus?.isActivated && (
                <div className={`${cardClass} animate-fade-in-up`}>
                    {hasUpdate ? (
                        <div className="text-center">
                            <div className="inline-block p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">يوجد تحديث جديد متاح!</h2>
                            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">الإصدار الجديد: <span className="font-mono font-bold">{latestVersion}</span></p>
                            
                            {releaseNotes && (
                                <div className={`${cardClass} mb-6 text-right bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800`}>
                                    <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                                        <span>📝</span> أهم النقاط في التحديث الجديد:
                                    </h3>
                                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {releaseNotes}
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-right max-w-2xl mx-auto mb-6">
                                <h4 className="font-bold mb-2">طريقة التحديث:</h4>
                                <ol className="list-decimal list-inside space-y-2 text-sm">
                                    <li>قم بتحميل ملف التحديث من الرابط أدناه.</li>
                                    <li>قم بفك ضغط الملف الجديد.</li>
                                    <li>استبدل الملفات القديمة بالملفات الجديدة في مجلد البرنامج.</li>
                                    <li>أعد تشغيل البرنامج. (ستجد بياناتك كما هي).</li>
                                </ol>
                            </div>

                            <a 
                                href={downloadUrl || '#'} 
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-colors"
                            >
                                تحميل التحديث
                            </a>
                        </div>
                    ) : (
                        <div className="text-center">
                             <div className="inline-block p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">نسختك محدثة</h2>
                            <p className="text-gray-600 dark:text-gray-400">أنت تستخدم أحدث إصدار من النظام.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UpdateManagement;
