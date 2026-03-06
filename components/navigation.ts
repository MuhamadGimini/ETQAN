
export const menuItems = [
  // Dashboard item removed to hide it from the menu bar
  { id: 'sales', label: 'المبيعات', subItems: [
      { id: 'salesInvoice', label: 'فاتورة مبيعات', granular: ['edit', 'delete', 'editDate'] },
      { id: 'salesReturn', label: 'مرتجع مبيعات', granular: ['edit', 'delete', 'editDate'] },
      { id: 'customerManagement', label: 'تكويد العملاء', granular: ['edit', 'delete'] },
      { id: 'salesRepresentativeManagement', label: 'تكويد المناديب', granular: ['edit', 'delete'] },
      { id: 'discountManagement', label: 'طباعة خصومات', group: 'أدوات' },
  ]},
  { id: 'purchases', label: 'المشتريات', subItems: [
      { id: 'purchaseInvoice', label: 'فاتورة مشتريات', granular: ['edit', 'delete', 'editDate'] },
      { id: 'purchaseReturn', label: 'مرتجع مشتريات', granular: ['edit', 'delete', 'editDate'] },
      { id: 'supplierManagement', label: 'تكويد الموردين', granular: ['edit', 'delete'] },
      { id: 'importCostCalculator', label: 'حاسبة تكلفة الاستيراد', group: 'أدوات' },
  ]},
  { id: 'inventory', label: 'المخازن', subItems: [
      { id: 'warehouseTransfer', label: 'تحويلات المخازن', granular: ['delete', 'editDate'] },
      { id: 'warehouseInventory', label: 'جرد وتسوية المخازن' },
      { id: 'itemManagement', label: 'تكويد الأصناف', granular: ['edit', 'delete'] },
      { id: 'warehouseManagement', label: 'تكويد المخازن', granular: ['edit', 'delete'] },
      { id: 'unitManagement', label: 'تكويد الوحدات', granular: ['edit', 'delete'] },
  ]},
  { id: 'accounts', label: 'الحسابات', subItems: [
      { id: 'expenseManagement', label: 'المصروفات', granular: ['edit', 'delete', 'editDate'] },
      { id: 'customerReceipt', label: 'سند قبض عميل', granular: ['edit', 'delete', 'editDate'] },
      { id: 'supplierPayment', label: 'سند دفع مورد', granular: ['edit', 'delete', 'editDate'] },
      { id: 'treasuryTransfer', label: 'تحويلات الخزينة', granular: ['delete', 'editDate'] },
      { id: 'chequeCalendar', label: 'أجندة الشيكات' },
      { id: 'expenseCategoryManagement', label: 'تكويد المصروفات', granular: ['edit', 'delete'] },
      { id: 'treasuryManagement', label: 'تكويد الخزينة', granular: ['edit', 'delete'] },
  ]},
  { id: 'hr', label: 'HR', subItems: [
      { id: 'salaries', label: 'المرتبات' },
      { id: 'attendance', label: 'حضور وانصراف' },
      { id: 'employeeManagement', label: 'تكويد العاملين' },
      { id: 'departmentManagement', label: 'إدارة الأقسام' },
  ]},

  { id: 'reports', label: 'التقارير', subItems: [
      // Sales Reports Group
      { id: 'salesReport', label: 'تقرير المبيعات', group: 'تقارير المبيعات' },
      { id: 'customerStatement', label: 'كشف حساب عميل', group: 'تقارير المبيعات' },
      { id: 'allCustomersStatement', label: 'كشف حسابات العملاء', group: 'تقارير المبيعات' },
      { id: 'customerMovementComparison', label: 'مقارنة حركات العملاء', group: 'تقارير المبيعات' },
      { id: 'salesRepStatement', label: 'كشف حساب بائع', group: 'تقارير المبيعات' },
      { id: 'allSalesRepsStatement', label: 'كشف حسابات البائعين', group: 'تقارير المبيعات' },
      // Purchases Reports Group
      { id: 'purchaseReport', label: 'تقرير المشتريات', group: 'تقارير المشتريات' },
      { id: 'supplierStatement', label: 'كشف حساب مورد', group: 'تقارير المشتريات' },
      { id: 'allSuppliersStatement', label: 'كشف حسابات الموردين', group: 'تقارير المشتريات' },
      // Inventory Reports Group
      { id: 'itemSearch', label: 'بحث الأصناف', group: 'تقارير المخازن والأصناف' },
      { id: 'itemMovement', label: 'كشف حركة صنف', group: 'تقارير المخازن والأصناف' },
      { id: 'analysisReport', label: 'تحليل أداء الأصناف', group: 'تقارير المخازن والأصناف' },
      { id: 'itemsInWarehouses', label: 'الأصناف في المخازن', group: 'تقارير المخازن والأصناف' },
      // Treasury Reports Group
      { id: 'dailyLedger', label: 'تقرير النقدية اليومي', group: 'تقارير الخزينة والمصاريف' },
      { id: 'voucherRegister', label: 'سجل السندات العام', group: 'تقارير الخزينة والمصاريف' },
      { id: 'customerReceiptRegister', label: 'سجل سندات القبض', group: 'تقارير الخزينة والمصاريف' },
      { id: 'supplierPaymentRegister', label: 'سجل سندات الدفع', group: 'تقارير الخزينة والمصاريف' },
      { id: 'expenseReport', label: 'تقرير المصروفات', group: 'تقارير الخزينة والمصاريف' },
      // Profit Reports Group
      { id: 'incomeStatement', label: 'قائمة دخل', group: 'تقارير قوائم الأرباح' },
      { id: 'weeklyReport', label: 'تقرير اسبوعي', group: 'تقارير قوائم الأرباح' },
  ]},
  { id: 'settings', label: 'الإعدادات', subItems: [
      { id: 'userManagement', label: 'إدارة المستخدمين', granular: ['edit', 'delete'] },
      { id: 'userPermissions', label: 'صلاحيات المستخدمين' },
      { id: 'defaultValues', label: 'القيم الافتراضية' },
      { id: 'companySettings', label: 'بيانات الشركة' },
      { id: 'backupSettings', label: 'النسخ الاحتياطي' },
      { id: 'cloudSettings', label: 'الربط السحابي' },
      { id: 'updateManagement', label: 'تحديث البرنامج' },
      { id: 'factoryReset', label: 'ضبط المصنع' },
      { id: 'about', label: 'نبذة عن البرنامج' },
      { id: 'appUnlock', label: 'صلاحية فك الحظر الأمني' },
  ]},
];

const getAllPermissionIds = (items: typeof menuItems): string[] => {
    const ids: string[] = [];
    items.forEach(item => {
        if (item.subItems) {
            item.subItems.forEach(sub => {
                ids.push(sub.id);
                if ((sub as any).granular) {
                    (sub as any).granular.forEach((perm: string) => ids.push(`${sub.id}_${perm}`));
                }
            });
        } else {
            ids.push(item.id);
        }
    });
    return ids;
}

export const ALL_PERMISSIONS = getAllPermissionIds(menuItems);
