# Thiết kế: Game phản xạ — Gõ từ · Bắn thiên thạch

Ngày: 2026-10-24 · Trạng thái: chờ duyệt spec · Chuyên mục mới, tham khảo trang "Game phản xạ" của vocapy.com

## 1. Mục tiêu

Người học nhìn chữ Hán thì nhớ nghĩa ngay, nhưng nhìn nghĩa tiếng Việt thì mất khoảng một phút mới nhớ
ra từ tiếng Trung. Lý do: mọi chỗ trong app hiện luyện chiều Trung → Việt (thẻ lật có chữ Hán ở mặt
trước), còn bài "Nghĩa → Hán tự" là trắc nghiệm, chỉ luyện **nhận ra** chứ không luyện **tự nhớ ra**.
Người học cũng chỉ ôn được theo từng bài, không ôn ngẫu nhiên được toàn bộ từ.

Thêm chuyên mục **🎮 Game phản xạ**. Ở đây người học chọn bộ từ (tất cả bài hoặc một bài, lọc theo dấu,
ngẫu nhiên, số lượng), rồi chơi một game bắt **tự gõ ra** từ. Có hai game:

1. **Gõ từ**, gồm hai chế độ: *Gõ từ* (nhìn nghĩa, gõ từ tiếng Trung) và *Gõ pinyin* (nhìn chữ Hán, gõ
   pinyin).
2. **Bắn thiên thạch**: thiên thạch mang nghĩa tiếng Việt rơi xuống, gõ từ để bắn hạ trước khi nó chạm đất.

**Thành công nghĩa là:** từ sidebar vào được trang chọn game, chọn "Tất cả các bài · Ngẫu nhiên · 20 từ",
chơi được cả hai game bằng bàn phím, không cần chuột. Cuối lượt thấy những từ bị trượt, và các từ đó đã
được đánh dấu "Cần ôn" (đồng bộ như dấu hiện có). Về lâu dài, người học nhớ ra từ tiếng Trung nhanh hơn.
Sau này thêm game mới chỉ cần thêm một thẻ và một trang.

### Người dùng đã quyết định

- Chuyên mục mới trên sidebar, tên **Game phản xạ**. Trang đầu là lưới thẻ game, để sau này còn thêm game.
- **Không** thêm tab "Tất cả" vào phần Từ vựng. Việc ôn toàn bộ từ nằm ở game.
- Thanh chọn bộ từ đặt trên lưới game, giống VocaPy: Bài · Bộ lọc · Thứ tự · Số lượng.
- Game **Gõ từ** có hai chế độ *Gõ từ* / *Gõ pinyin*, chọn trong một hộp thoại khi bấm thẻ.
- Game **Bắn thiên thạch** theo kiểu VocaPy: thiên thạch mang nghĩa rơi xuống, gõ pinyin hoặc chữ Hán để
  bắn, có mạng ❤️, gạch trống theo số chữ cái pinyin và hiện sẵn chữ đầu, có nút nghe và nút gợi ý.
- Từ trượt được đánh dấu "Cần ôn".
- **Chỉ chơi trên máy tính** (có bàn phím). Trên màn hẹp, trang Bắn thiên thạch chỉ hiện dòng "Nên chơi bằng
  bàn phím máy tính" và nút về `/games`, không cần bố cục riêng cho điện thoại. Gõ từ và trang chọn game
  chỉ cần không vỡ giao diện trên màn hẹp.
- Không làm: xu thưởng, bảng xếp hạng, lịch sử đấu, SRS.

### Quyết định do Claude đặt (người dùng có thể đổi khi đọc spec)

