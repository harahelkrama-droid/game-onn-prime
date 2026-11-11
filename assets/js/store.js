/* ==========================================================================
   GAME ONN PRIME — store.js
   Camada de dados: acesso administrativo, sessão e catálogo de jogos.
   Sem dependências, sem backend. Tudo fica no navegador da pessoa.
   ========================================================================== */
(function () {
  "use strict";

  /* -----------------------------------------------------------------------
     0. Utilitários
     ----------------------------------------------------------------------- */
  var K = {
    access: "onnprime.access.v1",
    session: "onnprime.session.v1",
    games: "onnprime.games.v1",
    removed: "onnprime.removed.v1",
    throttle: "onnprime.throttle.v1",
    light: "onnprime.light.v1"
  };

  var DEFAULT_ID = "adm";
  var DEFAULT_PASS = "adm";
  var ITERATIONS = 120000;
  var PBKDF2_MAX = 600000;

  function ls(key, value) {
    try {
      if (arguments.length === 1) {
        var raw = localStorage.getItem(key);
        return raw == null ? null : JSON.parse(raw);
      }
      if (value === null || value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return arguments.length === 1 ? null : false;
    }
  }

  function ss(key, value) {
    try {
      if (arguments.length === 1) {
        var raw = sessionStorage.getItem(key);
        return raw == null ? null : JSON.parse(raw);
      }
      if (value === null || value === undefined) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return arguments.length === 1 ? null : false;
    }
  }

  function bytesToHex(bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; i++) out += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
    return out;
  }

  function hexToBytes(hex) {
    var arr = new Uint8Array(hex.length / 2);
    for (var i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
    return arr;
  }

  function randomHex(size) {
    var bytes = new Uint8Array(size);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < size; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytesToHex(bytes);
  }

  function equalHex(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  /* Fallback determinístico para contextos sem WebCrypto (ex.: file://).
     Não é criptográfico — o app avisa quando isso acontece. */
  function weakHash(text) {
    var h1 = 0x811c9dc5, h2 = 0x1000193, out = "";
    for (var round = 0; round < 12000; round++) {
      for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        h1 ^= c + round;
        h1 = (h1 + ((h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24))) >>> 0;
        h2 = ((h2 ^ (c * 31 + round)) * 16777619) >>> 0;
      }
      h1 = (h1 ^ h2) >>> 0;
      h2 = (h2 + h1) >>> 0;
    }
    for (var j = 0; j < 8; j++) {
      h1 = (h1 * 16777619 ^ h2) >>> 0;
      out += ("00000000" + h1.toString(16)).slice(-8);
    }
    return out;
  }

  var enc = new TextEncoder();

  function derive(password, saltHex, iterations) {
    iterations = Math.min(iterations || ITERATIONS, PBKDF2_MAX);
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.deriveBits) {
      return window.crypto.subtle
        .importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"])
        .then(function (key) {
          return window.crypto.subtle.deriveBits(
            { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: iterations, hash: "SHA-256" },
            key,
            256
          );
        })
        .then(function (bits) {
          return { hash: bytesToHex(new Uint8Array(bits)), weak: false, iterations: iterations };
        })
        .catch(function () {
          return { hash: weakHash(saltHex + "::" + password), weak: true, iterations: 1 };
        });
    }
    return Promise.resolve({ hash: weakHash(saltHex + "::" + password), weak: true, iterations: 1 });
  }

  /* -----------------------------------------------------------------------
     1. Normalização de links
     ----------------------------------------------------------------------- */
  var FILE_EXT = /\.(html?|png|jpe?g|webp|gif|svg|js|css|json|mp3|ogg|wav|mp4|webm|pdf|zip|glb|gltf)$/i;
  var DOMAIN_LIKE = /^([\w-]+(?:\.[\w-]+)+)(\/\S*)?$/;

  function normalizeUrl(input) {
    if (typeof input !== "string") return null;
    var url = input.trim().replace(/^["'<]+|["'>]+$/g, "");
    if (!url || /\s/.test(url)) return null;
    if (/^(javascript|data|vbscript|file):/i.test(url)) return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (/^\/\//.test(url)) return "https:" + url;

    // caminhos do próprio projeto
    if (/^(\.\.?\/|\/|assets\/)/i.test(url)) return url;

    var match = url.match(DOMAIN_LIKE);
    if (match) {
      var tld = match[1].split(".").pop();
      // "capa.jpg" / "foto.png" são arquivos locais, não domínios
      if (!(match[2] == null && FILE_EXT.test(url))) {
        if (/^[a-z]{2,24}$/i.test(tld)) return "https://" + url;
      }
    }

    // nome de arquivo ou pasta relativa dentro do projeto
    if (/^[\w][\w./%\-?=&#+]*$/.test(url)) return url;
    return null;
  }

  function isSafeUrl(url) {
    if (typeof url !== "string" || !url.trim()) return false;
    if (/^(javascript|data|vbscript):/i.test(url)) return false;
    if (/^https?:\/\//i.test(url)) return true;
    // caminhos internos do projeto; nunca protocol-relative
    return !/^\/\//.test(url) && /^(?:\.\/|\/|\.\.\/)?[\w]/.test(url);
  }

  function slugify(text) {
    var base = String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return base || "jogo";
  }

  /* -----------------------------------------------------------------------
     2. Base do catálogo (games-data.js)
     ----------------------------------------------------------------------- */
  function baseGames() {
    var src = window.GAME_ONN_DATA;
    if (!src || !Array.isArray(src.games)) return [];
    return src.games
      .filter(function (g) { return g && g.title && g.url; })
      .map(function (g, index) {
        return {
          id: String(g.id || slugify(g.title) + "-" + index),
          title: String(g.title),
          genre: String(g.genre || "Arcade"),
          description: String(g.description || ""),
          url: String(g.url),
          cover: g.cover ? String(g.cover) : "",
          featured: !!g.featured,
          openInNewTab: !!g.openInNewTab,
          addedAt: String(g.addedAt || ""),
          source: "base"
        };
      });
  }

  var SITE = (function () {
    var meta = (window.GAME_ONN_DATA && window.GAME_ONN_DATA.site) || {};
    return {
      name: meta.name || "Game ONN Prime",
      tagline: meta.tagline || "Sua galeria de jogos no navegador"
    };
  })();

  /* -----------------------------------------------------------------------
     3. Acesso / autenticação
     ----------------------------------------------------------------------- */
  var readyResolve;
  var ready = new Promise(function (resolve) { readyResolve = resolve; });

  function readAccess() {
    var data = ls(K.access);
    if (data && data.hash && data.salt && data.identity) return data;
    return null;
  }

  function writeAccess(data) {
    return ls(K.access, data);
  }

  function createDefaultAccess() {
    var salt = randomHex(16);
    return derive(DEFAULT_PASS, salt, ITERATIONS).then(function (out) {
      var access = {
        version: 1,
        identity: DEFAULT_ID,
        hash: out.hash,
        salt: salt,
        iterations: out.iterations,
        weak: out.weak,
        mustChange: true,
        isDefault: true,
        updatedAt: new Date().toISOString()
      };
      writeAccess(access);
      return access;
    });
  }

  function normalizeIdentity(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidIdentity(value) {
    var v = String(value || "").trim();
    if (v.length < 3 || v.length > 64) return false;
    if (normalizeIdentity(v) === DEFAULT_ID) return false;
    var email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var user = /^[a-z0-9][a-z0-9._-]{2,31}$/i;
    return email.test(v) || user.test(v);
  }

  function passwordStrength(pass) {
    var p = String(pass || "");
    if (!p) return 0;
    var score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    if (p.length < 6) score = Math.min(score, 1);
    return Math.min(score, 4);
  }

  function throttleState() {
    return ls(K.throttle) || { fails: 0, until: 0 };
  }

  function registerFail() {
    var state = throttleState();
    state.fails = (state.fails || 0) + 1;
    if (state.fails >= 5) {
      state.until = Date.now() + 60000;
      state.fails = 0;
    }
    ls(K.throttle, state);
    return state;
  }

  function clearThrottle() {
    ls(K.throttle, null);
  }

  function authState() {
    var access = readAccess();
    if (!access) return { configured: false, mustChange: true, identity: DEFAULT_ID, weak: false };
    return {
      configured: !access.mustChange,
      mustChange: !!access.mustChange,
      identity: access.identity,
      weak: !!access.weak,
      updatedAt: access.updatedAt
    };
  }

  function login(identity, password) {
    var access = readAccess();
    if (!access) {
      return createDefaultAccess().then(function () {
        return login(identity, password);
      });
    }
    var wait = throttleState();
    if (wait.until && wait.until > Date.now()) {
      var secs = Math.ceil((wait.until - Date.now()) / 1000);
      return Promise.reject(new Error("Muitas tentativas. Aguarde " + secs + "s e tente de novo."));
    }
    var id = normalizeIdentity(identity);
    var expected = normalizeIdentity(access.identity);
    if (id !== expected) {
      registerFail();
      return Promise.reject(new Error("E-mail/usuário ou senha incorretos."));
    }
    return derive(password, access.salt, access.iterations).then(function (out) {
      if (!equalHex(out.hash, access.hash)) {
        registerFail();
        throw new Error("E-mail/usuário ou senha incorretos.");
      }
      clearThrottle();
      return access;
    });
  }

  function saveAccess(identity, password, remember) {
    var salt = randomHex(16);
    return derive(password, salt, ITERATIONS).then(function (out) {
      var access = {
        version: 1,
        identity: String(identity).trim(),
        hash: out.hash,
        salt: salt,
        iterations: out.iterations,
        weak: out.weak,
        mustChange: false,
        isDefault: false,
        updatedAt: new Date().toISOString()
      };
      if (!writeAccess(access)) {
        throw new Error("O navegador bloqueou o armazenamento local. Libere cookies/armazenamento para este site.");
      }
      clearThrottle();
      return { access: access, remember: remember !== false };
    });
  }

  function createSession(access, remember) {
    var ttl = remember === false ? 12 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    var session = {
      token: randomHex(24),
      identity: access.identity,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      remember: remember !== false
    };
    if (remember === false) {
      ss(K.session, session);
      ls(K.session, null);
    } else {
      ls(K.session, session);
      ss(K.session, null);
    }
    return session;
  }

  function getSession() {
    var session = ls(K.session) || ss(K.session);
    if (!session || !session.token || !session.expiresAt) return null;
    var access = readAccess();
    var stillValid = access && normalizeIdentity(access.identity) === normalizeIdentity(session.identity);
    if (session.expiresAt < Date.now() || !stillValid) {
      ls(K.session, null);
      ss(K.session, null);
      return null;
    }
    return session;
  }

  function logout() {
    ls(K.session, null);
    ss(K.session, null);
  }

  /* -----------------------------------------------------------------------
     4. Catálogo editável
     ----------------------------------------------------------------------- */
  function localGames() {
    var list = ls(K.games);
    return Array.isArray(list) ? list : [];
  }

  function tombstones() {
    var list = ls(K.removed);
    return Array.isArray(list) ? list : [];
  }

  function listGames() {
    var removed = tombstones();
    var local = localGames();
    var localMap = {};
    local.forEach(function (g) { localMap[g.id] = g; });

    var merged = [];
    baseGames().forEach(function (g) {
      if (removed.indexOf(g.id) !== -1) return;
      if (localMap[g.id]) {
        merged.push(Object.assign({}, localMap[g.id], { source: "local" }));
        delete localMap[g.id];
      } else {
        merged.push(g);
      }
    });
    Object.keys(localMap).forEach(function (id) {
      if (removed.indexOf(id) !== -1) return;
      merged.push(Object.assign({}, localMap[id], { source: "local" }));
    });
    return merged;
  }

  function blankGame() {
    return {
      id: "",
      title: "",
      genre: "Arcade",
      description: "",
      url: "",
      cover: "",
      featured: false,
      openInNewTab: false,
      addedAt: new Date().toISOString().slice(0, 10)
    };
  }

  function uniqueId(wanted, currentId) {
    var all = listGames().map(function (g) { return g.id; });
    var base = slugify(wanted);
    var id = base, n = 2;
    while (all.indexOf(id) !== -1 && id !== currentId) {
      id = base + "-" + n++;
    }
    return id;
  }

  function validateGame(input) {
    var errors = [];
    var title = String(input.title || "").trim();
    var url = normalizeUrl(input.url);
    if (title.length < 2) errors.push("Dê um título com pelo menos 2 caracteres.");
    if (title.length > 60) errors.push("O título deve ter no máximo 60 caracteres.");
    if (!url) errors.push("O link do jogo é inválido. Use https://… ou um caminho como assets/games/meu-jogo/index.html");
    var cover = input.cover ? normalizeUrl(input.cover) : "";
    if (input.cover && !cover) errors.push("O link da capa é inválido. Use https://… ou um caminho de imagem do projeto.");
    return {
      ok: errors.length === 0,
      errors: errors,
      value: {
        title: title,
        genre: String(input.genre || "Arcade").trim().slice(0, 24) || "Arcade",
        description: String(input.description || "").trim().slice(0, 170),
        url: url || "",
        cover: cover || "",
        featured: !!input.featured,
        openInNewTab: !!input.openInNewTab,
        addedAt: input.addedAt || new Date().toISOString().slice(0, 10)
      }
    };
  }

  function cleanRecord(record) {
    var copy = Object.assign({}, record);
    delete copy.source;
    delete copy.updatedAt;
    return copy;
  }

  function demoteBaseHighlights(list, keepId) {
    baseGames().forEach(function (g) {
      if (g.id === keepId || !g.featured) return;
      var idx = -1;
      for (var i = 0; i < list.length; i++) if (list[i].id === g.id) idx = i;
      if (idx !== -1) list[idx] = Object.assign({}, list[idx], { featured: false });
      else list.push(Object.assign(cleanRecord(g), { featured: false }));
    });
    return list;
  }

  function saveGame(input) {
    var check = validateGame(input);
    if (!check.ok) return { ok: false, errors: check.errors };

    var list = localGames().slice();
    var targetId = input.id || "";
    var record = Object.assign({ id: "" }, check.value);
    record.id = targetId || uniqueId(input.title, "");
    record.updatedAt = new Date().toISOString();

    var index = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === record.id) index = i;
    if (index !== -1) list[index] = record;
    else list.push(record);

    if (record.featured) {
      // apenas um destaque: rebaixa todos os outros
      list = list.map(function (g) {
        if (g.id === record.id) return g;
        return Object.assign({}, g, { featured: false });
      });
      list = demoteBaseHighlights(list, record.id);

      var seen = {};
      list = list.filter(function (g) {
        if (seen[g.id]) return false;
        seen[g.id] = true;
        return true;
      });
    }

    if (!ls(K.games, list)) return { ok: false, errors: ["Não foi possível salvar: armazenamento local indisponível."] };
    return { ok: true, game: record, list: listGames() };
  }

  function removeGame(id) {
    var locals = localGames().filter(function (g) { return g.id !== id; });
    ls(K.games, locals);
    var isBase = baseGames().some(function (g) { return g.id === id; });
    if (isBase) {
      var dead = tombstones();
      if (dead.indexOf(id) === -1) {
        dead.push(id);
        ls(K.removed, dead);
      }
    }
    return listGames();
  }

  function toggleFeatured(id) {
    var current = listGames();
    var target = null;
    current.forEach(function (g) { if (g.id === id) target = g; });
    if (!target) return current;

    var makeFeatured = !target.featured;
    var locals = localGames().slice();
    var seen = {};

    locals = locals.map(function (g) { return Object.assign({}, g); });

    var found = false;
    locals = locals.map(function (g) {
      if (g.id === id) { found = true; return Object.assign({}, g, { featured: makeFeatured }); }
      return Object.assign({}, g, { featured: false });
    });
    if (!found) locals.push(Object.assign(cleanRecord(target), { featured: makeFeatured }));

    if (makeFeatured) locals = demoteBaseHighlights(locals, id);

    locals = locals.filter(function (g) {
      if (seen[g.id]) return false;
      seen[g.id] = true;
      return true;
    });

    ls(K.games, locals);
    return listGames();
  }

  function resetCatalog() {
    ls(K.games, null);
    ls(K.removed, null);
    return listGames();
  }

  function exportedSource() {
    var games = listGames().map(function (g) {
      return {
        id: g.id,
        title: g.title,
        genre: g.genre,
        description: g.description,
        url: g.url,
        cover: g.cover,
        featured: !!g.featured,
        openInNewTab: !!g.openInNewTab,
        addedAt: g.addedAt || ""
      };
    });
    var payload = {
      site: {
        name: SITE.name,
        tagline: SITE.tagline,
        version: "1.0.0"
      },
      updatedAt: new Date().toISOString().slice(0, 10),
      games: games
    };
    return (
      "/* ==========================================================================\n" +
      "   GAME ONN PRIME — catálogo de jogos\n" +
      "   Gerado pelo painel administrativo em " + new Date().toLocaleString("pt-BR") + "\n" +
      "   Substitua assets/js/games-data.js por este arquivo para publicar.\n" +
      "   ========================================================================== */\n\n" +
      "window.GAME_ONN_DATA = " + JSON.stringify(payload, null, 2) + ";\n"
    );
  }

  /* -----------------------------------------------------------------------
     5. Preferências
     ----------------------------------------------------------------------- */
  function getLightMode() {
    var stored = ls(K.light);
    if (typeof stored === "boolean") return stored;
    var saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""));
    return !!(saveData || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  }

  function setLightMode(on) {
    ls(K.light, !!on);
    return !!on;
  }

  /* -----------------------------------------------------------------------
     6. Exporta API
     ----------------------------------------------------------------------- */
  window.ONN = {
    SITE: SITE,
    DEFAULT_ID: DEFAULT_ID,
    DEFAULT_PASS: DEFAULT_PASS,
    K: K,
    storage: { ls: ls, ss: ss },
    utils: {
      slugify: slugify,
      normalizeUrl: normalizeUrl,
      isSafeUrl: isSafeUrl,
      isValidIdentity: isValidIdentity,
      normalizeIdentity: normalizeIdentity,
      passwordStrength: passwordStrength,
      randomHex: randomHex
    },
    auth: {
      state: authState,
      login: login,
      saveAccess: saveAccess,
      createSession: createSession,
      session: getSession,
      logout: logout,
      configured: function () { return !!readAccess() && !readAccess().mustChange; },
      hasAccess: function () { return !!readAccess(); }
    },
    games: {
      list: listGames,
      base: baseGames,
      blank: blankGame,
      validate: validateGame,
      save: saveGame,
      remove: removeGame,
      toggleFeatured: toggleFeatured,
      reset: resetCatalog,
      exportSource: exportedSource
    },
    prefs: { lightMode: getLightMode, setLightMode: setLightMode }
  };

  /* Inicializa o acesso padrão no primeiro uso. */
  function boot() {
    if (readAccess()) {
      readyResolve();
      return;
    }
    createDefaultAccess().then(readyResolve, readyResolve);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.ONN.ready = ready;
})();
