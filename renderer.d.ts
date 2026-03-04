export interface IElectronAPI {
  // FIX: Replaced Buffer with Uint8Array as Buffer is a Node.js type and not available in this context.
  openFile: (options: any) => Promise<{ content: string | Uint8Array; filePath: string } | null>;
  // FIX: Replaced Buffer with Uint8Array as Buffer is a Node.js type and not available in this context.
  saveFile: (content: string | Uint8Array, options: any) => Promise<{ success: boolean; filePath: string | undefined }>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}