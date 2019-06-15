'use strict';

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
const { ipcMain } = require('electron')

let mainWindow = null;

// Exit when all windows are closed
app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });
  mainWindow.loadURL('file://' + __dirname + '/MathQuiz.html');

  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
  
});

ipcMain.on('asynchronous-message', (event, arg) => {
  const { dialog } = require('electron')
  let file = dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] })
  console.log(file)
  console.log(arg) // prints "ping"
  event.reply('asynchronous-reply', file)
})

ipcMain.on('synchronous-message', (event, arg) => {
  const { dialog } = require('electron')
  let file = dialog.showOpenDialog({ properties: ['openFile'] })
  console.log(file)
  console.log(arg) // prints "ping"
  event.returnValue = file;
})
