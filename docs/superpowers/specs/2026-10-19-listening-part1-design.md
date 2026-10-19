# Thiết kế: Chuyên mục Nghe hiểu — Part 1 判断对错

Ngày: 2026-10-19 · Trạng thái: chờ duyệt spec

## 1. Mục tiêu

Thêm chuyên mục thứ tư trên sidebar, `🎧 Nghe hiểu`, để **luyện riêng từng phần của bài thi nghe HSK 4**, giống cách STUDY4 cho luyện riêng từng part của TOEIC (chỉ tham khảo, giao diện theo đúng app này). Bài thi nghe HSK 4 có 3 phần:

1. **判断对错** – nghe một đoạn ngắn, xét câu ★ đúng hay sai (câu 1–10 của đề).
2. **选择正确答案** – nghe hội thoại ngắn, chọn 1 trong 4 đáp án (câu 11–25).
3. **听对话或短文并回答问题** – nghe hội thoại dài/đoạn văn, trả lời câu hỏi (câu 26–45).

**Đợt này chỉ làm Part 1.** Tab Part 2, 3 có mặt nhưng mờ, ghi "Sắp có".

Vòng học của một dạng câu: **đọc mẹo → nghe và chọn Đúng/Sai → chấm ngay, xem transcript + pinyin + dịch + giải thích → câu sai tự thành "Cần ôn" → ôn lại câu sai.**

**Thành công nghĩa là:** mở `/listening`, thấy trang Part 1 gồm mẹo làm bài, 3 dạng câu, luyện tổng hợp và ôn câu sai; vào một dạng, nghe audio giọng người tự nhiên (giống nhau trên mọi máy), chọn 对/错, thấy ngay đúng sai và lời giải; câu sai được đánh dấu "Cần ôn" và đồng bộ qua tài khoản như các chuyên mục khác; backend không đổi.

### Quyết định đã chốt (với người dùng)

| Vấn đề | Quyết định |
|---|---|
| Phạm vi đợt này | Chỉ Part 1 判断对错; khung chuyên mục có sẵn tab cho Part 2, 3 |
| Nguồn đề | Claude **tự soạn đề mới** theo chuẩn HSK 4 (không chép đề STUDY4 hay đề nào khác) |
| Âm thanh | **File mp3 tạo sẵn** bằng dịch vụ đọc chữ trên mạng; công cụ: **edge-tts** (giọng Microsoft neural, không cần tài khoản) |
| Giao diện | Theo đúng app hiện tại (bản phác `part1-app-v3`): trang chọn bài dạng thẻ như `PracticeHub`, màn luyện như `ComparePracticePage` |
| Cách chấm | Chấm ngay từng câu (như mọi bài luyện trong app); không có chế độ "làm hết rồi nộp" |

### Quyết định do Claude đặt (người dùng có thể đổi khi đọc spec)

| Vấn đề | Quyết định |
|---|---|
| Chia dạng Part 1 | 3 dạng: 🔢 **Chi tiết** (thời gian, số lượng, người, nơi), 💬 **Thái độ, ý kiến**, 🧠 **Suy luận, ý chính** |
| Số câu đợt này | 12 câu mỗi dạng → 36 câu Part 1 |
| Một lượt luyện dạng | Tất cả câu của dạng đó, thứ tự xáo trộn |
| Luyện tổng hợp | 10 câu rút ngẫu nhiên từ cả 3 dạng (gần đều mỗi dạng), lượt mới mỗi lần |
| Ôn câu sai | Mọi câu Part 1 đang "Cần ôn", tối đa 30 câu |
| Đơn vị đánh dấu | Từng **câu** (không phải từng dạng), khoá `l:<id>` như `l:p1-007`, dùng chung kho dấu `useMarks` |
| Làm sai | Tự đặt "Cần ôn" cho câu đó; làm đúng không tự xoá dấu. Ở màn kết quả của lượt "Ôn câu sai" có nút "✅ Đã nắm" từng câu (như Ôn ngữ pháp) |
| Nghe | Tự phát một lần khi câu hiện ra; nút "🔁 Nghe lại" không giới hạn; tốc độ 0.8× / 1× / 1.25× (nhớ trong `localStorage`) |
| Transcript | Chỉ hiện sau khi trả lời; pinyin bật/tắt được (nhớ trong `localStorage`) |
| Nội dung mẹo | Trang mẹo viết sẵn trong JSON, có câu ví dụ bấm nghe được |

