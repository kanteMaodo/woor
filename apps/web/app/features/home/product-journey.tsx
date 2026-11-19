import { useEffect, useRef, useState } from "react";

import { Icon } from "../../components/ui/icon";

const STAGES = [
  {
    title: "La commande est partagée",
    text: "Le vendeur crée le lien et l’envoie dans sa conversation avec l’acheteur.",
    status: "En attente de paiement",
    icon: "send",
    caption: "Awa partage le lien avec sa cliente.",
    amount: "13 500 F",
    label: "Total de la commande",
    detail: "L’article et la livraison sont détaillés avant de payer.",
  },
  {
    title: "Le paiement est protégé",
    text: "L’acheteur bloque le prix de l’article et celui de la course avec son wallet Lightning.",
    status: "Paiement bloqué",
    icon: "lock",
    caption: "Awa peut préparer le colis.",
    amount: "13 500 F",
    label: "Bloqués jusqu’à la remise",
    detail: "Le vendeur voit le statut. L’acheteur garde son code.",
  },
  {
    title: "Le livreur prend la route",
    text: "Le livreur confirme le ramassage. L’acheteur retrouve l’avancement dans sa commande.",
    status: "Livraison en cours",
    icon: "moto",
    caption: "Moussa a récupéré le colis chez Awa.",
    amount: "13 500 F",
    label: "Toujours bloqués pendant le trajet",
    detail: "Le paiement reste en attente jusqu’à la confirmation de remise.",
  },
  {
    title: "Le colis est remis",
    text: "L’acheteur donne son code à six chiffres au moment de la remise. Le livreur le valide.",
    status: "Livraison confirmée",
    icon: "check-circle",
    caption: "La remise est confirmée. Les paiements sont débloqués.",
    amount: "12 000 F + 1 500 F",
    label: "Article et course : paiements débloqués",
    detail: "Les versements suivent ensuite les règles de la commande.",
  },
] as const;

export function ProductJourney() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const container = useRef<HTMLDivElement>(null);
  const running = playing && !reducedMotion && inView && !hovered && !focused && visible;
  const current = STAGES[stage] ?? STAGES[0];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { threshold: 0.25 },
    );
    if (container.current) observer.observe(container.current);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setStage((value) => (value + 1) % STAGES.length), 4500);
    return () => window.clearTimeout(timer);
  }, [stage, running]);

  function selectStage(value: number) {
    setStage(value);
    setPlaying(false);
  }

  return (
    <div
      className="m-journey"
      ref={container}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => setFocused(!event.target.closest(".m-playback"))}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div
        className="m-journey-steps"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Les étapes d’une commande"
      >
        {STAGES.map((item, index) => (
          <button
            type="button"
            role="tab"
            id={`journey-tab-${index}`}
            aria-selected={stage === index}
            aria-controls="journey-panel"
            tabIndex={stage === index ? 0 : -1}
            onClick={() => selectStage(index)}
            onKeyDown={(event) => {
              const next = ["ArrowDown", "ArrowRight"].includes(event.key)
                ? (index + 1) % STAGES.length
                : ["ArrowUp", "ArrowLeft"].includes(event.key)
                  ? (index + STAGES.length - 1) % STAGES.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? STAGES.length - 1
                      : null;
              if (next !== null) {
                event.preventDefault();
                selectStage(next);
                document.getElementById(`journey-tab-${next}`)?.focus();
              }
            }}
            key={item.title}
          >
            <span className="m-step-icon">
              <Icon name={item.icon} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </span>
            {stage === index && (
              <span
                key={`${stage}-${running}`}
                className={`m-step-progress${running ? " is-running" : ""}`}
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>
      <div
        className="m-product-window"
        role="tabpanel"
        id="journey-panel"
        aria-labelledby={`journey-tab-${stage}`}
        tabIndex={0}
        data-stage={stage}
      >
        <div className="m-window-bar">
          <span>
            <Icon name="lock" size="sm" /> Commande Wóor
          </span>
          <span className="m-demo-label">Exemple illustratif</span>
        </div>
        <div className="m-product-body">
          <div className="m-order-top">
            <span className="m-shop-avatar">AC</span>
            <div>
              <strong>Awa Couture</strong>
              <span>Votre commande · Dakar</span>
            </div>
            <Icon name="shield" />
          </div>
          <div className="m-product-item">
            <span className="m-fabric-swatch" />
            <div>
              <strong>Robe en wax, taille M</strong>
              <span>Article · 12 000 F CFA</span>
            </div>
            <span>× 1</span>
          </div>
          <div key={stage} className="m-live-stage" aria-live={running ? "off" : "polite"}>
            <div className="m-product-payment">
              <span className="m-product-status">
                <Icon name={current.icon} size="sm" />
                {current.status}
              </span>
              <span>{current.label}</span>
              <strong>{current.amount}</strong>
              <p>{current.detail}</p>
            </div>
            <div className="m-live-scene" aria-hidden="true">
              {stage === 0 ? (
                <div className="m-live-message">
                  <Icon name="send" />
                  <span>Bonjour ! Voici le lien de votre robe.</span>
                  <span className="m-typing-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              ) : stage === 1 ? (
                <div className="m-live-lock">
                  <Icon name="lock" />
                  <span>Article + livraison</span>
                  <strong>13 500 F bloqués</strong>
                </div>
              ) : stage === 2 ? (
                <div className="m-delivery-route">
                  <span>Chez Awa</span>
                  <div>
                    <span className={running ? "is-moving" : ""}>
                      <Icon name="moto" />
                    </span>
                  </div>
                  <span>Chez la cliente</span>
                </div>
              ) : (
                <div className="m-code-confirmed">
                  {"482913".split("").map((digit, index) => (
                    <span key={index} style={{ animationDelay: `${index * 70}ms` }}>
                      {digit}
                    </span>
                  ))}
                  <Icon name="check-circle" />
                </div>
              )}
            </div>
            <div className="m-product-bottom">
              <Icon name={current.icon} />
              <span>{current.caption}</span>
            </div>
          </div>
        </div>
        <div className="m-playback">
          <span>
            Étape {stage + 1} sur {STAGES.length}
          </span>
          <button
            type="button"
            disabled={reducedMotion}
            onClick={() => {
              setPlaying(!playing);
              setHovered(false);
              setFocused(false);
            }}
            aria-label={
              playing && !reducedMotion
                ? "Mettre la démonstration en pause"
                : "Lire la démonstration"
            }
          >
            {playing && !reducedMotion ? "Pause" : "Lecture"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStage(0);
              setPlaying(!reducedMotion);
              setHovered(false);
              setFocused(false);
            }}
          >
            Recommencer
          </button>
        </div>
      </div>
    </div>
  );
}
