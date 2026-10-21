# Đọc hiểu — khung chuyên mục và Part 1 选词填空 — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chuyên mục `📄 Đọc hiểu` (sidebar, ba tab part, trang chọn bài, mẹo, lượt luyện, ôn câu sai) và làm xong Part 1 选词填空 theo bộ như đề thật: 6 từ A–F, câu 例如, 5 chỗ trống, điền đủ rồi nộp.

**Architecture:** Dữ liệu ở `src/data/reading.json` (lúc này chỉ có part `p1`, `format: "fill"`, mảng `sets`). `src/reading.js` không dùng React, chứa logic thuần (truy cập dữ liệu, dựng lượt, thao tác đặt/gỡ từ, chấm, phím tắt, validator) nên Node test được. Các trang `Reading*` làm theo khuôn của `Listening*`. Màn làm một bộ là thành phần `FillSet`. Part 2 và Part 3 có kế hoạch riêng, viết sau khi người dùng thử xong Part 1; tab của hai part này để mờ "Sắp có".

**Tech Stack:** React 19 + Vite, `node:test`. Không thêm thư viện.

**Spec:** `docs/superpowers/specs/2026-10-21-reading-design.md`. Đọc mục 1 (các quyết định), 2 (quy tắc soạn đề: phần chung và Part 1), 3 (dữ liệu), 4 (đường dẫn), 5 (mẹo Part 1), 6.1 (màn Part 1), 9 (triển khai). Bản phác đã duyệt: `.superpowers/brainstorm/50887-1792598204/content/p1-layout.html`, tuỳ chọn **A**.

## Global Constraints

- Chữ hiển thị bằng tiếng Việt. Các nhãn cố định: "Bộ 3 / 10 · Câu đơn", "Nộp bộ (k/5)", "✅ 5/5" / "❌ 3/5", "Sắp có", "📘 Mẹo làm bài", "🎯 Luyện tổng hợp", "🔁 Ôn câu sai", "✅ Đã nắm".
- Không đổi backend (`server/`, `functions/`, `migrations/`), không đổi `useMarks`/`useAccount`/`useSpeech`, không đổi hành vi của các chuyên mục khác (trừ việc thêm một mục vào `SECTIONS`).
- Id của bộ có dạng `/^p1-\d{3}$/` và không đổi sau khi phát hành. Khoá dấu là `r:p1-001`, đặt `'r'` khi bộ có ít nhất một câu sai.
- Mỗi bộ có đúng 6 `words` (A–F), câu `example` có `text` chứa đúng một `___` và `answer` từ 0–5, đúng 5 `items`. Đáp án của câu 例如 cùng 5 câu tạo thành một hoán vị của 0–5. Câu thuộc dạng `dialogue` có đúng hai dòng (ngăn bởi `\n`), mỗi dòng bắt đầu bằng `A：` hoặc `B：` (dấu hai chấm toàn khổ).
- Lượt tổng hợp gồm 2 bộ, một `sentence` rồi một `dialogue`. Lượt ôn tối đa 6 bộ.
- Lựa chọn hiện pinyin sau khi chấm được lưu ở khoá `localStorage` `hsk4_read_pinyin`, mặc định bật. Pinyin và dịch chỉ hiện sau khi nộp.
- Thứ tự 6 từ trong bộ giữ nguyên như dữ liệu; chỉ xáo thứ tự các bộ.
- Đề tuân theo quy tắc ở spec mục 2; mỗi lô đề qua một lượt rà soát riêng trước khi commit.
- Không deploy. Commit message viết tiếng Anh theo dạng `feat(reading): …`, kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Bấm một từ đang nằm ở chỗ khác:** từ phải chuyển sang chỗ đang chọn và chỗ cũ trở thành trống, không bao giờ có một từ nằm ở hai chỗ (Task 2: test `placeWord`).
2. **Bấm hoặc gõ đúng từ của câu 例如:** không có gì thay đổi, vì từ đó đã dùng (Task 2: test).
3. **Nhấn Enter khi chưa đủ 5 chỗ:** không nộp. Nhấn Enter khi focus đang ở một nút: để nút đó tự xử lý (Task 2: test `fillKeyAction`; Task 4: kiểm tra trong Chrome).
4. **Part còn thiếu nội dung** (giữa Task 5 và Task 7, hoặc p2/p3): tab mờ, thẻ dạng chưa có bộ mờ "Sắp có", lượt tổng hợp chỉ lấy dạng đã có bộ, và `/reading/p2` về `/reading/p1` (Task 2: test `buildMix` khi thiếu một dạng; Task 3: test router).
5. **Quay lại một bộ đã nộp qua "Danh sách câu":** bộ đó hiện đúng trạng thái đã chấm, không cho sửa, không chấm lại (Task 4: kiểm tra trong Chrome).

