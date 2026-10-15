# Thiết kế: Chuyên mục Từ dễ nhầm (so sánh + luyện tập)

Ngày: 2026-10-15 · Trạng thái: đã duyệt thiết kế, chờ duyệt spec

## 1. Mục tiêu

Thêm chuyên mục thứ ba trên sidebar để **phân biệt các nhóm từ gần nghĩa nhưng cách dùng khác nhau** (vd. 所有 / 一切, 以为 / 认为, 却 / 而 / 但是), theo giáo trình HSK Standard Course 4, Bài 1–20.

Vòng ôn cho mỗi nhóm: **đọc bảng so sánh → làm bài chọn từ → sai thì tự đánh dấu "Cần ôn" → ôn lại các nhóm cần ôn** (theo bài hoặc gộp mọi bài).

**Thành công nghĩa là:** chọn một bài và thấy các nhóm từ của bài đó, mỗi nhóm có nghĩa chung, bảng so sánh theo tiêu chí, ví dụ có nghe đọc cho từng từ và mẹo nhớ; tìm nhanh một từ (hán tự hoặc pinyin không dấu) trên cả 20 bài; luyện chọn từ đúng trong nhóm; dấu "Đã nắm / Cần ôn" đồng bộ qua tài khoản như từ vựng và ngữ pháp; backend không đổi.

### Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Cách chia nội dung | Theo bài giáo trình (Bài 1–20), 3–5 nhóm mỗi bài; thêm ô tìm kiếm trên mọi bài |
| Nhóm từ | 2–3 từ mỗi nhóm |
| Dạng bài tập | Chỉ chọn từ điền chỗ trống; lựa chọn chính là các từ trong nhóm |
| Vị trí | Chuyên mục riêng trên sidebar `⚖️ Từ dễ nhầm`, đường dẫn `/compare` |
| Nguồn nội dung | Soạn thủ công vào `src/data/compare.json` |
| Tiến độ | Dấu `k`/`r` từng nhóm, dùng chung kho dấu với khoá `c:<id>`, đồng bộ tài khoản |
| Làm sai | Tự đặt "Cần ôn" cho nhóm của câu đó; làm đúng không tự đặt "Đã nắm" |
| Bài đang chọn | Dùng chung `lesson` trong `AppContext` |
| Bộ lọc | Riêng, lưu `localStorage` khoá `hsk4_compare_filter` |
| Cách làm code | Phương án B: tổng quát hoá vài hàm thuần đang có trong `grammar.js` (nhận `keyOf`) và tách `ChoiceBlank` thành component dùng chung; module và trang mới cho phần so sánh |
| Triển khai nội dung | Đợt 1: toàn bộ code + nội dung Bài 1–4; Bài 5–20 theo đợt sau |

### Không thay đổi

`vocab.json`, `practice.json`, `grammar.json`, `quiz.js`, các trang từ vựng, hành vi các trang ngữ pháp, hook `useMarks`/`useAccount`/`useSpeech`, backend `server/`, `functions/`, migration, cơ chế đồng bộ.

### Ngoài phạm vi (YAGNI)

Dạng bài đúng/sai, SRS cho nhóm từ, người dùng tự thêm cặp, liên kết chéo giữa các nhóm ngoài ô tìm kiếm, giữ lượt làm dở khi rời trang.

## 2. Dữ liệu: `src/data/compare.json`

Khoá là mã bài như `vocab.json` (`L1` … `L20`); giá trị là mảng nhóm. Bài chưa soạn thì không có khoá (hoặc mảng rỗng), trang hiện "Nội dung bài này đang được soạn".

```json
{
  "L6": [
    {
      "id": "6.1",
      "words": [["所有", "suǒyǒu"], ["一切", "yīqiè"]],
      "common": "Đều nghĩa là \"tất cả, toàn bộ\".",
      "rows": [
        ["Từ loại", "Tính từ (làm định ngữ)", "Đại từ"],
        ["Kết hợp", "Phải đứng trước danh từ: 所有的人", "Đứng một mình được: 一切都好"],
        ["Phạm vi", "Sự vật cụ thể, đếm được", "Cả sự vật trừu tượng: 一切困难"]
      ],
      "examples": [
        ["所有的学生都来了。", "Suǒyǒu de xuésheng dōu lái le.", "Tất cả học sinh đều đã đến.", 0],
        ["祝你一切顺利！", "Zhù nǐ yīqiè shùnlì!", "Chúc bạn mọi việc thuận lợi!", 1]
      ],
      "tip": "Đứng một mình làm chủ ngữ/tân ngữ → chỉ dùng 一切.",
      "questions": [
        { "q": "祝你___顺利！", "answer": "一切", "explain": "Đứng một mình làm chủ ngữ → 一切; 所有 phải đi kèm danh từ." }
      ]
    }
  ]
}
```

