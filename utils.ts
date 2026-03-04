
/**
 * Rounds a number to exactly 2 decimal places mathematically.
 * @param num The number to round.
 * @returns Rounded number.
 */
export const roundTo2 = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Formats a number into a string with comma separators for thousands and two decimal places.
 * e.g., 12345.678 -> "12,345.68"
 * Handles null, undefined, and non-numeric values gracefully.
 * @param value The number or string to format.
 * @returns A formatted string.
 */
export const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return '0.00';
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return '0.00';
  }
  
  // Using Intl.NumberFormat is the modern and correct way to format numbers.
  // 'en-US' locale provides the comma separator for thousands and dot for decimals.
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};


/**
 * Formats a number for printing, returning an HTML string with smaller decimals.
 * @param value The number or string to format.
 * @returns An HTML string.
 */
export const formatNumberWithSmallerDecimals = (value: number | string | null | undefined): string => {
  const formatted = formatNumber(value);
  const parts = formatted.split('.');
  
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : '';

  if (decimalPart) {
    // Using inline style for compatibility with print documents generated from strings.
    return `${integerPart}<span style="font-size: 0.75em; vertical-align: baseline;">${decimalPart}</span>`;
  }
  return integerPart;
};

/**
 * Normalizes text for smart searching.
 * 1. Converts to lowercase.
 * 2. Normalizes Arabic characters (Alef, Yeh, Teh Marbuta).
 * 3. Replaces special characters with spaces.
 * 4. Collapses multiple spaces into a single space.
 */
export const normalizeText = (text: string): string => {
    if (!text || typeof text !== 'string') return "";
    let normalized = text.toString().toLowerCase();
    
    // Normalize Arabic
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    normalized = normalized.replace(/ة/g, 'ه');
    normalized = normalized.replace(/ى/g, 'ي');
    
    // Replace special characters (anything not a letter, number, or space) with a space
    normalized = normalized.replace(/[^\p{L}\p{N} ]/gu, ' ');
    
    // Collapse multiple spaces into one and trim
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
};

/**
 * Performs a token-based search.
 * Splits the query into words and checks if each query word starts any of the item's words.
 * This is more accurate than simple `includes`.
 * @param itemText The full text of the item to search within (e.g., "Item Name 123").
 * @param query The user's search query (e.g., "item 123").
 * @returns True if all query words are found in the item text.
 */
export const searchMatch = (itemText: string, query: string): boolean => {
    // If the query is essentially empty (null, undefined, or just whitespace), treat it as "show all"
    if (!query || !query.trim()) return true;

    const normalizedQuery = normalizeText(query);
    
    // If normalization removed everything (e.g., user typed only symbols), it's not a valid search.
    if (!normalizedQuery) return false;

    // Split into tokens
    const queryTokens = normalizedQuery.split(' ');
    const itemTokens = normalizeText(itemText).split(' ');

    // Check if every token in the query can be found starting a token in the item text
    return queryTokens.every(queryToken => 
        itemTokens.some(itemToken => itemToken.startsWith(queryToken))
    );
};


/**
 * Generates a unique ID based on timestamp and a random number part.
 * Ensures the generated ID as a number is within JavaScript's MAX_SAFE_INTEGER.
 * @returns A unique string ID that can be safely converted to a number.
 */
export const generateUniqueId = (): string => {
    // Max safe integer is 9007199254740991 (16 digits). We'll aim for 15.
    const timestamp = Date.now().toString(); // 13 digits
    // Get last 2 digits of timestamp to vary more, and add random part
    const randomPart = (timestamp.substring(timestamp.length - 2) + Math.random().toString().substring(2, 5)).padStart(5, '0');
    // ~13 digits for timestamp part, 2 for random = 15. Safe.
    return timestamp.substring(0, 10) + randomPart;
};

/**
 * Calculates the next available sequential barcode starting from 1001.
 * Finds the highest numerical barcode in the list and increments it.
 */
