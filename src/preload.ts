import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    selectVideo: () => ipcRenderer.invoke('select-video'),
    getFileStats: (path: string) => ipcRenderer.invoke('get-file-stats', path),
    onProcessingStatus: (callback: (status: string) => void) => {
        ipcRenderer.on('processing-status', (_, status) => callback(status));
        return () => {
            ipcRenderer.removeAllListeners('processing-status');
        };
    }
});

// Type definitions for the exposed API
declare global {
    interface Window {
        electronAPI: {
            selectVideo: () => Promise<{ videoPath: string; audioPath: string; } | null>;
            getFileStats: (path: string) => Promise<{ size: number }>;
            onProcessingStatus: (callback: (status: string) => void) => () => void;
        }
    }
}
