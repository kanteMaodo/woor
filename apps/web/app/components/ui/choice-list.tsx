interface Choice {
  value: string;
  label: string;
  hint?: string;
}

interface ChoiceListProps {
  name: string;
  legend: string;
  choices: Choice[];
  defaultValue?: string;
}

/** Choix exclusif en grandes cartes : faciles à toucher, lisibles sans lunettes. */
export function ChoiceList({ name, legend, choices, defaultValue }: ChoiceListProps) {
  return (
    <fieldset className="choices">
      <legend>{legend}</legend>
      {choices.map((choice) => (
        <label key={choice.value} className="choice">
          <input
            type="radio"
            name={name}
            value={choice.value}
            defaultChecked={choice.value === defaultValue}
            required
          />
          <span className="choice-dot" aria-hidden="true" />
          <span className="choice-text">
            {choice.label}
            {choice.hint && <small>{choice.hint}</small>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
