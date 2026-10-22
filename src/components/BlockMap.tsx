import L from "leaflet";
import { useEffect, useRef } from "react";
import { type Block, dominantTypeLabel } from "../lib/blocks";
import { fmt, formatAddress } from "../lib/format";
import { blockColour, type ColourBy, legendFor } from "../lib/mapColours";

const TILE_URL = "https://www.onemap.gov.sg/maps/tiles/Grey/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:16px;width:16px;display:inline;vertical-align:-3px"/> ' +
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> © contributors | ' +
  '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener">Singapore Land Authority</a>';
const SG_BOUNDS = L.latLngBounds([1.144, 103.535], [1.494, 104.502]);
const SG_CENTRE: L.LatLngTuple = [1.3521, 103.8198];
const DETAIL_ZOOM = 17;

const radiusFor = (zoom: number) => (zoom <= 12 ? 2.5 : zoom === 13 ? 3.5 : zoom === 14 ? 4.5 : zoom === 15 ? 6 : 8);
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const tipHtml = (b: Block) =>
  `<strong>${escapeHtml(formatAddress(b.blk, b.street))}</strong><br/>` +
  `${b.year || "—"} · ${fmt(b.units)} units · mostly ${escapeHtml(dominantTypeLabel(b))}`;

interface Props {
  blocks: readonly Block[];
  selected: Block | null;
  onSelect: (block: Block) => void;
  colourBy: ColourBy;
  onColourByChange: (by: ColourBy) => void;
  /** Zoom to fit the blocks whenever they change (for result sets); otherwise start on all of Singapore. */
  fitToBlocks?: boolean;
  /** Bump to re-centre on the selected block even if it hasn't changed (e.g. chosen again from search). */
  focusKey?: number;
  className?: string;
}

interface Dot {
  block: Block;
  marker: L.CircleMarker;
}

/**
 * HDB blocks as clickable dots, coloured by main flat type or year built. Dots are drawn
 * on one canvas so all 10,000+ blocks stay fast on phones, and the canvas tolerance gives
 * fingers a larger hit area.
 */
