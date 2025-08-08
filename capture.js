const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function captureArea({ x, y, width, height, duration = 10, 
    output = 'capture.mp4' }) {
  const command = ffmpeg()
    .input('desktop') // Windows only; use `x11grab` or `avfoundation` for Linux/macOS
    .inputFormat('gdigrab') // Windows-specific
    .inputOptions([
      `-offset_x ${x}`,
      `-offset_y ${y}`,
      `-video_size ${width}x${height}`,
      `-framerate 30`,
    ])
    .duration(duration)
    .output(path.join(__dirname, output))
    .on('start', cmd => console.log('FFmpeg started:', cmd))
    .on('end', () => console.log('Capture finished'))
    .on('error', err => console.error('FFmpeg error:', err))
    .run();
}

module.exports = { captureArea };
