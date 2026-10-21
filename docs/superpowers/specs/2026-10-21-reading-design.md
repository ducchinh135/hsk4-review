# Thiết kế: Đọc hiểu — 选词填空 · 排列顺序 · 阅读理解

Ngày: 2026-10-21 · Trạng thái: chờ duyệt spec · Chuyên mục mới, đi theo khuôn của [Nghe hiểu](2026-10-20-listening-part2-design.md)

## 1. Mục tiêu

Thêm chuyên mục **📄 Đọc hiểu** để luyện phần Đọc của đề HSK 4 (câu 46–85, 40 câu) theo từng part:

| Part | Đề thật | Trong app |
|---|---|---|
| ① 选词填空 | Câu 46–55: hai bộ, mỗi bộ 6 từ A–F, một từ đã dùng ở câu 例如, 5 chỗ trống cho 5 từ còn lại. Bộ 46–50 là câu đơn, bộ 51–55 là hội thoại hai lượt | Luyện **theo bộ như đề thật** |
| ② 排列顺序 | Câu 56–65: mỗi câu có ba câu A, B, C, xếp thành một đoạn hợp lý | Bấm để xếp A/B/C |
| ③ 阅读理解 | Câu 66–85: 14 đoạn ngắn có một câu hỏi ★ (66–79), 3 đoạn dài có hai câu hỏi (80–85); mỗi câu hỏi 4 đáp án A–D | Đoạn ngắn và đoạn dài |

Vòng học giống phần Nghe: **đọc mẹo → làm theo dạng → chấm, xem pinyin + dịch + giải thích → câu sai thành "Cần ôn" → ôn lại.** Điểm riêng của phần Đọc là **sau khi chấm, app chỉ ra chỗ trong bài quyết định đáp án**: từ loại và cụm từ đi kèm ở Part 1, từ manh mối được tô vàng ở Part 2, câu chứa đáp án được tô vàng ở Part 3. Mục đích là để người học tập nhìn ra manh mối, chứ không chỉ biết đáp án nào đúng.

**Thành công nghĩa là:** sidebar có mục Đọc hiểu, với ba tab part. Mỗi part có trang mẹo, các dạng, lượt tổng hợp đúng số câu của đề, và lượt ôn câu sai. Màn làm bài của từng part đúng như bản phác đã duyệt (mục 6). Dấu "Cần ôn" đồng bộ như các chuyên mục khác. Các chuyên mục cũ chạy y như trước, và backend không đổi.

### Người dùng đã quyết định

- **Part 1 làm theo bộ như đề thật:** 6 từ A–F, câu 例如 dùng sẵn một từ, 5 chỗ trống. Người học **điền đủ 5 chỗ rồi bấm nộp** (được đổi qua đổi lại trước khi nộp). Nộp xong mới chấm và hiện lời giải từng câu. Có hai dạng, Câu đơn và Hội thoại.
- **Part 2:** bấm A/B/C theo thứ tự, bấm câu đã đặt để gỡ ra. Sau khi kiểm tra: hiện đoạn đã ghép, từ manh mối tô vàng, lời giải ba bước (câu đầu → câu tiếp → câu cuối). Có 4 dạng: 🔗 Từ nối thành cặp · 👉 Đại từ, từ chỉ · ⏱ Trình tự thời gian · 💡 Chủ đề → giải thích.
- **Part 3:** chọn A–D là chấm ngay; câu chứa đáp án trong bài được tô vàng. Đoạn dài có hai câu hỏi trên cùng một màn, làm xong cả hai mới sang đoạn tiếp, và mỗi câu hỏi có dấu "Cần ôn" riêng. Có 5 dạng: 🔎 Chi tiết · 📌 Ý chính, mục đích · 🧠 Suy luận, thái độ · 🔤 Nghĩa của từ/câu trong bài · 📄 Đoạn dài.
- Làm Part 1 trước, dừng cho người dùng dùng thử, rồi mới làm Part 2, sau đó Part 3.

### Kế thừa từ các chuyên mục trước (không bàn lại)

