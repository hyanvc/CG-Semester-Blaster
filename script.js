// ============================================================
// 🎮 SEMESTER-BLASTER - Computação Gráfica (VERSÃO DEFINITIVA 100%)
// ============================================================
// REQUISITOS CONTEMPLADOS:
// a) Set Pixel ✅
// b) Primitivas de Rasterização (Linha, Círculo, Elipse) ✅
// c) Preenchimento de Regiões (Flood Fill + Scanline normal e GRADIENTE) ✅
// d) Transformações Geométricas (Rotação, Translação, Escala) ✅
// e) Animação 2D ✅
// f) Janela e Viewport (COM ZOOM DINÂMICO via teclado) ✅
// g) Recorte de Cohen-Sutherland (Clipping) ✅
// h) Mapeamento de Textura (UV Baricêntrico no Boss via buffer) ✅
// i) Input (Teclado) ✅
// j) Menus interativos com primitivas e Flood Fill na abertura ✅
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const minimapCanvas = document.getElementById("minimap-canvas");
const minimapCtx = minimapCanvas.getContext("2d");

let difficulty = "medio";
let fillDone = false;
let logoDrawn = false; 

// ================== NEW GAME+ STATE ==================
let newGamePlusUnlocked = false;
let isNewGamePlus = false;

// ================== PASSWORDS FIXOS POR FASE ==================
const PASSWORDS = { "FASE2": 2, "FASE3": 3, "BOSS1": 3, "TCC00": 3, "SEM02": 2 };

// ================== [REQUISITO F] JANELA E VIEWPORT DINÂMICAS (ZOOM) ==================
let worldCenter = { x: 350, y: 300 };
let zoomLevel = 1.0; 

const world = { xmin: 0, ymin: 0, xmax: 700, ymax: 600 };
const viewport = { xmin: 0, ymin: 0, xmax: canvas.width, ymax: canvas.height };

// Atualiza o Window baseado no Zoom (Teclas Z e X)
function updateWorldWindow() {
    const w = 700 * zoomLevel;
    const h = 600 * zoomLevel;
    world.xmin = worldCenter.x - w / 2;
    world.xmax = worldCenter.x + w / 2;
    world.ymin = worldCenter.y - h / 2;
    world.ymax = worldCenter.y + h / 2;
}

function worldToViewport(x, y) {
    return {
        x: viewport.xmin + (x - world.xmin) * (viewport.xmax - viewport.xmin) / (world.xmax - world.xmin),
        y: viewport.ymin + (y - world.ymin) * (viewport.ymax - viewport.ymin) / (world.ymax - world.ymin)
    };
}

// ================== MATERIAS ==================
const materias = [ "Alg", "Calc1", "Fisic1", "Calc3", "SO", "Grafos", "Automatos", "Comp", "Complex", "PE", "Proj", "Adm" ];

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

// ================== FUNÇÃO MANUAL AUXILIAR (Para não usar ctx.fillRect) ==================
function drawManualRect(rx, ry, rw, rh, color = [255,255,255,255]) {
    rx = Math.floor(rx); ry = Math.floor(ry);
    rw = Math.floor(rw); rh = Math.floor(rh);
    for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) { setPixel(x, y, ...color); }
    }
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

// ================== [REQUISITO B] MIDPOINT CIRCLE & ELLIPSE ==================
function drawCircleMidpoint(cx, cy, radius, color = [255, 255, 255, 255]) {
    cx = Math.floor(cx); cy = Math.floor(cy); radius = Math.floor(radius);
    let x = 0, y = radius, d = 1 - radius;
    function plotCirclePoints(cx, cy, x, y) {
        setPixel(cx + x, cy + y, ...color); setPixel(cx - x, cy + y, ...color);
        setPixel(cx + x, cy - y, ...color); setPixel(cx - x, cy - y, ...color);
        setPixel(cx + y, cy + x, ...color); setPixel(cx - y, cy + x, ...color);
        setPixel(cx + y, cy - x, ...color); setPixel(cx - y, cy - x, ...color);
    }
    plotCirclePoints(cx, cy, x, y);
    while (x < y) { x++; if (d < 0) { d += 2 * x + 1; } else { y--; d += 2 * (x - y) + 1; } plotCirclePoints(cx, cy, x, y); }
}

function drawEllipseMidpoint(cx, cy, rx, ry, color = [255, 255, 255, 255]) {
    cx = Math.floor(cx); cy = Math.floor(cy); rx = Math.floor(rx); ry = Math.floor(ry);
    if (rx <= 0 || ry <= 0) return;
    let x = 0, y = ry;
    let rx2 = rx * rx, ry2 = ry * ry, tworx2 = 2 * rx2, twory2 = 2 * ry2;
    let px = 0, py = tworx2 * y;
    function plotEllipsePoints(cx, cy, x, y) {
        setPixel(cx + x, cy + y, ...color); setPixel(cx - x, cy + y, ...color);
        setPixel(cx + x, cy - y, ...color); setPixel(cx - x, cy - y, ...color);
    }
    let d1 = ry2 - (rx2 * ry) + (0.25 * rx2);
    plotEllipsePoints(cx, cy, x, y);
    while (px < py) { x++; px += twory2; if (d1 < 0) { d1 += ry2 + px; } else { y--; py -= tworx2; d1 += ry2 + px - py; } plotEllipsePoints(cx, cy, x, y); }
    let d2 = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2;
    while (y >= 0) { y--; py -= tworx2; if (d2 > 0) { d2 += rx2 - py; } else { x++; px += twory2; d2 += rx2 - py + px; } plotEllipsePoints(cx, cy, x, y); }
}

