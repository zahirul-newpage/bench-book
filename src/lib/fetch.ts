export class FetchError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "FetchError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => undefined);
    }
    throw new FetchError(
      `Request to ${url} failed with status ${res.status}`,
      res.status,
      body
    );
  }

  return res.json() as Promise<T>;
}