Đề do Claude tự soạn theo chuẩn HSK 4, không chép nguồn khác. Giao diện dùng khung và lớp CSS hiện có (thẻ chọn bài như `ListeningHubPage`, màn luyện như `ListeningPracticePage`). Dấu "Cần ôn" lưu qua `useMarks`. Giải thích viết bằng tiếng Việt. Lựa chọn hiện pinyin được nhớ trong `localStorage`. Làm theo giai đoạn và dừng cho người dùng duyệt.

### Quyết định do Claude đặt (người dùng có thể đổi khi đọc spec)

| Vấn đề | Quyết định |
|---|---|
| Vị trí | Mục sidebar thứ năm `📄 Đọc hiểu`, đường dẫn `/reading/p1`… Có ba tab ① 选词填空, ② 排列顺序, ③ 阅读理解; part chưa có nội dung thì tab mờ "Sắp có", giống phần Nghe |
| Số lượng | Part 1: 10 bộ mỗi dạng, tức 20 bộ (100 chỗ trống). Part 2: 10 câu mỗi dạng, tức 40 câu. Part 3: 15 đoạn cho mỗi dạng ngắn và 10 đoạn dài, tức 70 đoạn và 80 câu hỏi |
| Luyện tổng hợp | Part 1: 2 bộ (một Câu đơn, một Hội thoại), tức 10 câu. Part 2: 10 câu xoay vòng các dạng. Part 3: 14 đoạn ngắn xoay vòng 4 dạng ngắn, cộng 3 đoạn dài, tức 20 câu hỏi. Số lượng đúng như đề |
| Đơn vị "Cần ôn" | Part 1: **cả bộ**, vì các câu trong bộ phụ thuộc nhau (sai một chỗ trở lên thì cả bộ "Cần ôn", ôn thì làm lại cả bộ). Part 2: từng câu. Part 3: từng câu hỏi; lượt ôn hiện cả đoạn nhưng chỉ hỏi lại câu đang "Cần ôn" |
| Giới hạn lượt ôn | Part 1: tối đa 6 bộ. Part 2: tối đa 30 câu. Part 3: tối đa 20 đoạn |
| Pinyin và dịch | Part 1 và 2: chỉ có **sau khi chấm**, vì pinyin của câu đầy đủ sẽ lộ đáp án. Part 3: pinyin bật được cả trước khi trả lời, còn dịch chỉ có sau khi trả lời. Lựa chọn "hiện pinyin **sau khi chấm**" dùng chung cho cả chuyên mục và được nhớ trong `localStorage` (mặc định bật, như phần Nghe). Riêng nút pinyin **trước khi trả lời** ở Part 3 thì không được nhớ: đoạn nào cũng bắt đầu ở trạng thái tắt, như đi thi |
| Thứ tự trong lượt | Bộ, câu và đoạn được xáo ngẫu nhiên. Thứ tự 6 từ A–F trong bộ, thứ tự A/B/C của Part 2 và thứ tự 4 đáp án đều **giữ như trong dữ liệu**, vì lời giải nói đến từng chữ cái |
| Phím tắt | Part 1: `A`–`F` đặt từ vào chỗ trống đang chọn, rồi chỗ chọn tự nhảy sang ô trống kế tiếp; `1`–`5` chọn chỗ trống; `Backspace` gỡ từ khỏi chỗ đang chọn; `Enter` nộp khi đủ 5 chỗ, và sang bộ tiếp khi đã chấm. Part 2: `A`/`B`/`C` đặt câu, `Backspace` gỡ câu cuối, `Enter` kiểm tra hoặc sang câu tiếp. Part 3: `1`–`4`/`A`–`D` trả lời câu hỏi đầu tiên chưa trả lời, `Enter` sang đoạn tiếp khi đã trả lời hết. Tất cả bỏ qua khi đang gõ trong ô nhập hoặc giữ Ctrl/Meta/Alt; nếu focus đang ở nút hay liên kết thì `Enter` để cho nút đó xử lý, giống `keyAction` của phần Nghe |
| Từ vựng | Trong phạm vi HSK 1–4. Từ để điền ở Part 1 ưu tiên lấy từ `vocab.json` (20 bài) |
| Dấu ở lượt ôn | Giống phần Nghe: làm đúng ở lượt ôn thì vẫn giữ dấu "Cần ôn" cho tới khi người học bấm "✅ Đã nắm"; làm sai thì đánh dấu lại |
| Kiểm tra từ vựng | Việc giữ từ trong phạm vi HSK 1–4 được kiểm ở lượt rà soát nội dung, không kiểm bằng code, vì repo không có danh sách từ HSK 1–3 |

