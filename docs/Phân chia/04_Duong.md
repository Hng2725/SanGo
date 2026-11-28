# PHÂN CÔNG: DƯƠNG – Vòng đời đơn + Hủy đơn + Lịch sử + Quản lý đơn chủ sân + Đánh giá + Khiếu nại + Doanh thu + Lịch cố định

> **Đọc trước:** `docs/Đề bài/TONG_QUAN_DE_TAI.md` (đặc biệt mục 6.7 → 6.12, 8, 9). File này mô tả chính xác việc Dương phải làm.
> Phần của Dương là **nghiệp vụ sau khi đặt**: máy trạng thái đơn, chính sách hủy, và các màn hình quản lý/báo cáo.

## 0. Prompt mẫu cho AI agent

```
Bạn là AI coding agent hỗ trợ Dương trong dự án SanGo.
Đọc docs/Đề bài/TONG_QUAN_DE_TAI.md và docs/Phân chia/04_Duong.md.
Làm task <D0 / D1 / ...> đúng mô tả. Chỉ sửa trong phạm vi sở hữu của Dương (mục 1).
Viết test kèm theo; `npm test` và `npm run build` phải pass. Tick checklist khi xong.
```

## 1. Phạm vi sở hữu

| Tầng | Sở hữu |
|---|---|
| shared | `booking/booking-status-machine.ts`, `types/booking-lifecycle.ts`, `types/review.ts`, `types/complaint.ts`, `types/stats.ts`, `types/recurring.ts`, `schemas/booking-lifecycle.schema.ts`, `schemas/review.schema.ts`, `schemas/complaint.schema.ts`, `schemas/stats.schema.ts`, `schemas/recurring.schema.ts` |
| DB | model **`Booking`** (phần chuyển trạng thái: `status`, `*At`, `cancelReason`, `rejectReason`), **`RecurringSeries`**, **`Review`**, **`Complaint`**; `prisma/seed/bookings.seed.ts`, `prisma/seed/reviews-complaints.seed.ts` |
| BE | `modules/booking-lifecycle`, `modules/recurring`, `modules/reviews`, `modules/complaints`, `modules/stats` |
| FE | `features/my-bookings`, `features/owner-bookings`, `features/recurring`, `features/reviews`, `features/complaints`, `features/stats` |
| Docs | `docs/bao-cao/duong.md`, video demo |

## 2. Phụ thuộc

- Cần GĐ0 của Hưng. **D0 không phụ thuộc ai** → làm ngay sau GĐ0a.
- Schema `Booking`/`SlotLock` đã có từ GĐ0 → có thể **tự seed đơn** (D4) để làm D1–D3 trước khi Hiếu xong phần tạo đơn.
- Cần của Hiếu: `SlotLockService.releaseBooking(tx, bookingId)`, `findLocked`, `BookingsService.createBookingInTx`, `assertSlotsBookable`, `toBookingDto` + `bookingDtoInclude`. **Chưa có thì** viết tạm trong `booking-lifecycle/deps.adapter.ts` (`prisma.slotLock.deleteMany({ where: { bookingId } })`, mapper tạm) có `// TODO(Dương): thay bằng service của Hiếu khi merge`.
- Cần của Lâm: `VenuesService.assertVenueOwner`, `cancelBeforeHours` trên Venue.

---

## 3. CÁC TASK

### D0 – Máy trạng thái đơn + Chính sách hủy (hàm thuần – GĐ0b)

**shared `booking/booking-status-machine.ts`** (dùng chung FE/BE):

```ts
export type BookingActor = 'CUSTOMER' | 'OWNER' | 'ADMIN' | 'SYSTEM';
export const BOOKING_TRANSITIONS: Record<BookingStatus, Partial<Record<BookingStatus, readonly BookingActor[]>>> = {
  PENDING:   { CONFIRMED: ['OWNER'], REJECTED: ['OWNER', 'SYSTEM'], CANCELLED: ['CUSTOMER', 'ADMIN'] },
  CONFIRMED: { CANCELLED: ['CUSTOMER', 'ADMIN'], COMPLETED: ['OWNER', 'SYSTEM'] },
  COMPLETED: {}, CANCELLED: {}, REJECTED: {},
};
export function canTransition(from: BookingStatus, to: BookingStatus, actor: BookingActor): boolean;
export class InvalidTransitionError extends Error { constructor(readonly from: BookingStatus, readonly to: BookingStatus, readonly actor: BookingActor) }
export function assertTransition(from: BookingStatus, to: BookingStatus, actor: BookingActor): void; // ném InvalidTransitionError
export function isTerminalStatus(status: BookingStatus): boolean;
export type BookingAction = 'CONFIRM' | 'REJECT' | 'CANCEL' | 'COMPLETE' | 'REVIEW' | 'COMPLAIN';
```