export function BlockMap({
  blocks,
  selected,
  onSelect,
  colourBy,
  onColourByChange,
  fitToBlocks = false,
  focusKey = 0,
  className = "",
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const renderer = useRef<L.Canvas | null>(null);
  const tip = useRef<L.Tooltip | null>(null);
  const dots = useRef<Dot[]>([]);
  const highlight = useRef<L.CircleMarker | null>(null);
  const pendingFit = useRef(false);
  const pendingFocus = useRef<L.LatLng | null>(null);
  const lastStyle = useRef("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const colourRef = useRef(colourBy);
  colourRef.current = colourBy;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // Fit the current blocks; if the map is hidden (zero size, e.g. another tab), wait until it is shown.
  const frame = () => {
    const m = map.current;
    if (!m) return;
    if (!container.current?.clientWidth) {
      pendingFit.current = true;
      return;
    }
    pendingFit.current = false;
    const points = blocksRef.current.filter((b) => b.lat != null && b.lng != null).map((b) => [b.lat!, b.lng!] as L.LatLngTuple);
    if (points.length === 1) m.setView(points[0], DETAIL_ZOOM);
    else if (points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: DETAIL_ZOOM });
  };

  // Bring a point into view; if the map is hidden, do it once it is shown.
  const focus = (at: L.LatLng) => {
    const m = map.current;
    if (!m) return;
    if (!container.current?.clientWidth) {
      pendingFocus.current = at;
      return;
    }
    pendingFocus.current = null;
    if (m.getZoom() < 15) m.flyTo(at, DETAIL_ZOOM, { duration: 0.8 });
    else if (!m.getBounds().pad(-0.1).contains(at)) m.panTo(at);
  };

  // The map itself: created once.
  useEffect(() => {
    if (!container.current) return;
    const m = L.map(container.current, { center: SG_CENTRE, zoom: 12, minZoom: 11, maxZoom: 19, maxBounds: SG_BOUNDS });
    L.tileLayer(TILE_URL, { detectRetina: true, maxZoom: 19, minZoom: 11, attribution: ATTRIBUTION }).addTo(m);
    m.attributionControl.setPrefix(false);
    renderer.current = L.canvas({ padding: 0.5, tolerance: 6 });
    tip.current = L.tooltip({ className: "block-tip", direction: "top", offset: [0, -6] });
    layer.current = L.layerGroup().addTo(m);
    m.on("zoomend", () => {
      const z = m.getZoom();
      const style = { radius: radiusFor(z), stroke: z >= 15, color: "#ffffff", weight: 1 };
      const key = `${style.radius}|${style.stroke}`;
      if (key === lastStyle.current) return; // restyling 10,000 dots is costly; skip when nothing changes
      lastStyle.current = key;
      for (const { marker } of dots.current) marker.setStyle(style);
    });
    // Hover labels: close them on taps and moves so they don't stick on touch screens.
    m.on("click movestart", () => tip.current?.remove());
    const observer = new ResizeObserver(() => {
      m.invalidateSize();
      if (pendingFit.current) frame();
      if (pendingFocus.current) focus(pendingFocus.current);
    });
    observer.observe(container.current);
    map.current = m;
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
      layer.current = null;
      highlight.current = null;
      dots.current = [];
    };
  }, []);

  // The dots: rebuilt when the set of blocks changes.
  useEffect(() => {
    const m = map.current;
    const group = layer.current;
    if (!m || !group) return;
    group.clearLayers();
    tip.current?.remove();
    const z = m.getZoom();
    lastStyle.current = `${radiusFor(z)}|${z >= 15}`;
    dots.current = blocks
      .filter((b) => b.lat != null && b.lng != null)
      .map((block) => {
        const marker = L.circleMarker([block.lat!, block.lng!], {
          renderer: renderer.current ?? undefined,
          radius: radiusFor(z),
          stroke: z >= 15,
          color: "#ffffff",
          weight: 1,
          fillColor: blockColour(block, colourRef.current),
          fillOpacity: 0.9,
        });
        marker.on("click", () => onSelectRef.current(block));
        marker.on("mouseover", () => tip.current?.setLatLng(marker.getLatLng()).setContent(tipHtml(block)).addTo(m));
        marker.on("mouseout", () => tip.current?.remove());
        return { block, marker };
      });
    for (const { marker } of dots.current) marker.addTo(group);
    if (fitToBlocks) frame();
  }, [blocks, fitToBlocks]);

  // Recolour without rebuilding (only when the colouring changes: this touches every dot).
  useEffect(() => {
    for (const { block, marker } of dots.current) marker.setStyle({ fillColor: blockColour(block, colourBy) });
    if (selectedRef.current) highlight.current?.setStyle({ fillColor: blockColour(selectedRef.current, colourBy) });
  }, [colourBy]);

  // Ring the selected block and bring it into view.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    highlight.current?.remove();
    highlight.current = null;
    if (!selected || selected.lat == null || selected.lng == null) return;
    const at = L.latLng(selected.lat, selected.lng);
    highlight.current = L.circleMarker(at, {
      radius: 11,
      color: "#1c1b19",
      weight: 3,
      fillColor: blockColour(selected, colourRef.current),
      fillOpacity: 1,
      interactive: false,
    }).addTo(m);
    focus(at);
  }, [selected, focusKey]);

  const legend = legendFor(colourBy);
  return (
    <div className="flex h-full flex-col">
      <div ref={container} className={`min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-line ${className}`} />
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div role="group" aria-label="Colour blocks by" className="inline-flex rounded-lg bg-surface p-0.5 text-xs ring-1 ring-line">
          {(
            [
              ["type", "Main flat type"],
              ["year", "Year built"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={colourBy === key}
              onClick={() => onColourByChange(key)}
              className={`rounded-md px-2.5 py-1 ${colourBy === key ? "bg-ink text-white" : "text-ink-2 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2" aria-label="Map legend">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
