# Thiết kế: Nghe hiểu — Part 2 选择正确答案

Ngày: 2026-10-20 · Trạng thái: chờ duyệt spec · Nối tiếp [Part 1](2026-10-19-listening-part1-design.md) (đã làm và deploy)

## 1. Mục tiêu

Làm tiếp chuyên mục `🎧 Nghe hiểu`: tab **② 选择正确答案** trở thành phần luyện thật (hiện đang mờ "Sắp có"). Đề HSK 4 phần này (câu 11–25, 15 câu): mỗi câu nghe **một đoạn hội thoại ngắn giữa hai người (nam – nữ, mỗi người một lượt)** và **một câu hỏi** (cả hai chỉ nghe, không in trên giấy), rồi chọn **1 trong 4 đáp án A–D in sẵn** (chữ Hán).

Vòng học giống Part 1: **đọc mẹo → nghe → chọn đáp án → chấm ngay, xem transcript + pinyin + dịch + giải thích → câu sai tự thành "Cần ôn" → ôn lại câu sai.**

**Thành công nghĩa là:** mở `/listening/p2`, thấy trang Part 2 (mẹo, 4 dạng câu hỏi, luyện tổng hợp, ôn câu sai) giống Part 1; vào một dạng, nghe audio hội thoại hai giọng nam/nữ rồi câu hỏi, chọn A–D bằng chuột hoặc phím, thấy ngay đúng sai kèm lời giải; câu sai được đánh dấu "Cần ôn" và đồng bộ như các chuyên mục khác; Part 1 vẫn chạy y như cũ; backend không đổi.

### Quyết định kế thừa từ Part 1 (không bàn lại)

Đề do Claude tự soạn theo chuẩn HSK 4 (không chép nguồn khác); âm thanh là mp3 tạo sẵn bằng edge-tts, commit vào repo; giao diện theo đúng khung và lớp CSS hiện có (thẻ chọn bài như `PracticeHub`, màn luyện như `ComparePracticePage`); chấm ngay từng câu (không có chế độ nộp bài); dấu "Cần ôn" theo từng câu qua `useMarks`; nghe tự phát một lần khi hiện câu, có Nghe lại và tốc độ 0.8× / 1× / 1.25×; transcript chỉ hiện sau khi trả lời, pinyin bật/tắt (nhớ trong `localStorage`); giải thích bằng tiếng Việt; làm theo giai đoạn, dừng cho người dùng nghe thử và duyệt trước khi soạn hết.

### Quyết định do Claude đặt (người dùng có thể đổi khi đọc spec)

| Vấn đề | Quyết định |
|---|---|
| Chia dạng Part 2 | 4 dạng theo kiểu câu hỏi: 🔎 **Chi tiết** (thời gian, số lượng, người, nơi chốn, việc đang làm), ❓ **Nguyên nhân, vấn đề** (为什么 / 怎么了 / 有什么问题), 💬 **Thái độ, đề nghị** (觉得 / 建议 / 同意), 🧠 **Suy luận** (quan hệ, nghề nghiệp, nơi nói chuyện, ý ngầm) |
| Số câu | 10 câu mỗi dạng → 40 câu Part 2 |
| Đoạn hội thoại | Đúng **2 lượt** (như đề thật), hai giọng khác nhau, tổng 25–60 chữ Hán |
| Câu hỏi | Đọc bằng audio ở cuối đoạn; **không hiện trên màn hình** trước khi trả lời (như đề thật), nhưng có liên kết "👁 Xem câu hỏi" cho người chưa nghe kịp; sau khi trả lời luôn hiện (chữ Hán + pinyin + dịch) |
| Đáp án | 4 lựa chọn A–D hiện sẵn bằng chữ Hán; sau khi trả lời hiện thêm pinyin và nghĩa tiếng Việt của **cả 4** đáp án |
| Luyện tổng hợp | 15 câu (bằng số câu của đề thật), xoay vòng giữa các dạng; Part 1 giữ 10 câu |
| Ôn câu sai | Như Part 1: mọi câu Part 2 đang "Cần ôn", tối đa 30 câu |
| Phím tắt | `1`–`4` hoặc `A`–`D` chọn đáp án; `Enter` sang câu tiếp sau khi đã trả lời; (không dùng ← → vì có 4 lựa chọn) |
| Giai đoạn | 1) code + mẹo + 10 câu Chi tiết + audio → **dừng cho người dùng nghe thử hội thoại hai giọng**; 2) 30 câu còn lại |

