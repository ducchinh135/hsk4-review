# Chuyên mục Nghe hiểu — Part 1 判断对错 — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chuyên mục `🎧 Nghe hiểu` (`/listening`) để luyện riêng Part 1 判断对错 của bài nghe HSK 4: trang chọn bài dạng thẻ, trang mẹo, lượt luyện theo dạng / tổng hợp / ôn câu sai với audio mp3 tạo sẵn, chấm ngay, transcript + giải thích; câu sai thành "Cần ôn" và đồng bộ qua tài khoản.

**Architecture:** Dữ liệu và logic thuần trong `src/listening.js` + `src/data/listening.json` (test bằng Node như `compare.js`). Audio do `scripts/tts.py` (edge-tts) tạo một lần vào `public/audio/listening/<id>.mp3`, phát bằng thẻ `<audio>`. Trang mới theo đúng khung và lớp CSS của `PracticeHub` và `ComparePracticePage`; dấu dùng chung `useMarks` với khoá `l:<id>`.

**Tech Stack:** React 18 + Vite, `node:test`, Python 3 + `edge-tts` (chỉ để tạo audio, không vào `package.json`).

**Spec:** `docs/superpowers/specs/2026-10-19-listening-part1-design.md` — đọc cả spec, nhất là mục 2 (quy tắc soạn đề), 4 (âm thanh), 6 (màn hình).

## Global Constraints

- Chữ hiển thị tiếng Việt, đúng các nhãn trong spec mục 6 (vd. "✔ 对 · Đúng", "✘ 错 · Sai", "🔁 Nghe lại", "Câu 3 / 12 · Nghe rồi chọn Đúng hay Sai", "Sắp có").
- Không đổi backend (`server/`, `functions/`, `migrations/`), `useMarks`/`useAccount`/`useSpeech`, nội dung/hành vi các chuyên mục khác.
- Khoá dấu `l:<id>`, id câu `p1-` + 3 chữ số (`/^p1-\d{3}$/`), không bao giờ đổi id đã phát hành.
- Giọng: nữ `zh-CN-XiaoxiaoNeural`, nam `zh-CN-YunxiNeural`; file = đoạn nghe (giọng `voice`) → im lặng ~1.5 s → câu ★ (giọng còn lại).
- Tốc độ phát `[0.8, 1, 1.25]`, mặc định 1; `localStorage` khoá `hsk4_listen_rate`; bật/tắt pinyin transcript khoá `hsk4_listen_pinyin` (mặc định bật). Mọi truy cập `localStorage` bọc try/catch như `Sidebar.jsx`.
- Ôn câu sai tối đa 30 câu; luyện tổng hợp 10 câu.
- Đề tự soạn theo spec mục 2; không chép đề STUDY4 hay nguồn khác.
- Commit message tiếng Anh dạng `feat(listening): …`, kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Trình duyệt chặn tự phát (vào thẳng URL lượt luyện, chưa bấm gì) → không lỗi đỏ, chỉ hiện nút ▶ chờ bấm (Task 6: `play()` reject được bắt).
2. Chuyển câu khi audio câu trước đang phát → audio cũ dừng, không chồng tiếng (Task 6: `AudioPlayer` remount theo `key`, dừng khi unmount).
3. File mp3 thiếu/lỗi → "⚠️ Không tải được audio", vẫn trả lời và xem transcript được (Task 6).
4. Dạng chưa có câu (giữa bước duyệt) → thẻ mờ "Sắp có", URL lượt của dạng đó không vỡ, mix chỉ rút từ dạng có câu (Task 1 test `buildMix` với dạng rỗng; Task 4 thẻ `off`; Task 6 lượt rỗng hiện thông báo).
5. Phím tắt `1`/`2`/`←`/`→`/`Enter` không được bắt khi đang gõ trong ô nhập (AuthModal mở) → bỏ qua sự kiện có `target` là `input`/`textarea` (Task 6).

---

### Task 1: Module dữ liệu `src/listening.js` + khung `listening.json`

