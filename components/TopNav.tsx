

import React from 'react';
import { menuItems } from './navigation';
import type { MgmtUser, FirebaseConfig } from '../types';
import type { LicenseStatus } from '../services/license';
import { SunIcon, MoonIcon, ChevronDownIcon, DatabaseIcon } from './Shared';
import { APP_VERSION } from '../constants/version';

interface TopNavProps {
    onNavigate: (view: string) => void;
    currentUser: MgmtUser | null;
    licenseStatus: LicenseStatus | null;
    user: string;
    onLogout: () => void;
    theme: 'light' | 'dark';
    onThemeChange: (theme: 'light' | 'dark') => void;
    currentViewLabel: string;
    isCloudConnected: boolean;
    updateAvailable: boolean;
    firebaseConfig: FirebaseConfig | null;
    isDBReady: boolean;
}

const TopNav: React.FC<TopNavProps> = ({ 
    onNavigate, currentUser, licenseStatus, user, onLogout, theme, onThemeChange, currentViewLabel, isCloudConnected, updateAvailable, firebaseConfig, isDBReady
}) => {
  
  const filteredMenuItems = React.useMemo(() => {
    if (!currentUser) return [];
    
    let items: typeof menuItems = [];

    if (currentUser.id === 1) {
        items = menuItems.map(i => ({...i, subItems: i.subItems ? [...i.subItems] : undefined}));
    } else {
        const userPerms = currentUser.permissions || [];
        items = menuItems.map(item => {
            if (item.id === 'dashboard') return item;
            if (!item.subItems) {
                return userPerms.includes(item.id) ? item : null;
            }
            const filteredSubItems = item.subItems.filter(subItem => userPerms.includes(subItem.id));
            if (filteredSubItems.length === 0) return null;
            return { ...item, subItems: filteredSubItems };
        }).filter((item): item is typeof menuItems[0] => item !== null);
    }

    if (licenseStatus && !licenseStatus.isActivated) {
        const settingsItem = items.find(i => i.id === 'settings');
        if (settingsItem) {
            settingsItem.subItems = [
                ...(settingsItem.subItems || []),
                { id: 'settingsActivation', label: '🔑 تفعيل البرنامج' }
            ];
        }
    }

    return items;

  }, [currentUser, licenseStatus]);

  const toggleTheme = () => {
    onThemeChange(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-md border-b-2 border-gray-300 dark:border-gray-700 flex items-center justify-between p-2 print:hidden relative z-50 transition-colors duration-300">
        {/* Right side: Logo and Nav items */}
        <div className="flex items-center space-x-4 space-x-reverse">
            <div 
                className="text-2xl font-extrabold px-4 cursor-pointer transition-colors select-none"
                onClick={() => onNavigate('dashboard')}
                title="الذهاب للرئيسية"
                dir="ltr"
            >
                <span className="text-blue-700">P</span>
                <span className="text-red-700">O</span>
                <span className="text-green-700">S</span>
            </div>
            <nav className="flex items-center space-x-2 space-x-reverse">
                {filteredMenuItems.map(item => (
                    <div key={item.id} className="relative group">
                        {item.subItems ? (
                            <>
                                <button className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center font-extrabold text-lg text-gray-900 dark:text-white shadow-sm">
                                    <span>{item.label}</span>
                                    <ChevronDownIcon className="h-5 w-5 mr-1 font-bold" />
                                </button>
                                <div className="absolute top-full right-0 pt-2 w-72 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
                                    <div className="bg-white dark:bg-gray-800 border-2 border-gray-600 dark:border-gray-500 rounded-lg shadow-xl max-h-[80vh] overflow-y-auto">
                                        <ul className="p-2">
                                            {Object.entries(
                                                (item.subItems as any[]).reduce((groups, subItem) => {
                                                    const group = subItem.group || 'default';
                                                    if (!groups[group]) {
                                                        groups[group] = [];
                                                    }
                                                    groups[group].push(subItem);
                                                    return groups;
                                                }, {} as Record<string, any[]>)
                                            ).map(([groupName, subItemsInGroup]: [string, any[]]) => (
                                                <React.Fragment key={groupName}>
                                                    {groupName !== 'default' && (
                                                        <li className="pt-2 pb-1 px-2 text-base font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none border-t border-gray-300 dark:border-gray-600 first:border-t-0">
                                                            {groupName}
                                                        </li>
                                                    )}
                                                    {subItemsInGroup.map((subItem) => (
                                                        <li key={subItem.id}>
                                                            <button 
                                                                onClick={() => onNavigate(subItem.id)} 
                                                                className={`w-full text-right p-2 rounded-md transition-colors text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${subItem.id === 'settingsActivation' ? 'text-yellow-600 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                                            >
                                                                {subItem.label}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <button onClick={() => onNavigate(item.id)} className="px-5 py-2 bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-extrabold text-lg text-gray-900 dark:text-white shadow-sm">
                                {item.label}
                            </button>
                        )}
                    </div>
                ))}
            </nav>
        </div>

        {/* Left side: User info, theme, logout */}
        <div className="flex items-center space-x-6 space-x-reverse">
            {/* User & View Info Block */}
            <div className="text-right">
                <p className="font-extrabold text-base leading-tight text-gray-900 dark:text-white">{user}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-tight font-bold">{currentViewLabel}</p>
            </div>

            {/* Version Info Block */}
            <div className="text-right">
                <p className="font-extrabold text-base leading-tight text-gray-900 dark:text-white">الاصدار</p>
                {updateAvailable ? (
                    <button 
                        onClick={() => onNavigate('updateManagement')} 
                        className="font-bold text-sm text-red-600 animate-red-pulse leading-tight"
                    >
                        يوجد تحديث
                    </button>
                ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono font-bold leading-tight">v{APP_VERSION}</p>
                )}
            </div>
            
            {/* Cloud Status Indicator */}
            {firebaseConfig && (
                 <div className="flex items-center gap-2" title={isCloudConnected ? 'متصل بالسحابة' : 'غير متصل'}>
                     <span className={`h-3 w-3 rounded-full ${isCloudConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                     <span className={`text-sm font-bold ${isCloudConnected ? 'text-green-600' : 'text-red-600'}`}>{isCloudConnected ? 'متصل' : 'غير متصل'}</span>
                </div>
            )}

            {/* Database Status Indicator */}
             <div className="flex items-center gap-2 border-r-2 border-gray-400 dark:border-gray-600 pr-4 mr-2" title={isDBReady ? 'قاعدة البيانات متصلة' : 'قاعدة البيانات غير متصلة'}>
                 <DatabaseIcon className={`h-6 w-6 ${isDBReady ? 'text-green-600' : 'text-red-600'}`} />
                 <span className={`text-sm font-bold ${isDBReady ? 'text-green-600' : 'text-red-600'}`}>{isDBReady ? 'متصل' : 'غير متصل'}</span>
            </div>

            {/* Theme and Logout Buttons */}
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-2 border-transparent hover:border-gray-400"
                aria-label="Toggle theme"
            >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button
                onClick={onLogout}
                className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all duration-300 border-2 border-red-700"
            >
                تسجيل الخروج
            </button>
        </div>
    </header>
  );
};

export default TopNav;