// ================== [REQUISITO C] SCANLINE FILL SÓLIDO ==================
function scanlineFillTriangle(x0, y0, x1, y1, x2, y2, color = [255, 200, 0, 255]) {
    let verts = [{x: x0, y: y0}, {x: x1, y: y1}, {x: x2, y: y2}];
    verts.sort((a, b) => a.y - b.y);
    const v0 = verts[0], v1 = verts[1], v2 = verts[2];
    if (v0.y === v2.y) return;

    function interpolateX(yStart, yEnd, xStart, xEnd, y) {
        if (yEnd === yStart) return xStart; return xStart + (xEnd - xStart) * (y - yStart) / (yEnd - yStart);
    }
    const yMin = Math.max(0, Math.floor(v0.y));
    const yMax = Math.min(canvas.height - 1, Math.floor(v2.y));

    for (let y = yMin; y <= yMax; y++) {
        let xA, xB;
        if (y < v1.y) { xA = interpolateX(v0.y, v1.y, v0.x, v1.x, y); xB = interpolateX(v0.y, v2.y, v0.x, v2.x, y); } 
        else { xA = interpolateX(v1.y, v2.y, v1.x, v2.x, y); xB = interpolateX(v0.y, v2.y, v0.x, v2.x, y); }
        if (xA > xB) { let tmp = xA; xA = xB; xB = tmp; }
        const xStart = Math.max(0, Math.floor(xA)); const xEnd = Math.min(canvas.width - 1, Math.floor(xB));
        for (let x = xStart; x <= xEnd; x++) { setPixel(x, y, ...color); }
    }
}

// ================== [REQUISITO NOVO!] SCANLINE COM GRADIENTE DE CORES ==================
function scanlineFillTriangleGradient(v0, v1, v2) {
    let verts = [v0, v1, v2].sort((a, b) => a.y - b.y);
    const p0 = verts[0], p1 = verts[1], p2 = verts[2];
    if (p0.y === p2.y) return;

    function interp(s, e, t) { return s + (e - s) * t; }
    function interpColor(c1, c2, t) {
        return [ Math.floor(interp(c1[0], c2[0], t)), Math.floor(interp(c1[1], c2[1], t)), Math.floor(interp(c1[2], c2[2], t)), 255 ];
    }

    const yMin = Math.max(0, Math.floor(p0.y));
    const yMax = Math.min(canvas.height - 1, Math.floor(p2.y));

    for (let y = yMin; y <= yMax; y++) {
        let xA, xB, cA, cB;
        if (y < p1.y) {
            let tA = (y - p0.y) / (p1.y - p0.y || 1); let tB = (y - p0.y) / (p2.y - p0.y || 1);
            xA = interp(p0.x, p1.x, tA); xB = interp(p0.x, p2.x, tB);
            cA = interpColor(p0.color, p1.color, tA); cB = interpColor(p0.color, p2.color, tB);
        } else {
            let tA = (y - p1.y) / (p2.y - p1.y || 1); let tB = (y - p0.y) / (p2.y - p0.y || 1);
            xA = interp(p1.x, p2.x, tA); xB = interp(p0.x, p2.x, tB);
            cA = interpColor(p1.color, p2.color, tA); cB = interpColor(p0.color, p2.color, tB);
        }
        if (xA > xB) { let tX=xA; xA=xB; xB=tX; let tC=cA; cA=cB; cB=tC; }

        const xStart = Math.max(0, Math.floor(xA));
        const xEnd = Math.min(canvas.width - 1, Math.floor(xB));

        for (let x = xStart; x <= xEnd; x++) {
            let tX = (x - xA) / (xB - xA || 1);
            let fc = interpColor(cA, cB, tX);
            setPixel(x, y, fc[0], fc[1], fc[2], fc[3]);
        }
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
    scanlineFillTriangle(r0.x, r0.y, r1.x, r1.y, r2.x, r2.y, color);
}

// ================== DEATH SPIN ==================
let deathSpins = [];
function createDeathSpin(x, y) { deathSpins.push({ x, y, angle: 0, timer: 0, maxTimer: 25, size: 15, color: [255, 80, 0, 255] }); }
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
    if (accept) return [x0, y0, x1, y1]; return null;
}

// ================== [REQUISITO B] BRESENHAM LINE ==================
function drawLine(x0, y0, x1, y1, color = [255, 255, 0, 255]) {
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

// ================== [REQUISITO H] MAPEAMENTO DE TEXTURA (BOSS) ==================
function edgeFunction(a, b, c) { return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x); }

