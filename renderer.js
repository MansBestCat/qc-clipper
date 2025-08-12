const { captureArea } = require('./capture');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const frameDir = path.join(__dirname, 'frames');
  
const capFile = "input.mp4";
let ffmpegCommand = null;

let videoCapture;
let videoCropped;

let previewInterval = null;
let defaultFPS = 30;
let previewLoop = true;

let frames = [];
let currentFrame = 0;

let undoStack = [];
let redoStack = [];

window.startCapture = () => {
  ffmpegCommand = captureArea({
    x: 0,
    y: 0,
    width: 960,
    height: 1080,
    output: capFile,
    fps: defaultFPS
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

function exportAnimation() {
  const filenameInput = document.getElementById('outputFilename');
  let filename = filenameInput.value.trim();

  if (!filename) {
    alert('Please enter a filename.');
    return;
  }

  if (!filename.endsWith('.webp')) {
    filename += '.webp';
  }

  // Check if file exists (Node.js-style, adjust if browser-only)
  if (fs.existsSync(filename) && !confirm(`"${filename}" already exists. Overwrite?`)) {
    return;
  }

  buildWebpmuxAnimation(filename);
}


window.buildWebpmuxAnimation = (filename) => {
  const outputPath = path.join(__dirname, filename);

  // Build command
  const frameArgs = frames.map(f => {
    return `-frame "${f.file}" +${f.duration}`;
  }).join(' ');

  const cmd = `webpmux ${frameArgs} -loop 0 -o "${outputPath}"`;
  console.log(cmd);

  exec(cmd, (err) => {
    if (err) {
      console.error('❌ webpmux animation failed:', err);
    } else {
      console.log('✅ Animated WebP created:', outputPath);
    }
  });
};

window.extractAndLoadFrames = () => {

  try {
    const files = fs.readdirSync(frameDir);
    for (const file of files) {
      if (file.endsWith('.webp')) {
        fs.unlinkSync(path.join(frameDir, file));
      }
    }
    console.log('🧹 Cleared old frames');
  } catch (err) {
    console.error('❌ Failed to clean frame directory:', err);
    return;
  }

  const cmd = `ffmpeg -y -i cropped.mp4 -vsync 0 -c:v libwebp -compression_level 6 -quality 85 frames/frame_%03d.webp`;
  console.log(cmd);

  exec(cmd, (err) => {
    if (err) console.error('❌ Frame extraction failed:', err);
    else {
      console.log('✅ Frames extracted');
      loadFrames();
    }
  });
};

function loadFrames() {

  frames = fs.readdirSync(frameDir)
    .filter(f => f.endsWith('.webp'))
    .sort()
    .map(f => ({
      file: path.join(frameDir, f),
      duration: 1000 / defaultFPS
    }));

  currentFrame = 0;
  renderFilmstrip();
  showFrame(currentFrame);
}

function showFrame(index) {
  if (frames.length ===0) {
    return;
  }
  const img = document.getElementById('framePreview');
  img.src = frames[index].file;

  // Highlight current frame in filmstrip
  const thumbs = document.querySelectorAll('#filmstrip img');
  thumbs.forEach((thumb, i) => {
    thumb.style.border = i === index ? '4px solid red' : '1px solid #ccc';
  });
}

function handlePointerClick(event, index) {
  if (event.shiftKey) {
    const anchor = frames.findIndex(f => f.selected);
    const [start, end] = [anchor, index].sort((a, b) => a - b);
    frames.forEach((f, i) => f.selected = i >= start && i <= end);
  } else {
    frames.forEach((f, i) => f.selected = i === index);
  }
  currentFrame = index;
  renderFilmstrip();
}

function renderFilmstrip() {
  const strip = document.getElementById('filmstrip');
  strip.innerHTML = ''; // Clear previous

  frames.forEach((frame, i) => {
    const container = document.createElement('div');
    container.style.display = 'inline-block';
    container.style.textAlign = 'center';
    container.style.marginRight = '8px';
    if (frame.selected || i === currentFrame) {
      container.classList.add('selected-frame');
    }
    container.onpointerdown = (e) => handlePointerClick( e, i);

    const thumb = document.createElement('img');
    thumb.src = frame.file;
    thumb.width = 80;
    thumb.style.cursor = 'pointer';
    thumb.style.display = "block";
    thumb.style.border = i === currentFrame ? '4px solid red' : '1px solid #ccc';
    
    thumb.onclick = () => {
      currentFrame = i;
      showFrame(currentFrame);
    };

    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = 1;
    durationInput.value = frame.duration;
    durationInput.style.width = '60px';
    durationInput.style.marginTop = '4px';
    durationInput.onchange = (e) => {
      frames[i].duration = parseInt(e.target.value, 10);
    };

    container.appendChild(thumb);
    container.appendChild(durationInput);
    strip.appendChild(container);
  });
}

window.nextFrame = () => {
  stopPreviewAnimation();
  if (currentFrame < frames.length - 1) {
    currentFrame++;
    showFrame(currentFrame);
  }
};

window.prevFrame = () => {
  stopPreviewAnimation();
  if (currentFrame > 0) {
    currentFrame--;
    showFrame(currentFrame);
  }
};

function pushUndoState() {
  undoStack.push(JSON.parse(JSON.stringify(frames)));
  // Clear redo stack on new action
  redoStack = [];
}

window.delete = () => {
  if (frames.length === 0) return;

  const hasSelection = frames.some(f => f.selected);
  pushUndoState(); // Save current state

  if (hasSelection) {
    frames = frames.filter(f => !f.selected);
    currentFrame = Math.min(currentFrame, frames.length - 1);
  } else {
    frames.splice(currentFrame, 1);
    currentFrame = Math.max(0, currentFrame - 1);
  }
  renderFilmstrip();
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

  document.addEventListener('keydown', (e) => {
    if (
      ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key) ||
      ['Space'].includes(e.code)
    ) {
      e.preventDefault(); // Stop browser from scrolling the page
    }

    if (e.key === 'ArrowRight') {
      window.nextFrame();
    } else if (e.key === 'ArrowLeft') {
      window.prevFrame();
    } else if (e.key === 'Delete') {
      window.delete();
    } else if (e.key === 'Home') {
      currentFrame = 0;
      showFrame(currentFrame);
      renderFilmstrip();
    } else if (e.key === 'End') {
      currentFrame = frames.length - 1;
      showFrame(currentFrame);
      renderFilmstrip();
    } else if (e.code === 'Space' ) {
        window.togglePreviewAnimation();
    } else if (e.ctrlKey && e.key === 'z') {
      window.undo();
    } else if (e.ctrlKey && e.key === 'y') {
      window.redo();
    }
  });

  window.startPreviewAnimation = () => {
    if (previewInterval || frames.length === 0) return;

    previewInterval = setInterval(() => {
      showFrame(currentFrame);
      currentFrame++;
      if (currentFrame >= frames.length) {
        if (previewLoop) currentFrame = 0;
        else stopPreviewAnimation();
      }
    }, 1000 / defaultFPS);
  };

  window.stopPreviewAnimation = () => {
    clearInterval(previewInterval);
    previewInterval = null;
  };

  window.setPreviewSpeed = (fps) => {
    defaultFPS = fps;
    if (previewInterval) restartPreviewAnimation();
  };

  window.togglePreviewLoop = () => {
    previewLoop = !previewLoop;
    console.log(`🔁 Loop is now ${previewLoop ? 'enabled' : 'disabled'}`);
  };

  function stopPreviewAnimation() {
    clearInterval(previewInterval);
    previewInterval = null;
    const btn = document.getElementById('previewToggleBtn');
    if (btn) btn.textContent = '▶️ Play';
  }

  window.togglePreviewAnimation = () => {
    if (previewInterval) {
      stopPreviewAnimation();
      document.getElementById('previewToggleBtn').textContent = '▶️ Play';
    } else {
      startPreviewAnimation();
      document.getElementById('previewToggleBtn').textContent = '⏹️ Stop';
    }
  };

  window.undo = () => {
    if (undoStack.length === 0) return;

    redoStack.push(JSON.parse(JSON.stringify(frames)));
    frames = undoStack.pop();

    currentFrame = Math.min(currentFrame, frames.length - 1);
    renderFilmstrip();
    showFrame(currentFrame);
  };

  window.redo = () => {
    if (redoStack.length === 0) return;

    undoStack.push(JSON.parse(JSON.stringify(frames)));
    frames = redoStack.pop();

    currentFrame = Math.min(currentFrame, frames.length - 1);
    renderFilmstrip();
    showFrame(currentFrame);
  };

};
