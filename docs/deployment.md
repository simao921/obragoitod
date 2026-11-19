# Publicação

Cinco aplicações publicáveis em separado, todas a falar com a mesma API:

| Aplicação | Build | Diretório de saída | Domínio sugerido |
| --- | --- | --- | --- |
| Site público | `npm run build --workspace @obragoito/web` | `apps/web/dist` | `obragoito.pt` |
| Gestão | `npm run build --workspace @obragoito/admin` | `apps/admin/dist` | `gestao.obragoito.pt` |
| Clientes | `npm run build --workspace @obragoito/client` | `apps/client/dist` | `clientes.obragoito.pt` |
| Equipa | `npm run build --workspace @obragoito/worker` | `apps/worker/dist` | `equipa.obragoito.pt` |
| API | `npm run build --workspace @obragoito/api` (opcional) | — | `api.obragoito.pt` |

## Princípio: um só domínio por aplicação

Cada frontend chama a API em `/api` (mesma origem). Em desenvolvimento isso é feito pelo proxy do
Vite; em produção, por um reverse proxy que encaminha `/api/*` e `/media/*` para a API.

Isto mantém o cookie de sessão (`HttpOnly`, `SameSite=Lax`) na mesma origem e evita CORS.

### Nginx

```nginx
server {
  server_name obragoito.pt www.obragoito.pt;
  root /var/www/obragoito/web;
  index index.html;

  location /api/  { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
  location /media/ { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; }
  location / { try_files $uri $uri/ /index.html; }
}

server {
  server_name gestao.obragoito.pt;
  root /var/www/obragoito/admin;
  index index.html;
  location /api/  { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
  location /media/ { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; }
  location / { try_files $uri $uri/ /index.html; }
}
# repetir para clientes.obragoito.pt (apps/client) e equipa.obragoito.pt (apps/worker)
```

### Vercel / Netlify

Cada aplicação é um projeto próprio:

- Root: repositório
- Install: `npm install`
- Build: `npm run build --workspace @obragoito/web` (troque o workspace por aplicação)
- Output: `apps/web/dist` (idem)
- Rewrite/redirect de SPA: todas as rotas → `/index.html`
- Rewrite de `/api/*` e `/media/*` para o domínio da API

Em Vercel, `vercel.json` por projeto:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://api.obragoito.pt/api/$1" },
    { "source": "/media/(.*)", "destination": "https://api.obragoito.pt/media/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Se optar por chamar a API diretamente noutro domínio, acrescente a origem a `PUBLIC_ORIGINS` na API
e garanta `credentials: "include"` (já é o comportamento do cliente HTTP partilhado).

## Variáveis de ambiente

- **Frontends**: nenhuma variável obrigatória. Nada de chaves no bundle.
- **API**: ver `.env.example`. Em produção, no mínimo `DATABASE_URL`, `SESSION_SECRET`,
  `COOKIE_SECURE=true`, `PUBLIC_ORIGINS` (se aplicável) e as credenciais Supabase.

## Passos recomendados

1. Configurar o projeto Supabase (`docs/supabase.md`).
2. Publicar a API e confirmar `GET /api/health`.
3. Publicar o site público e confirmar `/projetos` com dados reais.
4. Publicar os três portais nos subdomínios.
5. Criar a primeira conta de administração e testar login nos três portais.
6. Ativar `RESEND_API_KEY` para notificação de pedidos (opcional).
7. Ativar transcrição com `TRANSCRIPTION_PROVIDER=openai` e `OPENAI_API_KEY` (opcional).

## Cuidados antes de abrir ao público

- Confirmar direitos das fotografias (`docs/content.md`).
- Rever a política de privacidade com apoio jurídico.
- Definir retenção de dados de pedidos de orçamento.
- Confirmar que o cookie `Secure` está ativo (HTTPS em todos os domínios).
- Testar login e permissões dos três perfis em produção.
