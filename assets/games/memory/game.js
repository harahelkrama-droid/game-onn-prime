/* Memory Cards — Game ONN Prime
   DOM puro (16/20 cartas). Sem imagens, sem loop de animação. */
(function () {
  "use strict";

  var board = document.getElementById("board");
  var movesEl = document.getElementById("moves");
  var pairsEl = document.getElementById("pairs");
  var timeEl = document.getElementById("time");
  var bestEl = document.getElementById("best");
  var levelEl = document.getElementById("level");
  var startEl = document.getElementById("start");
  var winEl = document.getElementById("win");
  var winTime = document.getElementById("win-time");
  var winMsg = document.getElementById("win-msg");

  var SYMBOLS = ["✦", "◆", "✳", "❖", "✱", "⬢", "☾", "✚", "❉", "⬟"];

  var cols = 4;
  var symbols = SYMBOLS.slice(0, 8);
  var first = null;
  var second = null;
  var locked = false;
  var moves = 0;
  var pairsFound = 0;
  var timer = null;
  var seconds = 0;
  var started = false;
  var bestKey = "onn.memory.best.easy";

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function fmt(sec) {
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }

  function loadBest() {
    try {
      var raw = localStorage.getItem(bestKey);
      bestEl.textContent = raw ? fmt(parseInt(raw, 10)) : "—";
    } catch (e) {
      bestEl.textContent = "—";
    }
  }

  function build() {
    var deck = [];
    symbols.forEach(function (sym) {
      deck.push(sym);
      deck.push(sym);
    });
    deck = shuffle(deck);

    board.innerHTML = "";
    board.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
    board.style.display = "grid";

    deck.forEach(function (sym, index) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "card2";
      card.dataset.symbol = sym;
      card.dataset.index = String(index);
      card.setAttribute("aria-label", "Carta " + (index + 1));
      card.innerHTML =
        '<span class="face back">?</span>' +
        '<span class="face front">' + sym + "</span>";
      board.appendChild(card);
    });
  }

  function reset(hard) {
    if (hard) {
      cols = 5;
      symbols = SYMBOLS.slice(0, 10);
      bestKey = "onn.memory.best.hard";
      levelEl.textContent = "Difícil";
    } else if (hard === false) {
      cols = 4;
      symbols = SYMBOLS.slice(0, 8);
      bestKey = "onn.memory.best.easy";
      levelEl.textContent = "Fácil";
    }
    window.clearInterval(timer);
    timer = null;
    seconds = 0;
    moves = 0;
    pairsFound = 0;
    first = null;
    second = null;
    locked = false;
    started = false;
    movesEl.textContent = "0";
    pairsEl.textContent = "0/" + symbols.length;
    timeEl.textContent = "0:00";
    winEl.hidden = true;
    build();
    loadBest();
  }

  function startTimer() {
    if (timer) return;
    timer = window.setInterval(function () {
      seconds++;
      timeEl.textContent = fmt(seconds);
    }, 1000);
  }

  function flip(card) {
    if (locked || card.classList.contains("flip") || card.classList.contains("done")) return;
    if (!started) {
      started = true;
      startTimer();
    }
    card.classList.add("flip");

    if (!first) {
      first = card;
      return;
    }
    second = card;
    moves++;
    movesEl.textContent = String(moves);
    locked = true;

    var isPair = first.dataset.symbol === second.dataset.symbol;
    window.setTimeout(function () {
      if (isPair) {
        first.classList.add("done");
        second.classList.add("done");
        pairsFound++;
        pairsEl.textContent = pairsFound + "/" + symbols.length;
        first = null;
        second = null;
        locked = false;
        if (pairsFound === symbols.length) finish();
      } else {
        first.classList.add("shake");
        second.classList.add("shake");
        window.setTimeout(function () {
          if (first) first.classList.remove("flip", "shake");
          if (second) second.classList.remove("flip", "shake");
          first = null;
          second = null;
          locked = false;
        }, 320);
      }
    }, isPair ? 220 : 520);
  }

  function finish() {
    window.clearInterval(timer);
    timer = null;
    winTime.textContent = fmt(seconds);
    var bestRaw = 0;
    try { bestRaw = parseInt(localStorage.getItem(bestKey) || "0", 10) || 0; } catch (e) { bestRaw = 0; }
    if (!bestRaw || seconds < bestRaw) {
      try { localStorage.setItem(bestKey, String(seconds)); } catch (e) { /* ignore */ }
      winMsg.textContent = "Novo recorde! " + moves + " jogadas em " + fmt(seconds) + ".";
    } else {
      winMsg.textContent = "Você terminou em " + moves + " jogadas. Recorde: " + fmt(bestRaw) + ".";
    }
    loadBest();
    winEl.hidden = false;
  }

  board.addEventListener("click", function (e) {
    var card = e.target.closest(".card2");
    if (card) flip(card);
  });

  document.getElementById("btn-start").addEventListener("click", function () {
    startEl.hidden = true;
    reset(false);
  });
  document.getElementById("btn-hard").addEventListener("click", function () {
    startEl.hidden = true;
    reset(true);
  });
  document.getElementById("btn-again").addEventListener("click", function () {
    reset(cols === 5);
  });

  reset(false);
})();