Trường của một nhóm:

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | chuỗi `"<bài>.<n>"` | Duy nhất toàn bộ; khoá dấu là `c:` + id (tối đa `c:20.5`) |
| `words` | mảng `[hán tự, pinyin]` | 2–3 từ khác nhau, theo thứ tự hiện trong bảng |
| `common` | chuỗi | Nghĩa chung / điểm giống nhau |
| `rows` | mảng `[tiêu chí, ô từ 1, ô từ 2, (ô từ 3)]` | Bảng so sánh; mỗi dòng có đúng 1 + số từ ô; ≥ 2 dòng |
| `examples` | mảng `[hán tự, pinyin, nghĩa, chỉ số từ]` | Chỉ số từ là vị trí trong `words`; mỗi từ ≥ 2 ví dụ |
| `tip` | chuỗi | Mẹo nhớ ngắn |
| `questions` | mảng `{ q, answer, explain }` | 4–6 câu; `q` có đúng một `___`; `answer` là một từ trong `words`; mỗi từ là đáp án ít nhất một lần; chỉ dùng câu mà chỉ một từ đúng |

Lựa chọn của câu hỏi không lưu trong dữ liệu: luôn là các từ của nhóm, xáo khi dựng lượt.

**Đặt nhóm vào bài nào:** bài có từ HSK4 mới nhất của nhóm. Từ HSK1–3 (认为, 刚才, 但是…) không có trong `vocab.json` nên không dùng làm căn cứ; mỗi nhóm phải có ít nhất một từ nằm trong danh sách từ của bài đó.

## 3. Giao diện và định tuyến

`SECTIONS` thêm `{ id: 'compare', path: '/compare', label: '⚖️ Từ dễ nhầm' }`. Chuyên mục có thanh tab con `CompareNav` (cùng kiểu `GrammarNav`): **⚖️ So sánh** (`/compare`) · **📝 Luyện tập** (`/compare/practice`); ở `/compare/review` tab "Luyện tập" sáng.

| Đường dẫn | `page` | Nội dung |
|---|---|---|
| `/compare` | `compare` | Tab bài, ô tìm, bộ lọc, danh sách nhóm |
| `/compare/practice` | `compare-practice` | Lượt luyện các nhóm của bài đang chọn (theo bộ lọc) |
| `/compare/review` | `compare-review` | Lượt luyện mọi nhóm "Cần ôn" của cả 20 bài, tối đa 30 câu |

Đường dẫn lạ dưới `/compare/...` về `/compare`. `sectionOf` trả `compare` cho cả ba trang (thứ tự kiểm tra: `compare`, `grammar`, còn lại `vocab`). `App.jsx` hiện `CompareNav` khi `sectionOf(route.page) === 'compare'`.

### Trang So sánh (`/compare`)

- `LessonTabs` với `progress` = số nhóm đã nắm / số nhóm của bài; bài chưa soạn hiện `—`.
- **Ô tìm kiếm**: khớp hán tự (chuỗi con) hoặc pinyin không phân biệt dấu thanh, hoa thường và khoảng trắng (`suoyou`, `suǒ yǒu` đều khớp 所有). Khi ô có chữ: hiện kết quả trên cả 20 bài (mỗi thẻ ghi "Bài n"), ẩn tác dụng của tab bài và bộ lọc; không có kết quả thì hiện "Không tìm thấy nhóm nào". Xoá ô thì trở lại bài đang chọn. Giá trị ô tìm không lưu.
- **Bộ lọc** Tất cả / Chưa đánh dấu / Cần ôn / Đã nắm, kèm số đếm; mục lọc rỗng thì hiện cả bài kèm ghi chú; đánh dấu không lọc lại ngay (như trang Ngữ pháp).
- **Thẻ `ComparePair`**: dòng đầu `所有 suǒyǒu ⇄ 一切 yīqiè` + dấu hiện tại; bấm để mở/đóng. Khi mở:
  - nghĩa chung (`common`);
  - **bảng so sánh**: cột đầu là tiêu chí, mỗi từ một cột, tiêu đề cột là từ + pinyin + 🔊;
  - ví dụ chia theo từng từ, mỗi câu có 🔊 (`speech.speak`), từ đang so sánh được tô đậm trong câu;
  - 💡 mẹo nhớ (`tip`);
  - nút **✅ Đã nắm / 🔁 Cần ôn** (bấm lại để bỏ dấu).
  - Trên điện thoại bảng cuộn ngang bên trong thẻ (`overflow-x: auto`), trang không cuộn ngang.