**Files:**
- Create: `src/data/listening.json` — `parts[0]` = Part 1 với `id`, `name`, `label`, `desc`, `tips` (để `{ "intro": "", "sections": [] }`, Task 2 điền), `types` (3 dạng `detail` 🔢 "Chi tiết", `attitude` 💬 "Thái độ, ý kiến", `infer` 🧠 "Suy luận, ý chính", có `desc` theo bản phác, `tip` để trống), `questions: []`. Định dạng đúng spec mục 3.
- Create: `src/listening.js`
- Create: `tests/listening.test.mjs`
- Modify: `package.json` — thêm `tests/listening.test.mjs` vào `test:unit`.

**Interfaces — Produces:**
- `PART_TABS: {id, label}[]` = `[{id:'p1',label:'① 判断对错'},{id:'p2',label:'② 选择正确答案'},{id:'p3',label:'③ 对话 · 短文'}]`
- `PARTS` (mảng `parts` của JSON), `partById(id) → part | undefined`
- `QUESTION_BY_ID: {[id]: question}` (mỗi câu thêm sẵn `partId`)
- `listenKey(id) → 'l:' + id`
- `audioUrl(id) → '/audio/listening/' + id + '.mp3'`
- `questionsOf(part, typeId?) → question[]` (không có `typeId` = cả part)
- `typeCount(part) → {[typeId]: number}`
- `buildRun(questions, { max = Infinity, rng = Math.random }) → question[]` — xáo trộn, cắt `max`
- `buildMix(part, n = 10, rng = Math.random) → question[]` — xoay vòng giữa các dạng **có câu** (thứ tự dạng xáo trộn, câu trong dạng xáo trộn), không trùng, độ dài `min(n, tổng)`
- `reviewQuestions(getMark, part) → question[]` — câu có dấu `'r'`, theo thứ tự id
- `RATES = [0.8, 1, 1.25]`, `loadRate() → number`, `saveRate(r)`, `loadShowPinyin() → boolean`, `saveShowPinyin(b)`
- `validateListening(data) → string[]` (rỗng = hợp lệ; thông báo tiếng Việt như `validateCompare`)

- [ ] **Step 1: Viết test thất bại** trong `tests/listening.test.mjs`:
  - `validateListening(RAW)` (import JSON thật) `deepEqual []`.
  - `validateListening` báo lỗi cho: id sai mẫu (`'p1-7'`), id trùng, `type` không có trong `types`, `answer` không phải boolean (`'false'`), `voice` ngoài `f`/`m`, thiếu/rỗng một trong `text`, `pinyin`, `vi`, `statement`, `statementPinyin`, `explain`, và dạng có ≥ 2 câu mà toàn cùng một đáp án. Mỗi trường hợp: `assert.ok(errors.some(e => e.includes('<id>')))`.
  - `listenKey('p1-007') === 'l:p1-007'` và độ dài ≤ 12.
  - `buildMix` với part giả 3 dạng (5, 5, 0 câu): `n=10` → 10 câu, id không trùng, không câu nào thuộc dạng rỗng; part giả tổng 4 câu → 4 câu; part không câu → `[]`; với `n=4` và 2 dạng 5 câu, mỗi dạng có đúng 2 câu.
  - `buildRun(qs, {max: 3})` → 3 câu, đều thuộc `qs`; không `max` → đủ, cùng tập id.
  - `reviewQuestions` với `getMark` giả (`l:p1-002` = `'r'`, `l:p1-001` = `'k'`) chỉ trả `p1-002`.
- [ ] **Step 2: Chạy** `node --test tests/listening.test.mjs` — Expected: FAIL (module chưa có).
- [ ] **Step 3: Viết `src/listening.js`** theo Interfaces (import JSON `with { type: 'json' }`, `shuffle` từ `./random.js`, không React/DOM). `loadRate` trả 1 nếu giá trị lưu không thuộc `RATES`.
- [ ] **Step 4: Chạy** `npm run test:unit` — Expected: PASS toàn bộ.
- [ ] **Step 5: Commit** `feat(listening): data module and Part 1 skeleton`.

### Task 2: Nội dung — mẹo Part 1 + 12 câu dạng Chi tiết

**Files:**
- Modify: `src/data/listening.json`

