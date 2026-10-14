# Thiết kế: Chuyên mục Ngữ pháp (lý thuyết + bài tập)

Ngày: 2026-10-14 · Trạng thái: đã duyệt thiết kế, chờ duyệt spec

## 1. Mục tiêu

Trang `/grammar` hiện chỉ là chỗ giữ chỗ. Biến nó thành nơi ôn ngữ pháp **theo giáo trình HSK Standard Course 4** (Bài 1–20, mỗi bài 5 điểm ngữ pháp), gồm lý thuyết và bài tập cho từng điểm.

Vòng ôn cho mỗi điểm: **đọc lý thuyết → làm bài → sai thì tự đánh dấu "Cần ôn" → ôn lại các điểm cần ôn** (theo bài hoặc gộp mọi bài).

**Thành công nghĩa là:** chọn một bài và thấy đủ 5 điểm ngữ pháp, có công thức, giải thích tiếng Việt, ví dụ có nghe đọc và phần dễ nhầm; luyện được hai dạng bài; dấu "Đã nắm / Cần ôn" của từng điểm đồng bộ qua tài khoản như từ vựng; backend không đổi.

### Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Cách chia nội dung | Theo bài giáo trình (Bài 1–20), không theo dạng đề thi |
| Dạng bài tập | Chọn từ điền chỗ trống (4 lựa chọn), sắp xếp cụm thành câu |
| Nguồn nội dung | Soạn thủ công vào `src/data/grammar.json`, không sinh tự động từ câu ví dụ |
| Tiến độ | Dấu `k`/`r` từng điểm, dùng chung kho dấu của từ vựng với khoá `g:<id>`, đồng bộ tài khoản |
| Làm sai | Tự đặt dấu "Cần ôn" cho điểm của câu đó; làm đúng không tự đặt "Đã nắm" |
| Bài đang chọn | Dùng chung `lesson` trong `AppContext` với phần từ vựng |
| Bộ lọc | Bộ lọc riêng của trang ngữ pháp (state cục bộ), không đụng bộ lọc từ vựng |
| Triển khai nội dung | Đợt 1: toàn bộ code + nội dung Bài 1–2; Bài 3–20 soạn theo đợt sau |

### Không thay đổi

`vocab.json`, `practice.json`, `quiz.js`, các trang từ vựng, hook `useMarks`/`useAccount`/`useSpeech`, backend `server/`, `functions/`, migration, cơ chế đồng bộ.

### Ngoài phạm vi (YAGNI)

Luyện đề thi HSK (sẽ làm sau), dạng bài đúng/sai và dịch, SRS cho ngữ pháp, giữ lượt làm dở khi rời trang, thống kê lịch sử làm bài.

## 2. Nguồn và danh sách điểm ngữ pháp

