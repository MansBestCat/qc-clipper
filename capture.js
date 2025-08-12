const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function captureArea({ x , y , width , height, output, fps }) {
  const outputPath = path.join(__dirname, output);
  console.log('Starting capture to:', outputPath);

  const command = ffmpeg()
    .input(`:0.0+${x},${y}`)
    .inputFormat('x11grab')
    .inputOptions([
      `-video_size ${width}x${height}`,
      `-framerate ${fps}`,
      `-draw_mouse 1`,
    ])
    .output(outputPath)
    .on('start', cmd => console.log('FFmpeg started:', cmd))
    .on('end', () => console.log('✅ Capture finished:', outputPath))
    .on('error', err => {
      if (err.message.includes('signal 2')) { 
        console.log('🛑 FFmpeg stopped manually.');
      } else {
        console.error('❌ FFmpeg error:', err.message);
      }
    });

  command.run();
  return command;
}


module.exports = { captureArea };
