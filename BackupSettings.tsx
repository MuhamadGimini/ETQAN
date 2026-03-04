import React, { useState, useRef, useEffect } from 'react';
import { ConfirmationModal, DownloadIcon, UploadIcon, Modal, EditIcon, DeleteIcon } from './Shared';
import type { AppBackupData, NotificationType, DatabaseProfile } from '../types';
import { exportDB, importDB, getInternalBackups, restoreFromInternalBackup } from '../services/db';

interface BackupSettingsProps {
    appData: AppBackupData;
    onRestore: (data: AppBackupData) => void;
    showNotification: (type: NotificationType) => void;
    databases: DatabaseProfile[];
    setDatabases: React.Dispatch<React.SetStateAction<DatabaseProfile[]>>;
    activeDatabaseId: string;
    setActiveDatabaseId: React.Dispatch<React.SetStateAction<string>>;
    allDataKeys: string[];
}
interface InternalBackup {
    key: string;
    date: string;
}

const BackupSettings: React.FC<BackupSettingsProps> = ({ 
    appData, onRestore, showNotification, databases, setDatabases, activeDatabaseId, setActiveDatabaseId, allDataKeys
}) => {
    const importFileRef = useRef<HTMLInputElement>(null);
    const importSqliteRef = useRef<HTMLInputElement>(null);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [backupDataToRestore, setBackupDataToRestore] = useState<AppBackupData | null>(null);

    // State for Database Management Modals
    const [isCreateDbModalOpen, setIsCreateDbModalOpen] = useState(false);
    const [newDbName, setNewDbName] = useState('');
    const [isRenameDbModalOpen, setIsRenameDbModalOpen] = useState(false);
    const [dbToRename, setDbToRename] = useState<DatabaseProfile | null>(null);
    const [isDeleteDbModalOpen, setIsDeleteDbModalOpen] = useState(false);
    const [dbToDelete, setDbToDelete] = useState<DatabaseProfile | null>(null);

    // State for Automatic Backups
    const [internalBackups, setInternalBackups] = useState<InternalBackup[]>([]);
    const [backupToRestore, setBackupToRestore] = useState<InternalBackup | null>(null);

    const activeDatabaseName = databases.find(db => db.id === activeDatabaseId)?.name || 'غير معروف';

    useEffect(() => {
        const fetchBackups = async () => {
            const backups = await getInternalBackups();
            setInternalBackups(backups);
        };
        fetchBackups();
    }, []);

    const handleRestoreInternal = (backup: InternalBackup) => {
        setBackupToRestore(backup);
    };

    const confirmRestoreInternal = async () => {
        if (backupToRestore) {
            try {
                await restoreFromInternalBackup(backupToRestore.key);
                // The page will reload automatically
            } catch (error) {
                alert("فشل استعادة النسخة الاحتياطية.");
                console.error(error);
            }
        }
        setBackupToRestore(null);
    };

    const handleExport = async () => {
        const jsonString = JSON.stringify(appData, null, 2);
        const fileName = `pos_backup_${activeDatabaseId}_${new Date().toISOString().slice(0, 10)}.json`;

        if (window.electronAPI) {
            const result = await window.electronAPI.saveFile(jsonString, {
                title: 'Save JSON Backup',
                defaultPath: fileName,
                filters: [{ name: 'JSON Files', extensions: ['json'] }]
            });
            if (result.success) showNotification('save');
        } else {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const href = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = href;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
            showNotification('save');
        }
    };

    const handleImportClick = async () => {
        if (window.electronAPI) {
            const result = await window.electronAPI.openFile({
                title: 'Import JSON Backup',
                filters: [{ name: 'JSON Files', extensions: ['json'] }],
                properties: ['openFile']
            });
            if (result && typeof result.content === 'string') {
                processJsonFileContent(result.content);
            }
        } else {
            importFileRef.current?.click();
        }
    };
    
    const processJsonFileContent = (content: string) => {
        try {
            const data = JSON.parse(content);
            if (data.users && data.companyData) { 
                setBackupDataToRestore(data);
                setIsRestoreModalOpen(true);
            } else {
                throw new Error("Invalid backup file format");
            }
        } catch (error) {
            console.error("Failed to parse backup file:", error);
            showNotification('error');
        }
    };


    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text === 'string') {
                processJsonFileContent(text);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const confirmRestore = () => {
        if (backupDataToRestore) {
            onRestore(backupDataToRestore);
        }
        cancelRestore();
    };

    const cancelRestore = () => {
        setIsRestoreModalOpen(false);
        setBackupDataToRestore(null);
    };

    const handleCreateDatabase = () => {
        if (!newDbName.trim()) return;
        const newDb: DatabaseProfile = {
            id: `db_${Date.now()}`,
            name: newDbName.trim(),
        };
        setDatabases(prev => [...prev, newDb]);
        setIsCreateDbModalOpen(false);
        setNewDbName('');
        showNotification('add');
    };
    
    const handleSwitchDatabase = (id: string) => {
        if(id === activeDatabaseId) return;
        try {
            window.localStorage.setItem('pos_active_database_id', JSON.stringify(id));
        } catch (e) {
            console.error("Failed to switch database", e);
        }
        window.location.reload();
    };

    const handleRenameDatabase = () => {
        if (!dbToRename || !newDbName.trim()) return;
        setDatabases(prev => prev.map(db => db.id === dbToRename.id ? { ...db, name: newDbName.trim() } : db));
        setIsRenameDbModalOpen(false);
        setNewDbName('');
        setDbToRename(null);
        showNotification('edit');
    };

    const handleDeleteDatabase = () => {
        if (!dbToDelete) return;
        allDataKeys.forEach(key => localStorage.removeItem(`${dbToDelete.id}_${key}`));
        localStorage.removeItem(`${dbToDelete.id}_firstLogin_1`);
        setDatabases(prev => prev.filter(db => db.id !== dbToDelete.id));
        setIsDeleteDbModalOpen(false);
        setDbToDelete(null);
        showNotification('delete');
    };

    const handleExportSQLite = async () => {
        const binary = await exportDB();
        if (!binary) return;
        const fileName = `pos_database_${new Date().toISOString().slice(0, 10)}.sqlite`;

        if (window.electronAPI) {
            const result = await window.electronAPI.saveFile(binary, {
                title: 'Export SQLite Database',
                defaultPath: fileName,
                filters: [{ name: 'SQLite Files', extensions: ['sqlite', 'db', 'sqlite3'] }]
            });
            if (result.success) showNotification('save');
        } else {
            const blob = new Blob([binary], { type: 'application/vnd.sqlite3' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('save');
        }
    };

    const handleImportSQLiteClick = async () => {
        if (window.electronAPI) {
            const result = await window.electronAPI.openFile({
                title: 'Import SQLite Database',
                filters: [{ name: 'SQLite Files', extensions: ['sqlite', 'db', 'sqlite3'] }],
                properties: ['openFile'],
                readAsBuffer: true
            });
            // FIX: Replaced Buffer with Uint8Array as Buffer is a Node.js type. This check is compatible with Electron's Buffer.
            if (result && result.content instanceof Uint8Array) {
                try {
                    // FIX: Pass the underlying ArrayBuffer of the Uint8Array to importDB.
                    await importDB(result.content.buffer);
                } catch (err) {
                    alert("فشل استيراد الملف. تأكد من أنه ملف SQLite صالح.");
                    console.error(err);
                }
            }
        } else {
            importSqliteRef.current?.click();
        }
    };


    const handleImportSQLiteFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (event.target?.result) {
                try {
                    await importDB(event.target.result as ArrayBuffer);
                } catch (err) {
                    alert("فشل استيراد الملف. تأكد من أنه ملف SQLite صالح.");
                    console.error(err);
                }
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = ''; // reset
    };
    
    const cardClass = "bg-white/30 backdrop-blur-lg rounded-xl shadow-md p-8 border border-white/40 dark:bg-gray-700/30 dark:border-white/20";
    const inputClass = "w-full px-4 py-3 bg-black/5 dark:bg-white/5 rounded-lg shadow-[inset_3px_3px_7px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition duration-300";


    return (
        <>
        {isRestoreModalOpen && (
            <ConfirmationModal
                title="تأكيد الاستعادة (JSON)"
                message={`هل أنت متأكد من استعادة هذه النسخة؟ سيتم حذف جميع بيانات قاعدة البيانات الحالية (${activeDatabaseName}) واستبدالها.`}
                onConfirm={confirmRestore}
                onCancel={cancelRestore}
                confirmText="استعادة"
                confirmColor="bg-orange-600"
            />
        )}
        {backupToRestore && (
             <ConfirmationModal
                title="تأكيد استعادة النسخة التلقائية"
                message={`هل أنت متأكد من استعادة بيانات يوم ${backupToRestore.date}؟ سيتم حذف جميع بيانات قاعدة البيانات الحالية (${activeDatabaseName}) واستبدالها.`}
                onConfirm={confirmRestoreInternal}
                onCancel={() => setBackupToRestore(null)}
                confirmText="نعم، استعادة"
                confirmColor="bg-orange-600"
            />
        )}
        {isDeleteDbModalOpen && dbToDelete && (
             <ConfirmationModal
                title="تأكيد الحذف النهائي"
                message={`هل أنت متأكد تماماً من حذف قاعدة البيانات "${dbToDelete.name}"؟`}
                onConfirm={handleDeleteDatabase}
                onCancel={() => setIsDeleteDbModalOpen(false)}
                confirmText="نعم، احذف نهائياً"
                confirmColor="bg-red-700"
            />
        )}
        <Modal title="إنشاء قاعدة بيانات جديدة" show={isCreateDbModalOpen} onClose={() => setIsCreateDbModalOpen(false)}>
            <input type="text" value={newDbName} onChange={e => setNewDbName(e.target.value)} placeholder="مثال: فرع الإسكندرية" className={inputClass}/>
            <div className="flex justify-end mt-4"><button onClick={handleCreateDatabase} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">إنشاء</button></div>
        </Modal>
        <Modal title="إعادة تسمية قاعدة البيانات" show={isRenameDbModalOpen} onClose={() => setIsRenameDbModalOpen(false)}>
            <input type="text" value={newDbName} onChange={e => setNewDbName(e.target.value)} className={inputClass}/>
            <div className="flex justify-end mt-4"><button onClick={handleRenameDatabase} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">حفظ</button></div>
        </Modal>
         <div className="space-y-8">
             <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">النسخ الاحتياطي والإعدادات</h1>

            <div className={cardClass}>
                <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">النسخ الاحتياطية التلقائية (آخر 7 أيام)</h2>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                    يقوم النظام بحفظ نسخة احتياطية داخلية تلقائياً مرة كل يوم. يمكنك استخدام هذه النسخ للرجوع إلى حالة سابقة في حال حدوث خطأ.
                    <br/>
                    <strong className="text-red-600 dark:text-red-400">ملاحظة:</strong> هذه النسخ لا تحمي من تلف الجهاز. يرجى استخدام "تصدير ملف SQLite" للحماية الكاملة.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {internalBackups.length > 0 ? (
                        internalBackups.map(backup => (
                            <div key={backup.key} className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                    نسخة يوم: <span className="font-mono text-blue-600 dark:text-blue-400">{backup.date}</span>
                                </span>
                                <button 
                                    onClick={() => handleRestoreInternal(backup)} 
                                    className="bg-orange-500 text-white text-sm font-bold py-2 px-4 rounded hover:bg-orange-600 transition-colors"
                                >
                                    استعادة هذه النسخة
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-4">لا توجد نسخ احتياطية تلقائية بعد.</p>
                    )}
                </div>
            </div>
            
            <div className={cardClass}>
                <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">إدارة قواعد البيانات (Profiles)</h2>
                <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg border border-blue-300 dark:border-blue-600 mb-4">
                    <p className="text-blue-800 dark:text-blue-200">
                        <span className="font-bold">الملف النشط حالياً:</span> {activeDatabaseName}
                    </p>
                </div>
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                    {databases.map(db => (
                        <div key={db.id} className="flex items-center justify-between p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{db.name}</span>
                            <div className="flex space-x-1 space-x-reverse">
                                <button onClick={() => handleSwitchDatabase(db.id)} disabled={db.id === activeDatabaseId} className="bg-green-500 text-white text-sm font-bold py-1 px-3 rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-600">تفعيل</button>
                                <button onClick={() => { setDbToRename(db); setNewDbName(db.name); setIsRenameDbModalOpen(true); }} disabled={db.id === 'default'} className="p-2 text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"><EditIcon /></button>
                                <button onClick={() => { setDbToDelete(db); setIsDeleteDbModalOpen(true); }} disabled={db.id === activeDatabaseId || db.id === 'default' || databases.length <= 1} className="p-2 text-red-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><DeleteIcon /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => setIsCreateDbModalOpen(true)} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-gray-700">
                    + إنشاء ملف جديد
                </button>
            </div>

            <div className={cardClass}>
                <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-4 border-b pb-2 border-indigo-200">قاعدة البيانات الحقيقية (SQLite)</h2>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                    يمكنك الآن التعامل مع ملف قاعدة بيانات SQLite حقيقي. يمكنك تصديره لفتحه في برامج أخرى أو الاحتفاظ به كنسخة احتياطية كاملة.
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <button onClick={handleExportSQLite} className="flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transform hover:-translate-y-1 transition-all duration-300">
                        <DownloadIcon />
                        <span>تصدير ملف قاعدة بيانات (SQLite)</span>
                    </button>
                    <button onClick={handleImportSQLiteClick} className="flex items-center justify-center bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 transform hover:-translate-y-1 transition-all duration-300">
                        <UploadIcon />
                        <span>استيراد ملف قاعدة بيانات (SQLite)</span>
                    </button>
                    <input type="file" ref={importSqliteRef} onChange={handleImportSQLiteFileSelected} accept=".sqlite,.db,.sqlite3" className="hidden" />
                </div>
            </div>

            <div className={cardClass}>
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-500 mb-2">النسخ الاحتياطي اليدوي (JSON)</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">هذه الطريقة مناسبة لنقل البيانات بين إصدارات مختلفة من البرنامج أو كطريقة احتياطية إضافية.</p>
                <div className="flex gap-4">
                     <button onClick={handleExport} className="flex items-center justify-center bg-gray-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-gray-600">
                        <DownloadIcon />
                        <span>تصدير JSON</span>
                    </button>
                     <button onClick={handleImportClick} className="flex items-center justify-center bg-gray-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-gray-700">
                        <UploadIcon />
                        <span>استيراد JSON</span>
                    </button>
                    <input type="file" ref={importFileRef} onChange={handleFileSelected} accept=".json" className="hidden" />
                </div>
            </div>
        </div>
        </>
    );
};

export default BackupSettings;