#!/usr/bin/env python3
"""Build the exam data of the official Hanban HSK 4 papers (H41002 ...) from their PDFs.

The PDFs have a text layer (paper, answer key and listening script all in one file), so nothing is read
from images except the five pictures of writing part 2. Needs poppler (`pdftotext`, `pdfimages`).

Usage: python3 -I scripts/import_hanban.py <pdf-dir> [code ...]
Writes src/data/exams/hsk4-hanban-<code>.json ({test, source, code, title, reading, listening, writing})
and public/img/exam/tNN/q96-q100.jpg. Test numbers: see SETS (11 and up; 1-10 are the book's tests).
The `vi` (Vietnamese) and `explain` fields are not in the PDFs: they are added afterwards, by a separate step.
"""
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src/data/exams')
IMG = os.path.join(ROOT, 'public/img/exam')

# test number -> (code shown to the learner, pdf file stem)
SETS = {
    11: ('H41002', 'H41002'), 12: ('H41003', 'H41003'), 13: ('H41004', 'H41004-merged'), 14: ('H41005', 'H41005-merged'),
    15: ('H41006', 'H41006-merged'), 16: ('H41007', 'H41007-merged'), 17: ('H41008', 'H41008-merged'), 18: ('H41009', 'H41009-merged'),
    19: ('H41110', 'H41110-merged'), 20: ('H41111', 'H41111-merged'), 21: ('H41218', 'H41218-merged'),
}
# The official key sometimes disagrees with the printed words (H41111 Q87 says 许多人, the paper prints 很多人的):
# the accepted sentences are then rewritten to use the printed words.
FIX_SENTENCES = {('H41111', 87): ['那篇文章引起了很多人的注意。']}
MARK = re.compile(r't i e n g t r u n g t h u o n g h a i \. v n')
FOOT = re.compile(r'H4\d{4}\s*-\s*\d+|-\s*\d+\s*-\s*$')
BLANK = re.compile(r'（\s*）')
NUM = re.compile(r'^(\d{1,3})．\s*(.*)$')


def pdf_lines(path):
    txt = subprocess.run(['pdftotext', '-raw', path, '-'], capture_output=True, text=True, check=True).stdout
    out = []
    for ln in txt.split('\n'):
        ln = MARK.sub('', ln)
        ln = FOOT.sub('', ln.strip()).strip()
        if ln:
            out.append(ln)
    return out


def split_sections(lines):
    """paper / answer key / listening script, cut at the 卷答案 and 卷听力材料 headings (either may come first)."""
    a = next(i for i, l in enumerate(lines) if '卷答案' in l)
    s = next(i for i, l in enumerate(lines) if '卷听力材料' in l)
    if a < s:
        return lines[:a], lines[a + 1:s], lines[s + 1:]
    return lines[:s], lines[a + 1:], lines[s + 1:a]


def join(parts):
    return ''.join(parts)


def split_options(text):
    """'A 可怜 B 负责 C 个子矮 D 长得年轻' -> four strings (an option may contain spaces: 'B 40 分钟')."""
    pos = []
    start = 0
    for L in 'ABCD':
        m = re.compile(r'(^|\s)' + L + r'\s').search(text, start)
        if not m:
            return None
        pos.append(m.start() + (1 if m.group(1) else 0))
        start = m.end()
    pos.append(len(text))
    return [text[pos[i] + 1:pos[i + 1]].strip().rstrip('√').strip() for i in range(4)]


def answers_of(key_lines):
    """The key as {no: 'B' | '×' | 'BAC'}, plus the writing sentences, from the answer-key lines."""
    letters, sentences = {}, {}
    mode = 'listen'
    for ln in key_lines:
        if ln.startswith('三、书') or ln.startswith('三、书'):
            mode = 'write'
            continue
        if mode == 'listen':
            for m in re.finditer(r'(\d{1,3})．\s*([A-F√×]+)', ln):
                letters[int(m.group(1))] = m.group(2)
            if '三、书' in ln:
                mode = 'write'
        else:
            m = NUM.match(ln)
            if m:
                sentences[int(m.group(1))] = m.group(2)
            elif sentences and not ln.startswith(('第', '（')) and ln not in ('一、听 力', '二、阅 读'):
                sentences[max(sentences)] += ln
    # a heading glued to the last line ('...很失望。H41004 卷听力材料...') is not part of the answer
    sentences = {k: re.split(r'H4\d{4}', v)[0].strip() for k, v in sentences.items()}
    return letters, sentences


