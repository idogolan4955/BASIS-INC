#!/bin/sh
# Renders the app icon and the launch image from assets/*.html with headless
# Chrome and writes them, opaque, into the Xcode asset catalogue.
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$(mktemp -d)"
CATALOG="$HERE/ios/App/App/Assets.xcassets"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=1 --window-size=1024,1024 --screenshot="$OUT/icon.png" "file://$HERE/assets/icon.html" >/dev/null 2>&1
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=1 --window-size=2732,2732 --screenshot="$OUT/splash.png" "file://$HERE/assets/splash.html" >/dev/null 2>&1
# App Store icons may not carry an alpha channel.
python3 - "$OUT" "$CATALOG" <<'PY'
import sys
from PIL import Image
out, catalog = sys.argv[1], sys.argv[2]
icon = Image.open(f"{out}/icon.png").convert("RGB")
assert icon.size == (1024, 1024), icon.size
icon.save(f"{catalog}/AppIcon.appiconset/AppIcon-512@2x.png")
splash = Image.open(f"{out}/splash.png").convert("RGB")
assert splash.size == (2732, 2732), splash.size
for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
    splash.save(f"{catalog}/Splash.imageset/{name}")
print("icon and launch image written")
PY
rm -rf "$OUT"
