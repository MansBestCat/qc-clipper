const { captureArea } = require('./capture');
const { exec } = require('child_process');
const path = require('path');

const capFile = "input.mp4";
let ffmpegCommand = null;

let videoCapture;
let videoCropped;

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
    videoCapture.src = 'input.mp4';
    videoCapture.load();
  }, 2000);
};

window.cropVideo = () => {
  const rect = cropOverlay.getBoundingClientRect();
  const videoCaptureRect = videoCapture.getBoundingClientRect();
  const x = Math.round(rect.left - videoCaptureRect.left);
  const y = Math.round(rect.top - videoCaptureRect.top);
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);

  const input = path.join(__dirname, 'input.mp4');
  const output = path.join(__dirname, 'cropped.mp4');

  const cmd = `ffmpeg -y -i "${input}" -filter:v "crop=${w}:${h}:${x}:${y}" -c:a copy "${output}"`;
  console.log(cmd);

  exec(cmd, (err) => {
    if (err) {
      console.error('Crop failed:', err);
    } else {
      console.log('Crop complete');
      videoCropped.src = 'cropped.mp4';
      videoCropped.load();
    }

  });

};


window.exportToWebP = () => {
  const frameDir = path.join(__dirname, 'frames');
  const outputPath = path.join(__dirname, 'output.webp');

  // Build FFmpeg command
  const cmd = `ffmpeg -y -framerate 30 -i "${frameDir}/frame_%03d.png" -vcodec libwebp -loop 0 -preset default -an -vsync 0 "${outputPath}"`;
  console.log(cmd);

  exec(cmd, (err) => {
    if (err) {
      console.error('❌ WebP export failed:', err);
    } else {
      console.log('✅ WebP export complete:', outputPath);

      // Optional: show preview
      const img = document.createElement('img');
      img.src = 'output.webp';
      img.width = 640;
      document.body.appendChild(img);
    }
  });
};

window.extractFrames = () => {
  const cmd = `ffmpeg -y -i cropped.mp4 frames/frame_%03d.png`;
  console.log(cmd);

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

window.onload = () => {

  videoCapture = document.getElementById('videoCapture');
  videoCropped = document.getElementById('videoCropped');

  videoCapture.addEventListener('loadedmetadata', () =>  {
    const width = videoCapture.videoWidth;
    const height = videoCapture.videoHeight;

    videoCapture.width = width;
    videoCapture.height = height;

    const videoContainer = document.getElementById('videoCaptureContainer');
    videoContainer.style.width = `${width}px`;
    videoContainer.style.height = `${height}px`;

    console.log(`Captured video dimensions: ${width}x${height}`);
  });

  videoCropped.addEventListener('loadedmetadata', () =>  {
    const width = videoCropped.videoWidth;
    const height = videoCropped.videoHeight;

    videoCropped.width = width;
    videoCropped.height = height;

    const framePreview = document.getElementById('framePreview');
    framePreview.width = width;

    const videoContainer = document.getElementById('videoCroppedContainer');
    videoContainer.style.width = `${width}px`;
    videoContainer.style.height = `${height}px`;

    console.log(`Cropped video dimensions: ${width}x${height}`);
  });

  // Crop overlay interaction logic
  const cropOverlay = document.getElementById('cropOverlay');
  const videoContainer = document.getElementById('videoCaptureContainer');
  let startX, startY, isDrawing = false;

  videoContainer.addEventListener('mousedown', (e) => {
    isDrawing = true;
    startX = e.offsetX;
    startY = e.offsetY;

    cropOverlay.style.left = `${startX}px`;
    cropOverlay.style.top = `${startY}px`;
    cropOverlay.style.width = '0px';
    cropOverlay.style.height = '0px';
    cropOverlay.style.display = 'block';
  });

  videoContainer.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const currentX = e.offsetX;
    const currentY = e.offsetY;

    const rectX = Math.min(startX, currentX);
    const rectY = Math.min(startY, currentY);
    const rectW = Math.abs(currentX - startX);
    const rectH = Math.abs(currentY - startY);

    cropOverlay.style.left = `${rectX}px`;
    cropOverlay.style.top = `${rectY}px`;
    cropOverlay.style.width = `${rectW}px`;
    cropOverlay.style.height = `${rectH}px`;
  });

  videoContainer.addEventListener('mouseup', () => {
    isDrawing = false;
  });
};