### Không thay đổi

Backend `server/`, `functions/`, migration, cơ chế đồng bộ; `useMarks`/`useAccount`/`useSpeech`; nội dung, đường dẫn và hành vi của **Part 1** (id câu `p1-…`, file audio `p1-….mp3`, khoá dấu `l:p1-…`, dữ liệu trong `listening.json`) và của các chuyên mục khác. **Không tạo lại audio Part 1**: công thức băm trong `scripts/tts.py` cho câu 对/错 giữ nguyên để `tts.py` báo "skipped 36" cho Part 1.

### Ngoài phạm vi (YAGNI)

Part 3 (spec riêng sau), chế độ thi có hẹn giờ / nộp bài, đoạn hội thoại hơn 2 lượt, hình ảnh, giữ lượt làm dở khi rời trang, thay đổi giới hạn số dấu đồng bộ (xem mục 8).

## 2. Định dạng một câu Part 2 và quy tắc soạn đề

Audio của một câu: lượt 1 (giọng A) → nghỉ ngắn → lượt 2 (giọng B) → nghỉ ~1 s → câu hỏi (đọc bằng một giọng, thường là giọng *khác* người nói lượt cuối để dễ phân biệt). Không in câu hỏi; in 4 đáp án.

Quy tắc soạn (cho người viết nội dung):

- Từ vựng và ngữ pháp trong phạm vi HSK 1–4; tránh từ ngoài HSK 4 (nếu bắt buộc thì không phải từ khoá).
- Hội thoại đúng 2 lượt, một nam một nữ (thứ tự tuỳ câu, xen kẽ giữa các câu), tổng 25–60 chữ Hán, văn nói tự nhiên (có thể có 啊、吧、呢、嗯).
- Câu hỏi 6–15 chữ Hán, một câu, hỏi về đúng một điểm của hội thoại (谁、哪儿、什么时候、为什么、怎么了、什么关系、觉得…怎么样、他们最可能在哪儿…).
- 4 đáp án dài 2–12 chữ Hán, **khác nhau**, cùng loại (cùng là địa điểm / cùng là lý do…), đúng một đáp án; mỗi câu có ít nhất một đáp án nhiễu dùng lại từ trong hội thoại (bẫy "nghe thấy từ nào chọn từ đó").
- Đáp án đúng rải đều: trong mỗi dạng 10 câu, mỗi chữ cái A–D là đáp án đúng 1–4 lần.
- Dạng **Suy luận** không nói thẳng đáp án; người nghe phải hiểu ngầm (xưng hô, từ vựng đặc trưng, tình huống).
- Giải thích tiếng Việt chỉ rõ cụm từ/chi tiết quyết định đáp án và vì sao đáp án nhiễu sai.
- Chủ đề đa dạng, gần giáo trình HSK Standard Course 4 (công việc, học tập, du lịch, sức khoẻ, mua sắm, thời tiết, gia đình…); không trùng cốt truyện với 36 câu Part 1.

## 3. Dữ liệu: `src/data/listening.json`

Thêm phần tử thứ hai vào `parts` (Part 1 giữ nguyên). Mỗi part có thêm trường `format`: `"truefalse"` (Part 1; trường được thêm vào dữ liệu hiện có) hoặc `"choice"` (Part 2). Code đọc `part.format` để chọn dạng validate, dạng audio, dạng màn hình, dạng chấm.

