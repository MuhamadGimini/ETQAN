

import * as XLSX from 'xlsx';

// دالة لتصدير البيانات إلى ملف Excel
export const exportToExcel = (data: any[], fileName: string) => {
    // إنشاء ورقة عمل جديدة من بيانات JSON
    const ws = XLSX.utils.json_to_sheet(data);

    // تعديل اتجاه الورقة لتكون من اليمين لليسار (للعربية)
    if(!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ rightToLeft: true });

    // حساب عرض الأعمدة تلقائياً (تقريبي)
    const colWidths = data.reduce((acc: any, row: any) => {
        Object.keys(row).forEach((key, i) => {
            const value = row[key] ? row[key].toString() : '';
            const headerWidth = key.length;
            const contentWidth = value.length;
            const maxWidth = Math.max(headerWidth, contentWidth, 10); // الحد الأدنى 10
            acc[i] = Math.max(acc[i] || 0, maxWidth);
        });
        return acc;
    }, []);

    ws['!cols'] = colWidths.map((w: number) => ({ wch: w + 2 }));

    // إنشاء كتاب عمل جديد
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // حفظ الملف
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// دالة لقراءة البيانات من ملف Excel
// FIX: Replaced Buffer with Uint8Array as Buffer type is from Node.js and not available in the browser's TypeScript context.
export const readFromExcel = (fileOrBuffer: File | Uint8Array): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        try {
            // FIX: Using instanceof Uint8Array works for both Buffers (in Electron) and regular Uint8Arrays.
            if (fileOrBuffer instanceof Uint8Array) {
                const workbook = XLSX.read(fileOrBuffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData);
            } else { // It's a File object for browser fallback
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    resolve(jsonData);
                };
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(fileOrBuffer);
            }
        } catch (error) {
            reject(error);
        }
    });
};
