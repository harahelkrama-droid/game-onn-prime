/* Orbital Strike — Game ONN Prime
   Shooter vertical em canvas: partículas, asteroides, vidas e recorde local. */
(function () {
  "use strict";

  var canvas = document.getElementById("cv");
  var ctx = canvas.getContext("2d", { alpha: false });
  var scoreEl = document.getElementById("score");
  var livesEl = document.getElementById("lives");
  var startEl = document.getElementById("start");
  var pauseEl = document.getElementById("pause");
  var overEl = document.getElementById("over");
  var finalEl = document.getElementById("final");
  var overMsg = document.getElementById("over-msg");

  var W = 700;
  var H = 525;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var state = "idle"; // idle | playing | paused | over
  var ship, bullets, rocks, particles, stars;
  var score, lives, fireTimer, spawnTimer, elapsed, raf, last;
  var keys = { left: false, right: false, fire: false };
  var pointer = { active: false, x: W / 2 };
  var best = 0;

  try { best = parseInt(localStorage.getItem("onn.space.best") || "0", 10) || 0; } catch (e) { best = 0; }

  function fit() {
    var rect = canvas.getBoundingClientRect();
    var cssW = Math.round(rect.width) || W;
    var cssH = Math.round(rect.height) || H;
    canvas.width = Math.round(cssW * DPR);
    canvas.height = Math.round(cssH * DPR);
    var s = Math.min(cssW / W, cssH / H);
    ctx.setTransform(DPR * s, 0, 0, DPR * s, (cssW * DPR - W * s * DPR) / 2, (cssH * DPR - H * s * DPR) / 2);
  }

  function reset() {
    ship = { x: W / 2, y: H - 58, w: 34, h: 38, cool: 0 };
    bullets = [];
    rocks = [];
    particles = [];
    score = 0;
    lives = 3;
    fireTimer = 0;
    spawnTimer = 0;
    elapsed = 0;
    scoreEl.textContent = "0";
    livesEl.textContent = "3";
    stars = [];
    for (var i = 0; i < 70; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 1.6 + 0.3 });
    }
  }

  function burst(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = Math.random() * 3.2 + 0.6;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        color: color,
        size: Math.random() * 2.4 + 0.8
      });
    }
    if (particles.length > 220) particles.splice(0, particles.length - 220);
  }

  function shoot() {
    if (ship.cool > 0) return;
    ship.cool = 8;
    bullets.push({ x: ship.x - 7, y: ship.y - 20, vy: -11 });
    bullets.push({ x: ship.x + 7, y: ship.y - 20, vy: -11 });
  }

  function spawnRock() {
    var size = 16 + Math.random() * 20;
    var speed = 0.7 + Math.random() * 1.1 + Math.min(elapsed / 26000, 1.5);
    rocks.push({
      x: size + Math.random() * (W - size * 2),
      y: -size - 8,
      vx: (Math.random() - 0.5) * 0.9,
      vy: speed,
      r: size,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.03,
      hp: size > 27 ? 2 : 1,
      shape: Math.random() * 0.5 + 0.75
    });
  }

  function hitShip() {
    lives -= 1;
    livesEl.textContent = String(lives);
    burst(ship.x, ship.y, "#c8ff2e", 26);
    if (lives <= 0) {
      state = "over";
      finalEl.textContent = score;
      overMsg.textContent = score >= best ? "Novo recorde: " + score + " pontos!" : "Recorde: " + best + " pontos.";
      if (score > best) {
        best = score;
        try { localStorage.setItem("onn.space.best", String(best)); } catch (e) { /* ignore */ }
      }
      overEl.hidden = false;
      return;
    }
    ship.x = W / 2;
    rocks = rocks.filter(function (r) { return r.r < 12; });
  }

  function update() {
    elapsed += 16.67;
    ship.cool = Math.max(0, ship.cool - 1);

    // movimento
    var speedX = 5.4;
    if (pointer.active) {
      ship.x += (pointer.x - ship.x) * 0.28;
    }
    if (keys.left) ship.x -= speedX;
    if (keys.right) ship.x += speedX;
    ship.x = Math.max(24, Math.min(W - 24, ship.x));

    if (keys.fire || pointer.active) shoot();

    // estrelas
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      st.y += st.z * 1.5;
      if (st.y > H) { st.y = -2; st.x = Math.random() * W; }
    }

    // tiros
    for (var b = bullets.length - 1; b >= 0; b--) {
      bullets[b].y += bullets[b].vy;
      if (bullets[b].y < -20) bullets.splice(b, 1);
    }

    // pedras
    spawnTimer -= 1;
    if (spawnTimer <= 0) {
      spawnRock();
      var base = Math.max(26, 70 - elapsed / 900);
      spawnTimer = base + Math.random() * 26;
    }

    for (var r = rocks.length - 1; r >= 0; r--) {
      var rock = rocks[r];
      rock.x += rock.vx;
      rock.y += rock.vy;
      rock.rot += rock.vr;

      if (rock.y - rock.r > H + 20) {
        rocks.splice(r, 1);
        continue;
      }

      // colisão tiro
      for (var bb = bullets.length - 1; bb >= 0; bb--) {
        var bul = bullets[bb];
        var dx = bul.x - rock.x;
        var dy = bul.y - rock.y;
        if (dx * dx + dy * dy < (rock.r + 3) * (rock.r + 3)) {
          bullets.splice(bb, 1);
          rock.hp -= 1;
          if (rock.hp <= 0) {
            burst(rock.x, rock.y, rock.r > 26 ? "#9a8bff" : "#8fa1b3", rock.r > 26 ? 22 : 14);
            score += rock.r > 26 ? 30 : 15;
            scoreEl.textContent = score;
            rocks.splice(r, 1);
          } else {
            burst(bul.x, bul.y, "#ffffff", 3);
          }
          break;
        }
      }
      if (!rocks[r]) continue;

      // colisão nave
      var ddx = rock.x - ship.x;
      var ddy = rock.y - ship.y;
      if (ddx * ddx + ddy * ddy < (rock.r + 16) * (rock.r + 16)) {
        rocks.splice(r, 1);
        hitShip();
        if (state !== "playing") return;
      }
    }

    // partículas
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vx *= 0.97;
      pt.vy *= 0.97;
      pt.life -= 0.022;
      if (pt.life <= 0) particles.splice(p, 1);
    }
  }

  function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    // chama
    var flame = 8 + Math.random() * 8;
    var fg = ctx.createLinearGradient(0, 12, 0, 18 + flame);
    fg.addColorStop(0, "rgba(200,255,46,0.95)");
    fg.addColorStop(1, "rgba(200,255,46,0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(0, 16 + flame);
    ctx.lineTo(6, 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#dfe7ea";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(11, 4);
    ctx.lineTo(7, 15);
    ctx.lineTo(-7, 15);
    ctx.lineTo(-11, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#c8ff2e";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(5, 3);
    ctx.lineTo(-5, 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#7fe0ff";
    ctx.beginPath();
    ctx.moveTo(-11, 4);
    ctx.lineTo(-17, 15);
    ctx.lineTo(-6, 13);
    ctx.closePath();
    ctx.moveTo(11, 4);
    ctx.lineTo(17, 15);
    ctx.lineTo(6, 13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#05070f");
    g.addColorStop(0.7, "#080b16");
    g.addColorStop(1, "#0a1010");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      ctx.globalAlpha = 0.25 + st.z * 0.4;
      ctx.fillStyle = "#cfe6ff";
      ctx.fillRect(st.x, st.y, st.z, st.z * 1.6);
    }
    ctx.globalAlpha = 1;

    // tiros
    ctx.fillStyle = "#c8ff2e";
    for (var b = 0; b < bullets.length; b++) {
      ctx.fillRect(bullets[b].x - 1.5, bullets[b].y, 3, 12);
    }

    // pedras
    for (var r = 0; r < rocks.length; r++) {
      var rock = rocks[r];
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.rot);
      ctx.beginPath();
      var sides = 8;
      for (var i = 0; i < sides; i++) {
        var angle = (i / sides) * Math.PI * 2;
        var rad = rock.r * (0.78 + Math.sin(i * 2.7) * 0.14) * rock.shape;
        var px = Math.cos(angle) * rad;
        var py = Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "#26303c";
      ctx.fill();
      ctx.strokeStyle = rock.r > 26 ? "rgba(154,139,255,0.75)" : "rgba(143,161,179,0.55)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }

    // partículas
    for (var p = 0; p < particles.length; p++) {
      var pt = particles[p];
      ctx.globalAlpha = Math.max(pt.life, 0);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    if (state !== "over") drawShip();

    // HUD interno
    ctx.font = "600 11px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.fillText("RECORDE " + best, 16, 24);
  }

  function loop(now) {
    if (state === "playing") update();
    draw();
    raf = window.requestAnimationFrame(loop);
  }

  function start() {
    reset();
    state = "playing";
    startEl.hidden = true;
    pauseEl.hidden = true;
    overEl.hidden = true;
    last = performance.now();
    if (!raf) raf = window.requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      pauseEl.hidden = false;
    } else if (state === "paused") {
      state = "playing";
      pauseEl.hidden = true;
    }
  }

  window.addEventListener("keydown", function (e) {
    if (["ArrowLeft", "ArrowRight", " ", "ArrowDown", "ArrowUp"].indexOf(e.key) !== -1) e.preventDefault();
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    else if (e.key === " ") keys.fire = true;
    else if (e.key === "p" || e.key === "P") togglePause();
    else if (e.key === "Enter" && (state === "idle" || state === "over")) start();
  }, { passive: false });

  window.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    else if (e.key === " ") keys.fire = false;
  });

  function movePointer(clientX) {
    var rect = canvas.getBoundingClientRect();
    var cssW = rect.width || W;
    var s = Math.min(cssW / W, (rect.height || H) / H);
    var offX = (cssW - W * s) / 2;
    pointer.x = (clientX - rect.left - offX) / s;
  }

  canvas.addEventListener("pointermove", function (e) {
    if (e.pointerType === "mouse") { pointer.active = true; movePointer(e.clientX); }
  });
  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    pointer.active = true;
    movePointer(e.clientX);
    if (state === "idle") start();
    keys.fire = true;
  });
  canvas.addEventListener("pointerup", function () { keys.fire = false; });
  canvas.addEventListener("pointerleave", function () { pointer.active = false; keys.fire = false; });
  canvas.addEventListener("touchmove", function (e) {
    e.preventDefault();
    pointer.active = true;
    movePointer(e.touches[0].clientX);
  }, { passive: false });
  canvas.addEventListener("touchend", function () { pointer.active = false; keys.fire = false; });

  document.getElementById("btn-start").addEventListener("click", start);
  document.getElementById("btn-again").addEventListener("click", start);
  document.getElementById("btn-resume").addEventListener("click", togglePause);
  window.addEventListener("resize", function () { fit(); draw(); });

  fit();
  reset();
  state = "idle";
  recenter();
  draw();

  function recenter() { ship.x = W / 2; }
  raf = window.requestAnimationFrame(loop);
})();
