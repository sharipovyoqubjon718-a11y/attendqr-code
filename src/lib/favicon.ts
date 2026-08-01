// Dynamically updates the browser favicon / app icon and the PWA manifest.
// The icon is the GLOBAL brand (set by the master administrator only) and
// falls back to the bundled golden emblem.
import { getGlobalLogo } from "./schools";

const DEFAULT_ICON = "/icons/icon-512.png";

function setLink(rel: string, href: string, type?: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  if (type) link.type = type;
  link.href = href;
}

let manifestUrl: string | null = null;

/** Rewrites the web manifest so the installed app uses the global brand icon. */
function applyManifestIcon(icon: string) {
  if (icon === DEFAULT_ICON) return; // static manifest already points here
  const manifest = {
    name: "AttendQR — ГДБҲ",
    short_name: "AttendQR",
    description: "Системаи идоракунии давомот бо сканери QR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b8860b",
    orientation: "portrait-primary",
    icons: [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  if (manifestUrl) URL.revokeObjectURL(manifestUrl);
  manifestUrl = URL.createObjectURL(blob);
  setLink("manifest", manifestUrl);
}

/**
 * Applies the global brand icon everywhere (tab icon, iOS icon, PWA manifest).
 * Per-school logos never change the app icon — they are scoped to that
 * school's dashboard and QR codes.
 */
export function applyFavicon(_ignored?: string | null) {
  if (typeof document === "undefined") return;
  const icon = getGlobalLogo() || DEFAULT_ICON;
  setLink("icon", icon, "image/png");
  setLink("apple-touch-icon", icon);
  applyManifestIcon(icon);
}
