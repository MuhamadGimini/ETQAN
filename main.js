
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    title: 'نظام POS المتكامل',
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: isDev
    },
    icon: path.join(__dirname, 'build/icon.png')
  });

  // حذف القائمة الافتراضية للديسكتوب
  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); 
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // تأمين فتح الروابط الخارجية (مثل واتساب) في المتصفح الافتراضي
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') || url.startsWith('mailto:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // معالجات الحوار (File Dialogs) لنسخة الديسكتوب
    ipcMain.handle('dialog:openFile', async (event, options) => {
      const { filePaths } = await dialog.showOpenDialog(mainWindow, options);
      if (filePaths && filePaths.length > 0) {
        const filePath = filePaths[0];
        try {
          const encoding = options.readAsBuffer ? null : 'utf8';
          const content = fs.readFileSync(filePath, encoding ? { encoding } : undefined);
          return { content, filePath };
        } catch (err) {
          console.error('Error reading file:', err);
          return null;
        }
      }
      return null;
    });

    ipcMain.handle('dialog:saveFile', async (event, content, options) => {
      const { filePath } = await dialog.showSaveDialog(mainWindow, options);
      if (filePath) {
        try {
          fs.writeFileSync(filePath, content);
          return { success: true, filePath };
        } catch (err) {
          console.error('Error writing file:', err);
          return { success: false, error: err.message };
        }
      }
      return { success: false };
    });

    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
