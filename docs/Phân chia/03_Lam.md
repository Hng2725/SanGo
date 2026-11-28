# PHÂN CÔNG: LÂM – Cụm sân & sân con + Giờ mở cửa + Bảng giá + Bảo trì + Trang chi tiết sân + Bản đồ

> **Đọc trước:** `docs/Đề bài/TONG_QUAN_DE_TAI.md` (đặc biệt mục 6.2, 6.3, 6.4, 7, 8). File này mô tả chính xác việc Lâm phải làm.
> Phần của Lâm là **dữ liệu gốc của hệ thống** (Hiếu và Dương phụ thuộc) → **merge sớm** L1 và L2 (PricingService).

## 0. Prompt mẫu cho AI agent

```
Bạn là AI coding agent hỗ trợ Lâm trong dự án SanGo.
Đọc docs/Đề bài/TONG_QUAN_DE_TAI.md và docs/Phân chia/03_Lam.md.
Làm task <L0 / L1 / ...> đúng mô tả. Chỉ sửa trong phạm vi sở hữu của Lâm (mục 1).
Viết test kèm theo; `npm test` và `npm run build` phải pass. Tick checklist khi xong.
```

## 1. Phạm vi sở hữu

| Tầng | Sở hữu |
|---|---|
| shared | `types/venue.ts`, `types/pricing.ts`, `types/maintenance.ts`, `schemas/venue.schema.ts` (venue, court, opening hours), `schemas/pricing.schema.ts`, `schemas/maintenance.schema.ts` |
| DB | model **`Venue`**, **`OpeningHour`**, **`Court`**, **`PriceRule`**, **`MaintenanceBlock`**; `prisma/seed/venues.seed.ts` |
| BE | `modules/venues` (owner + public + meta locations + opening hours), `modules/courts`, `modules/pricing`, `modules/maintenance` |
| FE | `features/owner-venues`, `features/pricing`, `features/maintenance`, `features/venue-detail`, `features/map` |
| Docs | `docs/bao-cao/lam.md` |

## 2. Phụ thuộc

- Cần GĐ0 của Hưng. Có thể bắt đầu **L0 (hàm thuần + schema)** ngay sau GĐ0a.
- Trang chi tiết (L5) nhúng `CourtWeekSchedule` (Hiếu) và `VenueReviews` (Dương): chưa có thì để khối placeholder `// TODO(Lâm): nhúng component khi merge`.
- **Hiếu cần sớm:** `types/venue.ts` (`CourtSummaryDto`), `PricingService`, `calculatePrice`, `VenuesService.getOpeningHours`, `MaintenanceService.findOverlapping` → tạo type + khung service sớm (GĐ0b/đầu GĐ1) và merge.

---

## 3. CÁC TASK

### L0 – Hàm tính giá thuần + schema bảng giá (GĐ0b, không phụ thuộc ai)

**shared `types/pricing.ts`:** `PriceRuleDto`, `PriceBreakdownItem`, `PriceQuote` (đúng mục 8.4 tổng quan), `CourtPricingDto { courtId; basePricePerHour; rules: PriceRuleDto[] }`.

**shared `schemas/pricing.schema.ts`:**

```ts
export const priceRuleInputSchema = z.object({
  dayType: z.enum(DAY_TYPES),
  startMinute: z.number().int().min(0).max(1380).multipleOf(60),
  endMinute: z.number().int().min(60).max(1440).multipleOf(60),
  pricePerHour: z.number().int().min(10_000).max(10_000_000).multipleOf(1_000),
  label: z.string().trim().max(50).optional().nullable(),
}).refine((r) => r.startMinute < r.endMinute, { path: ['endMinute'], message: 'Giờ kết thúc phải sau giờ bắt đầu' });

export const pricingConfigSchema = z.object({
  basePricePerHour: z.number().int().min(10_000).max(10_000_000).multipleOf(1_000),
  rules: z.array(priceRuleInputSchema).max(20),
}).superRefine((cfg, ctx) => {
  // Với mỗi dayType: sắp theo startMinute, nếu rule[i].startMinute < rule[i-1].endMinute
  // → ctx.addIssue({ path: ['rules', idx, 'startMinute'], message: 'Khung giờ bị chồng với khung khác' })
});
export type PriceRuleInput = z.infer<typeof priceRuleInputSchema>;
export type PricingConfigInput = z.infer<typeof pricingConfigSchema>;
export const copyPricingSchema = z.object({ targetCourtIds: z.array(idSchema).min(1).max(50) });
```