```json
{
  "id": "p2",
  "format": "choice",
  "name": "选择正确答案",
  "label": "Chọn đáp án đúng",
  "desc": "Nghe một đoạn hội thoại ngắn và câu hỏi, chọn đáp án đúng.",
  "mixCount": 15,
  "tips": { "intro": "…", "sections": [ { "title": "…", "body": "…", "examples": [["…","…","…"]] } ] },
  "types": [
    { "id": "detail",   "icon": "🔎", "name": "Chi tiết", "desc": "…", "tip": "…" },
    { "id": "reason",   "icon": "❓", "name": "Nguyên nhân, vấn đề", "desc": "…", "tip": "…" },
    { "id": "attitude", "icon": "💬", "name": "Thái độ, đề nghị", "desc": "…", "tip": "…" },
    { "id": "infer",    "icon": "🧠", "name": "Suy luận", "desc": "…", "tip": "…" }
  ],
  "questions": [
    {
      "id": "p2-001",
      "type": "detail",
      "lines": [
        { "v": "m", "text": "你几点下班？我们一起去吃饭吧。", "pinyin": "Nǐ jǐ diǎn xiàbān? Wǒmen yìqǐ qù chīfàn ba.", "vi": "Mấy giờ cậu tan làm? Chúng ta cùng đi ăn cơm nhé." },
        { "v": "f", "text": "今天要加班，大概七点才能走。", "pinyin": "Jīntiān yào jiābān, dàgài qī diǎn cái néng zǒu.", "vi": "Hôm nay phải làm thêm giờ, khoảng 7 giờ mới đi được." }
      ],
      "question": { "v": "f", "text": "女的大概几点下班？", "pinyin": "Nǚ de dàgài jǐ diǎn xiàbān?", "vi": "Người nữ khoảng mấy giờ tan làm?" },
      "options": [
        { "text": "五点", "pinyin": "wǔ diǎn", "vi": "5 giờ" },
        { "text": "六点", "pinyin": "liù diǎn", "vi": "6 giờ" },
        { "text": "七点", "pinyin": "qī diǎn", "vi": "7 giờ" },
        { "text": "八点", "pinyin": "bā diǎn", "vi": "8 giờ" }
      ],
      "answer": 2,
      "explain": "…"
    }
  ]
}
```

- `id`: `p2-` + 3 chữ số, cố định sau khi phát hành (là khoá dấu `l:p2-007`, 8 ký tự, tên file audio).
- `lines[].v` và `question.v`: `f` hoặc `m`.
- `answer`: chỉ số 0–3 (A–D).
- `validateListening` kiểm theo `part.format`: id đúng mẫu `<part.id>-\d{3}`, duy nhất toàn bộ file; `type` thuộc `types`; đúng 2 `lines`; các trường chữ không rỗng; đúng 4 `options` có `text`/`pinyin`/`vi` không rỗng và `text` đôi một khác nhau; `answer` là số nguyên 0–3; mỗi dạng có ≥ 2 câu thì đáp án đúng không toàn cùng một chữ cái. Câu Part 1 giữ nguyên các kiểm tra hiện có.
- Hàm dùng chung theo `part.format`: mô tả "nội dung nghe", "nội dung hiển thị câu", "đáp án đúng ở dạng chữ" để các trang không if/else rải rác.

## 4. Âm thanh

Mở rộng `scripts/tts.py` (cùng thư mục `public/audio/listening/`, cùng `manifest.json`):

- Câu `choice`: ghép **lượt 1 (giọng `lines[0].v`) + im lặng 0.5 s + lượt 2 (giọng `lines[1].v`) + im lặng 1.0 s + câu hỏi (giọng `question.v`)**. Cùng cách nối byte mp3 và cùng khung im lặng như Part 1 (24 ms/khung: 21 khung ≈ 0.5 s, 42 khung ≈ 1.0 s).
- Băm cho câu `choice`: gồm tất cả giọng, chữ của hai lượt, chữ câu hỏi và `rate`. **Công thức băm của câu `truefalse` giữ nguyên** từng chữ để không tạo lại 36 file Part 1.
- Giọng nữ `zh-CN-XiaoxiaoNeural`, nam `zh-CN-YunxiNeural`; `--rate` mặc định `-5%` như Part 1 (người dùng đã nghe và chấp nhận Part 1; nếu người dùng đổi `rate` thì áp cho phần mới, không tự tạo lại phần cũ trừ khi `--force`).
- File dài khoảng 12–25 s, 70–140 KB; 40 file ≈ 4–5 MB, commit vào repo như Part 1.
- Kiểm tra bắt buộc: mở thử vài file trong Chrome bằng thẻ `<audio>` (không lỗi, `duration` gần tổng các đoạn); dùng đúng cách đã chạy tốt ở Part 1.

## 5. Đường dẫn và điều hướng

Giống Part 1, với `p2`:

| Path | Trang |
|---|---|
| `/listening/p2` | Trang chọn bài Part 2 |
| `/listening/p2/tips` | Mẹo làm bài Part 2 |
| `/listening/p2/practice/<type>` | Lượt luyện một dạng (`detail`, `reason`, `attitude`, `infer`) |
| `/listening/p2/practice/mix` | Luyện tổng hợp (15 câu) |
| `/listening/p2/review` | Ôn câu sai |

