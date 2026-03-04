import React, { useState, useEffect } from 'react';

const Clock: React.FC<{ className?: string }> = ({ className = '' }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    const formattedDate = time.toLocaleDateString('ar-EG', dateOptions);
    const hours = time.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format

    const formatTimeUnit = (unit: number) => unit.toString().padStart(2, '0');

    return (
        <div className={`w-full rounded-2xl bg-gradient-to-br from-blue-50 to-purple-100 dark:from-gray-800 dark:to-gray-900 p-6 text-center shadow-lg border border-white/30 ${className}`}>
            <div className="flex items-center justify-center font-mono" style={{ fontFeatureSettings: "'slashed-zero'" }}>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 self-center -mr-2">{period}</span>
                <p className="text-6xl font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                    {formatTimeUnit(displayHours)}:{formatTimeUnit(time.getMinutes())}:{formatTimeUnit(time.getSeconds())}
                </p>
            </div>
            <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mt-2">{formattedDate}</p>
        </div>
    );
};

export default Clock;