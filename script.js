// ============================================================
// 🎮 SEMESTER-BLASTER - Computação Gráfica
// ============================================================
// REQUISITOS CONTEMPLADOS:
// a) Set Pixel ✅
// b) Primitivas de Rasterização (Linha, Círculo, Elipse) ✅
// c) Preenchimento de Regiões (Flood Fill + Scanline) ✅
// d) Transformações Geométricas (Rotação, Translação, Escala) ✅
// e) Animação 2D ✅
// f) Janela e Viewport ✅
// g) Recorte de Cohen-Sutherland (Clipping) ✅
// h) Mapeamento de Textura (Boss desenhado 100% no pixel buffer) ✅
// i) Input (Teclado) ✅
// j) Menus e Interações Gráficas Avançadas ✅
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const minimapCanvas = document.getElementById("minimap-canvas");
const minimapCtx = minimapCanvas.getContext("2d");

let difficulty = "medio";
let fillDone = false;

// ================== NEW GAME+ STATE ==================
let newGamePlusUnlocked = false;
let isNewGamePlus = false;

// ================== PASSWORDS FIXOS POR FASE ==================
const PASSWORDS = {
    "FASE2": 2,
    "FASE3": 3,
    "BOSS1": 3,
    "TCC00": 3,
    "SEM02": 2
};

// ================== [REQUISITO F] JANELA E VIEWPORT ==================
const world = { xmin: 0, ymin: 0, xmax: 700, ymax: 600 };
const viewport = { xmin: 0, ymin: 0, xmax: canvas.width, ymax: canvas.height };

function worldToViewport(x, y) {
    return {
        x: viewport.xmin + (x - world.xmin) * (viewport.xmax - viewport.xmin) / (world.xmax - world.xmin),
        y: viewport.ymin + (y - world.ymin) * (viewport.ymax - viewport.ymin) / (world.ymax - world.ymin)
    };
}

// ================== MATERIAS ==================
const materias = [
    "Alg", "Calc1", "Fisic1", "Calc3",
    "SO", "Grafos", "Automatos", "Comp",
    "Complex", "PE", "Proj", "Adm"
];

// ================== [REQUISITO A] SET PIXEL ==================
let imgData;
let offscreenCanvas, offscreenCtx;

function initPixels() {
    imgData = new ImageData(canvas.width, canvas.height);
    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        offscreenCtx = offscreenCanvas.getContext("2d");
    }
}

function setPixel(x, y, r = 255, g = 255, b = 255, a = 255) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    const i = (x + y * canvas.width) * 4;
    imgData.data[i] = r;
    imgData.data[i + 1] = g;
    imgData.data[i + 2] = b;
    imgData.data[i + 3] = a;
}

function getPixel(x, y) {
    const i = (Math.floor(x) + Math.floor(y) * canvas.width) * 4;
    return [imgData.data[i], imgData.data[i+1], imgData.data[i+2], imgData.data[i+3]];
}

function colorsMatch(c1, c2) { return c1[0]===c2[0] && c1[1]===c2[1] && c1[2]===c2[2] && c1[3]===c2[3]; }

function renderPixels() {
    offscreenCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(offscreenCanvas, 0, 0);
}

// ================== [REQUISITO C] FLOOD FILL ==================
function floodFill(x, y, fillColor = [0, 150, 255, 255]) {
    x = Math.floor(x); y = Math.floor(y);
    const targetColor = getPixel(x, y);
    if (colorsMatch(targetColor, fillColor)) return;
    const stack = [[x, y]];
    while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) continue;
        if (!colorsMatch(getPixel(cx, cy), targetColor)) continue;
        setPixel(cx, cy, ...fillColor);
        stack.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]);
    }
}

// ================== [REQUISITO B] MIDPOINT CIRCLE ==================
function drawCircleMidpoint(cx, cy, radius, color = [255, 255, 255, 255]) {
    cx = Math.floor(cx); cy = Math.floor(cy); radius = Math.floor(radius);
    let x = 0, y = radius;
    let d = 1 - radius;

    function plotCirclePoints(cx, cy, x, y) {
        setPixel(cx + x, cy + y, ...color); setPixel(cx - x, cy + y, ...color);
        setPixel(cx + x, cy - y, ...color); setPixel(cx - x, cy - y, ...color);
        setPixel(cx + y, cy + x, ...color); setPixel(cx - y, cy + x, ...color);
        setPixel(cx + y, cy - x, ...color); setPixel(cx - y, cy - x, ...color);
    }

    plotCirclePoints(cx, cy, x, y);
    while (x < y) {
        x++;
        if (d < 0) { d += 2 * x + 1; }
        else { y--; d += 2 * (x - y) + 1; }
        plotCirclePoints(cx, cy, x, y);
    }
}

// ================== [REQUISITO B] MIDPOINT ELLIPSE ==================
function drawEllipseMidpoint(cx, cy, rx, ry, color = [255, 255, 255, 255]) {
    cx = Math.floor(cx); cy = Math.floor(cy);
    rx = Math.floor(rx); ry = Math.floor(ry);
    if (rx <= 0 || ry <= 0) return;

    let x = 0, y = ry;
    let rx2 = rx * rx, ry2 = ry * ry;
    let tworx2 = 2 * rx2, twory2 = 2 * ry2;
    let px = 0, py = tworx2 * y;

    function plotEllipsePoints(cx, cy, x, y) {
        setPixel(cx + x, cy + y, ...color); setPixel(cx - x, cy + y, ...color);
        setPixel(cx + x, cy - y, ...color); setPixel(cx - x, cy - y, ...color);
    }

    let d1 = ry2 - (rx2 * ry) + (0.25 * rx2);
    plotEllipsePoints(cx, cy, x, y);
    while (px < py) {
        x++; px += twory2;
        if (d1 < 0) { d1 += ry2 + px; }
        else { y--; py -= tworx2; d1 += ry2 + px - py; }
        plotEllipsePoints(cx, cy, x, y);
    }

    let d2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
    while (y >= 0) {
        y--; py -= tworx2;
        if (d2 > 0) { d2 += rx2 - py; }
        else { x++; px += twory2; d2 += rx2 - py + px; }
        plotEllipsePoints(cx, cy, x, y);
    }
}

