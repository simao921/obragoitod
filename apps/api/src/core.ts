/**
 * Ponte para o pacote partilhado `@obragoito/core`.
 *
 * A Vercel externaliza os pacotes do workspace e não os inclui na função
 * serverless (a API rebentava com ERR_MODULE_NOT_FOUND). Um import relativo é
 * empacotado com a API, por isso o código que corre no servidor importa daqui.
 */
export * from "../../../packages/core/src/index.js";
