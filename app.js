const accessGate = document.getElementById('accessGate');
const accessForm = document.getElementById('accessForm');
const accessInput = document.getElementById('accessInput');
const accessFeedback = document.getElementById('accessFeedback');
const appShell = document.getElementById('appShell');
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
const showCodes = document.getElementById('showCodes');
const mirrorPattern = document.getElementById('mirrorPattern');
const preserveEdges = document.getElementById('preserveEdges');
const colorSourceSelect = document.getElementById('colorSourceSelect');
const colorTargetSelect = document.getElementById('colorTargetSelect');
const applyColorSwapBtn = document.getElementById('applyColorSwap');
const resetColorSwapBtn = document.getElementById('resetColorSwap');
const overrideBadges = document.getElementById('overrideBadges');
const regenerateBtn = document.getElementById('regenerateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const summaryText = document.getElementById('summaryText');
const scaleChip = document.getElementById('scaleChip');
const colorStats = document.getElementById('colorStats');
const gridWidthValue = document.getElementById('gridWidthValue');
const paletteSizeValue = document.getElementById('paletteSizeValue');
const saturationValue = document.getElementById('saturationValue');
const contrastValue = document.getElementById('contrastValue');

const STORAGE_KEY = 'peweb-access-token';
const overridesStorageKey = 'peweb-color-overrides';
const state = {
  passwordHash: null,
  bootstrapped: false,
  overrides: new Map(),
};

const beads = {
  2: { sizeMm: 2, defaultWidth: 120 },
  5: { sizeMm: 5, defaultWidth: 72 },
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
  { id: 'C25', name: '深紫', hex: '#6b21a8' },
  { id: 'C26', name: '森林绿', hex: '#166534' },
  { id: 'C27', name: '薄荷绿', hex: '#86efac' },
  { id: 'C28', name: '珊瑚粉', hex: '#fb7185' },
  { id: 'C29', name: '天光蓝', hex: '#0ea5e9' },
  { id: 'C30', name: '深咖', hex: '#4b2e2a' },
  { id: 'C31', name: '亮紫', hex: '#a855f7' },
  { id: 'C32', name: '晨雾', hex: '#cbd5f5' },
];

const paletteMap = new Map(
  palette.map((entry) => [entry.id, { ...entry, rgb: hexToRgb(entry.hex), lab: rgbToLab(hexToRgb(entry.hex)) }])
);

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
  return palette.slice(0, size).map((item) => paletteMap.get(item.id));
}

function getContrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#1f2937' : '#f8fafc';
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sharpenRgb(rgb, amount) {
  return {
    r: clamp(Math.round(rgb.r + (rgb.r - 128) * amount), 0, 255),
    g: clamp(Math.round(rgb.g + (rgb.g - 128) * amount), 0, 255),
    b: clamp(Math.round(rgb.b + (rgb.b - 128) * amount), 0, 255),
  };
}

function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function setCanvasResolution(cellsWide, cellsHigh) {
  const baseCell = 38;
  const width = Math.max(2200, cellsWide * baseCell + 400);
  const height = Math.max(2600, cellsHigh * baseCell + 720);
  outputCanvas.width = width;
  outputCanvas.height = height;
}

function populateColorSelectors() {
  const fragmentSource = document.createDocumentFragment();
  const fragmentTarget = document.createDocumentFragment();
  palette.forEach((item) => {
    const optionSource = document.createElement('option');
    optionSource.value = item.id;
    optionSource.textContent = `${item.id} · ${item.name}`;
    fragmentSource.appendChild(optionSource);

    const optionTarget = document.createElement('option');
    optionTarget.value = item.id;
    optionTarget.textContent = `${item.id} · ${item.name}`;
    fragmentTarget.appendChild(optionTarget);
  });
  colorSourceSelect.innerHTML = '<option value="">选择原色号</option>';
  colorTargetSelect.innerHTML = '<option value="">替换为色号</option>';
  colorSourceSelect.appendChild(fragmentSource);
  colorTargetSelect.appendChild(fragmentTarget);
}

function loadStoredOverrides() {
  try {
    const stored = localStorage.getItem(overridesStorageKey);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return;
    parsed.forEach(([sourceId, targetId]) => {
      if (paletteMap.has(sourceId) && paletteMap.has(targetId)) {
        state.overrides.set(sourceId, paletteMap.get(targetId));
      }
    });
  } catch (error) {
    console.warn('Failed to load overrides', error);
  }
}

function persistOverrides() {
  const pairs = Array.from(state.overrides.entries()).map(([sourceId, target]) => [sourceId, target.id]);
  localStorage.setItem(overridesStorageKey, JSON.stringify(pairs));
}

