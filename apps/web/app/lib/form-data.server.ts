const MAX_FORM_BYTES = 16 * 1024;

/** These forms have no uploads. Bound the stream before decoding or validating fields. */
export async function readPlainForm(request: Request): Promise<FormData> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/x-www-form-urlencoded")
  ) {
    throw new Response("Format de formulaire non pris en charge.", { status: 415 });
  }
  if (Number(request.headers.get("content-length")) > MAX_FORM_BYTES) {
    throw new Response("Formulaire trop volumineux.", { status: 413 });
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_FORM_BYTES) {
          await reader.cancel();
          throw new Response("Formulaire trop volumineux.", { status: 413 });
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const form = new FormData();
  for (const [key, value] of new URLSearchParams(new TextDecoder().decode(bytes)))
    form.append(key, value);
  return form;
}