function drawTexturedTriangle(v0, v1, v2, textureData) {
    let minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
    let maxX = Math.min(canvas.width - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
    let minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
    let maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));
    let area = edgeFunction(v0, v1, v2);
    if (area === 0) return;

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            let p = {x: x, y: y};
            let w0 = edgeFunction(v1, v2, p), w1 = edgeFunction(v2, v0, p), w2 = edgeFunction(v0, v1, p);
            if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) {
                let nw0 = w0 / area, nw1 = w1 / area, nw2 = w2 / area;
                let u = nw0 * v0.u + nw1 * v1.u + nw2 * v2.u;
                let v = nw0 * v0.v + nw1 * v1.v + nw2 * v2.v;
                let texX = Math.max(0, Math.min(textureData.width - 1, Math.floor(u * textureData.width)));
                let texY = Math.max(0, Math.min(textureData.height - 1, Math.floor(v * textureData.height)));
                let texIndex = (texX + texY * textureData.width) * 4;
                let a = textureData.data[texIndex + 3];
                if (a > 50) setPixel(x, y, textureData.data[texIndex], textureData.data[texIndex+1], textureData.data[texIndex+2], a);
            }
        }
    }
}

// ================== INPUT ==================
let keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// ================== GAME STATE ==================
let player = { x: 350, y: 550 };
let shots = [], enemyShots = [], enemies = [], boss = null;
let score = 0, level = 1, gameStarted = false, gameOver = false;
let playerLife = 12, coins = 0, coinAnimations = [];
let fireCooldown = 0, fireRate = 40, shipLevel = 1;
let showingUpgrade = false, gameWon = false;

// ================== STARFIELD 3D (Desenhado Manualmente!) ==================
const NUM_STARS_3D = 200;
const starField3D = [];
function initStarField3D() { for (let i = 0; i < NUM_STARS_3D; i++) starField3D.push(createStar3D()); }
function createStar3D() {
    return { x: (Math.random() - 0.5) * canvas.width * 2, y: (Math.random() - 0.5) * canvas.height * 2, z: Math.random() * canvas.width, pz: 0, color: [200, 200, 255] };
}
let warpSpeed = 8;
let explosions = [];
let screenShake = 0, damageFlash = 0;
let levelBanner = { text: "", timer: 0 };

function createExplosion(x, y, count = 15, colors = null) {
    const cols = colors || [[255,100,0],[255,200,0],[255,255,100],[255,50,0]];
    const particles = Array.from({length: count}, () => {
        const c = cols[Math.random()*cols.length|0];
        return { vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, r:c[0], g:c[1], b:c[2], size: Math.random()*4+1 };
    });
    explosions.push({ x, y, t: 0, maxT: 35, particles });
}

function drawExplosionsManual() {
    explosions.forEach(exp => {
        exp.particles.forEach(p => {
            let px = exp.x + p.vx * exp.t - p.size/2; let py = exp.y + p.vy * exp.t - p.size/2;
            drawManualRect(px, py, p.size, p.size, [p.r, p.g, p.b, 255]);
        });
    });
}

function showLevelBanner(text) { levelBanner.text = text; levelBanner.timer = 120; }

const bgImg = new Image(); bgImg.src = "./space.png";
let bossTextureData = null;
const bossImgReal = new Image(); bossImgReal.src = "./thanos2.png";
bossImgReal.onload = () => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = bossImgReal.width; tempCanvas.height = bossImgReal.height;
    const tempCtx = tempCanvas.getContext("2d"); tempCtx.drawImage(bossImgReal, 0, 0);
    bossTextureData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
};

