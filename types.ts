// Item Color Balance Type
export interface ItemColorBalance {
    color: string;
    initialBalance: number;
    currentBalance: number;
}

// Item Data Type
export interface Item {
    id: number;
    barcode: string;
    name: string;
    unitId: number;
    warehouseId: number;
    initialBalance: number; // الرصيد الافتتاحي العام عند التكويد
    openingBalance: number; // الرصيد الحالي الفعلي المتاح
    purchasePrice: number;
    sellPrice: number;
    colorBalances?: ItemColorBalance[]; // مصفوفة الألوان والأرصدة
    createdAt?: string;
    createdBy?: string;
    lastModifiedAt?: string;
    lastModifiedBy?: string;
}

export interface MgmtUser {
  id: number;
  username: string;
  password?: string;
  fullName: string;
  permissions: string[];
  createdAt?: string;
  createdBy?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  isBlocked?: boolean;
  expiresAt?: number;
}

export interface DatabaseProfile { id: string; name: string; }
export interface FirebaseConfig { apiKey: string; authDomain: string; databaseURL: string; projectId: string; storageBucket: string; messagingSenderId: string; appId: string; }
export interface CompanyData { name: string; cr: string; tr: string; phone1: string; phone2: string; address: string; logo?: string; }
export interface DefaultValues { 
    defaultWarehouseId: number; 
    defaultUnitId: number; 
    defaultSalesRepId: number; 
    defaultTreasuryId: number; 
    defaultPaymentMethodInvoices: 'cash' | 'credit'; 
    defaultPaymentMethodReceipts: 'cash' | 'check' | 'discount'; 
    invoiceFooter: string; 
    whatsappFooter: string; 
    enableBackupAlert: boolean; 
    useSystemPicker?: boolean; 
    backgroundImage?: string; 
    backgroundOpacity?: number; 
    backgroundBlur?: number; 
    githubRepo?: string;
    
