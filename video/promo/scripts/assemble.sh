#!/usr/bin/env bash
# Rebuild the homepage promo: keep the previous cut's goal, parallel, review,
# usage-limit and end-card shots, replace the coordinator and browser scenes,
# and lay the new narration on the timeline below.
# Usage: assemble.sh <previous-promo.mp4> <threads.mp4> <browser.mp4> <vo-dir> <out.mp4>
set -euo pipefail
OLD=$1 THREADS=$2 BROWSER=$3 VO=$4 OUT=$5
# segment: source start end (seconds); the usage-limit shot stops before its fade and holds 0.8 s.
# The end card starts at 26.7, after the old browser scene has faded out; browser.mp4 is 6.3 s.
ffmpeg -y -v error -i "$OLD" -i "$THREADS" -i "$BROWSER" \
  -i "$VO/01-goal.wav" -i "$VO/02-threads.wav" -i "$VO/03-reuse.wav" -i "$VO/04-parallel.wav" \
  -i "$VO/05-review.wav" -i "$VO/06-limit.wav" -i "$VO/07-chrome.wav" -i "$VO/08-download.wav" -i "$VO/09-url.wav" \
  -filter_complex "
  [0:v]trim=0:3.2,setpts=PTS-STARTPTS,fps=30,format=yuv420p[s1];
  [1:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS,fade=t=in:d=0.25:color=0x13101a,fade=t=out:st=10.6:d=0.3:color=0x13101a[s2];
  [0:v]trim=6.75:12.75,setpts=PTS-STARTPTS,fps=30,format=yuv420p[s3];
  [0:v]trim=12.75:16.0,setpts=PTS-STARTPTS,fps=30,format=yuv420p[s4];
  [0:v]trim=16.0:20.6,setpts=PTS-STARTPTS,fps=30,format=yuv420p,tpad=stop_mode=clone:stop_duration=0.8[s5];
  [2:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS,fade=t=in:d=0.25:color=0x13101a,fade=t=out:st=6.0:d=0.3:color=0x13101a[s6];
  [0:v]trim=26.7:37.0,setpts=PTS-STARTPTS,fps=30,format=yuv420p[s7];
  [s1][s2][s3][s4][s5][s6][s7]concat=n=7:v=1:a=0[v];
  [3:a]adelay=700:all=1[a1]; [4:a]adelay=3400:all=1[a2]; [5:a]adelay=7650:all=1[a3];
  [6:a]adelay=14300:all=1[a4]; [7:a]adelay=20300:all=1[a5]; [8:a]adelay=23550:all=1[a6];
  [9:a]adelay=29100:all=1[a7]; [10:a]adelay=35150:all=1[a8]; [11:a]adelay=40000:all=1[a9];
  [a1][a2][a3][a4][a5][a6][a7][a8][a9]amix=inputs=9:normalize=0,apad,atrim=0:45.35,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 160k -ar 48000 -t 45.35 "$OUT"
