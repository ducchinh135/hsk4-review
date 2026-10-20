# Nghe hiểu Part 2 选择正确答案 — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm tab ② của chuyên mục `🎧 Nghe hiểu` thành phần luyện thật: nghe hội thoại hai giọng + câu hỏi, chọn đáp án A–D, chấm ngay, transcript/dịch/giải thích, "Cần ôn" đồng bộ; Part 1 không đổi.

**Architecture:** Thêm `format` (`truefalse` | `choice`) cho từng part trong `src/data/listening.json`; `src/listening.js` (hàm thuần) validate/chấm/phím tắt theo `format`; trang luyện, trang chọn bài, mẹo, nav, route đã đọc từ dữ liệu nên chỉ trang luyện cần thêm dạng câu `choice`. Audio vẫn do `scripts/tts.py` nối byte mp3, thêm nhánh dựng hội thoại.

**Tech Stack:** React 18 + Vite, `node:test`, Python 3 + `edge-tts` (đã có `.venv` ở `/private/tmp/claude-501/-Users-mac-Documents-dev-hsk/03af3c9c-2978-474b-852d-94ead96d7f45/scratchpad/ttsenv`; nếu mất thì `python3 -m venv <dir> && <dir>/bin/pip install edge-tts`).

**Spec:** `docs/superpowers/specs/2026-10-20-listening-part2-design.md` (nối tiếp `2026-10-19-listening-part1-design.md`). Đọc cả hai, nhất là spec Part 2 mục 2 (quy tắc soạn đề), 3 (dữ liệu), 4 (âm thanh), 6 (màn hình).

## Global Constraints

