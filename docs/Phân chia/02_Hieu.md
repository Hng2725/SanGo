# PHÂN CÔNG: HIẾU – Tìm sân + Lịch trống (AvailabilityGrid) + Đặt sân chống trùng + Giữ chỗ 5 phút

> **Đọc trước:** `docs/Đề bài/TONG_QUAN_DE_TAI.md` (đặc biệt mục 6.1, 6.2, 6.5, 6.6, 8, 10). File này mô tả chính xác việc Hiếu phải làm.
> Phần của Hiếu là **trọng tâm kỹ thuật của Đề 4**: chống đặt trùng (kể cả bấm cùng lúc) và lưới lịch tái sử dụng.

## 0. Prompt mẫu cho AI agent

```
Bạn là AI coding agent hỗ trợ Hiếu trong dự án SanGo.
Đọc docs/Đề bài/TONG_QUAN_DE_TAI.md và docs/Phân chia/02_Hieu.md.
Làm task <K0 / K1 / ...> đúng mô tả. Chỉ sửa trong phạm vi sở hữu của Hiếu (mục 1).
Viết test kèm theo; `npm test` và `npm run build` phải pass. Tick checklist khi xong.
```

## 1. Phạm vi sở hữu

| Tầng | Sở hữu |
|---|---|
| shared | `types/availability.ts`, `types/booking.ts`, `types/search.ts`, `schemas/booking.schema.ts` (createBooking, createHold), `schemas/search.schema.ts`, `schemas/availability.schema.ts` |
| DB | model **`Booking`** (tạo đơn – phần trạng thái do Dương), **`SlotLock`**, **`BookingHold`**; migration CHECK constraint SlotLock |
| BE | `modules/availability`, `modules/search`, `modules/bookings` (tạo đơn + `SlotLockService` + mapper `toBookingDto`), `modules/holds`, `BE/scripts/race-booking.ts` |
| FE | `features/search`, `features/availability`, `features/booking`, `features/owner-schedule`, `pages/HomePage.tsx` (thay placeholder của Hưng) |
| Docs | `docs/bao-cao/hieu.md` |

## 2. Phụ thuộc

- Cần GĐ0 của Hưng (auth, common, baseApi, UI kit).
- Cần của Lâm: `VenuesService.getOpeningHours`, `PricingService.getCourtPricing / quote`, `MaintenanceService.findOverlapping`. **Chưa có thì:** đọc thẳng Prisma (`openingHour`, `priceRule`, `maintenanceBlock`) trong một file adapter `availability/deps.adapter.ts` có `// TODO(Hiếu): thay bằng service của Lâm khi merge`, và dùng seed tạm trong DB local.
- Dương sẽ dùng: `SlotLockService.releaseBooking`, `BookingsService.createBookingInTx`, `toBookingDto`, `generateDaySlots`.

---

## 3. CÁC TASK

### K0 – Hàm thuần sinh khung giờ & tính trạng thái (làm ngay GĐ0b, không phụ thuộc ai)

File `BE/src/modules/availability/slot-generator.ts`:

```ts
export interface OpeningHourLike { dayOfWeek: number; isClosed: boolean; openMinute: number; closeMinute: number }
export interface SlotTemplate { startAt: Date; endAt: Date; minuteOfDay: number } // minuteOfDay theo ngày hoạt động, có thể >= 1440
/** Sinh các khung 60' của NGÀY HOẠT ĐỘNG dateStr (giờ VN). Ngày nghỉ / không có cấu hình → []. */
export function generateDaySlots(openingHours: readonly OpeningHourLike[], dateStr: string): SlotTemplate[];
```

File `BE/src/modules/availability/slot-status.ts`:

