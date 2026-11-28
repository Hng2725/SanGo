# Hoàn thiện liên kết SanGo — 28/11/2026

Người dùng yêu cầu sửa icon bóng chuyền và hoàn thiện phần còn thiếu ở các điểm kết nối Hưng/Hiếu/Lâm/Dương, rồi kiểm thử lại. Thực hiện trong workspace hiện tại, giữ các thay đổi giao diện trước đó, không commit/push.

Phạm vi: chức năng được mô tả trong tổng quan và phân công; sửa lỗi có bằng chứng, không tự thêm nghiệp vụ. Triển khai production/tài khoản dịch vụ ngoài và ảnh minh chứng lịch sử trước tối ưu không thể xác nhận bằng trạng thái code local, cần báo rõ.

- [x] Icon bóng chuyền: đường ghép múi đúng hình, màu/kích thước/accessibility giữ hệ thống SVG hiện có.
- [x] Hưng: auth/bootstrap/logout và trạng thái duyệt chủ sân; event/email chủ sân cho đơn chuỗi; occupancy từ giờ hoạt động.
- [x] Hiếu: truy vấn lịch qua nửa đêm, tìm sân trong ca đêm; đồng bộ khóa đặt sân/giữ chỗ/bảo trì; lỗi tải lịch, dữ liệu sân đang chọn; script race-booking.
- [x] Lâm: sao chép bảng giá thực sự hoạt động; cache công khai sau cấu hình; bảo trì/giữ chỗ; bảo toàn tham chiếu khi xóa sân.
- [x] Dương: sự kiện sau commit của lịch cố định, cache liên tính năng, chi tiết đơn/đánh giá và lỗi hủy chuỗi.
- [x] Rà soát phần ghép, kiểm thử luồng thực tế local và race đặt trùng; dọn dữ liệu kiểm thử của phiên.
- [x] `npm run lint`, `npm test`, `npm run build`; rà soát mã và ghi lại kết quả/giới hạn thực tế.

Điều phối: mỗi phần chỉ sửa thư mục được giao; thay đổi file chung do root hoặc được root xác nhận. Các test tái hiện phải thất bại trước sửa; chạy test tập trung trước bộ test toàn dự án.

Kết quả và giới hạn: [Báo cáo kiểm thử tích hợp](../../bao-cao/KIEM_THU_TICH_HOP_2026-11-28.md). Đã bổ sung hồi quy cuối cho hold hết hạn trong lúc chờ khóa và chuyển thiếu SlotLock; toàn bộ BE được chạy lại sau sửa. Không commit/push.
