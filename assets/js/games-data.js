/* ==========================================================================
   GAME ONN PRIME — catálogo de jogos
   --------------------------------------------------------------------------
   É AQUI que você adiciona os seus jogos. O catálogo começa vazio de
   propósito: só entra o que você cadastrar.

   PARA ADICIONAR UM JOGO
   Copie o bloco de exemplo do final do arquivo, apague as barras "//" do
   começo de cada linha e preencha com os seus dados.

   Cada jogo precisa de:
     id            → identificador único, sem espaços (ex.: "meu-jogo")
     title         → nome que aparece na galeria
     genre         → gênero (vira filtro automaticamente)
     description   → frase curta
     url           → LINK DIRETO DO JOGO (https://... ou caminho do projeto)
     cover         → LINK DA IMAGEM DE CAPA (https://... ou caminho local)
     featured      → true coloca o jogo no banner principal
     openInNewTab  → true abre fora da galeria (use quando o site do jogo
                     bloqueia ser exibido dentro de outra página)
     addedAt       → data no formato "AAAA-MM-DD" (usada na ordenação)

   Dica: também dá para cadastrar pelo painel do site e clicar em
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
    // ------------------------------------------------------------------
    //  EXEMPLO (comentado) — apague as "//" e preencha com o seu jogo
    //
    //  {
    //    id: "meu-jogo",
    //    title: "Nome do Jogo",
    //    genre: "Ação",
    //    description: "Uma frase que resume o jogo.",
    //    url: "https://site-do-jogo.com/jogar",
    //    cover: "https://site.com/capa.jpg",
    //    featured: true,
    //    openInNewTab: false,
    //    addedAt: "2026-11-11"
    //  },
    // ------------------------------------------------------------------

    // Adicione os próximos jogos aqui, um bloco por jogo, separados por vírgula.
  ]
};