```ts
export interface SlotStatusContext {
  now: Date;
  currentUserId?: string;
  locks: ReadonlyArray<{ startAt: Date; bookingId: string | null; holdUserId: string | null; expiresAt: Date | null; booking?: SlotBookingInfo }>;
  maintenance: ReadonlyArray<{ startAt: Date; endAt: Date }>;
  includeBookingInfo: boolean; // true khi người xem là OWNER sở hữu
}
export function computeSlotStatus(slot: SlotTemplate, ctx: SlotStatusContext): { status: SlotStatus; booking?: SlotBookingInfo };
```

Thứ tự ưu tiên: `PAST` (startAt ≤ now) → `BOOKED` (lock có bookingId) → `MAINTENANCE` → `HELD_BY_ME`/`HELD` (lock hold còn hạn) → `AVAILABLE`. Hold hết hạn coi như không có.

- [ ] Test `slot-generator.spec.ts`: ngày thường 06:00–22:00 (16 khung); ngày nghỉ (0 khung); **qua nửa đêm** 18:00–02:00 (8 khung, khung cuối startAt là 01:00 ngày hôm sau theo giờ VN, minuteOfDay = 1500); CN/T7 lấy đúng dayOfWeek; dateStr đổi tháng/năm (31/12 → 01/01).
- [ ] Test `slot-status.spec.ts`: đủ 6 trạng thái + hold hết hạn → AVAILABLE + chỉ trả booking info khi `includeBookingInfo`.

### K1 – API lịch trống

**shared:** `types/availability.ts` (đúng mục 8.4 tổng quan), `schemas/availability.schema.ts`: `venueDayQuerySchema { date: dateStrSchema }`, `courtWeekQuerySchema { weekStart: dateStrSchema }` (refine: phải là Thứ 2 – nếu không thì server tự chuẩn hóa về Thứ 2 bằng `startOfWeekDateStr`).

**BE `modules/availability`:**
- [ ] `AvailabilityService.getCourtWeek(courtId, weekStart, viewer?: AuthUser)`: court phải `isActive` và venue `ACTIVE` (không → 404; trừ khi viewer là owner sở hữu); 1 query lấy openingHours, 1 query lấy pricing (`PricingService.getCourtPricing`), 1 query lấy `SlotLock` trong khoảng tuần (kèm `hold.userId`, `booking { id, code, status, customer.fullName }`), 1 query maintenance chồng khoảng → `generateDaySlots` từng ngày → `computeSlotStatus` → giá từng khung bằng `calculatePrice` của Lâm cho đúng 1 khung (hoặc helper `priceForSlot` nếu Lâm export). **Không query trong vòng lặp.**
- [ ] `AvailabilityService.getVenueDay(venueId, date, viewer?)`: tương tự cho mọi court active của venue trong 1 ngày.
- [ ] `includeBookingInfo = viewer?.role === 'OWNER' && venue.ownerId === viewer.id`.
- [ ] Controller (`@Public()` + `@OptionalUser()`): `GET /venues/:venueId/availability?date=`, `GET /courts/:courtId/availability?weekStart=`.
- [ ] Test service: mock Prisma, kiểm tra owner thấy booking info, khách không thấy.

### K2 – Component `AvailabilityGrid` (Compound Component + Render Props) – TÁI SỬ DỤNG

Thư mục `FE/src/features/availability/`.

- [ ] `api/availabilityApi.ts`: `getCourtWeek({ courtId, weekStart })`, `getVenueDay({ venueId, date })` – `providesTags: [{ type: 'Availability', id: courtId }]`, `keepUnusedDataFor: 30`.
- [ ] `hooks/useCourtWeekAvailability.ts`: quản lý `weekStart` **cục bộ** (state trong component lưới, không đẩy lên page) + gọi query + **prefetch tuần kế tiếp** (`usePrefetch`) → đổi tuần chỉ re-render phần lưới.
- [ ] `hooks/useSlotSelection.ts` (**custom hook generic – minh chứng**):

