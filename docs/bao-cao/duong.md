# Báo cáo phần việc của Dương – SanGo

## 1. Vai trò và phạm vi

Dương phụ trách nghiệp vụ sau khi khách tạo đơn: máy trạng thái đơn, chính sách hủy, lịch sử và chi tiết đơn, quản lý đơn của chủ sân, đánh giá, khiếu nại, thống kê doanh thu và lịch cố định hàng tuần.

Các tầng đã triển khai gồm `shared` (kiểu, schema và hàm thuần), Prisma seed, NestJS modules `booking-lifecycle`, `recurring`, `reviews`, `complaints`, `stats`, cùng các feature FE tương ứng.

## 2. Máy trạng thái đơn

Trạng thái hợp lệ:

```text
PENDING ──OWNER confirm──> CONFIRMED ──OWNER/SYSTEM complete──> COMPLETED
   │                              │
   ├─OWNER/SYSTEM reject──> REJECTED
   └─CUSTOMER/ADMIN cancel       └─CUSTOMER/ADMIN cancel──> CANCELLED
```

`BOOKING_TRANSITIONS` dùng `Record<BookingStatus, ...>` để bảo đảm mọi trạng thái được khai báo. `canTransition` kiểm tra actor, còn `assertTransition` ném `InvalidTransitionError` khi chuyển sai.

Mọi thao tác chuyển trạng thái đi qua `BookingLifecycleService.transition`. Server kiểm tra quyền sở hữu ở tầng truy vấn/service, điều kiện thời gian và dùng optimistic locking:

```ts
tx.booking.updateMany({ where: { id, status: from }, data: ... })
```

Nếu `count === 0`, server trả 409 `INVALID_STATUS_TRANSITION`. Các trạng thái hủy/từ chối gọi giải phóng `SlotLock` trong cùng transaction.

## 3. Chính sách hủy

Deadline được tính bằng `startAt - cancelBeforeHours`. Khách được hủy trước hoặc đúng deadline; sau deadline trả `TOO_LATE`. Khi đã bắt đầu trả `ALREADY_STARTED`; trạng thái kết thúc trả `INVALID_STATUS`. ADMIN bỏ qua deadline nhưng không được hủy sau giờ bắt đầu.

Test bao phủ hủy đúng deadline, sát giờ, qua nửa đêm, `cancelBeforeHours = 0`, PENDING và các trạng thái cuối.

## 4. Các chức năng đã làm

- Khách: danh sách lịch sử, lọc/tab đồng bộ URL, chi tiết breakdown giá, timeline, deadline hủy, đánh giá, khiếu nại và liên kết chuỗi lịch cố định.
- Chủ sân: danh sách đơn virtualized bằng `@tanstack/react-virtual`, seed 300+ đơn, lọc URL, tải tiếp, highlight đơn, xử lý đơn và xác nhận cả chuỗi.
- Đánh giá: nhập sao bằng click/bàn phím, form RHF + Zod, phân bố sao, xem thêm, chủ sân phản hồi inline.
- Khiếu nại: khách tạo/theo dõi; admin lọc và chuyển trạng thái hợp lệ kèm phản hồi.
- Doanh thu: KPI, khoảng nhanh 7/30 ngày/tháng/12 tháng, lọc cụm sân, nhóm ngày/tháng, biểu đồ lazy-loaded, tổng và doanh thu dự kiến.
- Lịch cố định: preview có debounce, hiển thị tuần bị trùng, bỏ qua conflict, tạo/hủy chuỗi và xác nhận cả chuỗi.

## 5. Kiểm thử và seed

Các test chính gồm status machine, cancellation policy, allowed actions, booking lifecycle, recurring dates/service, reviews service, revenue grouping và FE cho chi tiết/hủy đơn, badge, rating, virtualization và preview recurring.

Seed được gọi sau `seedVenues`, tạo dữ liệu đơn trong khoảng 60 ngày trước đến 14 ngày sau, tôn trọng giờ mở cửa, không trùng slot, tạo lock và có mẫu recurring/reviews/complaints.

Kết quả kiểm tra gần nhất:

- `npm test`: shared 33, BE 154, FE 69 — pass.
- `npm run build`: shared, BE và FE — pass.
- `npm run lint`: còn lỗi strict/eslint tồn tại ở một số module khác của repo; không làm fail test hoặc build.

## 6. Kịch bản video demo 5–10 phút

1. Khách tìm sân, chọn lịch và tạo đơn.
2. Chủ sân mở danh sách đơn, xác nhận; minh họa virtualization với seed 300+.
3. Khách mở chi tiết, thử hủy đúng deadline và xem timeline/badge.
4. Sau khi hoàn thành, khách gửi đánh giá; chủ sân phản hồi.
5. Khách tạo khiếu nại; admin chuyển trạng thái và nhập phản hồi.
6. Chủ sân xem dashboard, đổi khoảng thời gian/nhóm ngày-tháng.
7. Khách tạo lịch cố định, xem preview có tuần trùng và chọn bỏ qua conflict.
8. Chạy script race booking để minh họa một request thành công và request còn lại nhận 409.

## 7. Thống kê commit tham khảo

`git shortlog -sn HEAD` tại thời điểm viết báo cáo: Hng2725 7, NPLam01 2, MTH209 1. Thống kê này phản ánh lịch sử hiện có của repository, không thay thế phân bổ đóng góp thực tế của nhóm.
