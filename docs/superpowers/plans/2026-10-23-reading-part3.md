# Đọc hiểu Part 3 阅读理解 — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến tab ③ 阅读理解 thành phần luyện thật: đọc một đoạn (ngắn có 1 câu hỏi, dài có 2), chọn A–D là chấm ngay, câu chứa đáp án trong bài được tô vàng, lời giải, và "Cần ôn" cho từng câu hỏi. Part 1 và Part 2 giữ nguyên.

**Architecture:** Thêm part `p3` (`format: "read"`, mảng `passages`) vào `src/data/reading.json`. `src/reading.js` có thêm phần logic thuần cho format `read` (khoá dấu từng câu hỏi, lượt tổng hợp ngắn + dài, lượt ôn chỉ gồm câu hỏi đang "Cần ôn", phím tắt, validator) và `highlightClues` được viết lại để tô đúng cả khi các đoạn chồng nhau. Trang luyện có thêm một "kit" cho `read`; khác hai format trước, mỗi câu hỏi được chấm ngay khi chọn, và đoạn được coi là xong khi mọi câu hỏi đã trả lời. Màn một đoạn là thành phần mới `ReadPassage`.

**Tech Stack:** React 19 + Vite, `node:test`. Không thêm thư viện.

**Spec:** `docs/superpowers/specs/2026-10-21-reading-design.md`. Đọc mục 1 (bảng "Quyết định do Claude đặt": số lượng, tổng hợp, đơn vị "Cần ôn", giới hạn ôn, pinyin và dịch, phím tắt), 2 (quy tắc soạn đề: chung và Part 3), 3 (dữ liệu Part 3), 4 (dòng đếm của trang chọn bài), 5 (mẹo Part 3), 6.3 (màn Part 3). Bản phác đã duyệt: `.superpowers/brainstorm/50887-1792598204/content/p3-layout.html`. Code mẫu: Part 2 (`OrderSentences`, `KITS` trong `ReadingPracticePage`), và `src/components/ChoiceQuestion.jsx` của phần Nghe.

## Global Constraints

- Chữ hiển thị bằng tiếng Việt. Nhãn cố định: "Đoạn 3 / 17 · Câu hỏi 3 / 20" (tổng hợp và ôn) / "Đoạn 3 / 15" (theo dạng), "Đoạn tiếp ▶", "Pinyin", "Dịch", "✅ Đúng — đáp án: C" / "❌ Sai — đáp án: C", "Sắp có".
- Không đổi backend, `useMarks`/`useAccount`/`useSpeech`, hay hành vi Part 1 và Part 2.
- Id đoạn `/^p3-\d{3}$/`, không đổi sau khi phát hành. Khoá dấu là của **từng câu hỏi**: `r:p3-001.1`, `r:p3-001.2` (số thứ tự câu hỏi trong đoạn, bắt đầu từ 1); đặt `'r'` khi trả lời sai câu đó.
- 5 dạng: `detail` 🔎 Chi tiết, `gist` 📌 Ý chính, mục đích, `infer` 🧠 Suy luận, thái độ, `word` 🔤 Nghĩa của từ / câu trong bài (4 dạng ngắn, đúng 1 câu hỏi), `long` 📄 Đoạn dài (đúng 2 câu hỏi). 15 đoạn mỗi dạng ngắn, 10 đoạn dài: 70 đoạn, 80 câu hỏi.
- Mỗi đoạn có `text`, `pinyin`, `vi`. Mỗi câu hỏi có `text`, `pinyin`, `vi`, đúng 4 `options` (`{text, pinyin, vi}`, `text` đôi một khác nhau), `answer` 0–3, `evidence` (mảng chuỗi không rỗng, mỗi chuỗi là chuỗi con của `text` của đoạn), `explain`.
- Lượt tổng hợp: 14 đoạn ngắn xoay vòng 4 dạng ngắn (dạng và đoạn xáo trộn), rồi 3 đoạn dài; tức 20 câu hỏi, đoạn ngắn trước, đoạn dài sau như đề thật. Lượt ôn: tối đa 20 đoạn (`REVIEW_MAX.p3`), mỗi đoạn chỉ gồm các câu hỏi đang "Cần ôn".
- Pinyin của đoạn: nút "Pinyin" dùng được ngay, **không nhớ**, mỗi đoạn mở ra đều tắt. Dịch đoạn: nút "Dịch" chỉ dùng được khi mọi câu hỏi của đoạn đã trả lời. Pinyin và nghĩa của 4 đáp án hiện ở câu hỏi đã trả lời.
- Phím tắt: `1`–`4` / `A`–`D` trả lời câu hỏi đầu tiên chưa trả lời; `Enter` sang đoạn tiếp khi đã trả lời hết; bỏ qua khi đang gõ trong ô nhập hoặc giữ Ctrl/Meta/Alt; Enter khi focus ở một nút đáp án: sang đoạn tiếp nếu đã xong, nuốt phím (`'none'`) nếu chưa; Enter trên nút/liên kết khác để nút đó xử lý.
- Đề theo spec mục 2 (đoạn ngắn 40–100 chữ, đoạn dài 150–250 chữ, đáp án 2–20 chữ, có ít nhất một đáp án nhiễu dùng lại chữ trong bài, đáp án đúng thường diễn đạt lại; trong mỗi dạng mỗi chữ cái A–D đúng ít nhất 2 lần). Mỗi lô qua một lượt rà soát riêng (agent mới) trước khi commit.
- Commit message tiếng Anh `feat(reading): …`, kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Không deploy trong kế hoạch này.

