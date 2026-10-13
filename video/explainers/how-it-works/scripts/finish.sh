#!/bin/sh
# Add the music bed under the render (ducked by the VO), normalize to -16 LUFS /
# -1.5 dBTP, encode AAC 192k, copy video, write a poster JPG.
# Usage: finish.sh <render.mp4> <music.mp3> <out.mp4> <poster.jpg> <posterSec> [musicGain] [musicEndSec]
# musicEndSec: where the track's own ending lands; the music is offset so that ending meets the video's last frame.
set -eu
IN="$1"; MUSIC="$2"; OUT="$3"; POSTER="$4"; AT="$5"; GAIN="${6:-0.32}"; MEND="${7:-}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
MIX="$OUT.mix.wav"
SS=0; FADE_OUT="afade=t=out:st=$(python3 -c "print(max(0,$DUR-2.5))"):d=2.5"
if [ -n "$MEND" ]; then SS=$(python3 -c "print(max(0,$MEND-$DUR+0.4))"); FADE_OUT="anull"; fi
ffmpeg -y -v error -i "$IN" -ss "$SS" -i "$MUSIC" -filter_complex \
 "[0:a]aresample=48000,asplit=2[vo][key];[1:a]aresample=48000,volume=$GAIN,afade=t=in:d=1.5,$FADE_OUT[m];[m][key]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=500[duck];[vo][duck]amix=inputs=2:normalize=0:duration=first[a]" \
 -map "[a]" -t "$DUR" "$MIX"
M=$(ffmpeg -hide_banner -nostats -i "$MIX" -af loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { printf '%s' "$M" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
F="loudnorm=I=-16:TP=-1.5:LRA=8:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000"
ffmpeg -y -v error -i "$IN" -i "$MIX" -map 0:v:0 -map 1:a:0 -c:v copy -af "$F" -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$OUT"
rm -f "$MIX"
ffmpeg -y -v error -ss "$AT" -i "$OUT" -frames:v 1 -q:v 3 "$POSTER"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary/,$p' | grep -E "I:|Peak:"
