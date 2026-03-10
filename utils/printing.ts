
import { formatDateForDisplay } from '../utils';
import type { CompanyData } from '../types';

/**
 * Generates a standardized HTML template for reports with consistent styling.
 */
export const getReportPrintTemplate = (
    title: string, 
    subtitle: string, 
    companyData: CompanyData, 
    tableHeaders: string[], 
    tableRowsHtml: string,
    summaryHtml?: string,
    secondarySummaryHtml?: string
) => {
    return `
        <html dir="rtl">
        <head>
            <title>${title}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
                @page {
                    size: portrait;
                    margin: 1cm;
                }
                body { 
                    font-family: 'Cairo', sans-serif; 
                    padding: 20px; 
                    color: #1f2937;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    background-color: white;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #4f46e5;
                    padding-bottom: 15px;
                }
                .report-header h1 {
                    font-size: 18pt;
                    font-weight: 900;
                    color: #4f46e5;
                    margin: 0;
                }
                .report-header h2 {
                    font-size: 12pt;
                    font-weight: 700;
                    color: #374151;
                    margin: 5px 0;
                }
                .report-header p {
                    font-size: 10pt;
                    color: #000000;
                    margin: 5px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th {
                    background-color: #4f46e5 !important;
                    color: white !important;
                    font-weight: 900;
                    padding: 12px 8px;
                    border: 1px solid #3730a3;
                    text-align: center;
                    font-size: 10pt;
                }
                td {
                    padding: 10px 8px;
                    border: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 9pt;
                    font-weight: 700;
                }
                tr:nth-child(even) {
                    background-color: #f3f4f6 !important;
                }
                .summary-section {
                    margin-top: 30px;
                    display: flex;
                }
                .summary-box {
                    border: 2px solid #4f46e5;
                    border-radius: 12px;
                    padding: 15px;
                    background-color: #f9fafb;
                    min-width: 250px;
                }
                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 10pt;
                    font-weight: 900;
                }
                .summary-item:last-child {
                    margin-bottom: 0;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 8px;
                    color: #4f46e5;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 10pt;
                    color: #000000;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 10px;
                }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .font-black { font-weight: 900; }
                .text-indigo { color: #4f46e5; }
                .text-red { color: #dc2626; }
                .text-green { color: #16a34a; }
            </style>
        </head>
        <body onload="window.print();window.close()">
            <div class="report-header">
                <h1>${companyData.name}</h1>
                <h2>${title}</h2>
                <p>${subtitle}</p>
                <p>تاريخ الطباعة: ${formatDateForDisplay(new Date().toISOString().split('T')[0])}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        ${tableHeaders.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>
            ${(summaryHtml || secondarySummaryHtml) ? `
                <div class="summary-section" style="justify-content: ${(summaryHtml && secondarySummaryHtml) ? 'space-between' : 'flex-end'}">
                    ${secondarySummaryHtml ? `
                    <div class="summary-box">
                        ${secondarySummaryHtml}
                    </div>
                    ` : ''}
                    ${summaryHtml ? `
                    <div class="summary-box">
                        ${summaryHtml}
                    </div>
                    ` : ''}
                </div>
            ` : ''}
            <div class="footer">
                <p>${companyData.address} | ${companyData.phone1}</p>
            </div>
        </body>
        </html>
    `;
};
