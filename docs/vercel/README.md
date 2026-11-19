# Publicar na Vercel — um projeto por aplicação

Seis projetos Vercel separados, todos a falar com a mesma API e o mesmo projeto
Supabase. Cada pasta de `apps/` tem o seu `vercel.json` com os comandos certos —
o único trabalho na Vercel é escolher a pasta (Root Directory) e colar as
variáveis de ambiente.

| Projeto Vercel | Root Directory | Framework Preset | Variáveis | Domínio sugerido |
| --- | --- | --- | --- | --- |
| API | `apps/api` | Other | [`env/api.env`](env/api.env) | `api-obragoito.vercel.app` |
| Site público | `apps/web` | Vite | [`env/web.env`](env/web.env) | `obragoito.vercel.app` |
| Gestão | `apps/admin` | Vite | [`env/admin.env`](env/admin.env) | `gestao-obragoito.vercel.app` |
| Portal de clientes | `apps/client` | Vite | [`env/client.env`](env/client.env) | `clients-obragoito.vercel.app` |
| Portal da equipa | `apps/worker` | Vite | [`env/worker.env`](env/worker.env) | `workers-obragoito.vercel.app` |
| Portal de desenvolvimento | `apps/dev` | Vite | [`env/dev.env`](env/dev.env) | `dev-obragoito.vercel.app` |

---

## 1. O campo "Root Directory" (o passo que está a falhar)

No ecrã **Root Directory** a Vercel mostra apenas `obragoitod (root)` e, por
trás, adivinha comandos errados (`npm`, `public`, `yarn`). O que fazer:

1. No modal, **não** escolha `(root)`. Escreva no campo de procura o caminho da
   pasta e carregue em **Continue**:
   - API → `apps/api`
   - Site público → `apps/web`
   - Gestão → `apps/admin`
   - Clientes → `apps/client`
   - Equipa → `apps/worker`
   - Portal dev → `apps/dev`
2. Escreva o caminho **sem** `./` e **sem** barra no fim (`apps/web`, não
   `./apps/web/`).
3. Se o modal só listar `(root)`, é porque está a importar uma branch onde a
   pasta não existe (a `apps/` tem de estar na branch importada, normalmente
   `main`) — confirme em GitHub que `apps/web` existe nessa branch.
4. Depois de escolher a pasta, a Vercel volta a mostrar valores adivinhados.
   **Deixe "Build Command", "Output Directory" e "Install Command" desligados**
   (sem *Override*): o `vercel.json` de cada pasta já define framework,
   instalação, build e pasta de saída.
5. Se a Vercel insistir em usar os campos do formulário, ative *Override* e
   ponha exatamente estes valores (exemplo para o site público; troque `web`
   pela pasta do projeto):

   | Campo | Valor |
   | --- | --- |
   | Install Command | `cd ../.. && npm ci` |
   | Build Command | `cd ../.. && npm run build --workspace @obragoito/web && cp -r apps/api/public/media apps/web/dist/media` |
   | Output Directory | `dist` |

   Na API não há build nem output: só `Install Command` = `cd ../.. && npm ci`.

## 2. Ordem recomendada

1. **Supabase primeiro** — no SQL Editor do projeto `kvennlxtzhxlavksiyrc`,
   correr `supabase/migrations/0001_init.sql` e `0002_portals.sql`.
2. **API** — é o projeto de que todos os outros dependem; anote o domínio final.
3. **Os cinco frontends** — cada um com `VITE_API_URL` a apontar para o domínio
   da API.
4. **Voltar à API** e preencher `PUBLIC_ORIGINS` com os domínios reais dos
   frontends, depois **Redeploy** da API.

O passo 4 não é opcional: a API só aceita pedidos com credenciais das origens
listadas em `PUBLIC_ORIGINS`. Enquanto estiver em falta, os portais mostram
"sem ligação ao servidor" no ecrã de entrada.

## 3. Variáveis de ambiente

Para cada projeto: **Settings → Environment Variables → Paste .env**, cole o
ficheiro correspondente de `env/` e marque *Production*, *Preview* e
*Development*.

- `COLE_AQUI_…` é para substituir por valores reais. Nada neste repositório
  contém segredos.
- `SUPABASE_URL` e `SUPABASE_ANON_KEY` já vêm preenchidos: são públicos por
  desenho (a chave publishable vai para o browser).