→ **Cùng một schema** dùng cho form FE (`zodResolver`) và API BE (`@ZodBody`) – đây là minh chứng "validate ở cả client và server, dùng chung schema/kiểu".

**BE `modules/pricing/pricing.calculator.ts` (hàm THUẦN – không import Prisma/Nest):**

```ts
export interface PricingInput {
  basePricePerHour: number;
  rules: ReadonlyArray<Pick<PriceRuleDto, 'dayType' | 'startMinute' | 'endMinute' | 'pricePerHour' | 'label'>>;
}
export class InvalidPriceRangeError extends Error {}
/** Giá của 1 khung 60' bắt đầu tại slotStart (dayType & phút theo giờ VN của chính khung đó). */
export function priceForSlot(pricing: PricingInput, slotStart: Date): { price: number; label: string | null };
/** Tổng giá đơn [startAt, endAt). Ném InvalidPriceRangeError nếu end <= start hoặc không chia hết 60'. */
export function calculatePrice(pricing: PricingInput, startAt: Date, endAt: Date): PriceQuote;
```

Quy tắc đúng mục 6.3 tổng quan (dùng `toVnParts`, `isWeekendDay`, `enumerateSlotStarts` của shared).

- [x] Test `pricing.calculator.spec.ts` **(≥ 10 case, đủ trường hợp biên)**:
  1. Ngày thường, không có rule → giá base.
  2. Ngày thường, khung nằm trong giờ vàng 17:00–21:00 → giá giờ vàng + label.
  3. Đơn 16:00–18:00 **cắt qua mốc bắt đầu giờ vàng** → 1 khung base + 1 khung vàng.
  4. Khung bắt đầu **đúng bằng `endMinute`** của rule (21:00) → không áp rule (khoảng nửa mở).
  5. Thứ 7 → áp rule WEEKEND, không áp rule WEEKDAY cùng giờ.
  6. **Qua nửa đêm T6 → T7** (23:00–01:00) → khung 23h giá WEEKDAY, khung 0h giá WEEKEND.
  7. **Qua nửa đêm CN → T2** → khung 23h WEEKEND, khung 0h WEEKDAY.
  8. Rule `endMinute = 1440` áp cho khung 23:00.
  9. Thời điểm UTC 17:00 = 00:00 giờ VN hôm sau → xác định đúng ngày (không lệch múi giờ).
  10. `endAt <= startAt` → ném lỗi; startAt lệch phút (10:30) → ném lỗi.
  11. Đơn 6 khung → `total` = tổng breakdown.
- [x] Test schema `pricing.schema.test.ts` (shared, Vitest): rule chồng nhau báo lỗi đúng path; 2 dayType khác nhau cùng giờ thì hợp lệ; giá không chia hết 1.000 bị từ chối.

### L1 – Quản lý cụm sân, giờ mở cửa, sân con (merge sớm)

**shared `types/venue.ts`:**
- `CourtSummaryDto { id; name; sport: Sport }` ← **Hiếu dùng, tạo đầu tiên**.
- `CourtDto extends CourtSummaryDto { venueId; basePricePerHour; isActive; createdAt }`.
- `OpeningHourDto { dayOfWeek; isClosed; openMinute; closeMinute }`.
- `VenueDto { id; slug; name; description; address; district; city; latitude; longitude; phone; imageUrls; cancelBeforeHours; status; avgRating; reviewCount; createdAt }`.
- `OwnerVenueDetailDto = VenueDto & { courts: CourtDto[]; openingHours: OpeningHourDto[] }`.
- `VenueDetailDto` (công khai) `= Omit<VenueDto, 'status'> & { owner: { fullName: string }; courts: (CourtSummaryDto & { basePricePerHour: number; priceRules: PriceRuleDto[] })[]; openingHours: OpeningHourDto[] }`.
- `LocationDto { city: string; districts: string[] }`.