---

### Task 1: Dữ liệu và validator

**Files:**
- Create: `src/reading.js`, `src/data/reading.json`, `tests/reading.test.mjs`
- Modify: `package.json` (thêm `tests/reading.test.mjs` vào `test:unit`)

**Interfaces — Produces:**
- `PART_TABS = [{ id: 'p1', label: '① 选词填空' }, { id: 'p2', label: '② 排列顺序' }, { id: 'p3', label: '③ 阅读理解' }]`
- `PARTS` (`RAW.parts`), `partById(id) → part | undefined`
- `readKey(id) → 'r:' + id`
- `unitsOf(part, typeId?) → array`: các mục luyện của part (`part.sets` cho format `fill`), lọc theo `type` nếu có `typeId`
- `typeCount(part) → { [typeId]: number }`
- `LETTERS6 = ['A','B','C','D','E','F']`
- `validateReading(data) → string[]`: thông báo tiếng Việt, mỗi thông báo chứa id của bộ; `[]` khi hợp lệ. Lúc này `FORMATS = ['fill']`.

`reading.json` ban đầu: `{ "parts": [ { "id": "p1", "format": "fill", "name": "选词填空", "label": "Chọn từ điền vào chỗ trống", "desc": "Chọn từ trong danh sách cho sẵn để điền vào chỗ trống.", "tips": { "intro": "", "sections": [] }, "types": [sentence ✏️ "Câu đơn", dialogue 💬 "Hội thoại"] (mỗi type có `desc` và `tip`), "sets": [] } ] }`.

- [ ] **Step 1: Viết test thất bại** trong `tests/reading.test.mjs`. Dùng helper `fillSet(id, type, over)` để tạo một bộ hợp lệ (example answer 2; items answer `[3,0,5,1,4]`; với dạng dialogue thì mỗi `text`/`pinyin`/`vi` có hai dòng `A：…\nB：…`), và `dataWith(sets)`.
  - `validateReading(RAW)` → `[]`.
  - Bộ hợp lệ, cả dạng sentence lẫn dialogue → `[]`.
  - Mỗi trường hợp sau phải cho ra thông báo chứa id của bộ: id `p1-7`; id trùng (thông báo chứa `trùng`); `type` không có trong `types`; 5 hoặc 7 `words`; hai `words` trùng `text`; một word thiếu `pinyin`; 4 `items`; item có `text` không chứa `___`; item có hai `___`; `example.text` không chứa `___`; item `answer` bằng 6 hoặc `'1'`; hai item cùng `answer`; item trùng `answer` với câu 例如; item thiếu `vi`; item thiếu `explain`; câu dialogue chỉ có một dòng; câu dialogue có dòng không bắt đầu bằng `A：`/`B：`; `format: 'xyz'`.
  - Trong một dạng có từ 2 bộ trở lên mà các bộ có cùng dãy đáp án (`example.answer` và mọi `items[].answer` giống hệt nhau) → thông báo chứa tên dạng.
  - `unitsOf(p, 'dialogue')` chỉ trả các bộ dialogue; `typeCount` đếm đúng, dạng không có bộ được 0.