def idx(letter):
    return 'ABCDEF'.index(letter)


# ---------------------------------------------------------------- listening
def numbered_blocks(lines):
    """[(no, [first-line-rest, following lines...])] for lines starting with 'N．'; other lines extend the current block."""
    blocks = []
    for ln in lines:
        m = NUM.match(ln)
        if m:
            blocks.append((int(m.group(1)), [m.group(2)]))
        elif blocks:
            blocks[-1][1].append(ln)
    return blocks


def listening(paper, script, keys):
    # options and statements from the paper
    i2 = next(i for i, l in enumerate(paper) if l.startswith('第 11-25'))
    i3 = next(i for i, l in enumerate(paper) if l.startswith('第 26-45'))
    iend = next(i for i, l in enumerate(paper) if l.startswith('二、阅'))
    stmts = {}
    for no, ls in numbered_blocks(paper[:i2]):
        m = re.match(r'★\s*(.+?)\s*（', ' '.join(ls))
        if 1 <= no <= 10 and m:
            stmts[no] = m.group(1)
    opts = {}
    # part 2 ends where the part-3 heading ('第 三 部 分') starts: it must not leak into Q25's last option
    cut2 = next((n for n in range(i2, i3) if paper[n].startswith(('第 三', '第三'))), i3)
    for no, ls in numbered_blocks(paper[i2:cut2]) + numbered_blocks(paper[i3:iend]):
        if no < 11:
            continue
        o = split_options(' '.join(ls))
        if o:
            opts[no] = o

    # script: cut into numbered blocks, stop each block at the next heading
    stop = ('第一部分', '第二部分', '第三部分', '一共', '例如', '现在开始', '听力考试', '第 ')
    body = []
    for ln in script:
        if ln.startswith(stop) and not re.match(r'^第 \d+ 到 \d+ 题是根据', ln):
            body.append('\x00' + ln)
        else:
            body.append(ln)
    # passages of 36-45 start with '第 N 到 M 题是根据下面一段话：'
    p1, p2, p3 = {}, {}, {}
    cur = None
    group_text = {}
    group_of = {}
    passage_lines = None
    passage_range = None
    for ln in body:
        if ln.startswith('\x00'):
            cur = None
            passage_lines = None if not ln[1:].startswith('第 ') else passage_lines
            continue
        m = re.match(r'^第 (\d+) 到 (\d+) 题是根据', ln)
        if m:
            passage_range = (int(m.group(1)), int(m.group(2)))
            passage_lines = []
            cur = None
            continue
        mq = NUM.match(ln)
        if mq:
            no = int(mq.group(1))
            if passage_lines is not None and passage_range and passage_range[0] <= no <= passage_range[1]:
                if no == passage_range[0]:
                    group_text[passage_range] = join(passage_lines)
                group_of[no] = passage_range
                p3[no] = [mq.group(2)]
                cur = p3[no]
                continue
            tgt = p1 if no <= 10 else p2 if no <= 25 else p3
            tgt[no] = [mq.group(2)]
            cur = tgt[no]
            continue
        if passage_lines is not None and cur is None:
            passage_lines.append(ln)
        elif cur is not None:
            cur.append(ln)

    def who_of(tag):
        return {'男': 'M', '女': 'F', '问': 'Q'}[tag]

    def dialog(ls):
        """lines '男：...' '女：...' '问：...' (a line without a speaker continues the previous one) -> [{who,text}]"""
        out = []
        for ln in ls:
            m = re.match(r'^([男女问])：(.*)$', ln)
            if m:
                out.append({'who': who_of(m.group(1)), 'text': m.group(2)})
            elif out:
                out[-1]['text'] += ln
        return out

    part1, part2, part3 = [], [], []
    for no in range(1, 11):
        ls = p1[no]
        star = next(i for i, l in enumerate(ls) if l.startswith('★'))
        part1.append({'no': no, 'statement': stmts[no], 'answer': keys[no] == '√', 'script': [{'who': 'N', 'text': join(ls[:star])}]})
    for no in range(11, 26):
        part2.append({'no': no, 'options': opts[no], 'answer': idx(keys[no]), 'script': dialog(p2[no])})
    for no in range(26, 46):
        if no <= 35:
            d = dialog(p3[no])
            qs = [x for x in d if x['who'] == 'Q']
            q = {'no': no, 'group': [no], 'options': opts[no], 'answer': idx(keys[no]), 'question': qs[0]['text'], 'script': [x for x in d if x['who'] != 'Q']}
        else:
            rng = group_of[no]
            q = {'no': no, 'group': list(rng), 'options': opts[no], 'answer': idx(keys[no]), 'question': join(p3[no]), 'script': [{'who': 'N', 'text': group_text[rng]}]}
        part3.append(q)
    return {'part1': {'questions': part1}, 'part2': {'questions': part2}, 'part3': {'questions': part3}}