- [ ] **Step 1: Viết `tips`** của Part 1 (spec mục 6.2, nội dung tối thiểu: định dạng phần 1, đọc câu ★ trước và đoán từ khoá, bẫy phủ định 不/没, số và thời gian, 本来/打算 vs thực tế, 不一定/差不多/几乎, từ đồng nghĩa, lỡ một đoạn thì sao), 4–6 `sections`, mỗi mục 1–3 ví dụ `[hanzi, pinyin, dịch]`; và `tip` của cả 3 dạng (2–4 câu tiếng Việt mỗi dạng).
- [ ] **Step 2: Soạn 12 câu `type: "detail"`** `p1-001` … `p1-012` đúng quy tắc spec mục 2: đoạn 40–80 chữ, câu ★ 8–20 chữ, 5–7 câu `answer: true`, `voice` xen kẽ `f`/`m`, chủ đề khác nhau, pinyin có dấu thanh đầy đủ (cả `pinyin` và `statementPinyin`), `explain` chỉ rõ cụm từ quyết định đáp án.
- [ ] **Step 3: Tự soát** từng câu: đếm chữ đoạn nghe, từ ngoài HSK 4 (nếu có thì thay), câu đúng không chép nguyên văn, câu sai sai rõ một chi tiết, pinyin khớp từng chữ.
- [ ] **Step 4: Chạy** `npm run test:unit` — Expected: PASS (validator thấy dạng `detail` có cả đúng lẫn sai).
- [ ] **Step 5: Commit** `feat(listening): Part 1 tips and 12 detail questions`.

### Task 3: Script tạo audio + 12 file mp3

**Files:**
- Create: `scripts/tts.py`
- Create: `public/audio/listening/p1-001.mp3` … `p1-012.mp3`, `public/audio/listening/manifest.json`
- Modify: `tests/listening.test.mjs`

**Interfaces — Consumes:** `listening.json` (Task 1/2).

- [ ] **Step 1: Viết test thất bại:** mọi câu trong `listening.json` có file `public/audio/listening/<id>.mp3` kích thước > 1000 byte (`fs.statSync`, đường dẫn tính từ `import.meta.url`).
- [ ] **Step 2: Chạy** `npm run test:unit` — Expected: FAIL (thiếu file).
- [ ] **Step 3: Viết `scripts/tts.py`:** `python3 scripts/tts.py [--force] [--rate=-5%]`. Mỗi câu: khoá băm `sha1(voice|text|statement|rate)`; bỏ qua nếu manifest có cùng khoá và file tồn tại, trừ khi `--force`. Tạo đoạn nghe bằng giọng `voice`, câu ★ bằng giọng còn lại (`edge_tts.Communicate(...).save` hoặc gom `stream()`), ghép đoạn nghe + im lặng 1.5 s + câu ★. Im lặng mặc định: frame MP3 rỗng cùng định dạng mặc định của edge-tts (MPEG-2 Layer III, 24 kHz, 48 kbps, mono → header `FF F3 64 C4` hoặc giá trị đúng theo frame thực tế đọc từ file edge-tts trả về, 144 byte/frame, 24 ms/frame → 63 frame). Ghi manifest `{id: hash}`. In "Created N, skipped M". Nếu `pip install edge-tts` chưa có thì in hướng dẫn và thoát mã 1.
- [ ] **Step 4: Cài và chạy** `pip3 install edge-tts && python3 scripts/tts.py` — Expected: "Created 12, skipped 0"; chạy lại → "Created 0, skipped 12".
- [ ] **Step 5: Kiểm tra phát** trong Chrome (dev server `npx vite`, mở `/audio/listening/p1-001.mp3` hoặc dùng `evaluate_script` tạo `new Audio(url)`, chờ `loadedmetadata`): không `error`, `duration` ≈ tổng (đoạn + 1.5 s + câu ★, thường 8–20 s) cho 3 file bất kỳ. Nếu không đạt: `brew install ffmpeg`, chuyển ghép sang `ffmpeg -f concat`, chạy lại với `--force`.
- [ ] **Step 6: Chạy** `npm run test:unit` — Expected: PASS.
- [ ] **Step 7: Commit** `feat(listening): edge-tts audio script and Part 1 detail audio`.

### Task 4: Đường dẫn, sidebar, tab, trang chọn bài