- `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `CRON_SECRET`, `DATABASE_URL`
  e as chaves de email são segredos: só no projeto da API.
- As variáveis `VITE_*` são lidas **durante o build**. Depois de as alterar, é
  obrigatório fazer **Redeploy** — sem isso o site continua com o valor antigo.

## 4. O que já está tratado no repositório

- `apps/*/vercel.json` — instalação a partir da raiz do monorepo, build do
  workspace certo, `dist` como saída e rewrite de SPA (todas as rotas para
  `index.html`).
- `X-Robots-Tag: noindex, nofollow` nos quatro portais privados; o site público
  fica indexável.
- As fotografias do portefólio vivem em `apps/api/public/media` e o build de
  cada frontend copia-as para `dist/media`. Assim `/media/projects/*.jpg`
  funciona em qualquer domínio, sem depender da API nem de um proxy.
- A API já expõe a entrada serverless `apps/api/api/[...path].ts`, aceita CORS
  com credenciais para as origens de `PUBLIC_ORIGINS` e, em produção, usa o
  cookie `SameSite=None; Secure` necessário para domínios separados.

## 5. Verificação depois do deploy

```bash
curl https://<dominio-da-api>/api/health      # {"status":"ok","database":"up"}
curl -I https://<dominio-do-site>/robots.txt  # 200
```

- Site público: página inicial com fotografias e `/projetos` com as obras.
- Gestão: entrar com uma conta criada por `npm run create-admin` (ou pelo
  `npm run db:seed-accounts`) — ver `docs/DEPLOY.md`.
- Portal de clientes e da equipa: o ecrã de entrada tem de aparecer sem erro de
  rede na consola do browser.

## 6. Limites da Vercel (importantes)

- **Sistema de ficheiros efémero.** Na Vercel os ficheiros gravados em disco
  desaparecem. `SUPABASE_SERVICE_ROLE_KEY` é obrigatória: sem ela os documentos
  de obra gravam-se em `/tmp` e perdem-se. Os uploads públicos de portefólio
  devem ser feitos com o armazenamento do Supabase configurado.
- **4,5 MB por pedido.** É o máximo do corpo de um pedido nas funções da
  Vercel; por isso `MAX_UPLOAD_MB=4`.
- **Base de dados pelo pooler.** Use a connection string do *Transaction
  pooler* (porta 6543) com `?sslmode=require`. Se aparecer erro de certificado
  ("self signed certificate"), troque para
  `?uselibpqcompat=true&sslmode=require`.
- **Cron.** O `crons` de `apps/api/vercel.json` chama `/api/cron/daily` às 00:05
  UTC. Precisa de `CRON_SECRET`; o plano Hobby permite um agendamento diário.
- **Arranque a frio.** A primeira chamada depois de inatividade pode demorar
  1–3 s.
- **Cookies entre `*.vercel.app`.** Cada `*.vercel.app` é um site distinto, por
  isso o Safari/iOS bloqueia o cookie de sessão dos portais. Se os portais
  tiverem de funcionar em Safari, use domínios próprios debaixo de
  `obragoito.pt` (`gestao.obragoito.pt` a falar com `api.obragoito.pt`), ponha
  esses domínios em `PUBLIC_ORIGINS` e pode voltar a `COOKIE_SAMESITE=lax`.
- **API Express em função serverless.** É suportado, mas valide o primeiro
  deploy: se o log mostrar `Cannot find module '../src/app.js'`, publique a API
  num host Node contínuo (Railway, Render, Fly.io) com as mesmas variáveis e
  use esse domínio em `VITE_API_URL` — nada mais muda.

## 7. Erros comuns

| Sintoma | Causa |
| --- | --- |
| Build diz `No Output Directory named "dist"` | Root Directory errado (está na raiz do repositório em vez de `apps/<app>`). |
| `npm ci` falha por falta de `package-lock.json` | Root Directory aponta para uma pasta sem o lockfile — tem de ser `apps/<app>` com `cd ../..` no comando de instalação. |
| Site abre sem imagens | Build antigo, anterior à cópia de `media` — faça Redeploy. |
| Portais: "sem ligação ao servidor" | `VITE_API_URL` em falta, ou o domínio do portal não está em `PUBLIC_ORIGINS` da API. |
| Login funciona e cai logo a seguir | `COOKIE_SECURE`/`COOKIE_SAMESITE` errados, ou origem fora de `PUBLIC_ORIGINS`. |
| `/api/health` devolve 503 | `DATABASE_URL` errado ou migrações não aplicadas no Supabase. |