let bgOffset = 0;
function drawBackground() {
    ctx.fillStyle = "#020208"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (bgImg.complete && bgImg.naturalWidth > 0) {
        bgOffset += 0.8; ctx.globalAlpha = 0.15;
        ctx.drawImage(bgImg, 0, bgOffset % canvas.height, canvas.width, canvas.height);
        ctx.drawImage(bgImg, 0, (bgOffset % canvas.height) - canvas.height, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
    }
}

function drawStarFieldManual() {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    warpSpeed = level === 3 ? 12 : 8;
    for (let i = 0; i < starField3D.length; i++) {
        const star = starField3D[i];
        star.pz = star.z; star.z -= warpSpeed;
        if (star.z <= 0) { star.x = (Math.random()-0.5)*canvas.width*2; star.y = (Math.random()-0.5)*canvas.height*2; star.z = canvas.width; star.pz = star.z; continue; }
        const sx = (star.x/star.z)*canvas.width*0.5+cx, sy = (star.y/star.z)*canvas.height*0.5+cy;
        const px = (star.x/star.pz)*canvas.width*0.5+cx, py = (star.y/star.pz)*canvas.height*0.5+cy;
        if (sx<0||sx>canvas.width||sy<0||sy>canvas.height) continue;
        drawLine(px, py, sx, sy, [star.color[0], star.color[1], star.color[2], 255]); // Estrelas desenhadas manualmente!
    }
}

function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; let pass = "";
    for (let i = 0; i < 5; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    localStorage.setItem("gamePassword", pass);
}

function createEnemies() {
    enemies = [];
    let linhas = difficulty === "facil" ? 5 : difficulty === "medio" ? 10 : 15;
    const hpMult = isNewGamePlus ? 2 : 1, speedMult = isNewGamePlus ? 1.3 : 1;
    for (let i = 0; i < linhas; i++) {
        for (let j = 0; j < 4; j++) {
            enemies.push({ x: 80 + j * 70, y: -Math.random() * 300, alive: true, hp: 1 * hpMult, cooldown: 0, speed: (0.5 + Math.random() * 0.3) * speedMult, nome: materias[Math.floor(Math.random() * materias.length)], animT: Math.random() * Math.PI * 2 });
        }
    }
}

function createBoss() { const hpMult = isNewGamePlus ? 2 : 1; boss = { x:200, y:80, size:200, hp:150*hpMult, maxHp:150*hpMult, cooldown:0, direction:1 }; }

// ================== BOSS DIALOGUE ==================
let showingBossDialogue = false, bossDialoguePhase = 0, bossDialogueTimer = 0;
const bossDialogueLines = [ "💀 THANOS-TCC:", "", "\"Achou que ia escapar, moleque?\"", "", "\"Dessa vez não tem jeito...\"", "", "\"VAI PASSAR 10 ANOS NA UECE!\"", "", "\"Seu diploma? INEXISTENTE.\"" ];
function startBossDialogue() { showingBossDialogue = true; bossDialoguePhase = 0; bossDialogueTimer = 0; }

function drawBossDialogue() {
    ctx.fillStyle = "rgba(0,0,0,0.92)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const boxX = 50, boxY = 120, boxW = canvas.width - 100, boxH = 350;
    ctx.fillStyle = "#0a0014"; ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = "#a020f0"; ctx.lineWidth = 3; ctx.strokeRect(boxX, boxY, boxW, boxH);
    const visibleLines = Math.min(bossDialogueLines.length, Math.floor(bossDialoguePhase));
    ctx.textAlign = "center";
    for (let i = 0; i < visibleLines; i++) {
        const line = bossDialogueLines[i];
        if (i === 0) { ctx.fillStyle = "#f0f"; ctx.font = "bold 22px 'Courier New'"; }
        else if (line.startsWith("\"VAI")) { ctx.fillStyle = "#ff2020"; ctx.font = "bold 26px 'Courier New'"; }
        else { ctx.fillStyle = "#ddd"; ctx.font = "18px 'Courier New'"; }
        ctx.fillText(line, canvas.width / 2, boxY + 50 + i * 32);
    }
    if (visibleLines >= bossDialogueLines.length) { ctx.fillText("Pressione ESPAÇO ou ENTER", canvas.width / 2, boxY + boxH - 5); }
    ctx.textAlign = "left"; bossDialogueTimer++;
    if (bossDialoguePhase < bossDialogueLines.length) { bossDialoguePhase += 0.06; }
}

function handleBossDialogueInput(e) {
    if (!showingBossDialogue) return;
    if (bossDialoguePhase < bossDialogueLines.length) { bossDialoguePhase = bossDialogueLines.length; } 
    else if (e.key === " " || e.key === "Enter") { showingBossDialogue = false; }
}
document.addEventListener("keydown", e => { if (showingBossDialogue) { handleBossDialogueInput(e); return; } });

// ================== UPGRADE MENU ==================
let upgradeOptions = [];
function showUpgradeMenu() {
    showingUpgrade = true;
    upgradeOptions = [ { label: "Nave 2 (+Vel)", cost: 10, lvl: 2, rate: 25 }, { label: "Nave 3 (Rápida)", cost: 20, lvl: 3, rate: 10 }, { label: "Nave 4 (Auto)", cost: 30, lvl: 4, rate: 8 }, { label: "Continuar →", cost: 0, lvl: 0, rate: 0 } ];
}

function drawUpgradeMenu() {
    ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0ff"; ctx.font = "bold 32px 'Courier New'"; ctx.textAlign = "center"; ctx.fillText("⬆ UPGRADE ⬆", canvas.width/2, 120);
    ctx.fillStyle = "#fff"; ctx.font = "18px 'Courier New'"; ctx.fillText("Moedas: " + coins, canvas.width/2, 160);
    upgradeOptions.forEach((opt, i) => {
        const bx = canvas.width/2 - 150, by = 200 + i * 70, bw = 300, bh = 50, canBuy = coins >= opt.cost || opt.cost === 0;
        ctx.fillStyle = canBuy ? "#1a1a2e" : "#0a0a15"; ctx.strokeStyle = canBuy ? "#0ff" : "#333"; ctx.lineWidth = 2;
        ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = canBuy ? "#fff" : "#555"; ctx.font = "16px 'Courier New'"; ctx.textAlign = "center";
        const costText = opt.cost > 0 ? ` [${opt.cost}💰]` : "";
        ctx.fillText(`[${i+1}] ${opt.label}${costText}`, canvas.width/2, by + 32);
    });
    ctx.fillStyle = "#888"; ctx.font = "14px 'Courier New'"; ctx.fillText("Pressione 1, 2, 3 ou 4", canvas.width/2, 500); ctx.textAlign = "left";
}

function handleUpgradeInput(key) {
    if (!showingUpgrade) return;
    const idx = parseInt(key) - 1; if (idx < 0 || idx >= upgradeOptions.length) return;
    const opt = upgradeOptions[idx]; if (opt.cost > 0 && coins < opt.cost) return;
    if (opt.lvl > 0) { shipLevel = opt.lvl; fireRate = opt.rate; coins -= opt.cost; }
    showingUpgrade = false;
}
document.addEventListener("keydown", e => { if (showingUpgrade) { handleUpgradeInput(e.key); return; } });

// ================== END SCREEN ==================
function drawEndScreen(title, subtitle, color) {
    ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center"; ctx.fillStyle = color; ctx.font = "bold 48px 'Courier New'"; ctx.shadowColor = color; ctx.shadowBlur = 30;
    ctx.fillText(title, canvas.width/2, canvas.height/2 - 40); ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff"; ctx.font = "20px 'Courier New'"; ctx.fillText(subtitle, canvas.width/2, canvas.height/2 + 5);
    ctx.fillText("Score: " + score + " | Moedas: " + coins, canvas.width/2, canvas.height/2 + 40);
    ctx.fillStyle = "#aaa"; ctx.font = "16px 'Courier New'"; ctx.fillText("Pressione R para reiniciar", canvas.width/2, canvas.height/2 + 80);
    if (gameWon && !isNewGamePlus) { ctx.fillStyle = "#ff0"; ctx.font = "bold 16px 'Courier New'"; ctx.fillText("🌟 Pressione M para voltar ao MENU → NOVO GAME+ 🌟", canvas.width/2, canvas.height/2 + 115); } 
    else if (gameWon && isNewGamePlus) { ctx.fillStyle = "#f0f"; ctx.font = "bold 16px 'Courier New'"; ctx.fillText("🏆 MESTRE DA UECE! Completou o NG+! 🏆", canvas.width/2, canvas.height/2 + 115); }
    ctx.textAlign = "left";
}

function returnToMenu() {
    gameStarted = false; gameOver = false; gameWon = false; logoDrawn = false; zoomLevel = 1.0; updateWorldWindow();
    document.getElementById("sidebar").classList.remove("active"); document.getElementById("game-container").classList.remove("playing");
    document.getElementById("menu").style.display = "block"; canvas.style.display = "block";
    if (newGamePlusUnlocked) { document.getElementById("btn-ngplus").style.display = "inline-block"; }
}

function startGame() {
    document.getElementById("menu").style.display = "none"; document.getElementById("sidebar").classList.add("active"); document.getElementById("game-container").classList.add("playing");
    canvas.style.display = "block"; gameStarted = true; gameOver = false; gameWon = false; isNewGamePlus = false; zoomLevel = 1.0; updateWorldWindow();
    score = 0; coins = 0; shipLevel = 1; fireRate = 40; playerLife = 12; level = 1; boss = null;
    shots = []; enemyShots = []; explosions = []; deathSpins = []; player = { x: 350, y: 550 };
    const inputPass = document.getElementById("passwordInput").value.trim().toUpperCase(); let startLevel = 1;
    if (PASSWORDS[inputPass]) startLevel = PASSWORDS[inputPass];
    const savedPass = localStorage.getItem("gamePassword"); if (savedPass && inputPass === savedPass) startLevel = 2;
    level = startLevel;
    if (level === 3) { enemies = []; createBoss(); startBossDialogue(); } else if (level === 2) { createEnemies(); showLevelBanner("SEMESTRE 2"); } else { createEnemies(); showLevelBanner("SEMESTRE 1"); }
    initPixels();
}

function startNewGamePlus() {
    document.getElementById("menu").style.display = "none"; document.getElementById("sidebar").classList.add("active"); document.getElementById("game-container").classList.add("playing");
    canvas.style.display = "block"; gameStarted = true; gameOver = false; gameWon = false; isNewGamePlus = true; zoomLevel = 1.0; updateWorldWindow();
    score = 0; coins = 0; shipLevel = 5; fireRate = 3; playerLife = 15; level = 1; boss = null;
    shots = []; enemyShots = []; explosions = []; deathSpins = []; player = { x: 350, y: 550 };
    createEnemies(); initPixels(); showLevelBanner("🌟 NOVO GAME+ 🌟");
}

function drawMinimap() {
    const mCtx = minimapCtx, mW = minimapCanvas.width, mH = minimapCanvas.height;
    mCtx.fillStyle = "#0a0a18"; mCtx.fillRect(0, 0, mW, mH); mCtx.strokeStyle = "rgba(0,255,255,0.1)"; mCtx.lineWidth = 0.5;
    for (let i = 0; i < mW; i += 20) { mCtx.beginPath(); mCtx.moveTo(i, 0); mCtx.lineTo(i, mH); mCtx.stroke(); }
    for (let i = 0; i < mH; i += 20) { mCtx.beginPath(); mCtx.moveTo(0, i); mCtx.lineTo(mW, i); mCtx.stroke(); }
    function toMini(x, y) { return { x: (x/700)*mW, y: (y/600)*mH }; }
    enemies.forEach(e => { if (!e.alive) return; let pos=toMini(e.x,e.y); mCtx.fillStyle="#f44"; mCtx.fillRect(pos.x-1.5,pos.y-1.5,3,3); });
    if (boss) { let b=toMini(boss.x+boss.size/2,boss.y+boss.size/2); mCtx.fillStyle="#f0f"; mCtx.fillRect(b.x-4,b.y-4,8,8); }
    let p = toMini(player.x, player.y); const pulse = 0.5 + Math.sin(Date.now()*0.005)*0.5;
    mCtx.fillStyle = isNewGamePlus ? `rgba(255,200,0,${0.5+pulse*0.5})` : `rgba(0,255,255,${0.5+pulse*0.5})`;
    mCtx.beginPath(); mCtx.arc(p.x, p.y, 3+pulse, 0, Math.PI*2); mCtx.fill();
    mCtx.strokeStyle = isNewGamePlus ? "#ff0" : "#0ff"; mCtx.lineWidth = 1; mCtx.strokeRect(0, 0, mW, mH);
}

function updateSidebar() {
    document.getElementById("hud-score").textContent = score; document.getElementById("hud-coins").textContent = coins;
    document.getElementById("hud-level").textContent = level + (isNewGamePlus ? " (NG+)" : "");
    document.getElementById("hud-ship").textContent = shipLevel === 5 ? "UECE 🌟" : "Lv." + shipLevel;
    const maxLife = isNewGamePlus ? 15 : 12, lifeRatio = Math.max(0, playerLife / maxLife), bar = document.getElementById("life-bar");
    bar.style.width = (lifeRatio * 100) + "%"; bar.style.background = lifeRatio > 0.5 ? "#0f0" : lifeRatio > 0.25 ? "#fa0" : "#f00";
    document.getElementById("life-text").textContent = playerLife + "/" + maxLife;
}

// ================== UPDATE ==================
function update() {
    if (!gameStarted || gameOver || showingUpgrade || showingBossDialogue) return;

    // ----- [REQUISITO F] TECLAS DE ZOOM DINÂMICO -----
    if (keys["z"] || keys["Z"]) zoomLevel = Math.max(0.5, zoomLevel - 0.02); // Zoom in
    if (keys["x"] || keys["X"]) zoomLevel = Math.min(2.0, zoomLevel + 0.02); // Zoom out
    updateWorldWindow();

    if (screenShake > 0) screenShake *= 0.9; if (screenShake < 0.5) screenShake = 0;
    if (damageFlash > 0) damageFlash--; if (levelBanner.timer > 0) levelBanner.timer--;

    explosions.forEach(e => e.t++); explosions = explosions.filter(e => e.t < e.maxT);
    updateDeathSpins(); coinAnimations.forEach(c => c.progress += 0.03); coinAnimations = coinAnimations.filter(c => c.progress < 1);

    if (keys["ArrowLeft"] || keys["a"]) player.x -= 5;
    if (keys["ArrowRight"] || keys["d"]) player.x += 5;
    player.x = Math.max(20, Math.min(700 - 20, player.x));

    if (fireCooldown > 0) fireCooldown--;
    if (keys[" "]) {
        if (shipLevel === 5) { if (fireCooldown <= 0) { shots.push({ x: player.x - 14, y: player.y - 40 }); shots.push({ x: player.x + 14, y: player.y - 40 }); fireCooldown = fireRate; } } 
        else if (shipLevel === 4) { if (fireCooldown <= 0) { shots.push({ x: player.x, y: player.y - 40 }); fireCooldown = 8; } } 
        else { if (fireCooldown <= 0) { shots.push({ x: player.x, y: player.y - 40 }); fireCooldown = fireRate; } keys[" "] = false; }
    }

    shots.forEach(s => s.y -= 6); shots = shots.filter(s => s.y > -10);

    enemies.forEach(e => {
        if (!e.alive) return;
        e.y += e.speed; e.animT += 0.04;
        if (e.x > player.x-30 && e.x < player.x+30 && e.y > player.y-30 && e.y < player.y+30) {
            playerLife--; screenShake = 8; damageFlash = 10;
            let p = worldToViewport(player.x, player.y); createExplosion(p.x, p.y, 8, [[255,0,0],[255,100,0]]);
            e.y = -50; e.x = Math.random()*(700-40); if (playerLife <= 0) gameOver = true;
        }
        if (e.y > 620) { e.y = -50; e.x = Math.random()*(700-40); }
    });

    shots = shots.filter(s => {
        let hit = false;
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (e.alive && s.x > e.x && s.x < e.x+40 && s.y > e.y && s.y < e.y+40) {
                e.hp--; hit = true;
                if (e.hp <= 0) {
                    e.alive = false; score++; coins++; let p = worldToViewport(e.x+20, e.y+20);
                    createExplosion(p.x, p.y, 12); createDeathSpin(p.x, p.y);
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
        if (hit) { playerLife--; screenShake = 6; damageFlash = 8; let p = worldToViewport(player.x, player.y); createExplosion(p.x, p.y, 6, [[255,0,0],[255,50,50]]); if (playerLife <= 0) gameOver = true; }
        return !hit && s.y < 600;
    });

    if (level === 3 && boss) {
        boss.x += boss.direction * 2; if (boss.x <= 50 || boss.x+boss.size >= 700-50) boss.direction *= -1; boss.cooldown--;
        if (boss.cooldown <= 0) {
            enemyShots.push({ x: boss.x+boss.size/2, y: boss.y+boss.size });
            if (difficulty === "dificil" || isNewGamePlus) { enemyShots.push({ x: boss.x+boss.size/2-30, y: boss.y+boss.size }); enemyShots.push({ x: boss.x+boss.size/2+30, y: boss.y+boss.size }); }
            boss.cooldown = isNewGamePlus ? 30 : 40;
        }
        shots = shots.filter(s => {
            let hit = s.x > boss.x && s.x < boss.x+boss.size && s.y > boss.y && s.y < boss.y+boss.size;
            if (hit) { boss.hp--; let p=worldToViewport(s.x,s.y); createExplosion(p.x,p.y,4,[[200,0,255],[255,100,255]]); }
            return !hit;
        });
        if (boss.hp <= 0) {
            gameWon = true; gameOver = true; newGamePlusUnlocked = true; let p = worldToViewport(boss.x+boss.size/2, boss.y+boss.size/2);
            for (let i=0;i<5;i++) setTimeout(()=>createExplosion(p.x+(Math.random()-0.5)*100,p.y+(Math.random()-0.5)*100,20),i*150);
        }
    }

    if (level !== 3 && enemies.every(e => !e.alive)) {
        showUpgradeMenu();
        if (level === 1) { generatePassword(); level = 2; createEnemies(); showLevelBanner("SEMESTRE 2"); } else if (level === 2) { level = 3; createBoss(); startBossDialogue(); }
    }
}

// ================== DRAWING MANUAIS ==================
function drawEnemyShipManual(x, y, animT) {
    let bob = Math.floor(Math.sin(animT) * 3);
    scanlineFillTriangle(x, y+20, x+15, y-10, x-15, y-10, [255, 68, 68, 255]); // Corpo
    drawManualRect(x-20, y+bob, 10, 8, [255, 170, 0, 255]); // Motor esq
    drawManualRect(x+10, y-bob, 10, 8, [255, 170, 0, 255]); // Motor dir
}

function drawShipGradientManual(x, y) {
    // REQUISITO PREENCHIMENTO POR GRADIENTE NA NAVE DO JOGADOR
    let v0 = { x: x, y: y-25, color: [0, 255, 255, 255] }; 
    let v1 = { x: x+20, y: y+15, color: [0, 50, 255, 255] }; 
    let v2 = { x: x-20, y: y+15, color: [0, 50, 255, 255] }; 
    scanlineFillTriangleGradient(v0, v1, v2);
    drawManualRect(x-12, y+15, 6, 10, [255, 100, 0, 255]); // turbina
    drawManualRect(x+6, y+15, 6, 10, [255, 100, 0, 255]); // turbina
}

function drawLaserManual(x, y, color) { drawManualRect(x-2, y-14, 4, 14, color); }

function drawCoinAnimations() {
    coinAnimations.forEach(c => {
        const t = c.progress, x = c.x + (c.targetX - c.x) * t, y = c.y + (c.targetY - c.y) * t;
        ctx.globalAlpha = 1 - t; ctx.fillStyle = "#ff0"; ctx.font = "16px 'Courier New'"; ctx.textAlign = "center"; ctx.fillText("💰", x, y);
    });
    ctx.globalAlpha = 1; ctx.textAlign = "left";
}

// ================== MAIN DRAW ==================
function draw() {
    if (!gameStarted) return;

    ctx.save();
    if (screenShake > 0) ctx.translate((Math.random()-0.5)*screenShake*2, (Math.random()-0.5)*screenShake*2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(); // A imagem png de fundo espacial é deixada via canvas nativo (permitido)

    if (!gameOver || explosions.length > 0) {
        imgData = new ImageData(canvas.width, canvas.height); // Zera o buffer (Fundo Transparente)

        drawStarFieldManual(); // Estrelas 3D feitas com rasterização MANUAL de linhas no buffer

        shots.forEach(s => { let p1=worldToViewport(s.x,s.y), p2=worldToViewport(s.x,s.y-10); drawLine(p1.x,p1.y,p2.x,p2.y,[0,255,255,255]); });
        enemyShots.forEach(s => { let p1=worldToViewport(s.x,s.y), p2=worldToViewport(s.x,s.y+10); drawLine(p1.x,p1.y,p2.x,p2.y,[255,0,0,255]); });

        drawDeathSpins();
        
        if (level === 3 && boss) {
            let bossVP = worldToViewport(boss.x, boss.y);
            let bossScale = boss.size * zoomLevel;
            let cx = bossVP.x + bossScale / 2, cy = bossVP.y + bossScale / 2;
            let v0 = { x: cx, y: bossVP.y, u: 0.5, v: 0.0 };
            let v1 = { x: bossVP.x + bossScale, y: cy, u: 1.0, v: 0.5 };
            let v2 = { x: cx, y: bossVP.y + bossScale, u: 0.5, v: 1.0 };
            let v3 = { x: bossVP.x, y: cy, u: 0.0, v: 0.5 };
            drawTexturedTriangle(v0, v1, v3, bossTextureData);
            drawTexturedTriangle(v3, v1, v2, bossTextureData);
            
            // Barra de vida manual no buffer
            let pbX = bossVP.x, pbY = bossVP.y - 20;
            drawManualRect(pbX, pbY, bossScale, 8, [50,50,50,255]);
            drawManualRect(pbX, pbY, (boss.hp/boss.maxHp)*bossScale, 8, [255,0,255,255]);
        }

        const laserColor = shipLevel === 5 ? [255,215,0,255] : [0,255,255,255];
        shots.forEach(s => { let p=worldToViewport(s.x,s.y); drawLaserManual(p.x,p.y,laserColor); });
        enemyShots.forEach(s => { let p=worldToViewport(s.x,s.y); drawLaserManual(p.x,p.y,[255,0,0,255]); });

        if (level !== 3) { enemies.forEach(e => { if (e.alive) { let p=worldToViewport(e.x+20,e.y+20); drawEnemyShipManual(p.x,p.y,e.animT||0); } }); }

        let pPlayer = worldToViewport(player.x,player.y);
        drawShipGradientManual(pPlayer.x, pPlayer.y);

        drawExplosionsManual();

        renderPixels(); // Joga tudo que foi calculado em memória para a tela DE UMA SÓ VEZ

        // Efeitos Overlay (Texto, Dano) que vão por cima do buffer
        if (level !== 3) { // Nome dos inimigos em cima deles (texto não usa raster manual)
            enemies.forEach(e => {
                if (e.alive) {
                    let p=worldToViewport(e.x+20,e.y+20);
                    ctx.fillStyle = "#fff"; ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "center";
                    ctx.fillText(e.nome, p.x, p.y - 16); ctx.textAlign = "left";
                }
            });
        }
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "12px 'Courier New'";
        ctx.fillText("Controles Câmera: Z (Zoom In) | X (Zoom Out)", 10, 20);

        drawCoinAnimations();

        if (damageFlash > 0) { ctx.fillStyle=`rgba(255,0,0,${damageFlash*0.03})`; ctx.fillRect(0,0,canvas.width,canvas.height); }

        if (levelBanner.timer > 0) {
            ctx.globalAlpha = Math.min(1, levelBanner.timer / 30);
            ctx.fillStyle = isNewGamePlus ? "#ff0" : "#0ff"; ctx.font = "bold 40px 'Courier New'"; ctx.textAlign = "center";
            ctx.shadowColor = isNewGamePlus ? "#ff0" : "#0ff"; ctx.shadowBlur = 20;
            ctx.fillText(levelBanner.text, canvas.width/2, canvas.height/2);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = "left";
        }
    }

    if (showingUpgrade) drawUpgradeMenu();
    if (showingBossDialogue) drawBossDialogue();
    if (gameOver && !showingUpgrade) { if (gameWon) drawEndScreen("FORMADO 🎓", "Você sobreviveu à universidade!", "#0f0"); else drawEndScreen("REPROVADO 💀", "A universidade venceu...", "#f44"); }

    ctx.restore(); drawMinimap(); updateSidebar();
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
    const info = document.getElementById("infoBox"), shop = document.getElementById("shopBox"), passArea = document.getElementById("passwordArea");
    const opening = info.style.display === "none"; info.style.display = opening ? "block" : "none"; shop.style.display = "none"; passArea.style.display = opening ? "none" : "block";
}
function toggleShop() {
    const info = document.getElementById("infoBox"), shop = document.getElementById("shopBox"), passArea = document.getElementById("passwordArea");
    const opening = shop.style.display === "none"; shop.style.display = opening ? "block" : "none"; info.style.display = "none"; passArea.style.display = opening ? "none" : "block";
}
function setDifficulty(lvl) {
    difficulty = lvl; document.querySelectorAll("[id^=btn-]").forEach(b => b.classList.remove("active-diff")); document.getElementById("btn-" + lvl).classList.add("active-diff");
}

// ================== TELA DE ABERTURA ACADÊMICA ==================
function drawSideDecoration(cx, cy) {
    // 1. RETA: Desenhando um losango tecnológico ao redor
    drawLine(cx, cy - 70, cx + 60, cy, [0, 255, 255, 255]); // Topo -> Dir
    drawLine(cx + 60, cy, cx, cy + 70, [0, 255, 255, 255]); // Dir -> Base
    drawLine(cx, cy + 70, cx - 60, cy, [0, 255, 255, 255]); // Base -> Esq
    drawLine(cx - 60, cy, cx, cy - 70, [0, 255, 255, 255]); // Esq -> Topo

    // 2. ELIPSE: Anéis do planeta
    drawEllipseMidpoint(cx, cy, 75, 18, [255, 0, 255, 255]); // Anel externo

    // 3. CÍRCULO: Planeta principal
    drawCircleMidpoint(cx, cy, 35, [255, 255, 0, 255]); 

    // Reta cortando o planeta (equador)
    drawLine(cx - 35, cy, cx + 35, cy, [255, 100, 0, 255]);

    // 4. FLOOD FILL: Pintando as áreas delimitadas
    // Pintando o planeta (dividido pela reta do equador)
    floodFill(cx, cy - 15, [255, 200, 0, 255]); // Metade superior (Amarelo)
    floodFill(cx, cy + 15, [200, 100, 0, 255]); // Metade inferior (Laranja)
    
    // Pintando as pontas dos anéis
    floodFill(cx - 55, cy, [100, 0, 150, 255]); // Anel esquerdo (Roxo)
    floodFill(cx + 55, cy, [100, 0, 150, 255]); // Anel direito (Roxo)
}

function drawAcademicLogo() {  
    // Desenha o módulo na ESQUERDA (X = 100)
    drawSideDecoration(100, 280);
    
    // Desenha o módulo na DIREITA (X = 600)
    drawSideDecoration(600, 280);
}

function menuLoop() {
    if (!gameStarted) {
        if (!logoDrawn && canvas.style.display !== "none") {
            ctx.clearRect(0, 0, canvas.width, canvas.height); drawBackground(); 
            initPixels(); drawAcademicLogo(); renderPixels(); logoDrawn = true; 
        }
    }
    requestAnimationFrame(menuLoop);
}

// ================== INIT ==================
canvas.style.display = "block"; 
initStarField3D(); initPixels(); loop(); menuLoop();