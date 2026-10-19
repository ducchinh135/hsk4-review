#!/usr/bin/env python3
"""Create the listening audio: public/audio/listening/<id>.mp3 for every question in
src/data/listening.json.

Each file is the passage (voice of the question), 1.5 s of silence, then the ★ statement (the other
voice), like the real exam. Uses the online neural voices of `edge-tts` (pip install edge-tts, no
account needed). Files whose text, voices and rate are unchanged are skipped.

    python3 scripts/tts.py [--force] [--rate=-5%]
"""
import asyncio
import hashlib
import json
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    sys.exit('Cần cài edge-tts trước: python3 -m venv .venv && .venv/bin/pip install edge-tts, rồi chạy .venv/bin/python scripts/tts.py')

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'src' / 'data' / 'listening.json'
OUT = ROOT / 'public' / 'audio' / 'listening'
MANIFEST = OUT / 'manifest.json'

VOICES = {'f': 'zh-CN-XiaoxiaoNeural', 'm': 'zh-CN-YunxiNeural'}
OTHER = {'f': 'm', 'm': 'f'}

# edge-tts returns MPEG-2 layer III, 24 kHz, 48 kbps, mono: 144-byte frames of 576 samples (24 ms).
# A frame with that header and an all-zero payload decodes as silence.
FRAME = bytes.fromhex('fff364c4') + bytes(140)
SILENCE = FRAME * 63  # 63 * 24 ms = 1.5 s


async def speak(text, voice, rate):
    for attempt in range(3):
        try:
            data = b''
            async for chunk in edge_tts.Communicate(text, voice, rate=rate).stream():
                if chunk['type'] == 'audio':
                    data += chunk['data']
            if data:
                return data
        except Exception as e:  # network hiccup: retry
            print(f'  retry {attempt + 1}: {e}')
        await asyncio.sleep(2)
    sys.exit(f'Không tạo được audio cho: {text[:20]}…')


def digest(q, rate):
    return hashlib.sha1('|'.join([q['voice'], q['text'], q['statement'], rate]).encode()).hexdigest()


async def main():
    args = sys.argv[1:]
    force = '--force' in args
    rate = next((a.split('=', 1)[1] for a in args if a.startswith('--rate=')), '-5%')
    questions = [q for part in json.loads(DATA.read_text())['parts'] for q in part['questions']]
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    created = skipped = 0
    for q in questions:
        file = OUT / f"{q['id']}.mp3"
        h = digest(q, rate)
        if not force and file.exists() and manifest.get(q['id']) == h:
            skipped += 1
            continue
        passage = await speak(q['text'], VOICES[q['voice']], rate)
        statement = await speak(q['statement'], VOICES[OTHER[q['voice']]], rate)
        file.write_bytes(passage + SILENCE + statement)
        manifest[q['id']] = h
        created += 1
        print(f"{q['id']}: {len(passage) + len(SILENCE) + len(statement)} bytes")
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n')
    print(f'Created {created}, skipped {skipped}')


asyncio.run(main())
