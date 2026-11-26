# TỔNG QUAN PHÂN CÔNG – SanGo (Đề 4. Đặt lịch sân thể thao, Kiến trúc B)

> Đọc trước: `docs/Đề bài/TONG_QUAN_DE_TAI.md` (nguồn sự thật về kiến trúc, schema, API, nghiệp vụ).
> File chi tiết từng người: `01_Hung.md`, `02_Hieu.md`, `03_Lam.md`, `04_Duong.md`.

## 1. Nguyên tắc chia việc

1. **Chia theo chức năng dọc (vertical slice):** ai làm chức năng nào thì làm **trọn** DB (model/migration/seed) + BE (module, service, validate, phân quyền) + API + shared (type/schema) + FE (trang, component, state) + test + phần báo cáo của chức năng đó.
2. **Khối lượng tương đương:** mỗi người có 1 phần "khó" trọng tâm + các phần CRUD/giao diện + **1 tính năng nâng cao** + ≥ 4 test FE + unit test BE.
3. **Hưng làm trước phần nền** để website chạy ổn định, sau đó làm tiếp chức năng của mình song song với mọi người. Khối lượng phần nền được tính vào phần của Hưng (nên phần chức năng của Hưng nhẹ hơn).
4. Ai cũng có phần minh chứng cho 8 nhóm yêu cầu chung để ai cũng trả lời được khi bảo vệ.

## 2. Bảng phân công tổng

