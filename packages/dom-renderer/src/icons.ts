const SVG_NS = "http://www.w3.org/2000/svg";

interface IconOptions {
  size?: number;
  className?: string;
  filled?: boolean;
}

function createIconSvg(
  paths: string | string[],
  { size = 14, className, filled = false }: IconOptions = {},
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("ol-grid__icon");
  if (className) {
    svg.classList.add(className);
  }

  if (filled) {
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("stroke", "none");
  } else {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.75");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  }

  for (const d of Array.isArray(paths) ? paths : [paths]) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }

  return svg;
}

/** Chevron pointing up — ascending sort indicator. */
export function createSortAscIcon(): SVGSVGElement {
  return createIconSvg("M4 10 8 6 12 10", { size: 12, className: "ol-grid__sort-icon" });
}

/** Chevron pointing down — descending sort indicator. */
export function createSortDescIcon(): SVGSVGElement {
  return createIconSvg("M4 6 8 10 12 6", { size: 12, className: "ol-grid__sort-icon" });
}

/** Funnel — column filter trigger. */
export function createFilterIcon(): SVGSVGElement {
  return createIconSvg("M2 3.5h12L9 10v4H7v-4L2 3.5z", {
    size: 14,
    className: "ol-grid__filter-icon",
    filled: true,
  });
}
