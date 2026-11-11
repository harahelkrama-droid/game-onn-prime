# 🎮 Game ONN Prime

Galeria de jogos para navegador, com login administrativo, troca obrigatória da senha padrão e catálogo editável pelo próprio site.

**O catálogo começa vazio de propósito:** você cadastra os seus jogos, cada um com o **link direto para jogar** e o **link da imagem de capa**.

**Site leve de propósito:** sem framework, sem biblioteca externa, sem build. Só HTML, CSS e JavaScript puro.

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

> ⚠️ Este projeto é 100% front-end: a proteção roda no navegador. Ela organiza o acesso e evita curiosos, mas não é um servidor com autenticação real. Não use para dados sensíveis.

---

## 🕹️ Como adicionar um jogo

Cada jogo precisa de **duas coisas**: o **link direto do jogo** e o **link da capa** (imagem).

### Opção 1 — Pelo painel do site (mais fácil)
1. Entre na galeria e clique no seu nome → **Gerenciar catálogo** (ou no botão **Novo jogo** / **Adicionar jogo**).
2. Preencha **título**, **gênero**, **descrição curta**, **link direto do jogo** e **link da capa (imagem)**.
3. Clique em **Salvar jogo** — o jogo aparece na galeria na hora.
4. Para valer em todos os dispositivos: clique em **Exportar games-data.js**, baixe o arquivo e substitua o `assets/js/games-data.js` do repositório.

### Opção 2 — Direto no arquivo do catálogo
Abra `assets/js/games-data.js`. Dentro de `games: [ ... ]` existe um **bloco de exemplo comentado**: apague as `//` e preencha.

```js
{
  id: "meu-jogo",                          // único, sem espaços
  title: "Meu Jogo",                       // nome exibido
  genre: "Ação",                           // vira filtro automático
  description: "Uma frase sobre o jogo.",
  url: "https://site-do-jogo.com/jogar",   // LINK DIRETO DO JOGO
  cover: "https://site.com/capa.jpg",      // LINK DA IMAGEM DE CAPA
  featured: true,                          // true = banner principal
  openInNewTab: false,                     // true = abre fora da galeria
  addedAt: "2026-11-11"
}
```

### Links que funcionam
| Tipo | Exemplo | Observação |
| --- | --- | --- |
| Site externo | `https://exemplo.com/jogo` | Abre dentro da galeria |
| Sem `https://` | `exemplo.com/jogo` | O site completa sozinho |
| Capa externa | `https://exemplo.com/capa.jpg` | Precisa ser o endereço direto da imagem |

Alguns sites bloqueiam abrir dentro de outra página (cabeçalho `X-Frame-Options`). Nesses casos, marque **“Abrir em nova aba”** ao cadastrar. Se um jogo travar ao incorporar, a galeria mostra o aviso e o botão “Abrir em nova aba” automaticamente.

> Se a capa não carregar, a galeria troca sozinha por um fundo elegante — nada de ícone quebrado.

---

## ⚡ Por que roda leve

- **Zero dependências**: nenhum framework, nenhuma requisição para CDN.
- **Imagens sob demanda**: as capas usam `loading="lazy"` e só carregam quando entram na tela.
- **Player descarrega ao fechar**: o iframe do jogo é removido da memória (`src` limpo) ao fechar.
- **Fonte local** (woff2, ~13 KB por peso), sem Google Fonts.
- **Modo leve** no menu do usuário: desliga efeitos e fundos decorativos (também liga sozinho em 2G/save-data ou aparelhos com 2 núcleos).

---

## 📁 Estrutura

```
index.html                  → app completo (login, galeria, painel, player)
assets/
  css/style.css             → todo o visual
  js/games-data.js          → CATÁLOGO — adicione seus jogos aqui
  js/store.js               → acesso/senha, sessão e CRUD do catálogo
  js/app.js                 → telas, filtros, painel e player
  fonts/                    → Space Grotesk (local)
  img/hero.jpg              → arte do login
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

## ✅ Checklist

- [x] Login `adm / adm`
- [x] Troca obrigatória de e-mail e senha após o primeiro login
- [x] Catálogo vazio, pronto para receber **os seus** links de jogo e capa
- [x] Cadastro de jogo com **link direto** + **link da capa**, com prévia da capa
- [x] Galeria com banner em destaque, busca, filtro por gênero e ordenação
- [x] Player interno com tela cheia, recarregar e abrir em nova aba
- [x] Layout responsivo (celular, tablet, desktop)