Danh sách theo [AllSet Learning – HSK Standard Course 4上](https://resources.allsetlearning.com/chinese/grammar/HSK_Standard_Course_4上) và [4下](https://resources.allsetlearning.com/chinese/grammar/HSK_Standard_Course_4下); tên bài khớp `vocab.json`. Tham khảo thêm khi soạn giải thích: [Chinese Grammar Wiki HSK4](https://resources.allsetlearning.com/chinese/grammar/HSK4), [DigMandarin](https://www.digmandarin.com/hsk-4-grammar). Nội dung viết lại bằng tiếng Việt, không chép nguyên văn.

| Bài | Điểm ngữ pháp (id `<bài>.1` … `<bài>.5`) |
|---|---|
| 1 | 不仅…也/还/而且… · 从来 · 刚 (so với 刚才) · 即使…也… · (在)…上 |
| 2 | 正好 · 差不多 · 尽管 · 却 · 而 |
| 3 | 挺 · 本来 · 另外 · 首先…其次… · 不管 |
| 4 | 以为 · 原来 · 并 · 按照 · 甚至 |
| 5 | 肯定 · 再说 · 实际 · 对…来说 · 尤其 |
| 6 | 竟然 · 倍 · 值得 · 其中 · (在)…下 |
| 7 | 估计 · 来不及 · Lặp lại động từ ly hợp · 要是 · 既…又/也/还… |
| 8 | 使 · 只要 · 可不是 · 因此 · 往往 |
| 9 | 难道 · 通过 · 可是 · 结果 · 上 (bổ ngữ xu hướng mở rộng) |
| 10 | 不过 · 确实 · 在…看来 · 由于 · 比如 |
| 11 | 连 · 否则 · 无论 · 然而 · 同时 |
| 12 | 并且 · 再…也… · 对于 · Lặp lại lượng từ danh từ · 相反 |
| 13 | 大概 · 偶尔 · 由 · 进行 · 随着 |
| 14 | 够 · 以 · 既然 · 于是 · 什么的 |
| 15 | 想起来 · 弄 · 千万 · 来 · 左右 |
| 16 | 可 · 恐怕 · 到底 · 拿…来说 · 敢 |
| 17 | 倒 · 干 · 趟 · 为了…而… · 仍然 |
| 18 | 是否 · 受不了 · 接着 · 除此以外 · 把…叫作… |
| 19 | Đại từ nghi vấn chỉ phiếm chỉ · 上 · 出来 · 总的来说 · 在于 |
| 20 | V着V着 · 一…就… · 究竟 · 起来 · V+起 |

## 3. Dữ liệu: `src/data/grammar.json`

Khoá là mã bài như `vocab.json` (`L1` … `L20`); giá trị là mảng điểm theo thứ tự trong sách. Bài chưa soạn thì không có khoá (hoặc mảng rỗng), trang hiện "Nội dung bài này đang được soạn".

```json
{
  "L1": [
    {
      "id": "1.1",
      "title": "不仅……也/还/而且……",
      "pattern": "不仅 + A，也/还/而且 + B",
      "meaning": "Không chỉ A mà còn B — quan hệ tăng tiến, B thường ở mức cao hơn A.",
      "notes": [
        "Hai vế cùng chủ ngữ: 不仅 đứng sau chủ ngữ. Khác chủ ngữ: 不仅 đứng trước chủ ngữ vế đầu.",
        "Dễ nhầm: 不但 dùng giống 不仅 nhưng khẩu ngữ hơn."
      ],
      "examples": [
        ["他不仅会说汉语，还会说日语。", "Tā bùjǐn huì shuō Hànyǔ, hái huì shuō Rìyǔ.", "Anh ấy không chỉ biết nói tiếng Trung mà còn biết nói tiếng Nhật."]
      ],
      "questions": [
        {
          "type": "choice",
          "q": "这家饭馆的菜___便宜，而且很好吃。",
          "options": ["不仅", "尽管", "即使", "从来"],
          "answer": "不仅",
          "explain": "Vế sau có 而且 → cặp tăng tiến 不仅…而且."
        },
        {
          "type": "order",
          "parts": ["他", "不仅", "聪明", "而且很努力"],
          "answer": "他不仅聪明而且很努力。",
          "alt": [],
          "vi": "Anh ấy không chỉ thông minh mà còn rất chăm chỉ."
        }
      ]
    }
  ]
}
```

Trường của một điểm:

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | chuỗi `"<bài>.<n>"` | Duy nhất toàn bộ; khoá dấu là `g:` + id (tối đa `g:20.5`, 6 ký tự) |
| `title` | chuỗi | Tên điểm như trong sách |
| `pattern` | chuỗi | Công thức |
| `meaning` | chuỗi | Ý nghĩa và cách dùng, ngắn |
| `notes` | mảng chuỗi | Lưu ý, lỗi hay gặp, so sánh từ dễ nhầm; có thể rỗng |
| `examples` | mảng `[hán tự, pinyin, nghĩa]` | 3–4 câu |
| `questions` | mảng câu hỏi | 6–8 câu, có cả hai dạng |

Câu hỏi `choice`: `q` chứa đúng một `___`; `options` 4 lựa chọn khác nhau, có `answer`; phương án nhiễu là từ dễ nhầm có chủ đích (vd. 却/而/但是, 刚/刚才, 以为/认为); `explain` giải thích ngắn vì sao đúng.

Câu hỏi `order`: `parts` là các cụm theo **đúng thứ tự** (giao diện tự xáo), ghép lại (bỏ dấu câu) ra `answer`; `alt` là các câu khác cũng đúng (tuỳ chọn); `vi` là nghĩa câu.

## 4. Giao diện và định tuyến

Sidebar giữ nguyên. Phần ngữ pháp có thanh tab con riêng (cùng kiểu `NavBar`): **📖 Lý thuyết** (`/grammar`) · **📝 Luyện tập** (`/grammar/practice`).

| Đường dẫn | `page` | Nội dung |
|---|---|---|
| `/grammar` | `grammar` | Tab bài, bộ lọc, danh sách điểm ngữ pháp |
| `/grammar/practice` | `grammar-practice` | Lượt luyện các điểm của bài đang chọn (theo bộ lọc) |
| `/grammar/review` | `grammar-review` | Lượt luyện mọi điểm "Cần ôn" của cả 20 bài |

Đường dẫn lạ dưới `/grammar/...` chuyển về `/grammar`. `sectionOf` trả `grammar` cho cả ba trang.

### Trang Lý thuyết (`/grammar`)

- `LessonTabs` (số phụ: số điểm đã nắm / số điểm của bài).
- Bộ lọc: Tất cả / Chưa đánh dấu / Cần ôn / Đã nắm, kèm số đếm. Nếu mục lọc rỗng thì hiện cả bài kèm ghi chú (giống từ vựng).
- Mỗi điểm là một thẻ `GrammarPoint`: tiêu đề + dấu hiện tại ở dòng đầu; bấm để mở/đóng; khi mở hiện công thức, ý nghĩa, ví dụ (🔊 đọc câu bằng `speech.speak`), mục "⚠️ Lưu ý", và nút **✅ Đã nắm / 🔁 Cần ôn** (bấm lại để bỏ dấu).
- Mở trang bằng link có `#1.3` thì thẻ đó mở sẵn và cuộn tới (dùng cho link "Xem lý thuyết" từ bài tập).
- Nút **📝 Luyện tập bài này** → `/grammar/practice`; nút **🔁 Ôn các điểm cần ôn (n)** → `/grammar/review` (ẩn khi n = 0).

### Trang Luyện tập

- Tập câu hỏi: mọi câu của các điểm được chọn (bài đang chọn theo bộ lọc; hoặc mọi điểm `r` khi ở `/grammar/review`), xáo trộn; `/grammar/review` tối đa 30 câu.
- Lưới số câu để nhảy, ô màu theo đúng/sai; nút trước/sau; nút "Xem kết quả".
- **Chọn từ**: câu có ô trống, 4 nút lựa chọn (dùng lại class `fb-opt`). Sau khi chọn: tô đúng/sai, hiện `explain` và link "Xem lý thuyết" (`/grammar#<id>`).
- **Sắp xếp** (`OrderQuestion`): các cụm xáo ở dưới; bấm cụm để đưa lên dòng trả lời, bấm cụm trên dòng trả lời để trả về. Nút "Kiểm tra" bật khi đã dùng hết cụm. Sau khi kiểm tra: đúng/sai, câu đúng, nghĩa `vi`, link "Xem lý thuyết".
- Trả lời sai → `setMark('g:'+id, 'r')`.
- Màn kết quả: điểm số, danh sách điểm ngữ pháp có câu sai (link về lý thuyết), nút **🔁 Làm lại câu sai** và **Làm lượt mới**.
- Không có câu nào (bài chưa soạn hoặc không có điểm cần ôn) → thông báo và link về Lý thuyết.

## 5. Mã nguồn

### File mới

| File | Việc |
|---|---|
| `src/grammar.js` | Thuần, không React: `GRAMMAR` (theo bài), `ALL_POINTS`, `POINT_BY_ID`, `grammarKey(id)`, `buildGrammarQuiz(points, { max })` (lấy câu, xáo câu, xáo `options`, xáo `parts`), `normalize(s)` (bỏ khoảng trắng và dấu câu Trung/Anh), `checkOrder(given, q)` |
| `src/pages/GrammarPage.jsx` | Thay trang placeholder: trang Lý thuyết |
| `src/components/GrammarPoint.jsx` | Một thẻ điểm ngữ pháp |
| `src/components/GrammarNav.jsx` | Thanh tab con Lý thuyết / Luyện tập |
| `src/pages/GrammarPracticePage.jsx` | Lượt luyện (nhận `scope`: `lesson` hoặc `review`) |
| `src/components/OrderQuestion.jsx` | Dạng sắp xếp cụm |
| `src/data/grammar.json` | Nội dung |
| `tests/grammar.test.mjs` | Test logic và kiểm tra dữ liệu |

### File sửa

| File | Thay đổi |
|---|---|
| `src/routes.js` | Thêm `grammar-practice`, `grammar-review`, tiêu đề trang, `sectionOf` |
| `src/App.jsx` | Render các trang ngữ pháp, `GrammarNav` cho phần ngữ pháp |
| `src/components/LessonTabs.jsx` | Nhận prop tuỳ chọn `progress(lesson) → { done, total }`; mặc định vẫn đếm từ vựng |
| `tests/router.test.mjs` | Test các đường dẫn mới |
| `package.json` | Thêm `tests/grammar.test.mjs` vào `test:unit` |
| `README.md` | Mô tả chuyên mục, đường dẫn và định dạng `grammar.json` |

`ChoiceQuestion` của từ vựng gắn chặt với dạng câu từ vựng nên không sửa; trang luyện ngữ pháp tự render câu chọn từ với cùng class CSS.

### Tiến độ và đồng bộ

Dùng `marks` từ `useApp()`: `getMark('g:1.1')`, `setMark`, `toggleMark`. Khoá `g:` hợp lệ với API (`word.length ≤ 12`), tổng mục 621 từ + 100 điểm = 721 < `MAX_WORDS` 1000. Các bộ đếm/bộ lọc của từ vựng chỉ duyệt danh sách từ nên không bị ảnh hưởng. Nút "Xoá đánh dấu bài này" của từ vựng chỉ xoá từ; trang ngữ pháp không có nút xoá ở đợt này.

## 6. Kiểm thử

`npm run test:unit` (Node test runner, như hiện có):

- **Router:** `/grammar`, `/grammar/practice`, `/grammar/review` khớp đúng trang; `/grammar/xyz` về `/grammar`; `sectionOf` đúng.
- **Logic:** `buildGrammarQuiz` lấy đủ câu, giới hạn `max`, giữ `answer` trong `options` sau khi xáo; `checkOrder` đúng với câu có/không dấu câu, khoảng trắng, và `alt`; sai khi thiếu/thừa cụm.
- **Dữ liệu** (chạy trên mọi bài đã soạn): khoá bài có trong `vocab.json`; bài đã soạn có đúng 5 điểm; id duy nhất và đúng dạng `<bài>.<n>`; mỗi điểm có ≥ 3 ví dụ, ≥ 6 câu hỏi và có cả hai dạng; câu `choice` có đúng một `___`, 4 lựa chọn không trùng, `answer` thuộc `options`; câu `order` có ≥ 3 cụm và `normalize(parts.join(''))` bằng `normalize(answer)`.

Thủ công (Playwright, `npm run dev`): mở `/grammar` Bài 1, mở thẻ, nghe ví dụ, đánh dấu; vào Luyện tập, làm sai một câu chọn từ và một câu sắp xếp → điểm đó thành "Cần ôn"; `/grammar/review` chỉ hiện câu của điểm cần ôn; F5 và Back/Forward đúng.

## 7. Kế hoạch nội dung

- **Đợt 1** (cùng code): Bài 1–2 — 10 điểm, ~70 câu hỏi. Người dùng dùng thử và góp ý định dạng trước khi soạn tiếp.
- **Các đợt sau:** Bài 3–20, mỗi đợt 4–5 bài, mỗi đợt một commit, test dữ liệu phải qua.
- Ví dụ và câu hỏi ưu tiên dùng từ vựng của chính bài đó và các bài trước.