```ts
export interface SlotSelectionOptions<TSlot> {
  getKey: (slot: TSlot) => string;
  isSelectable: (slot: TSlot) => boolean;
  isAdjacent: (a: TSlot, b: TSlot) => boolean; // a.endAt === b.startAt và cùng ngày hoạt động
  max: number;                                  // MAX_SLOTS_PER_BOOKING
}
export function useSlotSelection<TSlot>(options: SlotSelectionOptions<TSlot>): {
  selected: readonly TSlot[]; isSelected: (slot: TSlot) => boolean; toggle: (slot: TSlot) => void; clear: () => void; error: string | null;
};
```

  Quy tắc: chọn ô liền kề đầu/cuối dải → nối dài; bấm ô ở đầu/cuối dải → bỏ; bấm ô không liền kề → bắt đầu dải mới; vượt `max` → `error`; ô không selectable → bỏ qua. `toggle`, `isSelected` bọc `useCallback` để ô `memo` không re-render thừa.
- [ ] `components/AvailabilityGrid/` – API compound:

```tsx
<AvailabilityGrid data={week} mode="customer" | "owner" isFetching={isFetching}>
  <AvailabilityGrid.Toolbar>
    <AvailabilityGrid.WeekNav weekStart={weekStart} onChange={setWeekStart} />
    <AvailabilityGrid.Legend />
  </AvailabilityGrid.Toolbar>
  <AvailabilityGrid.Table
    renderCell={(slot, { day, isSelected }) => <SlotCell slot={slot} selected={isSelected} onClick={toggle} />}
  />
</AvailabilityGrid>
```

  - `AvailabilityGrid` (root) tạo Context chứa: danh sách cột (7 ngày), danh sách hàng (hợp các `minuteOfDay` của tuần, sắp tăng dần), `Map<"date|minute", AvailabilitySlot>` tính bằng `useMemo`, `mode`, `isSelected`.
  - `Table` dùng **Render Props** `renderCell` để khách và chủ sân vẽ ô khác nhau trên cùng một khung lưới; ô trống (đóng cửa) vẽ `CLOSED`.
  - `Header` (tên thứ + ngày, highlight hôm nay), `WeekNav` (◀ Tuần trước | Hôm nay | Tuần sau ▶, không cho lùi về tuần đã qua ở mode customer), `Legend` (màu: trống, đã đặt, đang giữ, của bạn, bảo trì, đã qua).
  - Ô (`SlotCell`, `OwnerSlotCell`) bọc `React.memo`; truyền `selected: boolean` thay vì cả mảng selection.
  - **Mobile (< md):** hiển thị 1 ngày/lần với dải chip chọn ngày (dùng chung Context), không gây cuộn ngang trang; desktop hiển thị 7 cột (cuộn ngang trong container nếu hẹp).
  - Dùng `useCallback`/`useMemo` có lý do (ghi comment ngắn).
- [ ] `components/CourtWeekSchedule.tsx` (component ghép sẵn cho **khách**, Lâm nhúng vào trang chi tiết): props `{ venue: { id; slug; name }; courts: CourtSummaryDto[] }` → tab chọn sân con → lưới tuần → thanh tóm tắt dưới (khung đã chọn, tổng tiền tạm tính = tổng `price`) → nút **"Đặt sân"** (guest → `/login?redirect=…`; OWNER/ADMIN → ẩn nút) → lưu `bookingDraft` → (sau K7: tạo hold) → điều hướng `/booking/checkout`. Thêm nút phụ **"Đặt cố định hàng tuần"** (chỉ CUSTOMER, khi đã chọn khung) → điều hướng `/me/recurring/new?courtId=&date=&startMinute=&slotCount=` (trang của Dương).
- [ ] Xuất trong `features/availability/index.ts`: `AvailabilityGrid`, `CourtWeekSchedule`, `useSlotSelection`.
- [ ] **Profiler trước/sau** (React DevTools Profiler): ghi lại đổi tuần & chọn ô **trước** khi thêm memo/useCallback và **sau** khi thêm → ảnh `docs/bao-cao/images/perf/profiler-grid-{before,after}.png`.

### K3 – Lịch sân của chủ sân (tái sử dụng grid ở mode owner)