function renderOverrideBadges(grid) {
  overrideBadges.innerHTML = '';
  if (state.overrides.size === 0) return;
  const fragment = document.createDocumentFragment();
  state.overrides.forEach((target, sourceId) => {
    const sourceEntry = paletteMap.get(sourceId);
    if (!sourceEntry || !target) return;
    const count = grid?.originalCounts?.get(sourceId) ?? 0;
    const badge = document.createElement('span');
    badge.className = 'override-badge';
    badge.dataset.source = sourceId;
    badge.innerHTML = `
      <span class="override-badge__swatch" style="background:${target.hex}"></span>
      <strong>${sourceId} → ${target.id}</strong>
      <span>${target.name}</span>
      <span>${count} 格</span>
      <button type="button" aria-label="移除替换">×</button>
    `;
    fragment.appendChild(badge);
  });
  overrideBadges.appendChild(fragment);
}

function resizeContainCanvas(ctx, image, targetWidth, targetHeight) {
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  const ratio = Math.min(targetWidth / image.width, targetHeight / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function drawSourcePreview(image) {
  sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceCtx.fillStyle = '#fff';
  sourceCtx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  resizeContainCanvas(sourceCtx, image, sourceCanvas.width, sourceCanvas.height);
}

function updateSliderLabels() {
  gridWidthValue.textContent = `${gridWidth.value} 格`;
  paletteSizeValue.textContent = `${paletteSize.value} 色`;
  saturationValue.textContent = Number(saturation.value).toFixed(2);
  contrastValue.textContent = Number(contrast.value).toFixed(2);
}

function sampleImageData(image, cellsWide) {
  const ratio = image.width / image.height;
  const cellsHigh = Math.max(1, Math.round(cellsWide / ratio));
  const analysisScale = 8;
  const offscreen = document.createElement('canvas');
  offscreen.width = cellsWide * analysisScale;
  offscreen.height = cellsHigh * analysisScale;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, offscreen.width, offscreen.height);
  return { offscreen, cellsWide, cellsHigh, analysisScale };
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
  const ratio = image.width / image.height;
  const cellsHigh = Math.max(1, Math.round(cellsWide / ratio));
  const offscreen = document.createElement('canvas');
  offscreen.width = cellsWide;
  offscreen.height = cellsHigh;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, 0, 0, cellsWide, cellsHigh);

  const imageData = ctx.getImageData(0, 0, cellsWide, cellsHigh).data;
  const pixels = Array.from({ length: cellsHigh }, () => new Array(cellsWide));
  const counts = new Map();
  const originalCounts = new Map();
  const sat = Number(saturation.value);
  const contrastBoost = Number(contrast.value) * (preserveEdges.checked ? 1.15 : 1);

  for (let y = 0; y < cellsHigh; y += 1) {
    for (let x = 0; x < cellsWide; x += 1) {
      const index = (y * cellsWide + x) * 4;
      let r = imageData[index];
      let g = imageData[index + 1];
      let b = imageData[index + 2];

      r = applyTone(r, sat, contrastBoost);
      g = applyTone(g, sat, contrastBoost);
      b = applyTone(b, sat, contrastBoost);

      const chosen = nearestPaletteColor({ r, g, b }, swatches);
      originalCounts.set(chosen.id, (originalCounts.get(chosen.id) || 0) + 1);

      const overrideTarget = state.overrides.get(chosen.id);
      const effective = overrideTarget ?? chosen;
      pixels[y][x] = effective;
      counts.set(effective.id, (counts.get(effective.id) || 0) + 1);
    }
  }

  return { pixels, cellsWide, cellsHigh, counts, originalCounts };
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
  const fontSize = Math.max(10, Math.floor(cell * 0.4));
  previewCtx.font = `${fontSize}px "Inter", sans-serif`;
  previewCtx.textAlign = 'center';
  previewCtx.textBaseline = 'middle';

  for (let y = 0; y < cellsHigh; y += 1) {
    for (let x = 0; x < cellsWide; x += 1) {
      const color = pixels[y][x];
      previewCtx.fillStyle = color.hex;
      previewCtx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
      if (showCodes.checked && cell >= 12) {
        previewCtx.fillStyle = getContrastColor(color.hex);
        previewCtx.fillText(color.id, offsetX + x * cell + cell / 2, offsetY + y * cell + cell / 2);
      }
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

function renderLegend(grid) {
  colorStats.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const total = Array.from(grid.counts.values()).reduce((acc, value) => acc + value, 0) || 1;
  const entries = [...grid.counts.entries()].sort((a, b) => b[1] - a[1]);
  entries.forEach(([id, count]) => {
    const entry = paletteMap.get(id);
    if (!entry) return;
    const card = document.createElement('div');
    card.className = 'stat-card';
    const ratio = ((count / total) * 100).toFixed(1);
    card.innerHTML = `
      <strong>
        <span class="swatch" style="background:${entry.hex}"></span>
        ${entry.id} · ${entry.name}
      </strong>
      <span>${count} 颗（${ratio}%）</span>
      <em>${entry.hex.toUpperCase()}</em>
    `;
    fragment.appendChild(card);
  });
  colorStats.appendChild(fragment);
}

function renderOutput(grid) {
  const { pixels, cellsWide, cellsHigh, counts } = grid;
  setCanvasResolution(cellsWide, cellsHigh);
  const width = outputCanvas.width;
  const height = outputCanvas.height;
  outputCtx.clearRect(0, 0, width, height);
  outputCtx.fillStyle = '#fffdf8';
  outputCtx.fillRect(0, 0, width, height);

  const paddingX = 180;
  const paddingTop = 150;
  const paddingBottom = 560;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;
  const cell = Math.max(10, Math.floor(Math.min(innerWidth / cellsWide, innerHeight / cellsHigh)));
  const drawWidth = cell * cellsWide;
  const drawHeight = cell * cellsHigh;
  const offsetX = Math.floor((width - drawWidth) / 2);
  const offsetY = paddingTop;

  outputCtx.fillStyle = '#0f172a';
  outputCtx.font = '700 58px Inter, sans-serif';
  outputCtx.fillText('拼豆图纸', paddingX, 96);
  outputCtx.font = '400 28px Inter, sans-serif';
  outputCtx.fillStyle = '#64748b';
  const mirrorLabel = mirrorPattern.checked ? ' · 已镜像' : '';
  outputCtx.fillText(`尺寸：${cellsWide} × ${cellsHigh} 格${mirrorLabel}`, paddingX, 138);
  outputCtx.fillText(`色号数量：${counts.size} 种`, paddingX, 174);
  outputCtx.fillText(`模式：${showCodes.checked ? '显示色号' : '纯色块'} · ${showGrid.checked ? '显示网格' : '隐藏网格'} · ${subjectPriority.checked ? '人物优先' : '通用'} · ${edgeLock.checked ? '边缘锁定' : '普通'}`, paddingX, 210);

  const codeFontSize = Math.max(18, Math.floor(cell * 0.44));
  outputCtx.font = `${codeFontSize}px "Inter", sans-serif`;
  outputCtx.textAlign = 'center';
  outputCtx.textBaseline = 'middle';

  for (let y = 0; y < cellsHigh; y += 1) {
    for (let x = 0; x < cellsWide; x += 1) {
      const color = pixels[y][x];
      const posX = offsetX + x * cell;
      const posY = offsetY + y * cell;
      outputCtx.fillStyle = color.hex;
      outputCtx.fillRect(posX, posY, cell, cell);
      if (showCodes.checked && cell >= 18) {
        outputCtx.fillStyle = getContrastColor(color.hex);
        outputCtx.fillText(color.id, posX + cell / 2, posY + cell / 2 + 1);
      }
    }
  }

  if (showGrid.checked) {
    outputCtx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
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
    outputCtx.font = '600 20px Inter, sans-serif';
    for (let x = 0; x < cellsWide; x += 5) {
      outputCtx.fillText(String(x + 1), offsetX + x * cell + cell / 2, offsetY - 18);
    }
    for (let y = 0; y < cellsHigh; y += 5) {
      outputCtx.fillText(String(y + 1), offsetX - 24, offsetY + y * cell + cell / 2);
    }
  }

  renderLegend(grid);
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
    summaryText.textContent = '等待上传图片。';
    scaleChip.textContent = '- × -';
    colorStats.innerHTML = '';
    renderOverrideBadges();
    return;
  }
  updateSliderLabels();
  const targetCells = Number(gridWidth.value) || beads[beadSize.value].defaultWidth;
  const grid = generateGrid(workingImage, targetCells);
  currentGrid = grid;
  colorCount = grid.counts.size;
  scaleChip.textContent = `${grid.cellsWide} × ${grid.cellsHigh}`;
  renderMiniPreview(grid);
  renderOutput(grid);
  const total = [...grid.counts.values()].reduce((acc, value) => acc + value, 0);
  summaryText.textContent = `已生成 ${grid.cellsWide} × ${grid.cellsHigh} 格超清拼豆图，使用 ${colorCount} 种色号，共 ${total} 颗拼豆。边界会优先保持，人物优先模式已${subjectPriority.checked ? '开启' : '关闭'}，边缘锁定已${edgeLock.checked ? '开启' : '关闭'}。`;
  renderOverrideBadges(grid);
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

[gridWidth, paletteSize, saturation, contrast, beadSize, showGrid, showCodes, mirrorPattern, preserveEdges].forEach((control) => {
  control.addEventListener('input', () => {
    updateSliderLabels();
    if (workingImage) regenerate();
  });
});

applyColorSwapBtn.addEventListener('click', () => {
  const sourceId = colorSourceSelect.value;
  const targetId = colorTargetSelect.value;
  if (!sourceId || !targetId) {
    setFeedback('请选择需要替换的色号。', true);
    return;
  }
  if (sourceId === targetId) {
    setFeedback('原色号与新色号相同，无需替换。', true);
    return;
  }
  const target = paletteMap.get(targetId);
  if (!target) {
    setFeedback('色号不存在，请检查。', true);
    return;
  }
  state.overrides.set(sourceId, target);
  persistOverrides();
  setFeedback(`已将 ${sourceId} 替换为 ${target.id}。`);
  if (workingImage) regenerate();
});

resetColorSwapBtn.addEventListener('click', () => {
  if (state.overrides.size === 0) return;
  state.overrides.clear();
  persistOverrides();
  setFeedback('已清空所有色号替换。');
  if (workingImage) regenerate();
});

overrideBadges.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const badge = button.closest('.override-badge');
  if (!badge) return;
  const sourceId = badge.dataset.source;
  if (!sourceId) return;
  state.overrides.delete(sourceId);
  persistOverrides();
  setFeedback(`已移除 ${sourceId} 的替换。`);
  if (workingImage) regenerate();
});

regenerateBtn.addEventListener('click', regenerate);
downloadBtn.addEventListener('click', () => {
  if (!currentGrid) return;
  const link = document.createElement('a');
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  link.download = `pebeads-pattern-${stamp}.png`;
  link.href = outputCanvas.toDataURL('image/png');
  link.click();
});

function createDemoImage() {
  const demo = document.createElement('canvas');
  demo.width = 960;
  demo.height = 720;
  const ctx = demo.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, demo.width, demo.height);
  gradient.addColorStop(0, '#ef4444');
  gradient.addColorStop(0.3, '#f59e0b');
  gradient.addColorStop(0.55, '#22c55e');
  gradient.addColorStop(0.82, '#3b82f6');
  gradient.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, demo.width, demo.height);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(760, 180, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText('Pe', 120, 220);
  ctx.fillText('Web', 120, 300);
  const demoImage = new Image();
  demoImage.src = demo.toDataURL('image/png');
  return demoImage;
}

