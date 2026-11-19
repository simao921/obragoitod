import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "@obragoito/core";

/** Leitura de um recurso da API com estados de carregamento e erro. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  const reload = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await api.get<T>(path);
      setData(result);
      setError(null);
    } catch (requestError) {
      setError(isApiError(requestError) ? requestError.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
