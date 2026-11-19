import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "integration-test-session-secret-2026";

const enabled = Boolean(process.env.DATABASE_URL);

/**
 * Testes de isolamento entre perfis contra uma base de dados real.
 * Requer DATABASE_URL e as migrações aplicadas (npm run db:migrate).
 * Cria contas e obras próprias e remove-as no fim.
 */
describe("permissões e isolamento entre perfis", { skip: !enabled ? "DATABASE_URL não definido" : false }, () => {
  let server: Server;
  let base = "";
  const suffix = Math.random().toString(36).slice(2, 8);
  const emails = {
    admin: `admin-${suffix}@test.local`,
    clientA: `cliente-a-${suffix}@test.local`,
    clientB: `cliente-b-${suffix}@test.local`,
    workerA: `equipa-a-${suffix}@test.local`,
    workerB: `equipa-b-${suffix}@test.local`,
  };
  const password = "TesteSeguro2026!";
  const ids: Record<string, string> = {};
  let projectA = "";
  let projectB = "";
  const cookies: Record<string, string> = {};

  before(async () => {
    const { query, pool } = await import("../../src/db.js");
    const { provisionUser } = await import("../../src/auth/users.js");
    const { createApp } = await import("../../src/app.js");

    const tables = await pool.query(
      "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles'",
    );
    if (tables.rowCount === 0) {
      throw new Error("Migrações não aplicadas: execute npm run db:migrate antes dos testes de integração.");
    }

    for (const [key, email] of Object.entries(emails)) {
      const role = key.startsWith("admin") ? "admin" : key.startsWith("client") ? "client" : "worker";
      const user = await provisionUser({
        email,
        fullName: `Teste ${key}`,
        role,
        password,
      });
      ids[key] = user.id;
    }

    const a = await query<{ id: string }>(
      `insert into public.projects (slug, name, category, is_published)
       values ($1, $2, 'urbanismo', false) returning id`,
      [`obra-teste-a-${suffix}`, `Obra teste A ${suffix}`],
    );
    projectA = a.rows[0].id;

    const b = await query<{ id: string }>(
      `insert into public.projects (slug, name, category, is_published)
       values ($1, $2, 'urbanismo', false) returning id`,
      [`obra-teste-b-${suffix}`, `Obra teste B ${suffix}`],
    );
    projectB = b.rows[0].id;

    await query("insert into public.project_assignments (project_id, user_id) values ($1, $2)", [
      projectA,
      ids.clientA,
    ]);
    await query("insert into public.project_assignments (project_id, user_id) values ($1, $2)", [
      projectB,
      ids.clientB,
    ]);
    await query("insert into public.project_assignments (project_id, user_id) values ($1, $2)", [
      projectA,
      ids.workerA,
    ]);
    await query("insert into public.project_assignments (project_id, user_id) values ($1, $2)", [
      projectB,
      ids.workerB,
    ]);

    server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address() as AddressInfo;
    base = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    const { query, pool } = await import("../../src/db.js");
    await query("delete from public.threads where created_by = any($1::uuid[])", [Object.values(ids)]).catch(
      () => undefined,
    );
    await query("delete from public.projects where id = any($1::uuid[])", [[projectA, projectB]]).catch(
      () => undefined,
    );
    await query("delete from public.profiles where id = any($1::uuid[])", [Object.values(ids)]).catch(
      () => undefined,
    );
    await query("delete from public.quote_requests where email like $1", [`%${suffix}@test.local`]).catch(
      () => undefined,
    );
    await query("delete from public.audit_log where actor_email like $1", [`%${suffix}@test.local`]).catch(
      () => undefined,
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end().catch(() => undefined);
  });

  async function login(key: keyof typeof emails, portal: "admin" | "client" | "worker") {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emails[key], password, portal }),
    });
    if (response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { otpRequired?: boolean; devCode?: string }
        | null;

      // A gestão exige um código de acesso; fora de produção a API devolve-o para o teste.
      if (body?.otpRequired) {
        const verified = await fetch(`${base}/api/auth/login/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emails[key], code: body.devCode, portal }),
        });
        if (verified.ok) {
          cookies[key] = verified.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
        }
        return verified;
      }
      cookies[key] = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    }
    return response;
  }

  function request(path: string, cookie: string, init: RequestInit = {}) {
    return fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...(init.headers ?? {}),
      },
    });
  }

  test("sem sessão, as áreas privadas recusam acesso", async () => {
    for (const path of ["/api/admin/users", "/api/client/projects", "/api/worker/projects"]) {
      const response = await request(path, "");
      assert.equal(response.status, 401, `${path} devia devolver 401`);
    }
  });

  test("cada portal exige a função correspondente", async () => {
    const wrong = await login("clientA", "admin");
    assert.equal(wrong.status, 403);

    const wrongWorker = await login("workerA", "client");
    assert.equal(wrongWorker.status, 403);

    assert.equal((await login("admin", "admin")).status, 200);
    assert.equal((await login("clientA", "client")).status, 200);
    assert.equal((await login("workerA", "worker")).status, 200);
    assert.equal((await login("clientB", "client")).status, 200);
    assert.equal((await login("workerB", "worker")).status, 200);
  });

  test("cliente vê apenas as obras que lhe foram atribuídas", async () => {
    const response = await request("/api/client/projects", cookies.clientA);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { projects: { id: string }[] };
    assert.deepEqual(
      body.projects.map((project) => project.id),
      [projectA],
    );

    const other = await request(`/api/client/projects/${projectB}`, cookies.clientA);
    assert.equal(other.status, 404);
  });

  test("cliente não acede a funções de administração", async () => {
    assert.equal((await request("/api/admin/users", cookies.clientA)).status, 403);
    assert.equal(
      (
        await request("/api/admin/projects", cookies.clientA, {
          method: "POST",
          body: JSON.stringify({ name: "Obra indevida", category: "urbanismo" }),
        })
      ).status,
      403,
    );
  });

  test("trabalhador vê apenas as obras atribuídas e não as de outros", async () => {
    const response = await request("/api/worker/projects", cookies.workerA);
    const body = (await response.json()) as { projects: { id: string }[] };
    assert.deepEqual(
      body.projects.map((project) => project.id),
      [projectA],
    );

    const other = await request(`/api/worker/projects/${projectB}`, cookies.workerA);
    assert.equal(other.status, 404);
  });

  test("trabalhador não envia relatórios para obras alheias nem publica atualizações", async () => {
    const forbidden = await request("/api/worker/reports", cookies.workerA, {
      method: "POST",
      body: JSON.stringify({ projectId: projectB, body: "Trabalho em obra alheia." }),
    });
    assert.equal(forbidden.status, 403);

    const allowed = await request("/api/worker/reports", cookies.workerA, {
      method: "POST",
      body: JSON.stringify({ projectId: projectA, body: "Colocação de lancil concluída." }),
    });
    assert.equal(allowed.status, 201);

    const publish = await request(`/api/admin/projects/${projectA}/updates`, cookies.workerA, {
      method: "POST",
      body: JSON.stringify({ title: "Tentativa", body: "Não deve ser possível." }),
    });
    assert.equal(publish.status, 403);
  });

  test("atualização publicada pela administração chega só ao cliente certo", async () => {
    const publish = await request(`/api/admin/projects/${projectA}/updates`, cookies.admin, {
      method: "POST",
      body: JSON.stringify({ title: "Progresso", body: "Estrutura concluída.", progress: 40 }),
    });
    assert.equal(publish.status, 201);

    const mine = await request(`/api/client/projects/${projectA}`, cookies.clientA);
    const mineBody = (await mine.json()) as { project: { updates: unknown[]; progress: number | null } };
    assert.equal(mineBody.project.updates.length, 1);
    assert.equal(mineBody.project.progress, 40);

    const other = await request(`/api/client/projects/${projectA}`, cookies.clientB);
    assert.equal(other.status, 404);
  });

  test("formulário público valida consentimento e regista o pedido", async () => {
    const invalid = await request("/api/public/quote-requests", "", {
      method: "POST",
      body: JSON.stringify({
        name: "Teste",
        email: `pedido-${suffix}@test.local`,
        message: "Pedido de teste com mais de vinte caracteres.",
        consent: false,
      }),
    });
    assert.equal(invalid.status, 422);

    const valid = await request("/api/public/quote-requests", "", {
      method: "POST",
      body: JSON.stringify({
        name: "Teste",
        email: `pedido-${suffix}@test.local`,
        message: "Pedido de teste com mais de vinte caracteres.",
        consent: true,
      }),
    });
    assert.equal(valid.status, 201);
    const body = (await valid.json()) as { stored: boolean };
    assert.equal(body.stored, true);
  });

  test("conversas: cliente fala com a administração e mais ninguém lê", async () => {
    const created = await request("/api/client/threads", cookies.clientA, {
      method: "POST",
      body: JSON.stringify({
        subject: "Dúvida sobre a obra",
        projectId: projectA,
        participantIds: [],
        body: "Bom dia, quando começa a fase seguinte?",
      }),
    });
    assert.equal(created.status, 201);
    const { id } = (await created.json()) as { id: string };

    const adminList = await request("/api/admin/threads", cookies.admin);
    const adminBody = (await adminList.json()) as { threads: { id: string }[] };
    assert.ok(adminBody.threads.some((thread) => thread.id === id));

    const otherClient = await request(`/api/client/threads/${id}`, cookies.clientB);
    assert.equal(otherClient.status, 403);

    const reply = await request(`/api/client/threads/${id}/messages`, cookies.clientA, {
      method: "POST",
      body: JSON.stringify({ body: "Obrigado." }),
    });
    assert.equal(reply.status, 201);
  });

  test("pedidos de origem desconhecida são recusados", async () => {
    const response = await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: { Origin: "https://atacante.example" },
    });
    assert.equal(response.status, 403);
  });
});