### Không thay đổi

Backend `server/`, `functions/`, migration, cơ chế đồng bộ; `useMarks`/`useAccount`/`useSpeech`; nội dung, đường dẫn và hành vi của mọi chuyên mục hiện có (Từ vựng, Ngữ pháp, Từ dễ nhầm, Nghe hiểu).

### Ngoài phạm vi (YAGNI)

Chế độ thi thử bấm giờ hoặc nộp cả đề; bấm vào một từ trong bài để xem nghĩa; âm thanh đọc bài; giữ lượt làm dở khi rời trang; hình ảnh.

## 2. Quy tắc soạn đề

Chung cho mọi part:

- Chỉ dùng từ vựng và ngữ pháp HSK 1–4. Nếu bắt buộc phải có từ ngoài HSK 4 thì từ đó không được là từ khoá của câu.
- Chủ đề gần giáo trình HSK Standard Course 4 (công việc, học tập, du lịch, sức khoẻ, mua sắm, gia đình, quan hệ xã hội, chuyện ngắn có ý nghĩa). Không lặp cốt truyện giữa các câu, và không chép đoạn nghe của phần Nghe.
- Đáp án phải **duy nhất**: một người đọc kỹ chỉ chọn được đúng một phương án, không có phương án "cũng được".
- Lời giải tiếng Việt chỉ rõ chữ hay cụm từ quyết định đáp án, và vì sao phương án nhiễu sai.
- Mỗi lô soạn xong phải qua **một lượt rà soát riêng** trước khi commit, kiểm theo đúng các quy tắc ở mục này. Ở phần Từ dễ nhầm, gần như lô nào cũng cần thêm một commit sửa sau khi rà.

**Part 1 选词填空**

- Mỗi bộ có 6 từ A–F, thường trộn từ loại (động từ, danh từ, tính từ, phó từ, lượng từ, liên từ…). Trong 6 từ có **ít nhất hai cặp cùng từ loại**, để chỉ dựa vào từ loại thì không đủ chọn mà còn phải hiểu nghĩa và cách kết hợp từ.
- Câu 例如 dùng một từ và cả 5 từ còn lại đều được dùng, tức là chữ cái của câu 例如 và 5 câu là một hoán vị của A–F. Chữ cái của câu 例如 thay đổi giữa các bộ.
- Bộ Câu đơn: mỗi câu dài 12–30 chữ Hán. Bộ Hội thoại: mỗi câu gồm hai lượt `A：…` / `B：…`, tổng 15–40 chữ, chỗ trống ở lượt nào cũng được.
- Mỗi câu có đúng một chỗ trống. Với mỗi câu, chỉ một trong 6 từ đặt vào là đúng cả về ngữ pháp lẫn nghĩa.
- Lời giải từng câu nói: chỗ trống cần từ loại gì (dựa vào từ đứng trước và sau), từ đúng đi kèm với từ nào (vd. 养成 + 习惯), và nếu có một từ dễ nhầm trong bộ thì vì sao nó không hợp.

**Part 2 排列顺序**

- Ba câu, mỗi câu dài 6–25 chữ, tự mang dấu câu của mình. Khi ghép theo đúng thứ tự, ba câu thành một đoạn hoàn chỉnh; câu cuối kết thúc bằng 。/！/？.
- Chỉ có **một** thứ tự hợp lý. Thứ tự trong dữ liệu (A, B, C) không bao giờ là đáp án `ABC`. Trong mỗi dạng 10 câu, mỗi chữ cái A/B/C đều có lúc đứng đầu đáp án.
- `clues` là các chữ hay cụm từ làm manh mối, phải xuất hiện nguyên văn trong các câu (vd. 虽然, 但是, 所以; 他; 先, 然后).
- Lời giải đủ ba bước, giống bản phác: vì sao câu này đứng đầu (và những câu kia không thể đứng đầu), câu nào nối tiếp, câu nào đứng cuối.

**Part 3 阅读理解**

