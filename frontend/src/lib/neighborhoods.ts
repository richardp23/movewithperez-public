import type { CollectionEntry } from 'astro:content';
import { withBase } from './base-path';

type NeighborhoodEntry = CollectionEntry<'neighborhoods'>;

export function toNeighborhoodCarouselItems(items: NeighborhoodEntry[]) {
  return items.map((n) => ({
    href: withBase(`/neighborhoods/${n.id}`),
    name: n.data.name,
    image: n.data.heroImage,
    summary: n.data.summary,
  }));
}
