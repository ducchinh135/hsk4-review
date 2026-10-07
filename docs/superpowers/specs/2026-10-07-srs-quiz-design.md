# Thiết kế: Ôn hằng ngày (SRS) và Quiz nhiều dạng

Ngày: 2026-10-07 · Trạng thái: đã duyệt thiết kế, chờ duyệt spec

## 1. Mục tiêu

Phát triển web ôn từ vựng HSK4 (Vite + React, Hono API trên Cloudflare Pages + D1) thành:

1. **Flashcard lặp lại ngắt quãng (SRS) kiểu Anki** — chấm Quên / Khó / Được / Dễ, app tự xếp lịch,
   tiến độ đồng bộ giữa các thiết bị qua tài khoản hiện có.
2. **Quiz nhiều dạng** — Hán tự → nghĩa, Nghĩa → Hán tự, Nghe → chọn từ, Gõ pinyin, và Điền từ vào câu
   (dạng hiện có).

**Thành công nghĩa là:** mở app mỗi ngày thấy ngay "hôm nay còn X thẻ", ôn xong trên máy này thì sang
điện thoại thấy cùng tiến độ; quiz luyện được cả 5 dạng; trả lời sai trong quiz thì từ đó quay lại hàng
ôn SRS hôm nay.

### Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Thiếu gì ở thẻ hiện tại | SRS (lặp lại ngắt quãng) |
| Phạm vi hàng ôn SRS | Một hàng chung cho mọi bài; thẻ mới thêm dần theo thứ tự bài, giới hạn N/ngày |
| Quiz ↔ SRS | Chỉ câu **sai** ảnh hưởng: từ sai bị đưa về đến hạn hôm nay. Câu đúng không đổi lịch |
| Lưu trữ | Bảng D1 `srs` riêng, đồng bộ chung request `/api/sync`, bản sửa mới nhất thắng theo từng từ |
| Thuật toán | SM-2 bản Anki rút gọn (không dùng FSRS) |

### Không thay đổi

- Tab **📇 Thẻ từ vựng** và **🔀 Ôn tập xáo trộn**, các dấu **Đã thuộc / Cần ôn** và bộ lọc giữ nguyên.
  SRS độc lập với hai dấu này (ngoại trừ: quiz sai vẫn đặt dấu "Cần ôn" như hiện nay).

### Ngoài phạm vi (YAGNI)

Cộng thưởng khoảng cho thẻ ôn trễ, fuzz ngẫu nhiên khoảng ôn, giới hạn số thẻ ôn/ngày, thống kê/biểu đồ
lịch sử, đồng bộ cài đặt "số thẻ mới mỗi ngày".

## 2. Dữ liệu và đồng bộ

### Trạng thái SRS phía client

Lưu trong `localStorage` khóa `hsk4_srs_v1`, dạng `{ [hanzi]: card }`:

```js
card = {
  due: 20734,   // số thứ tự ngày đến hạn (xem today() ở mục 3)
  ivl: 3,       // khoảng ôn (ngày). 0 = đang học / học lại
  ease: 2500,   // hệ số dễ × 1000, trong [1300, 5000]
  reps: 4,      // tổng số lần chấm
  lapses: 1,    // số lần quên khi đã là thẻ ôn (kể cả quiz sai)
  added: 20730, // ngày thẻ được đưa vào học
  t: 1765...    // thời điểm sửa (ms) — bản mới hơn thắng
}
```

Từ chưa có trong `srs` = **thẻ mới**.

### Backend

- Migration `migrations/0002_srs.sql`:
  ```sql
  CREATE TABLE srs (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word       TEXT NOT NULL,
    due        INTEGER NOT NULL,
    ivl        INTEGER NOT NULL,
    ease       INTEGER NOT NULL,
    reps       INTEGER NOT NULL,
    lapses     INTEGER NOT NULL,
    added      INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, word)
  );
  ```
- `POST /api/sync` nhận body `{ marks, srs? }`. `srs` là tùy chọn — client cũ chỉ gửi `marks` vẫn chạy.
  Mỗi từ được upsert với điều kiện `excluded.updated_at > srs.updated_at` (giống `progress`).
  Phản hồi: `{ marks, srs }` (toàn bộ trạng thái của tài khoản).
- Kiểm tra đầu vào cho `srs` (sai → 400 `Dữ liệu không hợp lệ.`):
  - tối đa 1000 từ (413 nếu vượt), key là chuỗi 1–12 ký tự;
  - `due`, `added`: số nguyên trong [0, 100000]; `ivl`: [0, 365]; `ease`: [1300, 5000];
    `reps`, `lapses`: [0, 100000];
  - `t`: như `marks` (số hữu hạn, > 0, không quá 1 ngày trong tương lai).