export const getNextBarcode = (items: { barcode: string }[]): string => {
    const numericBarcodes = items
        .map(i => parseInt(i.barcode))
        .filter(n => !isNaN(n));
    
    const maxBarcode = numericBarcodes.length > 0 ? Math.max(...numericBarcodes) : 1000;
    
    // If max is less than 1000 (e.g. user entered small numbers manually), jump to 1001.
    // Otherwise increment the max found.
    return (maxBarcode < 1000 ? 1001 : maxBarcode + 1).toString();
};


/**
 * Formats an ISO date string (YYYY-MM-DD) to a display string (DD-MM-YYYY).
 * @param isoDate The date string in YYYY-MM-DD format.
 * @returns The formatted date string DD-MM-YYYY, or an empty string.
 */
export const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate || typeof isoDate !== 'string' || !isoDate.includes('-')) return '';
    const parts = isoDate.split('T')[0].split('-');
    if (parts.length !== 3 || parts.some(p => isNaN(parseInt(p)))) return isoDate; // return original if not in expected format
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

/**
 * Parses a display date string (DD, DD-MM, DD-MM-YYYY) into an ISO date string (YYYY-MM-DD).
 * Includes smart autocomplete for current month/year.
 * @param displayDate The date string from the input field.
 * @returns The parsed ISO date string, or an empty string if invalid.
 */
export const parseDisplayDate = (displayDate: string): string => {
    if (!displayDate || typeof displayDate !== 'string') return '';
    
    // Remove non-numeric characters except separators
    const trimmed = displayDate.trim().replace(/[^\d\/\-\.]/g, '');
    
    // Split by common separators
    let parts = trimmed.split(/[-/.]/);
    
    // Handle cases where user types specifically "DDMM" or "D" without separators (heuristic)
    if (parts.length === 1 && trimmed.length > 2 && trimmed.length <= 4) {
         // Assume DDMM
         const d = trimmed.substring(0, 2);
         const m = trimmed.substring(2);
         parts = [d, m];
    }

    const currentDate = new Date();
    let day = 0;
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();

    if (parts.length === 1) {
        // Only Day provided (e.g., "5")
        if (!parts[0]) return '';
        day = parseInt(parts[0], 10);
    } else if (parts.length === 2) {
        // Day and Month provided (e.g., "5-10")
        if (!parts[0] || !parts[1]) return '';
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
    } else if (parts.length >= 3) {
        // Full Date provided
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        let yearStr = parts[2];
        
        // Handle short year (e.g., "24" -> "2024")
        if (yearStr.length === 2) {
            year = parseInt(`20${yearStr}`, 10);
        } else if (yearStr.length === 4) {
            year = parseInt(yearStr, 10);
        } else {
            return ''; // Invalid year
        }
    } else {
        return '';
    }

    // Validate ranges
    if (isNaN(day) || day < 1 || day > 31) return '';
    if (isNaN(month) || month < 1 || month > 12) return '';
    if (isNaN(year) || year < 1900 || year > 2100) return '';

    // Adjust for max days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) return '';

    const yStr = year.toString();
    const mStr = month.toString().padStart(2, '0');
    const dStr = day.toString().padStart(2, '0');

    return `${yStr}-${mStr}-${dStr}`;
};

/**
 * Formats a phone number for WhatsApp link.
 * Handles Egyptian numbers mostly.
 * @param phone The input phone number.
 * @returns The formatted phone number string.
 */
export const formatPhoneNumberForWhatsApp = (phone: string): string => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0020')) return cleaned.substring(2);
    if (cleaned.startsWith('01') && cleaned.length === 11) return `20${cleaned.substring(1)}`;
    if (cleaned.startsWith('1') && cleaned.length === 10) return `20${cleaned}`;
    if (cleaned.startsWith('20') && cleaned.length === 12) return cleaned;
    return cleaned;
};
