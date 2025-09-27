const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const url = require('url');
const { spawn } = require('child_process');

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 600,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.removeMenu();

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, 'build', 'index.html'),
        protocol: 'file:',
        slashes: true
    });

    mainWindow.loadURL(startUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
};

const resolveFileUrl = (targetPath) => pathToFileURL(path.resolve(targetPath)).href;

ipcMain.handle('dialog:open', async (event, options = {}) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    return dialog.showOpenDialog(browserWindow ?? null, options);
});

ipcMain.handle('video:load', async (_event, rawVideoPath) => {
    if (!rawVideoPath) {
        return { ok: false, error: 'No video path provided.' };
    }

    const videoPath = path.resolve(rawVideoPath);
    try {
        await fs.promises.access(videoPath);
    } catch {
        return { ok: false, error: 'Selected video not found on disk.' };
    }

    const videoUrl = resolveFileUrl(videoPath);
    const jsonPath = path.join(
        path.dirname(videoPath),
        `${path.basename(videoPath, path.extname(videoPath))}.json`
    );

    let annotations = {};
    try {
        const rawJson = await fs.promises.readFile(jsonPath, 'utf8');
        const parsed = JSON.parse(rawJson);
        annotations = parsed?.frames && typeof parsed.frames === 'object' ? parsed.frames : parsed || {};
    } catch (error) {
        if (error.code && error.code !== 'ENOENT') {
            return { ok: false, error: error.message || 'Failed to load annotations.', videoUrl };
        }
    }

    const hasAnnotations = Object.keys(annotations).length > 0;
    return {
        ok: true,
        videoUrl,
        annotations,
        message: hasAnnotations ? 'Video and annotations loaded.' : 'Video loaded without annotations.'
    };
});

ipcMain.handle('folder:stats', async (_event, rawFolderPath) => {
    if (!rawFolderPath) {
        return { ok: false, error: 'No folder provided.' };
    }

    const folderPath = path.resolve(rawFolderPath);
    try {
        const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
        const counts = entries.reduce(
            (acc, entry) => {
                if (!entry.isFile()) return acc;
                const ext = path.extname(entry.name).toLowerCase();
                if (ext === '.mp4') acc.videos += 1;
                if (ext === '.json') acc.annotations += 1;
                return acc;
            },
            { videos: 0, annotations: 0 }
        );
        return { ok: true, ...counts };
    } catch (error) {
        return { ok: false, error: error.message || 'Unable to read folder.' };
    }
});

ipcMain.handle('ai:run', async (_event, payload = {}) => {
    const {
        inputFolder,
        outputFolder,
        environment,
        pipeline,
        outputType,
        videoMasking,
        redactionLevel
    } = payload;

    if (!inputFolder || !outputFolder) {
        return { ok: false, error: 'Input and output folders are required.' };
    }

    const scriptPath = path.join(app.getAppPath(), 'test.ps1');

    try {
        await fs.promises.access(scriptPath);
    } catch {
        return { ok: false, error: `PowerShell script not found at ${scriptPath}` };
    }

    try {
        const args = [
            '/c',
            'start',
            '""',
            'powershell.exe',
            '-NoExit',
            '-ExecutionPolicy', 'Bypass',
            '-File', scriptPath,
            '-InputFolder', inputFolder,
            '-OutputFolder', outputFolder,
            '-Environment', environment ?? '',
            '-Pipeline', pipeline ?? '',
            '-OutputType', outputType ?? '',
            '-VideoMasking', videoMasking ?? '',
            '-RedactionLevel', redactionLevel ?? ''
        ];

        const child = spawn('cmd.exe', args, {
            windowsHide: true,
            detached: true,
            stdio: 'ignore'
        });

        child.unref();
        return { ok: true };
    } catch (error) {
        return { ok: false, error: error.message || 'Failed to launch PowerShell.' };
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
