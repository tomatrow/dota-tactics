#!/bin/sh
# Transcodes the Unity project's music (24-bit WAV, 34 MB) to AAC in MP4 (`.m4a`, about 2 MB) for
# the web. ffmpeg's AAC encoder writes an edit list, so decoders trim its priming and padding: the
# clips keep their lengths (Chromium decodes them sample-exact) and the intro runs into the loop.
set -eu
cd "$(dirname "$0")/.."
from=../tactics-rpg/Assets/Audio/Music
to=src/lib/assets/audio/music
for clip in "Strategy RPG Battle_Intro" "Strategy RPG Battle_Loop"; do
	ffmpeg -v error -y -i "$from/$clip.wav" -map_metadata -1 -map_chapters -1 -fflags +bitexact -c:a aac -b:a 128k \
		"$to/$clip.m4a"
done