- Dùng `Record<BookingStatus, …>` để TypeScript bắt buộc khai báo đủ mọi trạng thái (thêm trạng thái mới mà quên → lỗi biên dịch). Dùng type guard `isBookingStatus` (Hưng) khi đọc query string.
- [x] Test `booking-status-machine.test.ts` (shared, Vitest): **duyệt toàn bộ 5×5×4 tổ hợp** so với bảng mục 6.7 tổng quan; trạng thái cuối không chuyển được; `assertTransition` ném đúng lỗi.

**BE `modules/booking-lifecycle/cancellation-policy.ts`** (hàm THUẦN):

```ts
export type CancellationDecision =
  | { allowed: true; deadline: Date | null }
  | { allowed: false; reason: 'INVALID_STATUS' | 'ALREADY_STARTED' | 'TOO_LATE'; deadline: Date | null };
export function evaluateCancellation(input: {
  status: BookingStatus; startAt: Date; now: Date; cancelBeforeHours: number; actor: 'CUSTOMER' | 'ADMIN';
}): CancellationDecision;
export function getCancelDeadline(startAt: Date, cancelBeforeHours: number): Date;
```

Quy tắc đúng mục 6.8 tổng quan (ADMIN bỏ qua mốc giờ nhưng vẫn phải trước giờ chơi).

- [x] Test `cancellation-policy.spec.ts` **(≥ 9 case biên)**: CONFIRMED hủy trước mốc 3 giờ → được; **đúng bằng mốc** → được; **quá mốc 1 phút (hủy sát giờ)** → `TOO_LATE`; `now == startAt` → `ALREADY_STARTED`; sau giờ chơi → `ALREADY_STARTED`; PENDING 10 phút trước giờ chơi → được; `cancelBeforeHours = 0` → được tới sát giờ; COMPLETED/CANCELLED/REJECTED → `INVALID_STATUS`; ADMIN quá mốc nhưng trước giờ chơi → được; đơn qua nửa đêm (startAt 00:00, mốc 22:00 hôm trước) tính đúng.

### D1 – API vòng đời đơn

**shared:**
- `types/booking-lifecycle.ts`: `BookingListItemDto = BookingDto & { allowedActions: BookingAction[] }`; `BookingDetailDto = BookingListItemDto & { cancelDeadline: string | null; timeline: { status: BookingStatus; at: string }[]; review: ReviewDto | null; venueCancelBeforeHours: number }`.
- `schemas/booking-lifecycle.schema.ts`: `cancelBookingSchema { reason?: ≤ 300 }`, `rejectBookingSchema { reason: 3..300 }`, `myBookingsQuerySchema = paginationQuerySchema.extend({ status?: enum, upcoming?: boolean })`, `ownerBookingsQuerySchema = paginationQuerySchema.extend({ venueId?, courtId?, status?, from?: dateStr, to?: dateStr, q? (mã đơn/tên/số điện thoại), pageSize max 500 })`.

