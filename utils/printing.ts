
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
    secondarySummaryHtml?: string,
    signaturesHtml?: string
) => {
    return `
        <html dir="rtl">
        <head>
            <title>${title}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
                @page {
                    size: A5 landscape;
                    margin: 0.5cm;
                }
                body { 
                    font-family: 'Cairo', sans-serif; 
                    padding: 10px; 
                    color: #1f2937;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    background-color: white;
                    min-height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 15px;
                    border-bottom: 2px solid #4f46e5;
                    padding-bottom: 10px;
                }
                .report-header h1 {
                    font-size: 16pt;
                    font-weight: 900;
                    color: #4f46e5;
                    margin: 0;
                }
                .report-header h2 {
                    font-size: 11pt;
                    font-weight: 700;
                    color: #374151;
                    margin: 2px 0;
                }
                .report-header p {
                    font-size: 9pt;
                    color: #000000;
                    margin: 2px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                th {
                    background-color: #4f46e5 !important;
                    color: white !important;
                    font-weight: 900;
                    padding: 8px 4px;
                    border: 1px solid #3730a3;
                    text-align: center;
                    font-size: 9pt;
                }
                td {
                    padding: 6px 4px;
                    border: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 8pt;
                    font-weight: 700;
                }
                tr:nth-child(even) {
                    background-color: #f3f4f6 !important;
                }
                .summary-section {
                    margin-top: 15px;
                    display: flex;
                }
                .summary-box {
                    border: 1.5px solid #4f46e5;
                    border-radius: 8px;
                    padding: 10px;
                    background-color: #f9fafb;
                    min-width: 200px;
                }
                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 9pt;
                    font-weight: 900;
                }
                .summary-item:last-child {
                    margin-bottom: 0;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 4px;
                    color: #4f46e5;
                }
                .content-wrapper {
                    flex: 1;
                }
                .signatures-section {
                    margin-top: auto;
                    padding-top: 20px;
                    display: flex;
                    justify-content: space-between;
                    border-top: 1px dashed #ccc;
                }
                .signature-box {
                    text-align: center;
                    width: 30%;
                }
                .signature-title {
                    font-weight: 900;
                    font-size: 10pt;
                    margin-bottom: 30px;
                    color: #374151;
                }
                .signature-line {
                    border-top: 1px solid #000;
                    width: 80%;
                    margin: 0 auto;
                }
                .footer {
                    margin-top: 10px;
                    text-align: center;
                    font-size: 8pt;
                    color: #000000;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 5px;
                }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .font-black { font-weight: 900; }
                .text-indigo { color: #4f46e5; }
                .text-red { color: #dc2626; }
                .text-green { color: #16a34a; }
                .text-blue { color: #2563eb; }
            </style>
        </head>
        <body onload="window.print();window.close()">
            <div class="content-wrapper">
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
            </div>
            
            ${signaturesHtml ? `
                <div class="signatures-section">
                    ${signaturesHtml}
                </div>
            ` : ''}

            <div class="footer">
                <p>${companyData.address} | ${companyData.phone1}</p>
            </div>
        </body>
        </html>
    `;
};
