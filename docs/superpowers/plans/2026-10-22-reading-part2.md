# Đọc hiểu Part 2 排列顺序 — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến tab ② 排列顺序 của chuyên mục Đọc hiểu thành phần luyện thật: ba câu A/B/C, bấm để xếp thành đoạn văn, chấm, hiện đoạn đã ghép với từ manh mối tô vàng, lời giải ba bước, và "Cần ôn" cho từng câu. Part 1 giữ nguyên.

**Architecture:** Thêm part `p2` (`format: "order"`, mảng `questions`) vào `src/data/reading.json`. `src/reading.js` có thêm phần logic thuần cho format `order` (đặt/gỡ câu, chấm, phím tắt, tô manh mối, validator) và các hàm dùng chung theo format (`unitsOf`, đơn vị đếm, lượt tổng hợp). `ReadingHubPage` và `ReadingPracticePage` chọn phần riêng theo `part.format`; màn một câu là thành phần mới `OrderSentences`, chỉ hiển thị, không giữ state (giống `FillSet`).

**Tech Stack:** React 19 + Vite, `node:test`. Không thêm thư viện.

**Spec:** `docs/superpowers/specs/2026-10-21-reading-design.md`. Đọc mục 1 (các quyết định, bảng "Quyết định do Claude đặt"), 2 (quy tắc soạn đề: phần chung và Part 2), 3 (dữ liệu Part 2), 5 (mẹo Part 2), 6.2 (màn Part 2). Bản phác đã duyệt: `.superpowers/brainstorm/50887-1792598204/content/p2-layout.html`. Code mẫu: Part 1 trong `src/reading.js`, `src/components/FillSet.jsx`, `src/pages/ReadingPracticePage.jsx`.

## Global Constraints

- Chữ hiển thị bằng tiếng Việt. Các nhãn cố định: "Câu 4 / 10 · Sắp xếp ba câu thành đoạn văn", "Kiểm tra", "✓ Đúng: B → C → A", "✗ Bạn xếp: A → B → C · Đúng: B → C → A", "Sắp có".
- Không đổi backend, `useMarks`/`useAccount`/`useSpeech`, hay hành vi Part 1 (id `p1-…`, khoá `r:p1-…`, màn bộ, phím tắt, các test đang có).
- Id câu có dạng `/^p2-\d{3}$/` và không đổi sau khi phát hành. Khoá dấu là `r:p2-001`, đặt `'r'` khi xếp sai.
- Mỗi câu có đúng 3 `sentences` (`{text, pinyin, vi}`, hiện là A, B, C theo thứ tự dữ liệu); `answer` là hoán vị của `"ABC"` và khác `"ABC"`; `clues` là mảng chuỗi không rỗng, mỗi chuỗi nằm nguyên văn trong ít nhất một câu; `explain` là `{first, next, last}` không rỗng; câu đứng cuối theo đáp án kết thúc bằng `。`, `！` hoặc `？`.
- 4 dạng: `pair` 🔗 Từ nối thành cặp, `ref` 👉 Đại từ, từ chỉ, `time` ⏱ Trình tự thời gian, `topic` 💡 Chủ đề → giải thích. 10 câu mỗi dạng (40 câu).
- Lượt tổng hợp: 10 câu, xoay vòng các dạng (`mixCount: 10`). Lượt ôn: tối đa 30 câu (`REVIEW_MAX.p2`).
- Pinyin và dịch chỉ hiện sau khi kiểm tra. Lựa chọn hiện pinyin dùng chung khoá `hsk4_read_pinyin` với Part 1.
- Phím tắt: `A`/`B`/`C` đặt câu, `Backspace` gỡ câu cuối, `Enter` kiểm tra khi đủ 3 câu và sang câu tiếp khi đã chấm; bỏ qua khi đang gõ trong ô nhập hoặc giữ Ctrl/Meta/Alt; Enter/Space khi focus ở nút câu thì không bấm lại nút đó (cùng cách xử lý `'answer'` / `'none'` như Part 1).
- Đề theo spec mục 2; mỗi lô qua một lượt rà soát riêng (agent mới) trước khi commit.
- Commit message tiếng Anh `feat(reading): …`, kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Không deploy trong kế hoạch này.

## Review Focus

