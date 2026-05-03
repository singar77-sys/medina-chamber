#!/usr/bin/env bash
# transcode-videos.sh
#
# Converts .mov files to web-ready .mp4 (H.264/AAC) and extracts a .webp
# poster frame for each. Does NOT delete the source .mov files.
#
# Usage:
#   bash scripts/transcode-videos.sh                     # transcode all .mov
#   bash scripts/transcode-videos.sh --dir events/ppe-fashion-show
#   bash scripts/transcode-videos.sh --max-duration 60   # skip clips > 60s
#   bash scripts/transcode-videos.sh --dry-run           # show what would run
#
# Output:
#   Sibling .mp4 and .webp files next to each source .mov
#   Log written to scripts/transcode-videos.log
#
# Requirements: ffmpeg + ffprobe in PATH (ffmpeg 8.x confirmed available)
#
# Quality settings:
#   CRF 23    — visually transparent quality (lower = better, range 0-51)
#   preset slow — better compression at the cost of encode time
#   scale     — caps at 1920px wide, preserves aspect ratio
#   faststart — moov atom moved to front so video plays before full download
#   aac 128k  — CD-quality audio

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PUBLIC_DIR="$ROOT/public"
LOG="$SCRIPT_DIR/transcode-videos.log"

# ── Defaults ──────────────────────────────────────────────────────────────────
TARGET_DIR=""
MAX_DURATION=9999  # no limit by default
DRY_RUN=false

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --dir=*)      TARGET_DIR="${1#*=}"; shift ;;
    --dir)        TARGET_DIR="$2"; shift 2 ;;
    --max-duration=*) MAX_DURATION="${1#*=}"; shift ;;
    --max-duration)   MAX_DURATION="$2"; shift 2 ;;
    --dry-run)    DRY_RUN=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── Locate .mov files ─────────────────────────────────────────────────────────
if [[ -n "$TARGET_DIR" ]]; then
  SEARCH_ROOT="$PUBLIC_DIR/images/events/$TARGET_DIR"
else
  SEARCH_ROOT="$PUBLIC_DIR"
fi

mapfile -t MOV_FILES < <(find "$SEARCH_ROOT" -name "*.mov" -type f | sort)

if [[ ${#MOV_FILES[@]} -eq 0 ]]; then
  echo "No .mov files found under $SEARCH_ROOT"
  exit 0
fi

echo ""
echo "🎬 Transcoding .mov → .mp4  (dry-run: $DRY_RUN)"
echo "   Source root:  $SEARCH_ROOT"
echo "   Max duration: ${MAX_DURATION}s"
echo "   Files found:  ${#MOV_FILES[@]}"
echo "" | tee "$LOG"

CONVERTED=0
SKIPPED_DURATION=0
SKIPPED_EXISTS=0
ERRORS=0

for MOV in "${MOV_FILES[@]}"; do
  RELATIVE="${MOV#$ROOT/}"
  DIR="$(dirname "$MOV")"
  BASE="$(basename "$MOV" .mov)"
  MP4="$DIR/$BASE.mp4"
  POSTER="$DIR/$BASE.webp"

  # Skip if output already exists
  if [[ -f "$MP4" ]]; then
    echo "⏭  $RELATIVE → already transcoded, skipping" | tee -a "$LOG"
    SKIPPED_EXISTS=$((SKIPPED_EXISTS + 1))
    continue
  fi

  # Check duration via ffprobe
  DURATION=$(ffprobe -v error -show_entries format=duration \
    -of default=noprint_wrappers=1:nokey=1 "$MOV" 2>/dev/null || echo "0")
  DURATION_INT=$(printf "%.0f" "$DURATION")

  # Human-friendly duration string
  MINS=$(( DURATION_INT / 60 ))
  SECS=$(( DURATION_INT % 60 ))
  DUR_STR="${MINS}m${SECS}s"

  # File size
  SIZE_BYTES=$(stat -c%s "$MOV" 2>/dev/null || stat -f%z "$MOV")
  SIZE_MB=$(awk "BEGIN {printf \"%.1f\", $SIZE_BYTES/1048576}")

  if [[ $DURATION_INT -gt $MAX_DURATION ]]; then
    echo "⏭  $RELATIVE (${DUR_STR}, ${SIZE_MB}MB) → exceeds ${MAX_DURATION}s limit, skipping" | tee -a "$LOG"
    SKIPPED_DURATION=$((SKIPPED_DURATION + 1))
    continue
  fi

  echo "▶  $RELATIVE (${DUR_STR}, ${SIZE_MB}MB)" | tee -a "$LOG"

  if $DRY_RUN; then
    echo "   [dry-run] would → $(basename "$MP4") + $(basename "$POSTER")"
    CONVERTED=$((CONVERTED + 1))
    continue
  fi

  # ── Transcode to mp4 ────────────────────────────────────────────────────────
  if ffmpeg -i "$MOV" \
    -c:v libx264 -crf 23 -preset slow \
    -vf "scale='min(1920,iw)':-2:flags=lanczos,format=yuv420p" \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    -y "$MP4" \
    2>>"$LOG"; then

    MP4_SIZE=$(stat -c%s "$MP4" 2>/dev/null || stat -f%z "$MP4")
    MP4_MB=$(awk "BEGIN {printf \"%.1f\", $MP4_SIZE/1048576}")
    REDUCTION=$(awk "BEGIN {printf \"%d\", 100 - ($MP4_SIZE * 100 / $SIZE_BYTES)}")
    echo "   ✓ mp4: ${MP4_MB}MB (${REDUCTION}% smaller)" | tee -a "$LOG"

  else
    echo "   ✗ ffmpeg error — skipping poster extraction" | tee -a "$LOG"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # ── Extract poster frame at 2s (or midpoint for very short clips) ───────────
  SEEK=$(( DURATION_INT < 4 ? 0 : 2 ))
  if ffmpeg -ss "$SEEK" -i "$MOV" \
    -vframes 1 \
    -vf "scale='min(1280,iw)':-2" \
    -q:v 80 \
    -y "$POSTER" \
    2>>"$LOG"; then
    echo "   ✓ poster: $(basename "$POSTER")" | tee -a "$LOG"
  else
    echo "   ⚠  poster extraction failed (non-fatal)" | tee -a "$LOG"
  fi

  CONVERTED=$((CONVERTED + 1))
done

echo "" | tee -a "$LOG"
echo "✅  Done." | tee -a "$LOG"
echo "   Converted:         $CONVERTED" | tee -a "$LOG"
echo "   Skipped (exists):  $SKIPPED_EXISTS" | tee -a "$LOG"
echo "   Skipped (too long): $SKIPPED_DURATION" | tee -a "$LOG"
echo "   Errors:            $ERRORS" | tee -a "$LOG"
