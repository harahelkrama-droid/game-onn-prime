/* Tile 2048 — Game ONN Prime
   Render em DOM (poucas peças), animação só com transform: leve e sem travar. */
(function () {
  "use strict";

  var SIZE = 4;
  var boardEl = document.getElementById("board");
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var startEl = document.getElementById("start");
  var overEl = document.getElementById("over");
  var overLabel = document.getElementById("over-label");
  var finalEl = document.getElementById("final");
  var overMsg = document.getElementById("over-msg");
  var btnKeep = document.getElementById("btn-keep");

  var grid;
  var score = 0;
  var best = 0;
  var state = "idle"; // idle | playing | over | won
  var nextId = 1;
  var tileNodes = {};
  var history = [];
  var wonShown = false;

  try { best = parseInt(localStorage.getItem("onn.2048.best") || "0", 10) || 0; } catch (e) { best = 0; }
  bestEl.textContent = best;

  function emptyGrid() {
    var g = [];
    for (var r = 0; r < SIZE; r++) {
      g.push([]);
      for (var c = 0; c < SIZE; c++) g[r].push(null);
    }
    return g;
  }

  function metrics() {
    var rect = boardEl.getBoundingClientRect();
    var pad = Math.max(8, rect.width * 0.026);
    var g = Math.max(6, rect.width * 0.021);
    var size = (rect.width - pad * 2 - g * (SIZE - 1)) / SIZE;
    return { pad: pad, gap: g, size: size };
  }

  function paint(node, value, animateIn) {
    var tier = Math.max(1, Math.min(Math.round(Math.log(value) / Math.LN2), 11));
    node.className = "tile s" + tier + (animateIn ? " pop" : "");
    node.dataset.value = value;
    node.textContent = String(value);
  }

  function position(node, r, c, m) {
    var x = m.pad + c * (m.size + m.gap);
    var y = m.pad + r * (m.size + m.gap);
    node.style.width = m.size + "px";
    node.style.height = m.size + "px";
    node.style.transform = "translate3d(" + x + "px," + y + "px,0)";
    node.style.fontSize = Math.max(13, m.size * (String(node.dataset.value).length > 3 ? 0.26 : String(node.dataset.value).length > 2 ? 0.32 : 0.4)) + "px";
  }

  function layout(options) {
    options = options || {};
    var m = metrics();
    var seen = {};
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var tile = grid[r][c];
        if (!tile) continue;
        seen[tile.id] = true;
        var node = tileNodes[tile.id];
        var isNew = false;
        if (!node) {
          node = document.createElement("div");
          tileNodes[tile.id] = node;
          boardEl.appendChild(node);
          isNew = true;
        }
        paint(node, tile.value, isNew);
        if (isNew || options.instant) node.style.transition = "none";
        position(node, r, c, m);
        if (isNew || options.instant) {
          void node.offsetWidth;
          node.style.transition = "";
        }
      }
    }
    Object.keys(tileNodes).forEach(function (id) {
      if (!seen[id]) {
        var n = tileNodes[id];
        if (n && n.parentNode) n.parentNode.removeChild(n);
        delete tileNodes[id];
      }
    });
  }

  function freeCells() {
    var free = [];
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) if (!grid[r][c]) free.push([r, c]);
    return free;
  }

  function addRandom() {
    var free = freeCells();
    if (!free.length) return;
    var pick = free[Math.floor(Math.random() * free.length)];
    grid[pick[0]][pick[1]] = { id: nextId++, value: Math.random() < 0.9 ? 2 : 4 };
  }

  function hasMoves() {
    if (freeCells().length) return true;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = grid[r][c].value;
        if (c < SIZE - 1 && grid[r][c + 1].value === v) return true;
        if (r < SIZE - 1 && grid[r + 1][c].value === v) return true;
      }
    }
    return false;
  }

  function maxValue() {
    var max = 0;
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
      if (grid[r][c] && grid[r][c].value > max) max = grid[r][c].value;
    }
    return max;
  }

  function cloneGrid(src) {
    return src.map(function (row) {
      return row.map(function (t) { return t ? { id: t.id, value: t.value } : null; });
    });
  }

  /* Lê uma linha na ordem do movimento, compacta, junta iguais e devolve. */
  function resolveLine(line) {
    var tiles = line.filter(Boolean);
    var out = [];
    var gained = 0;
    for (var i = 0; i < tiles.length; i++) {
      if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
        var mergedValue = tiles[i].value * 2;
        out.push({ id: tiles[i].id, value: mergedValue, merged: true });
        gained += mergedValue;
        i++;
      } else {
        out.push({ id: tiles[i].id, value: tiles[i].value });
      }
    }
    while (out.length < SIZE) out.push(null);
    return { line: out, gained: gained };
  }

  function lineCoords(index, axis, forward) {
    var pos = forward ? index : SIZE - 1 - index;
    return axis === "row" ? [index, pos] : [pos, index];
  }

  function move(dx, dy) {
    if (state !== "playing") return;
    var snapshot = { grid: cloneGrid(grid), score: score, nextId: nextId };
    var moved = false;
    var gained = 0;

    for (var i = 0; i < SIZE; i++) {
      var line = [];
      for (var j = 0; j < SIZE; j++) {
        var r = dy !== 0 ? (dy > 0 ? SIZE - 1 - j : j) : i;
        var c = dx !== 0 ? (dx > 0 ? SIZE - 1 - j : j) : i;
        line.push(grid[r][c]);
      }
      var result = resolveLine(line);
      gained += result.gained;
      if (!moved) {
        for (var k = 0; k < SIZE; k++) {
          if ((line[k] && line[k].id) !== (result.line[k] && result.line[k].id)) { moved = true; break; }
        }
      }
      for (var m = 0; m < SIZE; m++) {
        var rr = dy !== 0 ? (dy > 0 ? SIZE - 1 - m : m) : i;
        var cc = dx !== 0 ? (dx > 0 ? SIZE - 1 - m : m) : i;
        var tile = result.line[m];
        grid[rr][cc] = tile ? { id: tile.id, value: tile.value } : null;
      }
    }

    if (!moved) return;

    history.push(snapshot);
    if (history.length > 20) history.shift();

    score += gained;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem("onn.2048.best", String(best)); } catch (e) { /* ignore */ }
    }

    addRandom();
    layout();

    if (maxValue() >= 2048 && !wonShown) {
      wonShown = true;
      state = "won";
      overLabel.textContent = "Meta atingida";
      finalEl.textContent = maxValue();
      overMsg.textContent = "Você chegou em 2048. Pode continuar para bater o recorde.";
      btnKeep.hidden = false;
      overEl.hidden = false;
      return;
    }
    if (!hasMoves()) {
      state = "over";
      overLabel.textContent = "Fim de jogo";
      finalEl.textContent = score;
      overMsg.textContent = "Sem movimentos possíveis. Recorde: " + best + " pontos.";
      btnKeep.hidden = true;
      overEl.hidden = false;
    }
  }

  function start() {
    grid = emptyGrid();
    Object.keys(tileNodes).forEach(function (id) {
      var n = tileNodes[id];
      if (n && n.parentNode) n.parentNode.removeChild(n);
    });
    tileNodes = {};
    history = [];
    score = 0;
    nextId = 1;
    wonShown = false;
    scoreEl.textContent = "0";
    addRandom();
    addRandom();
    layout({ instant: true });
    state = "playing";
    startEl.hidden = true;
    overEl.hidden = true;
    btnKeep.hidden = true;
  }

  function undo() {
    if (!history.length) return;
    var snap = history.pop();
    grid = cloneGrid(snap.grid);
    score = snap.score;
    nextId = snap.nextId;
    scoreEl.textContent = score;
    state = "playing";
    overEl.hidden = true;
    btnKeep.hidden = true;
    layout();
  }

  var keyMap = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
  };

  window.addEventListener("keydown", function (e) {
    if (keyMap[e.key]) {
      e.preventDefault();
      if (state === "idle") return;
      move(keyMap[e.key][0], keyMap[e.key][1]);
      return;
    }
    if (e.key === "z" || e.key === "Z") { e.preventDefault(); undo(); }
    if (e.key === "Enter" && state === "idle") start();
  }, { passive: false });

  document.getElementById("btn-start").addEventListener("click", start);
  document.getElementById("btn-again").addEventListener("click", start);
  btnKeep.addEventListener("click", function () {
    if (state === "won") {
      state = "playing";
      overEl.hidden = true;
    }
  });

  var touchStart = null;
  boardEl.addEventListener("touchstart", function (e) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  boardEl.addEventListener("touchend", function (e) {
    if (!touchStart) return;
    var dx = e.changedTouches[0].clientX - touchStart.x;
    var dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (state === "idle") start();
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
    else move(0, dy > 0 ? 1 : -1);
  }, { passive: true });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () { layout({ instant: true }); }, 120);
  });

  // grade de fundo
  start();
  state = "idle";
  startEl.hidden = false;
  overEl.hidden = true;
})();