// ================== [REQUISITO C] SCANLINE FILL ==================
function scanlineFillTriangle(x0, y0, x1, y1, x2, y2, color = [255, 200, 0, 255]) {
    let verts = [{x: x0, y: y0}, {x: x1, y: y1}, {x: x2, y: y2}];
    verts.sort((a, b) => a.y - b.y);
    const v0 = verts[0], v1 = verts[1], v2 = verts[2];
    if (v0.y === v2.y) return;

    function interpolateX(yStart, yEnd, xStart, xEnd, y) {
        if (yEnd === yStart) return xStart;
        return xStart + (xEnd - xStart) * (y - yStart) / (yEnd - yStart);
    }

    const yMin = Math.max(0, Math.floor(v0.y));
    const yMax = Math.min(canvas.height - 1, Math.floor(v2.y));

    for (let y = yMin; y <= yMax; y++) {
        let xA, xB;
        if (y < v1.y) {
            xA = interpolateX(v0.y, v1.y, v0.x, v1.x, y);
            xB = interpolateX(v0.y, v2.y, v0.x, v2.x, y);
        } else {
            xA = interpolateX(v1.y, v2.y, v1.x, v2.x, y);
            xB = interpolateX(v0.y, v2.y, v0.x, v2.x, y);
        }
        if (xA > xB) { let tmp = xA; xA = xB; xB = tmp; }
        const xStart = Math.max(0, Math.floor(xA));
        const xEnd = Math.min(canvas.width - 1, Math.floor(xB));
        for (let x = xStart; x <= xEnd; x++) { setPixel(x, y, ...color); }
    }
}