### Không thay đổi

Backend `server/`, `functions/`, migration, cơ chế đồng bộ, `useMarks`/`useAccount`/`useSpeech`, nội dung và hành vi các chuyên mục Từ vựng, Ngữ pháp, Từ dễ nhầm.

### Ngoài phạm vi (YAGNI)

Part 2 và 3 (chỉ có tab mờ), chế độ thi có hẹn giờ / nộp bài, chép chính tả, tạo audio lúc chạy (runtime TTS), người dùng tự thêm đề, SRS theo lịch, giữ lượt làm dở khi rời trang.

## 2. Định dạng một câu Part 1 (giống đề thật)

Trong đề HSK 4, phần 1: audio đọc một đoạn ngắn (1–3 câu, khoảng 40–80 chữ), sau đó đọc câu ★; trên giấy chỉ có câu ★. Người học chọn đúng (√) / sai (×). Đáp án đúng/sai trong đề thật xấp xỉ một nửa mỗi loại.

Quy tắc soạn đề (cho người viết nội dung):

- Từ vựng và ngữ pháp trong phạm vi HSK 1–4; tránh từ ngoài HSK 4, nếu bắt buộc thì chỉ dùng từ dễ đoán và không phải từ khoá của câu.
- Đoạn nghe 40–80 chữ Hán, văn nói tự nhiên, một người nói.
- Câu ★ 8–20 chữ, **không** chép nguyên văn một câu trong đoạn nghe với câu đúng; câu sai phải sai vì một chi tiết/ý rõ ràng, không mơ hồ.
- Mỗi dạng: 5–7 câu đáp án 对, còn lại 错.
- Giải thích tiếng Việt chỉ rõ cụm từ quyết định đáp án (ví dụ "本来打算…可是…只好… → kế hoạch đã đổi").
- Chủ đề đa dạng, gần với giáo trình HSK Standard Course 4 (công việc, học tập, du lịch, sức khoẻ, gia đình, mua sắm…).

## 3. Dữ liệu: `src/data/listening.json`

```json
{
  "parts": [
    {
      "id": "p1",
      "name": "判断对错",
      "label": "Phán đoán đúng/sai",
      "desc": "Nghe một đoạn ngắn, xét câu ★ đúng hay sai.",
      "tips": {
        "intro": "…đoạn mở đầu tiếng Việt…",
        "sections": [
          { "title": "Đọc câu ★ trước khi nghe", "body": "…", "examples": [["本来…", "běnlái…", "Dịch…"]] }
        ]
      },
      "types": [
        { "id": "detail", "icon": "🔢", "name": "Chi tiết", "desc": "Câu ★ nói về thời gian, số lượng, người, nơi chốn.", "tip": "…mẹo riêng của dạng…" },
        { "id": "attitude", "icon": "💬", "name": "Thái độ, ý kiến", "desc": "…", "tip": "…" },
        { "id": "infer", "icon": "🧠", "name": "Suy luận, ý chính", "desc": "…", "tip": "…" }
      ],
      "questions": [
        {
          "id": "p1-001",
          "type": "detail",
          "voice": "f",
          "text": "我本来打算这个周末去爬山，可是天气预报说周六有大雨，只好改到下周了。",
          "pinyin": "Wǒ běnlái dǎsuàn zhège zhōumò qù páshān, kěshì tiānqì yùbào shuō zhōuliù yǒu dàyǔ, zhǐhǎo gǎi dào xià zhōu le.",
          "vi": "Tôi định cuối tuần này đi leo núi, nhưng dự báo thứ Bảy mưa to, đành dời sang tuần sau.",
          "statement": "他这个周末要去爬山。",
          "statementPinyin": "Tā zhège zhōumò yào qù páshān.",
          "answer": false,
          "explain": "本来打算…可是…只好… = \"định… nhưng… đành…\" → kế hoạch đã đổi, nên câu ★ sai."
        }
      ]
    }
  ]
}
```

