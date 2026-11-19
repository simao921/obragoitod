import { Alert, LoadingBlock, useApi } from "@obragoito/ui";
import { api, formatDateTime, type QuoteRequest } from "@obragoito/core";

const STATUS_LABEL: Record<QuoteRequest["status"], string> = {
  new: "Novo",
  contacted: "Contactado",
  closed: "Fechado",
};

export function Quotes() {
  const { data, loading, error, reload } = useApi<{ quoteRequests: QuoteRequest[] }>("/admin/quote-requests");

  async function setStatus(id: string, status: QuoteRequest["status"]) {
    await api.patch(`/admin/quote-requests/${id}`, { status }).catch(() => undefined);
    await reload();
  }

  return (
    <>
      <div className="p-page-head">
        <div>
          <h1 className="p-title">Pedidos de orçamento</h1>
          <p className="p-subtitle">
            Pedidos recebidos pelo formulário do site. A resposta é feita por email ou telefone.
          </p>
        </div>
      </div>

      {loading ? <LoadingBlock label="A carregar pedidos…" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && data.quoteRequests.length === 0 ? (
        <p className="p-empty-state">Ainda não existem pedidos.</p>
      ) : null}

      {data && data.quoteRequests.length > 0 ? (
        <div className="p-list">
          {data.quoteRequests.map((quote) => (
            <div className="p-list__row" key={quote.id}>
              <div className="p-list__main">
                <p className="p-list__title">
                  {quote.name}
                  {quote.service ? ` · ${quote.service}` : ""}
                </p>
                <p className="p-list__meta">
                  {quote.email}
                  {quote.phone ? ` · ${quote.phone}` : ""} · {formatDateTime(quote.createdAt)}
                </p>
                <p className="p-list__meta" style={{ whiteSpace: "normal" }}>
                  {quote.message}
                </p>
              </div>
              <div className="p-list__actions">
                <span className="badge">{STATUS_LABEL[quote.status]}</span>
                <select
                  className="p-select-inline"
                  value={quote.status}
                  onChange={(event) => setStatus(quote.id, event.target.value as QuoteRequest["status"])}
                  aria-label={`Estado do pedido de ${quote.name}`}
                >
                  <option value="new">Novo</option>
                  <option value="contacted">Contactado</option>
                  <option value="closed">Fechado</option>
                </select>
                <a className="btn btn--quiet btn--sm" href={`mailto:${quote.email}`}>
                  Responder
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