- Logic validate/upsert tách thành hàm riêng trong `server/routes/sync.js` để `marks` và `srs` không
  lặp code chunking batch.

### Frontend

- Hook `src/hooks/useSrs.js`, cấu trúc giống `useMarks`:
  `getCard(h)`, `review(h, grade)`, `lapse(h)`, `restore(h, card|undefined)` (cho Hoàn tác),
  `mergeServer(srs)`, `clearAll()`, `getAll()`, `srsRef`. Mọi sửa local đặt `t` mới (đơn điệu tăng
  theo từ) và gọi `onLocalChange` để lên lịch sync.
- `useAccount` gửi `{ marks: getMarks(), srs: getSrs() }` và gộp cả hai từ phản hồi. Đăng xuất xóa cả hai.
- Lỗi mạng: tiếp tục học offline; cơ chế thử lại 15s hiện có đẩy dữ liệu lên sau.

## 3. Thuật toán — `src/srs.js` (thuần JS, không React)

**Ngày:** `today(now = Date.now())` = `floor((now − tzOffset − 4h) / 86_400_000)` theo giờ máy. Ôn lúc
1h sáng tính vào ngày hôm trước.

**Hằng số:** `EASE_START = 2500`, `EASE_MIN = 1300`, `EASE_MAX = 5000`, `IVL_MAX = 365`.

`schedule(card | undefined, grade, today) → { card, requeue }` với `grade ∈ {1 Quên, 2 Khó, 3 Được, 4 Dễ}`.
Thẻ mới được khởi tạo `{ ivl: 0, ease: 2500, reps: 0, lapses: 0, added: today }` trước khi chấm.
Mọi lần chấm `reps + 1`.

**Thẻ đang học / học lại (`ivl = 0`):**

| Nút | Kết quả |
|---|---|
| 1 Quên | `due = today`, `requeue = 3` (hiện lại sau ~3 thẻ trong lượt) |
| 2 Khó | `due = today`, `requeue = 6` |
| 3 Được | `ivl = 1`, `due = today + 1` |
| 4 Dễ | `ivl = 4`, `due = today + 4` |

Hệ số dễ không đổi khi đang học.

**Thẻ ôn (`ivl ≥ 1`):**

| Nút | Khoảng mới | Ease |
|---|---|---|
| 1 Quên | `ivl = 0`, `due = today`, `lapses + 1`, `requeue = 3` | −200 |
| 2 Khó | `max(ivl + 1, round(ivl × 1.2))` | −150 |
| 3 Được | `max(ivl + 1, round(ivl × ease/1000))` | 0 |
| 4 Dễ | `max(ivl + 1, round(ivl × ease/1000 × 1.3))` | +150 |

Ease kẹp trong [1300, 5000]; khoảng kẹp ≤ 365; `due = today + ivl`. Khoảng tính bằng ease **trước** khi
điều chỉnh.

`preview(card, today) → [label × 4]` cho nhãn nút: thẻ đang học hiển thị `lại ngay`, `lát nữa`,
`1 ngày`, `4 ngày`; thẻ ôn hiển thị số ngày (≥ 30 ngày hiện theo tháng, ví dụ `2 tháng`).

`lapse(card | undefined, today) → card` (dùng khi quiz sai):
- thẻ ôn → như chấm Quên (không có requeue vì không ở trong lượt);
- thẻ đang học → giữ nguyên, chỉ đảm bảo `due ≤ today`;
- thẻ mới → tạo thẻ đang học `due = today`, `added = today` (tính vào số thẻ mới của ngày).

`buildQueue(srs, allWords, today, newLimit) → hanzi[]` theo thứ tự:
1. thẻ ôn đến hạn (`ivl ≥ 1`, `due ≤ today`), `due` nhỏ nhất trước;
2. thẻ đang học (`ivl = 0`, `due ≤ today`);
3. thẻ mới, theo thứ tự Bài 1 → Bài 10 và thứ tự từ trong bài, số lượng
   `max(0, newLimit − count(added == today))`.

`counts(srs, allWords, today, newLimit) → { due, learning, fresh, tomorrow }` cho dòng tóm tắt và màn hình
kết thúc (`tomorrow` = số thẻ ôn có `due == today + 1`).

`allWords` là danh sách phẳng mọi từ theo `LESSON_ORDER` (thêm export `ALL_WORDS` vào `src/lessons.js`).
Nếu một Hán tự xuất hiện ở nhiều bài, chỉ lấy lần đầu (dữ liệu hiện tại: 309 từ, không trùng).

## 4. Giao diện SRS

- Tab chế độ mới, đặt **đầu tiên**: `🧠 Ôn hằng ngày`.
- Dòng tóm tắt luôn hiển thị dưới header: `Hôm nay: 8 thẻ ôn · 10 thẻ mới [Ôn ngay]`; bấm → chuyển tab
  SRS. Khi không còn gì: `Hôm nay đã ôn xong 🎉`.