**shared `schemas/venue.schema.ts`:**
- `createVenueSchema`: `name` 3..100, `description` ≤ 2000, `address` 5..200, `district`, `city` (bắt buộc), `phone?` (`phoneVnSchema`), `imageUrls` (mảng URL https, tối đa 8), `latitude?`/`longitude?` (−90..90 / −180..180, **phải có cả hai hoặc không có** – refine), `cancelBeforeHours` int 0..72 mặc định 2.
- `updateVenueSchema = createVenueSchema.partial()` (→ `UpdateVenueInput = Partial<CreateVenueInput>` – minh chứng utility type).
- `openingHourSchema` + `openingHoursSchema = z.array(openingHourSchema).length(7)` với `superRefine`: đủ dayOfWeek 0..6 không trùng; ngày mở cửa: `openMinute` 0..1380, `closeMinute` ≤ 1800, đều bội 60, `close - open ≥ 60`; **qua nửa đêm**: `closeMinute − 1440 ≤ openMinute` của ngày kế tiếp (ngày kế tiếp không nghỉ) – báo lỗi ở path `[idx, 'closeMinute']`.
- `createCourtSchema { name 1..50; sport; basePricePerHour (như pricing) }`, `updateCourtSchema = createCourtSchema.partial().extend({ isActive: z.boolean().optional() })`.

**BE `modules/venues`:**
- [x] `venues.service.ts`:
  - `assertVenueOwner(venueId, ownerId)` → không tồn tại 404, khác chủ 403 (**kiểm tra quyền ở tầng dữ liệu**) – export cho Dương dùng.
  - `listMine(ownerId)`, `getMine(id, ownerId)`, `create(ownerId, input)` (sinh `slug` từ tên bỏ dấu tiếng Việt + hậu tố ngắn nếu trùng; tạo 7 OpeningHour mặc định 06:00–22:00 trong cùng transaction), `update`, `hide` (status HIDDEN).
  - `replaceOpeningHours(venueId, ownerId, input)` – transaction xóa/ghi lại 7 dòng (hoặc upsert).
  - `getOpeningHours(venueId): Promise<OpeningHourDto[]>` – Hiếu dùng.
  - `getPublicBySlug(slug)` – chỉ `ACTIVE`, court `isActive`, kèm priceRules → `VenueDetailDto`; không có → 404.
  - `getLocations()` – distinct city/district của venue ACTIVE → `LocationDto[]`.
- [x] `venues.mapper.ts`.
- [x] Controllers: `OwnerVenuesController` (`@Roles('OWNER')`, prefix `owner/venues`), `VenuesPublicController` (`@Public()`, `GET venues/:slug`), `MetaController` (`@Public()`, `GET meta/locations`). Endpoint đúng bảng 8.3 tổng quan.

**BE `modules/courts`:**
- [x] `courts.service.ts`: `create(venueId, ownerId, input)` (tên trùng trong venue → 409 `CONFLICT`), `update(courtId, ownerId, input)`, `remove(courtId, ownerId)` (có booking → chỉ `isActive=false`, trả 204), `getCourtForOwner(courtId, ownerId)` (404/403 – export cho Hiếu/Dương), `getActiveCourt(courtId)` (kèm venue).
- [x] Controller `owner/venues/:id/courts` (POST) và `owner/courts/:courtId` (PATCH, DELETE).

**DB seed `prisma/seed/venues.seed.ts`** – `seedVenues(prisma, { ownerIds })`:
- [x] ≥ 8 cụm sân thật tế (TP.HCM: Quận 1, Quận 7, Bình Thạnh, Tân Bình, TP Thủ Đức; Hà Nội: Cầu Giấy, Đống Đa, Hai Bà Trưng), có tọa độ thực, ảnh `https://picsum.photos/seed/<slug>/800/500`, mỗi cụm 3–4 sân con nhiều môn (≥ 24 sân), giờ mở cửa khác nhau (**ít nhất 1 cụm mở 18:00–02:00 cuối tuần để demo qua nửa đêm**, 1 cụm nghỉ thứ 2), bảng giá: giờ vàng 17:00–21:00 ngày thường, cuối tuần cả ngày cao hơn, có label. Phần lớn thuộc `owner@sango.vn`, 2 cụm thuộc `owner2@sango.vn`.
- [x] Gọi trong `seed.ts` sau `seedUsers`.

