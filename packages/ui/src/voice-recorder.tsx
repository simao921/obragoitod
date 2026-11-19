import { useEffect, useRef, useState } from "react";
import { api, isApiError } from "@obragoito/core";
import { Alert, Button } from "./primitives";
import { CheckboxField, TextAreaField } from "./fields";
import { useApi } from "./hooks";

type VoiceSettings = { voiceEnabled: boolean; voiceAvailable: boolean };

type VoiceRecorderProps = {
  onText: (text: string) => void;
};

const MAX_SECONDS = 60;

/**
 * Gravação curta com transcrição no servidor.
 * O áudio existe apenas em memória no browser e é descartado depois da transcrição.
 */
export function VoiceRecorder({ onText }: VoiceRecorderProps) {
  const { data: settings } = useApi<VoiceSettings>("/worker/settings");
  const [state, setState] = useState<"idle" | "recording" | "processing" | "review">("idle");
  const [seconds, setSeconds] = useState(0);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined");
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const available = Boolean(settings?.voiceEnabled && settings?.voiceAvailable) && supported;

  async function start() {
    setError(null);
    if (!consent) {
      setError("Confirme que compreende que o áudio é enviado para transcrição e não fica guardado.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (cancelRef.current) {
          setState("idle");
          setSeconds(0);
          return;
        }
        void transcribe(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((value) => {
          if (value + 1 >= MAX_SECONDS) {
            recorder.stop();
            return MAX_SECONDS;
          }
          return value + 1;
        });
      }, 1000);
    } catch {
      setError("Não foi possível aceder ao microfone. Verifique as permissões do navegador.");
    }
  }

  async function transcribe(blob: Blob) {
    setState("processing");
    try {
      const form = new FormData();
      form.append("audio", blob, "mensagem.webm");
      const result = await api.upload<{ text: string }>("/worker/transcribe", form);
      setTranscript(result.text);
      setState("review");
    } catch (uploadError) {
      setState("idle");
      setError(
        isApiError(uploadError)
          ? uploadError.message
          : "Não foi possível transcrever o áudio. Pode escrever a mensagem manualmente.",
      );
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  function cancel() {
    cancelRef.current = true;
    recorderRef.current?.stop();
  }

  if (!settings) return null;

  return (
    <div className="voice-panel">
      <div className="voice-panel__status">
        {state === "recording" ? <span className="voice-dot" aria-hidden="true" /> : null}
        <span>
          {state === "recording"
            ? `A gravar… ${seconds}s de ${MAX_SECONDS}s`
            : state === "processing"
              ? "A transcrever o áudio…"
              : state === "review"
                ? "Reveja a transcrição antes de usar."
                : "Mensagem por voz"}
        </span>
      </div>

      {!available ? (
        <p className="p-note">
          {!supported
            ? "Este navegador não suporta gravação de áudio. Escreva a mensagem manualmente."
            : !settings.voiceAvailable
              ? "A transcrição ainda não está configurada neste ambiente. A escrita manual continua disponível."
              : "A entrada por voz está desativada pela administração."}
        </p>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      {state === "idle" && available ? (
        <>
          <CheckboxField
            label="Compreendo que o áudio é enviado para transcrição, não fica guardado, e que devo confirmar o texto antes de enviar."
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <div className="voice-actions">
            <Button size="sm" variant="solid" onClick={start}>
              Gravar mensagem
            </Button>
          </div>
        </>
      ) : null}

      {state === "recording" ? (
        <div className="voice-actions">
          <Button size="sm" variant="solid" onClick={stop}>
            Terminar e transcrever
          </Button>
          <Button size="sm" variant="quiet" onClick={cancel}>
            Cancelar gravação
          </Button>
        </div>
      ) : null}

      {state === "review" ? (
        <>
          <TextAreaField
            label="Transcrição"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            hint="Pode corrigir o texto antes de inserir na mensagem."
          />
          <div className="voice-actions">
            <Button
              size="sm"
              variant="solid"
              onClick={() => {
                onText(transcript.trim());
                setTranscript("");
                setState("idle");
              }}
              disabled={transcript.trim().length === 0}
            >
              Inserir na mensagem
            </Button>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setTranscript("");
                setState("idle");
              }}
            >
              Descartar
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
