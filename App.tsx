
import React, { useState, useEffect, useRef, useMemo } from 'react';
import TopNav from './components/TopNav';
import Login from './components/Login';
import DashboardHome from './components/DashboardHome';
import About from './components/About'; 
import ActivationScreen from './components/ActivationScreen';
import AllCustomersStatement from './components/AllCustomersStatement';
import AllSalesRepsStatement from './components/AllSalesRepsStatement';
import AllSuppliersStatement from './components/AllSuppliersStatement';
import AnalysisReport from './components/AnalysisReport';
import BackupSettings from './components/BackupSettings';
import CloudSettings from './components/CloudSettings';
import CompanySettings from './components/CompanySettings';
import CustomerManagement from './components/CustomerManagement';
import CustomerReceiptManagement from './components/CustomerReceiptManagement';
import CustomerStatement from './components/CustomerStatement';
import CustomerMovementComparison from './components/CustomerMovementComparison';
import DailyLedger from './components/DailyLedger';
import DefaultValuesComponent from './components/DefaultValues';
import DiscountManagement from './components/DiscountManagement';
import ExpenseCategoryManagement from './components/ExpenseCategoryManagement';
import ExpenseManagement from './components/ExpenseManagement';
import ExpenseReport from './components/ExpenseReport';
import FactoryReset from './components/FactoryReset';
import IncomeStatement from './components/IncomeStatement';
import WeeklyReport from './components/WeeklyReport';
import ItemManagement from './components/ItemManagement';
import ItemMovement from './components/ItemMovement';
import ItemSearch from './components/ItemSearch';
import ItemsInWarehouses from './components/ItemsInWarehouses';
import PurchaseInvoiceManagement from './components/PurchaseInvoiceManagement';
import PurchaseReport from './components/PurchaseReport';
import PurchaseReturnManagement from './components/PurchaseReturnManagement';
import SalesInvoiceManagement from './components/SalesInvoiceManagement';
import SalesReport from './components/SalesReport';
import SalesRepresentativeManagement from './components/SalesRepresentativeManagement';
import SalesRepStatement from './components/SalesRepStatement';
import SalesReturnManagement from './components/SalesReturnManagement';
import SettingsActivation from './components/SettingsActivation';
import SupplierManagement from './components/SupplierManagement';
import SupplierPaymentManagement from './components/SupplierPaymentManagement';
import SupplierStatement from './components/SupplierStatement';
import TreasuryManagement from './components/TreasuryManagement';
import TreasuryTransferManagement from './components/TreasuryTransferManagement';
import UnitManagement from './components/UnitManagement';
import UpdateManagement from './components/UpdateManagement';
import UserManagement from './components/UserManagement';
import UserPermissions from './components/UserPermissions';
import WarehouseInventory from './components/WarehouseInventory';
import WarehouseManagement from './components/WarehouseManagement';
import WarehouseTransferManagement from './components/WarehouseTransferManagement';
import ImportCostCalculator from './components/ImportCostCalculator';
import InitialSetup from './components/InitialSetup';
import AppUnlock from './components/AppUnlock';
import Salaries from './components/Salaries';
import Attendance from './components/Attendance';
import EmployeeManagement from './components/EmployeeManagement';
import DepartmentManagement from './components/DepartmentManagement';
import Chat from './components/Chat';
import VoucherRegister from './components/VoucherRegister';
import CustomerReceiptRegister from './components/CustomerReceiptRegister';
import SupplierPaymentRegister from './components/SupplierPaymentRegister';
import ChequeCalendar from './components/ChequeCalendar';
import { menuItems, ALL_PERMISSIONS } from './components/navigation';
import { initFirebase, writeToDb, subscribeToDb } from './services/firebase';
import { initDB, getTableData, saveTableData, saveSingleRow, resetDB } from './services/db';
import { initLicense, LicenseStatus } from './services/license';
import { checkGitHubUpdate } from './services/githubUpdate';
import { APP_VERSION } from './constants/version';
import { DownloadIcon, Modal, ActionFeedback, CloudIcon, DatabaseIcon, WarningIcon } from './components/Shared';
import type { 
    MgmtUser, CompanyData, Warehouse, Unit, Item, Treasury, ExpenseCategory, Expense, Customer, CustomerReceipt,
    SalesRepresentative, Supplier, SupplierPayment, SalesInvoice, SalesReturn, 
    PurchaseInvoice, PurchaseReturn, WarehouseTransfer, TreasuryTransfer, AppBackupData, NotificationType, DefaultValues, FirebaseConfig, StorableDiscountItem, DatabaseProfile,
    DocToView, PreselectedSalesRep, SavedImport, Employee, Department, ChatMessage, AttendanceRecord, SalaryRecord, OnlineSession
} from './types';

const useGlobalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
          const parsed = JSON.parse(item);
          return (parsed !== null && parsed !== undefined) ? parsed : initialValue;
      }
      return initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
};