- [ ] **Step 2: Chạy** `node --test tests/reading.test.mjs`. Expected: FAIL (`src/reading.js` chưa có).
- [ ] **Step 3: Cài đặt** theo Interfaces, viết giống `validateListening` (một hàm `checkFill(set, at, errors, isDialogue)`). Thêm file test vào `test:unit`.
- [ ] **Step 4: Chạy** `npm run test:unit`. Expected: PASS toàn bộ.
- [ ] **Step 5: Commit** `feat(reading): data module and validator for Part 1`.

### Task 2: Logic lượt luyện và thao tác trên một bộ

**Files:**
- Modify: `src/reading.js`, `tests/reading.test.mjs`

**Interfaces — Consumes:** Task 1. **Produces:**
- `buildRun(units, { max = Infinity, rng = Math.random }) → array` (xáo trộn rồi cắt, dùng `shuffle` trong `src/random.js`)
- `buildMix(part, rng) → array`: với `fill` thì lấy một bộ ngẫu nhiên của mỗi dạng, theo thứ tự `types`, bỏ qua dạng chưa có bộ
- `REVIEW_MAX = { p1: 6, p2: 30, p3: 20 }`; `reviewUnits(getMark, part) → array`: các mục có `getMark(readKey(id)) === 'r'`, sắp theo id
- `emptyFill() → { slots: [null,null,null,null,null], cur: 0 }`
- `selectSlot(fill, i) → fill` (đặt `cur = i`)
- `placeWord(fill, w, set) → fill`: nếu `w === set.example.answer` thì trả nguyên `fill`. Ngược lại: bỏ `w` khỏi chỗ khác nếu có, đặt `slots[cur] = w`, rồi chuyển `cur` sang chỗ trống kế tiếp sau `cur` (vòng lại từ đầu); nếu không còn chỗ trống thì giữ `cur`
- `clearSlot(fill) → fill` (`slots[cur] = null`)
- `isFull(fill) → boolean`
- `gradeSet(set, slots) → { results: boolean[5], score: number }`
- `usedWords(set, slots) → Set<number>` (gồm cả từ của câu 例如)
- `fillKeyAction({ key, graded, full, target }) → null | 'word:0'…'word:5' | 'slot:0'…'slot:4' | 'clear' | 'submit' | 'next'`: `target === 'field'` → `null`. Đã chấm: `Enter` → `'next'` nếu target khác `'control'`, phím khác → `null`. Chưa chấm: `a`–`f` (không phân biệt hoa thường) → `word`, `1`–`5` → `slot`, `Backspace` → `'clear'`, `Enter` → `'submit'` khi `full` và target khác `'control'`, còn lại → `null`
- `filledText(text, word) → string` (thay `___` bằng từ)
- `loadShowPinyin() / saveShowPinyin(b)` dùng khoá `hsk4_read_pinyin`, mặc định `true`, bọc try/catch như `listening.js`

- [ ] **Step 1: Viết test thất bại:**
  - `placeWord`: đặt từ 3 vào chỗ 0 → `slots[0] === 3`, `cur === 1`. Đặt tiếp từ 0 → `cur === 2`. Chọn chỗ 4 rồi đặt từ 3 (đang ở chỗ 0) → `slots[4] === 3`, `slots[0] === null`, `cur === 0` (vòng về chỗ trống đầu). Đặt từ của câu 例如 → không đổi (`deepEqual`). Điền đủ `[3,0,5,1,4]`, chọn chỗ 1 rồi đặt từ 4 (đang ở chỗ 4) → `slots` là `[3,4,5,1,null]` (từ 0 bị gỡ ra, không đổi chỗ cho nhau), `cur === 4`.
  - `clearSlot`, `isFull`, `usedWords` (luôn chứa `example.answer`).
  - `gradeSet(set, [3,0,5,1,4])` → `score 5`. Đổi chỗ hai từ → `score 3` và `results` sai đúng ở hai vị trí đó.
  - `fillKeyAction`: `'C'` → `'word:2'`; `'f'` → `'word:5'`; `'g'` → `null`; `'3'` → `'slot:2'`; `'6'` → `null`; `Backspace` → `'clear'`; `Enter` khi chưa đủ → `null`; `Enter` khi đủ → `'submit'`; `Enter` khi đủ nhưng target `'control'` → `null`; đã chấm thì `Enter` → `'next'` và `'a'` → `null`; target `'field'` → `null` với mọi phím.
  - `buildMix`: part có 2 bộ mỗi dạng → độ dài 2, `[0].type === 'sentence'`, `[1].type === 'dialogue'`. Part không có bộ dialogue nào → độ dài 1.
  - `reviewUnits` trả đúng các bộ có dấu `'r'`, theo thứ tự id. `buildRun(units, { max: 6 })` có độ dài tối đa 6.
  - `filledText('他___了。', '走')` → `'他走了。'`.
