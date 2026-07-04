// Dynamically updates the browser favicon/tab icon.
// Falls back to the bundled golden emblem when no custom logo is set.
export function applyFavicon(url?: string | null) {
  if (typeof document === "undefined") return;
  const href = url && url.trim() ? url : "/golden-emblem.png";
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = href.startsWith("data:") ? "image/png" : "image/png";
  link.href = href;

  // Also update apple-touch-icon if present.
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (apple) apple.href = href;
}