## Review Focus

1. **Đoạn dài trong lượt ôn chỉ còn câu 2 "Cần ôn":** chỉ câu 2 hiện, vẫn mang khoá `r:p3-xxx.2`, đánh dấu và "✅ Đã nắm" đúng khoá đó (Task 2: test `reviewUnits`; Task 3: Chrome).
2. **Hai `evidence` chồng nhau hoặc trùng chỗ** (hai câu hỏi của đoạn dài, hoặc một clue nằm trong clue khác, hoặc chồng từ bên trái như 可以 + 以后): tô đủ, không lặp và không mất chữ (Task 2: test `highlightClues`).
3. **Trả lời câu 1 bằng chuột, rồi nhấn Enter khi câu 2 chưa trả lời:** không sang đoạn, không chọn lại đáp án (Task 2: test `readKeyAction`; Task 3: Chrome).
4. **Part 1 và Part 2 không đổi** sau khi thêm kit thứ ba và viết lại `highlightClues` (Task 2: test cũ xanh; Task 3: Chrome một bộ Part 1 và một câu Part 2).
5. **Part 3 còn thiếu dạng** (giữa các lô, nhất là chưa có đoạn dài): thẻ mờ "Sắp có", tổng hợp vẫn chạy với những gì có, `/reading/p3` mở hub Part 3 (Task 2: test `buildMix`; Task 1: test router).

---

### Task 1: Dữ liệu Part 3 và validator

**Files:**
- Modify: `src/reading.js`, `src/data/reading.json`, `tests/reading.test.mjs`, `tests/router.test.mjs`

**Interfaces — Produces:**
- `unitsOf(part, typeId?)` trả theo format: `fill` → `sets`, `order` → `questions`, `read` → `passages` (chọn theo `part.format`, không dựa vào việc có trường nào; sửa luôn minor đã ghi ở Part 2).
- `validateReading`: `FORMATS = ['fill', 'order', 'read']`, kiểm đoạn bằng `checkPassage(p, at, errors)` theo Global Constraints (số câu hỏi đúng theo dạng: `long` 2, còn lại 1); "mọi mục của một dạng cùng đáp án" với `read` so dãy `answer` của các câu hỏi. Thêm luôn kiểm tra còn thiếu ở Part 2: hai câu trùng `text` trong một câu `order` là lỗi.

`reading.json`: thêm part thứ ba `{ "id": "p3", "format": "read", "name": "阅读理解", "label": "Đọc hiểu", "desc": "Đọc đoạn văn rồi chọn đáp án đúng.", "tips": { "intro": "", "sections": [] }, "types": [5 dạng ở Global Constraints, mỗi dạng có desc và tip], "passages": [] }`.

