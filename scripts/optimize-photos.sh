#!/usr/bin/env bash
# optimize-photos.sh — bulk WebP conversion + SEO rename for all event/program photos
#
# Usage: bash scripts/optimize-photos.sh
# Requires: ImageMagick 7 (magick command)
#
# What it does:
#   • Converts JPG/JPEG/PNG → WebP with quality + resize settings per folder
#   • Renames files to SEO-friendly hyphenated names with zero-padded sequence
#   • Skips videos (.mov, .mp4), existing .webp files, and 0-byte files
#   • Deletes originals only after confirmed successful conversion
#   • Writes a log to scripts/optimize-photos.log

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="$(cd "$SCRIPT_DIR/.." && pwd)/public/images"
LOG="$SCRIPT_DIR/optimize-photos.log"

echo "Base: $BASE"
echo "Log:  $LOG"
echo ""

# Format: "relative/path|seo-prefix|max-px|quality"
# max-px: largest dimension allowed (aspect-ratio preserved via ">")
# quality: WebP quality 0-100
CONFIG=(
  "events/athena-awards/highlights|athena-awards-medina-ohio|1920|85"
  "events/athena-awards/part1|athena-awards-ceremony-medina-ohio|1920|82"
  "events/business-brew|business-brew-networking-medina-chamber|1920|82"
  "events/chamber-chat|chamber-chat-medina-chamber|1920|82"
  "events/eggs-and-expertise|eggs-and-expertise-medina-chamber|1920|82"
  "events/get-to-know-the-chamber|get-to-know-the-chamber-medina|1920|82"
  "events/lunch-bunch|lunch-bunch-medina-chamber|1920|82"
  "events/networking-wow|networking-wow-medina-chamber|1920|82"
  "events/ppe-fashion-show|ppe-fashion-show-medina-chamber|1920|82"
  "events/state-of-the-city|state-of-the-city-medina-ohio|1920|82"
  "events/october-member-meeting|october-member-meeting-medina-chamber|1920|82"
  "programs/compass|compass-leadership-program-medina|1920|85"
  "programs/compass/class-day-2|compass-leadership-session-2-medina|1920|85"
  "programs/compass/class-day-3|compass-leadership-session-3-medina|1920|85"
  "programs/safety-council|safety-council-bwc-award-medina|1200|88"
  "photos/sneak-peeks|medina-chamber-community|2400|88"
  "brand/merchandise|medina-chamber-merchandise|1200|90"
)

total_converted=0
total_skipped=0
total_errors=0

{
  echo "=== optimize-photos run: $(date) ==="
  echo ""
} | tee -a "$LOG"

for entry in "${CONFIG[@]}"; do
  IFS='|' read -r rel_folder prefix max_px quality <<< "$entry"
  folder="$BASE/$rel_folder"

  if [[ ! -d "$folder" ]]; then
    echo "SKIP (no dir): $rel_folder" | tee -a "$LOG"
    continue
  fi

  echo "" | tee -a "$LOG"
  echo "=== $rel_folder  →  ${prefix}-NNN.webp (max ${max_px}px, q${quality}) ===" | tee -a "$LOG"

  # Collect image files only (no videos, no existing webp), sorted by name
  mapfile -t files < <(
    find "$folder" -maxdepth 1 -type f \
      \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) \
      ! -size 0 \
      | sort
  )

  if [[ ${#files[@]} -eq 0 ]]; then
    echo "  (no images found)" | tee -a "$LOG"
    continue
  fi

  idx=1
  for src in "${files[@]}"; do
    padded=$(printf "%03d" "$idx")
    dest="${folder}/${prefix}-${padded}.webp"

    # Safety: don't overwrite if dest already exists with content
    if [[ -f "$dest" && -s "$dest" ]]; then
      echo "  SKIP (dest exists): $(basename "$dest")" | tee -a "$LOG"
      ((total_skipped++))
      ((idx++))
      continue
    fi

    if magick "$src" \
        -quality "$quality" \
        -resize "${max_px}x${max_px}>" \
        -strip \
        "$dest" 2>>"$LOG"; then
      rm "$src"
      size_kb=$(( $(wc -c < "$dest") / 1024 ))
      echo "  ✓ $(basename "$src")  →  ${prefix}-${padded}.webp  (${size_kb}KB)" | tee -a "$LOG"
      ((total_converted++))
      ((idx++))
    else
      echo "  ✗ FAILED: $(basename "$src")" | tee -a "$LOG"
      # Remove potentially incomplete output
      [[ -f "$dest" ]] && rm -f "$dest"
      ((total_errors++))
    fi
  done
done

echo "" | tee -a "$LOG"
echo "=== Finished: ${total_converted} converted, ${total_skipped} skipped, ${total_errors} errors ===" | tee -a "$LOG"