- Link `/compare#6.1`: nếu nhóm thuộc bài khác thì `selectLesson` trước, xoá ô tìm, thẻ mở sẵn, luôn hiện dù bộ lọc không khớp, cuộn tới trong `useEffect` bằng `document.getElementById` (giống `/grammar#1.3`). Id lạ thì bỏ qua.
- Nút **📝 Luyện tập bài này** → `/compare/practice`; **🔁 Ôn các nhóm cần ôn (n)** → `/compare/review` (ẩn khi n = 0).

### Trang Luyện tập

Giống trang luyện ngữ pháp, chỉ có một dạng câu:

- Tập câu: mọi câu của các nhóm được chọn, xáo trộn. `/compare/practice` lấy nhóm của bài đang chọn theo `hsk4_compare_filter` (rỗng thì cả bài, kèm ghi chú), đầu trang có `LessonTabs`. `/compare/review` lấy mọi nhóm `r`, tối đa 30 câu chia đều theo nhóm.
- Lượt dựng một lần khi mount; trang có `key={viewVersion}`.
- Lưới số câu, nút trước/sau, "Xem kết quả".
- Câu: dùng component chung `ChoiceBlank` (ô trống + nút lựa chọn, class `fb-opt`), lựa chọn là 2–3 từ của nhóm. Sau khi chọn: đúng/sai, `explain`, link "Xem so sánh" (`/compare#<id>`).
- Trả lời sai → `setMark('c:'+id, 'r')`.
- Màn kết quả: điểm số, danh sách nhóm có câu sai (link về so sánh), **🔁 Làm lại câu sai**, **Làm lượt mới**; ở `/compare/review` mỗi nhóm có nút **✅ Đã nắm**.
- Không có câu nào → thông báo và link về trang So sánh.

## 4. Mã nguồn

### File mới

| File | Việc |
|---|---|
| `src/compare.js` | Thuần, không React: `COMPARE`, `ALL_PAIRS`, `PAIR_BY_ID`, `pairsOf(lesson)`, `compareKey(id)`, `lessonOf(id)`, bộ lọc (`loadCompareFilter`/`saveCompareFilter`), `searchPairs(query)`, `toneless(s)`, `buildCompareQuiz(pairs, { max })` (gắn `options` = các từ của nhóm rồi dùng hàm dựng lượt chung), `reviewPairs`, `compareProgress`, `validateCompare(data, vocab)` |
| `src/pages/ComparePage.jsx` | Trang So sánh |
| `src/pages/ComparePracticePage.jsx` | Lượt luyện (nhận `scope`: `lesson` hoặc `review`) |
| `src/components/ComparePair.jsx` | Một thẻ nhóm từ |
| `src/components/CompareNav.jsx` | Thanh tab con So sánh / Luyện tập |
| `src/components/ChoiceBlank.jsx` | Câu chọn từ điền trống, tách từ `GrammarPracticePage.jsx` |
| `src/data/compare.json` | Nội dung |
| `tests/compare.test.mjs` | Test logic và dữ liệu |

### File sửa