    // Per-screen backgrounds
    salesInvoiceBackground?: string;
    salesInvoiceOpacity?: number;
    purchaseInvoiceBackground?: string;
    purchaseInvoiceOpacity?: number;
    salesReturnBackground?: string;
    salesReturnOpacity?: number;
    purchaseReturnBackground?: string;
    purchaseReturnOpacity?: number;
    chatThemeColor?: string;
}
export interface Warehouse { id: number; code: string; name: string; keeper: string; phone: string; address: string; notes: string; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface Unit { id: number; name: string; description: string; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface Treasury { id: number; name: string; keeper: string; openingBalance: number; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface ExpenseCategory { id: number; code: string; name: string; description: string; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface Expense { id: number; date: string; categoryId: number; treasuryId: number; beneficiary: string; amount: number; notes: string; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface Customer { id: number; name: string; phone: string; address: string; openingBalance: number; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface CustomerReceipt { id: number; date: string; customerId: number; treasuryId: number; amount: number; notes: string; paymentMethod: 'cash' | 'check' | 'discount'; checkNumber?: string; checkDueDate?: string; bankName?: string; checkStatus?: 'pending' | 'collected' | 'rejected'; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface SalesRepresentative { id: number; code: string; name: string; phone: string; nationalId: string; address: string; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface Supplier { id: number; name: string; phone: string; address: string; openingBalance: number; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface SupplierPayment { id: number; date: string; supplierId: number; treasuryId: number; amount: number; notes: string; paymentMethod: 'cash' | 'check' | 'discount'; checkNumber?: string; checkDueDate?: string; bankName?: string; checkStatus?: 'pending' | 'paid' | 'rejected'; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface SalesInvoiceItem { itemId: number; quantity: number; price: number; warehouseId?: number; }
export interface SalesInvoice { id: number | string; date: string; customerId: number; salesRepId: number; warehouseId: number; items: SalesInvoiceItem[]; discount: number; tax: number; paidAmount: number; notes: string; type: 'credit' | 'cash'; permissionNumber?: string; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface SalesReturnItem { itemId: number; quantity: number; price: number; warehouseId?: number; }
export interface SalesReturn { id: number | string; date: string; customerId: number; salesRepId: number; warehouseId: number; items: SalesReturnItem[]; discount: number; tax: number; paidAmount: number; notes: string; type: 'credit' | 'cash'; permissionNumber?: string; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface PurchaseInvoiceItem { itemId: number; quantity: number; price: number; warehouseId?: number; }
export interface PurchaseInvoice { id: number | string; supplierInvoiceNumber?: string; permissionNumber?: string; date: string; supplierId: number; warehouseId: number; items: PurchaseInvoiceItem[]; discount: number; tax: number; paidAmount: number; notes: string; type: 'credit' | 'cash'; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface PurchaseReturnItem { itemId: number; quantity: number; price: number; warehouseId?: number; }
export interface PurchaseReturn { id: number | string; date: string; supplierId: number; items: PurchaseReturnItem[]; discount: number; tax: number; paidAmount: number; notes: string; type: 'credit' | 'cash'; warehouseId: number; permissionNumber?: string; createdAt?: string; createdBy?: string; lastModifiedAt?: string; lastModifiedBy?: string; }
export interface WarehouseTransferItem { itemId: number; quantity: number; }
export interface WarehouseTransfer { id: number; date: string; fromWarehouseId: number; toWarehouseId: number; items: WarehouseTransferItem[]; notes: string; createdAt?: string; createdBy?: string; }
export interface TreasuryTransfer { id: number; date: string; fromTreasuryId: number; toTreasuryId: number; amount: number; notes: string; createdAt?: string; createdBy?: string; }
export interface StorableDiscountItem { itemId: number; discountPrice: number; printQty: number; }

// Import Calculator Types
export interface ImportItem {
  id: string;
  name: string;
  qty: number;
  priceRmb: number;
  barcode?: string;
}

export interface SavedImport {
  id: string;
  timestamp: string;
  messageName: string;
  supplierInvoiceNumber?: string;
  supplierId?: number;
  entryDate?: string;
  warehouseId: number;
  invoiceType?: 'cash' | 'credit';
  status: 'draft' | 'synced';
  linkedPurchaseInvoiceId?: number | string;
  usdToRmb: number;
  usdToEgp: number;
  expenses: {
    shipping: number;
    customs: number;
    clearance: number;
    commissions: number;
    others: number;
  };
  items: ImportItem[];
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string; // YYYY-MM-DD
  checkInTime: string | null; // HH:mm
  checkOutTime: string | null; // HH:mm
  status: 'present' | 'absent' | 'late' | 'excused' | 'vacation';
  notes: string;
  dataSource?: 'manual' | 'excel' | 'device';
  createdAt?: string;
  createdBy?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
}

export interface SalaryRecord {
  id: number;
  employeeId: number;
  month: string; // YYYY-MM
  basicSalary: number;
  workingDays: number;
  lates: number; // Amount deducted for lates
  overtime: number; // Amount added for overtime
  commission: number; // Sales commission
  deductions: number; // Other deductions
  bonuses: number; // Other bonuses
  advances?: number; // Advances from expenses
  netSalary: number;
  isPaid: boolean;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
}

export interface AppBackupData { users?: MgmtUser[]; companyData?: CompanyData; warehouses?: Warehouse[]; units?: Unit[]; items?: Item[]; treasuries?: Treasury[]; expenseCategories?: ExpenseCategory[]; expenses?: Expense[]; customers?: Customer[]; customerReceipts?: CustomerReceipt[]; salesRepresentatives?: SalesRepresentative[]; suppliers?: Supplier[]; supplierPayments?: SupplierPayment[]; salesInvoices?: SalesInvoice[]; salesReturns?: SalesReturn[]; purchaseInvoices?: PurchaseInvoice[]; purchaseReturns?: PurchaseReturn[]; warehouseTransfers?: WarehouseTransfer[]; treasuryTransfers?: TreasuryTransfer[]; defaultValues?: DefaultValues; activeDiscounts?: Record<number, number>; selectedDiscountItems?: StorableDiscountItem[]; importCalculatorHistory?: SavedImport[]; attendanceRecords?: AttendanceRecord[]; salaryRecords?: SalaryRecord[]; employees?: Employee[]; departments?: Department[]; onlineSessions?: OnlineSession[]; }
export type NotificationType = 'add' | 'save' | 'edit' | 'delete' | 'error';

export type DocToView = { view: string; docId: number | string } | null;
export type PreselectedSalesRep = { repId: number; startDate: string; endDate: string; } | null;

export type DayOfWeek = 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface Employee {
  id: number;
  code: string;
  name: string;
  phone: string;
  nationalId: string;
  address: string;
  jobTitle: string;
  departmentId: number;
  salary: number;
  vacationDays: DayOfWeek[];
  scheduledCheckInTime?: string;
  scheduledCheckOutTime?: string;
  workingHoursPerDay?: number;
  commissionType?: 'none' | 'percentage' | 'per_item';
  commissionValue?: number;
  isBlocked?: boolean;
  createdAt?: string;
  createdBy?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
}

export interface Department {
  id: number;
  code?: string;
  name: string;
  createdAt?: string;
  createdBy?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
}

export interface ChatChannel {
    id: string; // e.g., 'department_1', 'general'
    name: string;
}

export interface ChatMessage {
    id: string;
    channelId: string;
    senderId: number;
    senderName: string;
    text: string;
    timestamp: number; // Unix timestamp
    audioData?: string; // Base64 encoded audio
    isCall?: boolean; // Indicates if this is a call notification
    isEdited?: boolean; // Indicates if the message was edited
    attachment?: {
        type: 'image' | 'file';
        url: string; // Base64 or URL
        name: string;
    };
}

export interface OnlineSession {
    id: number; // Same as userId
    userId: number;
    userName: string;
    lastActive: number;
}