- Chữ hiển thị tiếng Việt; nhãn theo spec mục 6.2 ("Câu 3 / 10 · Nghe hội thoại rồi chọn đáp án đúng", "👁 Xem câu hỏi", "✅ Đúng — đáp án: C", "❌ Sai — đáp án: C", "Nam"/"Nữ", "Sắp có").
- Không đổi backend (`server/`, `functions/`, `migrations/`), `useMarks`/`useAccount`/`useSpeech`, các chuyên mục khác.
- **Không đổi Part 1:** id `p1-…`, file `p1-….mp3`, khoá dấu `l:p1-…`, công thức băm audio của câu `truefalse` giữ nguyên từng chữ (`sha1(voice|text|statement|rate)`) → `tts.py` báo skip đủ 36.
- Câu Part 2: id `/^p2-\d{3}$/`, khoá dấu `l:p2-001` (8 ký tự ≤ 12), đúng 2 `lines`, đúng 4 `options`, `answer` nguyên 0–3, mỗi `lines[].v` / `question.v` là `f` hoặc `m`.
- Âm thanh Part 2: lượt 1 + im lặng 0.5 s (21 khung) + lượt 2 + im lặng 1.0 s (42 khung) + câu hỏi; giọng nữ `zh-CN-XiaoxiaoNeural`, nam `zh-CN-YunxiNeural`; `--rate` mặc định `-5%`.
- Phím tắt Part 2: `1`–`4` hoặc `a`–`d` (không phân biệt hoa thường) chọn; `Enter` sang câu tiếp kể cả ngay sau khi bấm chuột chọn đáp án; bỏ qua khi đang gõ chữ hay giữ Ctrl/Meta/Alt.
- Luyện tổng hợp Part 2 = 15 câu (`mixCount`), Part 1 = 10; ôn câu sai tối đa 30.
- Không tạo lại audio Part 1; không deploy trong kế hoạch này.
- Commit message tiếng Anh dạng `feat(listening): …`, kết thúc `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Bấm chuột chọn đáp án rồi nhấn Enter phải sang câu tiếp (Task 1: test `keyAction` target `'answer'` cho `choice`; Task 5: kiểm tra trong Chrome).
2. Part 1 không bị ảnh hưởng: dữ liệu Part 1 vẫn hợp lệ, `tts.py --dry-run` báo skip 36 (Task 1, Task 3).
3. Dữ liệu sai: đáp án ngoài 0–3, hai đáp án trùng chữ, thiếu `pinyin`/`vi` của đáp án, 1 hoặc 3 lượt thoại, id sai part → validator báo lỗi (Task 1).
4. Part 2 chưa đủ câu (giữa giai đoạn 1 và 3): thẻ dạng chưa có câu mờ "Sắp có", `/listening/p2/practice/<dạng rỗng>` hiện "Dạng này đang được soạn", tổng hợp chỉ rút từ dạng có câu (Task 2, Task 5).
5. Câu hỏi ẩn trước khi trả lời nhưng "👁 Xem câu hỏi" hiện nó, và sau trả lời luôn hiện cùng pinyin/dịch (Task 5, kiểm tra trong Chrome).

---

### Task 1: Logic theo `format` trong `src/listening.js`

**Files:**
- Modify: `src/listening.js`, `src/data/listening.json` (thêm `"format": "truefalse"` và `"mixCount": 10` vào Part 1), `tests/listening.test.mjs`

**Interfaces — Produces:**
- `partFormat(part) → 'truefalse' | 'choice'` (`part.format`)
- `mixSize(part) → number` (`part.mixCount || 10`)
- `correctLabel(part, q) → string`: `'对'`/`'错'` cho `truefalse`; `'C. 七点'` (chữ cái + `options[answer].text`) cho `choice`
- `promptOf(part, q) → string`: `q.statement` cho `truefalse`; `q.question.text` cho `choice`
- `keyAction({ key, answered, target, format = 'truefalse' }) → null | 'next' | 'true' | 'false' | 'choose:0' | 'choose:1' | 'choose:2' | 'choose:3'` (`choose:*` chỉ khi `format === 'choice'`; `1`–`4`, `a`–`d` không phân biệt hoa thường; Enter như cũ; `target === 'field'` luôn `null`)
- `validateListening(data)` kiểm theo `part.format` (spec mục 3); id đúng mẫu `<part.id>-\d{3}` và duy nhất toàn file; giữ nguyên mọi kiểm tra Part 1; thông báo tiếng Việt chứa id câu.

- [ ] **Step 1: Viết test thất bại** trong `tests/listening.test.mjs` (giữ nguyên test cũ; `dataWith` thêm `format: 'truefalse'`):
  - `choiceQ(id, type, answer, over)` và `dataWithChoice(questions)` (part `p2`, `format: 'choice'`, 4 types) tạo câu hợp lệ (2 `lines` nam/nữ, `question`, 4 `options` khác nhau có đủ `text/pinyin/vi`, `answer`, `explain`).
  - `validateListening(dataWithChoice([hợp lệ ×2 với đáp án khác nhau]))` → `[]`.
  - Mỗi lỗi sau cho ra thông báo chứa id câu: `answer: 4`, `answer: '2'`, `answer: -1`; hai `options` cùng `text`; một `option` thiếu `pinyin`; một `option` thiếu `vi`; 3 `options`; 1 `line`; 3 `lines`; `lines[0].v = 'x'`; `question.v = 'x'`; thiếu `question.text`; `id: 'p1-001'` trong part p2; id trùng; `type` ngoài `types`.
  - Dạng có ≥ 2 câu mà đáp án đúng cùng chữ cái → thông báo chứa tên dạng (dùng `answer` giống nhau).
  - `validateListening(RAW)` vẫn `[]` (Part 1 + `format`).
  - `partFormat`, `mixSize` (p1 → 10, part giả `mixCount: 15` → 15, không có → 10), `correctLabel` (`truefalse` true → `'对'`; `choice` answer 2, option 2 `七点` → `'C. 七点'`), `promptOf`.
  - `keyAction` choice: `'1'`→`'choose:0'`, `'4'`/`'D'`→`'choose:3'`, `'b'`→`'choose:1'`, `'5'`/`'e'`/`ArrowLeft` → `null` khi chưa trả lời; đã trả lời: `Enter` với target `'answer'` và `'other'` → `'next'`, target `'control'` → `null`, `'1'` → `null`; target `'field'` → `null` với mọi phím; `keyAction` không có `format` vẫn đúng như Part 1 (các test cũ giữ nguyên).
- [ ] **Step 2: Chạy** `node --test tests/listening.test.mjs` — Expected: FAIL (hàm chưa có / validator chưa hiểu `choice`).
- [ ] **Step 3: Cài đặt** theo Interfaces; `validateListening` tách hàm kiểm từng dạng câu (`truefalse` giữ logic hiện có).
- [ ] **Step 4: Chạy** `npm run test:unit` — Expected: PASS toàn bộ.
- [ ] **Step 5: Commit** `feat(listening): format-aware validation, labels and key actions`.

### Task 2: Khung Part 2 trong dữ liệu + route + hub

**Files:**
- Modify: `src/data/listening.json` (thêm part `p2`), `tests/router.test.mjs`, `tests/listening.test.mjs`
- Có thể sửa: `src/pages/ListeningHubPage.jsx`, `src/pages/ListeningPracticePage.jsx` (chỉ chỗ cứng `p1` nếu còn)

**Interfaces — Consumes:** Task 1 (`validateListening` chấp nhận part `choice`).
**Interfaces — Produces:** `partById('p2')` có `id 'p2'`, `format 'choice'`, `name '选择正确答案'`, `label 'Chọn đáp án đúng'`, `desc 'Nghe một đoạn hội thoại ngắn và câu hỏi, chọn đáp án đúng.'`, `mixCount 15`, `tips {intro:'', sections:[]}` (Task 4 điền), 4 `types` (`detail` 🔎 "Chi tiết", `reason` ❓ "Nguyên nhân, vấn đề", `attitude` 💬 "Thái độ, đề nghị", `infer` 🧠 "Suy luận") mỗi dạng có `desc` (1 câu theo spec mục 1) và `tip` rỗng, `questions: []`.

- [ ] **Step 1: Viết test thất bại:** trong `router.test.mjs` — `/listening/p2` → `{page:'listening-hub', params:{part:'p2'}, path:'/listening/p2'}`; `/listening/p2/tips`, `/listening/p2/review`; `/listening/p2/practice/{detail,reason,attitude,infer,mix}` → trang luyện đúng; `/listening/p2/practice/xyz` và `/listening/p3` về hub p1 (sửa danh sách đường dẫn lạ cũ, bỏ `/listening/p2`). Trong `listening.test.mjs` — `partById('p2')` tồn tại, `partFormat === 'choice'`, 4 dạng đúng id, `typeCount(p2)` toàn 0.
- [ ] **Step 2: Chạy** `npm run test:unit` — Expected: FAIL.
- [ ] **Step 3: Thêm part `p2`** vào JSON như trên (mô tả bốn dạng viết tiếng Việt, theo spec mục 1).
- [ ] **Step 4: Chạy** `npm run test:unit` — Expected: PASS (các test cũ về "Part 2 mờ" nếu có đã sửa ở Step 1).
- [ ] **Step 5: Kiểm tra trong Chrome** (`npx vite --port 5179 --strictPort` chạy nền): tab ② hết mờ và bấm được; `/listening/p2` có 6 thẻ, thẻ 4 dạng mờ "Sắp có", luyện tổng hợp mờ (chưa có câu) nếu code xử lý theo số câu; `/listening/p2/practice/detail` hiện "Dạng này đang được soạn." không lỗi console. Không xoá `localStorage` của trình duyệt.
- [ ] **Step 6: Commit** `feat(listening): Part 2 skeleton, routes and hub`.

### Task 3: `scripts/tts.py` dựng hội thoại

**Files:**
- Modify: `scripts/tts.py`

**Interfaces — Consumes:** dữ liệu `choice` (Task 1/2): `lines[i].{v,text}`, `question.{v,text}`.
**Interfaces — Produces:** `tts.py [--force] [--rate=-5%] [--dry-run]`; `--dry-run` không gọi mạng, in `Would create N, skip M` (và danh sách id sẽ tạo) rồi thoát; câu `choice` ghép `lines[0] + 21 khung im lặng + lines[1] + 42 khung im lặng + question`; khoá băm `choice` = `sha1('choice|' + voices và chữ của lines và question + '|' + rate)` (bất kỳ công thức xác định nào chứa mọi giọng, chữ và rate); khoá `truefalse` không đổi.

- [ ] **Step 1: Viết kiểm tra thất bại (không cần mạng):** chạy `$PY scripts/tts.py --dry-run` — Expected hiện tại: lỗi tham số hoặc tạo thật (không phải `Would create 0, skip 36`). Ghi nhận kết quả.
- [ ] **Step 2: Cài đặt** nhánh theo `part['format']` (đọc `format` của từng part; thiếu `format` → `truefalse`) và `--dry-run`.
- [ ] **Step 3: Chạy** `$PY scripts/tts.py --dry-run` — Expected: `Would create 0, skip 36` (Part 1 nguyên vẹn, Part 2 chưa có câu).
- [ ] **Step 4: Commit** `feat(listening): tts.py builds two-voice dialogue audio`.

### Task 4: Nội dung Part 2 giai đoạn 1 — mẹo + 10 câu Chi tiết + audio

**Files:**
- Modify: `src/data/listening.json` (`p2.tips`, `p2.types[*].tip`, 10 câu `type: "detail"`), `tests/listening.test.mjs`
- Create: `public/audio/listening/p2-001.mp3` … `p2-010.mp3`; cập nhật `manifest.json`

- [ ] **Step 1: Viết test thất bại:** `partById('p2')`: có ≥ 10 câu `detail`; mỗi chữ cái đáp án A–D xuất hiện 1–4 lần trong dạng `detail`; mọi câu Part 2 có mp3 `> 1000` byte (test mp3 hiện có đã quét mọi part — giữ nguyên); mọi `tip` của 4 dạng không rỗng; `tips.sections.length ≥ 5`.
- [ ] **Step 2: Chạy** `npm run test:unit` — Expected: FAIL.
- [ ] **Step 3: Soạn nội dung** theo spec Part 2 mục 2 và 6.1: `tips` (intro + ≥ 5 mục, mỗi mục ví dụ `[hanzi, pinyin, dịch]`), `tip` cho 4 dạng, và 10 câu `p2-001`…`p2-010` dạng Chi tiết (hội thoại đúng 2 lượt nam/nữ xen kẽ giữa các câu, 25–60 chữ Hán; câu hỏi 6–15 chữ; 4 đáp án khác nhau 2–12 chữ có đáp án nhiễu dùng từ trong hội thoại; đáp án đúng rải đều; mỗi `lines[]`, `question`, `options[]` có `pinyin` có dấu thanh đầy đủ và `vi`; `explain` nêu vì sao đáp án đúng và nhiễu sai). Tự soát: đếm chữ, từ ngoài HSK 4, pinyin khớp chữ, đáp án đúng khớp hội thoại.
- [ ] **Step 4: Tạo audio:** `$PY scripts/tts.py` — Expected: `Created 10, skipped 36`. Chạy lại — Expected: `Created 0, skipped 46`.
- [ ] **Step 5: Kiểm tra phát trong Chrome** (thẻ `Audio` tắt tiếng, `loadedmetadata`): 10 file đều tải, `duration` trong 8–40 s và gần tổng các đoạn.
- [ ] **Step 6: Chạy** `npm run test:unit` — Expected: PASS.
- [ ] **Step 7: Commit** `feat(listening): Part 2 tips and 10 detail questions with audio`.

### Task 5: Màn luyện `choice`

**Files:**
- Create: `src/components/ChoiceQuestion.jsx`
- Modify: `src/pages/ListeningPracticePage.jsx`, `src/styles.css`

**Interfaces — Consumes:** Task 1 (`partFormat`, `mixSize`, `correctLabel`, `promptOf`, `keyAction`), Task 4 (dữ liệu).
**Interfaces — Produces:** `ChoiceQuestion({ q, answered, onAnswer })` — 4 nút `fb-opt` xếp dọc "A. …" (chữ Hán to, tự xuống dòng), `onAnswer(index)`; sau trả lời nút chọn `correct`/`wrong`, nút đáp án đúng luôn `correct`; không bấm lại được. `ListeningPracticePage` chọn thành phần câu, `answer(given)` (`given` là boolean hoặc chỉ số), khung transcript, danh sách câu sai và nhãn "đáp án" theo `partFormat(part)`; `MIX_COUNT` cứng được thay bằng `mixSize(part)`.

- [ ] **Step 1: Cài đặt `ChoiceQuestion`** và sửa `ListeningPracticePage` theo spec mục 6.2: `progress` "Câu i / n · Nghe hội thoại rồi chọn đáp án đúng"; dưới audio liên kết "👁 Xem câu hỏi" (chỉ khi chưa trả lời; bấm hiện `q.question.text` chữ Hán, trạng thái này reset khi sang câu khác); sau trả lời khung `quiz-reveal` "✅ Đúng — đáp án: C" / "❌ Sai — đáp án: C" (`correctLabel`), khung transcript hiện hai lượt có nhãn "Nam"/"Nữ" theo `v` (chữ Hán, pinyin theo nút Ẩn/Hiện pinyin chung với Part 1, dịch), câu hỏi (chữ Hán + pinyin + dịch), bảng 4 đáp án (A–D, chữ Hán + pinyin + nghĩa, đáp án đúng ✔) và 💡 `explain`; kết quả: danh sách câu sai hiện `promptOf`+`correctLabel` (câu hỏi ★ cho truefalse giữ nguyên dạng cũ), hàng "✅ Đã nắm" của lượt ôn dùng `promptOf`. Phím tắt qua `keyAction({..., format})`: `'choose:N'` → `answer(N)`. Part 1 giữ hành vi và chữ hiển thị y như cũ.
- [ ] **Step 2: Chạy** `npm run test:unit && npm run build` — Expected: PASS, build xong không lỗi.
- [ ] **Step 3: Kiểm tra trong Chrome** `/listening/p2/practice/detail` (không xoá `localStorage`; dùng dữ liệu thử rồi để nguyên): audio tự phát sau thao tác (trực tiếp từ URL chỉ hiện ▶, không lỗi console); câu hỏi **không** hiện sẵn, "👁 Xem câu hỏi" hiện nó; bấm đáp án sai bằng chuột rồi `Enter` → sang câu 2 và audio câu 1 dừng; phím `3`/`c` chọn đúng nút; sau khi trả lời thấy hội thoại có nhãn Nam/Nữ, câu hỏi, 4 đáp án có pinyin + nghĩa, giải thích; lượt kết thúc có danh sách câu sai với "C. …" ; thẻ Luyện tổng hợp chạy `n = min(15, số câu)`; Part 1 `/listening/p1/practice/detail` vẫn như cũ (✔ 对 / ✘ 错); màn 375 px không cuộn ngang; thử ngắt mp3 (đổi `src`) vẫn trả lời được.
- [ ] **Step 4: Commit** `feat(listening): Part 2 choice practice screen`.

### Task 6: README + dừng cho người dùng nghe thử

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README:** cập nhật mô tả chuyên mục (Part II đã có), bảng Pages (`/listening/p2…`), mục dữ liệu & audio (trường `format`, câu `choice`, `tts.py --dry-run`, thời lượng nghỉ).
- [ ] **Step 2: Chạy** `npm run test:unit && npm run build && $PY scripts/tts.py --dry-run` — Expected: PASS, build xong, `Would create 0, skip 46`.
- [ ] **Step 3: Commit** `docs(listening): README for Part 2`.
- [ ] **Step 4: DỪNG.** Báo người dùng mở `/listening/p2` nghe thử 10 câu Chi tiết (hội thoại hai giọng, độ dài nghỉ, độ khó, mẹo, màn hình đáp án). Không làm Task 7 và không deploy trước khi người dùng đồng ý.

### Task 7: 30 câu còn lại (sau khi người dùng duyệt)

**Files:**
- Modify: `src/data/listening.json`; Create: `public/audio/listening/p2-011.mp3` … `p2-040.mp3`

- [ ] **Step 1: Soạn `p2-011`…`p2-020` (`reason`), `p2-021`…`p2-030` (`attitude`), `p2-031`…`p2-040` (`infer`)** cùng quy tắc và chất lượng Task 4 Step 3, thêm góp ý của người dùng ở Task 6; đáp án đúng rải đều trong từng dạng; dạng `infer` không nói thẳng đáp án.
- [ ] **Step 2: Chạy** `$PY scripts/tts.py` — Expected: `Created 30, skipped 46`.
- [ ] **Step 3: Chạy** `npm run test:unit && npm run build` — Expected: PASS (cân bằng chữ cái đáp án đủ 4 dạng).
- [ ] **Step 4: Kiểm tra trong Chrome:** hub Part 2 hiện 40 câu, thẻ hết mờ; luyện tổng hợp 15 câu đủ 4 dạng; mọi 40 mp3 tải được.
- [ ] **Step 5: Commit** `feat(listening): Part 2 reason, attitude and inference questions`.
