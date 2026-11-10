/** Erreur d'un nœud Lightning, avec le code renvoyé par l'adaptateur. */
export class LightningError extends Error {
  override readonly name = "LightningError";

  constructor(
    message: string,
    readonly code: number | null,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }

  get isNotFound(): boolean {
    return this.code === 404;
  }
}