**BE `modules/booking-lifecycle`:**
- [x] `allowed-actions.ts` (thuần): `getAllowedActions(booking, actor, ctx: { now; cancelBeforeHours; hasReview })` kết hợp `canTransition` + điều kiện thời gian + `evaluateCancellation` → `BookingAction[]`. Có test.
- [x] `booking-lifecycle.service.ts`:
  - `transition(bookingId, to, actor, user?, extra?)` – **hàm lõi**, trong `prisma.$transaction`:
    1. Load booking + court.venue. Không có → 404.
    2. **Kiểm tra sở hữu (tầng dữ liệu):** CUSTOMER phải là `customerId`; OWNER phải là `venue.ownerId`; sai → 403 `FORBIDDEN`.
    3. `assertTransition(from, to, actor)` → `InvalidTransitionError` map thành 409 `INVALID_STATUS_TRANSITION`.
    4. Điều kiện thời gian: CONFIRM cần `startAt > now`; COMPLETE cần `endAt <= now`; CANCEL dùng `evaluateCancellation` → 409 `CANCELLATION_NOT_ALLOWED` (kèm `reason`, `deadline`).
    5. Cập nhật có **khóa lạc quan**: `tx.booking.updateMany({ where: { id, status: from }, data: { status: to, <to>At: now, cancelReason/rejectReason } })` → `count === 0` (người khác vừa đổi) → 409 `INVALID_STATUS_TRANSITION`.
    6. `to ∈ {CANCELLED, REJECTED}` → `SlotLockService.releaseBooking(tx, bookingId)` (giải phóng khung).
    7. Sau commit: emit `AppEvents.BookingConfirmed | Rejected | Cancelled | Completed`.
  - `confirm`, `reject`, `cancel`, `complete` gọi `transition`.
  - `getDetail(bookingId, user)` – CUSTOMER chủ đơn / OWNER của sân / ADMIN, khác → 403 → `BookingDetailDto`.
  - `listMine(customerId, query)`, `listForOwner(ownerId, query)` (where `court.venue.ownerId = ownerId` – **lọc theo sở hữu ngay trong truy vấn**), sắp `startAt desc`, kèm `allowedActions`.
- [x] `booking-lifecycle.cron.ts`: `@Cron('*/10 * * * *')`: (a) CONFIRMED có `endAt <= now` → COMPLETED (actor SYSTEM); (b) PENDING có `startAt <= now` → REJECTED, `rejectReason = 'Quá hạn xác nhận'` + giải phóng khung. Mỗi đơn đi qua `transition` (hoặc batch nhưng vẫn kiểm tra `canTransition`), log số lượng.
- [x] Controllers:
  - `MyBookingsController` (`@Roles('CUSTOMER')`): `GET /me/bookings`.
  - `BookingActionsController`: `GET /bookings/:id` (đăng nhập, quyền kiểm tra trong service), `PATCH /bookings/:id/cancel` (`@Roles('CUSTOMER','ADMIN')`).
  - `OwnerBookingsController` (`@Roles('OWNER')`): `GET /owner/bookings`, `PATCH /owner/bookings/:id/confirm|reject|complete`.
- [x] Test `booking-lifecycle.service.spec.ts` (mock Prisma): chuyển sai (COMPLETED → CANCELLED) → 409; owner khác → 403; hủy quá mốc → 409 `CANCELLATION_NOT_ALLOWED`; hủy thành công gọi `releaseBooking`; `updateMany` count 0 → 409; cron chuyển đúng.

### D2 – Lịch sử đặt & chi tiết đơn của khách

**FE `features/my-bookings`:**
- [x] `api/myBookingsApi.ts`: `getMyBookings`, `getBooking(id)` (tag `Booking`), `cancelBooking` (invalidate `Booking`, `Availability`).
- [x] `components/BookingStatusBadge.tsx` (export – người khác dùng): màu + nhãn theo `BOOKING_STATUS_LABELS` (`Record<BookingStatus, { label; className }>`).
- [x] `pages/MyBookingsPage.tsx` (`/me/bookings`): tab "Sắp tới" / "Đã qua" / "Đã hủy-từ chối" + lọc trạng thái (đồng bộ URL), danh sách thẻ đơn (mã, cụm sân, sân, ngày giờ, tổng tiền, badge), phân trang, EmptyState có nút "Tìm sân".
- [x] `pages/BookingDetailPage.tsx` (`/me/bookings/:id`, title "Đơn SGxxxx"): thông tin đơn, **bảng breakdown giá**, **timeline trạng thái**, hạn hủy miễn phí ("Hủy miễn phí trước 16:00 20/11"), các nút theo `allowedActions`:
  - **Hủy** → `ConfirmDialog` nhập lý do → gọi API → `message.success("Đã hủy đơn")` + cập nhật badge; 409 hiển thị lý do (quá hạn).
  - **Đánh giá** (COMPLETED, chưa đánh giá) → `ReviewForm` (D5).
  - **Khiếu nại** → `ComplaintForm` (D6) điền sẵn venue + booking.
  - Đơn thuộc chuỗi lịch cố định → link tới `/me/recurring`.

### D3 – Quản lý đơn của chủ sân (danh sách dài – VIRTUALIZATION)