- [ ] `features/owner-schedule/pages/OwnerSchedulePage.tsx` (`/owner/schedule`): chọn cụm sân (dùng API `GET /owner/venues` của Lâm) → chọn sân con → **cùng `AvailabilityGrid`** với `mode="owner"` và `renderCell` riêng (`OwnerSlotCell`: tên khách + màu theo trạng thái đơn, ô bảo trì gạch chéo). Bấm ô có đơn → mở `BookingDetailDrawer` của Dương (`features/owner-bookings`) – chưa có thì link tới `/owner/bookings?highlight=<bookingId>`.
- [ ] Thêm mục "Lịch sân" vào menu OwnerLayout (1 dòng cấu hình).

### K4 – Tạo đơn đặt sân CHỐNG TRÙNG (trọng tâm)

**shared `schemas/booking.schema.ts`:**

```ts
export const createBookingSchema = z.object({
  courtId: idSchema,
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  contactPhone: phoneVnSchema,
  note: z.string().max(500).optional(),
  holdId: idSchema.optional(),
}).superRefine((v, ctx) => { /* end > start; cả hai chia hết 60'; (end-start)/60' ∈ [1, MAX_SLOTS_PER_BOOKING] */ });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
```

**DB:**
- [ ] Migration `add_slotlock_check` (tạo bằng `prisma migrate dev --create-only` rồi thêm SQL CHECK ở mục 7 tổng quan).

**BE `modules/bookings`:**
- [ ] `slot-lock.service.ts` – `SlotLockService` (export khỏi module):
  - `lockForBooking(tx, { courtId, startAt, endAt, bookingId })` → `createMany` các khung (`enumerateSlotStarts`).
  - `purgeExpiredHoldLocks(tx, courtId, startAts, now)`.
  - `releaseBooking(tx, bookingId)` → `deleteMany({ where: { bookingId } })` (**Dương gọi khi hủy/từ chối**).
  - `findLocked(courtId, startAts, tx?)` (Dương dùng để kiểm tra trước khi tạo lịch cố định).
- [ ] `booking-code.ts`: `generateBookingCode(now: Date, rand: () => number = Math.random): string` → `SG` + `yyMMdd` (giờ VN) + 4 ký tự base36 in hoa. Có test.
- [ ] `bookings.service.ts`:
  - `createBookingInTx(tx, customerId, input, opts?: { recurringSeriesId?: string; now?: Date })` – các bước 1→4 ở mục 6.5 tổng quan: kiểm tra court/venue active, khung **thuộc giờ mở cửa** (dùng `generateDaySlots` của ngày hoạt động chứa startAt, kể cả ca qua đêm của ngày hôm trước), `startAt > now`, **không chồng bảo trì** (`MaintenanceService.findOverlapping(..., tx)`) → vi phạm: 409 `SLOT_UNAVAILABLE`; xử lý hold (hold không hợp lệ/hết hạn → 409 `HOLD_EXPIRED`); tính giá `PricingService.quote(courtId, startAt, endAt, tx)`; tạo Booking (PENDING, `priceBreakdown`), tạo/chuyển SlotLock. **Không emit event** trong hàm này.
  - `createBooking(customerId, input)`: `prisma.$transaction((tx) => this.createBookingInTx(...), { timeout: 10_000 })`; bắt `isPrismaUniqueError(e)`: nếu `meta.target` chứa `code` → thử lại 1 lần với mã mới; ngược lại → `AppException(409, 'SLOT_ALREADY_BOOKED', 'Khung giờ bạn chọn vừa có người đặt…', { courtId, startAt, endAt })`. Thành công → emit `AppEvents.BookingCreated` → trả `toBookingDto`.
  - `bookings.mapper.ts` – `toBookingDto(booking: BookingWithRelations): BookingDto` + export `bookingDtoInclude` (Prisma `include` chuẩn) để Dương dùng lại.
