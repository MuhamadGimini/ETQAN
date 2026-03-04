
import React, { useState, useEffect } from 'react';
import { formatDateForDisplay, parseDisplayDate } from '../utils';

/**
 * A custom hook to manage date inputs with DD-MM-YYYY display format
 * and YYYY-MM-DD internal format.
 * Features smart autocomplete (e.g., '5' -> '05-MM-YYYY', '5-10' -> '05-10-YYYY').
 * @param isoDate The date value from the main state (YYYY-MM-DD).
 * @param onDateChange The callback to update the main state.
 * @returns An object with props to be spread onto an <input type="text">.
 */
export const useDateInput = (isoDate: string, onDateChange: (newIsoDate: string) => void) => {
    const [displayDate, setDisplayDate] = useState('');

    useEffect(() => {
        setDisplayDate(formatDateForDisplay(isoDate));
    }, [isoDate]);

    const handleDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDisplayDate(e.target.value);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const parsed = parseDisplayDate(value);

        if (parsed) {
            onDateChange(parsed);
            // The useEffect will handle reformatting the display value to DD-MM-YYYY
            setDisplayDate(formatDateForDisplay(parsed));
        } else if (value.trim() === '') {
            onDateChange('');
        } else {
            // On invalid format, revert the input to the last valid state's display format
            setDisplayDate(formatDateForDisplay(isoDate));
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
             e.currentTarget.blur();
        }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    };

    return {
        value: displayDate,
        onChange: handleDisplayChange,
        onBlur: handleBlur,
        onFocus: handleFocus,
        onKeyDown: handleKeyDown,
        placeholder: 'DD-MM-YYYY',
        autoComplete: 'off'
    };
};
