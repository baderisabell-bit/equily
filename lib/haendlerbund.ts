export async function fetchHaendlerbund(doc: string): Promise<string> {
  const token = process.env.HAENDLERBUND_TOKEN;
  if (!token) throw new Error('HAENDLERBUND_TOKEN is not set');

  const base = process.env.HAENDLERBUND_API_BASE ?? 'https://api.haendlerbund.de';
  const res = await fetch(`${base}/v1/documents/${encodeURIComponent(doc)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/html',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch Händlerbund document ${doc}: ${res.status} ${res.statusText} ${text}`);
  }

  return await res.text();
}