// ================== [REQUISITO D] ROTAÇÃO ==================
function rotatePoint(px, py, cx, cy, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = px - cx, dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function drawRotatedTriangle(cx, cy, size, angle, color = [255, 100, 0, 255]) {
    const p0 = { x: cx, y: cy - size };
    const p1 = { x: cx - size, y: cy + size };
    const p2 = { x: cx + size, y: cy + size };
    const r0 = rotatePoint(p0.x, p0.y, cx, cy, angle);
    const r1 = rotatePoint(p1.x, p1.y, cx, cy, angle);
    const r2 = rotatePoint(p2.x, p2.y, cx, cy, angle);
    drawLine(r0.x, r0.y, r1.x, r1.y, color);
    drawLine(r1.x, r1.y, r2.x, r2.y, color);
    drawLine(r2.x, r2.y, r0.x, r0.y, color);
    scanlineFillTriangle(r0.x, r0.y, r1.x, r1.y, r2.x, r2.y, color);
}

// ================== DEATH SPIN ==================
let deathSpins = [];

function createDeathSpin(x, y) {
    deathSpins.push({ x, y, angle: 0, timer: 0, maxTimer: 25, size: 15, color: [255, 80, 0, 255] });
}

function updateDeathSpins() {
    deathSpins.forEach(d => { d.timer++; d.angle += 0.4; d.size *= 0.92; });
    deathSpins = deathSpins.filter(d => d.timer < d.maxTimer);
}

function drawDeathSpins() {
    deathSpins.forEach(d => {
        const alpha = Math.floor(255 * (1 - d.timer / d.maxTimer));
        drawRotatedTriangle(d.x, d.y, d.size, d.angle, [d.color[0], d.color[1], d.color[2], alpha]);
    });
}

// ================== [REQUISITO G] COHEN-SUTHERLAND CLIPPING ==================
const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
const clipXmin = 0, clipYmin = 0, clipXmax = canvas.width, clipYmax = canvas.height;

function computeOutCode(x, y) {
    let code = INSIDE;
    if (x < clipXmin) code |= LEFT; else if (x > clipXmax) code |= RIGHT;
    if (y < clipYmin) code |= TOP; else if (y > clipYmax) code |= BOTTOM;
    return code;
}

function cohenSutherlandClip(x0, y0, x1, y1) {
    let outcode0 = computeOutCode(x0, y0), outcode1 = computeOutCode(x1, y1);
    let accept = false;
    while (true) {
        if (!(outcode0 | outcode1)) { accept = true; break; }
        else if (outcode0 & outcode1) break;
        else {
            let x, y, out = outcode0 ? outcode0 : outcode1;
            if (out & TOP) { x = x0 + (x1 - x0) * (clipYmin - y0) / (y1 - y0); y = clipYmin; }
            else if (out & BOTTOM) { x = x0 + (x1 - x0) * (clipYmax - y0) / (y1 - y0); y = clipYmax; }
            else if (out & RIGHT) { y = y0 + (y1 - y0) * (clipXmax - x0) / (x1 - x0); x = clipXmax; }
            else if (out & LEFT) { y = y0 + (y1 - y0) * (clipXmin - x0) / (x1 - x0); x = clipXmin; }
            if (out === outcode0) { x0 = x; y0 = y; outcode0 = computeOutCode(x0, y0); }
            else { x1 = x; y1 = y; outcode1 = computeOutCode(x1, y1); }
        }
    }
    if (accept) return [x0, y0, x1, y1];
    return null;
}

// ================== [REQUISITO B] BRESENHAM LINE ==================
function drawLine(x0, y0, x1, y1, color = [255, 255, 0]) {
    const clipped = cohenSutherlandClip(x0, y0, x1, y1);
    if (!clipped) return;
    [x0, y0, x1, y1] = clipped;
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    while (true) {
        setPixel(x0, y0, ...color);
        if (x0 === x1 && y0 === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}

// ================== [REQUISITO H] BOSS TEXTURA MANUAL (PIXEL BUFFER) ==================
function drawBossPixelArt(bx, by, size) {
    const cx = Math.floor(bx + size / 2);
    const cy = Math.floor(by + size / 2);

    scanlineFillTriangle(cx, by + 10, bx + 15, by + size - 30, bx + size - 15, by + size - 30, [80, 0, 120, 255]);
    scanlineFillTriangle(bx + 15, by + size - 30, bx + size - 15, by + size - 30, bx + 30, by + size - 5, [60, 0, 100, 255]);
    scanlineFillTriangle(bx + size - 15, by + size - 30, bx + 30, by + size - 5, bx + size - 30, by + size - 5, [60, 0, 100, 255]);

    scanlineFillTriangle(bx + 25, cy - 10, bx - 10, cy + 30, bx + 40, cy + 30, [120, 30, 180, 255]);
    scanlineFillTriangle(bx + size - 25, cy - 10, bx + size + 10, cy + 30, bx + size - 40, cy + 30, [120, 30, 180, 255]);

    drawLine(cx, by + 10, bx + 15, by + size - 30, [180, 50, 255, 255]);
    drawLine(cx, by + 10, bx + size - 15, by + size - 30, [180, 50, 255, 255]);
    drawLine(bx + 15, by + size - 30, bx + size - 15, by + size - 30, [180, 50, 255, 255]);
    drawLine(bx + 30, by + size - 5, bx + size - 30, by + size - 5, [180, 50, 255, 255]);

    const faceY = cy - 15;
    drawCircleMidpoint(cx, faceY - 5, 28, [200, 170, 50, 255]);
    drawCircleMidpoint(cx, faceY - 5, 27, [200, 170, 50, 255]);
    scanlineFillTriangle(cx - 22, faceY - 5, cx + 22, faceY - 5, cx, faceY + 35, [140, 80, 180, 255]);
    scanlineFillTriangle(cx - 22, faceY - 5, cx + 22, faceY - 5, cx, faceY - 20, [140, 80, 180, 255]);

    drawCircleMidpoint(cx - 10, faceY, 5, [255, 50, 50, 255]);
    drawCircleMidpoint(cx - 10, faceY, 4, [255, 100, 100, 255]);
    drawCircleMidpoint(cx - 10, faceY, 2, [255, 255, 200, 255]);
    drawCircleMidpoint(cx + 10, faceY, 5, [255, 50, 50, 255]);
    drawCircleMidpoint(cx + 10, faceY, 4, [255, 100, 100, 255]);
    drawCircleMidpoint(cx + 10, faceY, 2, [255, 255, 200, 255]);

    drawLine(cx - 18, faceY - 9, cx - 6, faceY - 6, [100, 0, 60, 255]);
    drawLine(cx + 18, faceY - 9, cx + 6, faceY - 6, [100, 0, 60, 255]);

    const chinY = faceY + 15;
    for (let i = -8; i <= 8; i += 4) {
        drawLine(cx + i, chinY, cx + i, chinY + 14, [200, 170, 50, 255]);
    }
    drawLine(cx - 10, chinY - 2, cx + 10, chinY - 2, [80, 0, 60, 255]);

    drawEllipseMidpoint(cx, cy + 25, 8, 5, [255, 220, 50, 255]);
    drawEllipseMidpoint(cx, cy + 25, 6, 3, [255, 255, 150, 255]);
    drawCircleMidpoint(cx, cy + 25, 2, [255, 255, 255, 255]);

    const textY = by + size - 22;
    const tLeft = cx - 30;
    drawLine(tLeft, textY, tLeft + 12, textY, [255, 255, 255, 255]);
    drawLine(tLeft + 6, textY, tLeft + 6, textY + 12, [255, 255, 255, 255]);
    const c1Left = cx - 12;
    drawLine(c1Left + 10, textY, c1Left, textY, [255, 255, 255, 255]);
    drawLine(c1Left, textY, c1Left, textY + 12, [255, 255, 255, 255]);
    drawLine(c1Left, textY + 12, c1Left + 10, textY + 12, [255, 255, 255, 255]);
    const c2Left = cx + 8;
    drawLine(c2Left + 10, textY, c2Left, textY, [255, 255, 255, 255]);
    drawLine(c2Left, textY, c2Left, textY + 12, [255, 255, 255, 255]);
    drawLine(c2Left, textY + 12, c2Left + 10, textY + 12, [255, 255, 255, 255]);

    drawEllipseMidpoint(cx - 25, by + size - 2, 6, 3, [255, 100, 0, 255]);
    drawEllipseMidpoint(cx, by + size - 2, 6, 3, [255, 150, 0, 255]);
    drawEllipseMidpoint(cx + 25, by + size - 2, 6, 3, [255, 100, 0, 255]);
    for (let i = -1; i <= 1; i++) {
        const px = cx + i * 25;
        const flameLen = 5 + Math.random() * 10;
        drawLine(px - 3, by + size, px - 1, by + size + flameLen, [255, 200, 50, 200]);
        drawLine(px + 3, by + size, px + 1, by + size + flameLen, [255, 200, 50, 200]);
        drawLine(px, by + size, px, by + size + flameLen + 3, [255, 255, 200, 200]);
    }
}

// ================== [REQUISITO I] INPUT ==================
let keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// ================== GAME STATE ==================
let player = { x: 350, y: 550 };
let shots = [], enemyShots = [], enemies = [], boss = null;
let score = 0, level = 1, gameStarted = false, gameOver = false;
let playerLife = 12, coins = 0, coinAnimations = [];
let fireCooldown = 0, fireRate = 40, shipLevel = 1;
let showingUpgrade = false;
let gameWon = false;

// ================== STARFIELD 3D ==================
const NUM_STARS_3D = 200;
const starField3D = [];

function initStarField3D() {
    for (let i = 0; i < NUM_STARS_3D; i++) starField3D.push(createStar3D());
}

function createStar3D() {
    return {
        x: (Math.random() - 0.5) * canvas.width * 2,
        y: (Math.random() - 0.5) * canvas.height * 2,
        z: Math.random() * canvas.width,
        pz: 0,
        color: Math.random() > 0.8 ? [100, 180, 255] : Math.random() > 0.5 ? [255, 255, 255] : [200, 200, 255]
    };
}

let warpSpeed = 8;

let nebulas = Array.from({length: 4}, () => ({
    x: Math.random() * canvas.width, y: -200 - Math.random() * 800,
    radius: 60 + Math.random() * 150, speed: 0.4 + Math.random() * 0.5,
    hue: Math.random() * 360, alpha: 0.03 + Math.random() * 0.05
}));

let spaceDust = Array.from({length: 30}, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    speed: 1 + Math.random() * 2, size: 0.5 + Math.random() * 1,
    alpha: 0.1 + Math.random() * 0.3, hue: 180 + Math.random() * 60
}));

let explosions = [];
let screenShake = 0;
let damageFlash = 0;
let levelBanner = { text: "", timer: 0 };

function createExplosion(x, y, count = 15, colors = null) {
    const defaultColors = [[255,100,0],[255,200,0],[255,255,100],[255,50,0]];
    const cols = colors || defaultColors;
    const particles = Array.from({length: count}, () => {
        const c = cols[Math.random()*cols.length|0];
        return { vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, r:c[0], g:c[1], b:c[2], size: Math.random()*4+1 };
    });
    explosions.push({ x, y, t: 0, maxT: 35, particles });
}

function drawExplosions() {
    explosions.forEach(exp => {
        const alpha = 1 - exp.t / exp.maxT;
        exp.particles.forEach(p => {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
            ctx.fillRect(exp.x + p.vx * exp.t - p.size/2, exp.y + p.vy * exp.t - p.size/2, p.size, p.size);
        });
    });
    ctx.globalAlpha = 1;
}

function showLevelBanner(text) { levelBanner.text = text; levelBanner.timer = 120; }

// ================== [REQUISITO H] TEXTURAS (nave UECE + fundo) ==================
const bgImg = new Image();
bgImg.src = "./space.png";

const ueceShipImg = new Image();
ueceShipImg.src = "./nave-uece.png";

let bgOffset = 0;

// ================== BACKGROUND ==================
function drawBackground() {
    ctx.fillStyle = "#020208";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (bgImg.complete && bgImg.naturalWidth > 0) {
        bgOffset += 0.8;
        ctx.globalAlpha = 0.15;
        ctx.drawImage(bgImg, 0, bgOffset % canvas.height, canvas.width, canvas.height);
        ctx.drawImage(bgImg, 0, (bgOffset % canvas.height) - canvas.height, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
    }

    nebulas.forEach(n => {
        n.y += n.speed;
        if (n.y > canvas.height + n.radius * 2) { n.y = -n.radius * 2; n.x = Math.random() * canvas.width; n.hue = Math.random() * 360; }
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
        grad.addColorStop(0, `hsla(${n.hue}, 70%, 40%, ${n.alpha})`);
        grad.addColorStop(0.4, `hsla(${n.hue}, 50%, 25%, ${n.alpha * 0.5})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
    });

    const cx = canvas.width / 2, cy = canvas.height / 2;
    warpSpeed = level === 3 ? 12 : 8;

    for (let i = 0; i < starField3D.length; i++) {
        const star = starField3D[i];
        star.pz = star.z; star.z -= warpSpeed;
        if (star.z <= 0) { star.x = (Math.random()-0.5)*canvas.width*2; star.y = (Math.random()-0.5)*canvas.height*2; star.z = canvas.width; star.pz = star.z; continue; }
        const sx = (star.x/star.z)*canvas.width*0.5+cx, sy = (star.y/star.z)*canvas.height*0.5+cy;
        const px = (star.x/star.pz)*canvas.width*0.5+cx, py = (star.y/star.pz)*canvas.height*0.5+cy;
        if (sx<0||sx>canvas.width||sy<0||sy>canvas.height) continue;
        const size = Math.max(0.5,(1-star.z/canvas.width)*3);
        const brightness = 1-star.z/canvas.width;
        const r=star.color[0],g=star.color[1],b=star.color[2];
        ctx.strokeStyle=`rgba(${r},${g},${b},${brightness*0.6})`; ctx.lineWidth=size*0.5;
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(sx,sy); ctx.stroke();
        ctx.fillStyle=`rgba(${r},${g},${b},${brightness})`; ctx.beginPath(); ctx.arc(sx,sy,size,0,Math.PI*2); ctx.fill();
        if (brightness>0.7) { ctx.fillStyle=`rgba(${r},${g},${b},${(brightness-0.7)*0.3})`; ctx.beginPath(); ctx.arc(sx,sy,size*3,0,Math.PI*2); ctx.fill(); }
    }

    spaceDust.forEach(d => {
        d.y += d.speed; if (d.y > canvas.height) { d.y = 0; d.x = Math.random()*canvas.width; }
        ctx.fillStyle=`hsla(${d.hue},50%,70%,${d.alpha})`; ctx.fillRect(d.x,d.y,d.size,d.size);
    });

    const vignette = ctx.createRadialGradient(cx,cy,canvas.height*0.3,cx,cy,canvas.height*0.8);
    vignette.addColorStop(0,"transparent"); vignette.addColorStop(1,"rgba(0,0,0,0.4)");
    ctx.fillStyle=vignette; ctx.fillRect(0,0,canvas.width,canvas.height);
}

// ================== PASSWORD ==================
function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < 5; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    localStorage.setItem("gamePassword", pass);
}

// ================== ENEMIES ==================
function createEnemies() {
    enemies = [];
    let linhas = difficulty === "facil" ? 5 : difficulty === "medio" ? 10 : 15;
    const hpMult = isNewGamePlus ? 2 : 1;
    const speedMult = isNewGamePlus ? 1.3 : 1;
    for (let i = 0; i < linhas; i++) {
        for (let j = 0; j < 4; j++) {
            enemies.push({
                x: 80 + j * 70, y: -Math.random() * 300,
                alive: true, hp: 1 * hpMult, cooldown: 0,
                speed: (0.5 + Math.random() * 0.3) * speedMult,
                nome: materias[Math.floor(Math.random() * materias.length)],
                animT: Math.random() * Math.PI * 2
            });
        }
    }
}

// ================== BOSS ==================
function createBoss() {
    const hpMult = isNewGamePlus ? 2 : 1;
    boss = { x:200, y:80, size:200, hp:150*hpMult, maxHp:150*hpMult, cooldown:0, direction:1 };
}

// ================== BOSS DIALOGUE ==================
let showingBossDialogue = false;
let bossDialoguePhase = 0;
let bossDialogueTimer = 0;

const bossDialogueLines = [
    "💀 THANOS-TCC:",
    "",
    "\"Achou que ia escapar, moleque?\"",
    "",
    "\"Dessa vez não tem jeito...\"",
    "",
    "\"VAI PASSAR 10 ANOS NA UECE!\"",
    "",
    "\"Seu diploma? INEXISTENTE.\"",
];

function startBossDialogue() {
    showingBossDialogue = true;
    bossDialoguePhase = 0;
    bossDialogueTimer = 0;
}

function drawBossDialogue() {
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const boxX = 50, boxY = 120, boxW = canvas.width - 100, boxH = 350;
    ctx.fillStyle = "#0a0014";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = "#a020f0";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#a020f0";
    ctx.shadowBlur = 15;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.shadowBlur = 0;

    const visibleLines = Math.min(bossDialogueLines.length, Math.floor(bossDialoguePhase));
    ctx.textAlign = "center";

    for (let i = 0; i < visibleLines; i++) {
        const line = bossDialogueLines[i];
        if (i === 0) {
            ctx.fillStyle = "#f0f";
            ctx.font = "bold 22px 'Courier New'";
            ctx.shadowColor = "#f0f";
            ctx.shadowBlur = 10;
        } else if (line.startsWith("\"VAI")) {
            ctx.fillStyle = "#ff2020";
            ctx.font = "bold 26px 'Courier New'";
            ctx.shadowColor = "#ff0000";
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = "#ddd";
            ctx.font = "18px 'Courier New'";
            ctx.shadowBlur = 0;
        }
        ctx.fillText(line, canvas.width / 2, boxY + 50 + i * 32);
    }
    ctx.shadowBlur = 0;

    if (visibleLines >= bossDialogueLines.length) {
        const btnX = canvas.width / 2 - 80, btnY = boxY + boxH - 60, btnW = 160, btnH = 45;
        const pulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;


        ctx.fillText("Pressione ESPAÇO ou ENTER", canvas.width / 2, btnY + 55);
    }

    ctx.textAlign = "left";

    bossDialogueTimer++;
    if (bossDialoguePhase < bossDialogueLines.length) {
        bossDialoguePhase += 0.06;
    }
}

function handleBossDialogueInput(e) {
    if (!showingBossDialogue) return;
    if (bossDialoguePhase < bossDialogueLines.length) {
        bossDialoguePhase = bossDialogueLines.length;
    } else if (e.key === " " || e.key === "Enter") {
        showingBossDialogue = false;
    }
}

document.addEventListener("keydown", e => {
    if (showingBossDialogue) { handleBossDialogueInput(e); return; }
});

// ================== UPGRADE MENU ==================
let upgradeOptions = [];
function showUpgradeMenu() {
    showingUpgrade = true;
    upgradeOptions = [
        { label: "Nave 2 (+Vel)", cost: 10, lvl: 2, rate: 25 },
        { label: "Nave 3 (Rápida)", cost: 20, lvl: 3, rate: 10 },
        { label: "Nave 4 (Auto)", cost: 30, lvl: 4, rate: 8 },
        { label: "Continuar →", cost: 0, lvl: 0, rate: 0 }
    ];
}

function drawUpgradeMenu() {
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0ff"; ctx.font = "bold 32px 'Courier New'"; ctx.textAlign = "center";
    ctx.fillText("⬆ UPGRADE ⬆", canvas.width/2, 120);
    ctx.fillStyle = "#fff"; ctx.font = "18px 'Courier New'";
    ctx.fillText("Moedas: " + coins, canvas.width/2, 160);

    upgradeOptions.forEach((opt, i) => {
        const bx = canvas.width/2 - 150, by = 200 + i * 70, bw = 300, bh = 50;
        const canBuy = coins >= opt.cost || opt.cost === 0;
        ctx.fillStyle = canBuy ? "#1a1a2e" : "#0a0a15";
        ctx.strokeStyle = canBuy ? "#0ff" : "#333"; ctx.lineWidth = 2;
        ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = canBuy ? "#fff" : "#555"; ctx.font = "16px 'Courier New'"; ctx.textAlign = "center";
        const costText = opt.cost > 0 ? ` [${opt.cost}💰]` : "";
        ctx.fillText(`[${i+1}] ${opt.label}${costText}`, canvas.width/2, by + 32);
    });

    ctx.fillStyle = "#888"; ctx.font = "14px 'Courier New'";
    ctx.fillText("Pressione 1, 2, 3 ou 4", canvas.width/2, 500);
    ctx.textAlign = "left";
}

function handleUpgradeInput(key) {
    if (!showingUpgrade) return;
    const idx = parseInt(key) - 1;
    if (idx < 0 || idx >= upgradeOptions.length) return;
    const opt = upgradeOptions[idx];
    if (opt.cost > 0 && coins < opt.cost) return;
    if (opt.lvl > 0) { shipLevel = opt.lvl; fireRate = opt.rate; coins -= opt.cost; }
    showingUpgrade = false;
}

document.addEventListener("keydown", e => {
    if (showingUpgrade) { handleUpgradeInput(e.key); return; }
});

// ================== END SCREEN ==================
function drawEndScreen(title, subtitle, color) {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.fillStyle = color; ctx.font = "bold 48px 'Courier New'";
    ctx.shadowColor = color; ctx.shadowBlur = 30;
    ctx.fillText(title, canvas.width/2, canvas.height/2 - 40);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff"; ctx.font = "20px 'Courier New'";
    ctx.fillText(subtitle, canvas.width/2, canvas.height/2 + 5);
    ctx.fillText("Score: " + score + " | Moedas: " + coins, canvas.width/2, canvas.height/2 + 40);
    ctx.fillStyle = "#aaa"; ctx.font = "16px 'Courier New'";
    ctx.fillText("Pressione R para reiniciar", canvas.width/2, canvas.height/2 + 80);

    if (gameWon && !isNewGamePlus) {
        ctx.fillStyle = "#ff0"; ctx.font = "bold 16px 'Courier New'";
        ctx.fillText("🌟 Pressione M para voltar ao MENU → NOVO GAME+ 🌟", canvas.width/2, canvas.height/2 + 115);
    } else if (gameWon && isNewGamePlus) {
        ctx.fillStyle = "#f0f"; ctx.font = "bold 16px 'Courier New'";
        ctx.fillText("🏆 MESTRE DA UECE! Completou o NG+! 🏆", canvas.width/2, canvas.height/2 + 115);
    }
    ctx.textAlign = "left";
}

// ================== VOLTAR AO MENU ==================
function returnToMenu() {
    gameStarted = false;
    gameOver = false;
    gameWon = false;
    document.getElementById("sidebar").classList.remove("active");
    document.getElementById("game-container").classList.remove("playing");
    document.getElementById("menu").style.display = "block";
    if (newGamePlusUnlocked) {
        document.getElementById("btn-ngplus").style.display = "inline-block";
    }
}

// ================== START GAME NORMAL ==================
function startGame() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("sidebar").classList.add("active");
    document.getElementById("game-container").classList.add("playing");
    canvas.style.display = "block";
    gameStarted = true; gameOver = false; gameWon = false;
    isNewGamePlus = false;
    score = 0; coins = 0; shipLevel = 1; fireRate = 40;
    playerLife = 12; level = 1; boss = null;
    shots = []; enemyShots = []; explosions = []; deathSpins = [];
    player = { x: 350, y: 550 };

    const inputPass = document.getElementById("passwordInput").value.trim().toUpperCase();
    let startLevel = 1;
    if (PASSWORDS[inputPass]) startLevel = PASSWORDS[inputPass];
    const savedPass = localStorage.getItem("gamePassword");
    if (savedPass && inputPass === savedPass) startLevel = 2;

    level = startLevel;
    if (level === 3) { enemies = []; createBoss(); startBossDialogue(); }
    else if (level === 2) { createEnemies(); showLevelBanner("SEMESTRE 2"); }
    else { createEnemies(); showLevelBanner("SEMESTRE 1"); }

    initPixels();
}

// ================== START NEW GAME+ ==================
function startNewGamePlus() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("sidebar").classList.add("active");
    document.getElementById("game-container").classList.add("playing");
    canvas.style.display = "block";
    gameStarted = true; gameOver = false; gameWon = false;
    isNewGamePlus = true;
    score = 0; coins = 0;
    shipLevel = 5;
    fireRate = 3;
    playerLife = 15;
    level = 1; boss = null;
    shots = []; enemyShots = []; explosions = []; deathSpins = [];
    player = { x: 350, y: 550 };

    createEnemies();
    initPixels();
    showLevelBanner("🌟 NOVO GAME+ 🌟");
}

// ================== MINIMAP ==================
function drawMinimap() {
    const mCtx = minimapCtx, mW = minimapCanvas.width, mH = minimapCanvas.height;
    mCtx.fillStyle = "#0a0a18"; mCtx.fillRect(0, 0, mW, mH);
    mCtx.strokeStyle = "rgba(0,255,255,0.1)"; mCtx.lineWidth = 0.5;
    for (let i = 0; i < mW; i += 20) { mCtx.beginPath(); mCtx.moveTo(i, 0); mCtx.lineTo(i, mH); mCtx.stroke(); }
    for (let i = 0; i < mH; i += 20) { mCtx.beginPath(); mCtx.moveTo(0, i); mCtx.lineTo(mW, i); mCtx.stroke(); }

    function toMini(x, y) { return { x: (x/world.xmax)*mW, y: (y/world.ymax)*mH }; }

    enemies.forEach(e => { if (!e.alive) return; let pos=toMini(e.x,e.y); mCtx.fillStyle="#f44"; mCtx.fillRect(pos.x-1.5,pos.y-1.5,3,3); });
    if (boss) { let b=toMini(boss.x+boss.size/2,boss.y+boss.size/2); mCtx.fillStyle="#f0f"; mCtx.fillRect(b.x-4,b.y-4,8,8); }
    let p = toMini(player.x, player.y);
    const pulse = 0.5 + Math.sin(Date.now()*0.005)*0.5;
    mCtx.fillStyle = isNewGamePlus ? `rgba(255,200,0,${0.5+pulse*0.5})` : `rgba(0,255,255,${0.5+pulse*0.5})`;
    mCtx.beginPath(); mCtx.arc(p.x, p.y, 3+pulse, 0, Math.PI*2); mCtx.fill();
    mCtx.strokeStyle = isNewGamePlus ? "#ff0" : "#0ff"; mCtx.lineWidth = 1; mCtx.strokeRect(0, 0, mW, mH);
}

// ================== SIDEBAR HUD ==================
function updateSidebar() {
    document.getElementById("hud-score").textContent = score;
    document.getElementById("hud-coins").textContent = coins;
    document.getElementById("hud-level").textContent = level + (isNewGamePlus ? " (NG+)" : "");
    document.getElementById("hud-ship").textContent = shipLevel === 5 ? "UECE 🌟" : "Lv." + shipLevel;

    const maxLife = isNewGamePlus ? 15 : 12;
    const lifeRatio = Math.max(0, playerLife / maxLife);
    const bar = document.getElementById("life-bar");
    bar.style.width = (lifeRatio * 100) + "%";
    bar.style.background = lifeRatio > 0.5 ? "#0f0" : lifeRatio > 0.25 ? "#fa0" : "#f00";
    document.getElementById("life-text").textContent = playerLife + "/" + maxLife;
}

// ================== UPDATE ==================
function update() {
    if (!gameStarted || gameOver || showingUpgrade || showingBossDialogue) return;

    if (screenShake > 0) screenShake *= 0.9;
    if (screenShake < 0.5) screenShake = 0;
    if (damageFlash > 0) damageFlash--;
    if (levelBanner.timer > 0) levelBanner.timer--;

    explosions.forEach(e => e.t++);
    explosions = explosions.filter(e => e.t < e.maxT);
    updateDeathSpins();
    coinAnimations.forEach(c => c.progress += 0.03);
    coinAnimations = coinAnimations.filter(c => c.progress < 1);

    if (keys["ArrowLeft"] || keys["a"]) player.x -= 5;
    if (keys["ArrowRight"] || keys["d"]) player.x += 5;
    player.x = Math.max(20, Math.min(world.xmax - 20, player.x));

    if (fireCooldown > 0) fireCooldown--;
    if (keys[" "]) {
        if (shipLevel === 5) {
            if (fireCooldown <= 0) {
                shots.push({ x: player.x - 14, y: player.y - 40 });
                shots.push({ x: player.x + 14, y: player.y - 40 });
                fireCooldown = fireRate;
            }
        } else if (shipLevel === 4) {
            if (fireCooldown <= 0) { shots.push({ x: player.x, y: player.y - 40 }); fireCooldown = 8; }
        } else {
            if (fireCooldown <= 0) { shots.push({ x: player.x, y: player.y - 40 }); fireCooldown = fireRate; }
            keys[" "] = false;
        }
    }

    shots.forEach(s => s.y -= 6);
    shots = shots.filter(s => s.y > -10);

    enemies.forEach(e => {
        if (!e.alive) return;
        e.y += e.speed; e.animT += 0.04;
        if (e.x > player.x-30 && e.x < player.x+30 && e.y > player.y-30 && e.y < player.y+30) {
            playerLife--; screenShake = 8; damageFlash = 10;
            let p = worldToViewport(player.x, player.y);
            createExplosion(p.x, p.y, 8, [[255,0,0],[255,100,0]]);
            e.y = -50; e.x = Math.random()*(canvas.width-40);
            if (playerLife <= 0) gameOver = true;
        }
        if (e.y > canvas.height+20) { e.y = -50; e.x = Math.random()*(canvas.width-40); }
    });

    shots = shots.filter(s => {
        let hit = false;
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (e.alive && s.x > e.x && s.x < e.x+40 && s.y > e.y && s.y < e.y+40) {
                e.hp--; hit = true;
                if (e.hp <= 0) {
                    e.alive = false; score++; coins++;
                    let p = worldToViewport(e.x+20, e.y+20);
                    createExplosion(p.x, p.y, 12);
                    createDeathSpin(p.x, p.y);
                    coinAnimations.push({ x:p.x, y:p.y, targetX:canvas.width-50, targetY:10, progress:0 });
                }
                break;
            }
        }
        return !hit;
    });

    enemyShots.forEach(s => s.y += 2);
    enemyShots = enemyShots.filter(s => {
        let hit = s.x > player.x-40 && s.x < player.x+40 && s.y > player.y-40 && s.y < player.y+40;
        if (hit) {
            playerLife--; screenShake = 6; damageFlash = 8;
            let p = worldToViewport(player.x, player.y);
            createExplosion(p.x, p.y, 6, [[255,0,0],[255,50,50]]);
            if (playerLife <= 0) gameOver = true;
        }
        return !hit && s.y < canvas.height;
    });

    if (level === 3 && boss) {
        boss.x += boss.direction * 2;
        if (boss.x <= 50 || boss.x+boss.size >= canvas.width-50) boss.direction *= -1;
        boss.cooldown--;
        if (boss.cooldown <= 0) {
            enemyShots.push({ x: boss.x+boss.size/2, y: boss.y+boss.size });
            if (difficulty === "dificil" || isNewGamePlus) {
                enemyShots.push({ x: boss.x+boss.size/2-30, y: boss.y+boss.size });
                enemyShots.push({ x: boss.x+boss.size/2+30, y: boss.y+boss.size });
            }
            boss.cooldown = isNewGamePlus ? 30 : 40;
        }
        shots = shots.filter(s => {
            let hit = s.x > boss.x && s.x < boss.x+boss.size && s.y > boss.y && s.y < boss.y+boss.size;
            if (hit) { boss.hp--; let p=worldToViewport(s.x,s.y); createExplosion(p.x,p.y,4,[[200,0,255],[255,100,255]]); }
            return !hit;
        });
        if (boss.hp <= 0) {
            gameWon = true; gameOver = true;
            newGamePlusUnlocked = true;
            let p = worldToViewport(boss.x+boss.size/2, boss.y+boss.size/2);
            for (let i=0;i<5;i++) setTimeout(()=>createExplosion(p.x+(Math.random()-0.5)*100,p.y+(Math.random()-0.5)*100,20),i*150);
        }
    }

    if (level !== 3 && enemies.every(e => !e.alive)) {
        showUpgradeMenu();
        if (level === 1) { generatePassword(); level = 2; createEnemies(); showLevelBanner("SEMESTRE 2"); }
        else if (level === 2) { level = 3; createBoss(); startBossDialogue(); }
    }
}

// ================== DRAWING ==================
function drawEnemyShip(x, y, nome, animT) {
    ctx.save(); ctx.translate(x, y);
    const wingBob = Math.sin(animT) * 3;
    ctx.shadowColor = "red"; ctx.shadowBlur = 8;
    ctx.fillStyle = "#f44";
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(15, -10); ctx.lineTo(-15, -10); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fa0";
    ctx.fillRect(-20, 0+wingBob, 10, 8); ctx.fillRect(10, 0-wingBob, 10, 8);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "center";
    ctx.fillText(nome, x, y - 16); ctx.textAlign = "left";
}

function drawShipCustom(context, lvl) {
    if (lvl === 5) {
        if (ueceShipImg.complete && ueceShipImg.naturalWidth > 0) {
            context.drawImage(ueceShipImg, -30, -35, 60, 70);
        } else {
            context.fillStyle = `hsl(${Math.random()*30+10}, 100%, 60%)`;
            context.fillRect(-4, 20, 8, 6 + Math.random()*8);
            context.fillStyle = "#ffd700";
            context.beginPath(); context.moveTo(0, -35); context.lineTo(22, 20); context.lineTo(-22, 20); context.closePath(); context.fill();
            context.shadowColor = "gold"; context.shadowBlur = 12;
            context.fillStyle = "#ff0";
            context.fillRect(-30, 0, 10, 25); context.fillRect(20, 0, 10, 25);
            context.fillStyle = "lime";
            context.beginPath(); context.moveTo(0, -45); context.lineTo(10, -20); context.lineTo(-10, -20); context.fill();
            context.fillStyle = "#0ff";
            context.fillRect(-16, -30, 4, 8);
            context.fillRect(12, -30, 4, 8);
            context.shadowBlur = 0;
        }
        context.fillStyle = `hsl(${40 + Math.random()*20}, 100%, ${50 + Math.random()*30}%)`;
        context.fillRect(-6, 20, 12, 8 + Math.random()*10);
        return;
    }

    context.fillStyle = `hsl(${Math.random()*30+10}, 100%, 60%)`;
    context.fillRect(-4, 20, 8, 6 + Math.random()*8);
    context.fillStyle = "#fff";
    context.beginPath(); context.moveTo(0, -30); context.lineTo(20, 20); context.lineTo(-20, 20); context.closePath(); context.fill();
    context.shadowColor = "cyan"; context.shadowBlur = lvl * 4;
    if (lvl >= 2) { context.fillStyle = "cyan"; context.fillRect(-30, 0, 10, 25); context.fillRect(20, 0, 10, 25); }
    if (lvl >= 3) { context.fillStyle = "lime"; context.beginPath(); context.moveTo(0, -40); context.lineTo(10, -20); context.lineTo(-10, -20); context.fill(); }
    if (lvl === 4) { context.fillStyle = "orange"; context.fillRect(-5, 20, 10, 30); context.beginPath(); context.arc(0, 0, 10, 0, Math.PI*2); context.fill(); context.fillRect(-40, 10, 15, 10); context.fillRect(25, 10, 15, 10); }
    context.shadowBlur = 0;
}

function drawShip() { drawShipCustom(ctx, shipLevel); }

function drawLaser(x, y, color = "red", direction = "up") {
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    if (direction === "up") ctx.fillRect(-2, -14, 4, 14); else ctx.fillRect(-2, 0, 4, 14);
    ctx.fillStyle = "white";
    if (direction === "up") ctx.fillRect(-1, -14, 2, 14); else ctx.fillRect(-1, 0, 2, 14);
    ctx.shadowBlur = 0; ctx.restore();
}

function drawCoinAnimations() {
    coinAnimations.forEach(c => {
        const t = c.progress;
        const x = c.x + (c.targetX - c.x) * t;
        const y = c.y + (c.targetY - c.y) * t;
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = "#ff0"; ctx.font = "16px 'Courier New'"; ctx.textAlign = "center";
        ctx.fillText("💰", x, y);
    });
    ctx.globalAlpha = 1; ctx.textAlign = "left";
}

// ================== MAIN DRAW ==================
function draw() {
    if (!gameStarted) return;

    ctx.save();
    if (screenShake > 0) ctx.translate((Math.random()-0.5)*screenShake*2, (Math.random()-0.5)*screenShake*2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (!gameOver || explosions.length > 0) {
        imgData = new ImageData(canvas.width, canvas.height);

        shots.forEach(s => { let p1=worldToViewport(s.x,s.y), p2=worldToViewport(s.x,s.y-10); drawLine(p1.x,p1.y,p2.x,p2.y,[0,255,255]); });
        enemyShots.forEach(s => { let p1=worldToViewport(s.x,s.y), p2=worldToViewport(s.x,s.y+10); drawLine(p1.x,p1.y,p2.x,p2.y,[255,0,0]); });

        drawDeathSpins();

        shots.forEach(s => { let p=worldToViewport(s.x,s.y-12); drawCircleMidpoint(p.x,p.y,3,[0,255,255,200]); });
        enemyShots.forEach(s => { let p=worldToViewport(s.x,s.y+12); drawEllipseMidpoint(p.x,p.y,4,2,[255,80,80,200]); });

        if (level === 3 && boss) {
            let bossVP = worldToViewport(boss.x, boss.y);
            drawBossPixelArt(bossVP.x, bossVP.y, boss.size);
        }

        renderPixels();

        const laserColor = shipLevel === 5 ? "gold" : "cyan";
        shots.forEach(s => { let p=worldToViewport(s.x,s.y); drawLaser(p.x,p.y,laserColor,"up"); });
        enemyShots.forEach(s => { let p=worldToViewport(s.x,s.y); drawLaser(p.x,p.y,"red","down"); });

        if (level === 3 && boss) {
            let pBar=worldToViewport(boss.x,boss.y-20);
            ctx.fillStyle="#333"; ctx.fillRect(pBar.x,pBar.y,boss.size,12);
            ctx.fillStyle="#f0f"; ctx.fillRect(pBar.x,pBar.y,(boss.hp/boss.maxHp)*boss.size,12);
            ctx.strokeStyle="#fff"; ctx.strokeRect(pBar.x,pBar.y,boss.size,12);
            ctx.fillStyle="#fff"; ctx.font="10px 'Courier New'"; ctx.textAlign="center";
            ctx.fillText(boss.hp+"/"+boss.maxHp,pBar.x+boss.size/2,pBar.y+10); ctx.textAlign="left";
        }

        if (level !== 3) {
            enemies.forEach(e => { if (e.alive) { let p=worldToViewport(e.x+20,e.y+20); drawEnemyShip(p.x,p.y,e.nome,e.animT||0); } });
        }

        ctx.save(); let p=worldToViewport(player.x,player.y); ctx.translate(p.x,p.y); drawShip(); ctx.restore();

        drawExplosions();
        drawCoinAnimations();

        if (damageFlash > 0) { ctx.fillStyle=`rgba(255,0,0,${damageFlash*0.03})`; ctx.fillRect(0,0,canvas.width,canvas.height); }

        if (levelBanner.timer > 0) {
            const alpha = Math.min(1, levelBanner.timer / 30);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = isNewGamePlus ? "#ff0" : "#0ff";
            ctx.font = "bold 40px 'Courier New'";
            ctx.textAlign = "center";
            ctx.shadowColor = isNewGamePlus ? "#ff0" : "#0ff"; ctx.shadowBlur = 20;
            ctx.fillText(levelBanner.text, canvas.width/2, canvas.height/2);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = "left";
        }
    }

    if (showingUpgrade) drawUpgradeMenu();
    if (showingBossDialogue) drawBossDialogue();

    if (gameOver && !showingUpgrade) {
        if (gameWon) drawEndScreen("FORMADO 🎓", "Você sobreviveu à universidade!", "#0f0");
        else drawEndScreen("REPROVADO 💀", "A universidade venceu...", "#f44");
    }

    ctx.restore();
    drawMinimap();
    updateSidebar();
}

// ================== INPUT - RESTART / MENU ==================
document.addEventListener("keydown", e => {
    if ((e.key === "r" || e.key === "R") && gameStarted) startGame();
    if ((e.key === "m" || e.key === "M") && gameOver && gameWon) returnToMenu();
});

// ================== GAME LOOP ==================
function loop() { update(); draw(); requestAnimationFrame(loop); }

// ================== MENU FUNCTIONS ==================
function toggleInfo() {
    const info = document.getElementById("infoBox"), shop = document.getElementById("shopBox");
    const passArea = document.getElementById("passwordArea");
    const opening = info.style.display === "none";
    info.style.display = opening ? "block" : "none";
    shop.style.display = "none";
    passArea.style.display = opening ? "none" : "block";
}
function toggleShop() {
    const info = document.getElementById("infoBox"), shop = document.getElementById("shopBox");
    const passArea = document.getElementById("passwordArea");
    const opening = shop.style.display === "none";
    shop.style.display = opening ? "block" : "none";
    info.style.display = "none";
    passArea.style.display = opening ? "none" : "block";
    if (opening) { drawShipPreview("ship1",1); drawShipPreview("ship2",2); drawShipPreview("ship3",3); drawShipPreview("ship4",4); }
}
function drawShipPreview(canvasId, lvl) {
    const c = document.getElementById(canvasId); if (!c) return;
    const ctx2 = c.getContext("2d"); ctx2.clearRect(0,0,c.width,c.height);
    ctx2.save(); ctx2.translate(c.width/2,c.height/2); ctx2.scale(0.8,0.8); drawShipCustom(ctx2,lvl); ctx2.restore();
}
function setDifficulty(lvl) {
    difficulty = lvl;
    document.querySelectorAll("[id^=btn-]").forEach(b => b.classList.remove("active-diff"));
    document.getElementById("btn-" + lvl).classList.add("active-diff");
}

// ================== MENU ANIMATED SHIPS ==================
const menuShipCanvas1 = document.getElementById("menu-ship-canvas");
const menuShipCanvas2 = document.getElementById("menu-ship-canvas2");
let menuShipAngle = 0;

function drawMenuShips() {
    menuShipAngle += 0.03;

    [menuShipCanvas1, menuShipCanvas2].forEach((c, idx) => {
        if (!c) return;
        const mCtx = c.getContext("2d");
        mCtx.clearRect(0, 0, c.width, c.height);
        mCtx.save();
        mCtx.translate(c.width / 2, c.height / 2);
        const floatY = Math.sin(menuShipAngle * 2 + idx * Math.PI) * 6;
        mCtx.translate(0, floatY);
        const rot = Math.sin(menuShipAngle + idx * Math.PI) * 0.3;
        mCtx.rotate(rot);
        mCtx.scale(0.9, 0.9);
        const shipLvl = idx === 0 ? 1 : 3;
        drawShipCustom(mCtx, shipLvl);
        mCtx.restore();
    });
}

function menuLoop() {
    if (!gameStarted) {
        drawMenuShips();
    }
    requestAnimationFrame(menuLoop);
}
menuLoop();

// ================== INIT ==================
initStarField3D();
initPixels();
loop();