- [ ] Controller: `POST /bookings` `@Roles('CUSTOMER')` `@ZodBody(createBookingSchema)` → 201.
- [ ] Test `bookings.service.spec.ts`: thành công; P2002 (courtId,startAt) → 409 `SLOT_ALREADY_BOOKED`; ngoài giờ mở cửa → 409 `SLOT_UNAVAILABLE`; chồng bảo trì → 409; khung đã qua → 409; hold của người khác/hết hạn → 409 `HOLD_EXPIRED`; P2002 trên `code` → retry.
- [ ] **Script thử đồng thời** `BE/scripts/race-booking.ts` (chạy `npx tsx scripts/race-booking.ts --n 20`): đăng nhập 20 khách seed (`customer001…020@sango.vn`), chọn 1 court + 1 khung trống ngày mai, bắn 20 `POST /api/bookings` bằng `Promise.all` → in bảng kết quả `201: 1, 409: 19` và kiểm tra DB chỉ có 1 booking cho khung đó. Ghi cách chạy + ảnh kết quả vào báo cáo.
- [ ] (Khuyến khích) e2e test Jest + supertest chạy với DB test thật cho kịch bản song song.

### K5 – Trang Checkout & `bookingDraftSlice`

- [ ] `features/booking/model/bookingDraftSlice.ts` (**Redux Toolkit – createSlice**): `{ venue: { id; slug; name } | null; court: CourtSummaryDto | null; slots: { startAt; endAt; price; label }[]; holdId: string | null; holdExpiresAt: string | null }`; actions `draftStarted`, `holdAttached`, `draftCleared`; selectors `selectDraftTotal` (createSelector), `selectDraftRange` (start đầu – end cuối). Lưu `sessionStorage` để F5 không mất (listener middleware hoặc hydrate trong `makeStore`).
- [ ] `features/booking/pages/CheckoutPage.tsx` (`/booking/checkout`, CUSTOMER): không có draft → về trang trước; hiển thị cụm sân, sân, ngày, giờ, **bảng breakdown giá** (gọi `POST /pricing/quote` của Lâm để lấy giá chính xác), form RHF (`contactPhone` mặc định số của user, `note`) validate bằng phần tương ứng của `createBookingSchema`; submit `POST /bookings` → thành công: `draftCleared`, `message.success("Đã đặt sân")`, điều hướng `/me/bookings/:id` (trang của Dương); lỗi 409 → thông báo rõ + nút "Chọn lại khung" (invalidate tag `Availability`).
- [ ] Sau khi có K7: hiện **đồng hồ đếm ngược** `mm:ss` tới `holdExpiresAt`; hết giờ → khóa nút, thông báo, nút quay lại.

### K6 – Tìm sân & Trang chủ

**shared `schemas/search.schema.ts`:** `searchVenuesQuerySchema = paginationQuerySchema.extend({ q?, sport? (enum), city?, district?, date? (dateStr), from? (HH:mm), to? (HH:mm), sort: enum('rating','newest','name').default('rating') })` + refine: có `from/to` thì phải có `date`, `from < to`, phút chia hết 60. `types/search.ts`: `VenueCardDto { id; slug; name; address; district; city; imageUrl: string | null; sports: Sport[]; minPricePerHour: number | null; avgRating; reviewCount; latitude; longitude }`.

**BE `modules/search`:**
- [ ] `GET /venues` `@Public()`: `where` = venue `ACTIVE` + `q` (name/address contains insensitive) + `city`/`district` + `courts: { some: { isActive: true, sport?, ...availabilityFilter } }`. Khi có `date/from/to`: `availabilityFilter` = không có `slotLocks` trong `[fromUtc, toUtc)` (lock booking hoặc hold còn hạn) **và** không có `maintenanceBlocks` chồng khoảng; đồng thời venue có `openingHours: { some: { dayOfWeek, isClosed: false, openMinute ≤ fromMin, closeMinute ≥ toMin } }`. Đếm `total` bằng cùng `where` → `paginate`. `minPricePerHour` = min(basePricePerHour, min rule price) của các court khớp (tính trong mapper từ `include`).
- [ ] Test service: dựng `where` đúng khi có/không có bộ lọc ngày giờ (tách hàm thuần `buildSearchWhere(query, now)` để test).

