
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
    signaturesHtml?: string,
    pageSize: string = 'A4',
    themeColor: string = '#1e3a8a'
) => {
    return `
        <html dir="rtl">
        <head>
            <title>${title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
                @page {
                    size: ${pageSize};
                    margin: 1cm;
                }
                body { 
                    font-family: 'Cairo', sans-serif; 
                    padding: 0; 
                    color: #000;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    background-color: white;
                }
                .report-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                    border-bottom: 2px solid ${themeColor};
                    padding-bottom: 10px;
                }
                .header-logo {
                    width: 30%;
                    text-align: left;
                }
                .header-logo img {
                    max-width: 120px;
                    max-height: 80px;
                    object-fit: contain;
                }
                .header-center {
                    width: 40%;
                    text-align: center;
                }
                .header-info {
                    width: 30%;
                    text-align: right;
                    font-size: 9pt;
                    font-weight: bold;
                }
                .report-header h1 {
                    font-size: 1.6rem;
                    font-weight: 900;
                    color: ${themeColor};
                    margin: 0;
                }
                .report-header h2 {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: ${themeColor};
                    margin: 5px 0;
                }
                .report-header p {
                    font-size: 10pt;
                    color: #000;
                    margin: 2px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                    border: 1px solid ${themeColor};
                }
                th {
                    background-color: ${themeColor} !important;
                    color: white !important;
                    font-weight: 900;
                    padding: 8px;
                    border: 1px solid ${themeColor};
                    text-align: center;
                    font-size: 11pt;
                }
                td {
                    padding: 8px;
                    border: 1px solid #ddd;
                    text-align: center;
                    font-size: 10pt;
                    font-weight: 700;
                    color: #000;
                }
                tr:nth-child(even) {
                    background-color: #f1f5f9 !important;
                }
                .summary-section {
                    margin-top: 15px;
                    display: flex;
                    justify-content: flex-end;
                }
                .summary-box {
                    border: 1px solid ${themeColor};
                    border-radius: 8px;
                    padding: 10px;
                    background-color: #f8fafc;
                    width: 280px;
                }
                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 4px 0;
                    border-bottom: 1px dashed #ddd;
                    font-weight: bold;
                    font-size: 11pt;
                    color: #000;
                }
                .summary-item:last-child {
                    border-bottom: none;
                    border-top: 2px solid ${themeColor};
                    margin-top: 5px;
                    padding-top: 8px;
                    color: ${themeColor};
                    font-size: 12pt;
                }
                .footer {
                    margin-top: 40px;
                    border-top: 2px solid ${themeColor};
                    padding-top: 10px;
                    text-align: center;
                    font-size: 9pt;
                    font-weight: bold;
                    color: #000;
                }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .font-black { font-weight: 900; }
                .text-indigo { color: #1e3a8a; }
                .text-red { color: #dc2626; }
                .text-green { color: #16a34a; }
                .text-blue { color: #2563eb; }
            </style>
        </head>
        <body onload="window.print();window.close()">
            <div class="report-header">
                <div class="header-info">
                    <p>تاريخ الطباعة: ${formatDateForDisplay(new Date().toISOString().split('T')[0])}</p>
                    ${companyData.tr ? `<div>رقم التسجيل: ${companyData.tr}</div>` : ''}
                    ${companyData.cr ? `<div>سجل تجاري: ${companyData.cr}</div>` : ''}
                </div>
                <div class="header-center">
                    <h1>${companyData.name}</h1>
                    <h2>${title}</h2>
                    <p>${subtitle}</p>
                </div>
                <div class="header-logo">
                    ${companyData.logo ? `<img src="${companyData.logo}" />` : ''}
                </div>
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

export const getVoucherPrintTemplate = (
    title: string,
    voucherId: string,
    date: string,
    companyData: any,
    detailsHtml: string,
    tableHeaders: string[],
    tableRowsHtml: string,
    summaryHtml: string,
    signaturesHtml?: string,
    pageSize: string = 'A4',
    themeColor: string = '#1e3a8a'
) => {
    return `
        <html dir="rtl">
        <head>
            <title>${title} رقم ${voucherId}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
                @page { size: ${pageSize}; margin: 1cm; }
                body { font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; color: #000; line-height: 1.4; }
                .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                .logo-section { width: 33%; text-align: left; }
                .logo-section img { max-width: 140px; max-height: 90px; object-fit: contain; }
                .company-center { width: 33%; text-align: center; }
                .company-center h1 { margin: 0; font-size: 1.6rem; font-weight: 900; color: ${themeColor}; }
                .invoice-badge { display: inline-block; border: 2px solid ${themeColor}; color: ${themeColor}; padding: 4px 15px; border-radius: 6px; margin-top: 8px; font-weight: 900; font-size: 1.1rem; }
                .doc-info { width: 33%; text-align: right; }
                .tax-info { font-size: 9pt; font-weight: bold; color: #000; line-height: 1.2; margin-top: 5px; }
                
                .details-block { margin: 15px 0; font-size: 12pt; border-right: 4px solid ${themeColor}; padding-right: 12px; }
                .details-block p { margin: 4px 0; font-weight: bold; color: #000; }
                .bold { font-weight: bold; }
                .heavy { font-weight: 900; }

                table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid ${themeColor}; }
                th { background: ${themeColor}; color: white; padding: 8px; text-align: center; font-size: 12pt; border: 1px solid ${themeColor}; }
                td { padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 11pt; color: #000; }
                
                .item-row:nth-child(even) { background-color: #f1f5f9; }
                
                @media print {
                    .item-row:nth-child(even) { background-color: transparent !important; }
                    th { background: ${themeColor} !important; color: white !important; -webkit-print-color-adjust: exact; }
                    .invoice-badge { border-color: ${themeColor} !important; color: ${themeColor} !important; -webkit-print-color-adjust: exact !important; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }

                .summary-section { display: flex; justify-content: flex-end; margin-top: 15px; }
                .summary-box { width: 280px; border: 1px solid ${themeColor}; border-radius: 8px; padding: 10px; background: #f8fafc; }
                .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #ddd; font-weight: bold; font-size: 11pt; color: #000; }
                .summary-row.total { border-bottom: none; border-top: 2px solid ${themeColor}; margin-top: 5px; padding-top: 8px; color: ${themeColor}; font-size: 12pt; }
                
                .signatures-section { display: flex; justify-content: space-around; margin-top: 40px; }
                .signature-box { text-align: center; width: 150px; }
                .signature-title { font-weight: bold; margin-bottom: 40px; color: #000; }
                .signature-line { border-bottom: 1px solid #000; }

                .footer-block { margin-top: 40px; border-top: 2px solid ${themeColor}; padding-top: 15px; display: flex; justify-content: space-between; font-size: 10pt; font-weight: bold; color: #000; }
                .thanks { text-align: center; margin-top: 20px; font-weight: 900; color: #000; font-size: 11pt; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="header-top">
                <div class="doc-info">
                     <p class="heavy">التاريخ: ${date}</p>
                     <p class="heavy">الرقم: ${voucherId}</p>
                </div>
                <div class="company-center">
                    <h1>${companyData.name}</h1>
                    <div class="invoice-badge">${title}</div>
                </div>
                <div class="logo-section">
                    ${companyData.logo ? `<img src="${companyData.logo}" />` : ''}
                    <div class="tax-info">
                        ${companyData.tr ? `<div>رقم التسجيل: ${companyData.tr}</div>` : ''}
                        ${companyData.cr ? `<div>سجل تجاري: ${companyData.cr}</div>` : ''}
                    </div>
                </div>
            </div>

            <div class="details-block">
                ${detailsHtml}
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

            <div class="summary-section">
                <div class="summary-box">
                    ${summaryHtml}
                </div>
            </div>

            ${signaturesHtml ? `
                <div class="signatures-section">
                    ${signaturesHtml}
                </div>
            ` : ''}

            <div class="footer-block">
                <div>العنوان: ${companyData.address}</div>
                <div>ت: ${companyData.phone1} ${companyData.phone2 ? ' - ' + companyData.phone2 : ''}</div>
            </div>
        </body>
        </html>
    `;
};
