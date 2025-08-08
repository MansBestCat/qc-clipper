const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function captureArea({ x = 0, y = 0, width = 640, height = 480, duration = 10, output = 'capture.mp4' }) {
  const outputPath = path.join(__dirname, output);
  console.log('Starting capture to:', outputPath);

  ffmpeg()
    .input(`:0.0+${x},${y}`) // Linux display + offset
    .inputFormat('x11grab')
    .inputOptions([
      `-video_size ${width}x${height}`,
      `-framerate 30`,
      `-draw_mouse 1`,
    ])
    .duration(duration)
    .output(outputPath)
    .on('start', cmd => console.log('FFmpeg started:', cmd))
    .on('end', () => console.log('✅ Capture finished:', outputPath))
    .on('error', err => console.error('❌ FFmpeg error:', err.message))
    .run();
}

module.exports = { captureArea };
