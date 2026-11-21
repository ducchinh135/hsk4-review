#!/usr/bin/env python3
"""Cut the listening audio of the 10 mock HSK4 tests into one mp3 per question.

Each source mp3 (source/audio/*模拟试卷N.mp3, not in git) is one whole test. Between questions it has
a silent answering time (about 10 s in part 1, 17 s in parts 2-3), so the 49 silences of >= 6 s are:
0 opening + directions, 1 part 1 example, 2-11 Q1-10, 12 part 2 directions + example, 13-27 Q11-25,
28 part 3 directions + example, 29-48 Q26-45. A question's clip is the speech before its silence. For the
two-question passages (Q36-45) the first clip is the passage + first question and the second is just the
second question.

Writes public/audio/exam/tNN/qQQ.mp3 (mono, 48 kbps) and src/data/exams/audio-manifest.json
({test: {no: {file, dur, gap}}}; gap = answering seconds that follow the clip in the real exam).

The official Hanban papers (source/hanban/audio/HSK4 - H41002.mp3 ...) have the same structure plus one
long silence at the very end (the time to fill in the answer sheet), so 49 or 50 silences are accepted.

Usage: FFMPEG=/path/to/ffmpeg python3 -I scripts/cut_listening.py [test ...]
"""
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = os.environ.get('FFMPEG', 'ffmpeg')
SRC = os.path.join(ROOT, 'source/audio')
HANBAN_SRC = os.path.join(ROOT, 'source/hanban/audio')
# test number -> code of the Hanban audio file (HSK4 - <code>.mp3)
HANBAN = {11: 'H41002', 12: 'H41003', 13: 'H41004', 14: 'H41005', 15: 'H41006', 16: 'H41007', 17: 'H41008', 18: 'H41009', 19: 'H41010', 20: 'H41111', 21: 'H41218'}
OUT = os.path.join(ROOT, 'public/audio/exam')
MANIFEST = os.path.join(ROOT, 'src/data/exams/audio-manifest.json')
PAD_BEFORE, PAD_AFTER = 0.15, 0.45


def gaps_of(path):
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', path, '-af', 'silencedetect=noise=-35dB:d=6', '-f', 'null', '-'], capture_output=True, text=True).stderr
    ends = re.findall(r'silence_end: ([\d.]+) \| silence_duration: ([\d.]+)', r)
    return [(float(e) - float(d), float(e)) for e, d in ends]  # (start, end) of each silence


def question_index(no):
    """Index of the silence that follows question `no`."""
    if no <= 10:
        return no + 1
    if no <= 25:
        return no + 2
    return no + 3


def main(tests):
    manifest = json.load(open(MANIFEST, encoding='utf-8')) if os.path.exists(MANIFEST) else {}
    files = [(int(re.search(r'(\d\d)\+模拟', f).group(1)), f) for f in sorted(glob.glob(os.path.join(SRC, '*.mp3')))]
    files += [(t, os.path.join(HANBAN_SRC, 'HSK4 - %s.mp3' % c)) for t, c in HANBAN.items() if os.path.exists(os.path.join(HANBAN_SRC, 'HSK4 - %s.mp3' % c))]
    for t, f in files:
        if tests and t not in tests:
            continue
        gaps = gaps_of(f)
        if len(gaps) not in (49, 50):
            sys.exit('test %d: expected 49 or 50 silences, found %d' % (t, len(gaps)))
        gaps = gaps[:49]
        os.makedirs(os.path.join(OUT, 't%02d' % t), exist_ok=True)
        entry = {}
        for no in range(1, 46):
            i = question_index(no)
            start = max(0.0, gaps[i - 1][1] - PAD_BEFORE)
            end = gaps[i][0] + PAD_AFTER
            name = 't%02d/q%02d.mp3' % (t, no)
            subprocess.run([FF, '-y', '-loglevel', 'error', '-ss', '%.3f' % start, '-t', '%.3f' % (end - start), '-i', f, '-ac', '1', '-b:a', '48k', os.path.join(OUT, name)], check=True)
            entry[str(no)] = {'file': name, 'dur': round(end - start, 1), 'gap': round(gaps[i][1] - gaps[i][0])}
        manifest[str(t)] = entry
        print('test', t, 'done')
    json.dump(manifest, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


main({int(a) for a in sys.argv[1:]})
