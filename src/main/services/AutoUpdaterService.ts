import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { EventEmitter } from 'events';

export class AutoUpdaterService extends EventEmitter {
    private mainWindow: BrowserWindow | null = null;
    private updateDownloaded = false;
    private updateAvailable = false;

    constructor() {
        super();
        this.setupAutoUpdater();
        this.registerIpcHandlers();
    }

    setMainWindow(window: BrowserWindow): void {
        this.mainWindow = window;
    }

    private setupAutoUpdater(): void {
        // Configure auto-updater
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        // Set update feed URL based on environment
        if (process.env.NODE_ENV === 'production') {
            autoUpdater.setFeedURL({
                provider: 'github',
                owner: 'hardikkanajariya',
                repo: 'DevOps-Control-Center',
                private: false
            });
        }

        // Auto-updater events
        autoUpdater.on('checking-for-update', () => {
            console.log('Checking for updates...');
            this.sendToRenderer('update-checking');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('Update available:', info);
            this.updateAvailable = true;
            this.sendToRenderer('update-available', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseName: info.releaseName,
                releaseNotes: info.releaseNotes
            });
        });

        autoUpdater.on('update-not-available', (info) => {
            console.log('Update not available:', info);
            this.sendToRenderer('update-not-available', {
                version: info.version
            });
        });

        autoUpdater.on('download-progress', (progress) => {
            console.log(`Download progress: ${progress.percent}%`);
            this.sendToRenderer('update-download-progress', {
                percent: progress.percent,
                bytesPerSecond: progress.bytesPerSecond,
                total: progress.total,
                transferred: progress.transferred
            });
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log('Update downloaded:', info);
            this.updateDownloaded = true;
            this.sendToRenderer('update-downloaded', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseName: info.releaseName
            });

            // Show dialog to restart and install
            this.showUpdateDownloadedDialog();
        });

        autoUpdater.on('error', (error) => {
            console.error('Auto-updater error:', error);
            this.sendToRenderer('update-error', {
                message: error.message,
                stack: error.stack
            });
        });
    }

    private registerIpcHandlers(): void {
        ipcMain.handle('updater:check-for-updates', async () => {
            try {
                const result = await autoUpdater.checkForUpdates();
                return {
                    success: true,
                    data: result
                };
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        ipcMain.handle('updater:download-update', async () => {
            try {
                if (this.updateAvailable) {
                    await autoUpdater.downloadUpdate();
                    return { success: true };
                } else {
                    return {
                        success: false,
                        error: 'No update available'
                    };
                }
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        ipcMain.handle('updater:install-update', async () => {
            try {
                if (this.updateDownloaded) {
                    autoUpdater.quitAndInstall();
                    return { success: true };
                } else {
                    return {
                        success: false,
                        error: 'No update downloaded'
                    };
                }
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        ipcMain.handle('updater:get-current-version', () => {
            return {
                success: true,
                data: {
                    version: autoUpdater.currentVersion?.version || require('../../package.json').version,
                    isProduction: process.env.NODE_ENV === 'production'
                }
            };
        });
    }

    private sendToRenderer(channel: string, data?: any): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(`updater:${channel}`, data);
        }
    }

    private async showUpdateDownloadedDialog(): Promise<void> {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        const result = await dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Update Downloaded',
            message: 'A new version has been downloaded and is ready to install.',
            detail: 'The application will restart to apply the update. Do you want to restart now?',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1
        });

        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    }

    // Public methods
    async checkForUpdates(): Promise<void> {
        if (process.env.NODE_ENV === 'production') {
            await autoUpdater.checkForUpdates();
        } else {
            console.log('Auto-updater disabled in development mode');
        }
    }

    async downloadUpdate(): Promise<void> {
        if (this.updateAvailable) {
            await autoUpdater.downloadUpdate();
        }
    }

    installUpdate(): void {
        if (this.updateDownloaded) {
            autoUpdater.quitAndInstall();
        }
    }

    getCurrentVersion(): string {
        return autoUpdater.currentVersion?.version || require('../../package.json').version;
    }

    isUpdateAvailable(): boolean {
        return this.updateAvailable;
    }

    isUpdateDownloaded(): boolean {
        return this.updateDownloaded;
    }
}