- [ ] **Step 1: Viết test thất bại.** Helper `readP(id, type, over)` tạo đoạn hợp lệ (text ≥ 1 câu; một câu hỏi, hoặc hai nếu `type === 'long'`; options đủ trường; `evidence` là chuỗi con của `text`) và `dataWithRead(passages)` (part p3, 5 types).
  - Đoạn ngắn và đoạn dài hợp lệ → `[]`.
  - Mỗi lỗi sau cho thông báo chứa id đoạn: id `p3-1`; type lạ; thiếu `vi` của đoạn; đoạn ngắn có 2 câu hỏi; đoạn dài có 1 câu hỏi; câu hỏi có 3 options; hai options cùng `text`; option thiếu `pinyin`; `answer` 4 hoặc `'1'`; `evidence` rỗng; một `evidence` không có trong `text`; thiếu `explain`; thiếu `text` của câu hỏi.
  - Hai đoạn cùng dạng có cùng dãy đáp án → thông báo chứa tên dạng.
  - Câu `order` có hai câu trùng `text` → thông báo chứa id câu đó.
  - `unitsOf` của part read trả `passages`; một part `order` có thêm trường `sets: []` vẫn trả `questions`.
  - Router: `/reading/p3`, `/reading/p3/tips`, `/reading/p3/review`, `/reading/p3/practice/{detail,gist,infer,word,long,mix}` ra đúng page với `part: 'p3'`; danh sách "về hub p1" bỏ `/reading/p3`, thêm `/reading/p4` và `/reading/p3/practice/pair`.
- [ ] **Step 2: Chạy** `npm run test:unit`. Expected: FAIL ở các test mới.
- [ ] **Step 3: Cài đặt** theo Interfaces, thêm part p3 vào JSON.
- [ ] **Step 4: Chạy** `npm run test:unit`. Expected: PASS toàn bộ.
- [ ] **Step 5: Commit** `feat(reading): Part 3 data skeleton and validator`.

### Task 2: Logic Part 3 và tô đoạn chồng nhau

**Files:**
- Modify: `src/reading.js`, `tests/reading.test.mjs`

**Interfaces — Consumes:** Task 1. **Produces:**
- `unitNoun(part)` → `'đoạn'` cho `read` (giữ `'bộ'` / `'câu'`).
- `questionKey(passage, q, i) → string`: `readKey(passage.id + '.' + (q.n ?? i + 1))`.
- `numbered(passage) → passage` có `questions[i].n = i + 1` (không đổi dữ liệu gốc).
- `buildMix(part, rng)` cho `read`: 14 đoạn ngắn lấy xoay vòng từ các dạng ngắn có đoạn (dạng và đoạn xáo trộn), rồi tối đa 3 đoạn dài ngẫu nhiên; mọi đoạn đã qua `numbered`.
- `buildRun` không đổi; trang dùng `unitsOf(part, type).map(numbered)` cho lượt theo dạng.
- `reviewUnits(getMark, part)` cho `read`: các đoạn có ít nhất một câu hỏi mang dấu `'r'`, mỗi đoạn là bản `numbered` chỉ giữ câu hỏi `'r'` (vẫn giữ `n` gốc), sắp theo id. `fill`/`order` không đổi.
- `reviewCount(getMark, part) → number`: số mục đang "Cần ôn" (bộ / câu / **câu hỏi** với `read`); trang chọn bài dùng hàm này.
- `highlightClues(text, clues)` viết lại theo mặt nạ từng ký tự: đánh dấu mọi lần xuất hiện của mọi clue, rồi gộp các ký tự liền nhau cùng trạng thái thành đoạn. Các test Part 2 hiện có vẫn đúng.
- `readKeyAction({ key, done, target }) → null | 'choose:0'…'choose:3' | 'next' | 'none'`: field → null; `1`–`4`, `a`–`d` (không phân biệt hoa thường) → choose khi chưa `done`, null khi đã `done`; Enter: `done` → `'next'` trừ target `'control'`; chưa `done` → `'none'` nếu target `'answer'`, còn lại null; Space trên `'answer'` khi chưa done → `'none'`.

