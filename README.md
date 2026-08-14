# Thi trắc nghiệm nhận thức về Đảng năm 2025

Ứng dụng web tĩnh dùng để luyện tập và kiểm tra từ file nguồn `cau_hoi_lop_nhan_thuc_ve_Dang(1).docx`.

## Cấu hình bài kiểm tra

- Bài kiểm tra: **40 câu / 30 phút**.
- Mỗi câu có 4 phương án A/B/C/D.
- Đáp án đúng trong tài liệu nguồn: **A**.
- Có thể trộn thứ tự câu hỏi và trộn vị trí đáp án; hệ thống vẫn giữ đúng đáp án theo nội dung gốc.
- Có chế độ luyện tập và chế độ kiểm tra.

## Ngân hàng câu hỏi

Hệ thống trích xuất **116 câu thực tế** từ tài liệu:
- Mức 1: 64 câu.
- Mức 2: 32 câu.
- Mức 3: 20 câu.

Lưu ý: tiêu đề trong tài liệu ghi `MỨC 1: (59 câu)`, `MỨC 2: (27 câu)`, `MỨC 3: (20 câu)`, nhưng khi đếm trực tiếp các câu bắt đầu bằng ký hiệu `#`, số câu thực tế là 64/32/20.

## Cấu trúc source

- `index.html` — giao diện chính.
- `styles.css` — CSS.
- `app.js` — logic thi/luyện tập; chế độ kiểm tra khóa ở 40 câu/30 phút.
- `data/questions-1.js` … `data/questions-6.js` — toàn bộ 116 câu hỏi dạng dữ liệu đọc được.
- `data/questions.js` — manifest ghép dữ liệu câu hỏi.
- `tools/extract_from_docx.py` — công cụ trích câu hỏi từ DOCX cùng định dạng.
- `.nojekyll` — hỗ trợ GitHub Pages.
- `vercel.json` — cấu hình triển khai Vercel.

Dự án là website tĩnh và đang được Vercel tự triển khai từ nhánh `main` của GitHub.
