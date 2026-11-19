/** Product and address fields accept plain Unicode text, never HTML or control codes. */
export function isPlainText(value: string): boolean {
  // eslint-disable-next-line no-control-regex -- Explicitly reject control characters in user text.
  return !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value);
}

export function isSingleLineText(value: string): boolean {
  return isPlainText(value) && !/[\r\n\t]/u.test(value);
}
