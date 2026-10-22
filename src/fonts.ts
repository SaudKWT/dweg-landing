/**
 * Inter, bundled with the app, so nothing loads from the internet at runtime.
 * KOC servers run without internet access (see the DWOS deployment notes).
 *
 * The KOC theme's --font-sans asks for "Inter", while the package ships the face
 * as "Inter Variable". Rather than edit a theme token, the bundled file is
 * registered under the name the theme already expects. Latin only, because the
 * system is English-only by decision (ADR 0001). Licence: OFL-1.1.
 */
import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";

const inter = new FontFace("Inter", `url(${interLatin}) format("woff2")`, {
  weight: "100 900",
  style: "normal",
  display: "swap",
});
document.fonts.add(inter);
void inter.load();