- `id` câu: `p1-` + 3 chữ số, không đổi sau khi phát hành (là khoá đánh dấu và tên file audio).
- `voice`: `f` hoặc `m`, xen kẽ giữa các câu.
- `answer`: `true` = 对, `false` = 错.
- Part 2, 3 sau này thêm phần tử vào `parts` với dạng câu riêng; đợt này code chỉ cần hiểu loại câu của Part 1, nhưng tab đọc `parts` + một danh sách tab cố định 3 phần để vẽ tab mờ.

## 4. Âm thanh

### Tạo file

- Script `scripts/tts.py` (Python, dùng gói `edge-tts`, cài bằng `pip install edge-tts`; không thêm vào `package.json`), chạy tay: `python3 scripts/tts.py`.
- Đọc `src/data/listening.json`, với mỗi câu tạo `public/audio/listening/<id>.mp3` nếu file chưa có hoặc chữ đã đổi (lưu mã băm của nội dung đọc trong `public/audio/listening/manifest.json`; có cờ `--force` để tạo lại hết).
- **Ai tạo:** người làm (Claude) tự chạy script và commit file mp3 trong kế hoạch — đã kiểm tra máy có mạng tới dịch vụ đọc của Microsoft. Máy chưa có `ffmpeg`.
- Nội dung một file: đoạn nghe (giọng của câu) → im lặng ~1.5 s → câu ★ (giọng còn lại), giống đề thật. Cách ghép mặc định: nối byte các đoạn mp3 cùng định dạng (edge-tts trả cùng một định dạng) với một đoạn im lặng cùng định dạng. Kiểm tra bắt buộc: mở thử vài file trong Chrome bằng thẻ `<audio>` (không lỗi, `duration` đúng cỡ tổng các đoạn). Nếu không đạt thì `brew install ffmpeg` và ghép bằng `ffmpeg`; ghi cách đã dùng vào README.
- Giọng: nữ `zh-CN-XiaoxiaoNeural`, nam `zh-CN-YunxiNeural`; tốc độ mặc định của dịch vụ (đề HSK 4 đọc chậm vừa — người làm thử nghe và chỉnh `rate` một lần cho cả bộ, ví dụ `-5%`).
- File mp3 được commit vào repo (36 file cỡ vài chục KB, tổng < 3 MB). Vite tự chép `public/` vào `dist/`, Cloudflare Pages phục vụ như file tĩnh.
- Rủi ro: edge-tts là cách dùng không chính thức tính năng đọc của Edge, có thể ngừng chạy. Vì file đã tạo sẵn và commit, app không bị ảnh hưởng; chỉ việc tạo file mới bị chặn (khi đó đổi sang Azure Speech chính thức, cùng giọng).

### Phát trong app

- Thẻ `<audio>` (HTML) với `src="/audio/listening/<id>.mp3"`, không dùng Web Speech cho đoạn nghe.
- Tự phát khi câu hiện ra. Trình duyệt có thể chặn tự phát (lần đầu vào trang chưa có thao tác) → khi đó chỉ hiện nút ▶ để người dùng bấm, không báo lỗi.
- Thanh điều khiển: ▶/⏸, thanh tiến độ (xem được, không cần kéo tua), thời gian `00:05 / 00:14`, 🔁 Nghe lại (về đầu và phát), nút tốc độ xoay vòng 0.8× → 1× → 1.25× (`playbackRate`).
- Chuyển câu thì dừng audio câu cũ.
- File lỗi/không tải được: hiện "⚠️ Không tải được audio" trong khung câu, vẫn cho trả lời và xem transcript.
- Câu ví dụ trong trang mẹo dùng `useSpeech` (Web Speech) như các chuyên mục khác — chỉ là ví dụ ngắn, không cần file.

## 5. Đường dẫn và điều hướng