| Vấn đề | Quyết định |
|---|---|
| Vị trí | Mục sidebar thứ sáu `🎮 Game phản xạ`, đường dẫn `/games`. Chuyên mục không có hàng tab con |
| Đường dẫn game | `/games/type/meaning` (Gõ từ, chế độ Gõ từ), `/games/type/pinyin` (Gõ từ, chế độ Gõ pinyin), `/games/meteor` (Bắn thiên thạch). URL lạ trong `/games/...` về `/games` |
| Bộ từ | Chỉ dùng **từ gốc** (`word[0..2]`), không dùng cụm từ mở rộng của `practice.json`. "Tất cả các bài" dùng `ALL_WORDS` (620 từ, đã bỏ trùng giữa các bài) |
| Bộ lọc | Tất cả · Chưa đánh dấu · 🔁 Cần ôn · ✅ Đã thuộc, theo `marks.getMark`. Mặc định: Tất cả |
| Thứ tự | Ngẫu nhiên (mặc định) hoặc Theo thứ tự (thứ tự bài, rồi thứ tự trong bài) |
| Số lượng | 10 · 20 (mặc định) · 50 · 100 · Tất cả. Nếu bộ lọc cho ít từ hơn số đã chọn thì lấy hết |
| Lưu lựa chọn | Bốn lựa chọn trên được nhớ trong `localStorage` (khóa `hsk4_games_v1`) và **độc lập** với bài/bộ lọc của phần Từ vựng |
| Bộ lọc rỗng | Thẻ game vẫn hiện, nhưng mờ đi và ghi "Không có từ phù hợp" (giống `PracticeHub`). Không tự lùi về "Tất cả" |
| Dấu thanh — Gõ từ & Bắn thiên thạch | **Không bắt** gõ dấu thanh: chỉ so phần chữ cái (`pinyinKey(...).letters`). Gõ chữ Hán đúng cũng được tính. Khi đúng, app luôn hiện pinyin có dấu và đọc từ đó |
| Dấu thanh — Gõ pinyin | **Bắt** đúng dấu thanh (số `1`–`4` hoặc dấu), giống bài "Gõ pinyin" hiện có (`checkPinyin`). Đúng chữ nhưng sai thanh thì tính là sai và báo "Sai thanh điệu" |
| Từ đồng nghĩa | Ở chế độ Gõ từ và Bắn thiên thạch, nếu người học gõ một từ khác trong 620 từ có **cùng nghĩa y hệt** (ví dụ 到底 / 究竟 cùng "rốt cuộc (pt)") thì tính là đúng, và báo kèm "Đáp án của thẻ: …" |
| Đánh dấu | Từ bị trượt (sai, bấm "Không nhớ", dùng gợi ý, hoặc thiên thạch chạm đất) được `setMark(h, 'r')`. Trả lời đúng ngay lần đầu thì **không** đổi dấu (không tự đánh "Đã thuộc") |
| Hiển thị nghĩa | Nghĩa hiện nguyên chuỗi trong dữ liệu, kể cả nhãn từ loại, ví dụ "quen thuộc, hiểu rõ (đgt)" |
| Phím | `Enter` (khi bộ gõ IME đang ghép chữ, tức `e.isComposing`, thì bỏ qua) kiểm tra/bắn. **Gợi ý: `Tab`**, và cả `Ctrl+Space` (trên macOS, `Ctrl+Space` thường là phím đổi bộ gõ nên không chắc tới được trang). **Nghe: nhả phím `Ctrl` mà giữa lúc đó không bấm phím nào khác**, để không đụng `Ctrl+Space` hay `Ctrl+C`. `Esc`: Không nhớ (Gõ từ) hoặc Tạm dừng (Bắn thiên thạch) |
| Âm thanh | Dùng `speech` hiện có (Web Speech API). **Luôn đọc** từ khi trả lời đúng, khi trượt và khi bắn trúng, giống `ExercisePage`, **không** phụ thuộc nút tự đọc `speech.auto` (nút đó chỉ có ở phần Từ vựng). Ở Bắn thiên thạch, lời đọc mới cắt lời đọc cũ (`speech.speak` vốn đã cancel trước khi đọc). Bấm nghe (🔊 hay nhả `Ctrl`) không tính là trượt ở cả hai game |
| Khi nào đánh dấu | Đánh dấu "Cần ôn" **ngay lúc trượt**, không đợi hết lượt. Từ trượt vì dùng gợi ý vẫn bị chèn lại vào hàng đợi như từ sai |

