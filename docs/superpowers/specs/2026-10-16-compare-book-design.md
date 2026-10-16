# Thiết kế: Từ dễ nhầm theo 125 nhóm từ của sách (thay cách chia theo bài)

Ngày: 2026-10-16 · Trạng thái: đã duyệt thiết kế trong chat, chờ duyệt spec

Thay thế phần nội dung và cách tổ chức của [2026-10-15-compare-design.md](2026-10-15-compare-design.md). Những gì spec đó không nhắc lại ở đây (cơ chế đánh dấu, đồng bộ, luyện tập, `ChoiceBlank`, `buildRoundRobin`…) giữ nguyên.

## 1. Mục tiêu

Chuyên mục `⚖️ Từ dễ nhầm` (`/compare`) không còn chia theo Bài 1–20 của HSK4. Nó gồm **125 nhóm từ đồng nghĩa, gần nghĩa** lấy từ mục lục cuốn *So sánh 125 nhóm từ đồng nghĩa, gần nghĩa thường gặp trong tiếng Hoa* (bản scan PDF, 224 trang, `/Users/mac/Downloads/[Xixi]_So Sánh 125 Nhóm Từ Đồng Nghĩa…pdf`), xếp theo chữ cái pinyin như mục lục sách.

**Thành công nghĩa là:** chọn một chữ cái và thấy các nhóm của chữ đó; mỗi nhóm có nghĩa chung, bảng so sánh theo tiêu chí, ví dụ có nghe đọc và mẹo nhớ; tìm nhanh một từ (hán tự hoặc pinyin không dấu) trên cả 125 nhóm; luyện chọn từ đúng trong nhóm; dấu "Đã nắm / Cần ôn" đồng bộ qua tài khoản; backend không đổi.

### Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Vai trò của sách | Nguồn danh sách nhóm; nội dung (bảng, ví dụ, câu hỏi, mẹo) do ta **tự viết lại bằng lời của mình**, không chép nguyên văn (sách có bản quyền) |
| Cách chia | Theo chữ cái đầu pinyin như mục lục (A, B, C … Z), không theo bài |
| Mã nhóm | `001` … `125` đúng số thứ tự trong mục lục sách |
| Số từ mỗi nhóm | 2–5 (sách có nhóm 4–5 từ, vd. [014] 别/别的/另/另外, [113] 向来/一向/一直/从来) |
| Nhóm có mục con | Giữ đúng một nhóm theo số mục lục, kể cả khi sách ghi một nhóm gồm vài biến thể (vd. [070] 看来/看起来/看样子/看上去) |
| Tiến độ | Dấu `k`/`r` từng nhóm, khoá `c:<mã>` (vd. `c:051`), cùng kho dấu và đồng bộ như cũ |
| Dấu cũ `c:1.1` … `c:4.4` | Bỏ qua (không xoá, không đọc); 16 nhóm tự soạn trước đây bị thay hẳn bằng nhóm theo sách |
| Chữ cái đang chọn | Lưu riêng cho chuyên mục này, `localStorage` khoá `hsk4_compare_letter`; không dùng `lesson` của `AppContext` nữa |
| Bộ lọc | Giữ nguyên `hsk4_compare_filter` |
| Triển khai nội dung | Theo đợt chữ cái, mỗi đợt một commit; đợt 1 là các nhóm A–B (001–023) |

### Không thay đổi

`vocab.json`, `practice.json`, `grammar.json`, `quiz.js`, các trang từ vựng và ngữ pháp, hook `useMarks`/`useAccount`/`useSpeech`, backend `server/`, `functions/`, migration, cơ chế đồng bộ, `ChoiceBlank`, `buildRoundRobin`.

### Ngoài phạm vi (YAGNI)

Chế độ xem theo bài song song; nhóm ngoài 125 nhóm của sách; dạng bài đúng/sai; SRS; liên kết chéo giữa các nhóm; di chuyển dấu cũ sang khoá mới; OCR toàn bộ sách.

## 2. Dữ liệu: `src/data/compare.json`

Mảng phẳng các nhóm, theo thứ tự `id` tăng dần. Chưa soạn tới đâu thì file dừng tới đó (xem §6).