- `matchListening` đã nhận part theo `PARTS`: thêm phần tử `p2` vào JSON là `/listening/p2/...` hợp lệ và tab ② tự hết mờ (`ListeningNav` đã dựa vào `PARTS`). Cập nhật `tests/router.test.mjs`: `/listening/p2` trước đây về hub p1, giờ phải ra trang p2; các đường dẫn lạ vẫn về `/listening/p1`.
- Sidebar vẫn trỏ `/listening/p1` (part mặc định).
- Trang chọn bài (`ListeningHubPage`) dùng chung, đã đọc từ dữ liệu; dòng tóm tắt "Part 2 · …". Mô tả thẻ lấy từ `types[].desc`.

## 6. Màn hình

### 6.1 Trang chọn bài và mẹo

Như Part 1 (thẻ Mẹo, 4 thẻ dạng với "N câu · K cần ôn" hoặc mờ "Sắp có" khi chưa có câu, Luyện tổng hợp, Ôn câu sai). Trang mẹo dùng `ListeningTipsPage` hiện có; nội dung mẹo Part 2 tối thiểu: định dạng phần 2 (15 câu, hội thoại 2 lượt, câu hỏi chỉ nghe, 4 đáp án in sẵn); **đọc 4 đáp án trước khi nghe để đoán câu hỏi** (cùng là địa điểm → hỏi nơi chốn…); câu trả lời thường nằm ở lượt 2 hoặc sau từ chuyển ý (可是、不过、其实、但是); bẫy "từ trong đáp án cũng xuất hiện trong hội thoại" (thường là đáp án nhiễu); tính toán với số/thời gian (đổi giờ, cộng trừ, "差五分八点"); nhận ra quan hệ/nghề nghiệp/nơi chốn qua từ ngữ đặc trưng và cách xưng hô; thái độ qua 觉得、建议、最好、别、太…了 và câu hỏi tu từ; lỡ một câu thì chuyển ngay.

### 6.2 Lượt luyện

Cùng khung như Part 1 (`exercise-top`, `fillblank-box`, `progress`, `controls`, `fb-score`, "Danh sách câu"), khác phần nội dung câu:

- `progress`: "Câu 3 / 10 · Nghe hội thoại rồi chọn đáp án đúng".
- Thanh audio (`AudioPlayer`, dùng lại nguyên).
- Dưới audio: liên kết nhỏ "👁 Xem câu hỏi" (chưa trả lời) — bấm thì hiện câu hỏi bằng chữ Hán (không pinyin, không dịch cho tới khi trả lời).
- 4 nút đáp án xếp dọc, mỗi nút "A. 五点" (chữ to, tự xuống dòng), lớp `fb-opt` có sửa nhẹ để rộng hết hàng; sau trả lời: nút chọn tô `correct`/`wrong`, đáp án đúng luôn `correct`.
- Sau khi trả lời, khung `quiz-reveal ok|bad`: "✅ Đúng — đáp án: C" / "❌ Sai — đáp án: C"; khung transcript: hai lượt hội thoại dạng hội thoại (nhãn "Nam"/"Nữ" theo giọng, chữ Hán, pinyin bật/tắt, dịch), câu hỏi (chữ Hán + pinyin + dịch), bảng 4 đáp án (A–D, chữ Hán + pinyin + nghĩa, đáp án đúng đánh ✔), và 💡 giải thích. Nút "Ẩn/Hiện pinyin" dùng chung lựa chọn đã lưu với Part 1.
- Trả lời sai → `setMark('l:<id>', 'r')`; chuyển câu dừng audio — y hệt Part 1.
- Phím tắt: `1`–`4` / `A`–`D` (không phân biệt hoa thường) chọn, `Enter` sang câu tiếp (kể cả ngay sau khi bấm chuột chọn đáp án — nút đáp án giữ focus, `Enter` vẫn phải chuyển câu); bỏ qua khi đang gõ trong ô nhập hay giữ Ctrl/Meta/Alt.
- Màn kết quả: như Part 1; danh sách câu sai hiện "câu hỏi" + đáp án đúng ("C. 七点"); lượt "Ôn câu sai" có hàng "✅ Đã nắm" cho từng câu.