### Không thay đổi

Backend `server/`, `functions/`, migration và cơ chế đồng bộ; `useMarks`/`useAccount`/`useSpeech`; nội
dung, đường dẫn và hành vi của các chuyên mục hiện có. Phần Từ vựng giữ nguyên, không thêm tab.

### Ngoài phạm vi (YAGNI)

Xu, điểm thưởng, bảng xếp hạng, lịch sử đấu, SRS; các game khác của VocaPy (Nối từ, Viết chữ, Nghe viết…);
chế độ "Bắn gà"; giữ lượt chơi dở khi rời trang; ảnh/âm thanh hiệu ứng riêng (chỉ dùng CSS, emoji và
giọng đọc sẵn có); ôn cụm từ mở rộng.

## 2. Trang chọn game `/games`

Từ trên xuống:

1. **Thanh chọn**, bốn ô `<select>` có nhãn: **Bài** (Tất cả các bài, Bài 1 … Bài 20), **Bộ lọc**,
   **Thứ tự**, **Số lượng**. Dưới thanh chọn có dòng "N từ phù hợp". Trên màn hẹp, bốn ô xếp thành lưới 2×2.
2. **Lưới thẻ game**, mỗi thẻ có biểu tượng, tên, mô tả một dòng và số từ sẽ chơi:
   - ⌨️ **Gõ từ** — "Nhìn nghĩa gõ từ tiếng Trung, hoặc nhìn chữ Hán gõ pinyin"
   - ☄️ **Bắn thiên thạch** — "Thiên thạch mang nghĩa tiếng Việt rơi xuống, gõ từ để bắn hạ"

   Thẻ là liên kết (dùng `exercise-card` hoặc một lớp mới cùng kiểu). Để thêm game sau này, chỉ cần thêm
   một mục vào danh sách `GAMES` trong `src/games.js` và một trang.
3. Bấm thẻ **Gõ từ** thì mở hộp thoại "Chọn chế độ Gõ từ" với hai ô lớn:
   - **Gõ từ** — "Nhìn nghĩa và gõ từ tiếng Trung" → `/games/type/meaning`
   - **Gõ pinyin** — "Nhìn chữ Hán và gõ pinyin" → `/games/type/pinyin`

   Đóng hộp thoại được bằng nút ✕, `Esc`, hoặc bấm ra ngoài.

Dòng mẹo dưới lưới (một câu, tiếng Việt): nhớ không ra trong vài giây thì bấm "Không nhớ" xem đáp án, vì
xem rồi được hỏi lại sớm giúp nhớ nhanh hơn là cố nghĩ lâu.

Trang game đọc lựa chọn từ `localStorage` khi mở, rồi dựng danh sách từ một lần (giống cách
`ExercisePage` dựng lượt). Nút **Chơi lại** dựng lại danh sách. Nếu vào thẳng URL game mà không có từ
nào phù hợp thì hiện "Không có từ phù hợp" kèm liên kết về `/games`.

## 3. Game Gõ từ

### Màn chơi

- Trên cùng: nút **← Chọn game**, tên chế độ, thanh tiến độ "Từ 7 / 20", và đồng hồ đếm giây của từ
  đang hỏi (chỉ để người học thấy mình nhanh hay chậm, không giới hạn thời gian).
- Giữa: **lời nhắc**.
  - Chế độ *Gõ từ*: nghĩa tiếng Việt cỡ chữ lớn.
  - Chế độ *Gõ pinyin*: chữ Hán cỡ lớn, kèm nút 🔊.
