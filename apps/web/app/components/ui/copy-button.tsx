import { useState } from "react";

import { Icon } from "./icon";

interface CopyButtonProps {
  value: string;
  label: string;
}

/** Copie une valeur dans le presse-papiers et le confirme pendant deux secondes. */
export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={copy}>
      <Icon name={copied ? "check" : "copy"} />
      <span aria-live="polite">{copied ? "Copié" : label}</span>
    </button>
  );
}