```json
[
  {
    "id": "096",
    "letter": "R",
    "words": [["认为", "rènwéi"], ["以为", "yǐwéi"]],
    "common": "Đều dùng để nêu một suy nghĩ, nhận định.",
    "rows": [
      ["Sắc thái", "Trung tính, nhận định có cơ sở", "Nghĩ như vậy nhưng sự thật lại khác"],
      ["Gợi ý", "Có thể đứng trước ý kiến chính thức", "Thường kèm 其实 / 没想到 ở vế sau"]
    ],
    "examples": [
      ["我认为这个办法很好。", "Wǒ rènwéi zhège bànfǎ hěn hǎo.", "Tôi cho rằng cách này rất hay.", 0],
      ["我以为他走了，其实他还在。", "Wǒ yǐwéi tā zǒu le, qíshí tā hái zài.", "Tôi tưởng anh ấy đi rồi, thật ra anh ấy còn ở đây.", 1]
    ],
    "tip": "Nghĩ sai so với thực tế → 以为.",
    "questions": [
      { "q": "我___他在家，没想到他出去了。", "answer": "以为", "explain": "Kết quả trái với suy nghĩ ban đầu → 以为." }
    ]
  }
]
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | chuỗi 3 chữ số `"001"`–`"125"` | Duy nhất; đúng số mục lục; khoá dấu là `c:` + id (5 ký tự) |
| `letter` | một chữ in hoa `A`–`Z` | Chữ cái đầu pinyin theo mục lục sách; khớp với `id` (xem bảng §2.1) |
| `words` | mảng `[hán tự, pinyin]` | 2–5 từ khác nhau, theo thứ tự trong mục lục |
| `common` | chuỗi | Nghĩa chung / điểm giống nhau |
| `rows` | mảng `[tiêu chí, ô từ 1 … ô từ n]` | ≥ 2 dòng; mỗi dòng có đúng 1 + số từ ô |
| `examples` | mảng `[hán tự, pinyin, nghĩa, chỉ số từ]` | Chỉ số từ là vị trí trong `words`; mỗi từ ≥ 2 ví dụ; câu ví dụ chứa từ đó |
| `tip` | chuỗi | Mẹo nhớ ngắn |
| `questions` | mảng `{ q, answer, explain }` | Từ `max(4, số từ)` đến 8 câu; `q` có đúng một `___`; `answer` thuộc `words`; mỗi từ là đáp án ít nhất một lần; chỉ dùng câu mà chỉ một từ đúng |

Lựa chọn của câu hỏi không lưu trong dữ liệu: luôn là các từ của nhóm, xáo khi dựng lượt (nhóm 4–5 từ thì có 4–5 nút).

Mục lục có từ viết biến thể ("刚（刚刚）", "无论（不论）", "大都（大多）"): ghi từ chính trong `words`, biến thể đặt vào `common` hoặc `rows` khi cần.

### 2.1 Chữ cái theo mục lục sách

| Chữ | Mã | Chữ | Mã | Chữ | Mã |
|---|---|---|---|---|---|
| A | 001–005 | K | 068–071 | T | 104–106 |
| B | 006–023 | L | 072–074 | W | 107–109 |
| C | 024–030 | M | 075–081 | X | 110–115 |
| D | 031–041 | N | 082–087 | Y | 116–119 |
| E | 042–043 | O | 088 | Z | 120–125 |
| F | 044–049 | P | 089–090 | | |
| G | 050–052 | Q | 091–095 | | |
| H | 053–056 | R | 096–098 | | |
| J | 057–067 | S | 099–103 | | |

Chữ và mã liên tục, không có chữ trống ngoài các chữ trên (không có I, U, V). Bảng này nằm trong test dữ liệu để bắt nhầm `letter`. Số liệu đã đối chiếu với mục lục các trang 5–9 của sách; khi soạn tới đâu, đối chiếu lại tiêu đề từng nhóm với đúng trang của nó.

## 3. Giao diện và định tuyến

Sidebar, `CompareNav` và các đường dẫn giữ nguyên: `/compare` (So sánh), `/compare/practice`, `/compare/review`; đường dẫn lạ dưới `/compare/...` về `/compare`.

### Trang So sánh (`/compare`)

- **Dải chữ cái** thay `LessonTabs`: mỗi chữ là một tab, chỉ hiện chữ có nhóm đã soạn; mỗi tab có tiến độ "đã nắm / số nhóm của chữ"; trên điện thoại dải cuộn ngang bên trong, trang không cuộn ngang. Chữ đang chọn lưu ở `hsk4_compare_letter` (giá trị lạ hoặc chữ chưa soạn → chữ đầu tiên có nhóm).
- **Ô tìm kiếm**: khớp hán tự (chuỗi con) hoặc pinyin không phân biệt dấu thanh, hoa thường, khoảng trắng, dấu nháy; tìm trên cả 125 nhóm, mỗi thẻ ghi chữ và mã (vd. "R · 096"). Khi ô có chữ thì ẩn tác dụng của dải chữ và bộ lọc; không có kết quả thì hiện "Không tìm thấy nhóm nào". Xoá ô thì trở lại chữ đang chọn. Giá trị ô tìm không lưu.
- **Bộ lọc** Tất cả / Chưa đánh dấu / Cần ôn / Đã nắm kèm số đếm, áp cho nhóm của chữ đang chọn; mục lọc rỗng thì hiện cả chữ kèm ghi chú; đánh dấu không lọc lại ngay.
- **Thẻ `ComparePair`**: dòng đầu `认为 rènwéi ⇄ 以为 yǐwéi ⇄ …` (liệt kê mọi từ) + mã nhóm + dấu hiện tại; bấm để mở/đóng. Khi mở: nghĩa chung, bảng so sánh (1 cột tiêu chí + 2–5 cột từ, cuộn ngang trong thẻ), ví dụ chia theo từng từ có 🔊 và từ đang so sánh được tô đậm, 💡 mẹo nhớ, nút **✅ Đã nắm / 🔁 Cần ôn** (bấm lại để bỏ dấu).
- Link `/compare#096`: nếu nhóm thuộc chữ khác thì đổi chữ đang chọn trước, xoá ô tìm, thẻ mở sẵn, luôn hiện dù bộ lọc không khớp, cuộn tới trong `useEffect` (giống `/grammar#1.3`). Mã lạ hoặc nhóm chưa soạn thì bỏ qua.
- Nút **📝 Luyện tập chữ này** → `/compare/practice`; **🔁 Ôn các nhóm cần ôn (n)** → `/compare/review` (ẩn khi n = 0).
- Chưa soạn nhóm nào → "Nội dung đang được soạn"; một chữ chưa soạn không có tab (xem §6).