**FE `features/owner-bookings`:**
- [x] `api/ownerBookingsApi.ts`: `getOwnerBookings` dạng **cuộn vô hạn**: `pageSize = 100`, `serializeQueryArgs` bỏ `page`, `merge` nối `items`, `forceRefetch` khi `page` đổi (mẫu "infinite scroll" chuẩn của RTK Query); `confirmBooking`, `rejectBooking`, `completeBooking`, `confirmSeries` (invalidate `Booking`, `Availability`, `Stats`).
- [x] `pages/OwnerBookingsPage.tsx` (`/owner/bookings`): bộ lọc (cụm sân, sân, trạng thái, khoảng ngày, ô tìm mã/tên/SĐT debounce) đồng bộ URL; tab nhanh "Chờ xác nhận (n)".
- [x] `components/OwnerBookingsList.tsx`: **@tanstack/react-virtual** `useVirtualizer` (hàng cao cố định ~88px, `overscan: 8`), chỉ render các hàng đang thấy; gần cuối danh sách → tải trang tiếp. Seed có ≥ 300 đơn → minh chứng "danh sách ≥ 200 dòng dùng virtualization". Mỗi hàng: mã, khách, SĐT, sân, ngày giờ, tiền, badge, nút Xác nhận / Từ chối (modal lý do) / Hoàn thành theo `allowedActions`. Hàng bọc `React.memo`.
- [x] `components/BookingDetailDrawer.tsx` (**export** – Hiếu dùng ở `/owner/schedule`): props `{ bookingId: string | null; onClose(): void }`, hiển thị chi tiết + nút hành động.
- [x] Highlight đơn khi URL có `?highlight=<id>` (cuộn tới hàng đó bằng `virtualizer.scrollToIndex`).
- [x] Thêm mục "Đơn đặt" (kèm số chờ xác nhận) vào menu OwnerLayout.

### D4 – Seed đơn đặt, đánh giá, khiếu nại

- [x] `prisma/seed/bookings.seed.ts` – `seedBookings(prisma, { customerIds, courts })`: ≥ 300 đơn từ 60 ngày trước → 14 ngày sau; **tôn trọng giờ mở cửa** (dùng `generateDaySlots`) và **không trùng** (theo dõi `Set<courtId|startAt>`); giá tính bằng `calculatePrice` (import hàm thuần của Lâm); trạng thái hợp lý theo thời gian (quá khứ: chủ yếu COMPLETED, một ít CANCELLED/REJECTED; tương lai: PENDING/CONFIRMED); tạo `SlotLock` cho PENDING/CONFIRMED/COMPLETED; đặt các `*At` đúng; tạo 1–2 `RecurringSeries` mẫu. Phần lớn đơn thuộc các sân của `owner@sango.vn`, nhiều đơn của `customer@sango.vn`.
- [x] `prisma/seed/reviews-complaints.seed.ts`: đánh giá cho ~40% đơn COMPLETED (rating phân bố 3–5, vài 1–2), cập nhật `avgRating/reviewCount` của venue; 10–15 khiếu nại đủ trạng thái.
- [x] Gọi trong `seed.ts` sau `seedVenues`.

### D5 – Đánh giá sân

**shared:** `createReviewSchema { bookingId; rating: int 1..5; comment?: ≤ 1000 }`, `updateReviewSchema = createReviewSchema.omit({ bookingId }).partial()` (minh chứng `Omit` + `Partial`), `replyReviewSchema { reply: 1..1000 }`; `ReviewDto { id; bookingId; rating; comment; ownerReply; createdAt; user: { fullName } ; court: { name } }`; `ReviewListDto = Paginated<ReviewDto> & { summary: { avgRating; count; distribution: Record<1|2|3|4|5, number> } }`.

**BE `modules/reviews`:**
- [x] `create(userId, input)`: booking phải của user và **COMPLETED**, chưa có review → không thì 409 `REVIEW_NOT_ALLOWED`; transaction: tạo review + tính lại `avgRating` (aggregate `_avg`, `_count`) cập nhật Venue. `update`/`delete` (chủ review) cũng tính lại.
- [x] `listByVenue(venueId, page)` (`@Public`), `listForOwner(ownerId, query)`, `reply(reviewId, ownerId, reply)` (venue phải của owner → 403).
- [x] Test: đơn chưa COMPLETED → 409; đánh giá lần 2 → 409; avg tính đúng.