| | **Hưng** | **Hiếu** | **Lâm** | **Dương** |
|---|---|---|---|---|
| Phần trọng tâm (khó) | Nền tảng toàn dự án + Auth/RBAC nhiều lớp | **Chống đặt trùng** (SlotLock unique + transaction + 409 + test đồng thời) + **AvailabilityGrid** Compound/Render Props | **Bảng giá**: form phức tạp, schema dùng chung client/server, **hàm tính giá thuần** (qua nửa đêm, giờ vàng, cuối tuần) | **Máy trạng thái đơn** (union type + canTransition) + **chính sách hủy thuần** (hủy sát giờ) |
| Chức năng bắt buộc | Đăng ký/đăng nhập, hồ sơ, Admin: quản lý user, khóa, duyệt chủ sân, thống kê tổng | Tìm sân (môn/khu vực/ngày/giờ), trang chủ, lưới lịch trống ngày×giờ, đặt 1/nhiều khung liên tiếp, checkout, lịch sân chủ sân | Cụm sân, sân con, giờ mở cửa, bảng giá, khóa bảo trì, trang chi tiết sân | Lịch sử đặt, hủy, xác nhận/từ chối đơn, cron hoàn thành, đánh giá, khiếu nại (khách + admin), doanh thu ngày/tháng |
| Nâng cao | **Gửi email xác nhận** + Deploy + CI | **Giữ chỗ tạm 5 phút** | **Bản đồ vị trí sân** | **Đặt lịch cố định hàng tuần** |
| Model sở hữu | User | Booking (tạo), SlotLock, BookingHold | Venue, OpeningHour, Court, PriceRule, MaintenanceBlock | Booking (trạng thái), RecurringSeries, Review, Complaint |
| BE modules | health, auth, users, admin, mail, common/*, prisma, config | search, availability, holds, bookings | venues, courts, pricing, maintenance | booking-lifecycle, recurring, reviews, complaints, stats |
| FE features | auth, profile, admin-users, admin-dashboard, layouts, components/*, common/*, pages lỗi | search, availability, booking, owner-schedule, HomePage | owner-venues, pricing, maintenance, venue-detail, map | my-bookings, owner-bookings, recurring, reviews, complaints, stats |
| Pattern/kỹ thuật minh chứng | HOC `withAuthGuard`, generic hook `useDebounce<T>`/`useLocalStorage<T>`, `ZodValidationPipe<T>`, Interceptor, Exception Filter, Context, createAsyncThunk, phân trang server, Lighthouse | Compound Component + Render Props, `useSlotSelection<TSlot>`, `useUrlFilters<T>`, memo/useCallback, Profiler trước/sau, slice `bookingDraft` | `useFieldArray`, `superRefine` schema dùng chung, `Partial<>`/`Omit<>`, pure function test biên | Union type + `Record<BookingStatus,…>`, type guard, discriminated union, virtualization, recharts, cron |
| Seed | users (≥250) | – (cung cấp helper lock) | venues/courts/hours/prices | bookings (≥300) + reviews + complaints |
| Báo cáo | Kiến trúc, cấu trúc thư mục, sơ đồ CSDL, RBAC & lớp bảo vệ, state (Redux/Context), Lighthouse, deploy | Chống trùng & cách thử, pattern Compound/Render Props, Profiler, test đồng thời | Bảng giá & tính giá, giờ mở cửa qua nửa đêm, ảnh giao diện, coverage tổng hợp, kết luận | Giới thiệu & danh sách chức năng, máy trạng thái, chính sách hủy, bảng phân công, video demo |

## 3. Phụ thuộc giữa các phần

```
Hưng GĐ0 (nền + auth) ──┬──▶ Lâm: venues/courts/opening-hours ──▶ Lâm: pricing (PricingService)
                        │                                              │
                        │                                              ▼
                        ├──▶ Hiếu: hàm thuần generateDaySlots ──▶ Hiếu: availability + grid ──▶ Hiếu: booking create ──▶ Hiếu: holds
                        │                                                                         │
                        ├──▶ Dương: state machine + cancel policy (thuần, không phụ thuộc) ───────┼──▶ Dương: lifecycle, history, owner bookings
                        │                                                                         └──▶ Dương: recurring (dùng createBookingInTx)
                        └──▶ Hưng: profile, admin users, theme/lang, mail (lắng nghe event), deploy
```

**Hợp đồng (interface) giữa các người – phải giữ đúng chữ ký:**

| Người cung cấp | Hợp đồng | Người dùng |
|---|---|---|
| Hưng | `AppException`, `@Public`, `@Roles`, `@AllowUnapprovedOwner`, `@CurrentUser()`, `@ZodBody/@ZodQuery/@ZodParam`, `paginate<T>()`, `PrismaService`, event names trong `common/events/app-events.ts`, `baseApi`, `withAuthGuard`, UI kit, `useDocumentTitle`, `useDebounce`, `renderWithProviders`, hàm `shared/utils/time.ts` | Tất cả |
| Lâm | `CourtsService.getCourtForOwner(courtId, ownerId)` (ném 404/403), `VenuesService.assertVenueOwner(venueId, ownerId)`, `VenuesService.getOpeningHours(venueId)`, `PricingService.getCourtPricing(courtIds)`, `PricingService.quote(courtId, startAt, endAt, tx?)`, `calculatePrice()` thuần, `MaintenanceService.findOverlapping(courtIds, from, to, tx?)`, FE `LocationPicker`, `VenueMap`, `VenuesMap` | Hiếu, Dương |
| Hiếu | `generateDaySlots()` thuần, `SlotLockService.releaseBooking(tx, bookingId)`, `SlotLockService.findLocked(courtId, startAts, tx?)`, `BookingsService.createBookingInTx(tx, customerId, input, opts)`, `BookingsService.assertSlotsBookable(...)`, `toBookingDto()` + `bookingDtoInclude`, FE `CourtWeekSchedule`, `AvailabilityGrid`, `VenueCard` | Lâm (trang chi tiết), Dương |
| Dương | `canTransition()`, `assertTransition()`, `isTerminalStatus()` (shared), FE `VenueReviews`, `RatingStars`, `BookingStatusBadge`, `BookingDetailDrawer` | Lâm, Hiếu |

**Khi chưa có phần của người khác:** dùng stub tạm có cùng chữ ký (đánh dấu `// TODO(<tên>): thay bằng ... khi merge`) hoặc dữ liệu seed – **không** chặn tiến độ của mình.

## 4. Lộ trình (7 tuần – điều chỉnh theo hạn nộp thực tế)

| Giai đoạn | Thời gian | Hưng | Hiếu | Lâm | Dương |
|---|---|---|---|---|---|
| **GĐ0a** – Khung chạy được | Ngày 1–2 | Tạo repo, monorepo, shared, Nest + Vite trống, Docker, Prisma schema đầy đủ + migration `init`, push `main` | Đọc tài liệu, phác UI lưới lịch | Đọc tài liệu, phác UI form bảng giá | Đọc tài liệu, phác UI lịch sử/đơn chủ sân |
| **GĐ0b** – Nền hoàn chỉnh | Hết tuần 1 | NestJS core (filter, interceptor, guard, pipe), FE skeleton (router, layout, store, baseApi, UI kit, trang lỗi), test setup, Auth + seed user, README | Hàm thuần `generateDaySlots` + test (shared/BE) | Hàm thuần `calculatePrice` + schema `pricingConfigSchema` + test | `booking-status-machine` + `evaluateCancellation` + test |
| **GĐ1** – Chức năng bắt buộc | Tuần 2–3 | Hồ sơ, Admin users + duyệt chủ sân, Theme/Language Context | Availability API, AvailabilityGrid, Search, Booking create (409) | Venues/Courts/Opening hours (merge sớm!), Pricing form + API, Maintenance, trang chi tiết | Lifecycle API, lịch sử khách, đơn chủ sân, cron, seed bookings |
| **GĐ2** – Tích hợp + Nâng cao | Tuần 4–5 | Mail (event listener) + thống kê admin | Giữ chỗ 5 phút, checkout đếm ngược, lịch sân chủ sân, test đồng thời | Bản đồ (picker + hiển thị + tab bản đồ ở tìm kiếm), sao chép bảng giá | Đánh giá, khiếu nại, doanh thu, lịch cố định |
| **GĐ3** – Hoàn thiện | Tuần 6 | Deploy Neon/Render/Vercel, CI, Lighthouse trước/sau | Profiler trước/sau, bổ sung test | Bổ sung test, coverage tổng hợp, chụp ảnh giao diện | Bổ sung test, rà toàn bộ luồng |
| **GĐ4** – Nộp | Tuần 7 | Báo cáo phần mình, README cuối | Báo cáo phần mình | Báo cáo phần mình, ghép PDF | Báo cáo phần mình, quay & dựng video |

**Thứ tự merge ưu tiên vào `main`:** (1) Hưng GĐ0 → (2) Lâm venues/courts/opening-hours + PricingService → (3) Hiếu availability + booking create → (4) Dương lifecycle → còn lại tự do.

## 5. Phân bổ test (tối thiểu)

| Người | Test FE (Vitest + RTL) | Test BE (Jest) / shared (Vitest) |
|---|---|---|
| Hưng | authSlice reducer; LoginForm (lỗi validate + submit MSW); withAuthGuard redirect; useDebounce (fake timers) | AuthService (email trùng 409, sai mật khẩu 401, khóa 403); ZodValidationPipe; AllExceptionsFilter; time utils (shared) |
| Hiếu | AvailabilityGrid chọn khung liên tiếp / chặn khung không liền; đổi tuần gọi API (MSW); useSlotSelection; bookingDraftSlice; Checkout đếm ngược hết hạn | generateDaySlots (qua nửa đêm, ngày nghỉ); computeSlotStatuses; BookingsService (P2002 → 409, ngoài giờ → 409, hold hết hạn); script race |
| Lâm | PricingForm (rule chồng nhau báo lỗi, thêm/xóa rule); VenueForm submit (MSW); OpeningHoursForm qua nửa đêm; buildPriceTable util | calculatePrice ≥ 8 case biên; pricingConfigSchema / openingHoursSchema; VenuesService 403 khi không sở hữu; MaintenanceService 409 |
| Dương | Hủy đơn (ConfirmDialog + MSW + cập nhật trạng thái); BookingStatusBadge; ReviewForm chọn sao + submit; OwnerBookingsList virtualized render | booking-status-machine (mọi cặp chuyển); evaluateCancellation (đúng mốc, quá mốc 1 phút, đã bắt đầu, sai trạng thái); groupRevenue; LifecycleService từ chối chuyển sai |

Tổng FE ≥ 17 test (> 15 theo đề).

## 6. Quy trình làm việc với AI coding agent

Mỗi phiên, mở agent và dán prompt mẫu:

```
Bạn là AI coding agent hỗ trợ <TÊN> trong dự án SanGo.
1. Đọc docs/Đề bài/TONG_QUAN_DE_TAI.md và docs/Phân chia/<FILE_CỦA_TÔI>.md.
2. Làm task <MÃ TASK> theo đúng mô tả, chỉ sửa trong phạm vi sở hữu của tôi.
3. Tuân thủ mục 0 (quy tắc bắt buộc) của file tổng quan.
4. Viết test kèm theo, chạy `npm test` và `npm run build` phải pass.
5. Tick checklist task đã xong trong file phân công. Không tự commit/push trừ khi tôi yêu cầu.
```
