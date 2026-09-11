import { bytesToBase64 } from "./image-client.ts";

export interface BrandStyle {
  brandName?: string | null;
  primaryColor: string;
  textColor: string;
  overlayColor: string;
  overlayOpacity: number;
  headingFont: string;
  logoDataUri?: string;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
}

function wrapTitle(title: string, limit: number): string[] {
  const words = title.trim().split(/\s+/);
  const lines: string[] = []; let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > limit && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function rgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = match[1];
  return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
}

function luminance(hex: string): number {
  const value = rgb(hex) || [0, 0, 0];
  return value.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Keep title text readable against the configured overlay (WCAG AA target). */
export function readableTextColor(requested: string, overlay: string): string {
  if (rgb(requested) && rgb(overlay) && contrastRatio(requested, overlay) >= 4.5) return requested;
  return contrastRatio("#FFFFFF", overlay) >= contrastRatio("#000000", overlay) ? "#FFFFFF" : "#000000";
}

export function renderBrandedSvg(
  image: Uint8Array, mimeType: string, title: string, style: BrandStyle, width: number, height: number,
): Uint8Array {
  const lines = wrapTitle(title, width > height ? 35 : 22);
  const textColor = readableTextColor(style.textColor, style.overlayColor);
  const fontSize = width > height ? 68 : 76;
  const titleY = height - (lines.length * (fontSize * 1.1)) - 96;
  const tspan = lines.map((line, index) => `<tspan x="72" dy="${index ? fontSize * 1.1 : 0}">${escapeXml(line)}</tspan>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<image width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" href="data:${mimeType};base64,${bytesToBase64(image)}"/>
<rect width="${width}" height="${height}" fill="${style.overlayColor}" opacity="${Math.min(1, Math.max(0, style.overlayOpacity))}"/>
<rect x="48" y="48" width="${Math.min(260, width - 96)}" height="48" rx="24" fill="${style.primaryColor}" opacity=".94"/>
${style.logoDataUri ? `<image href="${style.logoDataUri}" x="${width - 160}" y="48" width="112" height="64" preserveAspectRatio="xMaxYMid meet"/>` : ""}
<text x="72" y="79" fill="${textColor}" font-family="${escapeXml(style.headingFont)}, sans-serif" font-size="24" font-weight="700">${escapeXml(style.brandName || "AI CONTENT FACTORY")}</text>
<text x="72" y="${titleY}" fill="${textColor}" font-family="${escapeXml(style.headingFont)}, sans-serif" font-size="${fontSize}" font-weight="800">${tspan}</text>
</svg>`;
  return new TextEncoder().encode(svg);
}