**FE `features/search`:**
- [ ] `hooks/useUrlFilters.ts` (**custom hook generic**): `useUrlFilters<T extends Record<string, string | undefined>>(defaults: T): [T, (patch: Partial<T>) => void, () => void]` – đọc/ghi `URLSearchParams` (React Router `useSearchParams`), đổi bộ lọc thì reset `page=1`.
- [ ] `pages/SearchPage.tsx` (`/venues`): bộ lọc (môn – chip, thành phố/quận – Select lấy từ `GET /meta/locations` của Lâm, ngày – input date, giờ từ/đến – Select theo giờ chẵn, sắp xếp), ô từ khóa **debounce 400ms** (`useDebounce`), **đồng bộ URL** để chia sẻ link, danh sách `VenueCard` dạng lưới responsive, `Pagination`, skeleton khi tải, EmptyState. Tab **"Bản đồ"** hiển thị `VenuesMap` của Lâm (truyền danh sách venue trang hiện tại) – Lâm cung cấp component.
- [ ] `components/VenueCard.tsx` (export cho nơi khác): ảnh (`loading="lazy"`, có width/height), tên, quận/thành phố, chip môn, ★ rating, "Từ 150.000 ₫/giờ"; link `/venues/:slug` (giữ `date` trong query để trang chi tiết mở đúng tuần).
- [ ] `pages/HomePage.tsx` (thay placeholder): hero + form tìm nhanh (môn, thành phố, ngày) → `/venues?...`; khối "Sân nổi bật" (`GET /venues?sort=rating&pageSize=6`); lối tắt theo môn.

### K7 – Giữ chỗ tạm 5 phút (NÂNG CAO)

**shared:** `createHoldSchema { courtId, startAt, endAt }` (cùng refine như booking), `HoldDto { id; courtId; startAt; endAt; expiresAt }`.

**BE `modules/holds`:**
- [ ] `POST /holds` `@Roles('CUSTOMER')`: transaction: xóa hold cũ của user (lock cascade) → kiểm tra giờ mở cửa/bảo trì/khung đã qua (dùng lại hàm kiểm tra của BookingsService – tách thành method public `assertSlotsBookable(txOrPrisma, court, startAt, endAt, now)` ngay từ K4, Dương cũng dùng) → purge lock hold hết hạn → tạo `BookingHold` + `SlotLock` (`holdId`, `expiresAt = now + HOLD_TTL_MINUTES`) → P2002 → 409 `SLOT_ALREADY_BOOKED`.
- [ ] `DELETE /holds/:id` (chỉ chủ hold, không phải → 403).
- [ ] Cron `@Cron(CronExpression.EVERY_MINUTE)` xóa `BookingHold` hết hạn.
- [ ] Tạo đơn với `holdId` (đã mô tả ở K4): chuyển lock `holdId → bookingId`, `expiresAt = null`, xóa hold.
- [ ] Test: hold trùng → 409; hold hết hạn bị coi là trống (người khác giữ được); đặt đơn bằng hold hợp lệ chuyển lock đúng.

**FE:**
- [ ] `CourtWeekSchedule` → bấm "Đặt sân" gọi `createHold` → `holdAttached` → checkout. Rời trang checkout/hủy → `DELETE /holds/:id`.
- [ ] Lưới hiển thị `HELD` (khóa) và `HELD_BY_ME` (viền nổi bật); polling nhẹ `pollingInterval: 30000` khi trang chi tiết đang mở để thấy người khác giữ chỗ.
- [ ] Test `CheckoutPage.test.tsx`: đếm ngược tới 0 thì nút "Xác nhận đặt" bị disable (fake timers).

---

## 4. Test bắt buộc (tổng hợp)

