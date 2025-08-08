const { ipcRenderer } = require('electron');
const { captureArea } = require('./capture');

window.startCapture = () => {
  captureArea({ x: 100, y: 100, width: 640, height: 480, duration: 5 });
};