- Ô nhập đặt sẵn focus. Placeholder là "Gõ pinyin hoặc chữ Hán" (*Gõ từ*) hoặc "Gõ pinyin có thanh, ví dụ
  fa3lv4 hoặc fǎlǜ" (*Gõ pinyin*).
- Dưới ô nhập có các nút **Kiểm tra** (`Enter`), **💡 Gợi ý** (`Tab`) và **Không nhớ** (`Esc`).
  Chế độ *Gõ từ* có thêm 🔊 **Nghe từ** (nhả phím `Ctrl`), vì nghe được âm thường giúp nhớ ra chữ.
- **Gợi ý** (chỉ chế độ *Gõ từ*): hiện gạch trống theo số chữ cái pinyin không dấu, mỗi lần bấm lộ thêm
  một chữ, bắt đầu từ chữ đầu, ví dụ `f _ _ _` → `f a _ _`. Đã dùng gợi ý thì từ đó tính là **trượt**.
  Chế độ *Gõ pinyin* không có gợi ý.

### Chấm

- **Đúng:** ô nhập viền xanh; hiện chữ Hán, pinyin có dấu và nghĩa; đọc từ đó. Sau khoảng 1 giây tự sang
  từ tiếp, hoặc sang ngay nếu bấm `Enter`.
- **Sai** (hoặc **Không nhớ**): hiện đáp án (chữ Hán, pinyin có dấu, nghĩa, câu ví dụ `word[3]`), rồi
  đọc từ. Người học phải **gõ lại đúng một lần** (theo luật chấm của chế độ) mới sang được từ tiếp. Ô
  nhập được xóa sẵn cho lần gõ lại. Chế độ *Gõ pinyin* mà sai thanh thì ghi rõ "Sai thanh điệu", kèm
  thanh người học đã gõ và thanh đúng.
- Ô nhập trống mà bấm `Enter` thì không làm gì.
- Dữ liệu có pinyin chứa dấu `'` (`dá'àn`), dấu cách hoặc chữ hoa: `pinyinKey` đã bỏ qua những ký tự này.

### Hàng đợi

- Từ bị trượt được chèn lại vào hàng đợi, **cách 3 từ** về phía sau (hoặc về cuối nếu còn ít hơn 3 từ).
- Một từ được hỏi tối đa 3 lần. Lần thứ ba vẫn trượt thì sau khi gõ lại sẽ bỏ khỏi lượt.
- "Từ 7 / 20" đếm số từ **khác nhau** đã xong, không tính lượt hỏi lại.

### Tổng kết

Khi hàng đợi rỗng thì hiện:

- Số từ đúng ngay lần đầu trên tổng số, và thời gian trung bình mỗi từ (chỉ tính lần hỏi đầu).
- Danh sách từ bị trượt: chữ Hán, pinyin, nghĩa, nút 🔊. Các từ này đã được đánh dấu "Cần ôn".
- Nút **Chơi lại** (bộ từ mới theo cùng lựa chọn), **Chơi lại các từ trượt** (lượt mới chỉ gồm các từ
  trượt; ẩn khi không có từ trượt), và **← Chọn game**.

## 4. Game Bắn thiên thạch

> **Cập nhật 2026-10-24 (theo yêu cầu của người dùng sau khi chơi thử):** game chiếm trọn màn hình, không còn ô
> nhập. Người chơi gõ **từng chữ cái pinyin**; chữ gõ đúng với ô trống kế tiếp của thiên thạch gần mặt đất nhất
> (thiên thạch đang gõ dở được giữ làm mục tiêu cho tới khi hạ) thì bắn **một tia** vào đúng ô đó và điền chữ;
> điền đủ các ô thì thiên thạch nổ. Chữ đầu cho sẵn, `v` hoặc `u` gõ cho ü, gõ sai thì rung hàng ô và không mất mạng,
> Tab gợi ý (lộ chữ kế tiếp, từ tính là trượt). Không còn gõ chữ Hán hay từ đồng nghĩa ở game này. Phi thuyền đứng
> yên ở giữa và xoay nòng về phía ô vừa bắn. Tốc độ rơi: viên đầu 20 giây, mỗi viên sau nhanh hơn 2%, nhanh nhất
> 10 giây, hai viên cách nhau 5 giây, tối đa 2 viên cùng lúc. Có âm thanh tự tạo (Web Audio) và ảnh SVG tự vẽ.
> Các đoạn bên dưới mô tả bản đầu và được thay thế bởi ghi chú này ở những chỗ khác nhau.

