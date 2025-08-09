const { captureArea } = require('./capture');
const { exec } = require('child_process');
const path = require('path');

const capFile = "input.mp4";
let ffmpegCommand = null;

window.startCapture = () => {
  ffmpegCommand = captureArea({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    output: capFile,
    manual: true
  });
};

window.stopCapture = () => {
 if (ffmpegCommand) {
    ffmpegCommand.kill('SIGINT'); // sends Ctrl+C to FFmpeg
    console.log('Capture stopped');
  }
  // Wait a moment for FFmpeg to finish writing the file
  setTimeout(() => {
    const video = document.getElementById('videoPreview');
    video.src = 'input.mp4';
    video.load();
  }, 2000);
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
    if (err) {
      console.error('Crop failed:', err);
    } else {
      console.log('Crop complete');
      const video = document.getElementById('videoPreview');
      video.src = 'cropped.mp4';
      video.load();
    }
    
  });

};


window.exportToWebP = () => {
  const input = path.join(__dirname, 'cropped.mp4');
  const output = path.join(__dirname, 'output.webp');

  const cmd = `ffmpeg -i "${input}" -vcodec libwebp -loop 0 -preset default -an -vsync 0 "${output}"`;

  exec(cmd, (err) => {
    if (err) {
      console.error('❌ WebP export failed:', err);
    } else {
      console.log('✅ WebP export complete:', output);
      // Optionally preview it
      const img = document.createElement('img');
      img.src = 'output.webp';
      document.body.appendChild(img);
    }
  });
};

window.extractFrames = () => {
  const cmd = `ffmpeg -i cropped.mp4 frames/frame_%03d.png`;
  exec(cmd, (err) => {
    if (err) console.error('❌ Frame extraction failed:', err);
    else {
      console.log('✅ Frames extracted');
      loadFrames();
    }
  });
};
let frames = [];
let currentFrame = 0;

function loadFrames() {
  const fs = require('fs');
  const path = require('path');
  const frameDir = path.join(__dirname, 'frames');

  frames = fs.readdirSync(frameDir)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(frameDir, f));

  currentFrame = 0;
  showFrame(currentFrame);
}

function showFrame(index) {
  const img = document.getElementById('framePreview');
  img.src = frames[index];
}

window.nextFrame = () => {
  if (currentFrame < frames.length - 1) {
    currentFrame++;
    showFrame(currentFrame);
  }
};

window.prevFrame = () => {
  if (currentFrame > 0) {
    currentFrame--;
    showFrame(currentFrame);
  }
};

window.deleteFrame = () => {
  const fs = require('fs');
  fs.unlinkSync(frames[currentFrame]);
  frames.splice(currentFrame, 1);
  if (currentFrame >= frames.length) currentFrame = frames.length - 1;
  showFrame(currentFrame);
};

