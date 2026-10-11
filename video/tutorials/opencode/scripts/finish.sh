#!/bin/sh
# Normalize the HyperFrames render to -16 LUFS / -1.5 dBTP (two-pass loudnorm, linear),
# encode AAC 192 kbps 48 kHz stereo, copy the H.264 video, then measure with ebur128
# and write a poster JPG.
# Usage: finish.sh <render.mp4> <out.mp4> <poster.jpg> <posterSec>
set -eu
IN="$1"; OUT="$2"; POSTER="$3"; AT="$4"
M=$(ffmpeg -hide_banner -nostats -i "$IN" -vn -af loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { printf '%s' "$M" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
F="loudnorm=I=-16:TP=-1.5:LRA=8:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000"
ffmpeg -y -v error -i "$IN" -map 0:v:0 -map 0:a:0 -c:v copy -af "$F" -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$OUT"
ffmpeg -y -v error -ss "$AT" -i "$OUT" -frames:v 1 -q:v 3 "$POSTER"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary/,$p'
