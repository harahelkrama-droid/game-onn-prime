# 🎮 Game ONN Prime

Galeria de jogos para navegador, com login administrativo, troca obrigatória da senha padrão e catálogo editável pelo próprio site.

**Site leve de propósito:** sem framework, sem biblioteca externa, sem build. Só HTML, CSS e JavaScript puro. As imagens são JPG otimizados e os jogos são carregados apenas quando você clica em jogar.

---

## 🔐 Acesso

| Etapa | O que fazer |
| --- | --- |
| 1. Login inicial | E-mail: **`adm`** · Senha: **`adm`** |
| 2. Troca obrigatória | O site pede um **e-mail (ou usuário)** e uma **nova senha** |
| 3. Galeria | Depois de salvar, o login antigo `adm / adm` **deixa de funcionar** |

- A senha é guardada como **hash PBKDF2-SHA256 + salt** (WebCrypto), nunca em texto puro.
- A sessão fica salva no navegador por 30 dias (ou 12 horas se você desmarcar “manter conectado”).
- Trocar o acesso invalida a sessão anterior e derruba qualquer outra aba aberta.
- Se esquecer a senha, use **“Esqueci a senha”** na tela de login para voltar ao padrão `adm / adm` **no mesmo dispositivo** e configurar de novo.

> ⚠️ Este projeto é 100% front-end: a proteção roda no navegador. Ela organiza o acesso e evita curiosos, mas não é um servidor com autenticação real. Não use para dados sensíveis. Para uma versão com login de verdade no servidor, é preciso backend (ex.: Node + banco de dados).

---

## 🕹️ Como adicionar um jogo

### Opção 1 — Pelo painel (mais fácil)
1. Entre na galeria e clique no seu nome → **Gerenciar catálogo** (ou no botão **Novo jogo**).
2. Preencha **título**, **gênero**, **descrição curta**, **link direto do jogo** e **link da capa**.
3. Clique em **Salvar jogo** — ele já aparece na galeria.
4. Para publicar em todos os dispositivos: clique em **Exportar games-data.js**, baixe o arquivo e substitua o `assets/js/games-data.js` do repositório.

### Opção 2 — Direto no arquivo do catálogo
Abra `assets/js/games-data.js` e adicione um item na lista `games`:

```js
{
  id: "meu-jogo",                          // único, sem espaços
  title: "Meu Jogo",                       // nome exibido
  genre: "Ação",                           // vira filtro automático
  description: "Uma frase sobre o jogo.",
  url: "https://site.com/jogo",            // link direto para jogar
  cover: "https://site.com/capa.jpg",      // link da imagem de capa
  featured: false,                         // true = banner principal
  openInNewTab: false,                     // true = abre fora da galeria
  addedAt: "2026-11-11"
}
```

Também vale usar caminhos do próprio projeto:
`url: "assets/games/snake/index.html"` e `cover: "assets/img/games/snake.jpg"`.

### Links que funcionam
| Tipo | Exemplo | Observação |
| --- | --- | --- |
| Site externo | `https://exemplo.com/jogo` | Abre dentro da galeria |
| Sem `https://` | `exemplo.com/jogo` | O site completa sozinho |
| Arquivo do projeto | `assets/games/2048/index.html` | Jogo local |
| Capa externa | `https://exemplo.com/capa.jpg` | Precisa ser a URL direta da imagem |

Alguns sites bloqueiam abrir dentro de outra página (cabeçalho `X-Frame-Options`). Nesses casos, marque **“Abrir em nova aba”** ao cadastrar. Se um jogo travar ao incorporar, a galeria mostra o aviso e o botão “Abrir em nova aba” automaticamente.

---

## ⚡ Por que roda leve

- **Zero dependências**: nenhum framework, nenhuma requisição para CDN.
- **Imagens sob demanda**: as capas usam `loading="lazy"` e só carregam quando entram na tela.
- **Player descarrega ao fechar**: o iframe do jogo é removido da memória (`src` limpo) ao fechar.
- **Fonte local** (woff2, ~13 KB por peso), sem Google Fonts.
- **Jogos internos** feitos em Canvas/DOM simples, com `requestAnimationFrame`, `content-visibility` nos cards e animações só com `transform`.
- **Modo leve**: no menu do usuário há a opção de desligar efeitos e fundos decorativos (também liga sozinho em conexões 2G/save-data ou aparelhos com 2 núcleos).

---

## 📁 Estrutura

```
index.html                  → app completo (login, galeria, painel, player)
assets/
  css/style.css             → todo o visual
  js/games-data.js          → CATÁLOGO — edite aqui para adicionar jogos
  js/store.js               → acesso/senha, sessão e CRUD do catálogo
  js/app.js                 → telas, filtros, painel e player
  fonts/                    → Space Grotesk (local)
  img/hero.jpg              → arte do login/banner
  img/games/*.jpg           → capas dos jogos de exemplo
  games/                    → jogos internos (snake, 2048, blocks, flappy, space, memory)
    shared.css              → base visual dos jogos
```

---

## 🚀 Publicar no GitHub Pages

1. Faça o push do projeto no repositório.
2. No GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. O site fica em `https://SEU-USUARIO.github.io/game-onn-prime/`.

Para rodar localmente, use qualquer servidor estático:

```bash
python3 -m http.server 4173
# abra http://localhost:4173
```

> Abrir o `index.html` com duplo clique (`file://`) funciona, mas alguns navegadores bloqueiam o hash de senha nesse modo. Prefira o servidor local.

---

## ✅ Checklist rápido

- [x] Login `adm / adm`
- [x] Troca obrigatória de e-mail e senha após o primeiro login
- [x] Galeria com banner em destaque, busca, filtro por gênero e ordenação
- [x] Cadastro de jogo com link direto + link da capa
- [x] Player interno com tela cheia, recarregar e abrir em nova aba
- [x] 6 jogos prontos para testar
- [x] Layout responsivo (celular, tablet, desktop)
