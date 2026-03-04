
import { getSystemSetting, setSystemSetting } from './db';

export interface LicenseStatus {
    isActivated: boolean;
    daysRemaining: number;
    isExpired: boolean;
    systemId: string;
}

// Generate a pseudo-random ID for the system if not exists
const generateSystemId = () => {
    return 'SYS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Secret salt for generating keys (Keep this safe!)
const SECRET_SALT = "POS_MASTER_KEY_2024"; 

export const initLicense = async (): Promise<LicenseStatus> => {
    let installDateStr = await getSystemSetting('installDate');
    let systemId = await getSystemSetting('systemId');
    let activationKey = await getSystemSetting('activationKey');

    // 1. Initialize System ID
    if (!systemId) {
        systemId = generateSystemId();
        await setSystemSetting('systemId', systemId);
    }

    // 2. Initialize Install Date
    if (!installDateStr) {
        installDateStr = new Date().toISOString();
        await setSystemSetting('installDate', installDateStr);
    }

    const installDate = new Date(installDateStr);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - installDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const TRIAL_PERIOD = 7; // 7 Days
    const daysRemaining = Math.max(0, TRIAL_PERIOD - diffDays);
    
    // 3. Check Activation
    const expectedKey = generateActivationKey(systemId);
    const isActivated = activationKey === expectedKey;
    
    // IMPORTANT: For developer debugging/generation
    console.log(`[License Debug] SystemID: ${systemId} | Valid Key: ${expectedKey}`);

    return {
        isActivated,
        daysRemaining,
        isExpired: !isActivated && diffDays > TRIAL_PERIOD,
        systemId
    };
};

export const activateLicense = async (inputKey: string): Promise<boolean> => {
    const systemId = await getSystemSetting('systemId');
    if (!systemId) return false;

    const expectedKey = generateActivationKey(systemId);
    
    if (inputKey.trim() === expectedKey) {
        await setSystemSetting('activationKey', inputKey.trim());
        return true;
    }
    return false;
};

// Simple hashing function for key generation
// Algorithm: Reverse SystemID + Salt -> Custom Hash -> Base16
export const generateActivationKey = (sysId: string): string => {
    const raw = sysId.split('').reverse().join('') + SECRET_SALT;
    // Simple custom hash to avoid huge libraries
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex-like string
    return "ACT-" + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
};