**Files:**
- Modify: `src/routes.js`, `src/App.jsx`, `tests/router.test.mjs`
- Create: `src/components/ListeningNav.jsx`, `src/pages/ListeningHubPage.jsx`

**Interfaces:**
- Consumes: `PART_TABS`, `PARTS`, `partById`, `questionsOf`, `typeCount`, `reviewQuestions`, `listenKey` (Task 1).
- Produces — trang (`route.page`) và `params`:
  - `listening-hub` `{part}` ← `/listening`, `/listening/p1`
  - `listening-tips` `{part}` ← `/listening/p1/tips`
  - `listening-practice` `{part, type}` ← `/listening/p1/practice/<detail|attitude|infer|mix>`
  - `listening-review` `{part}` ← `/listening/p1/review`
  - Mọi đường dẫn `/listening/...` khác (part lạ, type lạ, thừa đoạn) → `listening-hub` `{part:'p1'}`, path `/listening/p1`.
  - `SECTIONS` thêm `{ id: 'listening', path: '/listening/p1', label: '🎧 Nghe hiểu' }` cuối danh sách; `sectionOf` trả `'listening'` cho trang bắt đầu bằng `listening`; `PAGE_TITLES`: hub "Nghe hiểu", tips "Mẹo nghe hiểu", practice "Luyện nghe", review "Ôn câu nghe sai".

- [ ] **Step 1: Viết test thất bại** trong `tests/router.test.mjs`: từng đường dẫn trên → đúng `{page, params, path}` (dùng `deepEqual`); 5 đường dẫn lạ (`/listening/p2`, `/listening/p1/practice/xyz`, `/listening/p1/tips/x`, `/listening/P1`, `/listening/p1/review/1`) → hub p1; sửa test `SECTIONS` thành `['vocab','grammar','compare','listening']`; `sectionOf` cho 4 trang mới; mọi trang mới có `PAGE_TITLES`.
- [ ] **Step 2: Chạy** `npm run test:unit` — Expected: FAIL.
- [ ] **Step 3: Sửa `routes.js`** (thêm `matchListening`, part hợp lệ = id trong `PARTS`, type hợp lệ = id trong `types` của part + `'mix'`).
- [ ] **Step 4: Chạy** `npm run test:unit` — Expected: PASS.
- [ ] **Step 5: `ListeningNav`** theo mẫu `CompareNav`: 3 tab từ `PART_TABS`; part có trong `PARTS` là `Link` tới `/listening/<id>` (active khi `params.part` trùng); part chưa có là `<span className="nav-tab off" title="Sắp có" aria-disabled="true">` (thêm CSS `.nav-tab.off{opacity:.45;cursor:default}`). `App.jsx`: hiện `ListeningNav` khi section `listening`, thêm 4 nhánh trong `Page` (key gồm `viewVersion` và params như các trang khác); trang tips/practice tạm là stub ở task này nếu chưa có.
- [ ] **Step 6: `ListeningHubPage({ part })`** theo spec 6.1 và bản phác ①: `exercise-summary` có tổng câu (đếm) và số câu cần ôn; thẻ `exercise-card` Mẹo → `/listening/p1/tips`; 3 thẻ dạng → `practice/<type>` với "N câu · K cần ôn" hoặc thẻ `off` "Sắp có" khi N = 0; thẻ 🎯 Luyện tổng hợp (off khi part 0 câu); thẻ 🔁 Ôn câu sai "N câu cần ôn" hoặc off "Chưa có câu nào cần ôn 🎉".
- [ ] **Step 7: Kiểm tra trong Chrome** `/listening` → URL thành `/listening/p1`, sidebar có 🎧 Nghe hiểu active, tab ②③ mờ, thẻ Thái độ/Suy luận mờ "Sắp có", thẻ Chi tiết "12 câu · 0 cần ôn". `npm run build` không lỗi.
- [ ] **Step 8: Commit** `feat(listening): routes, section nav and Part 1 hub`.

### Task 5: Trang mẹo

**Files:**
- Create: `src/pages/ListeningTipsPage.jsx`
- Modify: `src/App.jsx` (thay stub), `src/styles.css` (chỉ lớp mới cần, vd. `.lp-tip`)