| Path | Trang |
|---|---|
| `/listening` | Chuyển thẳng tới `/listening/p1` (part đang làm) |
| `/listening/p1` | Trang chọn bài Part 1 (thẻ) |
| `/listening/p1/tips` | Mẹo làm bài Part 1 |
| `/listening/p1/practice/<type>` | Lượt luyện một dạng (`detail`, `attitude`, `infer`) |
| `/listening/p1/practice/mix` | Luyện tổng hợp |
| `/listening/p1/review` | Ôn câu sai |

- `routes.js`: thêm `{ id: 'listening', path: '/listening', label: '🎧 Nghe hiểu' }` vào `SECTIONS`, thêm tiêu đề trang vào `PAGE_TITLES`, `sectionOf` nhận trang `listening*`, hàm khớp đường dẫn mới (path lạ → về `/listening/p1`). Bổ sung `tests/router.test.mjs`.
- Thanh tab trên cùng (`ListeningNav`, theo mẫu `CompareNav`): `① 判断对错` · `② 选择正确答案` · `③ 对话 · 短文`. Tab ②③ là phần tử không bấm được, mờ, có `title="Sắp có"`.

## 6. Màn hình

### 6.1 Trang chọn bài `/listening/p1`

Theo bản phác ①, dùng lại lớp CSS `practice-hub` / `exercise-card`:

- Dòng tóm tắt trên cùng (`exercise-summary`): "Part 1 · Phán đoán đúng/sai · Nghe 1 đoạn ngắn, xét câu ★ đúng hay sai · 36 câu · N câu cần ôn".
- Thẻ: 📘 Mẹo làm bài · 🔢 Chi tiết · 💬 Thái độ, ý kiến · 🧠 Suy luận, ý chính · 🎯 Luyện tổng hợp · 🔁 Ôn câu sai.
- Dòng phụ của thẻ dạng: "12 câu · K cần ôn" (đếm từ kho dấu). Không lưu "lần làm gần nhất" (bản phác ghi "đúng 7/10" chỉ minh hoạ — bỏ để khỏi thêm trạng thái mới).
- Thẻ Ôn câu sai: "N câu cần ôn"; N = 0 thì thẻ mờ (`off`), ghi "Chưa có câu nào cần ôn 🎉".

### 6.2 Mẹo làm bài `/listening/p1/tips`

- `exercise-top` có "← Part 1".
- Đoạn mở đầu, rồi các mục (tiêu đề + nội dung + ví dụ có nút 🔊 đọc bằng Web Speech), rồi mẹo riêng của 3 dạng, mỗi dạng có nút "Luyện dạng này ▶".
- Nội dung mẹo tối thiểu: định dạng phần 1 (10 câu, nghe 1 lần trong thi thật, câu ★ in sẵn), đọc câu ★ trước và đoán từ khoá, các bẫy hay gặp (phủ định 不/没, số và thời gian, 本来/打算 vs thực tế, 不一定/差不多/几乎, từ đồng nghĩa thay cho từ trong bài), cách xử lý khi lỡ một đoạn.

### 6.3 Lượt luyện (dạng / tổng hợp / ôn câu sai)

Theo bản phác ②, cùng khung và lớp CSS với `ComparePracticePage` (`exercise-top`, `fillblank-box`, `progress`, `fb-opt`, `quiz-reveal`, `controls`, `fb-score`, `question-grid-*`):

