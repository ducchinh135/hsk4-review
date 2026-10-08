# Thiết kế: Tách web thành các trang riêng

Ngày: 2026-10-08 · Trạng thái: đã duyệt thiết kế, chờ duyệt spec

## 1. Mục tiêu

Hiện `App.jsx` là một trang duy nhất: bốn chế độ (`srs`, `cards`, `review`, `quiz`) chỉ là tab đổi state `mode`, trong khi tab bài, bộ lọc, thanh âm thanh và dải tóm tắt SRS hiện ở mọi chế độ. Màn hình rối và `App` ôm toàn bộ state.

Tách thành các trang có địa chỉ riêng, mỗi trang một việc, chỉ hiện điều khiển liên quan:

| Trang | Đường dẫn | Việc |
|---|---|---|
| Ôn hằng ngày | `/daily` | Hàng ôn SRS chung cho mọi bài |
| Từ vựng | `/words` | Danh sách từ thật, xem và đánh dấu |
| Ôn tập | `/review` | Lật thẻ theo thứ tự hoặc xáo trộn |
| Thực hành | `/practice`, `/practice/:dạng` | Bài tập theo từng dạng |

**Thành công nghĩa là:** mỗi trang chỉ hiện đúng thứ nó cần; F5, nút Back/Forward và đánh dấu trang hoạt động; dữ liệu, SRS, đồng bộ tài khoản và backend không đổi.

### Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| "Danh sách từ vựng" | Danh sách thật (hán tự, pinyin, nghĩa, nghe, đánh dấu), không phải thẻ lật |
| Chế độ "Thẻ từ vựng" lật thẻ cũ | Gộp vào trang Ôn tập, thành chế độ "Theo thứ tự" |
| Định tuyến | Router tự viết bằng History API, đường dẫn sạch, không thêm thư viện |
| Trang Thực hành | Bỏ màn hình tuỳ chọn; chia thành 5 dạng bài, bấm là làm ngay |
| Số câu mỗi lượt | Tối đa 20 (xáo trộn từ tập đang chọn) |
| Gõ pinyin | Bắt buộc đúng dấu thanh |
| Giữ phiên khi rời trang | Không (xem mục 6) |

### Không thay đổi

Dữ liệu từ vựng, `srs.js`, `quiz.js` (logic câu hỏi và chấm), các hook `useMarks`/`useSrs`/`useAccount`/`useSpeech`, backend `server/`, `functions/`, migration, và cơ chế đồng bộ. Quiz sai vẫn đặt dấu "Cần ôn" và gọi `lapse` đưa từ về hàng ôn hôm nay.

### Ngoài phạm vi (YAGNI)

Gộp `CardsPanel` và `ReviewPanel` thành một component, giữ phiên làm dở khi rời trang, thêm thư viện router, đổi thuật toán SRS, đổi dữ liệu hay backend, thêm framework test UI.

## 2. Định tuyến

`src/routes.js` (hàm thuần `matchRoute`, test được bằng Node) và `src/router.jsx` (hook và `Link`), không phụ thuộc thư viện:

- `matchRoute(pathname)` là hàm thuần, trả về `{ page, params }`:
  - `/` và mọi đường dẫn không hợp lệ → `{ page: 'daily' }` (đường dẫn trình duyệt được thay bằng `/daily`, `replaceState`).
  - `/daily`, `/words`, `/review`, `/practice` → trang tương ứng.
  - `/practice/:dạng` với dạng thuộc `QUIZ_TYPES` → `{ page: 'exercise', params: { type } }`; dạng lạ → `/practice`.
  - Dấu `/` cuối được bỏ qua.
- `useRoute()` đọc `location.pathname` và lắng nghe `popstate`.
- `navigate(path)` gọi `history.pushState` rồi thông báo cho `useRoute`.
- `<Link to>` render thẻ `<a href>`; click thường (không Ctrl/Cmd/Shift/giữa chuột, không `target`) bị chặn và gọi `navigate`; các trường hợp còn lại để trình duyệt xử lý.

Hosting: Cloudflare Pages trả `index.html` cho đường dẫn không khớp file nào, miễn là không có `404.html` ở gốc `dist/`; route `/api/*` của Functions vẫn được ưu tiên. Vite dev mặc định fallback SPA nên `vite.config.js` không đổi. Kiểm lại bằng `npm run preview`.

## 3. Cấu trúc

```
src/
  main.jsx
  App.jsx                 ← AppShell + chọn trang theo route
  routes.js               ← hàm thuần matchRoute, PAGES
  router.jsx              ← useRoute, navigate, Link
  context/AppContext.jsx  ← marks, srs, speech, account, lesson, filter, viewVersion
  components/
    NavBar.jsx            ← MỚI
    StudyBar.jsx          ← MỚI (tab bài + bộ lọc + âm thanh dùng chung)
    WordRow.jsx           ← MỚI
    PracticeHub.jsx       ← MỚI (tách từ QuizPanel)
    (giữ: AccountBar, AuthModal, AudioBar, LessonTabs, FilterBar, FlipCard,
          CardsPanel, ReviewPanel, SrsPanel, SrsSummary, ChoiceQuestion, PinyinQuestion)
  pages/
    DailyPage.jsx
    WordsPage.jsx
    ReviewPage.jsx
    ExercisePage.jsx      ← làm bài một dạng (PracticeHub chọn dạng)
```

