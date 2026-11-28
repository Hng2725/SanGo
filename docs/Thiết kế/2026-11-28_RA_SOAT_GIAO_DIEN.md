# Rà soát giao diện SanGo — 28/11/2026

Đối chiếu `00_HE_THONG_THIET_KE.md`, `01_Hung_GIAO_DIEN.md`, `FE/CLAUDE.md` và trang Người dùng/Tổng quan quản trị. Ưu tiên dựa trên lỗi bố cục đo được, khả năng sử dụng và mức lệch với các thành phần dùng chung.

## Cập nhật sau lượt hoàn thiện tích hợp

Các ghi nhận bên dưới là trạng thái lúc rà soát ban đầu. Đã sửa các lỗi mobile được xác nhận tại tab Sân con và bảng giá (Chrome 375px không tràn trang); trang tạo lịch cố định đã có H1, giờ/ngày/giá đúng định dạng và danh sách mobile; lịch chủ sân dùng PageHeader và mở drawer xử lý đúng đơn. Nhãn trạng thái lịch sử, chi tiết giá/timeline và chuỗi/khiếu nại đã chuyển sang tiếng Việt. Checkout cũng đã được chuẩn hóa ở lượt tiếp theo. Xem kết quả hiện tại ở `../bao-cao/KIEM_THU_TICH_HOP_2026-11-28.md`; các đề xuất bố cục chưa tái hiện không được coi là lỗi chức năng đã xác nhận.

## Đã chỉnh trong lượt này

`/owner/bookings`: thay bảng CSS grid bằng Ant Design Table cùng kiểu với trang Người dùng; tên/chữ phụ và giá căn phải; dùng StatusDot; bộ lọc theo tên cụm sân/sân con, tab tiếng Việt đủ trạng thái; một trạng thái rỗng; phân trang server. Dưới 992px chuyển thành danh sách với menu từng đơn, giữ các hành động server cho phép. Modal từ chối giữ lý do và thông báo khi API thất bại.

BookingStatusBadge dùng chung đã chuyển từ Tag sang StatusDot nên các trang lịch sử/chi tiết đơn cũng nhận cách hiển thị trạng thái thống nhất.

Kiểm tra Chrome: desktop 1440px; mobile 375px không có bảng/cuộn ngang, hiển thị 20 đơn trong trang; menu Chi tiết mở đúng drawer; dark mode dùng màu từ token.

## Các trang nên chỉnh tiếp

| Ưu tiên | Trang | Bằng chứng | Hướng chỉnh |
|---|---|---|---|
| Cao | `/owner/venues/:id`, tab **Sân con** | **Chrome 375px:** trang có `scrollWidth = 481px`, bảng rộng 440px với 5 cột/nhiều nút. Source: `FE/src/features/owner-venues/components/CourtsManager.tsx`, Table và nhóm thao tác. | Danh sách mobile và menu thao tác; bảng desktop dùng header/chữ phụ nhất quán. |
| Cao | `/owner/courts/:courtId/pricing` | **Chrome 375px:** `scrollWidth = 429px`; nút “Sao chép sang sân khác” vượt mép 429px, “Thêm khung” vượt mép 409px. Source: `features/pricing/components/PricingForm.tsx`, các hàng tiêu đề/nút và input rộng cố định. | Cho nhóm nút xuống dòng, input rộng linh hoạt; bảng xem trước có cách trình bày mobile. |
| Cao | `/me/recurring/new` | **Chrome:** không có H1; nhãn “Ngày bắt đầu (YYYY-MM-DD)”; bảng hiện `2026-11-29`, `300000` thay định dạng ngày/tiền của dự án. Ở 375px vẫn là Table. Source: `features/recurring/pages/NewRecurringPage.tsx`. | PageHeader, chọn ngày thân thiện, formatDate/formatCurrency, trạng thái tiếng Việt; xem trước dạng danh sách trên mobile. Code còn ghép reason kỹ thuật khi có xung đột; phần này mới xác nhận từ source. |
| Vừa | `/owner/schedule` | **Chrome:** tiêu đề duy nhất là H4 “Lịch đặt sân theo tuần”, không có H1. Source: `features/owner-schedule/pages/OwnerSchedulePage.tsx`, khối đầu là Card + Typography.Title level 4. | PageHeader cùng hệ thống với Tổng quan/Đơn đặt sân, đưa bộ chọn cụm sân xuống thanh công cụ. Không ghi nhận trang tràn ngang trong mẫu kiểm tra. |
| Vừa | `/me/bookings` và `/me/bookings/:id` | **Source:** `MyBookingsPage.tsx` đặt nhãn bộ lọc bằng enum; `BookingDetailPage.tsx` hiện `item.status` trực tiếp trong timeline, chi tiết giá dùng chuỗi ISO. Raw timeline/ISO đã xuất hiện khi thử đơn ở lượt kiểm tra trước. Badge dùng chung đã được sửa ở lượt này. | Dùng BOOKING_STATUS_LABELS, giờ VN và format tiền/ngày; giảm Card lồng và thống nhất bộ lọc. |
| Vừa | `/me/recurring`, `/me/complaints`, `/admin/complaints` | **Source:** `MyRecurringPage.tsx`, `MyComplaintsPage.tsx`, `AdminComplaintsPage.tsx` còn trạng thái Tag/enum trực tiếp; một số màn thiếu bố cục PageHeader/Section đồng nhất. | Nhãn tiếng Việt, StatusDot và khối danh sách/bảng theo chuẩn chung. Chưa xác minh từng trạng thái trên Chrome ở lượt này. |
| Vừa | `/venues/:slug` | **Source và các lần mở Chrome trước:** tên sân H2, tiêu đề khối H4; giá tô xanh đậm; dùng Card và bảng giá chưa có nhánh mobile. Source: `features/venue-detail/pages/VenueDetailPage.tsx`. | Sửa cấp chữ H1/H2, màu giá trung tính, Section và bố cục giá mobile. Chưa kết luận có tràn trang trong lượt này. |
| Sau | `/owner/reviews`, `/owner/courts/:courtId/maintenance`, `/owner/venues` | **Source:** header đánh giá nhiều nội dung không wrap; trang bảo trì vẫn dùng Table khi có bản ghi; thẻ cụm sân còn hoverable/Tag/emoji. Source: `OwnerReviewsPage.tsx`, `CourtMaintenancePage.tsx`, `OwnerVenuesPage.tsx`. | Chuẩn hóa header, trạng thái và mobile. Chrome trang bảo trì hiện rỗng và không tràn; cần kiểm tra thêm với danh sách có dữ liệu trước khi khẳng định lỗi bố cục. |

## Phạm vi xác minh

- Đã mở Chrome ở 375px: đơn đặt sân, lịch sân, cụm sân, sửa cụm sân/tab Sân con, bảng giá, bảo trì và đặt lịch cố định mới.
- Bảng đơn đặt sân đã kiểm tra desktop, mobile, dark mode, menu chi tiết và bộ lọc. Các nút thay đổi trạng thái được kiểm tra bằng test RTL/MSW, không thay đổi các đơn thật có sẵn.
- Phần còn lại là rà source theo chuẩn thiết kế; không coi rủi ro chưa tái hiện là lỗi vỡ bố cục đã xác nhận.
- Chỉ trang đơn đặt sân và badge dùng chung được chỉnh trong lượt này; danh sách trên là công việc đề xuất tiếp theo.