- [ ] **Step 2: Chạy** `node --test tests/reading.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Cài đặt** theo Interfaces.
- [ ] **Step 4: Chạy** `npm run test:unit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(reading): run building, set filling, grading and keys`.

### Task 3: Đường dẫn, sidebar, tab, trang chọn bài và trang mẹo

**Files:**
- Modify: `src/routes.js`, `src/App.jsx`, `tests/router.test.mjs`
- Create: `src/components/ReadingNav.jsx`, `src/pages/ReadingHubPage.jsx`, `src/pages/ReadingTipsPage.jsx`

**Interfaces — Consumes:** `PARTS`, `PART_TABS`, `partById`, `unitsOf`, `typeCount`, `reviewUnits`, `readKey` từ Task 1–2. **Produces:**
- Route pages `reading-hub`, `reading-tips`, `reading-practice` (`params: { part, type }`), `reading-review` (`params: { part }`)
- `SECTIONS` thêm `{ id: 'reading', path: '/reading/p1', label: '📄 Đọc hiểu' }` ở cuối; `sectionOf` trả `'reading'` cho page bắt đầu bằng `reading`; thêm 4 `PAGE_TITLES`: 'Đọc hiểu', 'Mẹo đọc hiểu', 'Luyện đọc', 'Ôn câu đọc sai'
- `matchReading(parts)` làm như `matchListening`, với hub mặc định `/reading/p1`

- [ ] **Step 1: Viết test thất bại** trong `tests/router.test.mjs`:
  - Cập nhật test `SECTIONS` thành `['vocab','grammar','compare','listening','reading']`.
  - `sectionOf` của 4 page reading là `'reading'`.
  - `/reading`, `/reading/`, `/reading/p1` → hub p1. `/reading/p1/tips` và `/reading/p1/review` đúng page. `/reading/p1/practice/sentence`, `/dialogue`, `/mix` → `reading-practice`. `//reading//p1//tips/` được chuẩn hoá.
  - Các đường dẫn lạ về hub p1: `/reading/p2` (lúc này chưa có p2 trong dữ liệu), `/reading/p1/practice/xyz`, `/reading/p1/practice`, `/reading/p1/tips/x`, `/reading/P1`, `/reading/p1/review/1`.
  - Mọi page reading đều có `PAGE_TITLES`.
