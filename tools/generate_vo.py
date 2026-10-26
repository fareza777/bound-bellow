"""Generate the BOUND BELOW narration with Deepgram Flux TTS (Aura fallback).

The API key is intentionally not stored in this repository.
Usage:
  DEEPGRAM_API_KEY=... python tools/generate_vo.py
Optional:
  DEEPGRAM_VOICE_MODEL=flux-colin-en ...  (defaults to flux-colin-en)
  DEEPGRAM_EXPRESSIVITY=-1 ...            (Flux only, defaults to 0)
"""

import json
import os
import pathlib
import urllib.request
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "src" / "game" / "vo-script.json"
OUT = ROOT / "public" / "audio" / "vo"
MODEL = os.environ.get("DEEPGRAM_VOICE_MODEL", "flux-colin-en")
EXPRESSIVITY = os.environ.get("DEEPGRAM_EXPRESSIVITY", "0")


def main() -> int:
    key = os.environ.get("DEEPGRAM_API_KEY", "").strip()
    if not key:
        print("DEEPGRAM_API_KEY is not set", file=sys.stderr)
        return 1
    data = json.loads(SCRIPT.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    for line in data["lines"]:
        target = OUT / line["file"]
        if target.exists() and target.stat().st_size > 1000:
            print("skip", line["file"], target.stat().st_size)
            continue
        payload = json.dumps({"text": line["text"]}).encode("utf-8")
        if MODEL.startswith("flux-"):
            url = f"https://api.deepgram.com/v2/speak?model={MODEL}&encoding=mp3&expressivity={EXPRESSIVITY}"
        else:
            url = f"https://api.deepgram.com/v1/speak?model={MODEL}&encoding=mp3"
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Token {key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as response:
            audio = response.read()
        if len(audio) < 1000:
            print("short response for", line["file"], len(audio), file=sys.stderr)
            return 2
        target.write_bytes(audio)
        print("wrote", line["file"], len(audio))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
