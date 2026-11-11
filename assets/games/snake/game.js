/* Neon Snake — Game ONN Prime */
(function () {
  "use strict";

  var COLS = 20;
  var ROWS = 20;
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
  var size = canvas.clientWidth || 480;
  var cell = size / COLS;
  canvas.width = Math.round(size * DPR);
  canvas.height = Math.round(size * DPR);
  ctx.scale(DPR, DPR);

  var state = "idle"; // idle | playing | paused | over
  var snake, dir, nextDir, food, score, acc, last, step, best;

  try { best = parseInt(localStorage.getItem("onn.snake.best") || "0", 10) || 0; } catch (e) { best = 0; }
  bestEl.textContent = best;

  function reset() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    acc = 0;
    step = 130;
    placeFood();
    scoreEl.textContent = "0";
  }

  function placeFood() {
    var free = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var taken = snake.some(function (s) { return s.x === x && s.y === y; });
        if (!taken) free.push({ x: x, y: y });
      }
    }
    food = free[Math.floor(Math.random() * free.length)] || { x: 0, y: 0 };
    food.t = 0;
  }

  function drawBoard() {
    ctx.fillStyle = "#080b10";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < COLS; i++) {
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, size);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(size, i * cell);
    }
    ctx.stroke();
  }

  function rounded(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  function draw() {
    drawBoard();
    var pad = Math.max(1.5, cell * 0.1);
    var radius = cell * 0.28;

    // comida
    if (food) {
      var fx = food.x * cell + cell / 2;
      var fy = food.y * cell + cell / 2;
      var pulse = 0.82 + Math.sin(Date.now() / 280) * 0.12;
      var g = ctx.createRadialGradient(fx, fy, 1, fx, fy, cell * 1.6);
      g.addColorStop(0, "rgba(255,95,87,0.55)");
      g.addColorStop(1, "rgba(255,95,87,0)");
      ctx.fillStyle = g;
      ctx.fillRect(fx - cell * 1.6, fy - cell * 1.6, cell * 3.2, cell * 3.2);
      ctx.fillStyle = "#ff6b60";
      ctx.beginPath();
      ctx.arc(fx, fy, cell * 0.3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(fx - cell * 0.09, fy - cell * 0.1, cell * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }

    // corpo
    for (var i = snake.length - 1; i >= 0; i--) {
      var s = snake[i];
      var t = i / Math.max(snake.length - 1, 1);
      var x = s.x * cell + pad;
      var y = s.y * cell + pad;
      var w = cell - pad * 2;

      if (i === 0) {
        ctx.shadowColor = "rgba(200,255,46,0.85)";
        ctx.shadowBlur = cell * 0.8;
        ctx.fillStyle = "#e4ff8f";
      } else {
        ctx.shadowColor = "rgba(200,255,46,0.35)";
        ctx.shadowBlur = cell * 0.3;
        var lum = 78 - t * 30;
        ctx.fillStyle = "hsl(74, 100%, " + lum + "%)";
      }
      rounded(x, y, w, w, radius);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // olhos
    var head = snake[0];
    var hx = head.x * cell + cell / 2;
    var hy = head.y * cell + cell / 2;
    var offX = dir.x * cell * 0.14;
    var offY = dir.y * cell * 0.14;
    var perpX = dir.y * cell * 0.15;
    var perpY = dir.x * cell * 0.15;
    ctx.fillStyle = "#0a0c11";
    ctx.beginPath();
    ctx.arc(hx + offX + perpX, hy + offY + perpY, cell * 0.085, 0, Math.PI * 2);
    ctx.arc(hx + offX - perpX, hy + offY - perpY, cell * 0.085, 0, Math.PI * 2);
    ctx.fill();
  }

  function finish() {
    state = "over";
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem("onn.snake.best", String(best)); } catch (e) { /* ignore */ }
      overMsg.textContent = "Novo recorde! Insano.";
    } else {
      overMsg.textContent = score === 0 ? "A primeira mordida é sempre assim." : "Recorde atual: " + best + " pontos.";
    }
    finalEl.textContent = score;
    overEl.hidden = false;
  }

  function tick() {
    dir = nextDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return finish();
    for (var i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) return finish();
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = score;
      step = Math.max(70, 130 - Math.floor(score / 50) * 6);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function loop(now) {
    var delta = Math.min(now - last, 120);
    last = now;
    if (state === "playing") {
      acc += delta;
      if (acc >= step) {
        acc -= step;
        tick();
      }
    }
    draw();
    window.requestAnimationFrame(loop);
  }

  function start() {
    reset();
    state = "playing";
    startEl.hidden = true;
    overEl.hidden = true;
    pauseEl.hidden = true;
    last = performance.now();
    draw();
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      pauseEl.hidden = false;
    } else if (state === "paused") {
      state = "playing";
      pauseEl.hidden = true;
      last = performance.now();
    }
  }

  function setDir(x, y) {
    if (state !== "playing") return;
    if (dir.x === -x && dir.y === -y) return;
    nextDir = { x: x, y: y };
  }

  var keyMap = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
  };

  window.addEventListener("keydown", function (e) {
    if (keyMap[e.key]) {
      e.preventDefault();
      if (state === "idle" || state === "over") { start(); }
      setDir(keyMap[e.key][0], keyMap[e.key][1]);
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (state === "idle" || state === "over") start();
      else togglePause();
    }
  }, { passive: false });

  document.getElementById("btn-start").addEventListener("click", start);
  document.getElementById("btn-again").addEventListener("click", start);
  document.getElementById("btn-resume").addEventListener("click", togglePause);

  document.querySelectorAll(".dpad [data-dir]").forEach(function (btn) {
    var dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    btn.addEventListener("click", function () {
      if (state !== "playing") start();
      var d = dirs[btn.dataset.dir];
      setDir(d[0], d[1]);
    });
  });

  // arraste no celular
  var touchStart = null;
  canvas.addEventListener("touchstart", function (e) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", function (e) {
    if (!touchStart) return;
    var dx = e.changedTouches[0].clientX - touchStart.x;
    var dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) { togglePause(); return; }
    if (state !== "playing") start();
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });

  reset();
  last = performance.now();
  window.requestAnimationFrame(loop);
})();
