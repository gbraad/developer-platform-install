'use strict';
import { app, ipcMain, BrowserWindow, dialog } from 'electron';
import * as logger from './logging';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

ipcMain.on('crash', function(event, arg) {
  process.crash(arg);
});

// Rebroadcasts installComplete event from Renderer back to Renderer.
// Bit of a hack, but it enables async messaging in UI.
ipcMain.on('installComplete', (event, arg) => {
  event.sender.send('installComplete', arg);
});

ipcMain.on('downloadingComplete', (event, arg) => {
  event.sender.send('downloadingComplete', arg);
});

ipcMain.on('checkComplete', (event, arg) => {
  event.sender.send('checkComplete', arg);
});


// Setup logging listeners
ipcMain.on('install-root', (event, installRoot) => {
  logger.init(installRoot, app.getVersion());
});

ipcMain.on('log', (event, arg) => {
  logger.log(arg);
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});

// Quit when all windows are closed.
app.on('quit', function(event, exitCode) {
  logger.log('INFO: Exit Code = ' + exitCode);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 650,
    'autoHideMenuBar': true,
    resizable: false
  });

  // Some processing is required to make sure local file can be opened in browser
  // windows allows # in names and it should be replaced with ASCII encoding.
  let baseLocation = encodeURI(__dirname.replace(/\\/g, '/')).replace(/#/g, '%23');

  // Load the index.html of the app
  mainWindow.loadURL(`file://${baseLocation}/../browser/index.html`);


  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  mainWindow.on('close', function(e) {
    let opt = {
      type: 'none',
      buttons: ['Yes', 'No'],
      defaultId: 1,
      cancelId: 1,
      message: 'Are you sure you want to close the installer?'
    };
    if (dialog.showMessageBox(mainWindow, opt)) {
      e.preventDefault();
    }
  });
});
