const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const sourceCanvas = document.getElementById('sourceCanvas');
const previewCanvas = document.getElementById('previewCanvas');
const outputCanvas = document.getElementById('outputCanvas');
const beadSize = document.getElementById('beadSize');
const gridWidth = document.getElementById('gridWidth');
const paletteSize = document.getElementById('paletteSize');
const saturation = document.getElementById('saturation');
const contrast = document.getElementById('contrast');
const showGrid = document.getElementById('showGrid');
const preserveEdges = document.getElementById('preserveEdges');
const regenerateBtn = document.getElementById('regenerateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const summaryText = document.getElementById('summaryText');
const scaleChip = document.getElementById('scaleChip');
const colorStats = document.getElementById('colorStats');
const gridWidthValue = document.getElementById('gridWidthValue');
const paletteSizeValue = document.getElementById('paletteSizeValue');
const saturationValue = document.getElementById('saturationValue');
const contrastValue = document.getElementById('contrastValue');

const beads = {
  2: { sizeMm: 2, defaultWidth: 96, spacing: 1 },
  5: { sizeMm: 5, defaultWidth: 48, spacing: 2 },
};

const palette = [
  { id: 'C1', name: '炭黑', hex: '#1f2937' },
  { id: 'C2', name: '雪白', hex: '#f8fafc' },
  { id: 'C3', name: '石灰', hex: '#d1d5db' },
  { id: 'C4', name: '赤红', hex: '#ef4444' },
  { id: 'C5', name: '橘黄', hex: '#f59e0b' },
  { id: 'C6', name: '柠黄', hex: '#eab308' },
  { id: 'C7', name: '草绿', hex: '#22c55e' },
  { id: 'C8', name: '青绿', hex: '#14b8a6' },
  { id: 'C9', name: '湖蓝', hex: '#06b6d4' },
  { id: 'C10', name: '深蓝', hex: '#3b82f6' },
  { id: 'C11', name: '紫罗兰', hex: '#8b5cf6' },
  { id: 'C12', name: '玫紫', hex: '#ec4899' },
  { id: 'C13', name: '棕褐', hex: '#92400e' },
  { id: 'C14', name: '肤粉', hex: '#fbcfe8' },
  { id: 'C15', name: '浅蓝', hex: '#93c5fd' },
  { id: 'C16', name: '浅绿', hex: '#bbf7d0' },
  { id: 'C17', name: '浅橙', hex: '#fed7aa' },
  { id: 'C18', name: '灰蓝', hex: '#64748b' },
  { id: 'C19', name: '深褐', hex: '#78350f' },
  { id: 'C20', name: '米白', hex: '#f5f5dc' },
  { id: 'C21', name: '墨绿', hex: '#14532d' },
  { id: 'C22', name: '暗红', hex: '#991b1b' },
  { id: 'C23', name: '银灰', hex: '#9ca3af' },
  { id: 'C24', name: '嫩黄', hex: '#fef08a' },
];

let imageBitmap = null;
let workingImage = null;
let currentGrid = null;
let colorCount = 0;

const sourceCtx = sourceCanvas.getContext('2d');
const previewCtx = previewCanvas.getContext('2d');
const outputCtx = outputCanvas.getContext('2d');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToLab({ r, g, b }) {
  const srgb = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const x = srgb[0] * 0.4124 + srgb[1] * 0.3576 + srgb[2] * 0.1805;
  const y = srgb[0] * 0.2126 + srgb[1] * 0.7152 + srgb[2] * 0.0722;
  const z = srgb[0] * 0.0193 + srgb[1] * 0.1192 + srgb[2] * 0.9505;
  const xn = x / 0.95047;
  const yn = y / 1.0;
  const zn = z / 1.08883;
  const f = (t) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116);
  return {
    l: 116 * f(yn) - 16,
    a: 500 * (f(xn) - f(yn)),
    b: 200 * (f(yn) - f(zn)),
  };
}

const paletteWithLab = palette.map((item) => ({ ...item, rgb: hexToRgb(item.hex), lab: rgbToLab(hexToRgb(item.hex)) }));

