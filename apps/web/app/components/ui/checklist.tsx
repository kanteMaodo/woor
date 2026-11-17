import { Icon } from "./icon";

export interface ChecklistItem {
  done: boolean;
  label: string;
}

/** Conditions remplies ou non : coche verte ou horloge, jamais la couleur seule. */
export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="checklist">
      {items.map((item) => (
        <li key={item.label} className={item.done ? "done" : "todo"}>
          <Icon name={item.done ? "check-circle" : "clock"} />
          <span>
            {item.label}
            <span className="sr-only">{item.done ? " : fait" : " : en attente"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