**Interfaces — Consumes:** `partById`, `typeCount`; `useApp().speech` (`speech.supported`, `speech.speak(text, id)`, `speech.speakingId`).

- [ ] **Step 1: Viết `ListeningTipsPage({ part })`** theo spec 6.2: `exercise-top` "← Part 1"; `intro`; mỗi `section` (tiêu đề, nội dung, ví dụ chữ Hán + pinyin + dịch, nút `speak-btn mini` 🔊 khi `speech.supported`); mẹo 3 dạng, mỗi dạng nút "Luyện dạng này ▶" (ẩn nút nếu dạng 0 câu).
- [ ] **Step 2: Kiểm tra trong Chrome** `/listening/p1/tips`: đủ mục, bấm 🔊 đọc ví dụ, nút luyện dẫn đúng URL; màn rộng 375 px không cuộn ngang.
- [ ] **Step 3: Commit** `feat(listening): Part 1 tips page`.

### Task 6: Lượt luyện — audio, câu 对/错, kết quả, ôn câu sai

**Files:**
- Create: `src/components/AudioPlayer.jsx`, `src/components/TrueFalseQuestion.jsx`, `src/pages/ListeningPracticePage.jsx`
- Modify: `src/App.jsx` (thay stub), `src/styles.css` (`.lp-audio`, `.lp-track`, `.lp-star`, `.lp-tf`, `.lp-trans` — lấy từ bản phác `.superpowers/brainstorm/35761-1792428503/content/part1-app-v3.html`)

**Interfaces:**
- Consumes: `partById`, `questionsOf`, `buildRun`, `buildMix`, `reviewQuestions`, `listenKey`, `audioUrl`, `RATES`, `loadRate`, `saveRate`, `loadShowPinyin`, `saveShowPinyin` (Task 1); `useApp().marks` (`getMark`, `setMark`, `toggleMark`).
- Produces:
  - `AudioPlayer({ src, autoPlay })` — dùng `key` để remount theo câu; ▶/⏸, thanh tiến độ (chỉ hiển thị), `mm:ss / mm:ss`, 🔁 Nghe lại (`currentTime = 0; play()`), nút tốc độ xoay vòng `RATES` (lưu `saveRate`, áp `playbackRate` cả khi `loadedmetadata`); `play()` reject → im lặng, giữ nút ▶; `error` → "⚠️ Không tải được audio"; unmount → `pause()`.
  - `TrueFalseQuestion({ q, answered, onAnswer })` — câu ★ (`lp-star`), 2 nút `fb-opt` "✔ 对 · Đúng" (`true`) / "✘ 错 · Sai" (`false`); sau trả lời: nút đã chọn `correct`/`wrong`, nút đáp án đúng luôn `correct`; không bấm lại được.
  - `ListeningPracticePage({ part, scope, type })` — `scope`: `'type' | 'mix' | 'review'`.

- [ ] **Step 1: Viết `ListeningPracticePage`** theo mẫu `ComparePracticePage` (trạng thái `{questions, run, index, answers, showDone}`, `restart`, `go`, `finish`), spec 6.3 và 6.4:
  - Câu hỏi: `type` → `buildRun(questionsOf(part, type))`; `mix` → `buildMix(part, 10)`; `review` → `buildRun(reviewQuestions(getMark, part), { max: 30 })`. Dựng một lần khi mount.
  - Lượt rỗng: khung `quiz-done` với "Chưa có câu nào cần ôn. 🎉" (review) hoặc "Dạng này đang được soạn." + nút "← Part 1".
  - Trả lời sai → `setMark(listenKey(id), 'r')` nếu chưa `'r'`.
  - Khung `quiz-reveal ok|bad`: "✅ Đúng — đáp án: 对|错" / "❌ Sai — đáp án: 对|错"; transcript `text` (+ `pinyin` khi bật, nút "Ẩn pinyin/Hiện pinyin"), câu ★ + `statementPinyin`, `vi`, "💡 " + `explain`.
  - `AudioPlayer` với `key={run + ':' + index}`, `autoPlay` chỉ khi câu chưa trả lời.
  - Phím tắt (`keydown` trên `window`, bỏ qua khi `e.target` là `input`/`textarea`/`select` hoặc có `isComposing`): `1`/`ArrowLeft` = 对, `2`/`ArrowRight` = 错 khi chưa trả lời; `Enter` = câu tiếp / xem kết quả khi đã trả lời.
  - Kết quả: như `ComparePracticePage` nhưng danh sách câu sai là câu ★ + đáp án, bấm để `go(i)`; nút 🔁 Làm lại câu sai (`buildRun(wrongQs)`) · 🔀 Làm lượt mới · "← Part 1"; scope `review` thêm hàng "✅ Đã nắm" từng câu (`toggleMark(listenKey(id), 'k')`) như `ComparePracticePage`.
  - "Danh sách câu" (`question-grid-*`) như hiện có.
  - `exercise-top`: "← Part 1" + "Part 1 · 🔢 Chi tiết · 12 câu" / "Part 1 · 🎯 Luyện tổng hợp · 10 câu" / "Part 1 · 🔁 Ôn câu sai · N câu".