- `exercise-top`: "← Part 1" và tóm tắt "Part 1 · 🔢 Chi tiết · 12 câu".
- `progress`: "Câu 3 / 12 · Nghe rồi chọn Đúng hay Sai".
- Thanh audio (mục 4).
- Câu ★ chữ to (cỡ chữ câu như `fb-sentence`). Không hiện pinyin câu ★ trước khi trả lời.
- Hai nút `fb-opt` lớn: "✔ 对 · Đúng" và "✘ 错 · Sai". Phím tắt: `1`/`←` = 对, `2`/`→` = 错, `Enter` = câu tiếp sau khi đã trả lời.
- Sau khi chọn: nút chọn tô `correct`/`wrong` như hiện có, nút đáp án đúng luôn tô `correct`; khung `quiz-reveal ok|bad` gồm: "✅ Đúng — đáp án: 错" / "❌ Sai — đáp án: 错"; transcript (chữ Hán, nút 🔊 phát lại file audio, pinyin bật/tắt), câu ★ kèm pinyin, dịch tiếng Việt, 💡 giải thích.
- Sai → `setMark('l:<id>', 'r')` nếu chưa là `r`.
- `controls`: ◀ Câu trước · Câu tiếp ▶ / Xem kết quả ▶ · 🏁 Kết quả (đúng/đã làm) — như Từ dễ nhầm. Có thể quay lại câu đã làm để xem lời giải, không trả lời lại.
- "Danh sách câu" có tô xanh/đỏ, bấm để nhảy câu.

### 6.4 Màn kết quả

Như `ComparePracticePage`: "Kết quả: x / n (Đã làm m / n câu)"; danh sách câu sai (câu ★ + đáp án, bấm để xem lại câu đó trong lượt); nút 🔁 Làm lại câu sai · 🔀 Làm lượt mới · ← Part 1. Lượt "Ôn câu sai" có thêm danh sách các câu trong lượt với nút "✅ Đã nắm" (đặt dấu `k`, bỏ khỏi danh sách cần ôn), như Ôn ngữ pháp.

## 7. Code

- `src/listening.js` — hàm thuần, không DOM/React (để test bằng Node): đọc `listening.json`, `listenKey(id)`, lấy câu theo part/dạng, `buildRun(questions, { shuffle, max })`, `buildMix(part, n)` (gần đều mỗi dạng), `reviewQuestions(getMark)`, đếm câu cần ôn.
- `src/pages/ListeningHubPage.jsx`, `ListeningTipsPage.jsx`, `ListeningPracticePage.jsx` (dùng cho cả 3 kiểu lượt).
- `src/components/ListeningNav.jsx`, `AudioPlayer.jsx` (thẻ `<audio>` + điều khiển), `TrueFalseQuestion.jsx`.
- CSS mới chỉ cho những gì chưa có (thanh audio, câu ★, khung transcript), đặt cạnh các lớp tương ứng trong `styles.css`; màu nhấn của chuyên mục theo cách các chuyên mục khác đặt `--accent-*`.
- `tests/listening.test.mjs` (thêm vào `test:unit`): dữ liệu hợp lệ (id duy nhất và đúng mẫu, `type` thuộc `types`, `answer` là boolean, các trường chữ không rỗng, mỗi dạng có cả câu đúng và câu sai, mọi câu có file mp3 trong `public/audio/listening/`), `buildMix` không trùng câu và đủ số câu, `reviewQuestions` lọc đúng.
- README: thêm chuyên mục Nghe hiểu vào mô tả và bảng Pages; mục "Tạo audio" (cài `edge-tts`, chạy script, khi nào cần `--force`).

## 8. Triển khai

1. Code + mẹo + **12 câu dạng Chi tiết** + audio, commit.
2. **Dừng để người dùng duyệt:** người dùng nghe thử trong app, góp ý về độ khó, giọng và tốc độ (`rate`), nội dung đề. Sửa theo góp ý (tạo lại audio bằng `--force` nếu đổi `rate`).
3. 12 câu Thái độ + 12 câu Suy luận + audio, commit.

Giữa bước 1 và 3, dạng chưa có câu vẫn phải chạy đúng (code không giả định đủ 3 dạng):
- Thẻ dạng 0 câu mờ (`off`), ghi "Sắp có".
- Số câu trên trang chọn bài đếm từ dữ liệu, không viết cứng.
- Luyện tổng hợp chỉ rút từ dạng có câu.
- Test "mỗi dạng có cả câu đúng và câu sai" chỉ áp cho dạng có câu.
Không triển khai (deploy) riêng bước 1 trừ khi người dùng muốn.

Part 2, 3 là spec riêng sau khi Part 1 dùng ổn.
