#!/bin/bash
# Copies the visual + audio material the flagship site uses out of the original
# source folders and into ./assets, recording provenance in asset-manifest.json.
#
# Nothing is moved, renamed or deleted at the source. Every copy is derived
# (resized / converted) so the flagship stays light, and the original path is
# written into the manifest.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$HERE/assets"
MANIFEST="$HERE/asset-manifest.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$ASSETS"/{marks,characters,worlds,posters,audio,docs,evidence}

# copy_image <src> <dest-rel> <alt> [max-width]
copy_image() {
  local src="$1" dest="$2" alt="$3" maxw="${4:-1200}"
  [ -f "$src" ] || { echo "MISSING: $src" >&2; return 1; }
  local out="$ASSETS/$dest"
  case "$dest" in
    *.png) sips -Z "$maxw" -s format png "$src" --out "$out" >/dev/null ;;
    *)     sips -Z "$maxw" -s format jpeg -s formatOptions 72 "$src" --out "$out" >/dev/null ;;
  esac
  local w h bytes
  w=$(sips -g pixelWidth "$out" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$out" | awk '/pixelHeight/{print $2}')
  bytes=$(stat -f%z "$out")
  printf '    {"file": "%s", "origin": "%s", "alt": "%s", "width": %s, "height": %s, "bytes": %s},\n' \
    "$dest" "$src" "$alt" "$w" "$h" "$bytes" >> "$TMP/entries.jsonl"
  echo "  ok  $dest  (${w}x${h}, ${bytes}B)"
}

copy_raw() {
  local src="$1" dest="$2" alt="$3" kind="${4:-binary}"
  [ -f "$src" ] || { echo "MISSING: $src" >&2; return 1; }
  cp "$src" "$ASSETS/$dest"
  local bytes
  bytes=$(stat -f%z "$ASSETS/$dest")
  printf '    {"file": "%s", "origin": "%s", "alt": "%s", "kind": "%s", "bytes": %s},\n' \
    "$dest" "$src" "$alt" "$kind" "$bytes" >> "$TMP/entries.jsonl"
  echo "  ok  $dest  (${bytes}B)"
}

: > "$TMP/entries.jsonl"

echo "marks + characters"
copy_image "/Users/steven/Downloads/ichoTaKu/ichoK.png" "marks/icho-kaggle-outlaw.png" \
  "ichoTAKU KAGGLE OUTLAW brush badge: a crowned raccoon in a patched leather jacket on a graffiti wall" 1000
copy_image "/Users/steven/Music/nocturneMelodies/choTaKu-trashcat/trashcat-pink.png" "characters/trashcat-pink.png" \
  "TrashCat, the punk raccoon philosopher, rendered in hot pink" 900

echo "worlds (multiverse district artwork)"
V3="/Users/steven/ichoTaKu.com/sites/multiverse-icloud-v3"
copy_image "$V3/alley/assets/love-is-rubbish-board.jpg" "worlds/heartbreak-alley.jpg" \
  "Love Is Rubbish: a wall of torn posters and pink hearts in Heartbreak Alley" 1200
copy_image "$V3/archive/assets/trashcat-anthology-wide.jpg" "worlds/creative-archive.jpg" \
  "TrashCat Anthology: a wide record-board of punk flyers and album art" 1200
copy_image "$V3/builds/assets/ecosystem-moodboard.png" "worlds/inside-the-build.jpg" \
  "Inside The Build: the ecosystem moodboard where the creative stack is assembled" 1200
copy_image "$V3/camp/assets/trashcat-reality-os.jpg" "worlds/creator-camp.jpg" \
  "Creator Camp: TrashCat Reality OS, a raccoon against a cobalt night alley" 1200
copy_image "$V3/ichotaku/assets/recent-indie-folk-raccoon.jpg" "worlds/the-forge.jpg" \
  "The Forge: the indie-folk raccoon, the creator at work" 1200
copy_image "$V3/labs/assets/generated-systems-manifesto.png" "worlds/avatar-arts-labs.jpg" \
  "Avatar-Arts Labs: the systems manifesto plate" 1200
copy_image "$V3/radio/assets/indie-folk-raccoon.jpg" "worlds/trashcat-radio.jpg" \
  "TrashCat Radio: the raccoon at the mic in an indie-folk transmission" 1200
copy_image "$V3/systems/assets/video-frame-03.jpg" "worlds/systems-that-create.jpg" \
  "Systems That Create: a still frame from the creative stack" 1200
copy_image "$V3/radio/assets/video-frame-01.jpg" "worlds/nocturne-verse.jpg" \
  "Nocturne Verse: a liminal frame between the takes" 1200

echo "posters"
copy_image "/Users/steven/Downloads/ichoTaKu/1.png" "posters/trashcat-radio-banner.jpg" \
  "TrashCat Radio banner: hot-pink ichoTAKU logotype over a punk alley wall" 1600

echo "audio"
copy_raw "/Users/steven/Music/nocturneMelodies/MP3/Night_Ancestors_Encounter - 104ff1fe-c1b3-405e-b430-e0ffac7a0bfd.mp3" \
  "audio/night-ancestors-encounter.mp3" \
  "Night Ancestors Encounter - a nocturne track used as the opt-in transmission sample" audio

echo "character + world documents"
CH="/Users/steven/ACCOS-CreativeAI-Music-Engine/avatararts-os/characters"
copy_raw "$CH/ichotaku/CHARACTER_GUIDE.md" "docs/ichotaku-character-guide.md" "ichoTaKu character guide" text
copy_raw "$CH/ichotaku/WORLDS.md" "docs/ichotaku-worlds.md" "ichoTaKu world pairings" text
copy_raw "$CH/trashcat/CHARACTER_GUIDE.md" "docs/trashcat-character-guide.md" "TrashCat character guide" text
copy_raw "$CH/trashcat/WORLDS.md" "docs/trashcat-worlds.md" "TrashCat world pairings" text

echo "evidence previews (atlas renders)"
AT="/Users/steven/ichoTaKu.com/assets"
copy_raw "$AT/11-index-0fe29044bb.webp" "evidence/multiverse-v1.webp" "AvaTar-ArTs Multiverse v1 preview" image
copy_raw "$AT/12-index-6c12682a60.webp" "evidence/multiverse-v2.webp" "AvaTar-ArTs Multiverse v2 preview" image
copy_raw "$AT/13-index-a7387a7e8a.webp" "evidence/multiverse-v3.webp" "AvaTar-ArTs Multiverse v3 preview" image
copy_raw "$AT/01-index-18eda117ad.webp" "evidence/ichotaku-hub.webp" "ichoTaKu creator hub preview" image
copy_raw "$AT/02-index-2-f9261bb3ad.webp" "evidence/chotaku-generator.webp" "CHOTAKU open-source video generation preview" image
copy_raw "$AT/08-index-eb47e221c5.webp" "evidence/moving-discography.webp" "choTaKu Moving Discography preview" image

cat > "$MANIFEST" <<HEADER
{
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "site": "flagship-site",
  "policy": "Copies only. Source files are never moved, renamed or deleted. Images are resized/converted derivatives; the origin path is recorded for every entry.",
  "entries": [
HEADER
cat "$TMP/entries.jsonl" >> "$MANIFEST"
cat >> "$MANIFEST" <<'FOOTER'
  ]
}
FOOTER

echo
echo "manifest: $MANIFEST"
echo "assets:   $(du -sh "$ASSETS" | awk '{print $1}')"