- [ ] **Step 1: Viết test thất bại:**
  - `highlightClues('可以后', ['可以', '以后'])` → `[{text:'可以后', hit:true}]`; `highlightClues('他明天来，后天走。', ['明天来', '后天走'])` → hit `'明天来'`, plain `'，'`, hit `'后天走'`, plain `'。'`; các test `highlightClues` của Part 2 vẫn qua; mọi trường hợp `join` lại bằng chuỗi gốc.
  - `numbered(readP('p3-001','long')).questions.map(q => q.n)` → `[1, 2]`, đoạn gốc không có `n`.
  - `questionKey(p, q, 1)` → `'r:p3-001.2'`; với `q.n = 2` và `i = 0` → `'r:p3-001.2'`.
  - `reviewUnits`: đoạn dài có dấu `'r'` chỉ ở `r:p3-002.2` → một đoạn, `questions.length === 1`, `questions[0].n === 2`; đoạn không có dấu không có mặt; thứ tự theo id.
  - `reviewCount` đếm 3 khi có `r:p3-001.1`, `r:p3-002.1`, `r:p3-002.2` (và `'k'` không được đếm); với part fill đếm số bộ `'r'`.
  - `buildMix` read: 4 dạng ngắn × 5 đoạn + 4 đoạn dài → 17 đoạn, 14 đoạn đầu ngắn (đủ 4 dạng), 3 đoạn cuối `long`, tổng số câu hỏi 20; chỉ có 2 đoạn dài → 16 đoạn; không có đoạn dài → 14.
  - `unitNoun` read → `'đoạn'`.
  - `readKeyAction`: `'2'` → `'choose:1'`; `'D'` → `'choose:3'`; `'5'` → null; `'a'` khi done → null; Enter done → `'next'`; Enter done + control → null; Enter chưa done + answer → `'none'`; Enter chưa done + other → null; Space chưa done + answer → `'none'`; field → null.