**FE `features/reviews`:**
- [x] `components/RatingStars.tsx` – hiển thị & **nhập** (radio group, dùng được bằng bàn phím, `aria-label`).
- [x] `components/ReviewForm.tsx` – RHF + `zodResolver(createReviewSchema)`.
- [x] `components/VenueReviews.tsx` (**export** – Lâm nhúng vào trang chi tiết): tóm tắt (điểm TB, biểu đồ thanh phân bố 1–5 sao), danh sách đánh giá + phản hồi chủ sân, phân trang "Xem thêm".
- [x] `pages/OwnerReviewsPage.tsx` (`/owner/reviews`): danh sách đánh giá các cụm sân của tôi, lọc theo cụm/số sao, trả lời inline. Thêm mục menu.

### D6 – Khiếu nại

**shared:** `createComplaintSchema { venueId; bookingId?; title 5..120; content 10..2000 }`, `adminUpdateComplaintSchema { status: enum(IN_PROGRESS|RESOLVED|REJECTED); adminResponse: 3..2000 }` (bắt buộc khi RESOLVED/REJECTED – refine); `COMPLAINT_TRANSITIONS: Record<ComplaintStatus, readonly ComplaintStatus[]>` (`OPEN → IN_PROGRESS|RESOLVED|REJECTED`, `IN_PROGRESS → RESOLVED|REJECTED`); `ComplaintDto`.

**BE `modules/complaints`:**
- [x] `create(userId, input)`: nếu có `bookingId` thì booking phải của user và thuộc `venueId` (không → 403/400).
- [x] `listMine`, `adminList(query)` (lọc status, phân trang), `adminUpdate(id, adminId, input)` (chuyển sai → 409 `INVALID_STATUS_TRANSITION`; ghi `handledById`, `resolvedAt`).
- [x] Controllers: `POST /complaints`, `GET /me/complaints` (`@Roles('CUSTOMER')`), `GET /admin/complaints`, `PATCH /admin/complaints/:id` (`@Roles('ADMIN')`).

**FE `features/complaints`:**
- [x] `components/ComplaintForm.tsx` (modal), `pages/MyComplaintsPage.tsx` (`/me/complaints`): danh sách + trạng thái + phản hồi admin.
- [x] `pages/AdminComplaintsPage.tsx` (`/admin/complaints`): lọc trạng thái, bảng/thẻ, modal xử lý (chọn trạng thái hợp lệ theo `COMPLAINT_TRANSITIONS`, nhập phản hồi). Thêm mục menu AdminLayout.

### D7 – Doanh thu & Dashboard chủ sân

**shared:** `revenueQuerySchema { venueId?; from: dateStr; to: dateStr; groupBy: enum('day','month') }` + refine (`from ≤ to`; day ≤ 92 ngày; month ≤ 24 tháng); `RevenuePoint { period: string; revenue: number; bookingCount: number }`; `RevenueReportDto { groupBy; points: RevenuePoint[]; totalRevenue; totalBookings; expectedRevenue }`; `OwnerSummaryDto { todayBookings; pendingCount; monthRevenue; avgRating }`.

**BE `modules/stats`:**
- [x] `revenue-grouping.ts` (thuần): `groupRevenue(rows: ReadonlyArray<{ startAt: Date; totalPrice: number }>, groupBy: 'day' | 'month', from: string, to: string): RevenuePoint[]` – nhóm theo **ngày/tháng giờ VN** (dùng `toVnParts`), **lấp kỳ trống = 0**, sắp tăng dần.
- [x] `stats.service.ts`: `revenue(ownerId, query)` (đơn COMPLETED thuộc sân của owner trong khoảng – chuyển `from/to` sang UTC bằng `vnDateMinuteToUtc`; `venueId` phải của owner → 403), `expectedRevenue` (CONFIRMED tương lai), `summary(ownerId)`.
- [x] Controller `@Roles('OWNER')`: `GET /owner/stats/revenue`, `GET /owner/stats/summary`.
- [x] Test `revenue-grouping.spec.ts`: đơn lúc 23:30 VN (16:30 UTC) vào đúng ngày VN; đơn 00:30 VN ngày 1 (17:30 UTC ngày trước) vào đúng tháng mới; lấp ngày trống; nhóm theo tháng.