- Đoạn ngắn dài 40–100 chữ, có một câu hỏi (★ 根据这段话，可以知道：/ 这段话主要谈… / 他是什么态度 / "……"的意思是…). Đoạn dài dài 150–250 chữ, có hai câu hỏi: một câu chi tiết và một câu ý chính hoặc suy luận.
- Bốn đáp án dài 2–20 chữ, khác nhau, cùng loại. Mỗi câu hỏi có ít nhất một phương án nhiễu dùng lại chữ trong bài (bẫy "thấy chữ nào chọn chữ đó"). Đáp án đúng thường được **diễn đạt lại** chứ không chép nguyên câu trong bài.
- `evidence` là đoạn chữ chép nguyên văn từ bài, là chỗ quyết định đáp án; app tô vàng đoạn này. Mỗi câu hỏi có ít nhất một `evidence`.
- Đáp án đúng rải đều: trong mỗi dạng, mỗi chữ cái A–D là đáp án đúng ít nhất 2 lần.
- Dạng Suy luận và dạng Ý chính không nói thẳng đáp án.

## 3. Dữ liệu: `src/data/reading.json`

```json
{
  "parts": [
    {
      "id": "p1", "format": "fill", "name": "选词填空", "label": "Chọn từ điền vào chỗ trống",
      "desc": "Chọn từ trong danh sách cho sẵn để điền vào chỗ trống.",
      "tips": { "intro": "…", "sections": [{ "title": "…", "body": "…", "examples": [["中文", "pīnyīn", "ghi chú"]] }] },
      "types": [
        { "id": "sentence", "icon": "✏️", "name": "Câu đơn", "desc": "…" },
        { "id": "dialogue", "icon": "💬", "name": "Hội thoại", "desc": "…" }
      ],
      "sets": [
        {
          "id": "p1-001",
          "type": "sentence",
          "words": [
            { "text": "堵车", "pinyin": "dǔchē", "vi": "tắc đường" },
            "… đúng 6 từ, thứ tự là A–F"
          ],
          "example": { "text": "我___他今天不会来了。", "answer": 2 },
          "items": [
            {
              "text": "他每天都___锻炼身体，所以很少生病。",
              "pinyin": "Tā měitiān dōu jiānchí duànliàn shēntǐ, suǒyǐ hěn shǎo shēngbìng.",
              "vi": "Ngày nào anh ấy cũng kiên trì tập thể dục, nên rất ít khi ốm.",
              "answer": 3,
              "explain": "…"
            }
          ]
        }
      ]
    },
    {
      "id": "p2", "format": "order", "name": "排列顺序", "label": "Sắp xếp câu", "desc": "…", "tips": {}, "types": [],
      "questions": [
        {
          "id": "p2-001", "type": "pair",
          "sentences": [
            { "text": "所以我们全家经常开车过去吃。", "pinyin": "…", "vi": "…" },
            { "text": "虽然这家饭馆离我家有点儿远，", "pinyin": "…", "vi": "…" },
            { "text": "但是菜做得特别好吃，价格也不贵，", "pinyin": "…", "vi": "…" }
          ],
          "answer": "BCA",
          "clues": ["虽然", "但是", "所以"],
          "explain": { "first": "…", "next": "…", "last": "…" }
        }
      ]
    },
    {
      "id": "p3", "format": "read", "name": "阅读理解", "label": "Đọc hiểu", "desc": "…", "tips": {}, "types": [],
      "passages": [
        {
          "id": "p3-001", "type": "infer",
          "text": "…", "pinyin": "…", "vi": "…",
          "questions": [
            {
              "text": "根据这段话，可以知道：", "pinyin": "…", "vi": "…",
              "options": [{ "text": "…", "pinyin": "…", "vi": "…" }],
              "answer": 2,
              "evidence": ["大家都觉得这次一定是他"],
              "explain": "…"
            }
          ]
        }
      ]
    }
  ]
}
```