- [ ] **Step 2: Chạy** `node --test tests/reading.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Cài đặt** theo Interfaces.
- [ ] **Step 4: Chạy** `npm run test:unit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(reading): Part 3 runs, per-question keys, review and overlapping highlights`.

### Task 3: Màn Part 3

**Files:**
- Create: `src/components/ReadPassage.jsx`
- Modify: `src/pages/ReadingPracticePage.jsx`, `src/pages/ReadingHubPage.jsx`, `src/styles.css`

**Interfaces — Consumes:** Task 2. **Produces:**
- `ReadPassage({ p, answers, onAnswer(i, given) })` — `answers` là `{ [i]: given }`; tự giữ hai state cục bộ không nhớ: hiện pinyin đoạn, hiện dịch đoạn (trang remount thành phần theo `run:index`, nên mỗi đoạn mở ra đều tắt).

Hành vi (spec 6.3, bản phác p3-layout.html):
- Khung đoạn văn: chữ Hán; khi bật Pinyin thì hiện `p.pinyin` dưới; khi bật Dịch (chỉ bấm được lúc mọi câu hỏi đã trả lời) thì hiện `p.vi`. Trong chữ Hán, `evidence` của **các câu hỏi đã trả lời** được tô bằng `highlightClues` (`<mark className="rd-clue">`).
- Mỗi câu hỏi: số thứ tự khi đoạn có 2 câu (`1.`, `2.`), ★ trước câu hỏi khi chỉ 1 câu; 4 nút `fb-opt text` "A. …" xếp dọc (dùng lại lớp `lp-choices`, `lp-letter`); nút có `data-fill` để trang nhận target `'answer'`. Trả lời rồi: nút chọn tô `correct`/`wrong`, đáp án đúng luôn `correct`; dưới là khung `quiz-reveal ok|bad` "✅ Đúng — đáp án: C" / "❌ Sai — đáp án: C", câu hỏi có pinyin + dịch, 4 đáp án có pinyin + nghĩa (đáp án đúng ✔), 💡 `explain`.
- Trang: kit `read` với `max(u) = u.questions.length` (kit fill/order đổi thành `max(u)` trả 5 / 1). Trạng thái làm dở của đoạn là `{ [i]: given }`; chọn đáp án → lưu, nếu sai thì `setMark(questionKey(...), 'r')` nếu chưa `'r'`; khi đủ câu trả lời thì đặt `graded[index] = { score, max }`. Phím qua `readKeyAction` (`choose:k` trả lời câu hỏi đầu tiên chưa trả lời). Nút "Đoạn tiếp ▶" / "Xem kết quả ▶" chỉ bấm được khi đoạn đã xong. `progress`: theo dạng "Đoạn i / n"; tổng hợp và ôn "Đoạn i / n · Câu hỏi k / t" (k = số câu hỏi trước đoạn này + 1, t = tổng câu hỏi của lượt). Kết quả: "Kết quả: {đúng} / {tổng câu hỏi đã làm} câu"; danh sách sai liệt kê từng **câu hỏi** sai ("{dạng} · {câu hỏi} → C. {đáp án}"); lượt ôn có hàng "✅ Đã nắm" cho từng **câu hỏi** (khoá `questionKey`).
- `ReadingHubPage`: đếm theo `unitNoun` và `reviewCount`; với read: "N đoạn · K câu hỏi cần ôn"; thẻ dạng "N đoạn · K câu hỏi cần ôn"; thẻ tổng hợp "Mười bốn đoạn ngắn và ba đoạn dài (20 câu hỏi), như phần này của đề thật."; thẻ ôn "tối đa 20 đoạn".
- CSS: `rd-passage` (khung đoạn, nền nhạt, chữ 18–21px, line-height ~1.9), `rd-passage .py`, `rd-passage .vi`, `rd-q`, `rd-q-text`; màn 375 px không cuộn ngang.

- [ ] **Step 1: Cài đặt** thành phần, kit và trang chọn bài. Thêm tạm 3 đoạn thử (2 ngắn, 1 dài) vào `passages` ở bản làm việc (không commit).
- [ ] **Step 2: Chạy** `npm run test:unit && npm run build`. Expected: PASS, build không lỗi.
- [ ] **Step 3: Kiểm tra trên Chrome:** `/reading/p3/practice/long` — Pinyin trước khi trả lời, Dịch bị khoá cho tới khi xong; trả lời câu 1 bằng chuột, Enter không sang đoạn và không chọn lại; gõ `2` trả lời câu 2; evidence tô vàng; Enter sang đoạn; dấu `r:p3-…`; trang ôn chỉ hiện câu sai của đoạn dài; "✅ Đã nắm"; lượt tổng hợp; quay lại đoạn đã làm qua lưới; 375 px. Rồi làm một bộ Part 1 và một câu Part 2 để chắc không đổi. Chụp màn hình trước và sau khi trả lời.
- [ ] **Step 4: Commit** chỉ phần code (`git restore src/data/reading.json` trước): `feat(reading): Part 3 practice screen`.

### Task 4: Mẹo và 70 đoạn Part 3

**Files:**
- Modify: `src/data/reading.json`, `README.md`

- [ ] **Step 1: Mẹo** Part 3 (intro + các mục theo spec mục 5, mỗi mục một ví dụ ngắn không trùng đoạn luyện) và `types[].tip`. Lô 1: `p3-001`…`p3-015` (dạng `detail`). Rà soát bằng agent mới (với vai người chấm đề: đáp án duy nhất, đáp án nhiễu hợp lý, độ dài, HSK 1–4, pinyin, dịch, evidence đúng là chỗ quyết định, lời giải). Sửa, `npm run test:unit`, commit `feat(reading): Part 3 tips and detail passages`.
- [ ] **Step 2: Lô 2** `p3-016`…`p3-030` (`gist`): soạn, rà soát, sửa, test, commit `feat(reading): Part 3 gist passages`.
- [ ] **Step 3: Lô 3** `p3-031`…`p3-045` (`infer`): như trên, commit `feat(reading): Part 3 inference passages`.
- [ ] **Step 4: Lô 4** `p3-046`…`p3-060` (`word`): như trên, commit `feat(reading): Part 3 word-meaning passages`.
- [ ] **Step 5: Lô 5** `p3-061`…`p3-070` (`long`, 2 câu hỏi: một chi tiết, một ý chính hoặc suy luận): như trên, commit `feat(reading): Part 3 long passages`.
- [ ] **Step 6: README:** đoạn mô tả chuyên mục nói cả ba part đã xong; thêm dòng `/reading/p3…` vào bảng Pages; mục "Reading data" thêm format `read` và khoá `r:p3-001.1`. `npm run test:unit && npm run build`. Commit `docs(reading): README for Part 3`.
- [ ] **Step 7: Dừng để người dùng thử Part 3.** Không deploy trừ khi người dùng muốn.