**FE `features/stats`:**
- [x] Cài `recharts`. `pages/OwnerDashboardPage.tsx` (`/owner`, thay placeholder): 4 thẻ KPI (summary), bộ chọn khoảng nhanh (7 ngày, 30 ngày, tháng này, 12 tháng) + chọn cụm sân + groupBy, **biểu đồ cột doanh thu** (`ResponsiveContainer` – co giãn mobile), bảng số liệu bên dưới, tổng + doanh thu dự kiến.
- [x] Component biểu đồ load bằng `React.lazy` (recharts nặng) → code-splitting.

### D8 – Đặt lịch cố định hàng tuần (NÂNG CAO)

**shared `schemas/recurring.schema.ts`:**

```ts
export const recurringBaseSchema = z.object({
  courtId: idSchema,
  firstDate: dateStrSchema,                                    // ngày hoạt động đầu tiên (giờ VN)
  startMinute: z.number().int().min(0).max(1740).multipleOf(60), // theo ngày hoạt động (có thể qua nửa đêm)
  slotCount: z.number().int().min(1).max(MAX_SLOTS_PER_BOOKING),
  weeks: z.number().int().min(2).max(12),
});
export const recurringPreviewSchema = recurringBaseSchema;
export const createRecurringSchema = recurringBaseSchema.extend({
  contactPhone: phoneVnSchema, note: z.string().max(500).optional(), skipConflicts: z.boolean().default(false),
});
```

`types/recurring.ts`: `RecurringPreviewDto { items: { date; startAt; endAt; available: boolean; reason: 'BOOKED' | 'MAINTENANCE' | 'CLOSED' | 'PAST' | null; price: number | null }[]; totalAvailablePrice: number }`, `RecurringSeriesDto`, `CreateRecurringResultDto { series; created: BookingDto[]; skippedDates: string[] }`.

**BE `modules/recurring`:**
- [x] `recurring-dates.ts` (thuần): `buildWeeklyOccurrences(firstDate, startMinute, slotCount, weeks): { date; startAt: Date; endAt: Date }[]` (dùng `addDaysToDateStr`, `vnDateMinuteToUtc`). Có test (qua nửa đêm, qua tháng).
- [x] `recurring.service.ts`:
  - `preview(customerId, input)`: với từng tuần kiểm tra bằng `BookingsService.assertSlotsBookable` + `SlotLockService.findLocked` (của Hiếu) + giá `PricingService.quote` (của Lâm) → `RecurringPreviewDto`.
  - `create(customerId, input)`: chạy preview; có tuần không trống mà `skipConflicts = false` → 409 `SLOT_ALREADY_BOOKED` với `details.conflictedDates`; ngược lại **một transaction**: tạo `RecurringSeries` + gọi `BookingsService.createBookingInTx(tx, customerId, {...}, { recurringSeriesId })` cho từng tuần trống; P2002 do race → 409 (rollback toàn bộ). Sau commit emit `AppEvents.RecurringCreated`.
  - `listMine`, `cancelSeries(seriesId, customerId)`: với từng đơn tương lai của chuỗi, đơn nào `evaluateCancellation` cho phép thì `transition(... CANCELLED)`; trả về số đơn đã hủy / không hủy được; set series `CANCELLED`.
  - `confirmSeries(seriesId, ownerId)`: xác nhận mọi đơn PENDING tương lai của chuỗi (sân phải của owner → 403).
- [x] Controllers: `POST /recurring/preview`, `POST /recurring`, `GET /me/recurring`, `PATCH /me/recurring/:id/cancel` (`@Roles('CUSTOMER')`); `PATCH /owner/recurring/:id/confirm` (`@Roles('OWNER')`).
- [x] Test: all-or-nothing trả 409 khi có tuần trùng; `skipConflicts` tạo đúng số đơn; hủy chuỗi bỏ qua đơn quá hạn hủy.

**FE `features/recurring`:**
- [x] `pages/NewRecurringPage.tsx` (`/me/recurring/new?courtId=&date=&startMinute=&slotCount=` – Hiếu thêm nút "Đặt cố định hàng tuần" trong `CourtWeekSchedule` dẫn tới đây): form RHF (số tuần, SĐT, ghi chú, checkbox "Bỏ qua tuần bị trùng"); khi đổi số tuần → gọi preview (debounce) → **bảng xem trước** từng ngày (✓ trống / ✗ lý do, giá); tổng tiền; submit → kết quả (đã tạo n đơn, bỏ qua các ngày…) → `/me/recurring`.
- [x] `pages/MyRecurringPage.tsx` (`/me/recurring`): danh sách chuỗi (sân, thứ, giờ, số tuần, số đơn theo trạng thái), nút hủy chuỗi (ConfirmDialog).
- [x] Owner: trong `OwnerBookingsList`, đơn thuộc chuỗi có badge "Cố định" + hành động "Xác nhận cả chuỗi".