- [ ] **Step 2: `npm run build`** — Expected: không lỗi.
- [ ] **Step 3: Kiểm tra trong Chrome** (`npx vite`):
  - Vào lượt Chi tiết từ trang chọn bài: audio tự phát; chọn sai → đỏ, đáp án đúng xanh, transcript hiện; Enter → câu tiếp, audio câu trước dừng.
  - Tốc độ 1.25× vẫn giữ sau khi chuyển câu và sau khi tải lại trang.
  - Tải lại thẳng URL lượt → không lỗi console, nút ▶ bấm phát được (Review Focus 1).
  - Đổi tạm `audioUrl` sai trong DevTools (hoặc chặn request) → "⚠️ Không tải được audio", vẫn trả lời được (Review Focus 3).
  - Làm hết → kết quả; câu sai hiện ở trang chọn bài "K cần ôn"; vào Ôn câu sai thấy đúng các câu đó; bấm ✅ Đã nắm → quay lại trang chọn bài số giảm.
  - Màn 375 px: hai nút 对/错 và thanh audio không tràn ngang.
- [ ] **Step 4: Chạy** `npm run test:unit` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(listening): Part 1 practice runs with audio`.

### Task 7: README + dừng để người dùng duyệt

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README:** thêm đoạn mô tả chuyên mục Nghe hiểu, các dòng `/listening/...` vào bảng Pages, mục "Tạo audio nghe hiểu" (cài `pip3 install edge-tts`, `python3 scripts/tts.py`, `--force` / `--rate`, cách ghép đã dùng ở Task 3).
- [ ] **Step 2: Chạy** `npm run test:unit && npm run build` — Expected: PASS, build xong.
- [ ] **Step 3: Commit** `docs(listening): README for the listening section`.
- [ ] **Step 4: DỪNG.** Báo người dùng mở `/listening/p1` nghe thử 12 câu Chi tiết; hỏi về độ khó, giọng, tốc độ (`rate`), nội dung. Sửa theo góp ý (đổi `rate` → `python3 scripts/tts.py --force --rate=…`), commit `fix(listening): …`. Không làm Task 8 trước khi người dùng đồng ý.

### Task 8: 24 câu Thái độ + Suy luận (sau khi người dùng duyệt)

**Files:**
- Modify: `src/data/listening.json`
- Create: `public/audio/listening/p1-013.mp3` … `p1-036.mp3` (manifest cập nhật)

- [ ] **Step 1: Soạn `p1-013` … `p1-024`** `type: "attitude"` và `p1-025` … `p1-036` `type: "infer"`, cùng quy tắc Task 2 Step 2–3 và góp ý của người dùng ở Task 7.
- [ ] **Step 2: Chạy** `python3 scripts/tts.py` — Expected: "Created 24, skipped 12".
- [ ] **Step 3: Chạy** `npm run test:unit && npm run build` — Expected: PASS.
- [ ] **Step 4: Kiểm tra trong Chrome:** thẻ Thái độ và Suy luận hết mờ, "12 câu"; Luyện tổng hợp 10 câu có đủ 3 dạng (3–4 câu mỗi dạng).
- [ ] **Step 5: Commit** `feat(listening): Part 1 attitude and inference questions`.