`Study.jsx` bị xóa: state giữ chỗ chuyển vào từng trang.

### AppShell và context

`AppShell` (trong `App.jsx`) sở hữu và cung cấp qua `AppContext`:

- các hook dùng chung: `marks`, `srs`, `speech`, `account` (cấu hình đồng bộ y như hiện nay);
- `lesson`, `filter` (lưu `hsk4_filter` như cũ), `viewVersion` và `refreshView`. `account` nhận `onReplaced: refreshView` như cũ, để khi đồng bộ thay thế dữ liệu thì các trang dựng lại danh sách;
- `words`, `fellBack`, `lessonWords`, `counts` của tập đang chọn (logic hiện ở `App.jsx`, giữ nguyên, kể cả việc chỉ đọc marks khi dựng lại view);
- `day` (đổi lúc 4 giờ sáng, theo `today()`) và `srsCounts`;
- màu chủ đề `--accent-*` theo bài đang chọn;
- `AccountBar`, `AuthModal`, header, `NavBar`, footer, và `document.title` theo trang.

Bài đang chọn và bộ lọc dùng chung giữa Từ vựng, Ôn tập và Thực hành nên giữ nguyên khi đổi trang. Đổi bài hoặc bộ lọc (và `viewVersion` đổi) làm các trang dựng lại từ đầu.

## 4. Các trang

### `/daily`: Ôn hằng ngày

`SrsSummary` và `SrsPanel` giữ nguyên, không có tab bài và bộ lọc (hàng chung mọi bài). `SrsPanel` không còn prop `active`: chỉ mount khi đang ở trang này. Dải `SrsSummary` chỉ còn ở trang này (số thẻ đến hạn hiện thêm dưới dạng badge trên NavBar).

### `/words`: Từ vựng (mới)

- Trên cùng: `LessonTabs`, `FilterBar`, `AudioBar`. Dưới: danh sách từ của bài đang chọn, đã lọc.
- Mỗi dòng (`WordRow`): hán tự lớn, pinyin, nghĩa, nút 🔊 nghe từ, hai nút ✅ Đã thuộc / 🔁 Cần ôn (bật/tắt qua `toggleMark`, đúng như `FlipCard`).
- Bấm vào dòng để mở rộng, hiện câu ví dụ (hán tự và nghĩa Việt) và nút 🔊 nghe câu. Mỗi lúc chỉ mở một dòng.
- Đánh dấu một từ không làm dòng biến mất khỏi danh sách đang lọc (danh sách chỉ dựng lại khi đổi bài, bộ lọc hay `viewVersion`).
- Bộ lọc không có từ nào: dùng `fellBack` hiện tại (hiện cả bài kèm ghi chú).
- Nút "Xóa đánh dấu bài này" vẫn ở `FilterBar`.

### `/review`: Ôn tập

- Công tắc hai chế độ: **📇 Theo thứ tự** (nội dung `CardsPanel`, kèm lưới mini-card) và **🔀 Xáo trộn** (nội dung `ReviewPanel`). Chế độ đang chọn lưu ở `localStorage` khóa `hsk4_review_mode`.
- Trên đầu: `LessonTabs`, `FilterBar`, `AudioBar`.
- Vị trí thẻ và thứ tự xáo trộn nằm trong state của `ReviewPage`, reset khi đổi bài, bộ lọc hay `viewVersion`.

### `/practice`: chọn dạng bài

- Trên đầu: `LessonTabs`, `FilterBar`, `AudioBar`. Dưới: 5 thẻ dạng bài, mỗi thẻ gồm tên, một dòng mô tả và số từ làm được trong tập đang chọn.

| Dạng | `type` | Điều kiện |
|---|---|---|
| Hán tự → nghĩa | `meaning` | — |
| Nghĩa → Hán tự | `hanzi` | — |
| Nghe → chọn từ | `listen` | trình duyệt có Web Speech, nếu không thì thẻ bị khóa kèm ghi chú |
| Gõ pinyin | `pinyin` | — |
| Điền từ vào câu | `fill` | chỉ từ có xuất hiện trong câu ví dụ |

- Thẻ không có từ phù hợp bị làm mờ và không bấm được.

### `/practice/:dạng`: làm bài