## 7. Code (hướng tổng quát hoá, người làm quyết định chi tiết)

Part 1 đang viết cứng nhiều chỗ theo câu 对/错; Part 2 cần tách phần phụ thuộc dạng câu:

- `src/listening.js`: `validateListening` theo `part.format` (id theo `part.id`); hàm thuần mới cho từng dạng: nhãn đáp án đúng (`对/错` hoặc `C. 七点`), `keyAction` nhận thêm dạng câu (và số lựa chọn) để trả `'true'|'false'|'next'|null` cho truefalse và `{choose: 0..3}`-kiểu cho choice (giữ test cũ của truefalse xanh); `buildMix(part, n)` lấy `n = part.mixCount || 10`.
- `src/components/ChoiceQuestion` mới (4 nút A–D, trạng thái đã trả lời), bên cạnh `TrueFalseQuestion` hiện có; `ListeningPracticePage` chọn thành phần và khung transcript theo `part.format`; không nhân đôi toàn bộ trang.
- `ListeningHubPage`, `ListeningTipsPage`, `ListeningNav`, `routes.js` đã đọc từ dữ liệu; chỉ sửa chỗ còn cứng `p1` (nếu có).
- `scripts/tts.py`: hàm dựng audio theo `part.format`.
- Test (`tests/listening.test.mjs`): dữ liệu Part 2 hợp lệ (validator), `validateListening` bắt từng lỗi mới (thiếu/dư `lines`, ≠ 4 đáp án, đáp án trùng, `answer` ngoài 0–3, id sai part, thiếu `pinyin`/`vi` của đáp án), cân bằng chữ cái đáp án, `keyAction` cho choice (1–4, a–d, Enter, bỏ qua khi gõ chữ), `buildMix` dùng `mixCount`, mỗi câu có mp3. Cập nhật `tests/router.test.mjs`.
- README: thêm Part 2 vào mô tả, bảng Pages, mục dữ liệu & audio.

## 8. Rủi ro và điểm cần để mắt

- **Giới hạn đồng bộ:** server nhận tối đa `MAX_WORDS = 1000` dấu cho mỗi tài khoản. Hiện dùng tối đa 881 (620 từ vựng + 100 điểm ngữ pháp + 125 nhóm từ dễ nhầm + 36 câu nghe; giới hạn áp cho tổng số dấu của tài khoản). Part 2 thêm 40 → 921, còn dư 79. **Part 3 (dự kiến ≥ 40 câu) sẽ vượt**, nên spec Part 3 phải nâng hằng số này (thay đổi backend nhỏ, cần deploy cả hàm). Part 2 không phải đụng tới.
- **Hội thoại hai giọng** là điểm mới so với Part 1 (một giọng): nghe thử để chỉnh `rate`, độ dài nghỉ, và xem giọng nam/nữ có dễ phân biệt không — đây là lý do có điểm dừng sau giai đoạn 1.
- **Nối audio** đã chứng minh chạy trên Chrome; chưa kiểm tra Safari/Firefox (rủi ro giữ nguyên từ Part 1; nếu có lỗi thì tạo lại bằng `ffmpeg`).
- **Câu hỏi bị ẩn** là cố ý (giống đề thi); người dùng có thể thấy khó hơn Part 1 lúc đầu — liên kết "Xem câu hỏi" giảm bớt.

## 9. Triển khai

1. Tổng quát hoá code + mẹo Part 2 + **10 câu dạng Chi tiết** + audio, test xanh, build, commit. (Chưa deploy.)
2. **Dừng để người dùng duyệt:** nghe thử hội thoại hai giọng, độ khó, độ dài nghỉ, mẹo, màn hình đáp án; sửa theo góp ý (đổi `rate`/nghỉ → tạo lại audio Part 2 bằng `--force`; Part 1 không bị tạo lại nếu không có `--force`).
3. 30 câu còn lại (Nguyên nhân, Thái độ, Suy luận) + audio, commit.
4. Giữa bước 1 và 3, dạng chưa có câu hiển thị mờ "Sắp có"; luyện tổng hợp chỉ rút từ dạng có câu; kiểm tra "mỗi dạng cân bằng chữ cái đáp án" chỉ áp cho dạng đủ câu. Không deploy riêng bước 1 trừ khi người dùng muốn.
