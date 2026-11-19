# Configuração do Supabase

A aplicação funciona em dois modos:

| Modo | Quando | Autenticação | Ficheiros |
| --- | --- | --- | --- |
| Local (predefinido) | Sem variáveis `SUPABASE_*` | Tabela `profiles` + `sessions` | Disco (`UPLOAD_DIR`) |
| Supabase | Com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Supabase Auth (criação via Admin API) | Bucket privado + URLs assinados |

Em ambos os modos as regras de acesso são aplicadas pela API, no servidor. As políticas RLS existem
para proteger o acesso direto à base de dados com a chave anónima.

## 1. Criar o projeto

1. Crie um projeto em https://supabase.com/dashboard.
2. Anote `Project URL`, `anon public key` e `service_role key` (Settings → API).
3. **Nunca** coloque a `service_role` key em código de browser, num ficheiro do repositório ou num
   bundle Vite. Ela é usada apenas pela API.

## 2. Aplicar as migrações

Opção A — CLI do Supabase:

```bash
supabase link --project-ref <ref>
supabase db push
```

Opção B — SQL Editor: execute o conteúdo de `supabase/migrations/0001_init.sql`.

A migração cria:

- `profiles`, `sessions`, `projects`, `project_images`, `project_assignments`,
  `project_updates`, `project_documents`, `threads`, `thread_participants`, `messages`,
  `worker_reports`, `quote_requests`, `audit_log`, `app_settings`.
- Funções `is_admin()`, `is_project_client()`, `is_project_worker()`, `is_thread_participant()`.
- Políticas RLS para todas as tabelas privadas.

O bloco inicial cria um *shim* de `auth.users`/`auth.uid()` apenas quando estes objetos não existem,
para permitir correr a mesma migração em Postgres local. Num projeto Supabase os blocos são
ignorados.

## 3. Bucket de documentos

1. Storage → New bucket: nome `project-files`, **privado**.
2. Não crie políticas públicas. A API gera URLs assinados de 10 minutos com a `service_role`.
3. Limite o tamanho dos objetos no projeto (por exemplo 12 MB) para acompanhar `MAX_UPLOAD_MB`.

## 4. Autenticação

1. Authentication → Providers → Email: ative, mas **desative “Allow new users to sign up”**.
   Não há registo público.
2. Authentication → URL Configuration: defina o site URL e as origens dos portais.
3. As contas são criadas pela API através de `POST /auth/v1/admin/users` (Admin API), com
   `email_confirm: true` e metadados `role`/`full_name`. A API grava também a linha em
   `public.profiles`.

O login passa pela API (`POST /api/auth/login`), que valida as credenciais no Supabase Auth e emite
um cookie de sessão próprio. Assim os quatro frontends partilham a mesma mecânica, sem expor tokens
no browser.

## 5. Variáveis de ambiente da API

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_STORAGE_BUCKET=project-files
DATABASE_URL=postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres
COOKIE_SECURE=true
SESSION_SECRET=<32+ caracteres aleatórios>
```

`DATABASE_URL` aponta para o Postgres do Supabase (Settings → Database → Connection string). Se
preferir manter a API apenas sobre a REST API do Supabase, é possível, mas o código atual usa SQL
direto e é mais simples manter a ligação Postgres.

## 6. Verificação

```bash
curl -s https://<api>/api/health          # {"status":"ok","database":"up"}
curl -s https://<api>/api/config          # authProvider: "supabase"
```

No portal de gestão, Definições → Estado técnico deve indicar “Supabase Auth” e
“Supabase Storage”.

## 7. RLS — o que está garantido

- Um cliente só lê as obras em `project_assignments` onde `user_id = auth.uid()`.
- Um trabalhador só lê as obras a que está atribuído e só escreve relatórios próprios.
- Atualizações e documentos exigem `visible_to_client` para o cliente.
- Conversas e mensagens só para participantes (ou administração).
- `quote_requests`, `audit_log`, `app_settings` e `sessions` nunca são legíveis com a chave anónima.

Os testes de integração (`npm run test:integration`) verificam este isolamento através da API.

## 8. Edge Function de transcrição (opcional)

`supabase/functions/transcribe/index.ts` é uma alternativa à rota `/api/worker/transcribe`, para
quem prefira manter a transcrição dentro do Supabase:

```bash
supabase functions deploy transcribe --no-verify-jwt
supabase secrets set OPENAI_API_KEY=... TRANSCRIPTION_PROVIDER=openai
```

A função valida o JWT do Supabase, verifica `app_settings.voice_enabled` e devolve o texto. O áudio
nunca é guardado. A rota da API e a Edge Function fazem o mesmo trabalho — use apenas uma.
