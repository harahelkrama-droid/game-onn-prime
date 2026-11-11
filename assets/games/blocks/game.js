/* Block Drop — Game ONN Prime
   Tabuleiro 10x20, 7 peças clássicas, canvas único e loop por linha (não por frame). */
(function () {
  "use strict";

  var COLS = 10;
  var ROWS = 20;
  var canvas = document.getElementById("cv");
  var ctx = canvas.getContext("2d", { alpha: false });
  var nextCanvas = document.getElementById("next-cv");
  var nextCtx = nextCanvas.getContext("2d", { alpha: false });
  var scoreEl = document.getElementById("score");
  var linesEl = document.getElementById("lines");
  var levelEl = document.getElementById("level");
  var startEl = document.getElementById("start");
  var pauseEl = document.getElementById("pause");
  var overEl = document.getElementById("over");
  var finalEl = document.getElementById("final");
  var overMsg = document.getElementById("over-msg");

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var size = 300;
  var cell = size / COLS;

  function fit() {
    var cssW = Math.round(canvas.getBoundingClientRect().width) || 300;
    canvas.width = Math.round(cssW * DPR);
    canvas.height = Math.round(cssW * 2 * DPR);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(DPR, DPR);
    size = cssW;
    cell = size / COLS;
    nextCtx.setTransform(1, 0, 0, 1, 0, 0);
    nextCtx.scale(DPR, DPR);
    draw();
    drawNext();
  }

  var SHAPES = {
    I: { color: "#7fe0ff", cells: [[0, 1], [1, 1], [2, 1], [3, 1]], size: 4 },
    O: { color: "#ffe066", cells: [[1, 0], [2, 0], [1, 1], [2, 1]], size: 4 },
    T: { color: "#c8ff2e", cells: [[0, 1], [1, 1], [2, 1], [1, 0]], size: 3 },
    S: { color: "#9a8bff", cells: [[1, 1], [2, 1], [0, 2], [1, 2]], size: 3 },
    Z: { color: "#ff6b60", cells: [[0, 1], [1, 1], [1, 2], [2, 2]], size: 3 },
    J: { color: "#6fa8ff", cells: [[0, 0], [0, 1], [1, 1], [2, 1]], size: 3 },
    L: { color: "#ffab5e", cells: [[2, 0], [0, 1], [1, 1], [2, 1]], size: 3 }
  };
  var TYPES = Object.keys(SHAPES);

  var board = [];
  var piece = null;
  var nextPiece = null;
  var score = 0;
  var lines = 0;
  var level = 1;
  var state = "idle";
  var dropTimer = 0;
  var dropInterval = 620;
  var speedMultiplier = 1;
  var requestId = null;
  var lastTime = 0;
  var bag = [];

  function emptyRow() {
    var row = [];
    for (var i = 0; i < COLS; i++) row.push(null);
    return row;
  }

  function resetBoard() {
    board = [];
    for (var r = 0; r < ROWS; r++) board.push(emptyRow());
  }

  function nextFromBag() {
    if (!bag.length) {
      bag = TYPES.slice();
      for (var i = bag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
      }
    }
    var type = bag.pop();
    var def = SHAPES[type];
    return {
      type: type,
      color: def.color,
      x: Math.floor((COLS - def.size) / 2),
      y: 0,
      rot: 0,
      cells: def.cells.map(function (c) { return c.slice(); })
    };
  }

  function rotatePiece(p) {
    var def = SHAPES[p.type];
    var n = def.size;
    return def.cells.map(function (c) {
      return [n - 1 - c[1], c[0]];
    });
  }

  function collides(cells, px, py) {
    for (var i = 0; i < cells.length; i++) {
      var x = px + cells[i][0];
      var y = py + cells[i][1];
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && board[y][x]) return true;
    }
    return false;
  }

  function spawn() {
    piece = nextPiece || nextFromBag();
    nextPiece = nextFromBag();
    piece.x = Math.floor((COLS - SHAPES[piece.type].size) / 2);
    piece.y = 0;
    piece.rot = 0;
    if (collides(piece.cells, piece.x, piece.y)) {
      gameOver();
      return false;
    }
    drawNext();
    return true;
  }

  function merge() {
    piece.cells.forEach(function (c) {
      var x = piece.x + c[0];
      var y = piece.y + c[1];
      if (y >= 0 && y < ROWS) board[y][x] = piece.color;
    });
  }

  function clearLines() {
    var cleared = 0;
    for (var r = ROWS - 1; r >= 0; r--) {
      var full = board[r].every(function (c) { return c; });
      if (full) {
        board.splice(r, 1);
        board.unshift(emptyRow());
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      var table = [0, 100, 300, 500, 800];
      score += table[cleared] * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(110, 620 - (level - 1) * 45);
      scoreEl.textContent = score;
      linesEl.textContent = lines;
      levelEl.textContent = level;
    }
  }

  function lock() {
    merge();
    clearLines();
    if (!spawn()) return;
    draw();
  }

  function softDrop() {
    if (state !== "playing" || !piece) return;
    if (!collides(piece.cells, piece.x, piece.y + 1)) {
      piece.y++;
      draw();
    } else {
      lock();
    }
  }

  function hardDrop() {
    if (state !== "playing" || !piece) return;
    while (!collides(piece.cells, piece.x, piece.y + 1)) piece.y++;
    lock();
  }

  function shift(dx) {
    if (state !== "playing" || !piece) return;
    if (!collides(piece.cells, piece.x + dx, piece.y)) {
      piece.x += dx;
      draw();
    }
  }

  function rotate() {
    if (state !== "playing" || !piece) return;
    var cells = rotatePiece(piece);
    var kicks = [0, 1, -1, 2, -2];
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(cells, piece.x + kicks[i], piece.y)) {
        piece.cells = cells;
        piece.x += kicks[i];
        piece.rot++;
        draw();
        return;
      }
    }
  }

  function gameOver() {
    state = "over";
    finalEl.textContent = score;
    overMsg.textContent = "Você fez " + lines + " linha(s). Tente superar!";
    overEl.hidden = false;
    window.cancelAnimationFrame(requestId);
    requestId = null;
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

  function block(c, x, y, s, color, alpha) {
    var pad = Math.max(1, s * 0.07);
    c.globalAlpha = alpha == null ? 1 : alpha;
    c.fillStyle = color;
    roundRect(c, x + pad, y + pad, s - pad * 2, s - pad * 2, s * 0.2);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = "rgba(255,255,255,0.22)";
    roundRect(c, x + pad * 2, y + pad * 2, s - pad * 4, (s - pad * 4) * 0.32, s * 0.12);
    c.fill();
  }

  function draw() {
    var h = size * 2;
    ctx.fillStyle = "#070a0f";
    ctx.fillRect(0, 0, size, h);

    ctx.strokeStyle = "rgba(255,255,255,0.032)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < COLS; i++) {
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, h);
    }
    for (var j = 1; j < ROWS; j++) {
      ctx.moveTo(0, j * cell);
      ctx.lineTo(size, j * cell);
    }
    ctx.stroke();

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (board[r][c]) block(ctx, c * cell, r * cell, cell, board[r][c]);
      }
    }

    if (piece) {
      // sombra
      var ghostY = piece.y;
      while (!collides(piece.cells, piece.x, ghostY + 1)) ghostY++;
      if (ghostY !== piece.y) {
        piece.cells.forEach(function (cc) {
          var gx = piece.x + cc[0];
          var gy = ghostY + cc[1];
          if (gy >= 0) {
            ctx.strokeStyle = "rgba(255,255,255,0.16)";
            ctx.lineWidth = 1.5;
            roundRect(ctx, gx * cell + 3, gy * cell + 3, cell - 6, cell - 6, cell * 0.18);
            ctx.stroke();
          }
        });
      }
      piece.cells.forEach(function (cc) {
        var x = piece.x + cc[0];
        var y = piece.y + cc[1];
        if (y >= 0) block(ctx, x * cell, y * cell, cell, piece.color);
      });
    }
  }

  function drawNext() {
    var w = nextCanvas.getBoundingClientRect().width || 76;
    nextCtx.setTransform(1, 0, 0, 1, 0, 0);
    nextCtx.scale(DPR, DPR);
    nextCtx.fillStyle = "#080b10";
    nextCtx.fillRect(0, 0, w, w);
    if (!nextPiece) return;
    var def = SHAPES[nextPiece.type];
    var s = w / 4.4;
    var offsetX = (w - def.size * s) / 2;
    var offsetY = (w - def.size * s) / 2;
    def.cells.forEach(function (c) {
      block(nextCtx, offsetX + c[0] * s, offsetY + c[1] * s, s, def.color);
    });
  }

  function loop(now) {
    if (state !== "playing") return;
    var delta = now - lastTime;
    lastTime = now;
    dropTimer += delta;
    if (dropTimer >= dropInterval / speedMultiplier) {
      dropTimer = 0;
      if (!collides(piece.cells, piece.x, piece.y + 1)) {
        piece.y++;
        draw();
      } else {
        lock();
      }
    }
    requestId = window.requestAnimationFrame(loop);
  }

  function start() {
    resetBoard();
    bag = [];
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 620;
    dropTimer = 0;
    scoreEl.textContent = "0";
    linesEl.textContent = "0";
    levelEl.textContent = "1";
    nextPiece = nextFromBag();
    spawn();
    state = "playing";
    startEl.hidden = true;
    overEl.hidden = true;
    pauseEl.hidden = true;
    draw();
    lastTime = performance.now();
    window.cancelAnimationFrame(requestId);
    requestId = window.requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      pauseEl.hidden = false;
      window.cancelAnimationFrame(requestId);
    } else if (state === "paused") {
      state = "playing";
      pauseEl.hidden = true;
      lastTime = performance.now();
      requestId = window.requestAnimationFrame(loop);
    }
  }

  document.addEventListener("keydown", function (e) {
    var k = e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].indexOf(k) !== -1) e.preventDefault();
    if (k === "Enter" && state === "idle") return start();
    if (k === "ArrowLeft" || k === "a" || k === "A") return shift(-1);
    if (k === "ArrowRight" || k === "d" || k === "D") return shift(1);
    if (k === "ArrowDown" || k === "s" || k === "S") return softDrop();
    if (k === "ArrowUp" || k === "w" || k === "W" || k === "x" || k === "X") return rotate();
    if (k === " ") return hardDrop();
    if (k === "p" || k === "P") return togglePause();
  }, { passive: false });

  document.getElementById("btn-start").addEventListener("click", start);
  document.getElementById("btn-again").addEventListener("click", start);
  document.getElementById("btn-resume").addEventListener("click", togglePause);

  document.querySelector(".ctrl").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    if (state === "idle" || state === "over") { if (btn.dataset.act !== "drop") return; }
    var act = btn.dataset.act;
    if (act === "left") shift(-1);
    else if (act === "right") shift(1);
    else if (act === "down") softDrop();
    else if (act === "drop") hardDrop();
    else if (act === "rotate") rotate();
  });

  document.getElementById("levels").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-lvl]");
    if (!btn) return;
    speedMultiplier = [1, 2, 3][Number(btn.dataset.lvl)];
    Array.prototype.forEach.call(this.children, function (b) { b.classList.toggle("on", b === btn); });
  });

  document.getElementById("cv").addEventListener("click", function () {
    if (state === "idle") start();
  });

  window.addEventListener("resize", function () { fit(); });

  resetBoard();
  draw();
  window.requestAnimationFrame(function () { fit(); });
})();
