import { useEffect, useRef } from "react";
import { useRevalidator } from "react-router";

/**
 * Recharge les données de la page à intervalle régulier, tant que l'onglet est visible.
 * Sans JavaScript, la page reste juste et s'actualise au prochain chargement.
 */
export function usePolling(intervalMs: number, enabled: boolean): void {
  const revalidator = useRevalidator();
  const revalidatorRef = useRef(revalidator);
  revalidatorRef.current = revalidator;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const timer = setInterval(() => {
      const current = revalidatorRef.current;
      if (current.state === "idle" && document.visibilityState === "visible") {
        void current.revalidate();
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs]);
}