### Trang Luyện tập

Như spec cũ, chỉ đổi phạm vi: `/compare/practice` lấy các nhóm của **chữ đang chọn** theo `hsk4_compare_filter` (rỗng thì cả chữ, kèm ghi chú), đầu trang có dải chữ cái; `/compare/review` lấy mọi nhóm `r` của toàn bộ 125 nhóm, tối đa 30 câu chia đều theo nhóm. Link "Xem so sánh" trỏ `/compare#<mã>`. Trả lời sai → `setMark('c:'+id, 'r')`.

## 4. Mã nguồn

### Sửa

| File | Thay đổi |
|---|---|
| `src/data/compare.json` | Thay toàn bộ bằng mảng phẳng theo §2 |
| `src/compare.js` | Bỏ `COMPARE` theo bài, `pairsOf`, `lessonOf`, re-export `lessonOf`. Thêm `LETTERS` (các chữ đã có nhóm, theo thứ tự), `pairsOfLetter(letter)`, `letterOf(id)`, `loadCompareLetter`/`saveCompareLetter`, `compareProgress(getMark)(letter)`. `searchPairs`, `toneless`, `filterPairs`, `countPairs`, `reviewPairs`, `buildCompareQuiz`, `retryCompareQuiz`, `PAIR_BY_ID`, `pairTitle`, bộ lọc giữ nguyên. `validateCompare(data)` viết lại theo §5 (không nhận `vocab`) |
| `src/pages/ComparePage.jsx` | `LessonTabs` → dải chữ cái; bỏ `selectLesson`; link `#<mã>` đổi chữ |
| `src/pages/ComparePracticePage.jsx` | Phạm vi `lesson` → `letter` |
| `src/components/ComparePair.jsx` | Bảng 2–5 từ; hiển thị mã nhóm; tiêu đề liệt kê mọi từ |
| `src/components/LetterTabs.jsx` (mới) | Dải chữ cái dùng chung cho So sánh và Luyện tập (kiểu giống `LessonTabs`) |
| `src/styles.css` | Kiểu dải chữ cái và bảng nhiều cột; dùng lại màu và class sẵn có |
| `tests/compare.test.mjs`, `tests/router.test.mjs` | Theo §5 (router không đổi hành vi) |
| `README.md` | Cập nhật mô tả chuyên mục và định dạng `compare.json` mới |

