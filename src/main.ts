import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import * as fs from 'fs/promises';

interface FFmpegProgress {
  frames: number;
  currentFps: number;
  currentKbps: number;
  targetSize: number;
  timemark: string;
  percent?: number;
}

// Set the FFmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../index.html'));
  
  // Open DevTools in development
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

async function extractAudio(videoPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = videoPath.replace(/\.[^/.]+$/, '.mp3');
    
    ffmpeg()
      .input(videoPath)
      .toFormat('mp3')
      .audioBitrate('128k')
      .on('error', (err: Error) => {
        console.error('An error occurred:', err);
        reject(err);
      })
      .on('progress', (progress: FFmpegProgress) => {
        if (mainWindow) {
          const percent = progress.percent ? Math.round(progress.percent) : 0;
          mainWindow.webContents.send('processing-status', `Extracting audio... ${percent}%`);
        }
      })
      .on('end', () => {
        console.log('Processing finished successfully');
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

// Handle video import
ipcMain.handle('select-video', async () => {
  if (!mainWindow) return null;
  
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Videos', extensions: ['mp4', 'avi', 'mkv', 'mov'] }
      ]
    });

    if (result.canceled) return null;

    const videoPath = result.filePaths[0];
    mainWindow.webContents.send('processing-status', 'Starting audio extraction...');
    
    try {
      const audioPath = await extractAudio(videoPath);
      mainWindow.webContents.send('processing-status', 'Audio extraction complete');
      return {
        videoPath,
        audioPath
      };
    } catch (error) {
      mainWindow.webContents.send('processing-status', 'Error extracting audio');
      throw error;
    }
  } catch (error) {
    console.error('Error importing video:', error);
    return null;
  }
});

// Handle file stats request
ipcMain.handle('get-file-stats', async (_, filePath: string) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size
    };
  } catch (error) {
    console.error('Error getting file stats:', error);
    throw error;
  }
});
