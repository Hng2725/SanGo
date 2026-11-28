# Giữ điều hướng trên trang lỗi

Yêu cầu: trang lỗi như cụm sân không tồn tại vẫn phải có thanh điều hướng bên trái.

Nguyên nhân: `errorElement` hiện chỉ render nội dung lỗi nên thay thế cả layout; `/owner/*`, `/admin/*`, `/me/*` chưa có wildcard riêng nên URL lạ rơi về layout công khai. Trang cụm sân không tồn tại chỉ có nút quay lại.

Thiết kế: tái sử dụng layout và guard hiện có trong errorElement; thêm wildcard theo từng khu. Trang lỗi công khai dùng `ErrorNavigation` với menu tìm sân và liên kết tài khoản phù hợp, desktop bên trái và drawer trên mobile. Giữ nguyên hợp đồng API/shared.

- [x] Viết test tái hiện: mất sidebar ở URL lạ/lỗi loader; thiếu điều hướng khi cụm sân trả 404. Đã quan sát 6 test thất bại đúng nguyên nhân.
- [x] Sửa layout fallback, wildcard và menu lỗi công khai; giữ lazy loading và guard.
- [x] Kiểm tra Chrome desktop: cụm sân không tồn tại và 404 khu chủ sân đều có sidebar; menu chuyển trang được.
- [x] Kiểm tra Chrome 375px: không tràn ngang; drawer bên trái mở và chuyển sang tìm sân được.
- [x] Rà soát độc lập: không có lỗi chặn. Phân biệt nhãn hai nút menu mobile theo góp ý.
- [x] Hoàn tất lint, test, build và ghi kết quả. Không commit/push.

Kết quả 28/11/2026: `npm test` đạt 282 test (shared 33, BE 154, FE 95); `npm run build` đạt. ESLint các file sửa: 0 lỗi, 3 cảnh báo HOC/Fast Refresh của layout. `npm run lint` toàn dự án vẫn dừng ở 55 lỗi/7 cảnh báo BE có sẵn. `git diff --check` đạt. Đã khởi động lại dev sau build.
