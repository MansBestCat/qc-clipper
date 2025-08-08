const { captureArea } = require('./capture');

window.startCapture = () => {
  captureArea({
    x: 100,
    y: 100,
    width: 800,
    height: 600,
    duration: 5,
    output: 'my-capture.mp4'
  });
};