1. **Bấm câu đã đặt ở giữa** (vd. đã đặt B, C rồi bấm B): B được gỡ, C dồn lên ô 1, không bao giờ một câu nằm hai ô (Task 2: test `unpickSentence`).
2. **Gõ lại chữ cái của câu đã đặt:** không có gì thay đổi (Task 2: test `pickSentence`).
3. **Manh mối trùng hoặc chồng nhau** (vd. `["但是", "但"]`, hoặc một manh mối xuất hiện hai lần): tô đúng mọi chỗ, không lặp chữ, không mất chữ (Task 2: test `highlightClues`).
4. **Part 1 không đổi** sau khi tổng quát hoá trang luyện và trang chọn bài: test Part 1 vẫn xanh, và kiểm tra trên Chrome một bộ Part 1 (Task 3).
5. **Part 2 còn thiếu dạng** (giữa các lô): thẻ dạng mờ "Sắp có", tổng hợp chỉ lấy dạng có câu, `/reading/p2` mở được hub Part 2 còn `/reading/p3` về `/reading/p1` (Task 1: test router; Task 2: test `buildMix`).

---

### Task 1: Dữ liệu Part 2 và validator

**Files:**
- Modify: `src/reading.js`, `src/data/reading.json`, `tests/reading.test.mjs`, `tests/router.test.mjs`

**Interfaces — Produces:**
- `unitsOf(part, typeId?)` trả `part.sets` (fill) hoặc `part.questions` (order).
- `validateReading` nhận `FORMATS = ['fill', 'order']`, kiểm câu `order` bằng `checkOrder(q, at, errors)` theo Global Constraints; kiểm "mọi mục của một dạng cùng đáp án" áp dụng cho cả `order` (so `answer`).

`reading.json`: thêm part thứ hai `{ "id": "p2", "format": "order", "name": "排列顺序", "label": "Sắp xếp câu", "desc": "Sắp xếp ba câu thành một đoạn văn hợp lý.", "mixCount": 10, "tips": { "intro": "", "sections": [] }, "types": [4 dạng ở Global Constraints, mỗi dạng có desc và tip], "questions": [] }`.

- [ ] **Step 1: Viết test thất bại.** Helper `orderQ(id, type, over)` tạo câu hợp lệ (vd. sentences `所以我们全家经常开车过去吃。` / `虽然这家饭馆离我家有点儿远，` / `但是菜做得特别好吃，价格也不贵，`, `answer: 'BCA'`, `clues: ['虽然','但是','所以']`, `explain` đủ ba trường) và `dataWithOrder(questions)` (part p2, 4 types).
  - Câu hợp lệ → `[]`; hai câu hợp lệ khác đáp án → `[]`.
  - Mỗi lỗi sau cho thông báo chứa id câu: 2 hoặc 4 `sentences`; một câu thiếu `pinyin`; `answer` là `'ABC'`, `'ABD'`, `'AAB'`, `'BC'`, `'bca'`; `clues` rỗng; một clue không có trong câu nào; `explain` thiếu `last`; câu cuối theo đáp án kết thúc bằng `，`; id `p2-1`; `type` lạ.
  - Hai câu cùng dạng cùng `answer` → thông báo chứa tên dạng.
  - `unitsOf` của part order trả `questions`.
  - Router: `/reading/p2`, `/reading/p2/tips`, `/reading/p2/review`, `/reading/p2/practice/{pair,ref,time,topic,mix}` ra đúng page với `part: 'p2'`; bỏ `/reading/p2` khỏi danh sách "về hub p1" và thêm `/reading/p3`, `/reading/p2/practice/sentence`.
- [ ] **Step 2: Chạy** `npm run test:unit`. Expected: FAIL ở các test mới.
- [ ] **Step 3: Cài đặt** theo Interfaces và thêm part p2 vào JSON.
- [ ] **Step 4: Chạy** `npm run test:unit`. Expected: PASS toàn bộ.
- [ ] **Step 5: Commit** `feat(reading): Part 2 data skeleton and validator`.

### Task 2: Logic Part 2

**Files:**
- Modify: `src/reading.js`, `tests/reading.test.mjs`

