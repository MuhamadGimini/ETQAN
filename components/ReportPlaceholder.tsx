
import React from 'react';
import { DocumentIcon } from './Shared';

interface ReportPlaceholderProps {
    title: string;
}

const ReportPlaceholder: React.FC<ReportPlaceholderProps> = ({ title }) => {
    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div 
                className="w-full max-w-3xl text-center p-8 md:p-12 rounded-2xl shadow-lg dark:bg-gray-700/30 dark:border-white/20 bg-white/30 backdrop-blur-lg border border-white/40" 
            >
                <DocumentIcon />
                <h1 className="text-4xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                    {title}
                </h1>
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-10">
                    هذه الميزة قيد التطوير حالياً. ترقبوا التحديثات القادمة!
                </p>
            </div>
        </div>
    );
};

export default ReportPlaceholder;