- **id** có dạng `<part>-` + 3 chữ số, duy nhất trong toàn file và **không đổi sau khi phát hành**, vì đó là khoá dấu. Khoá dấu là `r:p1-001` (một bộ), `r:p2-001` (một câu), `r:p3-001.1` hoặc `r:p3-001.2` (một câu hỏi của đoạn; dài 10 ký tự, server cho phép tối đa 12).
- **Part 1:** ở bộ Hội thoại, `text`, `pinyin` và `vi` của mỗi câu là hai dòng ngăn bởi `\n`, dòng nào cũng bắt đầu bằng `A：` hoặc `B：`. `text` có đúng một `___`; `pinyin` và `vi` là của câu đã điền đầy đủ. `answer` là số 0–5 trỏ vào `words`. Câu 例如 chỉ cần `text` và `answer`, vì app hiện sẵn từ đã điền.
- **Part 2:** `answer` là một hoán vị của `ABC` và khác `ABC`. Đoạn ghép là các `text` nối liền nhau theo thứ tự đáp án; pinyin và dịch của đoạn cũng ghép như vậy.
- **Part 3:** dạng `long` có đúng 2 câu hỏi, các dạng khác có đúng 1. Mỗi chuỗi trong `evidence` phải là chuỗi con của `text`.
- **Validator** `validateReading(data)` trả về danh sách lỗi đọc được, giống `validateListening`. Nó kiểm: các `format` hợp lệ; id đúng mẫu và không trùng; `type` có trong `types`; các trường chữ không rỗng; Part 1 có đúng 6 từ khác nhau, đúng 5 câu, mỗi `text` có đúng một `___`, đáp án của câu 例如 và 5 câu tạo thành hoán vị của 0–5, câu Hội thoại đúng hai dòng `A：`/`B：`; Part 2 có đúng 3 câu, `answer` hợp lệ và khác `ABC`, `clues` không rỗng và đều nằm trong các câu; Part 3 có đúng số câu hỏi theo dạng, 4 đáp án khác nhau, `answer` từ 0–3, `evidence` nằm trong `text`; mỗi dạng có từ 2 mục trở lên thì đáp án không được trùng nhau hết. `npm run test:unit` chạy validator này trên dữ liệu thật.

## 4. Đường dẫn và điều hướng

| Path | Trang |
|---|---|
| `/reading/p1` (`/reading` chuyển hướng về đây) | Trang chọn bài của part: thẻ Mẹo, các dạng, Luyện tổng hợp, Ôn câu sai |
| `/reading/p1/tips` | Mẹo làm bài |
| `/reading/p1/practice/<type>` hoặc `/practice/mix` | Một lượt luyện |
| `/reading/p1/review` | Ôn câu sai |
| `p2`, `p3` | Các trang tương tự |

- Thêm `{ id: 'reading', path: '/reading/p1', label: '📄 Đọc hiểu' }` vào `SECTIONS`, sửa `sectionOf`, thêm `PAGE_TITLES` (`reading-hub`, `reading-tips`, `reading-practice`, `reading-review`), và thêm `matchReading` tương tự `matchListening` (part lạ hoặc đường dẫn lạ đều về `/reading/p1`). Trong `App.jsx` thêm thanh tab của part (`ReadingNav`).
- Trang chọn bài: dòng đếm ghi "N bộ · K cần ôn" (Part 1), "N câu · …" (Part 2), "N đoạn · K câu hỏi cần ôn" (Part 3). Dạng chưa có nội dung thì thẻ mờ "Sắp có".

## 5. Mẹo làm bài (nội dung tối thiểu)

- **Part 1:** đề có 10 câu, mỗi bộ 6 từ và một câu 例如. Nên đọc lướt 6 từ và đoán từ loại của từng từ trước. Nhìn vị trí chỗ trống để đoán từ loại cần điền (sau 很/非常 là tính từ, sau 的 là danh từ, trước động từ là phó từ, sau số từ là lượng từ…). Học các cặp từ hay đi với nhau (提高水平, 养成习惯, 解决问题…). Làm câu chắc ăn trước, gạch dần những từ đã dùng. Kiểm tra lại cả câu sau khi điền.
- **Part 2:** tìm câu không thể đứng đầu (câu bắt đầu bằng 但是/所以/而且/也/他/这…). Ghép các cặp từ nối. Theo dõi đại từ trỏ về ai hoặc việc gì. Để ý trình tự thời gian. Câu nêu chủ đề đứng trước câu giải thích hoặc ví dụ. Xếp xong thì đọc lại cả đoạn.
- **Part 3:** đọc câu hỏi và các đáp án trước, rồi tìm chữ khoá trong bài. Đáp án đúng thường được diễn đạt lại. Coi chừng bẫy "đáp án chép nguyên chữ trong bài" và bẫy "đáp án nói thêm điều bài không nói". Ý chính thường nằm ở câu đầu hoặc câu cuối. Thái độ thể hiện qua các từ như 其实, 可是, 只好, 难道. Phân bổ thời gian: cả phần Đọc có 40 phút cho 40 câu.

