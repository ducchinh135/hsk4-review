#!/usr/bin/env python3
"""Check the structure of src/data/exams/hsk4-NN.json (reading section).

Usage: python3 -I scripts/validate_exams.py [file ...]   (default: every file in src/data/exams)
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def check(path):
    errs = []
    d = json.load(open(path, encoding='utf-8'))
    r = d['reading']
    seen = []

    sets = r['part1']['sets']
    if [s['range'] for s in sets] != [[46, 50], [51, 55]]:
        errs.append('part1 ranges %s' % [s['range'] for s in sets])
    for s in sets:
        if len(s['words']) != 6:
            errs.append('part1 %s: %d words' % (s['range'], len(s['words'])))
        if not 0 <= s['example']['answer'] < 6 or '___' not in s['example']['text']:
            errs.append('part1 %s: bad example' % s['range'])
        if len(s['items']) != 5:
            errs.append('part1 %s: %d items' % (s['range'], len(s['items'])))
        used = {s['example']['answer']}
        for it in s['items']:
            seen.append(it['no'])
            if not 0 <= it['answer'] < 6:
                errs.append('Q%d answer out of range' % it['no'])
            if it['answer'] in used:
                errs.append('Q%d word used twice' % it['no'])
            used.add(it['answer'])
            if '___' not in it['text']:
                errs.append('Q%d has no blank' % it['no'])
            for k in ('vi', 'explain'):
                if not it.get(k):
                    errs.append('Q%d missing %s' % (it['no'], k))

    for q in r['part2']['questions']:
        seen.append(q['no'])
        if len(q['sentences']) != 3 or sorted(q['answer']) != ['A', 'B', 'C']:
            errs.append('Q%d bad sentences/answer %r' % (q['no'], q['answer']))
        for k in ('vi', 'explain'):
            if not q.get(k):
                errs.append('Q%d missing %s' % (q['no'], k))

    for p in r['part3']['passages']:
        nos = [q['no'] for q in p['questions']]
        if nos != list(range(p['range'][0], p['range'][1] + 1)):
            errs.append('passage %s questions %s' % (p['range'], nos))
        if not p.get('text') or not p.get('vi'):
            errs.append('passage %s missing text/vi' % p['range'])
        for q in p['questions']:
            seen.append(q['no'])
            if len(q['options']) != 4 or not 0 <= q['answer'] < 4:
                errs.append('Q%d bad options/answer' % q['no'])
            if not q.get('explain'):
                errs.append('Q%d missing explain' % q['no'])

    if sorted(seen) != list(range(46, 86)):
        errs.append('question numbers: %s' % sorted(set(range(46, 86)) ^ set(seen)))
    return errs


files = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, 'src/data/exams/hsk4-*.json')))
bad = 0
for f in files:
    try:
        e = check(f)
    except Exception as ex:  # noqa: BLE001
        e = ['crash: %r' % ex]
    print(os.path.basename(f), 'OK' if not e else 'FAIL')
    for m in e:
        print('   ', m)
    bad += bool(e)
sys.exit(1 if bad else 0)
