#!/usr/bin/env python3
"""Create the listening audio: public/audio/listening/<id>.mp3 for every question in
src/data/listening.json.

A true/false question ("truefalse" part) is the passage (voice of the question), 1.5 s of silence,
then the ★ statement (the other voice), like the real exam. A "choice" question is the two lines of
the dialogue (two lines, or more in Part 3; or one passage; each in its own voice) 1 s apart, 2 s of silence, then the spoken question. Uses the online
neural voices of `edge-tts` (pip install edge-tts, no account needed). Also makes
public/audio/tips/<l|r>-<part>-<section>-<example>.mp3 for every example on the listening and reading tips
pages (src/data/reading.json too). Files whose text, voices and rate are unchanged are skipped. `--dry-run` only reports what would be created (no network, no writes).

    python3 scripts/tts.py [--force] [--rate=-5%] [--male-voice=zh-CN-YunjianNeural] [--dry-run]
"""
import asyncio
import hashlib
import json
import re
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
READING = ROOT / 'src' / 'data' / 'reading.json'
TIPS_OUT = ROOT / 'public' / 'audio' / 'tips'
TIPS_MANIFEST = TIPS_OUT / 'manifest.json'

# Yunyang (about 133 Hz) stands clearly apart from Xiaoxiao (about 255 Hz); the earlier Yunxi (about 167 Hz)
# was too close to a woman's voice. `--male-voice=zh-CN-YunjianNeural` is deeper still (about 112 Hz).
VOICES = {'f': 'zh-CN-XiaoxiaoNeural', 'm': 'zh-CN-YunyangNeural'}
OTHER = {'f': 'm', 'm': 'f'}

# edge-tts returns MPEG-2 layer III, 24 kHz, 48 kbps, mono: 144-byte frames of 576 samples (24 ms).
# A frame with that header and an all-zero payload decodes as silence.
FRAME = bytes.fromhex('fff364c4') + bytes(140)
SILENCE = FRAME * 63  # 63 * 24 ms = 1.5 s
GAP = FRAME * 42  # 1.0 s between the two lines of a dialogue
BEFORE_QUESTION = FRAME * 84  # 2.0 s before the spoken question


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
    # Everything that shapes the audio goes in, so changing a voice or a pause remakes the file.
    if fmt == 'choice':
        lines = [x for l in q['lines'] for x in (VOICES[l['v']], l['text'])]
        parts = ['choice', *lines, VOICES[q['question']['v']], q['question']['text'], rate, str(len(GAP)), str(len(BEFORE_QUESTION))]
    else:
        parts = ['truefalse', VOICES[q['voice']], VOICES[OTHER[q['voice']]], q['text'], q['statement'], rate, str(len(SILENCE))]
    return hashlib.sha1('|'.join(parts).encode()).hexdigest()


async def build(q, rate, fmt):
    """The mp3 bytes of one question."""
    if fmt == 'choice':
        spoken = [await speak(l['text'], VOICES[l['v']], rate) for l in q['lines']]
        question = await speak(q['question']['text'], VOICES[q['question']['v']], rate)
        return GAP.join(spoken) + BEFORE_QUESTION + question
    passage = await speak(q['text'], VOICES[q['voice']], rate)
    statement = await speak(q['statement'], VOICES[OTHER[q['voice']]], rate)
    return passage + SILENCE + statement


def tip_lines(zh):
    """The spoken lines of a tips example: (voice, text). "A：…" / "B：…" lines are a dialogue (two voices);
    option letters, ★, blanks, slashes and wide spaces are not read (they become short pauses)."""
    out = []
    for i, line in enumerate(l for l in zh.split('\n') if l.strip()):
        talk = re.match(r'^\s*([AB])：', line)
        line = re.sub(r'^\s*[A-F](：|\s)\s*', '', line)
        line = re.sub(r'_{2,}|\s/\s|　|——|……', '，', line.replace('★', ''))
        line = re.sub(r'([，。？！])，+', r'\1', re.sub(r'\s+', '', line)).strip('，')
        out.append(('f' if not talk or talk.group(1) == 'A' else 'm', line))
    return out


def tips(rate):
    """(file id, spoken lines) of every tips example."""
    for prefix, path in (('l', DATA), ('r', READING)):
        for part in json.loads(path.read_text())['parts']:
            for i, sec in enumerate(part['tips']['sections']):
                for k, ex in enumerate(sec['examples']):
                    yield f"{prefix}-{part['id']}-{i}-{k}", tip_lines(ex[0])


async def build_tips(rate, force, dry):
    TIPS_OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(TIPS_MANIFEST.read_text()) if TIPS_MANIFEST.exists() else {}
    created = skipped = 0
    for tid, lines in tips(rate):
        file = TIPS_OUT / f'{tid}.mp3'
        h = hashlib.sha1('|'.join(['tip', *(x for v, t in lines for x in (VOICES[v], t)), rate, str(len(GAP))]).encode()).hexdigest()
        if not force and file.exists() and manifest.get(tid) == h:
            skipped += 1
            continue
        created += 1
        if dry:
            print(f'{tid}: ' + ' | '.join(t for _, t in lines))
            continue
        data = GAP.join([await speak(t, VOICES[v], rate) for v, t in lines])
        file.write_bytes(data)
        manifest[tid] = h
        print(f'{tid}: {len(data)} bytes')
    if not dry:
        TIPS_MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n')
    print(f"Tips: {'would create' if dry else 'created'} {created}, skipped {skipped}")


async def main():
    args = sys.argv[1:]
    force = '--force' in args
    dry = '--dry-run' in args
    male = next((a.split('=', 1)[1] for a in args if a.startswith('--male-voice=')), None)
    if male:
        VOICES['m'] = male
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
    else:
        MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n')
        print(f'Created {created}, skipped {skipped}')
    await build_tips(rate, force, dry)


asyncio.run(main())
