
const DB_NAME = 'pos_native_db';
const DB_VERSION = 12; // تم التحديث لإضافة metadata

const STORE_NAMES = [
    'users', 'companyData', 'warehouses', 'units', 'items', 'treasuries',
    'expenseCategories', 'expenses', 'customers', 'customerReceipts',
    'salesRepresentatives', 'suppliers', 'supplierPayments', 'salesInvoices',
    'heldInvoices', 'heldPurchaseInvoices', 'salesReturns', 'purchaseInvoices', 'purchaseReturns',
    'warehouseTransfers', 'treasuryTransfers', 'defaultValues',
    'activeDiscounts', 'selectedDiscountItems', 'systemSettings', 'databases', 'importCalculatorHistory',
    'employees', 'departments', 'chatMessages', 'attendanceRecords', 'salaryRecords', 'onlineSessions',
    'metadata'
];

let dbPromise: Promise<IDBDatabase> | null = null;

export const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    if (!window.indexedDB) {
        alert("متصفحك لا يدعم قواعد البيانات المحلية. يرجى استخدام متصفح حديث مثل Chrome أو Edge.");
        return Promise.reject("IndexedDB not supported");
    }

    dbPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject("Timeout: فشل الاتصال بقاعدة البيانات في الوقت المحدد.");
        }, 10000);

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                STORE_NAMES.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        if (['activeDiscounts', 'selectedDiscountItems'].includes(storeName)) {
                             db.createObjectStore(storeName, { keyPath: 'itemId' });
                        } else if (['systemSettings', 'metadata'].includes(storeName)) {
                             db.createObjectStore(storeName, { keyPath: 'key' });
                        } else if (['companyData', 'defaultValues'].includes(storeName)) {
                             db.createObjectStore(storeName);
                        } else {
                             db.createObjectStore(storeName, { keyPath: 'id' });
                        }
                    }
                });
            };

            request.onsuccess = (event) => {
                clearTimeout(timeout);
                const db = (event.target as IDBOpenDBRequest).result;
                
                // إضافة معالج لإغلاق الاتصال التلقائي عند حدوث خطأ فادح
                db.onversionchange = () => {
                    db.close();
                    window.location.reload();
                };
                
                resolve(db);
            };

            request.onerror = (event) => {
                clearTimeout(timeout);
                console.error("Database initialization error:", request.error);
                reject(request.error);
            };

            request.onblocked = () => {
                clearTimeout(timeout);
                alert("يرجى إغلاق جميع نوافذ البرنامج المفتوحة لتحديث قاعدة البيانات.");
                reject("Database blocked");
            };
        } catch (err) {
            clearTimeout(timeout);
            reject(err);
        }
    });

    return dbPromise;
};

const getStore = async (storeName: string, mode: IDBTransactionMode = 'readonly') => {
    const db = await initDB();
    if (!db.objectStoreNames.contains(storeName)) {
        throw new Error(`Store ${storeName} does not exist`);
    }
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return { tx, store };
};

export const getTableData = async (tableName: string): Promise<any> => {
    try {
        const { store } = await getStore(tableName);
        return new Promise<any>((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result;
                if (tableName === 'activeDiscounts') {
                    const record = results ? results.reduce((acc: any, row: any) => {
                        if (row.itemId != null) acc[row.itemId] = row.discountPrice;
                        return acc;
                    }, {}) : {};
                    resolve(record);
                } else if (['companyData', 'defaultValues'].includes(tableName)) {
                     resolve(results && results.length > 0 ? results[0] : null);
                } else {
                    resolve(results || []);
                }
            };
            request.onerror = () => resolve(tableName === 'activeDiscounts' ? {} : (['companyData', 'defaultValues'].includes(tableName) ? null : []));
        });
    } catch (e) {
        return tableName === 'activeDiscounts' ? {} : (['companyData', 'defaultValues'].includes(tableName) ? null : []);
    }
};

export const updateTableMetadata = async (tableName: string, timestamp: number): Promise<void> => {
    try {
        const { store } = await getStore('metadata', 'readwrite');
        store.put({ key: tableName, lastUpdated: timestamp });
    } catch (e) { console.error(e); }
};

export const getTableMetadata = async (tableName: string): Promise<number> => {
    try {
        const { store } = await getStore('metadata');
        return new Promise((resolve) => {
            const req = store.get(tableName);
            req.onsuccess = () => resolve(req.result ? req.result.lastUpdated : 0);
            req.onerror = () => resolve(0);
        });
    } catch (e) { return 0; }
};

export const saveTableData = async (tableName: string, data: any, updateTimestamp = true): Promise<void> => {
    try {
        const { store, tx } = await getStore(tableName, 'readwrite');
        let dataToSave = tableName === 'activeDiscounts' 
            ? Object.entries(data).map(([itemId, discountPrice]) => ({ itemId: Number(itemId), discountPrice }))
            : (Array.isArray(data) ? data : [data]);

        if (updateTimestamp) {
            await updateTableMetadata(tableName, Date.now());
        }

        return new Promise<void>((resolve, reject) => {
            const clearReq = store.clear();
            clearReq.onsuccess = () => {
                dataToSave.forEach((item: any) => {
                    if (item) store.put(item);
                });
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) { console.error(`Error saving ${tableName}:`, e); }
};

export const saveSingleRow = async (tableName: string, data: any, updateTimestamp = true): Promise<void> => {
    if (data == null) return;
    if (tableName === 'activeDiscounts') return saveTableData(tableName, data, updateTimestamp);
    try {
        const { store } = await getStore(tableName, 'readwrite');
        if (updateTimestamp) {
            await updateTableMetadata(tableName, Date.now());
        }
        return new Promise<void>((resolve, reject) => {
             const clearReq = store.clear();
             clearReq.onsuccess = () => {
                 const req = store.put(data, 1);
                 req.onsuccess = () => resolve();
                 req.onerror = (e) => reject(e);
             };
        });
    } catch (e) { console.error(`Error saving row in ${tableName}:`, e); }
};

export const resetDB = async (): Promise<void> => {
    const db = await initDB();
    db.close();
    return new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => { 
            // Clear localStorage settings
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('pos_') || key.startsWith('app_')) {
                    localStorage.removeItem(key);
                }
            });
            window.location.reload(); 
            resolve(); 
        };
        req.onerror = () => reject(req.error);
        req.onblocked = () => { alert("يرجى إغلاق جميع علامات التبويب الأخرى."); reject("blocked"); };
    });
};

export const getSystemSetting = async (key: string): Promise<string | null> => {
    try {
        const { store } = await getStore('systemSettings');
        return new Promise((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : null);
            req.onerror = () => resolve(null);
        });
    } catch (e) { return null; }
};

export const setSystemSetting = async (key: string, value: string): Promise<void> => {
    try {
        const { store } = await getStore('systemSettings', 'readwrite');
        store.put({ key, value });
    } catch (e) { console.error(e); }
};

export const exportDB = async (): Promise<any> => null;
export const importDB = async (buffer: any) => { throw new Error("Not supported in browser context"); };
export const getInternalBackups = async () => [];
export const restoreFromInternalBackup = async (key: string) => {};