- Ở tab SRS: ẩn `FilterBar`; tiêu đề bài hiện "Tất cả các bài"; tab bài vẫn hiện nhưng không ảnh hưởng lượt.
- **Màn hình bắt đầu:** ba số Đến hạn · Đang học · Mới hôm nay; ô số "Số thẻ mới mỗi ngày"
  (mặc định 10, 0–50, lưu `localStorage` khóa `hsk4_srs_new_per_day`, không đồng bộ); nút `▶ Bắt đầu`.
- **Trong lượt:**
  - Dùng `FlipCard` với prop mới `actions` (node render ở mặt sau thay cho hàng nút Đã thuộc/Cần ôn).
    Khi không truyền `actions`, `FlipCard` hiển thị như hiện tại.
  - 4 nút chấm (màu đỏ / cam / xanh lá / xanh dương), chỉ hiện sau khi lật, ghi kèm nhãn từ `preview`:
    `Quên · lại ngay` `Khó · lát nữa` `Được · 3 ngày` `Dễ · 9 ngày`. Màn hình hẹp: lưới 2×2.
  - Phím tắt: `Space` lật, `1`–`4` chấm (chỉ khi đã lật). Bỏ qua phím khi focus đang ở ô nhập.
  - `speech.autoSpeak(hanzi)` khi hiện thẻ mới.
  - Tiến độ: "Còn N thẻ". Nút `↶ Hoàn tác` khôi phục thẻ vừa chấm (trạng thái card cũ — hoặc xóa nếu
    trước đó là thẻ mới — với `t` mới, và đưa thẻ về đầu hàng). Hoàn tác 1 bước.
  - Requeue: chèn lại hanzi vào hàng ở vị trí `min(requeue, length)`.
- **Kết thúc:** `🎉 Xong hôm nay!`, số thẻ đã ôn, số lần Quên, "Ngày mai có khoảng X thẻ", nút về màn hình
  bắt đầu.
- **Kỹ thuật:** `SrsPanel` render ngoài `Study` (vì `Study` bị remount khi đổi bài/bộ lọc). Hàng ôn tạo
  lúc bấm Bắt đầu; dữ liệu sync về giữa lượt không làm đổi hàng hiện tại.

## 5. Quiz

- Tab `✏️ Điền từ vào chỗ trống` thay bằng `📝 Quiz`. Quiz lấy từ theo bài + bộ lọc hiện tại.
  Xóa `FillPanel.jsx`.
- **Cài đặt lượt:** chọn dạng (checkbox, mặc định tất cả; phải chọn ≥ 1), số câu 10 / 20 / Tất cả
  (lấy tối đa số từ đang có), ô "Không cần dấu thanh" (cho dạng gõ pinyin, lưu `localStorage`).
  Mỗi câu chọn ngẫu nhiên một dạng trong các dạng đã tích mà áp dụng được cho từ đó; mỗi từ tối đa
  một câu trong một lượt.
- **Dạng câu hỏi:**
  1. `meaning` — Hán tự → chọn 1/4 nghĩa.
  2. `hanzi` — Nghĩa → chọn 1/4 Hán tự.
  3. `listen` — tự phát âm, nút 🔊 nghe lại, chọn 1/4 Hán tự. Bị loại nếu `!speech.supported`.
  4. `pinyin` — Hán tự → gõ pinyin, `Enter` để nộp.
  5. `fill` — câu ví dụ có chỗ trống + gợi ý nghĩa, chọn 1/4 Hán tự. Chỉ cho từ có trong câu ví dụ.
- **Phương án nhiễu:** 3 từ ngẫu nhiên cùng bài (`lessonWords`), bỏ phương án có chữ hiển thị trùng đáp án
  hoặc trùng nhau; thiếu thì bổ sung từ `ALL_WORDS`.
- **Chấm pinyin** — `pinyinKey(str) → { letters, tones }`, không cần bảng âm tiết:
  - chữ thường; bỏ khoảng trắng, `'`, `-`; `v` và `u:` → `ü`;
  - `letters`: chuỗi chữ cái sau khi bỏ dấu thanh và chữ số (`fǎlǜ`, `fa3lv4` → `falü`);
  - `tones`: dãy thanh theo thứ tự xuất hiện — mỗi nguyên âm mang dấu cho một số, mỗi chữ số 1–4 cho
    một số, số `5` và thanh nhẹ không dấu bị bỏ (`fǎlǜ` → `34`, `shúxi` / `shu2xi5` → `2`).
  - `checkPinyin(input, answer, { tones }) → 'ok' | 'tone' | 'wrong'`: `letters` khác → `'wrong'`;
    `letters` giống, `tones` khác và đang yêu cầu dấu thanh → `'tone'` (vẫn tính sai, hiển thị
    "Sai dấu thanh"); còn lại `'ok'`. (Chấp nhận việc số thanh đặt lệch âm tiết như `fal3v4` vẫn đúng.)
