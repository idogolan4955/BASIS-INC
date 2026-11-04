#!/bin/sh
# Builds the BASIS INC. icon set from tools/mac-app/icon-1024.png and makes a
# small Mac app in ~/Applications that opens the platform's front door in the
# default browser. The web app itself is installable too (manifest.webmanifest):
# Safari › File › Add to Dock, or Chrome › Install app.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SRC="$HERE/icon-1024.png"
ICONS="$ROOT/apps/platform/public/icons"
URL="${BASIS_URL:-https://basis-inc-hq.web.app/hub}"
mkdir -p "$ICONS"
for size in 512 192 180 32; do sips -z $size $size "$SRC" --out "$ICONS/icon-$size.png" >/dev/null; done
cp "$SRC" "$ICONS/icon-1024.png"
# .icns for the Mac app
SET="$(mktemp -d)/BASIS.iconset"; mkdir -p "$SET"
for size in 16 32 64 128 256 512; do
  sips -z $size $size "$SRC" --out "$SET/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2)); sips -z $double $double "$SRC" --out "$SET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$SET" -o "$HERE/BASIS.icns"
# the app: an AppleScript applet that opens the URL
APP="$HOME/Applications/BASIS INC.app"
mkdir -p "$HOME/Applications"
rm -rf "$APP"
printf 'open location "%s"\n' "$URL" > "$HERE/open.applescript"
osacompile -o "$APP" "$HERE/open.applescript"
cp "$HERE/BASIS.icns" "$APP/Contents/Resources/applet.icns"
# the applet ships an asset catalogue whose AppIcon would win over applet.icns
rm -f "$APP/Contents/Resources/Assets.car"
/usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Set :CFBundleName BASIS INC." "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string BASIS INC." "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.basis-inc.frontdoor" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
touch "$APP"
rm -f "$HERE/open.applescript"
echo "Made $APP opening $URL"
