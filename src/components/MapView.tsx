"use client";
// Leaflet map with coloured shop dots. Leaflet touches `window`, so it is loaded
// in an effect; markers are circle markers (no image assets to bundle).
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLon } from "@/lib/shop/geo";

export interface MapPoint extends LatLon {
  id: string;
  label: string;
  tone: "good" | "fair" | "high" | "muted" | "brand";
  selected?: boolean;
}

const COLORS: Record<MapPoint["tone"], string> = {
  good: "#11994a",
  fair: "#c98a00",
  high: "#e0393e",
  muted: "#8a8797",
  brand: "#5b47e0",
};

export function MapView({
  points,
  origin,
  radiusKm,
  onSelect,
  className = "h-72",
}: {
  points: MapPoint[];
  origin?: (LatLon & { label?: string }) | null;
  radiusKm?: number | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((leaflet) => {
      if (cancelled || !box.current || map.current) return;
      L.current = leaflet;
      const m = leaflet.map(box.current, { zoomControl: false, attributionControl: true }).setView([35.6955, 51.4155], 15);
      leaflet
        .tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
          subdomains: "abcd",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
        })
        .addTo(m);
      leaflet.control.zoom({ position: "bottomleft" }).addTo(m);
      map.current = m;
      // Markers are drawn by the effect below (it waits for the map to exist).
      layer.current = leaflet.layerGroup().addTo(m);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // (Re)draw markers.
  useEffect(() => {
    let tries = 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    const draw = () => {
      const leaflet = L.current;
      const m = map.current;
      const g = layer.current;
      if (!leaflet || !m || !g) {
        if (tries++ < 40) t = setTimeout(draw, 100);
        return;
      }
      g.clearLayers();
      const bounds: [number, number][] = [];
      if (origin) {
        leaflet
          .circleMarker([origin.lat, origin.lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#2f6bd8", fillOpacity: 1 })
          .bindTooltip(origin.label ?? "شما", { direction: "top" })
          .addTo(g);
        bounds.push([origin.lat, origin.lon]);
        if (radiusKm) {
          leaflet
            .circle([origin.lat, origin.lon], { radius: radiusKm * 1000, color: "#2f6bd8", weight: 1, fillOpacity: 0.05 })
            .addTo(g);
        }
      }
      for (const p of points) {
        const marker = leaflet
          .circleMarker([p.lat, p.lon], {
            radius: p.selected ? 10 : 7,
            color: "#fff",
            weight: p.selected ? 3 : 2,
            fillColor: COLORS[p.tone],
            fillOpacity: 0.95,
          })
          .bindTooltip(p.label, { direction: "top" })
          .addTo(g);
        marker.on("click", () => onSelectRef.current?.(p.id));
        bounds.push([p.lat, p.lon]);
      }
      if (bounds.length === 1) m.setView(bounds[0], 16);
      else if (bounds.length > 1) m.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
    };
    draw();
    return () => {
      if (t) clearTimeout(t);
    };
  }, [points, origin, radiusKm]);

  return <div ref={box} className={`w-full overflow-hidden rounded-[var(--radius-card)] bg-surface-2 ${className}`} />;
}
