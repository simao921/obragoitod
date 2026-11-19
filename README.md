# Obragoito — presença digital

Site público, três portais privados e uma API para a Obragoito – Construções e Obras Públicas, Lda.

Monorepo React + TypeScript com quatro aplicações independentes e um backend próprio. As quatro
aplicações partilham o mesmo projeto Supabase (autenticação, base de dados e armazenamento) quando
configurado; sem credenciais Supabase a API funciona com sessões próprias e disco local, para
desenvolvimento.

```
apps/
  web/      Site público (Vite + React + TypeScript)      → porta 3000
  admin/    Portal de gestão                              → porta 3100
  client/   Portal de clientes                            → porta 3200
  worker/   Portal de equipa (campo)                      → porta 3300
  api/      API Express + Postgres + autorização          → porta 4000
packages/
  core/     Tipos, validação (zod), cliente HTTP, factos da empresa
  ui/       Design system, componentes e portais partilhados
supabase/
  migrations/0001_init.sql    Esquema, funções e políticas RLS
  functions/transcribe/       Alternativa Edge Function para transcrição
docs/       Supabase, publicação e proveniência de conteúdos
```

## Arranque rápido (Docker Compose)

```bash
npm install                      # opcional no host; os contentores instalam sozinhos
docker compose -f docker-compose.base44.yml up -d --build
```

Depois de os serviços estarem saudáveis:

- Site público: http://localhost:3000
- Gestão: http://localhost:3100
- Clientes: http://localhost:3200
- Equipa: http://localhost:3300
- API: http://localhost:4000/api/health

O `docker-compose.base44.yml` é o ficheiro do ambiente Base44 (vive no repositório de ambiente).
Em qualquer outra máquina, use um compose equivalente com os mesmos serviços, ou siga os passos
manuais abaixo.

### Primeira conta de administração

Não existe registo público. A primeira conta é criada por linha de comandos:

```bash
docker compose -f docker-compose.base44.yml exec -T api \
  npm run create-admin -- --email admin@obragoito.pt --name "Administração"
```

O comando imprime uma palavra-passe temporária **uma única vez**. Ao entrar, o portal pede a
alteração. A partir daí, todas as contas são criadas no portal de gestão, individualmente ou por
importação CSV/XLSX.

### Segundo fator por email (gestão e portal dev)

Depois da palavra-passe, a gestão e o portal dev pedem um código de 6 dígitos enviado por email
(válido 10 minutos, uso único, 5 tentativas). O envio usa a Resend (`RESEND_API_KEY`); sem chave,
fora de produção o código aparece no ecrã de login como «Código de teste» e em produção o acesso
fica indisponível. Os portais de cliente e de equipa continuam a entrar só com palavra-passe.

## Desenvolvimento sem Docker

Requisitos: Node 20+, um Postgres 15+ acessível.

```bash
npm install
cp .env.example apps/api/.env      # preencher DATABASE_URL e SESSION_SECRET
npm run db:migrate
npm run db:seed                    # opcional: portefólio real já publicado
npm run dev:api                    # terminal 1 (porta 4000)
npm run dev:web                    # terminal 2 (porta 3000)
npm run dev:admin                  # portal de gestão
npm run dev:client                 # portal de clientes
npm run dev:worker                 # portal de equipa
```

Cada frontend faz proxy de `/api` e `/media` para `http://localhost:4000` (`API_PROXY_TARGET`
para outro destino). Assim o cookie de sessão fica na mesma origem.

## Variáveis de ambiente

Ver `.env.example`. Resumo:

| Variável | Onde | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `DATABASE_URL` | API | sim | Ligação Postgres (Supabase ou local) |
| `SESSION_SECRET` | API | sim | Assina sessões e URLs assinados (≥24 caracteres) |
| `API_PORT` | API | não | Predefinido 4000 |
| `COOKIE_SECURE` | API | produção | `true` atrás de HTTPS |
| `PUBLIC_ORIGINS` | API | não | Origens extra autorizadas, separadas por vírgula |
| `UPLOAD_DIR` | API | não | Pasta de documentos privados (modo local) |
| `MAX_UPLOAD_MB` | API | não | Limite por ficheiro (predefinido 12) |
| `SUPABASE_URL` | API | não | Ativa Supabase Auth/Storage quando presente |
| `SUPABASE_ANON_KEY` | API | não | Usada para validar credenciais no Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | API | não | **Só no servidor.** Criação de utilizadores e URLs assinados |
| `SUPABASE_STORAGE_BUCKET` | API | não | Predefinido `project-files` (privado) |
| `TRANSCRIPTION_PROVIDER` | API | não | `openai` para ativar transcrição |
| `OPENAI_API_KEY` | API | não | Chave do serviço de transcrição |
| `RESEND_API_KEY` | API | não | Notificação de pedidos de orçamento por email |
| `QUOTE_NOTIFY_EMAIL` | API | não | Destino das notificações |
| `EMAIL_FROM` | API | não | Remetente verificado no fornecedor |

Nenhuma chave de serviço é enviada para o browser: as aplicações Vite só recebem código público e
falam com a API. O `SUPABASE_SERVICE_ROLE_KEY` nunca aparece num bundle.

## Funcionalidades

### Site público
- `/` e `/home`, `/servicos`, `/projetos`, `/projetos/:slug`, `/sobre`, `/contactos`, `/privacidade`.
- Hero cinematográfico com parallax discreto, desligado com `prefers-reduced-motion`.
- Portefólio filtrável por área, alimentado pela API (sem projetos fictícios).
- Formulário com validação no cliente e no servidor, consentimento e estados reais de envio. Só
  confirma depois de o servidor gravar o pedido.
- SEO técnico (título, descrição, Open Graph, `noindex` nas áreas privadas), navegação por teclado,
  foco visível e contraste AA/AAA.

### Gestão (`gestao`)
- Painel com pedidos novos, relatórios por rever e atividade recente.
- Pessoas: criar, importar CSV/XLSX, alterar função, ativar/desativar, repor palavra-passe.
- Obras: criar, editar, publicar, atribuir clientes e trabalhadores, publicar atualizações,
  carregar documentos e fotografias, definir capa.
- Mensagens internas, relatórios, pedidos de orçamento, definições de voz e auditoria.

### Clientes (`clientes`)
- Só as obras atribuídas, com progresso, cronologia de atualizações, fotografias e documentos
  entregues por URL assinado de curta duração.
- Mensagens para a administração.

### Equipa (`equipa`)
- Obras atribuídas, relatórios de progresso, mensagens privadas.
- Gravação de voz com consentimento explícito, revisão da transcrição antes de enviar e escrita
  manual sempre disponível.

## Segurança

- Sem registo público; contas criadas apenas pela administração.
- Palavras-passe guardadas com `scrypt` e sal aleatório. Nunca em texto simples.
- Sessões por cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção, token guardado em hash.
- Autorização no servidor em cada consulta (as obras são filtradas por atribuição na própria SQL).
- Políticas RLS em todas as tabelas privadas (`supabase/migrations/0001_init.sql`) para acesso
  direto ao Supabase.
- Proteção CSRF por verificação de `Origin` + `SameSite`; limite de tentativas de login; limites de
  pedidos por IP; limite de tamanho e tipos de ficheiro nos uploads.
- Documentos em bucket privado; acesso por URL assinado de 10 minutos.
- Auditoria de ações relevantes, sem palavras-passe nem áudio.

## Testes

```bash
npm test                     # validação, palavras-passe, tokens assinados, importação (24 testes)
npm run test:integration --workspace @obragoito/api   # requer DATABASE_URL migrado
npm run typecheck            # todas as aplicações
npm run build                # build de produção das quatro aplicações
```

Os testes de integração criam contas e obras próprias, verificam o isolamento entre clientes e
entre trabalhadores, e apagam tudo no fim.

## Publicação

Quatro frontends e uma API, publicáveis em separado. Ver `docs/deployment.md` para o detalhe
(Vercel/Netlify + reverse proxy, subdomínios, cookies e CORS).

## Conteúdos

Fotografias, textos institucionais e contactos têm proveniência documentada em
`docs/content.md`. Nada foi inventado: os campos sem confirmação ficam vazios na interface e
preenchíveis na gestão.
