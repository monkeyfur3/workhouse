const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const frame = document.querySelector('.game-frame');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const statusText = document.querySelector('#statusText');
const speedText = document.querySelector('#speedText');
const startPanel = document.querySelector('#startPanel');
const panelTitle = document.querySelector('#panelTitle');
const panelCopy = document.querySelector('#panelCopy');
const startButton = document.querySelector('#startButton');
const soundButton = document.querySelector('#soundButton');

let width = 0, height = 0, dpr = 1, lastTime = 0, animationId;
let state = 'ready';
let score = 0;
let best = Number(localStorage.getItem('wildlight-best') || 0);
let speed = 6;
let spawnTimer = 0;
let shardTimer = 0;
let groundOffset = 0;
let muted = false;
let audioContext;
const obstacles = [];
const shards = [];
const particles = [];
const stars = Array.from({ length: 44 }, (_, i) => ({ x: (i * 83) % 1000, y: 30 + ((i * 47) % 190), r: i % 5 === 0 ? 2 : 1, a: .18 + (i % 4) * .08 }));
const player = { x: 95, y: 0, w: 38, h: 47, vy: 0, grounded: true, run: 0 };

bestEl.textContent = String(best).padStart(5, '0');

function resize() {
  const rect = frame.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width; height = rect.height;
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  player.x = Math.max(42, width * .12);
  if (player.grounded || state === 'ready') player.y = groundY() - player.h;
}
function groundY() { return height * .78; }
function formatScore(value) { return String(Math.floor(value)).padStart(5, '0'); }
function setPanel(title, copy, button) {
  panelTitle.textContent = title; panelCopy.textContent = copy; startButton.querySelector('span').textContent = button;
}
function reset() {
  score = 0; speed = 6; spawnTimer = 520; shardTimer = 900; groundOffset = 0;
  obstacles.length = 0; shards.length = 0; particles.length = 0;
  player.vy = 0; player.grounded = true; player.run = 0; player.y = groundY() - player.h;
  scoreEl.textContent = formatScore(score); speedText.textContent = '速度 1.0x';
}
function startGame() {
  reset(); state = 'playing'; startPanel.classList.add('is-hidden'); statusText.textContent = '奔跑中'; playTone(260, .04, 'sine');
}
function endGame() {
  state = 'gameover';
  const finalScore = Math.floor(score);
  if (finalScore > best) { best = finalScore; localStorage.setItem('wildlight-best', best); bestEl.textContent = formatScore(best); }
  setPanel('風停在這裡', `你穿越了 ${formatScore(finalScore)} 公尺的荒原。`, '再跑一次');
  startPanel.classList.remove('is-hidden'); statusText.textContent = '旅程結束'; playTone(110, .18, 'sawtooth');
  burst(player.x + player.w / 2, player.y + player.h / 2, '#f17a62', 16);
}
function jump() {
  if (state !== 'playing') { startGame(); return; }
  if (player.grounded) { player.vy = -13.5; player.grounded = false; playTone(420, .05, 'square'); }
}
function togglePause() {
  if (state === 'playing') { state = 'paused'; statusText.textContent = '已暫停'; setPanel('風仍在吹', '準備好後，回到這段光裡。', '繼續奔跑'); startPanel.classList.remove('is-hidden'); }
  else if (state === 'paused') { state = 'playing'; startPanel.classList.add('is-hidden'); statusText.textContent = '奔跑中'; }
}
function spawnObstacle() {
  const type = Math.random() > .52 ? 'spire' : 'bush';
  const h = type === 'spire' ? 39 + Math.random() * 19 : 24 + Math.random() * 13;
  obstacles.push({ x: width + 30, y: groundY() - h, w: type === 'spire' ? 25 : 43, h, type });
}
function spawnShard() {
  shards.push({ x: width + 20, y: groundY() - 85 - Math.random() * 80, r: 7, spin: Math.random() * 6 });
}
function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) particles.push({ x, y, vx: (Math.random() - .5) * 5, vy: (Math.random() - .7) * 5, life: .4 + Math.random() * .4, color });
}
function update(dt) {
  if (state !== 'playing') return;
  const step = dt / 16.67;
  score += speed * .014 * step; speed = Math.min(11, 6 + score / 480);
  groundOffset = (groundOffset + speed * step) % 48; player.run += .18 * step;
  player.vy += .7 * step; player.y += player.vy * step;
  if (player.y >= groundY() - player.h) { player.y = groundY() - player.h; player.vy = 0; player.grounded = true; }
  spawnTimer -= dt; shardTimer -= dt;
  if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = Math.max(590, 1150 - score * 1.1) + Math.random() * 480; }
  if (shardTimer <= 0) { spawnShard(); shardTimer = 1250 + Math.random() * 1600; }
  obstacles.forEach(o => o.x -= speed * step); shards.forEach(s => { s.x -= speed * step; s.spin += .08 * step; });
  for (let i = obstacles.length - 1; i >= 0; i--) if (obstacles[i].x + obstacles[i].w < -30) obstacles.splice(i, 1);
  for (let i = shards.length - 1; i >= 0; i--) { if (shards[i].x < -20) shards.splice(i, 1); else if (hit(player, { x: shards[i].x - shards[i].r, y: shards[i].y - shards[i].r, w: shards[i].r * 2, h: shards[i].r * 2 })) { score += 35; burst(shards[i].x, shards[i].y, '#d5e56d', 8); shards.splice(i, 1); playTone(720, .06, 'sine'); } }
  obstacles.forEach(o => { if (hit(player, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 3 })) endGame(); });
  particles.forEach(p => { p.x += p.vx * step; p.y += p.vy * step; p.vy += .16 * step; p.life -= .025 * step; });
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
  scoreEl.textContent = formatScore(score); speedText.textContent = `速度 ${(speed / 6).toFixed(1)}x`;
}
function hit(a, b) { return a.x + 7 < b.x + b.w && a.x + a.w - 8 > b.x && a.y + 6 < b.y + b.h && a.y + a.h - 3 > b.y; }
function draw() {
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, '#294246'); sky.addColorStop(1, '#738579'); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  drawSky(); drawTerrain(); shards.forEach(drawShard); obstacles.forEach(drawObstacle); drawPlayer(); particles.forEach(drawParticle);
}
function drawSky() {
  ctx.fillStyle = '#e9cf9a'; ctx.globalAlpha = .82; ctx.beginPath(); ctx.arc(width * .78, height * .21, 44, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  stars.forEach(s => { ctx.fillStyle = `rgba(239,242,231,${s.a})`; ctx.fillRect((s.x / 1000) * width, s.y, s.r, s.r); });
  ctx.fillStyle = 'rgba(26,52,53,.34)'; ctx.beginPath(); ctx.moveTo(0, groundY() - 75); for (let x = 0; x <= width + 100; x += 100) ctx.lineTo(x, groundY() - 72 - ((x * .73) % 65)); ctx.lineTo(width, groundY()); ctx.lineTo(0, groundY()); ctx.fill();
}
function drawTerrain() {
  ctx.fillStyle = '#243638'; ctx.fillRect(0, groundY(), width, height - groundY());
  ctx.strokeStyle = '#d5e56d'; ctx.globalAlpha = .65; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY()); ctx.lineTo(width, groundY()); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(233,207,154,.22)'; ctx.lineWidth = 1; for (let x = -groundOffset; x < width; x += 48) { ctx.beginPath(); ctx.moveTo(x, groundY() + 18); ctx.lineTo(x + 20, groundY() + 18); ctx.stroke(); }
}
function drawPlayer() {
  const bob = player.grounded ? Math.sin(player.run) * 1.5 : 0; const x = player.x, y = player.y + bob;
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#f17a62';
  ctx.beginPath(); ctx.moveTo(4, 18); ctx.lineTo(4, 10); ctx.lineTo(16, 10); ctx.lineTo(21, 3); ctx.lineTo(35, 3); ctx.lineTo(35, 11); ctx.lineTo(39, 11); ctx.lineTo(39, 31); ctx.lineTo(31, 31); ctx.lineTo(30, 44); ctx.lineTo(24, 44); ctx.lineTo(22, 31); ctx.lineTo(13, 31); ctx.lineTo(12, 44); ctx.lineTo(6, 44); ctx.lineTo(5, 30); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#172326'; ctx.fillRect(29, 8, 4, 4); ctx.fillStyle = '#f7e8bc'; ctx.fillRect(15, 17, 10, 3); ctx.restore();
}
function drawObstacle(o) {
  ctx.save(); ctx.translate(o.x, o.y); ctx.fillStyle = o.type === 'spire' ? '#d5e56d' : '#b8cf85';
  if (o.type === 'spire') { ctx.beginPath(); ctx.moveTo(0, o.h); ctx.lineTo(6, 13); ctx.lineTo(12, 18); ctx.lineTo(17, 0); ctx.lineTo(25, o.h); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#243638'; ctx.fillRect(11, 25, 3, 6); }
  else { ctx.beginPath(); ctx.arc(14, o.h, 14, Math.PI, 0); ctx.arc(31, o.h, 13, Math.PI, 0); ctx.rect(2, o.h - 2, 39, 5); ctx.fill(); }
  ctx.restore();
}
function drawShard(s) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin); ctx.fillStyle = '#d5e56d'; ctx.beginPath(); ctx.moveTo(0, -s.r); ctx.lineTo(s.r * .72, 0); ctx.lineTo(0, s.r); ctx.lineTo(-s.r * .72, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
function drawParticle(p) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1; }
function loop(time) { const dt = Math.min(34, time - lastTime || 16); lastTime = time; update(dt); draw(); animationId = requestAnimationFrame(loop); }
function playTone(freq, duration, type) { if (muted) return; audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.type = type; oscillator.frequency.value = freq; gain.gain.setValueAtTime(.035, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration); }

startButton.addEventListener('click', () => state === 'paused' ? togglePause() : startGame());
soundButton.addEventListener('click', () => { muted = !muted; soundButton.textContent = `音效 ${muted ? 'OFF' : 'ON'}`; soundButton.setAttribute('aria-pressed', String(!muted)); });
window.addEventListener('keydown', e => { if (['Space', 'ArrowUp'].includes(e.code)) { e.preventDefault(); jump(); } if (e.code === 'KeyP') togglePause(); });
canvas.addEventListener('pointerdown', jump);
window.addEventListener('resize', resize);
resize(); reset(); draw(); animationId = requestAnimationFrame(loop);
