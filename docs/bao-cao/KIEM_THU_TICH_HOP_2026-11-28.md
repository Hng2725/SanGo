# Kiểm thử tích hợp SanGo — 28/11/2026

## Phạm vi và thay đổi

Rà soát theo tổng quan đề tài, hợp đồng shared và phân công của bốn thành viên. Giữ các thay đổi giao diện trước đó; không commit hoặc push.

| Phần | Đã hoàn thiện |
|---|---|
| Hưng | Token từ Redux; chặn bootstrap/profile về muộn phục hồi phiên đã logout; logout xóa cache và draft; đồng bộ trạng thái chủ sân sau `/auth/me`; thống kê tỉ lệ lấp sân từ giờ hoạt động và booking locks; email tổng hợp lịch cố định cho khách và chủ sân. |
| Hiếu | Lịch ngày/tuần truy vấn đủ phần qua nửa đêm; tìm sân xét ca của ngày trước; một booking phải thuộc cùng ngày hoạt động; dữ liệu lịch không lẫn sân/tuần cũ; lỗi tải có thử lại; hold thất bại không chuyển checkout; lịch chủ sân mở drawer đúng đơn. |
| Lâm | Copy bảng giá chọn được sân thật; cache công khai cập nhật sau cấu hình; validation nhận đúng envelope/dot-path; bảo trì kiểm tra cả hold đang hiệu lực trong transaction; bảo toàn tham chiếu khi xóa sân; thông tin không ghi đè tọa độ vừa lưu; quote từ chối cụm sân đã ẩn. |
| Dương | Confirm/cancel chuỗi phát sự kiện sau commit; cache liên Booking/Availability/Recurring/Stats/Review; drawer xử lý đơn theo allowedActions; chi tiết đơn dùng ngày/giờ và trạng thái tiếng Việt, hiển thị đánh giá; hủy chuỗi báo lỗi; phản hồi đánh giá được cập nhật từ server. |
| Giao diện | Vẽ lại icon bóng chuyền theo các múi cong đối xứng; sửa tràn mobile sân con/bảng giá; chuẩn hóa trang tạo lịch cố định. |

## Khóa và giữ chỗ

Booking, tạo/xóa/thay hold và cron dọn hold dùng cùng thứ tự khóa `User → Court → Hold/SlotLock`. Khi tác động nhiều bản ghi, khóa ID theo thứ tự tăng dần. Recurring khóa User/Court trước INSERT chuỗi để tránh nâng khóa FK KEY SHARE gây deadlock. Bảo trì khóa Court trước kiểm tra và ghi. Ràng buộc unique `(courtId, startAt)` vẫn là lớp chống đặt trùng ở DB.

Thời gian kiểm tra hạn hold lấy sau khi đã chờ khóa. Chuyển hold chỉ cập nhật các lock đúng sân, đúng khung, còn hạn và bắt buộc đủ số lượng; thiếu một khung cũng rollback bằng `HOLD_EXPIRED`. Có hồi quy cho hết hạn trong lúc chờ, 0 lock và thiếu một phần lock.

## Kết quả kiểm tra

- Các bộ test của mã hiện tại: **344 test đạt** — shared 33, BE 177, FE 134. Đã chạy `npm test`; sau hồi quy cuối chạy lại toàn bộ BE 177 test.
- `npm run lint`: **0 lỗi**, còn 7 cảnh báo Fast Refresh ở Context/layout/compound component. Các lỗi lint cũ đã được xử lý.
- `npm run build`: đạt cho shared, BE và FE. Typecheck FE và BE đạt.
- `git diff --check`: đạt.
- Rà soát độc lập đã phát hiện và xác nhận khắc phục lỗi thứ tự khóa/FK và chuyển hold thiếu lock; không còn lỗi chặn trong phần được rà soát.

## API với PostgreSQL local

Chạy race script `npx tsx scripts/race-booking.ts --n 20` từ BE: **1 HTTP 201 và 19 HTTP 409 SLOT_ALREADY_BOOKED**. Script tìm slot thực đang trống theo giờ Việt Nam, tự hủy đơn thử và kiểm tra slot được giải phóng. Lượt cuối: `SG261128JUUV` đã hủy.

Lượt tích hợp cuối đạt **26 assertion**: khách không truy cập quản lý chủ sân; hold hiện HELD_BY_ME/HELD đúng người xem; bảo trì không chèn lên hold; ba lượt hold tranh chấp bảo trì; ba lượt checkout đồng thời thay hold; chủ sân xác nhận và khách thấy trạng thái mới; preview, hai request tạo chuỗi đồng thời cùng khách/khác khách; xác nhận/hủy cả chuỗi; thống kê admin; giải phóng mọi slot thử. Không có HTTP 500 trong các race này. Số assertion có thể khác giữa lượt chạy vì kiểm tra xác nhận đơn chỉ chạy khi checkout thắng thay hold.

Các đơn/chuỗi thử đã hủy, hold/bảo trì thử đã xóa. Lịch sử các đơn thử đã hủy được giữ để kiểm toán.

Mailpit local đã nhận thư tạo/xác nhận/hủy đơn, tổng hợp chuỗi cho khách và thông báo chuỗi cho chủ sân qua SMTP; xác minh ở API local cổng 8025. Không dùng email production.

## Chrome

- Icon bóng chuyền đã kiểm tra tại kích thước sử dụng và phóng lớn.
- 375px: lịch chủ sân, tab Sân con, bảng giá và tạo lịch cố định có `scrollWidth ≤ viewport`; bảng Sân con cuộn trong khung 280px thay vì làm tràn trang.
- Lịch cố định có H1, giờ `11:00–13:00`, ngày/giá theo định dạng chung, danh sách preview và dark mode.
- Đóng các tab kiểm tra cũ theo yêu cầu người dùng; chỉ giữ một tab.

## Phần cần môi trường hoặc thao tác ngoài local

- H7: tài khoản/biến môi trường Neon, Render, Vercel và Brevo production, URL triển khai và kiểm tra trên các dịch vụ đó. Chưa triển khai hay publish.
- Minh chứng lịch sử Lighthouse/Profiler trước tối ưu chưa có đủ ảnh đối chiếu; không tạo ảnh hoặc số liệu giả cho trạng thái quá khứ.
- Tài liệu rà soát giao diện còn ghi các đề xuất bố cục từ source; đây không phải bằng chứng lỗi chức năng chưa sửa. Các lỗi mobile đã tái hiện nêu trên đã được đóng.
