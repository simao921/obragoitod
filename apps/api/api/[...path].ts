import { createApp } from "../src/app.js";

/**
 * Entrada serverless para a Vercel.
 * A app Express já expõe todas as rotas em /api/*, por isso o catch-all
 * `api/[...path].ts` entrega o pedido original à aplicação sem reescritas.
 */
export default createApp();
