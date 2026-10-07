// Self-hosted typefaces. No third-party font service at runtime.
// Stand-ins behind the font tokens until the brand faces are licensed:
// EB Garamond for display and tracked capitals, Source Sans 3 for interface
// text, Archivo for the wordmark, Martian Mono for codes and measurements.
import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource-variable/source-sans-3/wght.css';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/martian-mono/wdth.css';
// Hebrew: the display serif and the interface sans fall back per glyph to
// faces that carry the Hebrew script, so a Hebrew interface keeps the voices.
import '@fontsource/frank-ruhl-libre/400.css';
import '@fontsource/frank-ruhl-libre/500.css';
import '@fontsource/frank-ruhl-libre/600.css';
import '@fontsource/heebo/400.css';
import '@fontsource/heebo/500.css';
import '@fontsource/heebo/600.css';
