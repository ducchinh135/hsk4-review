#!/usr/bin/env python3
"""Create the listening audio: public/audio/listening/<id>.mp3 for every question in
src/data/listening.json.

A true/false question ("truefalse" part) is the passage (voice of the question), 1.5 s of silence,
then the ★ statement (the other voice), like the real exam. A "choice" question is the two lines of
the dialogue (their own voices) 0.5 s apart, 1 s of silence, then the spoken question. Uses the online
neural voices of `edge-tts` (pip install edge-tts, no account needed). Files whose text, voices and
rate are unchanged are skipped. `--dry-run` only reports what would be created (no network, no writes).

    python3 scripts/tts.py [--force] [--rate=-5%] [--dry-run]
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
GAP = FRAME * 21  # 0.5 s between the two lines of a dialogue
BEFORE_QUESTION = FRAME * 42  # 1.0 s before the spoken question


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


def digest(q, rate, fmt='truefalse'):
    if fmt == 'choice':
        a, b = q['lines']
        parts = ['choice', a['v'], a['text'], b['v'], b['text'], q['question']['v'], q['question']['text'], rate]
    else:  # unchanged, so the audio made for true/false questions is never redone
        parts = [q['voice'], q['text'], q['statement'], rate]
    return hashlib.sha1('|'.join(parts).encode()).hexdigest()


async def build(q, rate, fmt):
    """The mp3 bytes of one question."""
    if fmt == 'choice':
        a, b = q['lines']
        first = await speak(a['text'], VOICES[a['v']], rate)
        second = await speak(b['text'], VOICES[b['v']], rate)
        question = await speak(q['question']['text'], VOICES[q['question']['v']], rate)
        return first + GAP + second + BEFORE_QUESTION + question
    passage = await speak(q['text'], VOICES[q['voice']], rate)
    statement = await speak(q['statement'], VOICES[OTHER[q['voice']]], rate)
    return passage + SILENCE + statement


async def main():
    args = sys.argv[1:]
    force = '--force' in args
    dry = '--dry-run' in args
    rate = next((a.split('=', 1)[1] for a in args if a.startswith('--rate=')), '-5%')
    questions = [(part.get('format', 'truefalse'), q) for part in json.loads(DATA.read_text())['parts'] for q in part['questions']]
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    created = skipped = 0
    todo = []
    for fmt, q in questions:
        file = OUT / f"{q['id']}.mp3"
        h = digest(q, rate, fmt)
        if not force and file.exists() and manifest.get(q['id']) == h:
            skipped += 1
            continue
        created += 1
        if dry:
            todo.append(q['id'])
            continue
        data = await build(q, rate, fmt)
        file.write_bytes(data)
        manifest[q['id']] = h
        print(f"{q['id']}: {len(data)} bytes")
    if dry:
        print(f'Would create {created}, skip {skipped}' + (': ' + ' '.join(todo) if todo else ''))
        return
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n')
    print(f'Created {created}, skipped {skipped}')


asyncio.run(main())
