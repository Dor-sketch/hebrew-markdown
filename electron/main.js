const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentFilePath = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 600,
        minHeight: 400,
        icon: path.join(__dirname, '..', 'images', 'icon.svg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        title: 'Hebrew Markdown',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Build application menu with Hebrew labels
    const menuTemplate = [
        {
            label: 'קובץ',
            submenu: [
                {
                    label: 'פתח קובץ...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => mainWindow.webContents.send('menu-open')
                },
                {
                    label: 'שמור',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow.webContents.send('menu-save')
                },
                {
                    label: 'שמור בשם...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => mainWindow.webContents.send('menu-save-as')
                },
                { type: 'separator' },
                {
                    label: 'יציאה',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'עריכה',
            submenu: [
                { label: 'בטל', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: 'בצע שוב', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
                { type: 'separator' },
                { label: 'גזור', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: 'העתק', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: 'הדבק', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: 'בחר הכל', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
            ]
        },
        {
            label: 'תצוגה',
            submenu: [
                { label: 'הגדל', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
                { label: 'הקטן', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
                { label: 'איפוס זום', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
                { type: 'separator' },
                { label: 'מסך מלא', accelerator: 'F11', role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

// === IPC Handlers for file operations ===

// Open file dialog
ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'פתח קובץ Markdown',
        filters: [
            { name: 'Markdown Files', extensions: ['md', 'markdown', 'mdown', 'mkdn', 'mkd'] },
            { name: 'Text Files', extensions: ['txt', 'text'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { success: false };
    }

    const filePath = result.filePaths[0];
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        currentFilePath = filePath;
        const fileName = path.basename(filePath);
        mainWindow.setTitle(`Hebrew Markdown - ${fileName}`);
        return { success: true, content, fileName, filePath };
    } catch (err) {
        dialog.showErrorBox('שגיאה בפתיחת קובץ', err.message);
        return { success: false, error: err.message };
    }
});

// Save file (to current path or show dialog)
ipcMain.handle('save-file', async (event, content, suggestedName) => {
    if (currentFilePath) {
        try {
            fs.writeFileSync(currentFilePath, content, 'utf-8');
            const fileName = path.basename(currentFilePath);
            return { success: true, fileName, filePath: currentFilePath };
        } catch (err) {
            dialog.showErrorBox('שגיאה בשמירת קובץ', err.message);
            return { success: false, error: err.message };
        }
    }

    // No current path, show Save As dialog
    return await saveFileAs(content, suggestedName);
});

// Save file As (always show dialog)
ipcMain.handle('save-file-as', async (event, content, suggestedName) => {
    return await saveFileAs(content, suggestedName);
});

async function saveFileAs(content, suggestedName) {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'שמור קובץ Markdown',
        defaultPath: suggestedName || 'markdown_document.md',
        filters: [
            { name: 'Markdown Files', extensions: ['md', 'markdown'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return { success: false };
    }

    try {
        fs.writeFileSync(result.filePath, content, 'utf-8');
        currentFilePath = result.filePath;
        const fileName = path.basename(result.filePath);
        mainWindow.setTitle(`Hebrew Markdown - ${fileName}`);
        return { success: true, fileName, filePath: result.filePath };
    } catch (err) {
        dialog.showErrorBox('שגיאה בשמירת קובץ', err.message);
        return { success: false, error: err.message };
    }
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
