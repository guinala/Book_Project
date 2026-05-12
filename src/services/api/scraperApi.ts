export async function fetchScrapedSynopsis(
  title: string,
  author: string
): Promise<string> {
  const url = `http://localhost/booksynopsis/synopsis.php`
    + `?title=${encodeURIComponent(title)}`
    + `&author=${encodeURIComponent(author)}`;
  const r = await fetch(url);
  if (!r.ok) return '';
  const { synopsis } = await r.json();
  return synopsis ?? '';
}