`src/routes.js`, `src/App.jsx`, `src/grammar.js`, `ChoiceBlank`, `CompareNav` không đổi (có thể chỉ gỡ import thừa nếu có).

### Tiến độ và đồng bộ

Khoá `c:<mã>` ngắn nhất `c:001`, dài nhất `c:125` (≤ 12 ký tự). Tổng mục ước tính 621 từ + 100 điểm ngữ pháp + 125 nhóm = 846 < `MAX_WORDS` 1000.

## 5. Kiểm thử

`npm run test:unit`:

- **Router:** như hiện tại, không đổi.
- **Logic:** `toneless`, `searchPairs` (hán tự, pinyin có/không dấu, rỗng khi không khớp); `pairsOfLetter` và `LETTERS` đúng thứ tự; `compareProgress`; `filterPairs`/`countPairs` với `compareKey`; `buildCompareQuiz` có `options` đúng bằng tập từ của nhóm (cả nhóm 4–5 từ) và chứa `answer`, giới hạn `max` chia đều theo nhóm; mọi test ngữ pháp cũ vẫn qua.
- **Dữ liệu** (mọi nhóm đã soạn): `id` là chuỗi 3 chữ số trong 001–125, duy nhất, tăng dần; `letter` khớp bảng §2.1; 2–5 từ khác nhau, mỗi từ `[hán tự, pinyin]` không rỗng; `common`/`tip` không rỗng; ≥ 2 dòng `rows`, mỗi dòng 1 + số từ ô; mỗi từ ≥ 2 ví dụ, chỉ số từ hợp lệ, câu ví dụ chứa từ đó; `max(4, số từ)`–8 câu hỏi, đúng một `___`, `answer` thuộc `words`, mỗi từ là đáp án ít nhất một lần, mỗi câu có `explain`.

Thủ công (Playwright, `npm run dev`): sidebar vẫn có mục; `/compare` hiện chữ đầu tiên, mở thẻ, nghe từ và ví dụ, đánh dấu; đổi chữ lưu lại sau F5; tìm `renwei` ra nhóm 096 ở chữ khác, xoá ô thì về chữ cũ; luyện tập làm sai một câu → nhóm thành "Cần ôn"; từ `/compare/review` bấm "Xem so sánh" của nhóm chữ khác → đổi chữ, thẻ mở và cuộn tới; nhóm 4–5 từ hiện đủ cột và đủ nút lựa chọn; bề rộng 375px không cuộn ngang trang (dải chữ và bảng cuộn bên trong); Back/Forward đúng; các trang ngữ pháp và từ vựng vẫn hoạt động.

## 6. Kế hoạch nội dung

Sách là bản scan ảnh, không có OCR: nội dung mỗi nhóm được đọc từ ảnh trang tương ứng (số trang theo mục lục), rồi **viết lại bằng lời của mình** theo §2, ví dụ tự đặt hoặc sửa lại; đáp án cuối sách (từ trang 211) dùng để kiểm tra câu hỏi, không chép.

- **Đợt 0 (cùng code):** thay cấu trúc, xoá 16 nhóm cũ, kèm các nhóm đợt 1 để trang không rỗng.
- **Đợt 1:** chữ A và B (001–023, 23 nhóm). Người dùng dùng thử và góp ý định dạng trước khi soạn tiếp.
- **Các đợt sau:** mỗi đợt khoảng 20–25 nhóm theo chữ cái (C–D, E–H, J–K, L–N, O–R, S–T, W–Z), mỗi đợt một commit, test dữ liệu phải qua.
- Trong lúc chưa soạn xong, một chữ chưa có nhóm nào không hiện tab; số nhóm tổng ở đầu trang chỉ đếm nhóm đã soạn. Khi đủ 125 nhóm, test dữ liệu thêm điều kiện "đúng 125 nhóm, 001–125 không thiếu số nào".
