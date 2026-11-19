# Publicar na Vercel e ligar ao Supabase

O repositório é um monorepo com cinco aplicações e uma API:

| Aplicação | Pasta | Domínio sugerido | Porta em dev |
| --- | --- | --- | --- |
| Site público | `apps/web` | `obragoito.vercel.app` | 3000 |
| Gestão | `apps/admin` | `gestao-obragoito.vercel.app` | 3001 |
| Portal de cliente | `apps/client` | `clients-obragoito.vercel.app` | 3002 |
| Portal da equipa | `apps/worker` | `workers-obragoito.vercel.app` | 3003 |
| Portal de desenvolvimento | `apps/dev` | `dev-obragoito.vercel.app` | 3004 |
| API | `apps/api` | `api-obragoito.vercel.app` | 4000 |

Cada aplicação tem o seu `vercel.json`. Na Vercel, crie **um projeto por pasta**
e defina **Root Directory** para essa pasta. O `installCommand` e o
`buildCommand` de cada `vercel.json` instalam e compilam a partir da raiz do
monorepo, por isso não é preciso configurar nada além de variáveis de ambiente.

## 1. Supabase

1. No projeto `kvennlxtzhxlavksiyrc`, abra o **SQL Editor**.
2. Execute, por esta ordem, o conteúdo de:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_portals.sql`
3. Em **Project Settings → Database**, copie a connection string do
   **Connection Pooler** (porta 6543) e use-a como `DATABASE_URL` da API.
4. A chave publicável (`sb_publishable_…`) pode ir para o frontend. A chave
   **secret** (`sb_secret_…`) só existe no ambiente da API — nunca no browser.

> As chaves "Legacy" (anon/service_role) são descontinuadas no início de 2027.
> Este projeto já usa o par publishable/secret; basta criar a chave secreta em
> **Project Settings → API Keys → Secret keys** e guardá-la como
> `SUPABASE_SERVICE_ROLE_KEY` na Vercel.

## 2. Variáveis de ambiente

### API (`apps/api`)

Obrigatórias:

- `DATABASE_URL` — connection string do Supabase (pooler).
- `SESSION_SECRET` — 32+ caracteres aleatórios.

Recomendadas:

- `PUBLIC_ORIGINS` — só para acrescentar origens. Os cinco domínios da Vercel
  (`obragoito`, `gestao-obragoito`, `workers-obragoito`, `clients-obragoito` e
  `dev-obragoito`) já vêm incluídos por omissão na API.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_STORAGE_BUCKET` — armazenamento de documentos/fotografias.
- `RESEND_API_KEY`, `EMAIL_FROM`, `QUOTE_NOTIFY_EMAIL` — envio de emails
  (pedidos de orçamento e relatórios diários em PDF).
- `GEMINI_API_KEY`, `GEMINI_MODEL` — resumo automático dos relatórios.
- `TRANSCRIPTION_PROVIDER=openai`, `OPENAI_API_KEY` — transcrição dos áudios.
- `CRON_SECRET` — protege `/api/cron/daily`.
- `COOKIE_SECURE=true`, `NODE_ENV=production`. Com `NODE_ENV=production` o
  cookie de sessão passa a `SameSite=None; Secure` (`COOKIE_SAMESITE` para
  forçar outro valor), necessário porque cada `*.vercel.app` é um site distinto.

### Frontends (`web`, `admin`, `client`, `worker`, `dev`)

- `VITE_API_URL=https://api-obragoito.vercel.app` — domínio do projeto da API,
  sem barra final. Sem esta variável os pedidos vão para `/api` no próprio
  domínio. Defina-a nos cinco projetos: é o que liga cada portal à API.

## 3. Fecho diário automático

A Vercel Cron chama `GET /api/cron/daily` todos os dias às 00:05 UTC
(01:05 em Lisboa no horário de verão). A rota só responde com
`Authorization: Bearer <CRON_SECRET>`; defina `CRON_SECRET` na API.

O fecho também corre sozinho quando a API está alojada num servidor Node
permanente (Railway, Render, Fly.io) — nesse caso pode remover o `crons` do
`apps/api/vercel.json`.

## 4. Limites da Vercel para a API

A API foi pensada para um processo Node contínuo (pool de Postgres, cron
interno, uploads em disco). Na Vercel:

- O pool de ligações deve apontar para o **pooler** do Supabase.
- Uploads têm de usar Supabase Storage (`SUPABASE_SERVICE_ROLE_KEY`
  configurada) — o sistema de ficheiros da função é efémero.
- Cada pedido tem `maxDuration` 30 s.

Se preferir simplicidade operacional, publique os quatro frontends na Vercel e
a API num host Node (Railway/Render/Fly.io) com as mesmas variáveis.

## 4. Contas iniciais

Depois da primeira migração, execute uma vez (localmente ou num job):

```bash
npm run db:seed-accounts
```

Cria as contas de administração (`pedropatinha21@gmail.com`,
`pedro.patinha@obragoito.pt`, `pedropatinha@obragoito.pt`) e a conta de
desenvolvimento (`simaodev@obragoito.pt`). Todas pedem uma nova palavra-passe
no primeiro acesso.

## 4. Modo manutenção

Em **Gestão → Manutenção** (ou no portal dev) ativa-se o modo manutenção:
o site público, o portal de cliente e o portal da equipa passam a mostrar
apenas a página de manutenção. A gestão e o portal dev continuam online.
