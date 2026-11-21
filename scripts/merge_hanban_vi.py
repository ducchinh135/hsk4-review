#!/usr/bin/env python3
"""Merge the Vietnamese translations and explanations of a Hanban paper into its data file.

A patch file (one per paper) is {"L": {no: {vi, explain}}, "R": {no: {vi?, explain}}, "RP": {first-no: passage vi},
"W": {no: {vi, explain}}, "flags": [...]}. It is written by a translator (not by the PDF importer) and merged
here; the merge only adds `vi` and `explain` and refuses a patch that does not cover every question.

Usage: python3 -I scripts/merge_hanban_vi.py <patch-dir> [code ...]
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'src/data/exams')


def merge(code, patch):
    path = os.path.join(DATA, 'hsk4-hanban-%s.json' % code)
    d = json.load(open(path, encoding='utf-8'))
    L, R, RP, W = patch['L'], patch['R'], patch['RP'], patch['W']
    problems = []

    def need(table, no, fields):
        e = table.get(str(no))
        if not isinstance(e, dict):
            problems.append('missing %s' % no)
            return None
        for f in fields:
            if not isinstance(e.get(f), str) or not e[f].strip():
                problems.append('%s: empty %s' % (no, f))
        return e

    for part in ('part1', 'part2', 'part3'):
        for q in d['listening'][part]['questions']:
            e = need(L, q['no'], ('vi', 'explain'))
            if e:
                q['vi'], q['explain'] = e['vi'].strip(), e['explain'].strip()
    r = d['reading']
    for s in r['part1']['sets']:
        for it in s['items']:
            e = need(R, it['no'], ('vi', 'explain'))
            if e:
                it['vi'], it['explain'] = e['vi'].strip(), e['explain'].strip()
    for q in r['part2']['questions']:
        e = need(R, q['no'], ('vi', 'explain'))
        if e:
            q['vi'], q['explain'] = e['vi'].strip(), e['explain'].strip()
    for p in r['part3']['passages']:
        v = RP.get(str(p['range'][0]))
        if not isinstance(v, str) or not v.strip():
            problems.append('missing passage %s' % p['range'][0])
        else:
            p['vi'] = v.strip()
        for q in p['questions']:
            e = need(R, q['no'], ('explain',))
            if e:
                q['explain'] = e['explain'].strip()
    for part in ('part1', 'part2'):
        for q in d['writing'][part]['questions']:
            e = need(W, q['no'], ('vi', 'explain'))
            if e:
                q['vi'], q['explain'] = e['vi'].strip(), e['explain'].strip()
    if problems:
        print(code, 'NOT merged:', problems[:12], '(%d problems)' % len(problems))
        return False
    json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(code, 'merged; flags:', patch.get('flags'))
    return True


def main(patch_dir, only):
    for f in sorted(glob.glob(os.path.join(patch_dir, 'H4*.json'))):
        code = os.path.basename(f)[:-5]
        if only and code not in only:
            continue
        merge(code, json.load(open(f, encoding='utf-8')))


main(sys.argv[1], set(sys.argv[2:]))