# ---------------------------------------------------------------- reading
def reading(paper, keys):
    i = next(i for i, l in enumerate(paper) if l.startswith('二、阅'))
    j = next(i for i, l in enumerate(paper) if l.startswith('三、书'))
    r = paper[i + 1:j]
    k46 = next(n for n, l in enumerate(r) if l.startswith('第 46-50'))
    k51 = next(n for n, l in enumerate(r) if l.startswith('第 51-55'))
    k56 = next(n for n, l in enumerate(r) if l.startswith('第 56-65'))
    k66 = next(n for n, l in enumerate(r) if l.startswith('第 66-85'))

    def blank_set(lines, lo, hi):
        wl = next(l for l in lines if re.match(r'^A\s.+\sB\s.+\sF\s', l))
        words = split_words6(wl)
        ex = next(n for n, l in enumerate(lines) if l.startswith('例如：'))
        first = next(n for n, l in enumerate(lines) if NUM.match(l))
        exlines = lines[ex:first]
        extext = '\n'.join(exlines)[3:]
        m = re.search(r'（\s*([A-F])\s*）', extext)
        example = {'text': re.sub(r'（\s*[A-F]\s*）', '___', extext), 'answer': idx(m.group(1))}
        items = []
        for no, ls in numbered_blocks(lines[first:]):
            if not lo <= no <= hi:
                continue
            text = '\n'.join(ls)
            text = BLANK.sub('___', text)
            items.append({'no': no, 'text': text, 'answer': idx(keys[no])})
        return {'range': [lo, hi], 'words': words, 'example': example, 'items': items}

    sets = [blank_set(r[k46 + 1:k51], 46, 50), blank_set(r[k51 + 1:k56], 51, 55)]
    # part 2
    q2 = []
    for no, ls in numbered_blocks(r[k56 + 1:k66]):
        if no < 56:
            continue
        sent = []
        for l in ls:
            m = re.match(r'^([ABC])\s(.*)$', l)
            if m and len(sent) < 3 and 'ABC'[len(sent)] == m.group(1):
                sent.append(m.group(2))
            elif sent:
                sent[-1] += l
        q2.append({'no': no, 'sentences': sent, 'answer': keys[no]})
    # part 3: passages ('66．' single, '80-81．' pair)
    body = r[k66 + 1:]
    passages = []
    cur = None
    for ln in body:
        m = re.match(r'^(\d{2})(?:-(\d{2}))?．\s*(.*)$', ln)
        if m and not (cur and cur['stage'] == 'q' and False):
            lo = int(m.group(1))
            hi = int(m.group(2) or m.group(1))
            if lo >= 66 and (cur is None or lo == cur['range'][1] + 1):
                cur = {'range': [lo, hi], 'lines': [m.group(3)] if m.group(3) else [], 'qs': [], 'stage': 'text'}
                passages.append(cur)
                continue
        if cur is None:
            continue
        if ln.startswith('★'):
            cur['qs'].append({'q': [ln[1:].strip()], 'o': []})
            cur['stage'] = 'q'
        elif cur['stage'] == 'text':
            cur['lines'].append(ln)
        else:
            q = cur['qs'][-1]
            if re.match(r'^A\s', ln) or q['o']:
                q['o'].append(ln)
            else:
                q['q'].append(ln)
    out = []
    for p in passages:
        qs = []
        no = p['range'][0]
        for q in p['qs']:
            o = split_options(' '.join(q['o']))
            qs.append({'no': no, 'text': join(q['q']), 'options': o, 'answer': idx(keys[no])})
            no += 1
        out.append({'range': p['range'], 'text': join(p['lines']), 'questions': qs})
    return {'part1': {'sets': sets}, 'part2': {'questions': q2}, 'part3': {'passages': out}}