- **Khi trả lời:** tô xanh đáp án đúng, đỏ lựa chọn sai; đọc từ; hiện thẻ tóm tắt Hán tự · pinyin · nghĩa
  (dạng `fill` đọc cả câu). `Enter` hoặc `Tiếp ▶` sang câu sau. **Sai** → `setMark(h, 'r')` và
  `srs.lapse(h)`.
- **Tổng kết:** điểm tổng (`16/20`) và theo từng dạng, danh sách từ sai, nút `🔁 Làm lại câu sai`
  (lượt mới chỉ gồm các từ sai, cùng cài đặt) và `▶ Lượt mới`.
- **Module & component:**
  - `src/quiz.js` (thuần): `QUIZ_TYPES`, `applicableTypes(word, opts)`, `makeQuestion(word, type, lessonWords, allWords, rng)`
    → `{ type, word, prompt, options?, answer }`, `pinyinKey`, `checkPinyin`.
  - `QuizPanel.jsx` (cài đặt / đang làm / tổng kết), `ChoiceQuestion.jsx` (dạng 1, 2, 3, 5),
    `PinyinQuestion.jsx` (dạng 4).
  - Trạng thái quiz nằm trong `Study` (đổi bài → lượt mới, như hiện nay).

## 6. Cấu trúc file

| File | Thay đổi |
|---|---|
| `migrations/0002_srs.sql` | mới |
| `server/routes/sync.js` | nhận/trả `srs`, tách hàm validate/upsert |
| `src/srs.js`, `src/quiz.js` | mới, thuần JS |
| `src/hooks/useSrs.js` | mới |
| `src/hooks/useAccount.js` | sync cả `srs` |
| `src/lessons.js` | thêm `ALL_WORDS` |
| `src/components/SrsPanel.jsx`, `SrsSummary.jsx` (dòng tóm tắt) | mới |
| `src/components/QuizPanel.jsx`, `ChoiceQuestion.jsx`, `PinyinQuestion.jsx` | mới |
| `src/components/FillPanel.jsx` | xóa |
| `src/components/FlipCard.jsx` | prop `actions` |
| `src/components/Study.jsx`, `src/App.jsx` | tab mới, render `SrsPanel` ngoài `Study`, ẩn `FilterBar` ở tab SRS |
| `src/styles.css` | style nút chấm, quiz, tổng kết |
| `tests/srs.test.mjs`, `tests/quiz.test.mjs` | mới |
| `tests/api.test.mjs` | thêm test `srs` |
| `package.json` | script `test:unit` |
| `README.md` | cập nhật mô tả, bảng cấu trúc, lệnh |

## 7. Kiểm thử

- `npm run test:unit` → `node --test tests/srs.test.mjs tests/quiz.test.mjs` (không cần server).
  - **srs:** mốc 4h của `today()`; thẻ đang học với 4 nút (requeue 3/6, ivl 1/4); thẻ ôn với 4 nút
    (khoảng, ease, kẹp 1300 và 365, lapses); `buildQueue` đúng thứ tự, trừ số thẻ mới đã thêm hôm nay,
    thẻ mới theo thứ tự bài, Hán tự trùng chỉ một lần; `lapse()` cho thẻ ôn / đang học / mới; `preview`.
  - **quiz:** `pinyinKey`/`checkPinyin` với `fǎlǜ`, `fa3lv4`, `fa3 lu:4`, `shúxi` / `shu2xi` / `shu2xi5`,
    chữ hoa, khoảng trắng, chế độ không dấu, kết quả `'tone'`; `makeQuestion` luôn 4 phương án khác nhau
    chứa đáp án, bổ sung từ bài khác khi thiếu; `applicableTypes` loại `fill` khi từ không có trong câu và
    `listen` khi không hỗ trợ đọc.
- `tests/api.test.mjs` (cần `npm run dev`): gửi/nhận `srs`; bản mới thắng, bản cũ bị bỏ qua; dữ liệu sai
  → 400; chỉ gửi `marks` vẫn chạy và trả về `srs`.
- Kiểm tra tay trong browser pane với `npm run dev`: một lượt SRS đầy đủ (phím tắt, Hoàn tác, requeue,
  màn hình kết thúc); một lượt quiz trộn 5 dạng + "Làm lại câu sai"; quiz sai → từ xuất hiện trong hàng
  SRS; khổ màn hình điện thoại.

## 8. Triển khai

1. `wrangler d1 migrations apply hsk4 --remote` **trước** khi deploy.
2. `npm run deploy`.
3. Frontend cũ còn cache vẫn sync được vì `srs` là tùy chọn.