---

## 4. Test bắt buộc (tổng hợp)

| Loại | Test |
|---|---|
| shared | `booking-status-machine.test.ts` (toàn bộ tổ hợp) |
| BE | `cancellation-policy.spec.ts` (≥ 9 case), `allowed-actions.spec.ts`, `booking-lifecycle.service.spec.ts`, `revenue-grouping.spec.ts`, `reviews.service.spec.ts`, `recurring-dates.spec.ts`, `recurring.service.spec.ts` |
| FE (≥ 4) | `BookingDetailPage.test.tsx` (**tương tác + async MSW**: bấm Hủy → nhập lý do → xác nhận → badge chuyển "Đã hủy"; MSW trả 409 → hiện thông báo quá hạn); `BookingStatusBadge.test.tsx`; `ReviewForm.test.tsx` (chọn 4 sao bằng click/bàn phím + submit payload đúng); `OwnerBookingsList.test.tsx` (300 đơn chỉ render một phần hàng – mock kích thước phần tử cho virtualizer, nút Xác nhận gọi API); `NewRecurringPage.test.tsx` (preview hiển thị ngày bị trùng) |

## 5. Hợp đồng Dương cung cấp (giữ đúng chữ ký)

| Thứ | Người dùng |
|---|---|
| `canTransition`, `assertTransition`, `isTerminalStatus`, `BookingAction`, `BookingActor` (shared) | Hiếu (hiển thị), mọi FE |
| FE `BookingStatusBadge` | Hiếu, Hưng (admin) |
| FE `VenueReviews`, `RatingStars` | Lâm (trang chi tiết), Hiếu (VenueCard có thể dùng `RatingStars`) |
| FE `BookingDetailDrawer` | Hiếu (`/owner/schedule`) |

## 6. Phần báo cáo Dương viết (`docs/bao-cao/duong.md`)

- **Giới thiệu đề tài**, vai trò, **danh sách chức năng đã làm** (đánh dấu cái chưa hoàn thành nếu có) – tổng hợp từ checklist của cả nhóm.
- **Máy trạng thái đơn:** sơ đồ trạng thái, union type + `Record`, hàm `canTransition`, cách server từ chối (409) + khóa lạc quan `updateMany where status`.
- **Chính sách hủy:** quy tắc, bảng case test biên (hủy sát giờ…).
- Virtualization danh sách đơn của chủ sân (vì sao chọn virtualization thay vì phân trang ở màn này).
- **Bảng phân công**: công việc cụ thể và % đóng góp từng thành viên (lấy từ file phân công + thống kê commit `git shortlog -sn`).
- Kịch bản & dựng **video demo 5–10 phút** (luồng: khách tìm → xem lịch → giữ chỗ → đặt → chủ sân xác nhận → hủy/hoàn thành → đánh giá → doanh thu → admin duyệt chủ sân/khiếu nại → demo 2 người bấm cùng lúc bị 409).

## 7. Checklist Definition of Done

- [x] D0 → D8 xong, mỗi chức năng đủ DB + BE + API + shared + FE + test.
- [x] Mọi chuyển trạng thái đi qua `transition()` (không update `status` trực tiếp ở chỗ khác).
- [x] Hủy/từ chối luôn giải phóng khung (kiểm tra trên lưới của Hiếu).
- [x] Seed ≥ 300 đơn, virtualization chạy mượt.
- [x] Báo cáo phần mình hoàn tất tại `docs/bao-cao/duong.md`.
- [ ] Video demo thực tế (đã có kịch bản trong báo cáo, cần quay thủ công).

## 8. Gợi ý nhánh & commit

`feat/duong-status-machine` → `feat/duong-cancellation-policy` → `feat/duong-booking-lifecycle` → `feat/duong-my-bookings` → `feat/duong-owner-bookings` → `feat/duong-seed-bookings` → `feat/duong-reviews` → `feat/duong-complaints` → `feat/duong-revenue` → `feat/duong-recurring`.
Ví dụ commit: `feat(booking): add booking status machine with union types`, `feat(lifecycle): reject invalid status transitions with 409`, `feat(owner-bookings): virtualize long booking list`.