def split_words6(line):
    pos = []
    start = 0
    for L in 'ABCDEF':
        m = re.compile(r'(^|\s)' + L + r'\s').search(line, start)
        pos.append(m.start() + (1 if m.group(1) else 0))
        start = m.end()
    pos.append(len(line))
    return [line[pos[i] + 1:pos[i + 1]].strip() for i in range(6)]


# ---------------------------------------------------------------- writing
def merge_digits(words):
    """pdftotext puts a space between '1000' and '米': a number never stands alone as a word group."""
    out = []
    for w in words:
        if out and re.fullmatch(r'[\d.]+', out[-1]):
            out[-1] += w
        else:
            out.append(w)
    return out


def writing(paper, sentences, pdf, test, code):
    j = next(i for i, l in enumerate(paper) if l.startswith('三、书'))
    w = paper[j + 1:]
    k96 = next(n for n, l in enumerate(w) if l.startswith('第 96-100'))
    part1 = []
    w1 = w[:k96]
    cut = next((n for n, l in enumerate(w1) if l.startswith('第 二')), len(w1))
    for no, ls in numbered_blocks(w1[:cut]):
        if not 86 <= no <= 95:
            continue
        words = merge_digits(' '.join(ls).split())
        answers = [a.strip() for a in sentences[no].split('/') if a.strip()]
        answers = FIX_SENTENCES.get((code, no), answers)
        part1.append({'no': no, 'words': words, 'answers': answers})
    # part 2: '96． 仔细 97． 护士' ... the words, in reading order
    txt = ' '.join(w[k96 + 1:])
    txt = txt[txt.find('96．'):]
    ws = {int(m.group(1)): m.group(2) for m in re.finditer(r'(\d{2,3})．\s*(\S+)', txt)}
    part2 = []
    for no in range(96, 101):
        part2.append({'no': no, 'word': ws[no], 'image': '/img/exam/t%02d/q%d.jpg' % (test, no), 'answer': sentences[no]})
    return {'part1': {'questions': part1}, 'part2': {'questions': part2}}


def picture_page(pdf):
    """1-based page of the paper with the five pictures: the one with five jpegs after the '第 96-100' heading."""
    n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    for p in range(1, n + 1):
        t = subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), '-raw', pdf, '-'], capture_output=True, text=True).stdout
        if '第 96-100' in t:
            return p
    raise SystemExit('no picture page')


def extract_images(pdf, test):
    p = picture_page(pdf)
    d = os.path.join(IMG, 't%02d' % test)
    os.makedirs(d, exist_ok=True)
    tmp = os.path.join(d, 'tmp')
    subprocess.run(['pdfimages', '-j', '-f', str(p), '-l', str(p), pdf, tmp], check=True)
    # the five picture jpegs (the watermark logo is the 424x105 one)
    info = subprocess.run(['pdfimages', '-list', '-f', str(p), '-l', str(p), pdf], capture_output=True, text=True).stdout.split('\n')[2:]
    jpgs = []
    for ln in info:
        c = ln.split()
        if len(c) > 9 and c[2] == 'image' and (c[3], c[4]) != ('424', '105'):
            jpgs.append(int(c[1]))
    jpgs = jpgs[-5:]  # the first picture is the example (乒乓球)
    files = sorted(glob.glob(tmp + '-*.jpg'))
    by_num = {int(re.search(r'-(\d+)\.jpg$', f).group(1)): f for f in files}
    if len(jpgs) < 5:
        raise SystemExit('test %d: expected 5 pictures, found %d' % (test, len(jpgs)))
    for k, n in enumerate(jpgs):
        os.replace(by_num[n], os.path.join(d, 'q%d.jpg' % (96 + k)))
    for f in glob.glob(tmp + '-*'):
        os.remove(f)


def main(src, only):
    for test, (code, stem) in SETS.items():
        if only and code not in only:
            continue
        pdf = os.path.join(src, stem + '.pdf')
        paper, key, script = split_sections(pdf_lines(pdf))
        keys, sentences = answers_of(key)
        data = {
            'test': test, 'source': 'hanban', 'code': code, 'title': 'Đề Hanban %s' % code,
            'reading': reading(paper, keys),
            'listening': listening(paper, script, keys),
            'writing': writing(paper, sentences, pdf, test, code),
        }
        extract_images(pdf, test)
        with open(os.path.join(OUT, 'hsk4-hanban-%s.json' % code), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        print('test', test, code, 'ok')


main(sys.argv[1], set(sys.argv[2:]))