function deltaE(labA, labB) {
  const dl = labA.l - labB.l;
  const da = labA.a - labB.a;
  const db = labA.b - labB.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

function applyTone(value, sat, con) {
  const centered = (value - 128) * con + 128;
  return clamp(128 + (centered - 128) * sat, 0, 255);
}

function buildPalette(size) {
  return paletteWithLab.slice(0, size);
}

function resizeContainCanvas(ctx, source, targetWidth, targetHeight) {
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  const ratio = Math.min(targetWidth / source.width, targetHeight / source.height);
  const drawWidth = source.width * ratio;
  const drawHeight = source.height * ratio;
  const x = (targetWidth - drawWidth) / 2;
  const y = (targetHeight - drawHeight) / 2;
  ctx.drawImage(source, x, y, drawWidth, drawHeight);
}

function drawSourcePreview(image) {
  sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceCtx.fillStyle = '#fff';
  sourceCtx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceCtx.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
}

function updateSliderLabels() {
  gridWidthValue.textContent = `${gridWidth.value} 格`;
  paletteSizeValue.textContent = `${paletteSize.value} 色`;
  saturationValue.textContent = Number(saturation.value).toFixed(2);
  contrastValue.textContent = Number(contrast.value).toFixed(2);
  scaleChip.textContent = `${gridWidth.value} × ${Math.round((gridWidth.value * 1))}`;
}

function sampleImageData(image, cellsWide) {
  const meta = beads[beadSize.value];
  const ratio = image.width / image.height;
  const cellsHigh = Math.max(1, Math.round(cellsWide / ratio));
  const offscreen = document.createElement('canvas');
  offscreen.width = cellsWide;
  offscreen.height = cellsHigh;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  const displayImage = document.createElement('canvas');
  displayImage.width = image.width;
  displayImage.height = image.height;
  const displayCtx = displayImage.getContext('2d');
  displayCtx.drawImage(image, 0, 0);
  ctx.drawImage(displayImage, 0, 0, cellsWide, cellsHigh);
  return { offscreen, cellsWide, cellsHigh, meta };
}

function nearestPaletteColor(rgb, swatches) {
  const lab = rgbToLab(rgb);
  let chosen = swatches[0];
  let best = Infinity;
  for (const swatch of swatches) {
    const score = deltaE(lab, swatch.lab);
    if (score < best) {
      best = score;
      chosen = swatch;
    }
  }
  return chosen;
}

function generateGrid(image, cellsWide) {
  const swatches = buildPalette(Number(paletteSize.value));
  const { offscreen, cellsHigh } = sampleImageData(image, cellsWide);
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, cellsWide, cellsHigh).data;
  const pixels = [];
  const counts = new Map();
  const sat = Number(saturation.value);
  const con = Number(contrast.value);

  for (let y = 0; y < cellsHigh; y += 1) {
    const row = [];
    for (let x = 0; x < cellsWide; x += 1) {
      const index = (y * cellsWide + x) * 4;
      let r = data[index];
      let g = data[index + 1];
      let b = data[index + 2];

      r = applyTone(r, sat, con);
      g = applyTone(g, sat, con);
      b = applyTone(b, sat, con);

      const chosen = nearestPaletteColor({ r, g, b }, swatches);
      const key = chosen.id;
      counts.set(key, (counts.get(key) || 0) + 1);
      row.push(chosen);
    }
    pixels.push(row);
  }

  return { pixels, cellsWide, cellsHigh, counts, swatches };
}

function renderMiniPreview(grid) {
  const { pixels, cellsWide, cellsHigh } = grid;
  const width = previewCanvas.width;
  const height = previewCanvas.height;
  previewCtx.clearRect(0, 0, width, height);
  previewCtx.fillStyle = '#fff';
  previewCtx.fillRect(0, 0, width, height);
  const cell = Math.floor(Math.min(width / cellsWide, height / cellsHigh));
  const offsetX = Math.floor((width - cell * cellsWide) / 2);
  const offsetY = Math.floor((height - cell * cellsHigh) / 2);

  for (let y = 0; y < cellsHigh; y += 1) {
    for (let x = 0; x < cellsWide; x += 1) {
      previewCtx.fillStyle = pixels[y][x].hex;
      previewCtx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
    }
  }
  if (showGrid.checked) {
    previewCtx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    previewCtx.lineWidth = 1;
    for (let x = 0; x <= cellsWide; x += 1) {
      previewCtx.beginPath();
      previewCtx.moveTo(offsetX + x * cell + 0.5, offsetY);
      previewCtx.lineTo(offsetX + x * cell + 0.5, offsetY + cellsHigh * cell);
      previewCtx.stroke();
    }
    for (let y = 0; y <= cellsHigh; y += 1) {
      previewCtx.beginPath();
      previewCtx.moveTo(offsetX, offsetY + y * cell + 0.5);
      previewCtx.lineTo(offsetX + cellsWide * cell, offsetY + y * cell + 0.5);
      previewCtx.stroke();
    }
  }
}

