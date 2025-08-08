const { captureArea } = require('./capture');
const { exec } = require('child_process');
const path = require('path');

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

// Crop logic
window.cropVideo = () => {
  const x = document.getElementById('cropX').value;
  const y = document.getElementById('cropY').value;
  const w = document.getElementById('cropW').value;
  const h = document.getElementById('cropH').value;

  const input = path.join(__dirname, 'input.mp4');
  const output = path.join(__dirname, 'cropped.mp4');

  exec(`ffmpeg -i "${input}" -filter:v "crop=${w}:${h}:${x}:${y}" -c:a copy "${output}"`, (err) => {
    if (err) console.error('Crop failed:', err);
    else console.log('Crop complete');
  });
};