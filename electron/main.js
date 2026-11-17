const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const editorPath = path.join(__dirname, '..', 'index.electron.html');
const editorUrl = pathToFileURL(editorPath).href;
const maxFileBytes = 10 * 1024 * 1024;

let mainWindow;
let currentFilePath = null;

function isEditorUrl(value) {
    try {
        const url = new URL(value);
        url.hash = '';
        return url.href === editorUrl;
    } catch {
        return false;
    }
}

function openWebLink(value) {
    try {
        const url = new URL(value);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
            shell.openExternal(url.href).catch(console.error);
        }
    } catch {
        // Malformed links have no external destination.
    }
}

function restrictNavigation(contents, allowPrint = false) {
    contents.on('will-frame-navigate', event => {
        event.preventDefault();
        if (event.isMainFrame) openWebLink(event.url);
    });
    contents.on('will-redirect', event => event.preventDefault());
    contents.setWindowOpenHandler(({ url, frameName }) => {
        if (allowPrint && isEditorUrl(contents.getURL()) && url === 'about:blank' && frameName === 'markdown-print') {
            return { action: 'allow' };
        }
        openWebLink(url);
        return { action: 'deny' };
    });
    contents.on('did-create-window', child => restrictNavigation(child.webContents));
}

function fromEditor(event) {
    const contents = mainWindow?.webContents;
    const frame = event.senderFrame;
    return Boolean(contents && frame && event.sender === contents &&
        frame === contents.mainFrame && isEditorUrl(frame.url));
}

function validContent(content) {
    return typeof content === 'string' && Buffer.byteLength(content, 'utf8') <= maxFileBytes;
}

function safeFilename(name) {
    if (typeof name !== 'string' || name.length > 255) return 'markdown_document.md';
    const filename = path.win32.basename(name);
    return filename && filename !== '.' && filename !== '..' && !/[\x00-\x1f]/.test(filename)
        ? filename : 'markdown_document.md';
}

async function readDocument(filePath) {
    const handle = await fs.promises.open(filePath, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
    try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > maxFileBytes) throw new Error('Only regular files up to 10 MiB can be opened.');
        const chunks = [];
        for await (const chunk of handle.createReadStream({ end: maxFileBytes, autoClose: false })) {
            chunks.push(chunk);
        }
        const contents = Buffer.concat(chunks);
        if (contents.length > maxFileBytes) throw new Error('Only files up to 10 MiB can be opened.');
        return contents.toString('utf8');
    } finally {
        await handle.close();
    }
}

function createWindow() {
    currentFilePath = null;
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 600,
        minHeight: 400,
        icon: path.join(__dirname, '..', 'images', 'icon.svg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        },
        title: 'Hebrew Markdown',
        show: false
    });

    const contents = mainWindow.webContents;
    restrictNavigation(contents, true);
    contents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    contents.session.setPermissionCheckHandler(() => false);
    contents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => {
        callback({ cancel: true });
    });
    mainWindow.loadFile(editorPath);

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
ipcMain.handle('open-file', async event => {
    if (!fromEditor(event)) return { success: false };
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
        const content = await readDocument(filePath);
        currentFilePath = filePath;
        const fileName = path.basename(filePath);
        mainWindow.setTitle(`Hebrew Markdown - ${fileName}`);
        return { success: true, content, fileName };
    } catch (err) {
        dialog.showErrorBox('שגיאה בפתיחת קובץ', err.message);
        return { success: false, error: err.message };
    }
});

// Save file (to current path or show dialog)
ipcMain.handle('save-file', async (event, content, suggestedName) => {
    if (!fromEditor(event) || !validContent(content)) return { success: false };
    const filePath = currentFilePath;
    if (filePath) {
        try {
            fs.writeFileSync(filePath, content, 'utf8');
            return { success: true, fileName: path.basename(filePath) };
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
    if (!fromEditor(event) || !validContent(content)) return { success: false };
    return await saveFileAs(content, suggestedName);
});

async function saveFileAs(content, suggestedName) {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'שמור קובץ Markdown',
        defaultPath: safeFilename(suggestedName),
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
        fs.writeFileSync(result.filePath, content, 'utf8');
        currentFilePath = result.filePath;
        const fileName = path.basename(result.filePath);
        mainWindow.setTitle(`Hebrew Markdown - ${fileName}`);
        return { success: true, fileName };
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