### Màn chơi

- Một khung chơi chiếm chiều ngang nội dung, cao khoảng 60vh (tối thiểu 360px), nền trời tối làm bằng
  CSS gradient và vài ngôi sao. Mặt đất là một vạch ở đáy, phi thuyền 🚀 ở giữa đáy.
- Thanh trên cùng: **☄️ Bắn thiên thạch**, mạng ❤️ (5 tim, mất tim thì đổi thành 🤍), tiến độ "đã bắn hạ /
  tổng", và các nút **Tạm dừng**, **Chơi lại**, **Thoát** (về `/games`).
- Mỗi thiên thạch là một khối DOM gồm biểu tượng ☄️ và một nhãn trắng. Nhãn có nghĩa tiếng Việt, nút 🔊
  nhỏ, và hàng gạch trống bằng số chữ cái pinyin không dấu, trong đó **chữ đầu luôn hiện sẵn**.
- Ô nhập ở đáy, luôn giữ focus. Placeholder: "Gõ pinyin hoặc chữ Hán · Enter: bắn · Tab: gợi ý ·
  Ctrl: nghe từ".

### Luật

- Thiên thạch xuất hiện lần lượt ở vị trí ngang ngẫu nhiên, sao cho nhãn không tràn khỏi khung và không
  chồng lên thiên thạch đang rơi gần đó. Trên màn có **tối đa 2 thiên thạch** cùng lúc.
- Thiên thạch đầu rơi hết khung trong **20 giây**. Mỗi thiên thạch mới rơi nhanh hơn 2%, nhanh nhất là 10
  giây. Hai thiên thạch xuất hiện cách nhau ít nhất 5 giây.
- **Bắn:** gõ rồi `Enter`. Đáp án được so với mọi thiên thạch đang rơi, theo luật chấm của chế độ *Gõ từ*
  (không bắt dấu thanh, chấp nhận chữ Hán và từ đồng nghĩa y hệt). Nếu khớp nhiều viên thì bắn **viên thấp
  nhất**. Trúng thì có tia laser từ phi thuyền tới viên đó, viên nổ (hiệu ứng CSS ngắn), nhãn hiện chữ Hán
  và pinyin có dấu trong chốc lát, rồi đọc từ đó. Ô nhập được xóa.
- **Gõ sai** (không khớp viên nào): ô nhập rung nhẹ và giữ nguyên chữ để người học sửa. Không mất mạng.
- **Gợi ý** (`Tab` hoặc nút 💡): lộ thêm một chữ cái ở **viên thấp nhất**. Viên đã dùng gợi ý thì
  vẫn bắn được, nhưng từ đó tính là trượt.
- **Nghe** (nhả phím `Ctrl`, hoặc bấm 🔊 trên nhãn): đọc từ của viên thấp nhất, hoặc của viên được
  bấm. Nghe **không** tính là trượt.
- **Chạm đất:** mất 1 ❤️. Viên đó hiện đáp án (chữ Hán, pinyin) khoảng 2 giây rồi biến mất. Từ tính là
  trượt và được thả rơi lại **một lần** sau đó (vẫn tính vào tổng). Lần thứ hai chạm đất thì bỏ.
- Lượt kết thúc khi đã xử lý hết các từ (bắn hạ hoặc bỏ), hoặc khi hết ❤️.
- **Tạm dừng:** bấm nút, hoặc tự dừng khi tab bị ẩn (`visibilitychange`). Lúc dừng thì các viên đứng yên
  và có lớp phủ "Tạm dừng · Enter để chơi tiếp".
