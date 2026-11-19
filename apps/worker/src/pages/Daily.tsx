import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@obragoito/core";
import {
  Alert,
  Button,
  EmptyState,
  LoadingBlock,
  SelectField,
  TextAreaField,
  VoiceRecorder,
} from "@obragoito/ui";

type DailyEntry = {
  id: string;
  reportDate: string;
  projectId: string;
  projectName: string;
  transcript: string;
  status: "open" | "closed";
  createdAt: string;
};

type DailyPayload = {
  date: string;
  humanDate: string;
  projects: { id: string; name: string }[];
  entries: DailyEntry[];
  history: DailyEntry[];
};

const EMPTY: DailyPayload = { date: "", humanDate: "", projects: [], entries: [], history: [] };

export function Daily() {
  const [data, setData] = useState<DailyPayload | null>(null);
  const [projectId, setProjectId] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get<DailyPayload>("/worker/daily")
      .then((payload) => {
        setData(payload);
        setProjectId((current) => {
          if (current) return current;
          const missing = payload.projects.find(
            (project) => !payload.entries.some((entry) => entry.projectId === project.id),
          );
          return missing?.id ?? payload.projects[0]?.id ?? "";
        });
      })
      .catch(() => setData(EMPTY));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentEntry = useMemo(
    () => data?.entries.find((entry) => entry.projectId === projectId) ?? null,
    [data, projectId],
  );

  async function submit() {
    setError(null);
    setSent(false);
    if (!projectId) {
      setError("Escolha a obra.");
      return;
    }
    if (text.trim().length < 3) {
      setError("Escreva o que fez hoje.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/worker/daily", { projectId, transcript: text.trim() });
      setText("");
      setSent(true);
      load();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Não foi possível guardar o registo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p-section" aria-labelledby="registo-diario-titulo">
      <div className="p-section__head">
        <h2 id="registo-diario-titulo" className="p-section__title">
          Registo de {data?.humanDate || "hoje"}
        </h2>
        <p className="p-subtitle">
          Registe o dia antes das 00:00. O relatório é fechado automaticamente e enviado ao cliente.
        </p>
      </div>

      <div className="p-card" style={{ padding: "var(--space-5)" }}>
        <SelectField
          label="Obra"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          options={(data?.projects ?? []).map((project) => ({ value: project.id, label: project.name }))}
          placeholder="Escolha a obra"
        />

        {currentEntry ? (
          <Alert tone="success">
            Já existe um registo seu para esta obra hoje. Se enviar de novo, substitui o anterior.
          </Alert>
        ) : null}

        <TextAreaField
          label="O que foi feito hoje"
          hint="Escreva ou use o áudio: a transcrição é sempre revista por si antes de enviar."
          rows={5}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />

        <VoiceRecorder onText={(transcript) => setText((current) => (current ? `${current} ${transcript}` : transcript))} />

        {error ? <Alert tone="error">{error}</Alert> : null}
        {sent ? <Alert tone="success">Registo enviado. Obrigado.</Alert> : null}

        <Button variant="solid" onClick={submit} disabled={busy}>
          {busy ? "A enviar…" : "Enviar registo do dia"}
        </Button>
      </div>

      <div className="p-section__head" style={{ marginTop: "var(--space-6)" }}>
        <h2 className="p-section__title">Histórico recente</h2>
      </div>

      {!data ? (
        <LoadingBlock label="A carregar registos…" />
      ) : data.history.length === 0 ? (
        <EmptyState title="Ainda sem registos" text="O primeiro registo que enviar aparece aqui." />
      ) : (
        <ul className="p-list">
          {data.history.map((entry) => (
            <li key={entry.id} className="p-list__row" style={{ display: "block" }}>
              <p className="mono-label">
                {entry.reportDate} · {entry.projectName}
              </p>
              <p style={{ marginTop: 6 }}>{entry.transcript}</p>
              <p className="p-list__meta">
                {entry.status === "closed" ? "Fechado e enviado ao cliente" : "Aberto"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
