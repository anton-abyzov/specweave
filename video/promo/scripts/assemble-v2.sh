#!/usr/bin/env bash
# Promo v2: one continuous render of scene/v2.html (68 s) plus the eleven narration
# lines placed on its timeline, then the whole cut sped up 1.06x with pitch preserved.
# Usage: assemble-v2.sh <v2-video.mp4> <vo-dir> <out.mp4>
set -euo pipefail
VID=$1 VO=$2 OUT=$3
IDS=(01-apps 02-limit 03-one-machine 04-one-window 05-coordinator 06-threads 07-limit 08-machines 09-chrome 10-why-b 11-end-b)
AT=(500 4600 8700 11900 18400 24800 31400 36600 44800 49900 61400)
ins=() f=""; mix=""
for i in "${!IDS[@]}"; do
  ins+=(-i "$VO/${IDS[$i]}.wav"); n=$((i + 1))
  f+="[$n:a]adelay=${AT[$i]}:all=1[a$n];"; mix+="[a$n]"
done
ffmpeg -y -v error -i "$VID" "${ins[@]}" -filter_complex "
  [0:v]setpts=PTS/1.06,fps=30,format=yuv420p[v];
  ${f}${mix}amix=inputs=${#IDS[@]}:normalize=0,apad,atrim=0:68,atempo=1.06,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 160k -ar 48000 -t 64.15 "$OUT"