- Đặt chuyển động trong một vòng `requestAnimationFrame`, tính vị trí theo thời gian đã trôi (không theo
  số khung hình). Với `prefers-reduced-motion`, bỏ hiệu ứng nổ và rung, nhưng thiên thạch vẫn rơi.

### Tổng kết

Giống Gõ từ: số đã bắn hạ trên tổng, còn bao nhiêu ❤️, và danh sách từ trượt (đã đánh dấu "Cần ôn").
Viên đã dùng gợi ý mà bắn trúng thì vẫn tính là "bắn hạ" trong điểm, nhưng cũng nằm trong danh sách trượt.
Khi mất ❤️ cuối cùng, các viên **đang rơi** dở chưa dùng gợi ý thì **không** tính là trượt và không bị
đánh dấu. Từ đang chờ rơi lại lần hai thì đã tính là trượt từ trước.
Có các nút **Chơi lại**, **Chơi lại các từ trượt** và **← Chọn game**. Nếu thua vì hết ❤️ thì ghi
"Hết mạng!". Các từ chưa kịp rơi thì không tính là trượt.

## 5. Cấu trúc code

| File | Nội dung |
|---|---|
| `src/games.js` (mới, thuần, không DOM) | `GAMES` (danh sách thẻ); lựa chọn mặc định và kiểm tra lựa chọn đọc từ `localStorage`; `pickWords(options, getMark, rng)`; `checkTyped(input, word, mode)` trả `'ok' \| 'synonym' \| 'tone' \| 'wrong'`; `requeue(queue, word)`; `hintMask(pinyin, shown)`; các hằng tốc độ của Bắn thiên thạch |
| `src/routes.js` | Thêm mục `SECTIONS` `games`, `PAGE_TITLES` (`games`, `game-type`, `game-meteor`), `matchGames`, và `sectionOf` nhận `games` |
| `src/pages/GamesHubPage.jsx` | Thanh chọn, lưới thẻ, hộp thoại chọn chế độ |
| `src/pages/TypeGamePage.jsx` | Game Gõ từ (prop `mode`: `meaning` \| `pinyin`) |
| `src/pages/MeteorGamePage.jsx` | Game Bắn thiên thạch |
| `src/components/GameSummary.jsx` | Màn tổng kết dùng chung cho hai game |
| `src/App.jsx` | Gắn các trang. Chuyên mục `games` không có hàng tab, nên không render `NavBar` cho nó |
| `src/styles.css` | Lớp CSS cho thanh chọn, thẻ game, hộp thoại, màn chơi Gõ từ, khung Bắn thiên thạch |
| `tests/games.test.mjs` | Test `pickWords` (bài/lọc/thứ tự/số lượng, bỏ trùng), `checkTyped` (không dấu, có dấu, chữ Hán, đồng nghĩa, sai thanh ở chế độ pinyin, `'`), `requeue`, `hintMask` |
| `tests/router.test.mjs` | Test các đường dẫn `/games...` |
| `package.json` | Thêm `tests/games.test.mjs` vào `test:unit` |
| `README.md` | Thêm đoạn mô tả chuyên mục, các dòng `/games...` trong bảng Pages, và `src/games.js` trong bảng Layout |

Trang game dùng `useApp()` để lấy `marks` và `speech`. Chúng **không** dùng `lesson`, `filter` hay `words`
của context, vì lựa chọn của game độc lập với phần Từ vựng. Trang game cũng được remount theo
`viewVersion` như các trang khác, tức là bị dựng lại khi dữ liệu tài khoản đổi.

## 6. Thứ tự làm

1. Chuyên mục, trang chọn game và game **Gõ từ** (cả hai chế độ). Dừng để người dùng chơi thử.
2. Game **Bắn thiên thạch**.