**FE `features/owner-venues`:**
- [x] `api/ownerVenueApi.ts`: list/get/create/update/hide venue, replace opening hours, create/update/delete court (tags `OwnerVenue`, `Court`; invalidate cả `Availability`).
- [x] `pages/OwnerVenuesPage.tsx` (`/owner/venues`): thẻ cụm sân (ảnh, tên, số sân, trạng thái), nút "Thêm cụm sân", EmptyState hướng dẫn khi chưa có.
- [x] `pages/VenueEditorPage.tsx` (`/owner/venues/new` và `/owner/venues/:id`): **Tabs**: Thông tin | Sân con | Giờ mở cửa | Vị trí (tab Vị trí dùng `LocationPicker` – L6).
  - `VenueInfoForm`: RHF + `zodResolver(createVenueSchema)`; `imageUrls` dùng `useFieldArray` + ảnh xem trước; `cancelBeforeHours` có giải thích chính sách hủy.
  - `CourtsManager`: bảng/thẻ sân con, thêm/sửa inline (modal), bật/tắt hoạt động, nút tới "Bảng giá" và "Bảo trì" của từng sân.
  - `OpeningHoursForm`: 7 dòng (Thứ 2 → CN), switch "Nghỉ", Select giờ mở (00:00–23:00), Select giờ đóng (01:00 → 06:00 (+1)) hiển thị bằng `formatMinute`, nút "Áp dụng cho cả tuần"; lỗi qua nửa đêm hiển thị đúng dòng.
- [x] Thêm mục "Cụm sân" vào menu OwnerLayout.

### L2 – Cấu hình bảng giá (form phức tạp)

**BE `modules/pricing`:**
- [x] `pricing.service.ts`:
  - `getCourtPricing(courtIds: string[], tx?): Promise<Map<string, PricingInput>>` – Hiếu dùng cho lưới.
  - `quote(courtId, startAt, endAt, tx?): Promise<PriceQuote>` – Hiếu dùng khi tạo đơn (gọi `calculatePrice`, đổi `InvalidPriceRangeError` → 400 `VALIDATION_ERROR`).
  - `getForOwner(courtId, ownerId)`, `replaceForOwner(courtId, ownerId, input: PricingConfigInput)` (transaction: cập nhật `basePricePerHour`, `deleteMany` rule cũ, `createMany` rule mới), `copyToCourts(sourceCourtId, ownerId, targetCourtIds)` (mọi target phải thuộc cùng chủ – không thì 403).
- [x] Controllers: `OwnerPricingController` (`owner/courts/:courtId/pricing` GET/PUT, `.../copy` POST) và `PricingPublicController` (`POST pricing/quote` `@Public()`, body `{ courtId, startAt, endAt }`).
- [x] Test `pricing.service.spec.ts`: replace khi không sở hữu → 403; copy sang court của chủ khác → 403.

**FE `features/pricing`:**
- [x] `api/pricingApi.ts`: `getPricing`, `updatePricing`, `copyPricing`, `quotePrice` (mutation hoặc query).
- [x] `pages/CourtPricingPage.tsx` (`/owner/courts/:courtId/pricing`, title "Bảng giá – <tên sân>"):
  - `PricingForm` – RHF + `zodResolver(pricingConfigSchema)`: ô giá mặc định; **2 khu `useFieldArray`** (Ngày thường / Cuối tuần) mỗi dòng: giờ bắt đầu, giờ kết thúc (Select theo giờ), giá/giờ (input định dạng nghìn), nhãn; nút thêm/xóa dòng; nút preset "Thêm giờ vàng 17:00–21:00"; lỗi chồng khung hiển thị ngay dòng bị lỗi (từ `superRefine`).
  - **Xem trước bảng giá** 24 giờ × 2 loại ngày cập nhật realtime theo form (`useWatch` + `useMemo`) bằng util thuần `buildPriceTable(config): { minute: number; weekday: number; weekend: number; weekdayLabel; weekendLabel }[]` (dùng chung logic khớp rule với `priceForSlot` – có thể chuyển phần "tìm rule khớp" sang shared `utils/pricing-match.ts` để FE/BE dùng chung).
  - Lỗi server 400 (`details[].path`) map vào field bằng util `applyServerErrors(setError, error)` (đặt trong `features/pricing/utils`).
  - Modal "Sao chép bảng giá sang sân khác" (checkbox các sân cùng cụm).
- [x] Test FE: `PricingForm.test.tsx` (**tương tác**: thêm 2 rule chồng nhau → hiện lỗi, sửa lại → hết lỗi; bấm xóa dòng); `buildPriceTable.test.ts`.

### L3 – Khóa lịch bảo trì

