import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { withBase } from '../../lib/base-path';

// Free, no-key vector tiles. If usage ever outgrows the public instance,
// swap for a self-hosted style or another provider here.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const SINGLE_MARKER_ZOOM = 13.5;

export interface MapMarker {
  name: string;
  lat: number;
  lng: number;
  /** When set, the marker popup links to /neighborhoods/[slug] */
  slug?: string;
}

interface Props {
  markers: MapMarker[];
  /** Accessible label for the map region */
  label?: string;
}

export default function NeighborhoodMap({
  markers,
  label = 'Map of neighborhoods I serve',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || markers.length === 0) return;

    const accent =
      getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() ||
      '#00929c';

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [markers[0].lng, markers[0].lat],
      zoom: markers.length === 1 ? SINGLE_MARKER_ZOOM : 12,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    for (const m of markers) {
      const popupHtml = m.slug
        ? `<a href="${withBase(`neighborhoods/${m.slug}`)}" style="font-weight:600;color:inherit;">${m.name}</a>`
        : `<strong>${m.name}</strong>`;
      new maplibregl.Marker({ color: accent })
        .setLngLat([m.lng, m.lat])
        .setPopup(new maplibregl.Popup({ offset: 24, closeButton: false }).setHTML(popupHtml))
        .addTo(map);
    }

    if (markers.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      for (const m of markers) bounds.extend([m.lng, m.lat]);
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 });
    }

    const resize = () => map.resize();
    map.on('load', resize);
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [markers]);

  return (
    <>
      <div
        ref={containerRef}
        role="region"
        aria-label={label}
        className="neighborhood-map card w-full"
      />
      <noscript>
        <p style={{ color: 'var(--color-mute)', marginTop: '0.75rem' }}>
          Map requires JavaScript — browse the guides below.
        </p>
      </noscript>
    </>
  );
}