- Không có tab bài và bộ lọc; chỉ dòng tóm tắt ("Bài 3 · Cần ôn lại · 12 từ") và nút ← Chọn dạng khác.
- Bấm thẻ ở hub là bắt đầu ngay. Câu hỏi dựng bằng `buildQuiz(words, { types: [dạng], count: 20 }, lessonWords, ALL_WORDS, { canSpeak })`; `buildQuiz` cắt xuống `min(20, số từ)`.
- Gõ pinyin kiểm tra dấu thanh (`noTones` luôn `false`). Gõ đúng chữ nhưng sai thanh vẫn báo "sai thanh" như `checkPinyin` hiện nay.
- Mỗi câu: trả lời sai thì đặt dấu `r` nếu chưa có và gọi `lapse(hanzi)`. Nút ✖ Dừng quay về `/practice`.
- Màn hình kết quả: điểm, danh sách từ sai và ba nút: 🔁 Làm lại câu sai (chỉ khi có câu sai), ▶ Lượt mới, ← Chọn dạng khác. Bỏ bảng điểm theo dạng.
- Trường hợp không dựng được câu hỏi nào (ví dụ vào thẳng `/practice/fill` khi tập từ không có từ phù hợp): hiện ghi chú và nút ← Chọn dạng khác.
- Bỏ `SETTINGS_KEY`, `loadSettings`, màn hình cài đặt. Giá trị `hsk4_quiz_settings` cũ trong localStorage của người dùng bị bỏ qua, không cần xóa.

## 5. Điều hướng và giao diện

- `NavBar` có 4 mục: 🧠 Ôn hằng ngày · 📚 Từ vựng · 📇 Ôn tập · 📝 Thực hành, dùng `<Link>`; mục đang mở có `aria-current="page"`, và "Thực hành" cũng sáng ở `/practice/*`. Mục Ôn hằng ngày có badge số thẻ đến hạn (từ `srsCounts`).
- `NavBar` thay `.mode-tabs`, dùng lại style đó (đổi class thành `.nav-tabs`), trên mobile chia đều 4 ô như `.mode-tab` hiện tại (≤600px).
- Header giữ tiêu đề, bỏ dòng mô tả cũ. Footer giữ nguyên.
- CSS: bỏ cơ chế `.panel{display:none}` / `.panel.active` (mỗi trang chỉ render khi tới route đó); thêm `.nav-tabs`, `.word-row` (kèm biến thể mở rộng), `.practice-hub`, `.exercise-card`, dùng lại biến màu và font có sẵn. Kiểm tra các breakpoint hiện có (600/520/480/360px).

## 6. Hành vi có chủ ý

- Rời một trang (kể cả F5 giữa chừng) thì mất vị trí thẻ ở Ôn tập, phiên quiz đang làm dở và phiên SRS đang ôn dở. Giữ lại sẽ cần đẩy state vào context, thêm phức tạp mà lợi ích nhỏ.
- Không mất dữ liệu học: mỗi thẻ SRS đã chấm, mỗi dấu thuộc/cần ôn, và mỗi từ quiz sai đã được lưu và đồng bộ ngay lúc thao tác.
- Đổi bài hoặc bộ lọc ở `/practice` chỉ ảnh hưởng lượt làm bài kế tiếp; không có phiên nào đang chạy ở hub.

## 7. Kiểm thử

- `tests/router.test.mjs` (`node --test`, nối vào `test:unit`): `matchRoute` với `/` → daily, đường dẫn lạ → daily, `/practice/xyz` → `/practice`, `/practice/pinyin` → exercise, dấu `/` cuối.
- `tests/quiz.test.mjs` thêm ca: `buildQuiz` với `types: [dạng]` và `count: 20` trả tối đa 20 câu, đúng dạng; dạng `fill` bỏ từ không có trong câu ví dụ.
- Không thêm framework test UI. Kiểm tra giao diện bằng Playwright trên `npm run dev`: đi qua 4 trang, F5 trên `/words` và `/practice/pinyin`, Back/Forward, chấm một thẻ SRS, làm hết một lượt quiz, đồng bộ tài khoản sau khi shell giữ hook, và chụp màn hình mobile.
- `npm run build` và `npm run preview` (xác nhận fallback SPA hoạt động với wrangler).

## 8. Triển khai

Cloudflare Pages không cần đổi cấu hình. README cập nhật bảng Layout (`pages/`, `router.js`, `context/`) và danh sách trang; đoạn nói về chạy trên GitHub Pages bỏ nếu nhánh đó tách riêng không dùng chung code này (cần xác nhận).

## 9. Thứ tự thực hiện (mỗi bước app vẫn chạy được)

1. `router.js` + test, `AppContext`/`AppShell`, `App.jsx` chuyển sang shell; hiển thị vẫn như cũ.
2. `NavBar` + `DailyPage`, `ReviewPage`, `PracticePage` bọc panel hiện có (quiz tạm giữ bản cũ), xóa `Study.jsx`.
3. `WordsPage` và `WordRow`.
4. Tách quiz thành `PracticeHub` + `ExercisePage`, bỏ tuỳ chọn.
5. Dọn CSS, cập nhật README, chạy `test:unit`, Playwright, build.

## 10. Rủi ro

- Nâng hook lên shell: `useAccount` nhận callback `onReplaced: refreshView`, phải giữ cơ chế `viewVersion` trong context để đồng bộ thay thế dữ liệu thì các trang dựng lại đúng.
- Hai panel `CardsPanel` và `ReviewPanel` vẫn trùng lặp phần lớn; chấp nhận để tránh refactor ngoài phạm vi.