## 6. Màn hình

Dùng chung khung với `ListeningPracticePage`: thanh trên, dòng `progress`, `controls`, màn kết quả, "Danh sách câu" và hàng "✅ Đã nắm" ở lượt ôn. Phần nội dung câu thay theo `part.format`, đúng như các bản phác đã duyệt (lưu trong `.superpowers/brainstorm/…/p1-layout.html` tuỳ chọn A, `p2-layout.html`, `p3-layout.html`).

### 6.1 Part 1 — một bộ

- Dòng `progress`: "Bộ 3 / 10 · Câu đơn".
- Hàng 6 từ A–F. Từ đã đặt vào chỗ trống thì mờ đi; từ của câu 例如 mờ ngay từ đầu.
- Câu 例如 viết màu nhạt, có sẵn chữ cái đã điền. Tiếp theo là 5 câu đánh số 1–5 (không dùng số 46–50 vì lượt luyện không phải đề thật). Mỗi chỗ trống là một ô bấm được.
- Cách thao tác: bấm một chỗ trống để chọn nó, rồi bấm một từ (hoặc gõ phím) để đặt từ vào. Nếu từ đó đang nằm ở chỗ khác thì nó được chuyển sang chỗ này. Bấm vào chỗ đã có từ để chọn lại. Nút "Nộp bộ (k/5)" chỉ bấm được khi đã đủ 5 chỗ.
- Sau khi nộp: mỗi chỗ trống tô đúng hoặc sai, chỗ sai hiện thêm từ đúng. Dưới mỗi câu có câu đầy đủ, pinyin (bật/tắt), dịch và 💡 lời giải. Khung đầu ghi "✅ 5/5" hoặc "❌ 3/5". Sai từ một chỗ trở lên thì đánh dấu `r:p1-xxx` là `'r'`.
- Màn kết quả đếm theo **số câu** (vd. 8/10), và liệt kê các bộ có câu sai.

### 6.2 Part 2 — một câu

- Dòng `progress`: "Câu 4 / 10 · Sắp xếp ba câu thành đoạn văn".
- Ba ô trống đánh số 1–3, bên dưới là các câu còn lại, mỗi câu có nhãn chữ cái. Bấm một câu để đặt vào ô trống kế tiếp, bấm một câu đã đặt để gỡ ra. Viết thành phần riêng: `OrderQuestion` hiện ghép chuỗi, không có nhãn chữ cái và không xử lý phím.
- Sau khi kiểm tra: dòng "✓ Đúng: B → C → A" hoặc "✗ Bạn xếp: A → B → C · Đúng: B → C → A"; đoạn đã ghép với `clues` tô vàng; nút bật/tắt pinyin và dịch; 💡 lời giải ba bước. Sai thì đánh dấu `r:p2-xxx`.

### 6.3 Part 3 — một đoạn

- Dòng `progress`: "Đoạn 3 / 17 · Câu hỏi 3 / 20" ở lượt tổng hợp, "Đoạn 3 / 15" ở lượt theo dạng.
- Đoạn văn đặt trong khung, mặc định không có pinyin. Nút Pinyin dùng được ngay; nút Dịch chỉ dùng được sau khi đã trả lời hết các câu hỏi của đoạn.
- Ở mỗi câu hỏi, 4 nút A–D xếp dọc (giống `ChoiceQuestion`). Bấm là chấm luôn: nút đã chọn tô đúng hoặc sai, đáp án đúng luôn được tô; trong bài, `evidence` của câu hỏi đó được tô vàng; hiện pinyin và nghĩa của 4 đáp án cùng 💡 lời giải. Sai thì đánh dấu `r:p3-xxx.n`.
- Chỉ khi mọi câu hỏi của đoạn đã được trả lời thì nút "Đoạn tiếp ›" (và phím `Enter`) mới dùng được.
- Lượt ôn: mỗi đoạn có câu hỏi "Cần ôn" hiện lại cả đoạn, nhưng chỉ có các câu hỏi đang "Cần ôn".

