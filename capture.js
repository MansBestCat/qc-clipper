const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function captureArea({ x, y, width, height, output, fps }) {
  const outputPath = path.join(__dirname, output);
  console.log('Starting capture to:', outputPath);

  // Example: Full screen 1920x1080, 30fps, prioritizing smoothness
  const command = ffmpeg()
    .input(':0.0')  // Full screen
    .inputFormat('x11grab')
    .inputOptions([
      '-video_size 1920x1080',
      '-framerate 30',
      '-thread_queue_size 512',  // Key: prevent frame dropping
      '-draw_mouse 1'
    ])
    .output(outputPath)
    .outputOptions([
      '-preset ultrafast',  // Fast encoding
      '-crf 23'             // Balance quality and size
    ])
    .on('error', err => {
      if (err.message.includes('signal 2') || err.message.includes('SIGINT')) {
        console.log('🛑 FFmpeg stopped manually.');
      } else {
        console.error('❌ FFmpeg error:', err.message);
      }
    })
    .on('end', () => console.log('✅ Capture finished:', outputPath));

  command.run();
  return command;
}


module.exports = { captureArea };
