import { Icon, type IconName } from "./icon";

interface StatCardProps {
  icon: IconName;
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "neutral" | "warn";
}

/** Carte de chiffre clé, en tête de tableau de bord. */
export function StatCard({ icon, label, value, hint, tone = "neutral" }: StatCardProps) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-icon">
        <Icon name={icon} />
      </span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
