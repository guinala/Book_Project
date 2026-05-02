export function encodeKey(workKey: string): string {
  return workKey.split("/").at(-1) ?? workKey;
}

export function toWorkKey(bookId: string): string {
  return bookId.startsWith("/works/") ? bookId : `/works/${bookId}`;
}
