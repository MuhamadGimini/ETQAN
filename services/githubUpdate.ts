export interface UpdateInfo {
    hasUpdate: boolean;
    latestVersion: string;
    downloadUrl: string;
    releaseNotes: string;
}

export const checkGitHubUpdate = async (repo: string, currentVersion: string): Promise<UpdateInfo> => {
    try {
        if (!repo || !repo.includes('/')) {
            throw new Error('Invalid repository format. Use "owner/repo".');
        }

        const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
        
        if (!response.ok) {
            return {
                hasUpdate: false,
                latestVersion: '',
                downloadUrl: '',
                releaseNotes: ''
            };
        }

        const data = await response.json();
        const latestVersion = data.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
        
        // Simple version comparison (semver-ish)
        const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
        
        // Find asset download URL (e.g., .exe or .zip)
        // Prefer .exe for Windows, .AppImage for Linux, .dmg for Mac, or source zip
        // For now, just take the html_url of the release page as a fallback
        let downloadUrl = data.html_url;
        
        if (data.assets && data.assets.length > 0) {
            // Try to find an executable or installer
            const installer = data.assets.find((a: any) => 
                a.name.endsWith('.exe') || 
                a.name.endsWith('.dmg') || 
                a.name.endsWith('.AppImage') ||
                a.name.endsWith('.zip')
            );
            if (installer) {
                downloadUrl = installer.browser_download_url;
            }
        }

        return {
            hasUpdate,
            latestVersion,
            downloadUrl,
            releaseNotes: data.body || ''
        };

    } catch (error) {
        // Silently fail if update check fails
        return {
            hasUpdate: false,
            latestVersion: '',
            downloadUrl: '',
            releaseNotes: ''
        };
    }
};

// Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
};
