import L from "leaflet";
import { useEffect, useRef } from "react";
import { type Block, dominantGroup, dominantTypeLabel } from "../lib/blocks";
import { GROUP_BY_KEY, MIX_GROUPS } from "../lib/flatTypes";
import { fmt, formatAddress } from "../lib/format";

const TILE_URL = "https://www.onemap.gov.sg/maps/tiles/Grey/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:16px;width:16px;display:inline;vertical-align:-3px"/> ' +
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> © contributors | ' +
  '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener">Singapore Land Authority</a>';
const SG_BOUNDS = L.latLngBounds([1.144, 103.535], [1.494, 104.502]);

interface Props {
  blocks: readonly Block[];
  selectedId?: string | null;
  onSelect?: (block: Block) => void;
  className?: string;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function MapView({ blocks, selectedId, onSelect, className = "h-80 sm:h-[420px]" }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const pendingFit = useRef<readonly Block[] | null>(null);

  // Frame the given blocks; if the map is hidden (zero size), wait until it is shown.
  const frame = (list: readonly Block[]) => {
    const m = map.current;
    if (!m) return;
    if (!container.current?.clientWidth) {
      pendingFit.current = list;
      return;
    }
    pendingFit.current = null;
    const points = list.filter((b) => b.lat != null && b.lng != null).map((b) => [b.lat!, b.lng!] as [number, number]);
    if (points.length === 1) m.setView(points[0], 17);
    else if (points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 17 });
  };

  useEffect(() => {
    if (!container.current) return;
    const m = L.map(container.current, {
      center: [1.3521, 103.8198],
      zoom: 12,
      minZoom: 11,
      maxZoom: 19,
      maxBounds: SG_BOUNDS,
      scrollWheelZoom: false,
    });
    L.tileLayer(TILE_URL, { detectRetina: true, maxZoom: 19, minZoom: 11, attribution: ATTRIBUTION }).addTo(m);
    m.attributionControl.setPrefix(false);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    // Leaflet needs a nudge when its container is resized or un-hidden (e.g. switching tabs).
    const observer = new ResizeObserver(() => {
      m.invalidateSize();
      if (pendingFit.current) frame(pendingFit.current);
    });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const group = layer.current;
    if (!m || !group) return;
    group.clearLayers();
    const located = blocks.filter((b) => b.lat != null && b.lng != null);
    for (const b of located) {
      const isSelected = b.id === selectedId;
      const dom = dominantGroup(b);
      const marker = L.circleMarker([b.lat!, b.lng!], {
        radius: isSelected ? 9 : located.length > 400 ? 4 : 6,
        color: isSelected ? "#1c1b19" : "#ffffff",
        weight: 2,
        fillColor: dom ? GROUP_BY_KEY[dom].color : "#c3c2b7",
        fillOpacity: 1,
      });
      marker.bindTooltip(
        `<strong>${escapeHtml(formatAddress(b.blk, b.street))}</strong><br/>` +
          `${b.year || "—"} · ${fmt(b.units)} units · mostly ${escapeHtml(dominantTypeLabel(b))}`,
        { className: "block-tip", direction: "top", offset: [0, -6] },
      );
      marker.on("click", () => onSelectRef.current?.(b));
      marker.addTo(group);
      if (isSelected) marker.bringToFront();
    }
  }, [blocks, selectedId]);

  // Re-frame only when the set of blocks changes, not when a pin is selected.
  useEffect(() => frame(blocks), [blocks]);

  const present = new Set(blocks.map(dominantGroup));
  return (
    <div>
      <div ref={container} className={`w-full overflow-hidden rounded-2xl border border-line ${className}`} />
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Map legend: dominant flat type">
        <li className="text-muted">Pin colour = dominant flat type:</li>
        {MIX_GROUPS.filter((g) => present.has(g.key)).map((g) => (
          <li key={g.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
            {g.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