**shared:** `createMaintenanceSchema { startAt, endAt, reason? ≤ 200 }` + refine (bội 60', end > start, tối đa 30 ngày); `MaintenanceDto { id; courtId; startAt; endAt; reason; createdAt }`.

**BE `modules/maintenance`:**
- [x] `maintenance.service.ts`:
  - `findOverlapping(courtIds, from, to, tx?)` – Hiếu dùng (điều kiện chồng: `startAt < to AND endAt > from`).
  - `listUpcoming(courtId, ownerId)`, `create(courtId, ownerId, input)`: `startAt > now`; chồng bảo trì khác → 409 `CONFLICT`; **chồng đơn đang hiệu lực** (`SlotLock` có `bookingId` trong khoảng) → 409 `MAINTENANCE_CONFLICT` với `details.bookingCodes`; `remove(id, ownerId)`.
- [x] Controller `owner/courts/:courtId/maintenance` (GET/POST), `owner/maintenance/:id` (DELETE).
- [x] Test: chồng đơn → 409 kèm mã đơn; không sở hữu → 403.

**FE `features/maintenance`:**
- [x] `pages/CourtMaintenancePage.tsx` (`/owner/courts/:courtId/maintenance`): form (ngày, giờ bắt đầu, giờ kết thúc – cho phép sang ngày hôm sau, lý do), danh sách bảo trì sắp tới, xóa (ConfirmDialog); lỗi 409 hiển thị danh sách mã đơn bị trùng.

### L4 – (đã gộp vào L1) Meta locations

- [x] `GET /meta/locations` dùng cho bộ lọc của Hiếu; FE hook `useLocationsQuery` export từ `features/owner-venues/index.ts` (hoặc `features/venue-detail`).

### L5 – Trang chi tiết cụm sân (công khai)

**FE `features/venue-detail`:**
- [x] `api/venueDetailApi.ts`: `getVenueBySlug(slug)` (tag `Venue`).
- [x] `pages/VenueDetailPage.tsx` (`/venues/:slug`): `useDocumentTitle(\`${venue.name} – Đặt sân\`)` (**title động**); không tồn tại → hiển thị NotFound (404).
  - Gallery ảnh (ảnh đầu lớn, còn lại thumbnail, `loading="lazy"`), tên, ★ rating (`avgRating`, `reviewCount`), địa chỉ, điện thoại, chip môn, mô tả.
  - Bảng **giờ mở cửa** (hiển thị "18:00 – 02:00 (+1)"), **chính sách hủy** ("Hủy miễn phí trước giờ chơi X giờ").
  - **Bảng giá tóm tắt** theo từng sân (giá mặc định + các khung giá đặc biệt).
  - **Bản đồ** `VenueMap` (L6) + nút "Chỉ đường" (link Google Maps `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`).
  - Khối **"Lịch trống & đặt sân"**: `<CourtWeekSchedule venue={...} courts={...} />` của Hiếu.
  - Khối **"Đánh giá"**: `<VenueReviews venueId={...} />` của Dương.
  - Bố cục 1 cột trên mobile, 2 cột trên desktop (thông tin bên phải dính `sticky`).
- [x] Test: `VenueDetailPage.test.tsx` (**async + MSW**: hiển thị tên, giờ mở cửa qua nửa đêm đúng định dạng, slug sai → 404 state).

### L6 – Bản đồ vị trí sân (NÂNG CAO – miễn phí: Leaflet + OpenStreetMap)

- [x] Cài `leaflet react-leaflet` + `@types/leaflet`. Import `leaflet/dist/leaflet.css`; sửa icon marker mặc định cho Vite (import `marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png` và `L.Icon.Default.mergeOptions`). Tile `VITE_MAP_TILE_URL`, ghi attribution "© OpenStreetMap contributors".
- [x] `features/map/components/`:
  - `LocationPicker` – props `{ value?: { lat; lng }; onChange(v) }`: click bản đồ đặt marker, kéo marker, nút "Dùng vị trí hiện tại" (`navigator.geolocation`), mặc định tâm TP.HCM. Dùng trong tab "Vị trí" của VenueEditor (lưu `latitude/longitude`).
  - `VenueMap` – 1 marker + popup tên/địa chỉ.
  - `VenuesMap` – nhiều marker (props `venues: Pick<VenueCardDto, 'slug'|'name'|'latitude'|'longitude'|'minPricePerHour'>[]`), popup có link `/venues/:slug`, tự `fitBounds`. Hiếu dùng ở tab "Bản đồ" trang tìm kiếm.
- [x] Các component bản đồ export qua `React.lazy` (`features/map/index.ts` export bản lazy + `Suspense` fallback Skeleton) → **code-splitting** (leaflet nặng, chỉ tải khi cần) – ghi vào báo cáo.
- [x] Test: `LocationPicker.test.tsx` (mock `react-leaflet` ở mức module, kiểm tra nút "Dùng vị trí hiện tại" gọi `onChange` với tọa độ từ `navigator.geolocation` mock).

---

## 4. Test bắt buộc (tổng hợp)

| Loại | Test |
|---|---|
| BE | `pricing.calculator.spec.ts` (≥ 10 case), `pricing.service.spec.ts`, `venues.service.spec.ts` (403 khi không sở hữu, slug trùng sinh hậu tố), `maintenance.service.spec.ts` (409) |
| shared | `pricing.schema.test.ts`, `venue.schema.test.ts` (giờ mở cửa qua nửa đêm hợp lệ/không hợp lệ, lat/lng phải đi cặp) |
| FE (≥ 4) | `PricingForm.test.tsx` (tương tác), `buildPriceTable.test.ts`, `VenueInfoForm.test.tsx` (submit → MSW nhận đúng payload), `OpeningHoursForm.test.tsx` (chọn đóng 02:00 (+1) hợp lệ; chồng ca ngày sau báo lỗi), `VenueDetailPage.test.tsx` (async) |

## 5. Hợp đồng Lâm cung cấp (giữ đúng chữ ký)

| Thứ | Người dùng |
|---|---|
| `CourtSummaryDto`, `VenueDetailDto`, `PriceQuote`, `PriceBreakdownItem` (shared) | Hiếu, Dương |
| `calculatePrice`, `priceForSlot`, `PricingInput` | Hiếu |
| `PricingService.getCourtPricing(courtIds, tx?)`, `PricingService.quote(courtId, startAt, endAt, tx?)` | Hiếu |
| `VenuesService.getOpeningHours(venueId)`, `VenuesService.assertVenueOwner(venueId, ownerId)` | Hiếu, Dương |
| `CourtsService.getCourtForOwner(courtId, ownerId)`, `CourtsService.getActiveCourt(courtId)` | Hiếu, Dương |
| `MaintenanceService.findOverlapping(courtIds, from, to, tx?)` | Hiếu |
| FE `LocationPicker`, `VenueMap`, `VenuesMap`, `useLocationsQuery`, `useOwnerVenuesQuery` | Hiếu |

## 6. Phần báo cáo Lâm viết (`docs/bao-cao/lam.md`)

- Mô hình giờ mở cửa & "ngày hoạt động" qua nửa đêm; mô hình bảng giá và **hàm tính giá thuần** + bảng các case test biên.
- **Schema dùng chung** client/server cho form bảng giá (trích đoạn ngắn `superRefine`, đường dẫn file).
- Code-splitting bản đồ (React.lazy).
- **Ảnh chụp giao diện** các màn hình chính của cả nhóm (desktop + mobile).
- **Tổng hợp kết quả test & coverage** của cả 3 workspace (chạy `npm run test:cov`, chụp bảng).
- **Kết luận:** kết quả, hạn chế, hướng phát triển.

## 7. Checklist Definition of Done

- [x] 28/11/2026: hoàn thiện copy bảng giá/cache công khai/validation, bảo trì chống tranh chấp với hold, bảo toàn sân có tham chiếu, thông tin/tọa độ; sửa tràn mobile sân con và bảng giá. Kết quả: `docs/bao-cao/KIEM_THU_TICH_HOP_2026-11-28.md`.

- [x] 28/11/2026: trang cụm sân không tồn tại/lỗi tải dữ liệu vẫn có điều hướng bên trái; mobile dùng drawer và nút về tìm sân chuyển trang bằng router. Đã kiểm tra Chrome và test hồi quy; 282 test và build toàn dự án đạt.

- [x] L0 → L6 xong, mỗi chức năng đủ DB + BE + API + shared + FE + test.
- [x] Seed venues chạy được, có cụm qua nửa đêm.
- [x] Mọi API owner kiểm tra sở hữu ở service (403) – không chỉ Guard.
- [x] Form dùng tốt trên mobile.
- [x] Báo cáo phần mình xong.

## 8. Gợi ý nhánh & commit

`feat/lam-pricing-calculator` → `feat/lam-venues-courts` → `feat/lam-opening-hours` → `feat/lam-pricing-form` → `feat/lam-maintenance` → `feat/lam-venue-detail` → `feat/lam-map`.
Ví dụ commit: `feat(pricing): add pure price calculator with overnight and weekend rules`, `feat(venues): owner CRUD with ownership check`, `feat(map): add Leaflet location picker`.