const App: React.FC = () => {
  const [firebaseConfig, setFirebaseConfig] = useGlobalStorage<FirebaseConfig | null>('pos_firebase_config', null);
  const [theme, setTheme] = useGlobalStorage<'light' | 'dark'>('pos_theme', 'light');
  const [activeDatabaseId, activeDatabaseIdSet] = useGlobalStorage<string>('pos_active_database_id', '');
  const [isSetupComplete, setIsSetupComplete] = useGlobalStorage<boolean>('pos_setup_complete', false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isDBReady, setIsDBReady] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [checkingLicense, setCheckingLicense] = useState(true);
  const [showManualActivation, setShowManualActivation] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  
  const useSyncedState = <T,>(tableName: string, initialValue: T, customDbId?: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const isRemoteUpdate = useRef(false);
    const hasSyncedWithCloud = useRef(false);
    const localValueRef = useRef(storedValue);
    const broadcastChannel = useRef<BroadcastChannel | null>(null);

    useEffect(() => { localValueRef.current = storedValue; }, [storedValue]);

    const effectiveDbId = customDbId !== undefined ? customDbId : activeDatabaseId;

    // Setup BroadcastChannel for cross-tab sync
    useEffect(() => {
        try {
            const channel = new BroadcastChannel(`pos_sync_${tableName}`);
            broadcastChannel.current = channel;
            
            channel.onmessage = (event) => {
                if (event.data && event.data.type === 'UPDATE') {
                    // Mark as remote update to prevent re-broadcasting or re-uploading to cloud immediately
                    isRemoteUpdate.current = true;
                    setStoredValue(event.data.payload);
                    
                    // Also update IndexedDB to keep it in sync
                    if (Array.isArray(event.data.payload)) saveTableData(tableName, event.data.payload);
                    else saveSingleRow(tableName, event.data.payload);

                    setTimeout(() => { isRemoteUpdate.current = false; }, 500);
                }
            };

            return () => {
                channel.close();
            };
        } catch (e) {
            console.error("BroadcastChannel error:", e);
        }
    }, [tableName]);

    useEffect(() => {
        if (!isDBReady) return;
        const load = async () => {
            try {
                const data = await getTableData(tableName);
                if (data !== null && data !== undefined) {
                    setStoredValue(data as T);
                }
            } catch (err) { console.error(`Failed to load ${tableName}`, err); }
        };
        load();
    }, [isDBReady, tableName]);

    useEffect(() => {
        hasSyncedWithCloud.current = false;
        if (!isCloudConnected || !isDBReady) return;
        const unsubscribe = subscribeToDb(effectiveDbId, tableName, (data) => {
            const isFirstSync = !hasSyncedWithCloud.current;
            hasSyncedWithCloud.current = true; 
            if (data !== null && data !== undefined) {
                isRemoteUpdate.current = true;
                setStoredValue(data);
                if (Array.isArray(data)) saveTableData(tableName, data);
                else saveSingleRow(tableName, data);
                setTimeout(() => { isRemoteUpdate.current = false; }, 500);
            } else if (isFirstSync) {
                 const localData = localValueRef.current;
                 const hasLocalData = Array.isArray(localData) ? localData.length > 0 : (localData && Object.keys(localData).length > 0 && JSON.stringify(localData) !== JSON.stringify(initialValue));
                if (hasLocalData) writeToDb(effectiveDbId, tableName, localData);
            }
        });
        return () => unsubscribe();
    }, [isCloudConnected, isDBReady, effectiveDbId, tableName]);

    useEffect(() => {
        if (!isDBReady) return;
        const isRemote = isRemoteUpdate.current;
        
        // Debounce saving to IndexedDB and Cloud to prevent lag during rapid updates
        const timeoutId = setTimeout(() => {
            let savePromise = Array.isArray(storedValue) ? saveTableData(tableName, storedValue) : saveSingleRow(tableName, storedValue);
            savePromise.then(() => {
                if (!isRemote) {
                    // Broadcast local changes to other tabs
                    broadcastChannel.current?.postMessage({ type: 'UPDATE', payload: storedValue });
                }
                if (isCloudConnected && !isRemote && hasSyncedWithCloud.current) {
                    writeToDb(effectiveDbId, tableName, storedValue);
                }
            });
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [storedValue, tableName, isDBReady, isCloudConnected, effectiveDbId]);

    return [storedValue, setStoredValue];
  };

  const defaultCompanyData: CompanyData = { name: 'اسم الشركة', cr: '', tr: '', phone1: '', phone2: '', address: '' };
  const defaultDefaultValues: DefaultValues = { 
    defaultWarehouseId: 1, 
    defaultUnitId: 1, 
    defaultSalesRepId: 0, 
    defaultTreasuryId: 1, 
    defaultPaymentMethodInvoices: 'credit', 
    defaultPaymentMethodReceipts: 'cash', 
    invoiceFooter: '', 
    whatsappFooter: '', 
    enableBackupAlert: true, 
    backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop', 
    backgroundOpacity: 0.6,
    githubRepo: 'MuhamadGimini/ETQAN'
  };

  const [databases, setDatabases] = useSyncedState<DatabaseProfile[]>('databases', [{ id: '', name: 'البيانات الرئيسية (السحابة)' }], 'SYSTEM_METADATA');
  const [users, setUsers] = useSyncedState<MgmtUser[]>('users', []);
  const [companyData, setCompanyData] = useSyncedState<CompanyData>('companyData', defaultCompanyData);
  const [warehouses, setWarehouses] = useSyncedState<Warehouse[]>('warehouses', [{ id: 1, code: '1', name: 'الفرع الرئيسي', keeper: '', phone: '', address: '', notes: '' }]);
  const [units, setUnits] = useSyncedState<Unit[]>('units', [{ id: 1, name: 'عدد', description: '' }]);
  const [items, setItems] = useSyncedState<Item[]>('items', []);
  const [treasuries, setTreasuries] = useSyncedState<Treasury[]>('treasuries', [{ id: 1, name: 'الخزينة الرئيسية', keeper: '', openingBalance: 0 }]);
  const [expenseCategories, setExpenseCategories] = useSyncedState<ExpenseCategory[]>('expenseCategories', []);
  const [expenses, setExpenses] = useSyncedState<Expense[]>('expenses', []);
  const [customers, setCustomers] = useSyncedState<Customer[]>('customers', [{ id: 3, name: 'العميل النقدي', phone: '', address: '', openingBalance: 0 }]);
  const [customerReceipts, setCustomerReceipts] = useSyncedState<CustomerReceipt[]>('customerReceipts', []);
  const [salesRepresentatives, setSalesRepresentatives] = useSyncedState<SalesRepresentative[]>('salesRepresentatives', []);
  const [suppliers, setSuppliers] = useSyncedState<Supplier[]>('suppliers', []);
  const [supplierPayments, setSupplierPayments] = useSyncedState<SupplierPayment[]>('supplierPayments', []);
  const [salesInvoices, setSalesInvoices] = useSyncedState<SalesInvoice[]>('salesInvoices', []);
  const [heldInvoices, setHeldInvoices] = useSyncedState<SalesInvoice[]>('heldInvoices', []); 
  const [heldPurchaseInvoices, setHeldPurchaseInvoices] = useSyncedState<PurchaseInvoice[]>('heldPurchaseInvoices', []); 
  const [salesReturns, setSalesReturns] = useSyncedState<SalesReturn[]>('salesReturns', []);
  const [purchaseInvoices, setPurchaseInvoices] = useSyncedState<PurchaseInvoice[]>('purchaseInvoices', []);
  const [purchaseReturns, setPurchaseReturns] = useSyncedState<PurchaseReturn[]>('purchaseReturns', []);
  const [warehouseTransfers, setWarehouseTransfers] = useSyncedState<WarehouseTransfer[]>('warehouseTransfers', []);
  const [treasuryTransfers, setTreasuryTransfers] = useSyncedState<TreasuryTransfer[]>('treasuryTransfers', []);
  const [defaultValues, setDefaultValues] = useSyncedState<DefaultValues>('defaultValues', defaultDefaultValues);

  useEffect(() => {
    if (!defaultValues.backgroundImage) {
        setDefaultValues(prev => ({ ...prev, backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop' }));
    }
  }, [defaultValues.backgroundImage]);
  const [activeDiscounts, setActiveDiscounts] = useSyncedState<Record<number, number>>('activeDiscounts', {});
  const [selectedDiscountItems, setSelectedDiscountItems] = useSyncedState<StorableDiscountItem[]>('selectedDiscountItems', []);
  const [importCalculatorHistory, setImportCalculatorHistory] = useSyncedState<SavedImport[]>('importCalculatorHistory', []);
  const [employees, setEmployees] = useSyncedState<Employee[]>('employees', []);
  const [departments, setDepartments] = useSyncedState<Department[]>('departments', []);
  const [attendanceRecords, setAttendanceRecords] = useSyncedState<AttendanceRecord[]>('attendanceRecords', []);
  const [salaryRecords, setSalaryRecords] = useSyncedState<SalaryRecord[]>('salaryRecords', []);
  const [chatMessages, setChatMessages] = useSyncedState<ChatMessage[]>('chatMessages', []);
  const [onlineSessions, setOnlineSessions] = useSyncedState<OnlineSession[]>('onlineSessions', []);

  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLoggedIn) return;

      // Shortcuts
      const shortcuts: Record<string, string> = {
        'F2': 'salesInvoice',
        'F3': 'purchaseInvoice',
        'F4': 'salesReturn',
        'F5': 'purchaseReturn',
        'F6': 'customerReceipt',
        'F7': 'supplierPayment',
        'F8': 'expenseManagement',
        'F9': 'itemSearch',
        'F10': 'dashboard',
      };

      if (shortcuts[e.key]) {
        e.preventDefault();
        setCurrentView(shortcuts[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoggedIn]);
  const [currentUser, setCurrentUser] = useState<MgmtUser | null>(null);
  const [docToView, setDocToView] = useState<DocToView>(null);
  const [preselectedCustomer, setPreselectedCustomer] = useState<number | null>(null);
  const [preselectedSupplier, setPreselectedSupplier] = useState<number | null>(null);
  const [preselectedSalesRep, setPreselectedSalesRep] = useState<PreselectedSalesRep>(null);

  const [salesInvoiceDraft, setSalesInvoiceDraft] = useState<SalesInvoice | null>(null);
  const [salesInvoiceIsEditing, setSalesInvoiceIsEditing] = useState(false);
  const [purchaseInvoiceDraft, setPurchaseInvoiceDraft] = useState<PurchaseInvoice | null>(null);
  const [purchaseInvoiceIsEditing, setPurchaseInvoiceIsEditing] = useState(false);
  const [salesReturnDraft, setSalesReturnDraft] = useState<SalesReturn | null>(null);
  const [salesReturnIsEditing, setSalesReturnIsEditing] = useState(false);
  const [purchaseReturnDraft, setPurchaseReturnDraft] = useState<PurchaseReturn | null>(null);
  const [purchaseReturnIsEditing, setPurchaseReturnIsEditing] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<any>(null);
  const [expenseIsEditing, setExpenseIsEditing] = useState(false);
  const [customerReceiptDraft, setCustomerReceiptDraft] = useState<any>(null);
  const [customerReceiptIsEditing, setCustomerReceiptIsEditing] = useState(false);
  const [supplierPaymentDraft, setSupplierPaymentDraft] = useState<any>(null);
  const [supplierPaymentIsEditing, setSupplierPaymentIsEditing] = useState(false);
  const [warehouseTransferDraft, setWarehouseTransferDraft] = useState<any>(null);
  const [warehouseTransferIsEditing, setWarehouseTransferIsEditing] = useState(false);
  const [treasuryTransferDraft, setTreasuryTransferDraft] = useState<any>(null);
  const [treasuryTransferIsEditing, setTreasuryTransferIsEditing] = useState(false);

  useEffect(() => {
    if (defaultValues.githubRepo) {
      checkGitHubUpdate(defaultValues.githubRepo, APP_VERSION).then(info => {
        setLatestVersion(info.latestVersion);
        setDownloadUrl(info.downloadUrl);
        setReleaseNotes(info.releaseNotes);
        if (info.hasUpdate) {
          setUpdateAvailable(true);
        } else {
          setUpdateAvailable(false);
        }
      });
    }
  }, [defaultValues.githubRepo]);

  // Heartbeat for online presence
  useEffect(() => {
    if (!currentUser) return;

    const updatePresence = () => {
        setOnlineSessions(prev => {
            const now = Date.now();
            // Remove sessions older than 2 minutes and update current user
            const activeSessions = prev.filter(s => now - s.lastActive < 120000 && s.userId !== currentUser.id);
            return [...activeSessions, { id: currentUser.id, userId: currentUser.id, userName: currentUser.fullName, lastActive: now }];
        });
    };

    // Initial update
    updatePresence();

    // Update every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    // Cleanup on unmount
    return () => {
        clearInterval(interval);
        setOnlineSessions(prev => prev.filter(s => s.userId !== currentUser.id));
    };
  }, [currentUser, setOnlineSessions]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
      let isCancelled = false;
      const setup = async () => {
          try {
              const db = await initDB();
              if (isCancelled) return;
              setIsDBReady(true);
              const status = await initLicense();
              if (isCancelled) return;
              setLicenseStatus(status);
          } catch (e) {
              console.error("Initialization failed:", e);
              if (!isCancelled) setIsDBReady(true); 
          } finally {
              if (!isCancelled) setCheckingLicense(false);
          }
      };
      setup();
      return () => { isCancelled = true; };
  }, []);
    
  useEffect(() => {
    if (firebaseConfig) {
        initFirebase(firebaseConfig, (isConnected) => { setIsCloudConnected(isConnected); });
    } else { setIsCloudConnected(false); }
  }, [firebaseConfig]);

  useEffect(() => {
    const handleLogTransaction = (e: CustomEvent) => {
      const messageText = e.detail;
      if (!currentUser) return;
      const message: ChatMessage = {
          id: Date.now().toString(),
          channelId: 'transactions',
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          text: messageText,
          timestamp: Date.now(),
      };
      setChatMessages(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return [...safePrev, message];
      });
    };
    window.addEventListener('logTransaction', handleLogTransaction as EventListener);
    return () => window.removeEventListener('logTransaction', handleLogTransaction as EventListener);
  }, [currentUser, setChatMessages]);

  const showNotification = (type: NotificationType) => {
    setNotification(type);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = (user: MgmtUser) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    
    // Log login event
    const loginMessage: ChatMessage = {
        id: Date.now().toString(),
        channelId: 'transactions',
        senderId: user.id,
        senderName: user.fullName,
        text: `تسجيل دخول المستخدم: ${user.fullName}`,
        timestamp: Date.now(),
    };
    setChatMessages(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return [...safePrev, loginMessage];
    });

    if (!isSetupComplete) {
      setCurrentView('initialSetup');
    } else {
      setCurrentView('dashboard');
    }
  };
  
  const handleInitialSetupChoice = (choice: 'cloud' | 'local' | 'restore') => {
    setIsSetupComplete(true);
    if (choice === 'cloud') setCurrentView('cloudSettings');
    else if (choice === 'restore') setCurrentView('backupSettings');
    else setCurrentView('dashboard');
  };

  const performLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
    setIsLogoutModalOpen(false);
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleRestoreAppData = async (data: AppBackupData) => {
    try {
        console.log("Starting restore with keys:", Object.keys(data));
        const keys = Object.keys(data);
        for (const key of keys) {
            const value = (data as any)[key];
            if (value !== undefined && value !== null) {
                console.log(`Restoring ${key}...`);
                if (Array.isArray(value)) {
                    await saveTableData(key, value);
                } else {
                    await saveSingleRow(key, value);
                }
            }
        }

        // Check for HR data specifically to debug user issue
        if (!data.employees) console.warn("Backup does not contain 'employees' key");
        if (!data.departments) console.warn("Backup does not contain 'departments' key");
        if (!data.attendanceRecords) console.warn("Backup does not contain 'attendanceRecords' key");
        if (!data.salaryRecords) console.warn("Backup does not contain 'salaryRecords' key");

        showNotification('save');
        localStorage.setItem('pos_setup_complete', JSON.stringify(true));
        alert("تمت استعادة البيانات بنجاح. سيتم إعادة تشغيل البرنامج لتطبيق التغييرات.");
        window.location.reload();
    } catch (error) {
        console.error("Restore failed:", error);
        alert("فشل عملية استعادة البيانات.");
    }
  };

  const renderedView = useMemo(() => {
    switch (currentView) {
      case 'initialSetup': return <InitialSetup onChoice={handleInitialSetupChoice} />;
      case 'dashboard': return <DashboardHome setCurrentView={setCurrentView} salesInvoices={salesInvoices} salesReturns={salesReturns} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} customers={customers} customerReceipts={customerReceipts} items={items} expenses={expenses} expenseCategories={expenseCategories} suppliers={suppliers} supplierPayments={supplierPayments} treasuries={treasuries} treasuryTransfers={treasuryTransfers} warehouses={warehouses} defaultValues={defaultValues} />;
      case 'userManagement': return <UserManagement users={users} setUsers={setUsers} showNotification={showNotification} currentUser={currentUser!} employees={employees} />;
      case 'userPermissions': return <UserPermissions users={users} setUsers={setUsers} showNotification={showNotification} />;
      case 'companySettings': return <CompanySettings companyData={companyData} setCompanyData={setCompanyData} showNotification={showNotification} />;
      case 'departmentManagement': return <DepartmentManagement departments={departments} setDepartments={setDepartments} currentUser={currentUser} />;
      case 'cloudSettings': return <CloudSettings firebaseConfig={firebaseConfig} setFirebaseConfig={setFirebaseConfig} showNotification={showNotification} />;
      case 'defaultValues': return <DefaultValuesComponent defaultValues={defaultValues} setDefaultValues={setDefaultValues} warehouses={warehouses} units={units} salesRepresentatives={salesRepresentatives} treasuries={treasuries} showNotification={showNotification} />;
      case 'backupSettings': return <BackupSettings appData={{users, companyData, warehouses, units, items, treasuries, expenseCategories, expenses, customers, customerReceipts, salesRepresentatives, suppliers, supplierPayments, salesInvoices, salesReturns, purchaseInvoices, purchaseReturns, warehouseTransfers, treasuryTransfers, defaultValues, activeDiscounts, selectedDiscountItems, importCalculatorHistory, employees, departments, attendanceRecords, salaryRecords}} onRestore={handleRestoreAppData} showNotification={showNotification} databases={databases} setDatabases={setDatabases} activeDatabaseId={activeDatabaseId} setActiveDatabaseId={activeDatabaseIdSet} allDataKeys={[]} />;
      case 'factoryReset': return <FactoryReset onConfirmReset={() => resetDB()} />;
      case 'settingsActivation': return <SettingsActivation licenseStatus={licenseStatus} />;
      case 'updateManagement': return <UpdateManagement licenseStatus={licenseStatus} latestVersion={latestVersion} downloadUrl={downloadUrl} releaseNotes={releaseNotes} onNavigate={setCurrentView} />;
      case 'warehouseManagement': return <WarehouseManagement warehouses={warehouses} setWarehouses={setWarehouses} items={items} setItems={setItems} showNotification={showNotification} currentUser={currentUser!} employees={employees} />;
      case 'unitManagement': return <UnitManagement units={units} setUnits={setUnits} items={items} setItems={setItems} showNotification={showNotification} currentUser={currentUser!} />;
      case 'itemManagement': return <ItemManagement items={items} setItems={setItems} units={units} warehouses={warehouses} showNotification={showNotification} currentUser={currentUser!} defaultValues={defaultValues} salesInvoices={salesInvoices} salesReturns={salesReturns} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} warehouseTransfers={warehouseTransfers} companyData={companyData} />;
      case 'treasuryManagement': return <TreasuryManagement treasuries={treasuries} setTreasuries={setTreasuries} showNotification={showNotification} salesInvoices={salesInvoices} purchaseInvoices={purchaseInvoices} salesReturns={salesReturns} purchaseReturns={purchaseReturns} customerReceipts={customerReceipts} supplierPayments={supplierPayments} expenses={expenses} treasuryTransfers={treasuryTransfers} currentUser={currentUser!} defaultValues={defaultValues} employees={employees} />;
      case 'expenseCategoryManagement': return <ExpenseCategoryManagement expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories} showNotification={showNotification} currentUser={currentUser!} />;
      case 'expenseManagement': return <ExpenseManagement expenses={expenses} setExpenses={setExpenses} expenseCategories={expenseCategories} treasuries={treasuries} showNotification={showNotification} currentUser={currentUser!} defaultValues={defaultValues} customerReceipts={customerReceipts} supplierPayments={supplierPayments} treasuryTransfers={treasuryTransfers} salesInvoices={salesInvoices} purchaseInvoices={purchaseInvoices} salesReturns={salesReturns} purchaseReturns={purchaseReturns} draft={expenseDraft} setDraft={setExpenseDraft} isEditing={expenseIsEditing} setIsEditing={setExpenseIsEditing} />;
      case 'customerManagement': return <CustomerManagement customers={customers} setCustomers={setCustomers} showNotification={showNotification} currentUser={currentUser!} salesInvoices={salesInvoices} salesReturns={salesReturns} customerReceipts={customerReceipts} />;
      case 'customerReceipt': return <CustomerReceiptManagement customerReceipts={customerReceipts} setCustomerReceipts={setCustomerReceipts} customers={customers} treasuries={treasuries} showNotification={showNotification} docToView={docToView} onClearDocToView={() => setDocToView(null)} currentUser={currentUser!} salesInvoices={salesInvoices} salesReturns={salesReturns} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} defaultValues={defaultValues} companyData={companyData} supplierPayments={supplierPayments} expenses={expenses} treasuryTransfers={treasuryTransfers} draft={customerReceiptDraft} setDraft={setCustomerReceiptDraft} isEditing={customerReceiptIsEditing} setIsEditing={setCustomerReceiptIsEditing} />;
      case 'salesRepresentativeManagement': return <SalesRepresentativeManagement salesRepresentatives={salesRepresentatives} setSalesRepresentatives={setSalesRepresentatives} showNotification={showNotification} currentUser={currentUser!} salesInvoices={salesInvoices} salesReturns={salesReturns} employees={employees} />;
      case 'supplierManagement': return <SupplierManagement suppliers={suppliers} setSuppliers={setSuppliers} showNotification={showNotification} currentUser={currentUser!} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} supplierPayments={supplierPayments} />;
      case 'supplierPayment': return <SupplierPaymentManagement supplierPayments={supplierPayments} setSupplierPayments={setSupplierPayments} suppliers={suppliers} treasuries={treasuries} showNotification={showNotification} docToView={docToView} onClearDocToView={() => setDocToView(null)} currentUser={currentUser!} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} salesInvoices={salesInvoices} salesReturns={salesReturns} defaultValues={defaultValues} companyData={companyData} customerReceipts={customerReceipts} expenses={expenses} treasuryTransfers={treasuryTransfers} draft={supplierPaymentDraft} setDraft={setSupplierPaymentDraft} isEditing={supplierPaymentIsEditing} setIsEditing={setSupplierPaymentIsEditing} />;
      case 'salesInvoice': return <SalesInvoiceManagement salesInvoices={salesInvoices} setSalesInvoices={setSalesInvoices} heldInvoices={heldInvoices} setHeldInvoices={setHeldInvoices} salesReturns={salesReturns} customerReceipts={customerReceipts} setCustomerReceipts={setCustomerReceipts} items={items} setItems={setItems} customers={customers} setCustomers={setCustomers} salesRepresentatives={salesRepresentatives} warehouses={warehouses} units={units} companyData={companyData} showNotification={showNotification} docToView={docToView} onClearDocToView={() => setDocToView(null)} currentUser={currentUser!} defaultValues={defaultValues} activeDiscounts={activeDiscounts} draft={salesInvoiceDraft} setDraft={setSalesInvoiceDraft} isEditing={salesInvoiceIsEditing} setIsEditing={setSalesInvoiceIsEditing} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} />;
      case 'salesReturn': return <SalesReturnManagement salesReturns={salesReturns} setSalesReturns={setSalesReturns} salesInvoices={salesInvoices} customerReceipts={customerReceipts} items={items} setItems={setItems} customers={customers} salesRepresentatives={salesRepresentatives} warehouses={warehouses} units={units} companyData={companyData} showNotification={showNotification} docToView={docToView} onClearDocToView={() => setDocToView(null)} currentUser={currentUser!} defaultValues={defaultValues} draft={salesReturnDraft} setDraft={setSalesReturnDraft} isEditing={salesReturnIsEditing} setIsEditing={setSalesReturnIsEditing} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} expenses={expenses} treasuryTransfers={treasuryTransfers} treasuries={treasuries} supplierPayments={supplierPayments} setSupplierPayments={setSupplierPayments} />;
      case 'purchaseInvoice': return <PurchaseInvoiceManagement purchaseInvoices={purchaseInvoices} setPurchaseInvoices={setPurchaseInvoices} heldPurchaseInvoices={heldPurchaseInvoices} setHeldPurchaseInvoices={setHeldPurchaseInvoices} purchaseReturns={purchaseReturns} supplierPayments={supplierPayments} setSupplierPayments={setSupplierPayments} items={items} setItems={setItems} suppliers={suppliers} setSuppliers={setSuppliers} warehouses={warehouses} units={units} companyData={companyData} showNotification={showNotification} docToView={docToView} onClearDocToView={() => setDocToView(null)} currentUser={currentUser!} defaultValues={defaultValues} draft={purchaseInvoiceDraft} setDraft={setPurchaseInvoiceDraft} isEditing={purchaseInvoiceIsEditing} setIsEditing={setPurchaseInvoiceIsEditing} salesInvoices={salesInvoices} salesReturns={salesReturns} expenses={expenses} customerReceipts={customerReceipts} treasuryTransfers={treasuryTransfers} treasuries={treasuries} />;
      case 'purchaseReturn': return <PurchaseReturnManagement purchaseReturns={purchaseReturns} setPurchaseReturns={setPurchaseReturns} purchaseInvoices={purchaseInvoices} supplierPayments={supplierPayments} items={items} setItems={setItems} suppliers={suppliers} warehouses={warehouses} units={units} companyData={companyData} showNotification={showNotification} docToView={docToView} onClearDocToView={() => setDocToView(null)} currentUser={currentUser!} defaultValues={defaultValues} draft={purchaseReturnDraft} setDraft={setPurchaseReturnDraft} isEditing={purchaseReturnIsEditing} setIsEditing={setPurchaseReturnIsEditing} salesInvoices={salesInvoices} salesReturns={salesReturns} customerReceipts={customerReceipts} setCustomerReceipts={setCustomerReceipts} expenses={expenses} treasuryTransfers={treasuryTransfers} treasuries={treasuries} />;
      case 'warehouseTransfer': return <WarehouseTransferManagement warehouseTransfers={warehouseTransfers} setWarehouseTransfers={setWarehouseTransfers} items={items} setItems={setItems} warehouses={warehouses} units={units} showNotification={showNotification} currentUser={currentUser!} draft={warehouseTransferDraft} setDraft={setWarehouseTransferDraft} isEditing={warehouseTransferIsEditing} setIsEditing={setWarehouseTransferIsEditing} salesInvoices={salesInvoices} salesReturns={salesReturns} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} defaultValues={defaultValues} />;
      case 'treasuryTransfer': return <TreasuryTransferManagement treasuryTransfers={treasuryTransfers} setTreasuryTransfers={setTreasuryTransfers} treasuries={treasuries} showNotification={showNotification} currentUser={currentUser!} customerReceipts={customerReceipts} supplierPayments={supplierPayments} expenses={expenses} salesInvoices={salesInvoices} purchaseInvoices={purchaseInvoices} salesReturns={salesReturns} purchaseReturns={purchaseReturns} defaultValues={defaultValues} draft={treasuryTransferDraft} setDraft={setTreasuryTransferDraft} isEditing={treasuryTransferIsEditing} setIsEditing={setTreasuryTransferIsEditing} />;
      case 'chequeCalendar': return <ChequeCalendar customerReceipts={customerReceipts} supplierPayments={supplierPayments} customers={customers} suppliers={suppliers} />;
      case 'importCostCalculator': return <ImportCostCalculator companyData={companyData} items={items} setItems={setItems} units={units} warehouses={warehouses} defaultValues={defaultValues} showNotification={showNotification} purchaseInvoices={purchaseInvoices} setPurchaseInvoices={setPurchaseInvoices} suppliers={suppliers} setSuppliers={setSuppliers} currentUser={currentUser!} savedMessages={importCalculatorHistory} setSavedMessages={setImportCalculatorHistory} salesInvoices={salesInvoices} salesReturns={salesReturns} purchaseReturns={purchaseReturns} />;
      case 'warehouseInventory': return <WarehouseInventory items={items} setItems={setItems} warehouses={warehouses} companyData={companyData} users={users} showNotification={showNotification} salesInvoices={salesInvoices} salesReturns={salesReturns} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} />;
      case 'itemsInWarehouses': return <ItemsInWarehouses items={items} warehouses={warehouses} companyData={companyData} salesInvoices={salesInvoices} salesReturns={salesReturns} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} />;
      case 'salesReport': return <SalesReport salesInvoices={salesInvoices} salesReturns={salesReturns} items={items} customers={customers} salesRepresentatives={salesRepresentatives} warehouses={warehouses} companyData={companyData} onViewDoc={(view, id) => { setDocToView({ view, docId: id }); setCurrentView(view); }} />;
      case 'purchaseReport': return <PurchaseReport purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} items={items} suppliers={suppliers} warehouses={warehouses} companyData={companyData} onViewDoc={(view, id) => { setDocToView({ view, docId: id }); setCurrentView(view); }} />;
      case 'analysisReport': return <AnalysisReport salesInvoices={salesInvoices} salesReturns={salesReturns} items={items} customers={customers} companyData={companyData} />;
      case 'customerStatement': return <CustomerStatement customers={customers} salesInvoices={salesInvoices} salesReturns={salesReturns} customerReceipts={customerReceipts} items={items} onViewDoc={(view, id) => { setDocToView({ view, docId: id }); setCurrentView(view); }} companyData={companyData} preselectedCustomer={preselectedCustomer} onClearPreselectedCustomer={() => setPreselectedCustomer(null)} defaultValues={defaultValues} />;
      case 'allCustomersStatement': return <AllCustomersStatement customers={customers} salesInvoices={salesInvoices} salesReturns={salesReturns} customerReceipts={customerReceipts} companyData={companyData} onViewCustomerStatement={(id) => { setPreselectedCustomer(id); setCurrentView('customerStatement'); }} defaultValues={defaultValues} />;
      case 'customerMovementComparison': return <CustomerMovementComparison customers={customers} salesInvoices={salesInvoices} salesReturns={salesReturns} customerReceipts={customerReceipts} companyData={companyData} defaultValues={defaultValues} />;
      case 'supplierStatement': return <SupplierStatement suppliers={suppliers} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} supplierPayments={supplierPayments} items={items} onViewDoc={(view, id) => { setDocToView({ view, docId: id }); setCurrentView(view); }} companyData={companyData} preselectedSupplier={preselectedSupplier} onClearPreselectedSupplier={() => setPreselectedSupplier(null)} defaultValues={defaultValues} />;
      case 'allSuppliersStatement': return <AllSuppliersStatement suppliers={suppliers} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} supplierPayments={supplierPayments} companyData={companyData} onViewSupplierStatement={(id) => { setPreselectedSupplier(id); setCurrentView('supplierStatement'); }} defaultValues={defaultValues} />;
      case 'salesRepStatement': return <SalesRepStatement salesRepresentatives={salesRepresentatives} salesInvoices={salesInvoices} salesReturns={salesReturns} customers={customers} companyData={companyData} onViewDoc={(view, id) => { setDocToView({ view, docId: id }); setCurrentView(view); }} preselectedSalesRep={preselectedSalesRep} onClearPreselectedSalesRep={() => setPreselectedSalesRep(null)} defaultValues={defaultValues} />;
      case 'allSalesRepsStatement': return <AllSalesRepsStatement salesRepresentatives={salesRepresentatives} salesInvoices={salesInvoices} salesReturns={salesReturns} onViewSalesRepStatement={(repId, startDate, endDate) => { setPreselectedSalesRep({ repId, startDate, endDate }); setCurrentView('salesRepStatement'); }} companyData={companyData} />;
      case 'itemMovement': return <ItemMovement items={items} warehouses={warehouses} salesInvoices={salesInvoices} salesReturns={salesReturns} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} warehouseTransfers={warehouseTransfers} companyData={companyData} onViewDoc={(view, id) => { setDocToView({ view, docId: id }); setCurrentView(view); }} defaultValues={defaultValues} customers={customers} suppliers={suppliers} />;
      case 'dailyLedger': return <DailyLedger salesInvoices={salesInvoices} salesReturns={salesReturns} expenses={expenses} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} customerReceipts={customerReceipts} supplierPayments={supplierPayments} treasuryTransfers={treasuryTransfers} expenseCategories={expenseCategories} treasuries={treasuries} defaultValues={defaultValues} companyData={companyData} />;
      case 'voucherRegister': return <VoucherRegister customerReceipts={customerReceipts} supplierPayments={supplierPayments} expenses={expenses} treasuryTransfers={treasuryTransfers} customers={customers} suppliers={suppliers} expenseCategories={expenseCategories} treasuries={treasuries} />;
      case 'customerReceiptRegister': return <CustomerReceiptRegister customerReceipts={customerReceipts} customers={customers} treasuries={treasuries} companyData={companyData} />;
      case 'supplierPaymentRegister': return <SupplierPaymentRegister supplierPayments={supplierPayments} suppliers={suppliers} treasuries={treasuries} companyData={companyData} />;
      case 'expenseReport': return <ExpenseReport expenses={expenses} expenseCategories={expenseCategories} treasuries={treasuries} companyData={companyData} defaultValues={defaultValues} />;
      case 'incomeStatement': return <IncomeStatement salesInvoices={salesInvoices} salesReturns={salesReturns} expenses={expenses} items={items} companyData={companyData} defaultValues={defaultValues} expenseCategories={expenseCategories} />;
      case 'weeklyReport': return <WeeklyReport salesInvoices={salesInvoices} salesReturns={salesReturns} purchaseInvoices={purchaseInvoices} purchaseReturns={purchaseReturns} customerReceipts={customerReceipts} items={items} companyData={companyData} defaultValues={defaultValues} />;
      case 'itemSearch': return <ItemSearch items={items} warehouses={warehouses} />;
      case 'discountManagement': return <DiscountManagement items={items} companyData={companyData} activeDiscounts={activeDiscounts} setActiveDiscounts={setActiveDiscounts} showNotification={showNotification} selectedDiscountItems={selectedDiscountItems} setSelectedDiscountItems={setSelectedDiscountItems} />;
      case 'salaries': return <Salaries employees={employees} attendanceRecords={attendanceRecords} salaryRecords={salaryRecords} setSalaryRecords={setSalaryRecords} currentUser={currentUser!} salesInvoices={salesInvoices} salesReturns={salesReturns} salesRepresentatives={salesRepresentatives} departments={departments} expenses={expenses} expenseCategories={expenseCategories} />;
      case 'attendance': return <Attendance employees={employees} attendanceRecords={attendanceRecords} setAttendanceRecords={setAttendanceRecords} currentUser={currentUser!} departments={departments} />;
      case 'employeeManagement': return <EmployeeManagement employees={employees} setEmployees={setEmployees} currentUser={currentUser!} departments={departments} />;
      case 'appUnlock': return <AppUnlock users={users} setUsers={setUsers} showNotification={showNotification} />;
      case 'about': return <About updateAvailable={updateAvailable} onNavigate={setCurrentView} activeDatabaseName={databases?.find(d => d.id === activeDatabaseId)?.name || 'البيانات الرئيسية (السحابة)'} isDBReady={isDBReady} isCloudConnected={isCloudConnected} />;
      
      default: return <div>View not found</div>;
    }
  }, [
    currentView, salesInvoices, salesReturns, purchaseInvoices, purchaseReturns, expenses, customers, suppliers, items,
    users, currentUser, employees, departments, companyData, firebaseConfig, defaultValues, warehouses, units, salesRepresentatives, treasuries,
    databases, activeDatabaseId, latestVersion, downloadUrl, releaseNotes, expenseCategories, customerReceipts, supplierPayments,
    warehouseTransfers, treasuryTransfers, activeDiscounts, selectedDiscountItems, importCalculatorHistory, attendanceRecords, salaryRecords,
    docToView, preselectedCustomer, preselectedSupplier, preselectedSalesRep, salesInvoiceDraft, salesInvoiceIsEditing,
    salesReturnDraft, salesReturnIsEditing, purchaseInvoiceDraft, purchaseInvoiceIsEditing, purchaseReturnDraft, purchaseReturnIsEditing,
    expenseDraft, expenseIsEditing, customerReceiptDraft, customerReceiptIsEditing, supplierPaymentDraft, supplierPaymentIsEditing,
    warehouseTransferDraft, warehouseTransferIsEditing, treasuryTransferDraft, treasuryTransferIsEditing, updateAvailable, isDBReady, isCloudConnected
  ]);

  const renderCurrentView = () => renderedView;

  const currentViewLabel = menuItems.reduce((acc, item) => {
      if (item.id === currentView) return item.label;
      if (item.subItems) {
          const sub = item.subItems.find(s => s.id === currentView);
          if (sub) return sub.label;
      }
      return acc;
  }, 'لوحة التحكم');

  if (!isDBReady || (checkingLicense && !licenseStatus)) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900 flex-col">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-50"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg font-semibold">
                  {checkingLicense ? 'جاري التحقق من الترخيص...' : 'جاري تحميل قاعدة البيانات...'}
              </p>
          </div>
      )
  }

  if ((licenseStatus && licenseStatus.isExpired) || showManualActivation) {
      return (
          <ActivationScreen 
              systemId={licenseStatus?.systemId || ''} 
              isExpired={licenseStatus?.isExpired || false} 
              daysRemaining={licenseStatus?.daysRemaining || 0}
              onActivationSuccess={() => window.location.reload()} 
              onBack={licenseStatus?.isExpired ? undefined : () => setShowManualActivation(false)}
          />
      );
  }

  const defaultBackgroundStyle: React.CSSProperties = defaultValues.backgroundImage ? {
    backgroundImage: `url(${defaultValues.backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  } : {};

  const getActiveBackground = () => {
      if (currentView === 'salesInvoice' && defaultValues.salesInvoiceBackground) {
          return { img: defaultValues.salesInvoiceBackground, opacity: defaultValues.salesInvoiceOpacity ?? 0.6 };
      }
      if (currentView === 'purchaseInvoice' && defaultValues.purchaseInvoiceBackground) {
          return { img: defaultValues.purchaseInvoiceBackground, opacity: defaultValues.purchaseInvoiceOpacity ?? 0.6 };
      }
      if (currentView === 'salesReturn' && defaultValues.salesReturnBackground) {
          return { img: defaultValues.salesReturnBackground, opacity: defaultValues.salesReturnOpacity ?? 0.6 };
      }
      if (currentView === 'purchaseReturn' && defaultValues.purchaseReturnBackground) {
          return { img: defaultValues.purchaseReturnBackground, opacity: defaultValues.purchaseReturnOpacity ?? 0.6 };
      }
      return { img: defaultValues.backgroundImage, opacity: defaultValues.backgroundOpacity ?? 0.6 };
  };

  const { img: activeBgImage, opacity: activeBgOpacity } = getActiveBackground();

  const activeBackgroundStyle: React.CSSProperties = activeBgImage ? {
    backgroundImage: `url(${activeBgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  } : {};

  if (!isLoggedIn || !currentUser) {
    return (
        <div style={defaultBackgroundStyle} className="min-h-screen relative">
            {defaultValues.backgroundImage && <div className="absolute inset-0" style={{ backgroundColor: theme === 'dark' ? `rgba(17, 24, 39, ${defaultValues.backgroundOpacity ?? 0.6})` : `rgba(255, 255, 255, ${defaultValues.backgroundOpacity ?? 0.6})`, backdropFilter: `blur(${defaultValues.backgroundBlur !== undefined ? defaultValues.backgroundBlur : 2}px)` }}></div>}
            <div className="relative z-10 h-full">
                <Login 
                    onLogin={handleLogin} 
                    users={users} 
                    setUsers={setUsers} 
                    activeDatabaseId={activeDatabaseId} 
                    licenseStatus={licenseStatus}
                    onActivateClick={() => setShowManualActivation(true)}
                    transparent={!!defaultValues.backgroundImage}
                />
            </div>
            <Chat currentUser={null} departments={departments} users={users} chatMessages={chatMessages} setChatMessages={setChatMessages} isLoginScreen={true} themeColor={defaultValues.chatThemeColor} />
        </div>
    );
  }

  return (
    <div style={activeBackgroundStyle} className="h-screen print:h-auto flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden print:overflow-visible">
      {activeBgImage && <div className="absolute inset-0 pointer-events-none z-0 print:hidden" style={{ backgroundColor: theme === 'dark' ? `rgba(17, 24, 39, ${activeBgOpacity})` : `rgba(255, 255, 255, ${activeBgOpacity})`, backdropFilter: `blur(${defaultValues.backgroundBlur !== undefined ? defaultValues.backgroundBlur : 2}px)` }}></div>}
      
      <div className="relative z-10 flex flex-col h-full print:h-auto print:overflow-visible">
        {licenseStatus && !licenseStatus.isActivated && (
            <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black flex justify-between items-center px-4 py-1 z-50 text-sm font-bold print:hidden">
                <span>نسخة تجريبية - متبقي {licenseStatus.daysRemaining} يوم</span>
                <span>© {new Date().getFullYear()} جميع الحقوق محفوظة لـ ETQAN Solutions</span>
            </div>
        )}
        <div className="print:hidden">
            <TopNav onNavigate={(view) => { if(view === 'settingsActivation') setShowManualActivation(true); else setCurrentView(view); }} currentUser={currentUser} licenseStatus={licenseStatus} user={currentUser.fullName} onLogout={handleLogout} theme={theme} onThemeChange={setTheme} currentViewLabel={currentViewLabel} isCloudConnected={isCloudConnected} updateAvailable={updateAvailable} firebaseConfig={firebaseConfig} isDBReady={isDBReady} />
        </div>
        <main className="flex-1 p-6 overflow-y-auto print:overflow-visible print:p-0">
            {notification && <ActionFeedback type={notification} />} 
            {renderCurrentView()}
        </main>
        <Chat currentUser={currentUser!} departments={departments} users={users} onlineSessions={onlineSessions} chatMessages={chatMessages} setChatMessages={setChatMessages} themeColor={defaultValues.chatThemeColor} />
        {isLogoutModalOpen && (
            <Modal show={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="تنبيه قبل الخروج">
                <div className="p-6 text-center">
                    <WarningIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">هل قمت بعمل نسخة احتياطية؟</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">يرجى التأكد من أخذ نسخة احتياطية من بياناتك قبل الخروج للحفاظ عليها.</p>
                    <div className="flex justify-center space-x-4 space-x-reverse">
                        <button onClick={() => { setIsLogoutModalOpen(false); setCurrentView('backupSettings'); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">الذهاب للنسخ الاحتياطي</button>
                        <button onClick={performLogout} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors">الخروج الآن</button>
                    </div>
                </div>
            </Modal>
        )}
      </div>
    </div>
  );
};
export default App;
