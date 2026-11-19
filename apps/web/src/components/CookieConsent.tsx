import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Aviso de cookies do site público: aceitar tudo, recusar os não essenciais ou
 * escolher por categoria. A escolha fica guardada no browser e pode ser mudada
 * a qualquer momento pelo atalho «Cookies» no rodapé.
 */

const STORAGE_KEY = "obg-cookie-consent";
const OPEN_EVENT = "obg:cookie-preferences";
/** Evento com o detalhe da escolha, para o que só deve arrancar com consentimento. */
export const CONSENT_EVENT = "obg:cookie-consent";

type Preferences = { analytics: boolean; marketing: boolean };

type StoredConsent = Preferences & { necessary: true; version: number; at: string };

function readConsent(): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") return null;
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      version: 1,
      at: parsed.at ?? "",
    };
  } catch {
    return null;
  }
}

function writeConsent(preferences: Preferences): void {
  const value: StoredConsent = {
    necessary: true,
    ...preferences,
    version: 1,
    at: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* modo privado sem armazenamento: o aviso volta no próximo carregamento */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

export function openCookiePreferences(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    if (!stored) setVisible(true);

    const open = () => {
      const current = readConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setCustomizing(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  function decide(preferences: Preferences) {
    writeConsent(preferences);
    setVisible(false);
    setCustomizing(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-label="Preferências de cookies">
      <div className="cookie-consent__body">
        <p className="mono-label cookie-consent__label">Cookies</p>
        <p className="cookie-consent__title">A sua privacidade</p>
        <p className="cookie-consent__text">
          Usamos cookies necessários para o site funcionar. Com o seu consentimento, usamos também cookies de
          análise para perceber como o site é utilizado. Pode aceitar, recusar ou escolher.{" "}
          <Link to="/privacidade">Saber mais</Link>
        </p>
      </div>

      {customizing ? (
        <div className="cookie-consent__options">
          <div className="cookie-consent__option">
            <div>
              <p className="cookie-consent__option-title">Necessários</p>
              <p className="cookie-consent__option-text">Segurança e funcionamento do site. Sempre ativos.</p>
            </div>
            <span className="cookie-consent__fixed">Sempre</span>
          </div>

          <label className="cookie-consent__option">
            <div>
              <p className="cookie-consent__option-title">Análise</p>
              <p className="cookie-consent__option-text">Páginas visitadas e tempo de visita, de forma agregada.</p>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
            />
          </label>

          <label className="cookie-consent__option">
            <div>
              <p className="cookie-consent__option-title">Marketing</p>
              <p className="cookie-consent__option-text">Medir campanhas e mostrar conteúdo relevante.</p>
            </div>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
            />
          </label>

          <div className="cookie-consent__actions">
            <button
              type="button"
              className="btn btn--solid btn--sm"
              onClick={() => decide({ analytics, marketing })}
            >
              Guardar escolha
            </button>
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => setCustomizing(false)}>
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="cookie-consent__actions">
          <button
            type="button"
            className="btn btn--solid btn--sm"
            onClick={() => decide({ analytics: true, marketing: true })}
          >
            Aceitar todos
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => decide({ analytics: false, marketing: false })}
          >
            Recusar
          </button>
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => setCustomizing(true)}>
            Personalizar
          </button>
        </div>
      )}
    </div>
  );
}