function bootstrapApp() {
  if (state.bootstrapped) return;
  state.bootstrapped = true;
  populateColorSelectors();
  loadStoredOverrides();
  renderOverrideBadges();
  updateSliderLabels();
  summaryText.textContent = '等待上传图片。';
  previewCtx.fillStyle = '#ffffff';
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  sourceCtx.fillStyle = '#ffffff';
  sourceCtx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  const demoImage = createDemoImage();
  demoImage.onload = () => setWorkingImage(demoImage);
  if (demoImage.complete) {
    setWorkingImage(demoImage);
  }
}

function unlockAccess() {
  document.body.classList.remove('locked');
  accessGate.hidden = true;
  appShell.hidden = false;
  bootstrapApp();
}

function setFeedback(message, isError = false) {
  accessFeedback.textContent = message;
  if (isError) {
    accessFeedback.classList.add('error');
  } else {
    accessFeedback.classList.remove('error');
  }
}

async function loadPasswordConfig() {
  if (state.passwordHash) return;
  const response = await fetch('./password.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('密码配置加载失败');
  }
  const data = await response.json();
  state.passwordHash = (data.passwordHash || '').trim().toLowerCase();
  if (!state.passwordHash) {
    throw new Error('未配置密码');
  }
}

async function hashPassword(raw) {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function attemptAutoUnlock() {
  try {
    await loadPasswordConfig();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved === state.passwordHash) {
      unlockAccess();
      setFeedback('已自动验证访问权限。');
      return true;
    }
  } catch (error) {
    setFeedback(error.message, true);
  }
  return false;
}

accessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = accessInput.value.trim();
  if (!value) {
    setFeedback('请输入密码。', true);
    accessInput.focus();
    return;
  }
  setFeedback('正在验证...');
  try {
    await loadPasswordConfig();
    const hashed = await hashPassword(value);
    if (hashed === state.passwordHash) {
      localStorage.setItem(STORAGE_KEY, hashed);
      setFeedback('校验成功，即将进入。');
      unlockAccess();
    } else {
      setFeedback('密码错误，请核对后再试。', true);
      accessInput.select();
    }
  } catch (error) {
    setFeedback(error.message || '验证失败，请稍后重试。', true);
  }
});

attemptAutoUnlock();