## 7. Code (hướng tổng quát, người làm quyết định chi tiết)

- `src/reading.js` (không dùng React, Node test được), làm theo khuôn `src/listening.js`: `PART_TABS`, `PARTS`, `partById`, hàm khoá dấu, các mục theo dạng, `typeCount`, `buildRun`, `buildMix` (có cách riêng cho Part 1 và cho tỉ lệ ngắn/dài của Part 3), `reviewItems`, `keyAction` cho từng format, hàm chấm (bộ Part 1, thứ tự Part 2), hàm tìm các đoạn cần tô (vị trí `clues`/`evidence` trong chữ), lưu/đọc lựa chọn pinyin, và `validateReading`. Dùng lại `shuffle` trong `src/random.js`.
- **Trang và thành phần:** có `ReadingHubPage`, `ReadingTipsPage`, `ReadingNav`, `ReadingPracticePage` với một thành phần nội dung cho mỗi format. Nếu thấy hợp lý thì cho trang chọn bài và trang mẹo của phần Nghe và phần Đọc dùng chung một thành phần nhận dữ liệu. Chỉ tổng quát hoá khi không làm thay đổi hành vi của phần Nghe; nếu tổng quát hoá làm code rối hơn thì cứ viết riêng.
- **Test:** thêm `tests/reading.test.mjs` vào `test:unit`. Test gồm: dữ liệu thật hợp lệ; validator bắt được từng loại lỗi ở mục 3; chấm bộ Part 1 (kể cả trường hợp chuyển một từ từ chỗ này sang chỗ khác); chấm Part 2; `buildMix` đúng số lượng và tỉ lệ cho từng part; `keyAction`; tìm đoạn cần tô (khi có nhiều `evidence`, hoặc khi các đoạn chồng lên nhau). Thêm các đường dẫn `/reading…` vào `tests/router.test.mjs`.
- **README:** viết đoạn mô tả chuyên mục, thêm dòng vào bảng Pages và Layout, và thêm mục "Reading data".

## 8. Rủi ro

- **Chất lượng đề là rủi ro lớn nhất.** Hai lỗi dễ mắc là đáp án không duy nhất (ở Part 1 có hai từ cùng hợp một chỗ trống; ở Part 2 có hai thứ tự đều đọc xuôi) và từ vượt quá HSK 4. Vì vậy mỗi lô đều qua một lượt rà soát riêng (mục 2), và có điểm dừng để người dùng làm thử.
- **Màn Part 1 có nhiều trạng thái** (chỗ đang chọn, chuyển từ giữa các chỗ, nộp, phím tắt) nên dễ có lỗi giao diện. Phần logic cần giữ ở hàm thuần và có test.
- **Giới hạn đồng bộ:** server cho tối đa 2000 dấu. Hiện có tối đa khoảng 980 dấu; phần Đọc thêm tối đa 20 + 40 + 80 = 140, nên vẫn còn dư.

## 9. Triển khai

1. Khung chuyên mục (route, sidebar, tab, `reading.js`, validator, test). Part 1: màn làm bài, mẹo, **4 bộ** (2 Câu đơn, 2 Hội thoại), rà soát, test xanh, build, commit.
2. **Dừng để người dùng dùng thử Part 1:** độ khó, thao tác, lời giải. Sửa theo góp ý.
3. 16 bộ còn lại của Part 1, viết theo lô, có rà soát. Commit.
4. Part 2: màn làm bài, mẹo, 40 câu (rà soát theo lô). **Dừng cho người dùng thử.**
5. Part 3: màn làm bài, mẹo, 70 đoạn (rà soát theo lô). **Dừng cho người dùng thử.**
6. Giữa các bước: part chưa có nội dung thì tab mờ; dạng chưa có nội dung thì thẻ mờ "Sắp có"; lượt tổng hợp chỉ lấy từ những dạng đã có nội dung. Không deploy giữa chừng trừ khi người dùng muốn.
