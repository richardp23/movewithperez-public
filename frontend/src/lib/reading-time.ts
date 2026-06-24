interface EntryLike {
  body?: string;
}

export function getReadingTime(entry: EntryLike): number {
  const words = entry.body?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  return Math.max(1, Math.round(words / 220));
}
