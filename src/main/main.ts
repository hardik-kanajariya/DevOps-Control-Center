import { app, BrowserWindow, Menu } from 'electron';
import { join } from 'path';
import { isDev } from './utils/env';
import { registerIPCHandlers } from './ipc/handlers';
import { initializeServices } from './services';

const createWindow = (): void => {
    // Create the browser window
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        show: false,
        autoHideMenuBar: true,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, 'preload.js'),
            webSecurity: true,
        },
    });

    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:5175');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Filter out harmless DevTools console warnings
    mainWindow.webContents.on('console-message', (_, level, message) => {
        // Suppress known harmless DevTools autofill warnings
        if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
            return;
        }
        // Log other console messages normally
        console.log(`[Renderer Console ${level}]:`, message);
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        // Dereference the window object
    });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
    // Initialize services
    await initializeServices();

    // Register IPC handlers
    registerIPCHandlers();

    // Create window
    createWindow();

    // Set application menu
    if (process.platform === 'darwin') {
        const template: Electron.MenuItemConstructorOptions[] = [
            {
                label: app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectAll' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'close' }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    } else {
        Menu.setApplicationMenu(null);
    }

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Security: Prevent new window creation and navigation
app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });

    contents.on('will-navigate', (navigationEvent, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        if (parsedUrl.origin !== 'http://localhost:5175' && !navigationUrl.startsWith('file://')) {
            navigationEvent.preventDefault();
        }
    });
});
