import { useId, useState } from "react";
import type { ComponentProps, FormEvent } from "react";
import { Form } from "react-router";
import type { z } from "zod";

import { formValues } from "../../lib/form-validation";

type Props<T extends z.ZodType> = Omit<ComponentProps<typeof Form>, "onSubmit"> & {
  schema: T;
  native?: boolean;
  onValidated?: (values: z.output<T>) => void;
};

export function ValidatedForm<T extends z.ZodType>({
  schema,
  native = false,
  onValidated,
  children,
  ...props
}: Props<T>) {
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  function validate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    for (const field of form.querySelectorAll('[aria-invalid="true"]')) {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-errormessage");
    }
    const result = schema.safeParse(formValues(new FormData(form)));
    if (!result.success) {
      event.preventDefault();
      setError(result.error.issues[0]?.message ?? "Vérifiez les champs du formulaire.");
      let first: HTMLElement | null = null;
      for (const issue of result.error.issues) {
        const field = form.elements.namedItem(String(issue.path[0] ?? ""));
        if (field instanceof HTMLElement) {
          field.setAttribute("aria-invalid", "true");
          field.setAttribute("aria-errormessage", errorId);
          first ??= field;
        }
      }
      first?.focus();
      return;
    }
    setError(null);
    if (onValidated) {
      event.preventDefault();
      onValidated(result.data);
    }
  }
  function clearField(event: FormEvent<HTMLFormElement>) {
    if (event.target instanceof HTMLElement) {
      event.target.removeAttribute("aria-invalid");
      event.target.removeAttribute("aria-errormessage");
    }
    setError(null);
  }
  const content = (
    <>
      {error && (
        <div className="form-validation-error" id={errorId} role="alert">
          {error}
        </div>
      )}
      {children}
    </>
  );
  return native ? (
    <form {...props} noValidate onSubmit={validate} onInputCapture={clearField}>
      {content}
    </form>
  ) : (
    <Form {...props} noValidate onSubmit={validate} onInputCapture={clearField}>
      {content}
    </Form>
  );
}