- [ ] **Step 2: Chạy** `node --test tests/router.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Cài đặt** routes, rồi `ReadingNav` (theo khuôn `ListeningNav`, `aria-label="Đọc hiểu"`), `ReadingHubPage` (theo khuôn `ListeningHubPage`; với `fill` đơn vị đếm là "bộ": "N bộ · K cần ôn"; thẻ tổng hợp ghi "Hai bộ (một câu đơn, một hội thoại), như phần này của đề thật."; thẻ ôn ghi "tối đa 6 bộ"), `ReadingTipsPage` (theo khuôn `ListeningTipsPage`, liên kết trỏ `/reading/...`). Trong `App.jsx`: route `reading-practice`/`reading-review` tạm hiện hub cho tới Task 4; thanh tab là `ReadingNav part={route.params.part}`.
- [ ] **Step 4: Chạy** `npm run test:unit && npm run build`. Expected: PASS, build không lỗi.
- [ ] **Step 5: Commit** `feat(reading): routes, section nav, hub and tips pages`.

### Task 4: Màn làm một bộ và lượt luyện

**Files:**
- Create: `src/components/FillSet.jsx`, `src/pages/ReadingPracticePage.jsx`
- Modify: `src/App.jsx`, `src/styles.css`

**Interfaces — Consumes:** mọi thứ từ Task 2. **Produces:**
- `FillSet({ set, fill, graded, showPinyin, onTogglePinyin, onSelect(i), onPlace(w), onSubmit })`: thành phần chỉ hiển thị, không giữ state; state `fill` nằm ở trang.
- `ReadingPracticePage({ part, scope: 'type'|'mix'|'review', type })`

Hành vi (spec mục 6.1, bản phác A):
- Trang giữ `{ units, run, index, fills: {[i]: fill}, graded: {[i]: { slots, results, score }}, showDone }`. Mỗi bộ có `fill` riêng, nên chuyển qua lại giữa các bộ chưa nộp vẫn giữ được phần đã điền.
- Hàng từ A–F: từ thuộc `usedWords` thì có lớp `used` (mờ); từ của câu 例如 luôn mờ và không bấm được.
- Câu 例如 hiện màu nhạt dưới dạng `例如：` + `filledText(example.text, '（' + chữ cái + '）')`. Năm câu đánh số 1–5. Ở bộ dialogue, mỗi câu hiện hai dòng.
- Chỗ trống là `<button>`. Chỗ đang chọn có lớp `sel`; chỗ đã điền hiện "D 坚持".
- Nút "Nộp bộ (k/5)" chỉ bấm được khi `isFull`. Khi nộp: tính `gradeSet`; nếu `score < 5` và mark chưa phải `'r'` thì `setMark(readKey(id), 'r')`.
- Sau khi chấm: chỗ trống tô `ok`/`bad`; chỗ sai hiện thêm "→ B 按时". Dưới mỗi câu là câu đã điền đúng (`filledText`), pinyin (theo lựa chọn hiện pinyin), dịch, và 💡 `explain`. Đầu bộ có khung `quiz-reveal ok|bad` ghi "✅ 5/5" hoặc "❌ 3/5", kèm nút Ẩn/Hiện pinyin.
- Dòng `progress`: "Bộ {i+1} / {n} · {tên dạng}". Màn kết quả: "Kết quả: {số câu đúng} / {5 × số bộ đã nộp} câu", danh sách các bộ có câu sai (bấm để quay lại bộ đó), và ở lượt ôn có hàng "✅ Đã nắm" cho từng bộ. Nút "🔁 Làm lại bộ sai", "🔀 Làm lượt mới", "← Part 1". "Danh sách câu" đánh số theo bộ, tô đúng (5/5) hoặc sai.
- Phím tắt qua `fillKeyAction`. Cách xác định target giống `ListeningPracticePage`: ô nhập → `'field'`; nút chỗ trống hoặc nút từ (đánh dấu bằng `data-fill`) → `'other'`, để phím chữ vẫn chạy; các nút hay liên kết khác → `'control'`.
- `scope === 'review'` dùng `buildRun(reviewUnits(...), { max: REVIEW_MAX[part.id] })`; `mix` dùng `buildMix`; `type` dùng `buildRun(unitsOf(part, type))`.
- CSS: thêm lớp `rd-words`, `rd-word(.used)`, `rd-line(.example)`, `rd-blank(.sel|.ok|.bad)`, `rd-item-explain`. Dùng lại kiểu chữ và màu của `.order-tile`, `.fb-opt.correct/.wrong`, và quy ước responsive có sẵn (trên điện thoại hàng 6 từ được xuống dòng).

- [ ] **Step 1: Cài đặt** hai file và nối vào `App.jsx`, thay các route tạm của Task 3. Lúc này `reading.json` chưa có bộ nào, nên thêm tạm 1 bộ thử vào `sets` ở bản làm việc. **Không commit bộ thử này**; Task 5 thay nó bằng nội dung thật.
- [ ] **Step 2: Chạy** `npm run test:unit && npm run build`. Expected: PASS.
- [ ] **Step 3: Kiểm tra trong Chrome** (`npm run dev:web`, mở `/reading/p1/practice/sentence`) từng mục sau: bấm chỗ trống rồi bấm từ; gõ phím `A`–`F`, `1`–`5`, `Backspace`; chuyển một từ sang chỗ khác; bấm từ của câu 例如 không có tác dụng; nút nộp bị khoá khi chưa đủ, `Enter` nộp được khi đủ; sau khi chấm có tô màu, lời giải và nút bật/tắt pinyin; `Enter` sang bộ tiếp theo; dùng "Danh sách câu" quay lại một bộ đã nộp thì thấy trạng thái đã chấm; câu sai được đánh dấu và hiện ở `/reading/p1/review`; màn hẹp 375 px không bị cuộn ngang. Chụp màn hình trước và sau khi chấm.
- [ ] **Step 4: Commit** chỉ phần code (`git restore src/data/reading.json` trước khi commit): `feat(reading): Part 1 set practice screen`.

### Task 5: Mẹo Part 1 và 4 bộ đầu tiên

**Files:**
- Modify: `src/data/reading.json`

- [ ] **Step 1: Viết** `tips` (intro cùng các mục theo spec mục 5, phần Part 1; mỗi mục có ít nhất một ví dụ `[zh, pinyin, vi]`), `types[].desc`/`tip`, và 4 bộ: `p1-001`, `p1-002` là `sentence`; `p1-003`, `p1-004` là `dialogue`. Viết theo quy tắc ở spec mục 2. Từ để điền ưu tiên lấy trong `src/data/vocab.json`. Chữ cái của câu 例如 khác nhau giữa các bộ.
- [ ] **Step 2: Rà soát riêng** (một subagent mới, hoặc tự đọc lại với tư cách người chấm đề): với từng câu, thử đặt cả 6 từ vào chỗ trống và xác nhận chỉ một từ hợp cả về ngữ pháp lẫn nghĩa; kiểm tra mọi từ thuộc HSK 1–4; pinyin khớp với câu đã điền (thanh điệu, biến điệu của 一/不); bản dịch tự nhiên; lời giải nêu đúng từ loại và cách kết hợp. Sửa mọi chỗ sai tìm được.
- [ ] **Step 3: Chạy** `npm run test:unit && npm run build`. Expected: PASS. Mở lại Chrome, làm trọn một lượt tổng hợp.
- [ ] **Step 4: Commit** `feat(reading): Part 1 tips and first four sets`.

### Task 6: Dừng để người dùng thử

- [ ] Báo cho người dùng biết đường dẫn `/reading/p1` (chạy `npm run dev`), và hỏi về độ khó, cách thao tác, lời giải, mẹo. **Không làm tiếp cho tới khi người dùng trả lời.** Sửa theo góp ý; nếu góp ý làm thay đổi giao diện hoặc logic thì sửa lại test tương ứng và commit theo đúng kiểu các task trên.

### Task 7: 16 bộ còn lại và README

**Files:**
- Modify: `src/data/reading.json`, `README.md`

- [ ] **Step 1: Viết lô 1:** `p1-005`…`p1-012` (4 sentence, 4 dialogue), theo góp ý ở Task 6. Không lặp lại cốt truyện hay cách dùng từ của các bộ trước.
- [ ] **Step 2: Rà soát lô 1** như Task 5 Step 2, sửa lỗi. Chạy `npm run test:unit`. Commit `feat(reading): Part 1 sets 005–012`.
- [ ] **Step 3: Viết lô 2:** `p1-013`…`p1-020` (4 sentence, 4 dialogue), rồi rà soát, test và commit `feat(reading): Part 1 sets 013–020`. Khi xong, mỗi dạng có 10 bộ.
- [ ] **Step 4: README:** thêm đoạn mô tả chuyên mục Đọc hiểu; thêm các dòng `/reading/...` vào bảng Pages; thêm `src/reading.js`, `src/data/reading.json`, `tests/reading.test.mjs` vào bảng Layout; thêm mục "Reading data" mô tả cấu trúc `sets` và khoá `r:`. Chạy `npm run test:unit && npm run build`. Commit `docs(reading): README for the reading section`.