| Loại | Test |
|---|---|
| BE | `slot-generator.spec.ts`, `slot-status.spec.ts`, `booking-code.spec.ts`, `bookings.service.spec.ts`, `holds.service.spec.ts`, `search` (`buildSearchWhere`) |
| FE (≥ 5) | `useSlotSelection.test.ts` (nối dải, bỏ đầu/cuối, ô không liền kề reset, vượt max báo lỗi); `AvailabilityGrid.test.tsx` (**tương tác**: click 2 ô liền kề → tổng tiền đúng, click ô BOOKED không chọn được); `CourtWeekSchedule.test.tsx` (**async + MSW**: bấm "Tuần sau" gọi API với `weekStart` mới và hiển thị dữ liệu mới); `bookingDraftSlice.test.ts` (reducer + `selectDraftTotal`); `CheckoutPage.test.tsx` (409 hiển thị thông báo + đếm ngược) |
| Script | `race-booking.ts` – kết quả đưa vào báo cáo |

## 5. Hợp đồng Hiếu cung cấp (giữ đúng chữ ký)

| Thứ | Người dùng |
|---|---|
| `generateDaySlots(openingHours, dateStr)` | Dương (lịch cố định), Lâm (kiểm tra bảo trì trong giờ mở cửa – tùy chọn) |
| `SlotLockService.releaseBooking(tx, bookingId)`, `findLocked(courtId, startAts, tx?)` | Dương |
| `BookingsService.createBookingInTx(tx, customerId, input, opts)` | Dương (lịch cố định) |
| `BookingsService.assertSlotsBookable(txOrPrisma, court, startAt, endAt, now)` (ném 409 `SLOT_UNAVAILABLE`) | Dương (preview lịch cố định) |
| `toBookingDto`, `bookingDtoInclude` | Dương |
| FE `CourtWeekSchedule`, `AvailabilityGrid`, `VenueCard` | Lâm (trang chi tiết), Dương (nếu cần) |

## 6. Phần báo cáo Hiếu viết (`docs/bao-cao/hieu.md`)

- **Chống đặt trùng:** mô hình `SlotLock` + `UNIQUE(courtId, startAt)` + transaction; vì sao chọn ràng buộc CSDL thay vì chỉ kiểm tra ở code (race condition giữa SELECT và INSERT); luồng hold → booking; **cách thử** bằng `race-booking.ts` + ảnh kết quả 1×201 / 19×409.
- **Pattern React:** vì sao chọn **Compound Component** (chia sẻ state lưới qua Context, người dùng tự sắp xếp Toolbar/Table) + **Render Props** (`renderCell` để khách/chủ sân vẽ ô khác nhau mà không nhân bản logic lưới).
- **Hiệu năng:** đổi tuần không re-render toàn trang (state tuần nằm trong lưới, `memo` ô, `useCallback`), ảnh Profiler trước/sau; prefetch tuần sau.
- State: `bookingDraftSlice` vì sao để Redux (dùng chung giữa trang chi tiết và checkout, sống qua điều hướng).

## 7. Checklist Definition of Done

- [ ] K0 → K7 xong, mỗi chức năng đủ DB + BE + API + shared + FE + test.
- [ ] Script race chạy đúng 1×201, (N-1)×409.
- [ ] Lưới hoạt động tốt trên mobile (375px) và desktop.
- [ ] Ảnh Profiler trước/sau đã lưu.
- [ ] Báo cáo phần mình xong.

## 8. Gợi ý nhánh & commit

`feat/hieu-slot-generator` → `feat/hieu-availability-api` → `feat/hieu-availability-grid` → `feat/hieu-booking-create` → `feat/hieu-checkout` → `feat/hieu-search` → `feat/hieu-owner-schedule` → `feat/hieu-booking-hold`.
Ví dụ commit: `feat(availability): add pure slot generator with overnight support`, `feat(booking): prevent double booking via SlotLock unique constraint`, `test(booking): add concurrent booking race script`.
