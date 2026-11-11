/* ==========================================================================
   GAME ONN PRIME — catálogo de jogos
   --------------------------------------------------------------------------
   ESTE É O ARQUIVO QUE VOCÊ EDITA PARA ADICIONAR JOGOS.
   Cada jogo precisa de:
     id            → identificador único, sem espaços (ex.: "meu-jogo")
     title         → nome que aparece na galeria
     genre         → gênero (vira filtro automaticamente)
     description   → frase curta
     url           → link direto que abre o jogo no navegador
                     (pode ser https://... ou um caminho do projeto,
                     ex.: "assets/games/meu-jogo/index.html")
     cover         → link da imagem de capa (https://... ou caminho local)
     featured      → true coloca o jogo no banner principal
     openInNewTab  → true abre fora da galeria (use quando o site do jogo
                     bloqueia ser exibido dentro de outra página)
     addedAt       → data no formato "AAAA-MM-DD" (usada na ordenação)

   Dica: você também pode cadastrar pelo painel do site e clicar em
   "Exportar games-data.js" para substituir este arquivo no repositório.
   ========================================================================== */

window.GAME_ONN_DATA = {
  site: {
    name: "Game ONN Prime",
    tagline: "Sua galeria de jogos no navegador",
    version: "1.0.0"
  },

  updatedAt: "2026-11-11",

  games: [
    {
      id: "neon-snake",
      title: "Neon Snake",
      genre: "Arcade",
      description: "A serpente de luz cresce a cada fruta. Desvie de si mesmo e bata seu recorde.",
      url: "assets/games/snake/index.html",
      cover: "assets/img/games/snake.jpg",
      featured: true,
      openInNewTab: false,
      addedAt: "2026-11-05"
    },
    {
      id: "tile-2048",
      title: "Tile 2048",
      genre: "Puzzle",
      description: "Junte os números iguais e chegue à peça 2048. Simples de aprender, difícil de largar.",
      url: "assets/games/2048/index.html",
      cover: "assets/img/games/2048.jpg",
      featured: false,
      openInNewTab: false,
      addedAt: "2026-11-04"
    },
    {
      id: "block-drop",
      title: "Block Drop",
      genre: "Puzzle",
      description: "Encaixe as peças, complete linhas e sobreviva o máximo que puder.",
      url: "assets/games/blocks/index.html",
      cover: "assets/img/games/blocks.jpg",
      featured: false,
      openInNewTab: false,
      addedAt: "2026-11-03"
    },
    {
      id: "night-bird",
      title: "Night Bird",
      genre: "Ação",
      description: "Um voo noturno entre canos. Um toque para subir, precisão para durar.",
      url: "assets/games/flappy/index.html",
      cover: "assets/img/games/flappy.jpg",
      featured: false,
      openInNewTab: false,
      addedAt: "2026-11-02"
    },
    {
      id: "orbital-strike",
      title: "Orbital Strike",
      genre: "Ação",
      description: "Pilote a nave, destrua os asteroides e proteja o setor. Tiro rápido e reflexo.",
      url: "assets/games/space/index.html",
      cover: "assets/img/games/space.jpg",
      featured: false,
      openInNewTab: false,
      addedAt: "2026-11-01"
    },
    {
      id: "memory-cards",
      title: "Memory Cards",
      genre: "Memória",
      description: "Encontre os pares de símbolos com o menor número de jogadas possível.",
      url: "assets/games/memory/index.html",
      cover: "assets/img/games/memory.jpg",
      featured: false,
      openInNewTab: false,
      addedAt: "2026-10-30"
    }
  ]
};
