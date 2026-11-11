/* Night Bird — Game ONN Prime
   Canvas 2D simples, sem imagens externas: desenho vetorial leve. */
(function () {
  "use strict";

  var canvas = document.getElementById("cv");
  var ctx = canvas.getContext("2d", { alpha: false });
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var startEl = document.getElementById("start");
  var pauseEl = document.getElementById("pause");
  var overEl = document.getElementById("over");
  var finalEl = document.getElementById("final");
  var overMsg = document.getElementById("over-msg");

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 760;
  var H = 475;
  var scale = 1;

  function fit() {
    var rect = canvas.getBoundingClientRect();
    var cssW = Math.round(rect.width) || 760;
    var cssH = Math.round(rect.height) || 475;
    canvas.width = Math.round(cssW * DPR);
    canvas.height = Math.round(cssH * DPR);
    scale = Math.min(cssW / W, cssH / H);
    ctx.setTransform(DPR * scale, 0, 0, DPR * scale, (cssW * DPR - W * scale * DPR) / 2, (cssH * DPR - H * scale * DPR) / 2);
    ctx.fillStyle = "#070a14";
    ctx.fillRect(-W, -H, W * 3, H * 3);
  }

  var GRAVITY = 0.44;
  var FLAP = -7.4;
  var SPEED = 2.55;
  var GAP = 148;
  var PIPE_W = 66;
  var GROUND = H - 62;

  var state = "idle"; // idle | playing | paused | over
  var bird = { x: W * 0.27, y: H / 2, vy: 0, rot: 0, wing: 0 };
  var pipes = [];
  var clouds = [];
  var stars = [];
  var score = 0;
  var best = 0;
  var frame = 0;
  var raf = null;
  var last = 0;
  var acc = 0;

  try { best = parseInt(localStorage.getItem("onn.flappy.best") || "0", 10) || 0; } catch (e) { best = 0; }
  bestEl.textContent = best;

  for (var i = 0; i < 46; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * (GROUND - 60), r: Math.random() * 1.5 + 0.4, a: Math.random() * 0.5 + 0.2 });
  }
  for (var c = 0; c < 7; c++) {
    clouds.push({ x: Math.random() * W, y: 70 + Math.random() * 120, s: 26 + Math.random() * 34, sp: 0.12 + Math.random() * 0.2, a: 0.05 + Math.random() * 0.07 });
  }

  function reset() {
    bird.y = H / 2;
    bird.vy = 0;
    bird.rot = 0;
    pipes = [];
    score = 0;
    frame = 0;
    acc = 0;
    scoreEl.textContent = "0";
    addPipe(W + 160);
  }

  function addPipe(x) {
    var margin = 66;
    var gap = GAP - Math.min(score * 1.2, 26);
    var top = margin + Math.random() * (GROUND - gap - margin * 2);
    pipes.push({ x: x, top: top, gap: gap, passed: false });
  }

  function flap() {
    if (state === "idle") start();
    if (state !== "playing") return;
    bird.vy = FLAP;
    bird.wing = 1;
  }

  function start() {
    reset();
    state = "playing";
    startEl.hidden = true;
    pauseEl.hidden = true;
    overEl.hidden = true;
    flap();
    last = performance.now();
    if (!raf) raf = window.requestAnimationFrame(loop);
  }

  function gameOver() {
    state = "over";
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem("onn.flappy.best", String(best)); } catch (e) { /* ignore */ }
      overMsg.textContent = "Novo recorde! Voo perfeito.";
    } else {
      overMsg.textContent = "Recorde atual: " + best + " ponto(s).";
    }
    finalEl.textContent = score;
    overEl.hidden = false;
  }

  function update() {
    if (state !== "playing") return;
    frame += 1;
    bird.vy += GRAVITY;
    bird.y += bird.vy;
    bird.rot = Math.max(-0.42, Math.min(1.15, bird.vy / 13));
    if (bird.wing > 0) bird.wing = Math.max(0, bird.wing - 0.07);

    if (bird.y < 34) { bird.y = 34; bird.vy = 0.8; }
    if (bird.y > GROUND - 16) { bird.y = GROUND - 16; return gameOver(); }

    for (var i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= SPEED;
      if (pipes[i].x + PIPE_W < -20) pipes.splice(i, 1);
    }
    if (pipes.length && pipes[pipes.length - 1].x < W - 230) addPipe(W + 40);

    var bx = bird.x;
    var by = bird.y;
    for (var j = 0; j < pipes.length; j++) {
      var p = pipes[j];
      var hitX = bx + 16 > p.x && bx - 14 < p.x + PIPE_W;
      if (hitX && (by - 11 < p.top || by + 11 > p.top + p.gap)) return gameOver();
      if (!p.passed && p.x + PIPE_W < bx - 14) {
        p.passed = true;
        score += 1;
        scoreEl.textContent = score;
        if (score > 0 && score % 5 === 0) { /* leve aceleração */ }
      }
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r);
    else {
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }
  }

  function draw() {
    // céu
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0a0c1c");
    sky.addColorStop(0.55, "#0d1226");
    sky.addColorStop(1, "#0a1a1c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // estrelas
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = s.a * (0.7 + Math.sin(frame / 40 + i) * 0.3);
      ctx.fillStyle = "#dff0ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // lua
    ctx.save();
    var moonX = W - 120, moonY = 78;
    var glow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 74);
    glow.addColorStop(0, "rgba(210,245,255,0.35)");
    glow.addColorStop(1, "rgba(210,245,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - 80, moonY - 80, 160, 160);
    ctx.fillStyle = "#e8f6ff";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0d1226";
    ctx.beginPath();
    ctx.arc(moonX + 11, moonY - 6, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // nuvens
    for (var c = 0; c < clouds.length; c++) {
      var cl = clouds[c];
      cl.x -= cl.sp;
      if (cl.x < -cl.s * 2.4) cl.x = W + cl.s * 2;
      ctx.globalAlpha = cl.a;
      ctx.fillStyle = "#9fd9d0";
      roundRect(ctx, cl.x, cl.y, cl.s * 2.6, cl.s * 0.52, cl.s * 0.3);
      ctx.fill();
      roundRect(ctx, cl.x + cl.s * 0.5, cl.y - cl.s * 0.28, cl.s * 1.4, cl.s * 0.56, cl.s * 0.28);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // canos
    for (var p = 0; p < pipes.length; p++) {
      var pipe = pipes[p];
      drawPipe(pipe.x, 0, PIPE_W, pipe.top, true);
      drawPipe(pipe.x, pipe.top + pipe.gap, PIPE_W, GROUND - pipe.top - pipe.gap, false);
    }

    // chão
    var groundGrad = ctx.createLinearGradient(0, GROUND, 0, H);
    groundGrad.addColorStop(0, "#123028");
    groundGrad.addColorStop(1, "#071410");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.strokeStyle = "rgba(200,255,46,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    ctx.lineTo(W, GROUND);
    ctx.stroke();
    ctx.fillStyle = "rgba(200,255,46,0.1)";
    for (var g = 0; g < W; g += 26) {
      var off = (frame * SPEED) % 26;
      ctx.fillRect(g - off, GROUND + 14, 12, 5);
    }

    // pássaro
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(state === "over" ? 1.35 : bird.rot);
    var wingLift = state === "playing" ? Math.sin(frame / 3.4) * 5 : Math.sin(frame / 9) * 3;
    ctx.fillStyle = "#ffd75e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0a821";
    ctx.beginPath();
    ctx.ellipse(-4, 2 + wingLift * 0.5, 10, 7, -0.3 + wingLift * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffefc0";
    ctx.beginPath();
    ctx.arc(7, -3, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#131313";
    ctx.beginPath();
    ctx.arc(9, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8a3d";
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(23, 2);
    ctx.lineTo(13, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPipe(x, y, w, h, isTop) {
    if (h <= 0) return;
    var grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, "#123a3a");
    grad.addColorStop(0.35, "#1e5a56");
    grad.addColorStop(0.62, "#14423f");
    grad.addColorStop(1, "#0b2725");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(200,255,46,0.42)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (isTop) {
      ctx.moveTo(x + 0.5, y);
      ctx.lineTo(x + 0.5, y + h);
      ctx.moveTo(x + w - 0.5, y);
      ctx.lineTo(x + w - 0.5, y + h);
    } else {
      ctx.moveTo(x + 0.5, y);
      ctx.lineTo(x + 0.5, y + h);
      ctx.moveTo(x + w - 0.5, y);
      ctx.lineTo(x + w - 0.5, y + h);
    }
    ctx.stroke();

    // boca do cano
    var capH = 24;
    var capY = isTop ? y + h - capH : y;
    ctx.fillStyle = grad;
    roundRect(ctx, x - 5, capY, w + 10, capH, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,255,46,0.55)";
    ctx.lineWidth = 1.8;
    roundRect(ctx, x - 5, capY, w + 10, capH, 5);
    ctx.stroke();
  }

  function loop(now) {
    var delta = Math.min(now - last, 60);
    last = now;
    acc += delta;
    var steps = 0;
    while (acc >= 16.6667 && steps < 4) {
      update();
      acc -= 16.6667;
      steps++;
    }
    if (state !== "playing") frame += 0.6;
    draw();
    raf = window.requestAnimationFrame(loop);
  }

  function resume() {
    state = "playing";
    pauseEl.hidden = true;
    last = performance.now();
    acc = 0;
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      pauseEl.hidden = false;
    } else if (state === "paused") {
      resume();
    }
  }

  function onPress() {
    if (state === "over" || state === "paused") return;
    flap();
  }

  window.addEventListener("keydown", function (e) {
    var key = e.key;
    if (key === "p" || key === "P") { togglePause(); return; }
    if (key === " " || key === "ArrowUp" || key === "w" || key === "W" || key === "Enter") {
      e.preventDefault();
      if (state === "idle") { start(); return; }
      onPress();
    }
  }, { passive: false });

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (state === "idle") { start(); return; }
    onPress();
  });
  document.getElementById("btn-start").addEventListener("click", function (e) {
    e.stopPropagation();
    start();
  });
  document.getElementById("btn-again").addEventListener("click", function (e) {
    e.stopPropagation();
    start();
  });
  document.getElementById("btn-resume").addEventListener("click", function (e) {
    e.stopPropagation();
    resume();
  });
  window.addEventListener("resize", function () { fit(); draw(); });

  fit();
  reset();
  state = "idle";
  draw();
  raf = window.requestAnimationFrame(loop);
})();