**Interfaces — Consumes:** Task 1. **Produces:**
- `LETTERS3 = ['A', 'B', 'C']`
- `unitNoun(part) → 'bộ' | 'câu'` (`fill` → `'bộ'`, còn lại `'câu'`)
- `mixSize(part) → part.mixCount || 10`
- `buildMix(part, rng)`: `fill` giữ như cũ; `order` lấy `mixSize(part)` câu, xoay vòng giữa các dạng có câu (dạng và câu xáo trộn), như `buildMix` của `src/listening.js`
- `pickSentence(picked, k) → number[]`: thêm `k` (0–2) vào cuối nếu chưa có, nếu đã có thì trả nguyên
- `unpickSentence(picked, k) → number[]`: bỏ `k`, các câu sau dồn lên
- `orderString(picked) → string` (`[1,2,0]` → `'BCA'`)
- `gradeOrder(q, picked) → { given: string, ok: boolean }`
- `orderedSentences(q) → sentence[]` theo thứ tự đáp án
- `highlightClues(text, clues) → { text: string, hit: boolean }[]`: chia `text` thành các đoạn liền nhau, đoạn `hit` là chỗ khớp một clue; ưu tiên clue dài hơn khi chồng nhau; ghép các `text` lại phải đúng bằng `text` gốc
- `orderKeyAction({ key, graded, full, target }) → null | 'pick:0' | 'pick:1' | 'pick:2' | 'pop' | 'check' | 'next' | 'none'`: cùng quy tắc với `fillKeyAction` (field → null; đã chấm: Enter → next trừ control; Enter khi đủ → check trừ control; Enter/Space trên `'answer'` khi chưa đủ → none; `a`–`c` không phân biệt hoa thường → pick; Backspace → pop)

- [ ] **Step 1: Viết test thất bại:**
  - `pickSentence([], 1)` → `[1]`; `pickSentence([1], 1)` → `[1]`; `pickSentence([1, 2], 0)` → `[1, 2, 0]`.
  - `unpickSentence([1, 2, 0], 1)` → `[2, 0]`.
  - `orderString([1, 2, 0])` → `'BCA'`; `gradeOrder(q /* BCA */, [1, 2, 0])` → `{ given: 'BCA', ok: true }`; `[0, 1, 2]` → `{ given: 'ABC', ok: false }`.
  - `orderedSentences(q).map(s => s.text)` theo thứ tự B, C, A.
  - `highlightClues('虽然远，但是好。', ['虽然', '但是'])` → `[{text:'虽然',hit:true},{text:'远，',hit:false},{text:'但是',hit:true},{text:'好。',hit:false}]`; `highlightClues('但是但是', ['但'])` → hai đoạn hit `'但'` xen với `'是'`; `highlightClues('但是', ['但', '但是'])` → `[{text:'但是',hit:true}]`; không có clue nào khớp → `[{text, hit:false}]`; với mọi trường hợp trên, `join` các `text` bằng chuỗi gốc.
  - `orderKeyAction`: `'b'` → `'pick:1'`; `'C'` → `'pick:2'`; `'d'` → `null`; `Backspace` → `'pop'`; Enter chưa đủ (other) → `null`; Enter chưa đủ (answer) → `'none'`; Space (answer) → `'none'`; Enter đủ → `'check'`; Enter đủ (control) → `null`; đã chấm Enter → `'next'`, `'a'` → `null`; field → `null`.
  - `buildMix` order: part có 3 câu mỗi dạng, `mixCount: 10` → 10 câu, đủ 4 dạng, không trùng id; part chỉ có câu dạng `pair` (2 câu) → 2 câu.
  - `unitNoun`, `mixSize`.