| File | Thay đổi |
|---|---|
| `src/grammar.js` | `filterPoints`, `countPoints` nhận thêm tham số `keyOf` (mặc định `grammarKey`, nên lời gọi cũ không đổi); tách phần dựng lượt round-robin thành hàm chung `buildRoundRobin(items, prepare, { max, rng })` dùng cho cả `buildGrammarQuiz` và `buildCompareQuiz`. Hành vi ngữ pháp giữ nguyên, test cũ phải qua |
| `src/pages/GrammarPracticePage.jsx` | Import `ChoiceBlank` từ file mới |
| `src/routes.js` | `SECTIONS` thêm `compare`, `COMPARE_PAGES`, tiêu đề trang, `matchCompare`, `sectionOf` |
| `src/App.jsx` | Render các trang so sánh (trang luyện có `key={viewVersion}`), `CompareNav` |
| `src/styles.css` | Kiểu cho bảng so sánh, ô tìm, thẻ nhóm (dùng lại token màu sẵn có, đủ sáng/tối) |
| `tests/router.test.mjs` | Test các đường dẫn mới |
| `package.json` | Thêm `tests/compare.test.mjs` vào `test:unit` |
| `README.md` | Mô tả chuyên mục, đường dẫn và định dạng `compare.json` |

### Tiến độ và đồng bộ

Dùng `marks` từ `useApp()` với khoá `c:<id>`. Khoá hợp lệ với API (`word.length ≤ 12`); tổng mục ước tính 621 từ + 100 điểm ngữ pháp + ~80 nhóm ≈ 800 < `MAX_WORDS` 1000. Bộ đếm/bộ lọc từ vựng và ngữ pháp chỉ duyệt danh sách của chúng nên không bị ảnh hưởng.

## 5. Kiểm thử

`npm run test:unit`:

- **Router:** `/compare`, `/compare/practice`, `/compare/review` khớp đúng; `/compare/xyz` về `/compare`; `sectionOf` đúng cho cả ba chuyên mục; đường dẫn cũ không đổi.
- **Logic:** `toneless('suǒ yǒu') === 'suoyou'`; `searchPairs` khớp hán tự, pinyin có/không dấu, rỗng khi không khớp; `buildCompareQuiz` có `options` đúng bằng tập từ của nhóm và chứa `answer`, giới hạn `max` chia đều theo nhóm; `filterPoints`/`countPoints` với `keyOf` của so sánh; mọi test ngữ pháp cũ vẫn qua.
- **Dữ liệu** (mọi bài đã soạn): khoá bài có trong `vocab.json`; bài đã soạn có 3–5 nhóm; id duy nhất, đúng dạng `<bài>.<n>` theo thứ tự; 2–3 từ khác nhau; các trường chữ không rỗng; mỗi dòng `rows` có 1 + số từ ô và có ≥ 2 dòng; mỗi từ ≥ 2 ví dụ, chỉ số từ hợp lệ, câu ví dụ chứa từ đó; 4–6 câu hỏi, đúng một `___`, `answer` thuộc `words`, mỗi từ là đáp án ít nhất một lần; ít nhất một từ của nhóm có trong từ vựng của bài đó.

Thủ công (Playwright, `npm run dev`): sidebar có mục mới và chuyển qua lại được; `/compare` Bài 1 mở thẻ, nghe từ và ví dụ, đánh dấu; tìm `suoyou` ra nhóm 所有/一切 ở bài khác, xoá ô thì về bài cũ; Luyện tập làm sai một câu → nhóm thành "Cần ôn"; từ `/compare/review` bấm "Xem so sánh" của nhóm bài khác → chuyển bài, thẻ mở và cuộn tới; bề rộng 375px không cuộn ngang trang; chế độ tối; F5 và Back/Forward đúng; các trang ngữ pháp vẫn hoạt động.

## 6. Kế hoạch nội dung

- **Đợt 1** (cùng code): Bài 1–4, khoảng 15 nhóm. Người dùng dùng thử và góp ý định dạng trước khi soạn tiếp.
- **Các đợt sau:** Bài 5–20, mỗi đợt 4 bài, mỗi đợt một commit, test dữ liệu phải qua.
- Chọn nhóm từ từ vựng của bài và các từ dễ nhầm đã nêu trong mục "Lưu ý" của `grammar.json` (刚/刚才, 以为/认为, 却/而/但是…). Ví dụ và câu hỏi ưu tiên dùng từ vựng của bài đó và các bài trước. Nội dung viết bằng tiếng Việt, không chép nguyên văn từ nguồn tham khảo.