function renderOutput(grid) {
  const { pixels, cellsWide, cellsHigh, counts } = grid;
  const width = outputCanvas.width;
  const height = outputCanvas.height;
  outputCtx.clearRect(0, 0, width, height);
  outputCtx.fillStyle = '#fffdf8';
  outputCtx.fillRect(0, 0, width, height);

  const padding = 72;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2 - 130;
  const cell = Math.floor(Math.min(innerWidth / cellsWide, innerHeight / cellsHigh));
  const drawWidth = cell * cellsWide;
  const drawHeight = cell * cellsHigh;
  const offsetX = Math.floor((width - drawWidth) / 2);
  const offsetY = Math.floor((height - drawHeight) / 2) - 30;

  outputCtx.fillStyle = '#0f172a';
  outputCtx.font = '700 28px Inter, sans-serif';
  outputCtx.fillText('拼豆图纸', padding, 48);
  outputCtx.font = '400 16px Inter, sans-serif';
  outputCtx.fillStyle = '#64748b';
  outputCtx.fillText(`尺寸：${cellsWide} × ${cellsHigh} 格`, padding, 78);

  for (let y = 0; y < cellsHigh; y += 1) {
    for (let x = 0; x < cellsWide; x += 1) {
      outputCtx.fillStyle = pixels[y][x].hex;
      outputCtx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
    }
  }

  if (showGrid.checked) {
    outputCtx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
    outputCtx.lineWidth = 1;
    for (let x = 0; x <= cellsWide; x += 1) {
      outputCtx.beginPath();
      outputCtx.moveTo(offsetX + x * cell + 0.5, offsetY);
      outputCtx.lineTo(offsetX + x * cell + 0.5, offsetY + drawHeight);
      outputCtx.stroke();
    }
    for (let y = 0; y <= cellsHigh; y += 1) {
      outputCtx.beginPath();
      outputCtx.moveTo(offsetX, offsetY + y * cell + 0.5);
      outputCtx.lineTo(offsetX + drawWidth, offsetY + y * cell + 0.5);
      outputCtx.stroke();
    }

    outputCtx.fillStyle = '#334155';
    outputCtx.font = '600 12px Inter, sans-serif';
    for (let x = 0; x < cellsWide; x += 4) {
      outputCtx.fillText(String(x + 1), offsetX + x * cell + 2, offsetY - 8);
    }
    for (let y = 0; y < cellsHigh; y += 4) {
      outputCtx.fillText(String(y + 1), 18, offsetY + y * cell + 12);
    }
  }

  const legendY = offsetY + drawHeight + 52;
  outputCtx.fillStyle = '#0f172a';
  outputCtx.font = '700 18px Inter, sans-serif';
  outputCtx.fillText('颜色统计', padding, legendY);

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const legendRows = sorted.slice(0, 10);
  colorStats.innerHTML = '';
  legendRows.forEach(([id, count]) => {
    const item = paletteWithLab.find((entry) => entry.id === id);
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `<strong><span style="display:inline-block;width:12px;height:12px;border-radius:999px;background:${item.hex};margin-right:6px;vertical-align:middle"></span>${item.id} ${item.name}</strong><span>${count} 颗</span>`;
    colorStats.appendChild(card);
  });

  if (sorted.length > 0) {
    const top = sorted[0];
    const topItem = paletteWithLab.find((entry) => entry.id === top[0]);
    summaryText.textContent = `已生成 ${cellsWide} × ${cellsHigh} 格图纸，主色为 ${topItem.name}，共使用 ${sorted.length} 种拼豆色。`;
  }
}

function setWorkingImage(image) {
  imageBitmap = image;
  workingImage = image;
  drawSourcePreview(image);
  regenerate();
}

function regenerate() {
  if (!workingImage) {
    sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    return;
  }
  updateSliderLabels();
  const grid = generateGrid(workingImage, Number(gridWidth.value));
  currentGrid = grid;
  colorCount = grid.counts.size;
  renderMiniPreview(grid);
  renderOutput(grid);
}

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => setWorkingImage(img);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

fileInput.addEventListener('change', (event) => handleFile(event.target.files?.[0]));

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
  });
});
dropzone.addEventListener('drop', (event) => {
  const file = event.dataTransfer?.files?.[0];
  handleFile(file);
});

[gridWidth, paletteSize, saturation, contrast, beadSize, showGrid, preserveEdges].forEach((control) => {
  control.addEventListener('input', () => {
    updateSliderLabels();
    if (workingImage) regenerate();
  });
});

regenerateBtn.addEventListener('click', regenerate);
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'pebeads-pattern.png';
  link.href = outputCanvas.toDataURL('image/png');
  link.click();
});

updateSliderLabels();
summaryText.textContent = '等待上传图片。';
previewCtx.fillStyle = '#ffffff';
previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
sourceCtx.fillStyle = '#ffffff';
sourceCtx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
outputCtx.fillStyle = '#ffffff';
outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

const demo = document.createElement('canvas');
demo.width = 960;
demo.height = 720;
const demoCtx = demo.getContext('2d');
const gradient = demoCtx.createLinearGradient(0, 0, demo.width, demo.height);
gradient.addColorStop(0, '#ef4444');
gradient.addColorStop(0.3, '#f59e0b');
gradient.addColorStop(0.55, '#22c55e');
gradient.addColorStop(0.82, '#3b82f6');
gradient.addColorStop(1, '#8b5cf6');
demoCtx.fillStyle = gradient;
demoCtx.fillRect(0, 0, demo.width, demo.height);
demoCtx.fillStyle = 'rgba(255,255,255,0.92)';
demoCtx.beginPath();
demoCtx.arc(760, 180, 120, 0, Math.PI * 2);
demoCtx.fill();
demoCtx.fillStyle = '#111827';
demoCtx.font = 'bold 72px sans-serif';
demoCtx.fillText('Pe', 120, 220);
demoCtx.fillText('Web', 120, 300);
const demoImage = new Image();
demoImage.onload = () => setWorkingImage(demoImage);
demoImage.src = demo.toDataURL('image/png');