- [ ] **Step 2: Chạy** `node --test tests/reading.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Cài đặt** theo Interfaces.
- [ ] **Step 4: Chạy** `npm run test:unit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(reading): Part 2 ordering, grading, clue highlighting and keys`.

### Task 3: Màn Part 2 và tổng quát hoá trang theo format

**Files:**
- Create: `src/components/OrderSentences.jsx`
- Modify: `src/pages/ReadingPracticePage.jsx`, `src/pages/ReadingHubPage.jsx`, `src/styles.css`

**Interfaces — Consumes:** Task 2. **Produces:**
- `OrderSentences({ q, picked, graded, showPinyin, onTogglePinyin, onPick(k), onUnpick(k), onCheck })` — chỉ hiển thị; `graded` là `{ given, ok }` hoặc `null`.

Hành vi (spec 6.2, bản phác p2-layout.html):
- Trang luyện giữ trạng thái làm dở theo index (`work`) và kết quả theo index (`graded`) cho cả hai format; phần riêng theo format: thành phần nội dung, xử lý phím, hàm chấm, điểm tối đa của một mục (fill 5, order 1), chữ ở `progress` ("Bộ i / n · {dạng}" và "Câu i / n · Sắp xếp ba câu thành đoạn văn"), nhãn trong danh sách sai/ôn (fill: dạng + 6 từ; order: dạng + câu đầu tiên theo đáp án, cắt ~20 chữ), nhãn lưới ("Danh sách bộ" / "Danh sách câu"), nút ("◀ Bộ trước" / "◀ Câu trước"…). Kết quả: "Kết quả: {đúng} / {tối đa} câu".
- Khi chưa chấm: ba ô đánh số 1–3 (ô đã có câu hiện "B　虽然…" và bấm được để gỡ; ô trống hiện số, nét đứt); dưới là các câu chưa đặt, mỗi câu một nút có nhãn chữ cái; nút "Kiểm tra" chỉ bấm được khi đủ 3. Các nút câu và ô có `data-fill` để dùng chung cách xác định target `'answer'`.
- Sau khi chấm: khung `quiz-reveal ok|bad` với dòng ✓/✗ theo Global Constraints và nút Ẩn/Hiện pinyin; đoạn ghép (`orderedSentences`) với `highlightClues` (đoạn hit bọc `<mark className="rd-clue">`); pinyin (theo lựa chọn) và dịch của từng câu, mỗi câu một dòng theo thứ tự đáp án; 💡 ba dòng "Câu đầu:", "Tiếp theo:", "Cuối:" từ `explain.first/next/last`. Sai → `setMark('r:' + id, 'r')` nếu chưa `'r'`.
- `ReadingHubPage`: đếm theo `unitNoun`; thẻ tổng hợp: fill giữ chữ cũ, order "Mười câu trộn các dạng, như phần này của đề thật."; thẻ ôn "tối đa {REVIEW_MAX} {unitNoun}".
- CSS: `rd-slots`, `rd-slot(.empty)`, `rd-pool`, `rd-sent`, `rd-para`, `rd-clue` (nền vàng nhạt, chữ đậm), dùng lại màu của `.order-tile`/`.rd-word`; màn 375 px không cuộn ngang.

- [ ] **Step 1: Cài đặt** thành phần và tổng quát hoá hai trang. Thêm tạm 2 câu thử vào `questions` ở bản làm việc (không commit).
- [ ] **Step 2: Chạy** `npm run test:unit && npm run build`. Expected: PASS, build không lỗi.
- [ ] **Step 3: Kiểm tra trên Chrome:** `/reading/p2/practice/pair` — bấm và gõ A/B/C, gỡ câu ở giữa, Backspace, Enter bị chặn khi chưa đủ, Enter/Space trên nút câu không đặt lại câu, kiểm tra đúng và sai, tô manh mối, pinyin, quay lại câu đã chấm qua lưới, dấu `r:p2-…` và trang ôn, 375 px. Rồi `/reading/p1/practice/mix` làm trọn một bộ để chắc Part 1 không đổi. Chụp màn hình trước và sau khi chấm.
- [ ] **Step 4: Commit** chỉ phần code (`git restore src/data/reading.json` trước): `feat(reading): Part 2 practice screen`.

### Task 4: Mẹo và 40 câu Part 2

**Files:**
- Modify: `src/data/reading.json`, `README.md`

- [ ] **Step 1: Viết** `tips` Part 2 (intro + các mục theo spec mục 5, mỗi mục một ví dụ `[zh, pinyin, vi]`, ví dụ không trùng câu luyện; ví dụ nhiều câu thì mỗi câu một dòng) và lô 1: `p2-001`…`p2-020` (5 câu mỗi dạng). Theo spec mục 2; trong mỗi dạng, chữ cái đứng đầu đáp án phải có cả A, B và C.
- [ ] **Step 2: Rà soát lô 1** bằng một agent mới, với vai người chấm đề: thử cả 6 thứ tự cho mỗi câu và xác nhận chỉ một thứ tự đọc xuôi; từ vựng HSK 1–4; pinyin, dịch, lời giải ba bước; clues đúng là manh mối. Sửa theo kết quả. `npm run test:unit`. Commit `feat(reading): Part 2 tips and questions 001–020`.
- [ ] **Step 3: Lô 2:** `p2-021`…`p2-040` (5 câu mỗi dạng), không lặp chủ đề lô 1; rà soát như Step 2; sửa; test; commit `feat(reading): Part 2 questions 021–040`.
- [ ] **Step 4: README:** đoạn mô tả chuyên mục nói Part 2 đã xong; thêm dòng `/reading/p2…` vào bảng Pages; mục "Reading data" thêm format `order`. `npm run test:unit && npm run build`. Commit `docs(reading): README for Part 2`.
- [ ] **Step 5: Dừng để người dùng thử Part 2** (spec mục 9 bước 4). Không deploy trừ khi người dùng muốn.
