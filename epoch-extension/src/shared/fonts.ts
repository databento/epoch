const FONT_FAMILY_NAME = "Inter Variable";

export const FONT_FAMILY = `'${FONT_FAMILY_NAME}', Inter, sans-serif`;

let fontLoadPromise: Promise<void> | null = null;

export function preloadInterFont(): Promise<void> {
  if (!fontLoadPromise) {
    fontLoadPromise = loadInterFont().catch(() => undefined);
  }
  return fontLoadPromise;
}

async function loadInterFont(): Promise<void> {
  if (typeof FontFace === "undefined" || !document.fonts) {
    return;
  }

  const fontUrl = chrome.runtime.getURL("fonts/InterVariable.woff2");
  const descriptors = '16px "Inter Variable"';
  if (document.fonts.check(descriptors)) {
    return;
  }

  const fontFace = new FontFace(
    FONT_FAMILY_NAME,
    `url(${fontUrl}) format('woff2-variations')`,
    { style: "normal", weight: "100 900", display: "block" }
  );

  const loaded = await fontFace.load();
  document.fonts.add(loaded);
  await document.fonts.load(descriptors);
}
