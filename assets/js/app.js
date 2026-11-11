/* ==========================================================================
   GAME ONN PRIME — app.js
   Interface: login → troca de acesso → galeria → painel do catálogo → player.
   Vanilla JS, sem frameworks. Foco em abrir rápido e não travar.
   ========================================================================== */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var state = {
    user: null,
    identity: "",
    games: [],
    view: "login",
    filter: "all",
    query: "",
    sort: "destaque",
    editing: null,
    playerGame: null,
    playerTimer: null,
    hero: null,
    newTabMode: false
  };

  var el = {};
  var lastFocus = null;
  var renderToken = 0;

  /* -----------------------------------------------------------------------
     Utilidades de interface
     ----------------------------------------------------------------------- */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name) {
    return '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  function safeUrl(url) {
    return window.ONN.utils.isSafeUrl(url) ? url : "";
  }

  function toast(message, kind) {
    kind = kind || "ok";
    var node = document.createElement("div");
    node.className = "toast toast--" + kind;
    node.setAttribute("role", "status");
    node.innerHTML = icon(kind === "err" ? "alert" : kind === "info" ? "spark" : "check") + "<span>" + esc(message) + "</span>";
    el.toasts.appendChild(node);
    window.setTimeout(function () {
      node.classList.add("off");
      window.setTimeout(function () { node.remove(); }, 260);
    }, 3800);
  }

  function showError(node, message) {
    if (!node) return;
    if (!message) {
      node.hidden = true;
      node.textContent = "";
      return;
    }
    node.hidden = false;
    node.textContent = message;
  }

  function markInvalid(input, invalid) {
    var wrap = input && input.closest(".input");
    if (wrap) wrap.classList.toggle("is-invalid", !!invalid);
  }

  function initials(identity) {
    var clean = String(identity || "adm").replace(/@.*/, "");
    var parts = clean.split(/[._\-\s]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }

  function hostOf(url) {
    try {
      if (/^https?:\/\//i.test(url)) return new URL(url).hostname.replace(/^www\./, "");
    } catch (err) { /* ignore */ }
    return "local";
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.classList.toggle("is-busy", !!busy);
    button.disabled = !!busy;
  }

  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var dlg = el.confirmDialog;
      el.confirmTitle.textContent = opts.title || "Confirmar";
      el.confirmMessage.innerHTML = opts.message || "Tem certeza?";
      el.confirmOk.textContent = opts.ok || "Confirmar";
      el.confirmOk.className = "btn " + (opts.danger === false ? "btn--primary" : "btn--danger");
      if (typeof dlg.showModal === "function") {
        dlg.showModal();
        dlg.addEventListener("close", function handler() {
          dlg.removeEventListener("close", handler);
          resolve(dlg.returnValue === "ok");
        });
      } else {
        resolve(window.confirm(opts.title ? opts.title + "\n\n" + (opts.message || "") : "Confirmar?"));
      }
    });
  }

  /* -----------------------------------------------------------------------
     Navegação entre telas
     ----------------------------------------------------------------------- */
  function show(view) {
    state.view = view;
    el.viewLogin.hidden = view !== "login";
    el.viewSetup.hidden = view !== "setup";
    el.viewGallery.hidden = view !== "gallery";
    el.viewAdmin.hidden = view !== "admin";
    document.body.classList.toggle("is-app", view === "gallery" || view === "admin");
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function goSetup(mode) {
    var changing = mode === "change";
    el.setupTitle.textContent = changing ? "Alterar e-mail e senha" : "Crie seu acesso definitivo";
    el.setupSub.textContent = changing
      ? "Defina um novo e-mail e uma nova senha de administrador. O acesso anterior deixa de valer na hora."
      : "Substitua o usuário e a senha padrão. Você vai entrar na galeria logo depois de salvar.";
    el.setupBack.hidden = !changing;
    el.setupReset.hidden = changing;
    $(".steps--setup").hidden = changing;
    el.setupForm.reset();
    el.setupId.value = changing && state.identity ? state.identity : "";
    el.setupId.type = "text";
    el.setupId.setAttribute("autocomplete", "username");
    el.setupSubmit.innerHTML = changing
      ? 'Salvar novo acesso ' + icon("check")
      : 'Salvar acesso e entrar ' + icon("arrow");
    el.strength.dataset.level = "0";
    showError(el.setupError, "");
    markInvalid(el.setupId, false);
    markInvalid(el.setupPass, false);
    markInvalid(el.setupPass2, false);
    show("setup");
    window.setTimeout(function () { (changing ? el.setupId : el.setupPass).focus(); }, 120);
  }

  /* -----------------------------------------------------------------------
     Sessão e login
     ----------------------------------------------------------------------- */
  function refreshSession() {
    var session = window.ONN.auth.session();
    state.user = session;
    state.identity = session ? session.identity : window.ONN.auth.state().identity;
    if (el.apInitials) el.apInitials.textContent = initials(state.identity);
    if (el.apName) el.apName.textContent = state.identity;
    var accessLabel = el.adminAccessLabel;
    if (accessLabel) {
      var st = window.ONN.auth.state();
      accessLabel.innerHTML =
        "Logado como <strong>" + esc(state.identity) + "</strong>" +
        '<br><span style="color:var(--muted-2);font-size:11px">Atualizado em ' +
        esc(st.updatedAt ? new Date(st.updatedAt).toLocaleString("pt-BR") : "—") +
        "</span>";
    }
    return session;
  }

  function applyAccessMode() {
    var st = window.ONN.auth.state();
    if (el.defaultHint) el.defaultHint.hidden = !(st.mustChange && !window.ONN.auth.session());
    if (el.statGames) el.statGames.textContent = String(window.ONN.games.list().length);
  }

  function bootRoute() {
    applyAccessMode();
    var session = window.ONN.auth.session();
    if (session) {
      refreshSession();
      loadCatalog();
      show("gallery");
      return;
    }
    show("login");
    window.setTimeout(function () { el.loginId.focus(); }, 150);
  }

  function handleLogin(event) {
    event.preventDefault();
    var identity = el.loginId.value.trim();
    var password = el.loginPass.value;
    var remember = el.loginRemember.checked;

    showError(el.loginError, "");
    markInvalid(el.loginId, false);
    markInvalid(el.loginPass, false);

    if (!identity) {
      markInvalid(el.loginId, true);
      showError(el.loginError, "Informe seu e-mail ou usuário.");
      el.loginId.focus();
      return;
    }
    if (!password) {
      markInvalid(el.loginPass, true);
      showError(el.loginError, "Informe sua senha.");
      el.loginPass.focus();
      return;
    }

    setBusy(el.loginSubmit, true);
    window.ONN.auth.login(identity, password)
      .then(function (access) {
        var session = window.ONN.auth.createSession(access, remember);
        state.user = session;
        state.identity = session.identity;
        el.loginPass.value = "";
        setBusy(el.loginSubmit, false);

        if (access.mustChange) {
          toast("Primeiro acesso confirmado. Crie sua senha definitiva.", "info");
          refreshSession();
          applyAccessMode();
          goSetup("first");
          return;
        }
        refreshSession();
        applyAccessMode();
        loadCatalog();
        show("gallery");
        toast("Bem-vindo de volta, " + state.identity.split("@")[0] + "!", "ok");
      })
      .catch(function (err) {
        setBusy(el.loginSubmit, false);
        markInvalid(el.loginPass, true);
        showError(el.loginError, err && err.message ? err.message : "Não foi possível entrar. Tente novamente.");
        el.loginPass.select();
      });
  }

  function handleSetup(event) {
    event.preventDefault();
    var identity = el.setupId.value.trim();
    var pass = el.setupPass.value;
    var pass2 = el.setupPass2.value;

    showError(el.setupError, "");
    [el.setupId, el.setupPass, el.setupPass2].forEach(function (input) { markInvalid(input, false); });

    if (!window.ONN.utils.isValidIdentity(identity)) {
      markInvalid(el.setupId, true);
      showError(el.setupError, "Informe um e-mail válido (voce@exemplo.com) ou um usuário de 3 a 32 caracteres, diferente de \"adm\".");
      el.setupId.focus();
      return;
    }
    if (pass.length < 6) {
      markInvalid(el.setupPass, true);
      showError(el.setupError, "A senha precisa ter pelo menos 6 caracteres.");
      el.setupPass.focus();
      return;
    }
    if (pass !== pass2) {
      markInvalid(el.setupPass2, true);
      showError(el.setupError, "As senhas não conferem. Digite a mesma senha nos dois campos.");
      el.setupPass2.focus();
      return;
    }

    setBusy(el.setupSubmit, true);
    window.ONN.auth.saveAccess(identity, pass, true)
      .then(function (result) {
        var session = window.ONN.auth.createSession(result.access, true);
        state.user = session;
        state.identity = session.identity;
        refreshSession();
        applyAccessMode();
        loadCatalog();
        show("gallery");
        setBusy(el.setupSubmit, false);
        el.setupForm.reset();
        toast("Acesso atualizado! Entre sempre com " + identity + ".", "ok");
      })
      .catch(function (err) {
        setBusy(el.setupSubmit, false);
        showError(el.setupError, err && err.message ? err.message : "Não foi possível salvar seu acesso.");
      });
  }

  function logout(forceMessage) {
    window.ONN.auth.logout();
    state.user = null;
    closePlayer();
    state.games = [];
    applyAccessMode();
    show("login");
    el.loginForm.reset();
    el.loginRemember.checked = true;
    showError(el.loginError, "");
    window.setTimeout(function () { el.loginId.focus(); }, 120);
    if (forceMessage) toast(forceMessage, "info");
  }

  function guard() {
    if (!window.ONN.auth.session()) {
      logout("Sua sessão expirou. Entre novamente.");
      return false;
    }
    return true;
  }

  /* -----------------------------------------------------------------------
     Catálogo
     ----------------------------------------------------------------------- */
  function loadCatalog() {
    state.games = window.ONN.games.list();
    if (el.gameCount) el.gameCount.textContent = String(state.games.length);
    if (el.adminCount) el.adminCount.textContent = String(state.games.length);
    if (el.footerCount) el.footerCount.textContent = String(state.games.length);
    if (el.statGames) el.statGames.textContent = String(state.games.length);

    var featured = state.games.filter(function (g) { return g.featured; });
    state.hero = featured[0] || state.games[0] || null;
    if (state.hero && !featured.length) state.hero.featured = true;
    renderHero();
    renderChips();
    renderGallery();
    renderAdminList();
  }

  function sortedFiltered() {
    var query = state.query.trim().toLowerCase();
    var list = state.games.filter(function (g) {
      var matchQuery =
        !query ||
        g.title.toLowerCase().indexOf(query) !== -1 ||
        (g.genre || "").toLowerCase().indexOf(query) !== -1 ||
        (g.description || "").toLowerCase().indexOf(query) !== -1;
      var matchGenre = state.filter === "all" || g.genre === state.filter;
      return matchQuery && matchGenre;
    });

    var sort = state.sort;
    list = list.slice().sort(function (a, b) {
      if (sort === "az") return a.title.localeCompare(b.title, "pt-BR");
      if (sort === "za") return b.title.localeCompare(a.title, "pt-BR");
      if (sort === "novos") return String(b.addedAt).localeCompare(String(a.addedAt));
      var fa = a.featured ? 1 : 0;
      var fb = b.featured ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return a.title.localeCompare(b.title, "pt-BR");
    });
    return list;
  }

  function coverMarkup(game, className) {
    var cover = safeUrl(game.cover);
    var fallback = '<div class="card__coverfallback">' + icon("gamepad") + "</div>";
    if (!cover) return fallback;
    return (
      fallback +
      '<img class="' + (className || "") + '" src="' + esc(cover) + '" alt="Capa de ' + esc(game.title) + '" loading="lazy" decoding="async" ' +
      "onload=\"this.classList.add('is-loaded');this.parentNode.querySelector('.card__coverfallback').style.display='none'\" " +
      "onerror=\"this.remove()\">"
    );
  }

  function renderChips() {
    var counts = {};
    state.games.forEach(function (g) {
      counts[g.genre] = (counts[g.genre] || 0) + 1;
    });
    var genres = Object.keys(counts).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
    var html = '<button class="chip' + (state.filter === "all" ? " is-active" : "") + '" type="button" data-genre="all">Todos <span class="chip__n">' + state.games.length + "</span></button>";
    genres.forEach(function (genre) {
      html +=
        '<button class="chip' + (state.filter === genre ? " is-active" : "") + '" type="button" data-genre="' + esc(genre) + '">' +
        esc(genre) + ' <span class="chip__n">' + counts[genre] + "</span></button>";
    });
    el.genreChips.innerHTML = html;
  }

  function renderHero() {
    var game = state.hero;
    el.hero.hidden = !game;
    if (!game) {
      el.hero.classList.add("hero--empty");
      el.heroImg.hidden = true;
      el.heroImg.removeAttribute("src");
      el.heroImg.alt = "";
      el.heroTitle.textContent = "Sua galeria começa aqui";
      el.heroDesc.textContent = "Nenhum jogo cadastrado ainda. Adicione o primeiro com o link direto do jogo e o link da capa.";
      el.heroMeta.innerHTML =
        '<span class="pill pill--outline">' + icon("link") + " Link do jogo</span>" +
        '<span class="sep"></span>' +
        '<span class="pill pill--outline">' + icon("image") + " Link da capa</span>";
      el.heroPlay.hidden = true;
      el.heroManage.hidden = false;
      el.heroIndex.textContent = "00";
      return;
    }
    el.hero.hidden = false;
    el.hero.classList.remove("hero--empty");
    el.heroImg.hidden = false;
    el.heroPlay.hidden = false;
    el.heroManage.hidden = false;
    el.heroImg.onerror = function () {
      el.heroImg.hidden = true;
      el.hero.classList.add("hero--empty");
    };
    el.heroImg.src = safeUrl(game.cover) || "assets/img/hero.jpg";
    el.heroImg.alt = "Capa de " + game.title;
    el.heroTitle.textContent = game.title;
    el.heroDesc.textContent = game.description || "Pronto para jogar no navegador.";
    el.heroMeta.innerHTML =
      '<span class="pill pill--lime">' + esc(game.genre) + "</span>" +
      '<span class="sep"></span>' +
      "<span>" + (game.openInNewTab ? "Abre em nova aba" : "Roda dentro da galeria") + "</span>" +
      '<span class="sep"></span>' +
      "<span>" + esc(hostOf(game.url)) + "</span>";
    var index = state.games.indexOf(game) + 1;
    el.heroIndex.textContent = String(index).padStart(2, "0");
  }

  function renderGallery() {
    var list = sortedFiltered();
    el.gameGrid.innerHTML = "";
    el.empty.hidden = list.length > 0;
    var noGames = state.games.length === 0;
    el.libraryTools.hidden = noGames;
    el.genreChips.hidden = noGames;
    el.library.classList.toggle("library--empty", noGames);
    el.libraryTitleText.textContent = noGames ? "Sua biblioteca" : "Todos os jogos";
    el.emptyDesc.textContent = noGames ? "Cadastre o primeiro jogo com o link direto e o link da capa. Leva menos de um minuto." : "Tente outro termo de busca ou limpe os filtros.";
    el.empty.classList.toggle("empty--first", noGames);
    el.emptySteps.hidden = !noGames;
    el.emptyIcon.innerHTML = noGames ? icon("gamepad") : icon("search");
    el.emptyTitle.textContent = noGames ? "Seu catálogo está vazio" : "Nenhum jogo encontrado";
    el.emptyDesc.textContent = noGames
      ? "Abra o painel do catálogo e cadastre o primeiro jogo com link e capa."
      : "Tente outro termo de busca ou limpe os filtros.";
    el.emptyClear.hidden = noGames;
    el.emptyAdd.hidden = !noGames;

    var fragment = document.createDocumentFragment();
    list.forEach(function (game, i) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.style.animationDelay = Math.min(i * 24, 260) + "ms";
      card.dataset.id = game.id;
      card.setAttribute("aria-label", "Jogar " + game.title);
      card.innerHTML =
        '<div class="card__media">' +
        coverMarkup(game) +
        '<div class="card__badges">' +
        (game.featured ? '<span class="pill pill--lime">' + icon("spark") + " Destaque</span>" : "") +
        '<span class="pill pill--muted pill--right">' + esc(game.genre) + "</span>" +
        "</div>" +
        '<span class="card__play">' + icon("play") + "</span>" +
        "</div>" +
        '<div class="card__body">' +
        '<span class="card__genre">' + esc(game.genre) + "</span>" +
        '<span class="card__title">' + esc(game.title) + "</span>" +
        '<span class="card__desc">' + esc(game.description || "Clique para jogar agora") + "</span>" +
        "</div>";
      fragment.appendChild(card);
    });
    el.gameGrid.appendChild(fragment);
  }

  /* -----------------------------------------------------------------------
     Painel administrativo
     ----------------------------------------------------------------------- */
  function renderAdminList() {
    el.adminList.innerHTML = "";
    if (!state.games.length) {
      el.adminList.innerHTML =
        '<li class="row"><div class="row__main"><p class="row__meta">Nenhum jogo ainda. Use o formulário ao lado para adicionar.</p></div></li>';
      return;
    }

    var fragment = document.createDocumentFragment();
    state.games.forEach(function (game) {
      var li = document.createElement("li");
      li.className = "row";
      li.dataset.id = game.id;
      li.innerHTML =
        '<div class="row__thumb">' + coverMarkup(game) + "</div>" +
        '<div class="row__main">' +
        '<p class="row__title">' + esc(game.title) +
        '<span class="' + (game.source === "local" ? "is-local" : "is-base") + '">' +
        (game.source === "local" ? "Salvo aqui" : "Do arquivo") +
        "</span>" +
        (game.featured ? '<span class="is-base">Destaque</span>' : "") +
        "</p>" +
        '<p class="row__meta"><span>' + esc(game.genre) + '</span><span class="sep">·</span><span class="url">' + esc(game.url) + "</span></p>" +
        "</div>" +
        '<div class="row__actions">' +
        '<button class="icon-btn icon-btn--star' + (game.featured ? " is-on" : "") + '" type="button" data-act="feature" title="Destacar" aria-label="Destacar ' + esc(game.title) + '">' + icon("star") + "</button>" +
        '<button class="icon-btn" type="button" data-act="play" title="Jogar" aria-label="Jogar ' + esc(game.title) + '">' + icon("play") + "</button>" +
        '<button class="icon-btn" type="button" data-act="edit" title="Editar" aria-label="Editar ' + esc(game.title) + '">' + icon("edit") + "</button>" +
        '<button class="icon-btn icon-btn--del" type="button" data-act="del" title="Excluir" aria-label="Excluir ' + esc(game.title) + '">' + icon("trash") + "</button>" +
        "</div>";
      fragment.appendChild(li);
    });
    el.adminList.appendChild(fragment);
  }

  function fillGameForm(game) {
    state.editing = game ? game.id : null;
    el.gameOriginalId.value = game ? game.id : "";
    el.gameTitle.value = game ? game.title : "";
    el.gameGenre.value = game ? game.genre : "";
    el.gameDesc.value = game ? game.description : "";
    el.gameLink.value = game ? game.url : "";
    el.gameCover.value = game ? game.cover : "";
    el.gameFeatured.checked = game ? !!game.featured : false;
    el.gameNewTab.checked = game ? !!game.openInNewTab : false;
    el.formMode.textContent = game ? "Editando" : "Novo";
    el.formTitle.textContent = game ? "Editar jogo" : "Adicionar à galeria";
    el.formEyebrow.textContent = game ? "Editando" : "Novo jogo";
    el.gameCancel.hidden = !game;
    showError(el.gameError, "");
    previewCover();
    if (game) el.gameTitle.focus();
  }

  function previewCover() {
    var value = el.gameCover.value.trim();
    var url = value ? window.ONN.utils.normalizeUrl(value) : "";
    if (!url || !/^(https?:|\.?\/)/i.test(url)) {
      el.coverPreviewImg.hidden = true;
      el.coverPreviewImg.removeAttribute("src");
      el.coverPreviewPh.hidden = false;
      return;
    }
    el.coverPreviewImg.onerror = function () {
      el.coverPreviewImg.hidden = true;
      el.coverPreviewPh.hidden = false;
    };
    el.coverPreviewImg.onload = function () {
      el.coverPreviewImg.hidden = false;
      el.coverPreviewPh.hidden = true;
    };
    el.coverPreviewImg.src = url;
  }

  function handleGameSubmit(event) {
    event.preventDefault();
    showError(el.gameError, "");
    [el.gameTitle, el.gameLink, el.gameCover].forEach(function (input) { markInvalid(input, false); });

    var payload = {
      id: el.gameOriginalId.value || "",
      title: el.gameTitle.value,
      genre: el.gameGenre.value,
      description: el.gameDesc.value,
      url: el.gameLink.value,
      cover: el.gameCover.value,
      featured: el.gameFeatured.checked,
      openInNewTab: el.gameNewTab.checked
    };

    var check = window.ONN.games.validate(payload);
    if (!check.ok) {
      showError(el.gameError, check.errors.join(" "));
      if (!check.value.title || check.value.title.length < 2) markInvalid(el.gameTitle, true);
      if (!check.value.url) markInvalid(el.gameLink, true);
      if (payload.cover && !check.value.cover) markInvalid(el.gameCover, true);
      return;
    }

    var result = window.ONN.games.save(payload);
    if (!result.ok) {
      showError(el.gameError, result.errors.join(" "));
      return;
    }
    loadCatalog();
    fillGameForm(null);
    toast(payload.id ? "Jogo atualizado." : "Jogo adicionado à galeria.", "ok");
    var row = $('.row[data-id="' + result.game.id + '"]');
    if (row) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function handleAdminAction(event) {
    var btn = event.target.closest("[data-act]");
    if (!btn) return;
    var row = btn.closest(".row");
    if (!row) return;
    var id = row.dataset.id;
    var game = state.games.filter(function (g) { return g.id === id; })[0];
    if (!game) return;

    if (btn.dataset.act === "play") {
      openPlayer(game);
      return;
    }
    if (btn.dataset.act === "edit") {
      fillGameForm(game);
      el.formTitle.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (btn.dataset.act === "feature") {
      window.ONN.games.toggleFeatured(id);
      loadCatalog();
      toast(game.featured ? "Destaque removido." : "Agora este jogo está em destaque.", "ok");
      return;
    }
    if (btn.dataset.act === "del") {
      confirmDialog({
        title: "Excluir “" + game.title + "”?",
        message: "O jogo sai da sua galeria. Você pode restaurá-lo depois com “Restaurar do arquivo”.",
        ok: "Excluir",
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        window.ONN.games.remove(id);
        if (state.editing === id) fillGameForm(null);
        loadCatalog();
        toast("Jogo excluído da galeria.", "info");
      });
    }
  }

  function exportCatalog() {
    var source = window.ONN.games.exportSource();
    var blob = new Blob([source], { type: "text/javascript;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "games-data.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast("Arquivo games-data.js gerado. Substitua-o no repositório para publicar.", "ok");
  }

  /* -----------------------------------------------------------------------
     Player
     ----------------------------------------------------------------------- */
  function openPlayer(game) {
    if (!game) return;
    var url = safeUrl(game.url);
    if (!url) {
      toast("O link deste jogo é inválido.", "err");
      return;
    }
    if (game.openInNewTab || state.newTabMode) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    lastFocus = document.activeElement;
    state.playerGame = game;
    el.playerTitle.textContent = game.title;
    el.playerMeta.textContent = game.genre + " · " + hostOf(url);
    el.playerLoadingName.textContent = game.title;
    el.playerUrl.href = url;
    el.playerFallback.hidden = true;
    el.playerLoading.hidden = false;
    el.playerFrame.hidden = false;
    el.playerFrame.src = url;
    el.player.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(function () { el.playerClose.focus(); }, 60);

    var started = Date.now();
    el.playerTimer.hidden = false;
    el.playerTimer.textContent = "00:00";
    window.clearInterval(state.playerTimer);
    state.playerTimer = window.setInterval(function () {
      var secs = Math.floor((Date.now() - started) / 1000);
      el.playerTimer.textContent =
        String(Math.floor(secs / 60)).padStart(2, "0") + ":" + String(secs % 60).padStart(2, "0");
    }, 1000);

    var loaded = false;
    el.playerFrame.onload = function () {
      loaded = true;
      el.playerLoading.hidden = true;
    };
    window.setTimeout(function () {
      if (!loaded && !el.player.hidden) {
        el.playerLoading.hidden = false;
        el.playerFallback.hidden = false;
      }
    }, 6000);
  }

  function closePlayer() {
    if (el.player.hidden) return;
    el.player.hidden = true;
    el.playerFrame.src = "about:blank";
    el.playerFrame.removeAttribute("src");
    el.playerFallback.hidden = true;
    window.clearInterval(state.playerTimer);
    state.playerTimer = null;
    state.playerGame = null;
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  /* -----------------------------------------------------------------------
     Eventos
     ----------------------------------------------------------------------- */
  function bind() {
    el.loginForm.addEventListener("submit", handleLogin);
    el.setupForm.addEventListener("submit", handleSetup);

    $$("[data-peek]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.dataset.peek);
        if (!input) return;
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-pressed", String(show));
        btn.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
        btn.querySelector("use").setAttribute("href", show ? "#i-eye-off" : "#i-eye");
      });
    });

    el.fillDefault.addEventListener("click", function () {
      el.loginId.value = window.ONN.DEFAULT_ID;
      el.loginPass.value = window.ONN.DEFAULT_PASS;
      el.loginPass.focus();
      showError(el.loginError, "");
      if (window.innerWidth > 900) el.loginPass.select();
      else el.loginPass.focus();
    });

    el.forgotBtn.addEventListener("click", function () {
      confirmDialog({
        title: "Recuperar acesso",
        message: "Não existe envio de e-mail neste projeto. Se você esqueceu a senha e está no dispositivo onde ela foi criada, é possível voltar ao padrão <strong>adm / adm</strong> e configurar de novo. Se estiver em outro dispositivo, restaure o catálogo limpando os dados do site.<br><br>Deseja voltar ao padrão adm / adm agora?",
        ok: "Voltar ao padrão",
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        window.ONN.storage.ls(window.ONN.K.access, null);
        window.ONN.storage.ls(window.ONN.K.session, null);
        window.ONN.storage.ls(window.ONN.K.throttle, null);
        window.location.reload();
      });
    });

    el.setupBack.addEventListener("click", function () {
      if (!guard()) return;
      show("gallery");
    });

    el.setupReset.addEventListener("click", function () {
      confirmDialog({
        title: "Voltar ao padrão adm / adm",
        message: "Isso apaga o acesso criado e volta para <strong>adm / adm</strong>. Use apenas se realmente não lembrar da sua senha.",
        ok: "Voltar ao padrão",
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        window.ONN.storage.ls(window.ONN.K.access, null);
        window.ONN.storage.ls(window.ONN.K.session, null);
        window.location.reload();
      });
    });

    el.setupPass.addEventListener("input", function () {
      el.strength.dataset.level = String(window.ONN.utils.passwordStrength(el.setupPass.value));
    });

    el.loginId.addEventListener("input", function () { markInvalid(el.loginId, false); });
    el.loginPass.addEventListener("input", function () { markInvalid(el.loginPass, false); });
    [el.setupId, el.setupPass, el.setupPass2].forEach(function (input) {
      input.addEventListener("input", function () { markInvalid(input, false); });
    });
    el.loginRemember.addEventListener("change", function () {
      if (!el.loginRemember.checked) {
        toast("Sem “manter conectado”, a sessão dura 12 horas.", "info");
      }
    });

    if (el.defaultHint) {
      var st = window.ONN.auth.state();
      el.defaultHint.hidden = !st.mustChange;
    }

    /* Usuário */
    el.userBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      var open = el.userBtn.getAttribute("aria-expanded") === "true";
      el.userBtn.setAttribute("aria-expanded", String(!open));
      el.userMenu.hidden = open;
    });
    document.addEventListener("click", function () {
      if (!el.userMenu.hidden) {
        el.userMenu.hidden = true;
        el.userBtn.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !el.userMenu.hidden) {
        el.userMenu.hidden = true;
        el.userBtn.setAttribute("aria-expanded", "false");
      }
    });
    el.changeAccess.addEventListener("click", function () {
      el.userMenu.hidden = true;
      el.userBtn.setAttribute("aria-expanded", "false");
      if (!guard()) return;
      goSetup("change");
    });
    el.changeAccess2.addEventListener("click", function () {
      if (!guard()) return;
      goSetup("change");
    });
    el.logoutBtn.addEventListener("click", function () {
      el.userMenu.hidden = true;
      logout("Você saiu da conta.");
    });
    el.adminLogout.addEventListener("click", function () { logout("Você saiu da conta."); });

    $$("[data-goto-admin]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!guard()) return;
        el.userMenu.hidden = true;
        show("admin");
        fillGameForm(null);
        renderAdminList();
        if (el.adminAccessLabel) refreshSession();
      });
    });
    $$("[data-goto-gallery]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!guard()) return;
        show("gallery");
      });
    });

    /* Tema leve */
    var lightOn = window.ONN.prefs.lightMode();
    document.documentElement.dataset.perf = lightOn ? "low" : "high";
    el.lightSwitch.classList.toggle("on", lightOn);
    el.toggleLight.addEventListener("click", function () {
      var on = document.documentElement.dataset.perf !== "low";
      document.documentElement.dataset.perf = on ? "low" : "high";
      window.ONN.prefs.setLightMode(on);
      el.lightSwitch.classList.toggle("on", on);
      toast(on ? "Modo leve ativado: menos efeitos, mais desempenho." : "Modo visual completo ativado.", "info");
    });

    /* Galeria */
    el.genreChips.addEventListener("click", function (event) {
      var chip = event.target.closest("[data-genre]");
      if (!chip) return;
      state.filter = chip.dataset.genre;
      renderChips();
      renderGallery();
    });
    el.search.addEventListener("input", function () {
      state.query = el.search.value;
      renderGallery();
    });
    el.sort.addEventListener("change", function () {
      state.sort = el.sort.value;
      renderGallery();
    });
    el.emptyAdd.addEventListener("click", function () {
      if (!guard()) return;
      show("admin");
      fillGameForm(null);
    });
    el.emptyClear.addEventListener("click", function () {
      state.query = "";
      state.filter = "all";
      el.search.value = "";
      renderChips();
      renderGallery();
    });
    el.gameGrid.addEventListener("click", function (event) {
      var card = event.target.closest(".card");
      if (!card) return;
      var game = state.games.filter(function (g) { return g.id === card.dataset.id; })[0];
      openPlayer(game);
    });
    el.heroPlay.addEventListener("click", function () { openPlayer(state.hero); });
    el.heroManage.addEventListener("click", function () {
      if (!guard()) return;
      show("admin");
      if (state.hero) fillGameForm(state.hero);
    });

    document.addEventListener("keydown", function (event) {
      if (state.view !== "gallery") return;
      if (event.key === "/" && document.activeElement !== el.search) {
        event.preventDefault();
        el.search.focus();
      }
    });

    /* Admin */
    el.gameForm.addEventListener("submit", handleGameSubmit);
    el.gameCancel.addEventListener("click", function () { fillGameForm(null); });
    el.gameCover.addEventListener("input", previewCover);
    el.adminList.addEventListener("click", handleAdminAction);
    el.exportBtn.addEventListener("click", exportCatalog);
    el.resetBtn.addEventListener("click", function () {
      confirmDialog({
        title: "Restaurar catálogo do arquivo?",
        message: "Todos os jogos adicionados ou editados neste navegador serão descartados e o catálogo volta a ser o do arquivo <code>games-data.js</code>.",
        ok: "Restaurar",
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        window.ONN.games.reset();
        loadCatalog();
        fillGameForm(null);
        toast("Catálogo restaurado a partir do arquivo.", "info");
      });
    });

    /* Player */
    el.playerClose.addEventListener("click", closePlayer);
    el.playerReload.addEventListener("click", function () {
      if (!state.playerGame) return;
      el.playerLoading.hidden = false;
      el.playerFrame.src = "about:blank";
      window.setTimeout(function () { el.playerFrame.src = safeUrl(state.playerGame.url); }, 60);
    });
    el.playerNewTab.addEventListener("click", function () {
      if (state.playerGame) window.open(safeUrl(state.playerGame.url), "_blank", "noopener,noreferrer");
    });
    el.playerOpenExternal.addEventListener("click", function () {
      if (!state.playerGame) return;
      window.open(safeUrl(state.playerGame.url), "_blank", "noopener,noreferrer");
      state.newTabMode = true;
      try { window.sessionStorage.setItem("onnprime.newtab", "1"); } catch (err) { /* ignore */ }
      toast("Os próximos jogos vão abrir em nova aba nesta sessão.", "info");
      closePlayer();
    });
    el.playerFull.addEventListener("click", function () {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }
      var target = document.getElementById("player-stage");
      if (target && target.requestFullscreen) target.requestFullscreen().catch(function () { /* ignore */ });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || el.player.hidden) return;
      if (document.fullscreenElement) return; // o navegador já sai da tela cheia
      closePlayer();
    });

    /* Links da marca voltam ao topo sem recarregar */
    $$('a.brand').forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (state.view === "gallery" || state.view === "admin") {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });
  }

  /* -----------------------------------------------------------------------
     Início
     ----------------------------------------------------------------------- */
  function cacheEls() {
    el.viewLogin = $("#view-login");
    el.viewSetup = $("#view-setup");
    el.viewGallery = $("#view-gallery");
    el.viewAdmin = $("#view-admin");
    el.splash = $("#splash");

    el.loginForm = $("#login-form");
    el.loginId = $("#login-id");
    el.loginPass = $("#login-pass");
    el.loginRemember = $("#login-remember");
    el.loginError = $("#login-error");
    el.loginSubmit = $("#login-submit");
    el.defaultHint = $("#default-hint");
    el.fillDefault = $("#fill-default");
    el.forgotBtn = $("#forgot-btn");

    el.setupForm = $("#setup-form");
    el.setupId = $("#setup-id");
    el.setupPass = $("#setup-pass");
    el.setupPass2 = $("#setup-pass2");
    el.setupError = $("#setup-error");
    el.setupSubmit = $("#setup-submit");
    el.setupBack = $("#setup-back");
    el.setupReset = $("#setup-reset");
    el.setupTitle = $("#setup-title");
    el.setupSub = $("#setup-sub");
    el.strength = $("#strength");
    el.statGames = $("#stat-games");

    el.userBtn = $("#user-btn");
    el.userMenu = $("#user-menu");
    el.apInitials = $("#user-initials");
    el.apName = $("#user-name");
    el.changeAccess = $("#change-access");
    el.changeAccess2 = $("#change-access-2");
    el.toggleLight = $("#toggle-light");
    el.lightSwitch = $("#light-switch");
    el.logoutBtn = $("#logout-btn");
    el.adminLogout = $("#admin-logout");
    el.adminAccessLabel = $("#admin-access-label");

    el.hero = $("#hero");
    el.heroImg = $("#hero-img");
    el.heroTitle = $("#hero-title");
    el.heroDesc = $("#hero-desc");
    el.heroMeta = $("#hero-meta");
    el.heroPlay = $("#hero-play");
    el.heroManage = $("#hero-manage");
    el.heroIndex = $("#hero-index");

    el.gameCount = $("#game-count");
    el.footerCount = $("#footer-count");
    el.adminCount = $("#admin-count");
    el.genreChips = $("#genre-chips");
    el.gameGrid = $("#game-grid");
    el.empty = $("#empty");
    el.emptyClear = $("#empty-clear");
    el.libraryTools = $(".library__tools");
    el.library = $(".library");
    el.emptySteps = $("#empty-steps");
    el.emptyIcon = $("#empty-icon");
    el.libraryTitleText = $("#library-title-text");
    el.libraryHead = $("#library-head");
    el.emptyAdd = $("#empty-add");
    el.emptyTitle = $("#empty-title");
    el.emptyDesc = $("#empty-desc");
    el.search = $("#search");
    el.sort = $("#sort");

    el.gameForm = $("#game-form");
    el.gameOriginalId = $("#game-original-id");
    el.gameTitle = $("#game-title");
    el.gameGenre = $("#game-genre");
    el.gameDesc = $("#game-desc");
    el.gameLink = $("#game-link");
    el.gameCover = $("#game-cover");
    el.gameFeatured = $("#game-featured");
    el.gameNewTab = $("#game-newtab");
    el.gameError = $("#game-error");
    el.gameCancel = $("#game-cancel");
    el.coverPreviewImg = $("#cover-preview-img");
    el.coverPreviewPh = $("#cover-preview-ph");
    el.formTitle = $("#form-title");
    el.formMode = $("#form-mode");
    el.formEyebrow = $("#form-eyebrow");
    el.adminList = $("#admin-list");
    el.exportBtn = $("#export-btn");
    el.resetBtn = $("#reset-btn");

    el.player = $("#player");
    el.playerTitle = $("#player-title");
    el.playerMeta = $("#player-meta");
    el.playerFrame = $("#player-frame");
    el.playerLoading = $("#player-loading");
    el.playerLoadingName = $("#player-loading-name");
    el.playerFallback = $("#player-fallback");
    el.playerOpenExternal = $("#player-open-external");
    el.playerClose = $("#player-close");
    el.playerReload = $("#player-reload");
    el.playerNewTab = $("#player-newtab");
    el.playerFull = $("#player-full");
    el.playerTimer = $("#player-timer");
    el.playerUrl = $("#player-url");

    el.confirmDialog = $("#confirm-dialog");
    el.confirmTitle = $("#confirm-title");
    el.confirmMessage = $("#confirm-message");
    el.confirmOk = $("#confirm-ok");
    el.toasts = $("#toasts");

    el.coverPreview = $("#cover-preview");
  }

  function init() {
    cacheEls();
    try { state.newTabMode = window.sessionStorage.getItem("onnprime.newtab") === "1"; } catch (err) { state.newTabMode = false; }
    bind();

    window.ONN.ready.then(function () {
      bootRoute();
      applyAccessMode();
      window.setTimeout(function () { el.splash.classList.add("off"); }, 240);
    });

    /* Sessão expirando em outra aba */
    window.addEventListener("storage", function (event) {
      if (event.key === window.ONN.K.session && !event.newValue && state.user) {
        logout("Sua sessão foi encerrada em outra aba.");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
