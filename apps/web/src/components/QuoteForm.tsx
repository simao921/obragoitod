import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, CheckboxField, SelectField, TextAreaField, TextField } from "@obragoito/ui";
import { api, isApiError, quoteRequestSchema, SERVICES, SERVICE_CATEGORIES } from "@obragoito/core";

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "service" | "message" | "consent", string>>;
type Status = "idle" | "submitting" | "success" | "error";

const SERVICE_OPTIONS = [
  ...SERVICES.map((service) => ({ value: service.slug, label: SERVICE_CATEGORIES[service.slug] })),
  { value: "outro", label: "Outro / não sei ainda" },
];

export function QuoteForm() {
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
    consent: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const update = (key: keyof typeof values, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const parsed = quoteRequestSchema.safeParse({
      ...values,
      service: values.service || undefined,
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setStatus("submitting");
    try {
      const result = await api.post<{ stored: boolean }>("/public/quote-requests", {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        service: parsed.data.service,
        message: parsed.data.message,
        consent: true,
      });

      // Só confirmamos depois de o servidor ter gravado o pedido.
      if (!result.stored) throw new Error("O pedido não foi registado.");
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setServerError(
        isApiError(error)
          ? error.message
          : "Não foi possível enviar o pedido. Verifique a ligação e tente novamente.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="form-success" role="status">
        <p className="eyebrow">Pedido recebido</p>
        <h2 className="form-success__title">Obrigado. Vamos analisar o seu pedido.</h2>
        <p className="text-muted" style={{ maxWidth: "46ch" }}>
          O pedido ficou registado no nosso sistema de gestão. A equipa da Obragoito entra em contacto
          através do email ou telefone que indicou.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <Link to="/projetos" className="btn btn--sm">
            <span>Ver projetos</span>
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Button variant="quiet" size="sm" onClick={() => setStatus("idle")}>
            Enviar outro pedido
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      {status === "error" && serverError ? <Alert tone="error">{serverError}</Alert> : null}

      <div className="contact-form__row">
        <TextField
          label="Nome"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          error={errors.name}
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          error={errors.email}
          required
        />
      </div>

      <div className="contact-form__row">
        <TextField
          label="Telefone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(event) => update("phone", event.target.value)}
          error={errors.phone}
          optional
        />
        <SelectField
          label="Área do projeto"
          name="service"
          value={values.service}
          onChange={(event) => update("service", event.target.value)}
          error={errors.service}
          options={SERVICE_OPTIONS}
          placeholder="Selecionar"
          optional
        />
      </div>

      <TextAreaField
        label="O que pretende construir ou transformar?"
        name="message"
        value={values.message}
        onChange={(event) => update("message", event.target.value)}
        error={errors.message}
        hint="Localização, tipo de obra, prazos previstos e qualquer detalhe útil."
        rows={5}
        required
      />

      <div className="contact-form__consent">
        <CheckboxField
          name="consent"
          checked={values.consent}
          onChange={(event) => update("consent", event.target.checked)}
          error={errors.consent}
          label={
            <>
              Autorizo o tratamento dos meus dados para resposta a este pedido, nos termos da{" "}
              <Link to="/privacidade">política de privacidade</Link>.
            </>
          }
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginTop: 8 }}>
        <Button type="submit" variant="solid" disabled={status === "submitting"} arrow>
          {status === "submitting" ? "A enviar…" : "Pedir orçamento"}
        </Button>
        <span className="mono-label" style={{ textTransform: "none", letterSpacing: "0.02em" }}>
          Sem compromisso
        </span>
      </div>
    </form>
  );
}
