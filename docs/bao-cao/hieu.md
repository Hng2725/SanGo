# Báo Cáo Cá Nhân: Hiếu – Lịch Trống (`AvailabilityGrid`), Đặt Sân Chống Trùng & Giữ Chỗ Tạm Thời

## 1. Giải pháp chống đặt trùng (Double-Booking Prevention)

### 1.1. Mô hình dữ liệu `SlotLock` và ràng buộc CSDL
Trong hệ thống đặt sân thể thao trực tuyến, bài toán cốt lõi là ngăn chặn hai khách hàng đặt trùng cùng một khung giờ trên cùng một sân con, ngay cả khi họ gửi yêu cầu vào cùng một mili-giây. Thay vì lưu khóa trực tiếp trên bảng `Booking` (vốn có khoảng thời gian `[startAt, endAt)` độ dài thay đổi từ 1 đến nhiều giờ), hệ thống tách riêng bảng **`SlotLock`** trong `BE/prisma/schema.prisma`, trong đó mỗi bản ghi đại diện cho đúng **một khung giờ chuẩn 60 phút**:

```prisma
model SlotLock {
  id        String       @id @default(cuid())
  courtId   String
  startAt   DateTime     @db.Timestamptz(3)
  bookingId String?
  holdId    String?
  expiresAt DateTime?    @db.Timestamptz(3)
  createdAt DateTime     @default(now())

  @@unique([courtId, startAt]) // <<< RÀNG BUỘC CHỐNG ĐẶT TRÙNG
  @@index([bookingId])
  @@index([holdId])
  @@index([expiresAt])
}
```

Khi một đơn đặt sân hoặc phiên giữ chỗ kéo dài nhiều khung giờ (ví dụ 18:00–20:00), hàm `enumerateSlotStarts(startAt, endAt)` sẽ tách khoảng thời gian này thành danh sách các mốc 60 phút rời rạc (`18:00`, `19:00`). Ràng buộc **`@@unique([courtId, startAt])`** ở tầng PostgreSQL đảm bảo tại mọi thời điểm chỉ có tối đa một bản ghi `SlotLock` tồn tại cho cặp `(courtId, startAt)`. Ngoài ra, migration bổ sung `CHECK` constraint đảm bảo một `SlotLock` chỉ thuộc về `bookingId` (đơn chính thức, `expiresAt = null`) hoặc `holdId` (giữ chỗ tạm thời, có `expiresAt`), không bao giờ đồng thời mang cả hai hoặc rỗng cả hai.

### 1.2. Tại sao chọn ràng buộc CSDL kết hợp Transaction thay vì kiểm tra ở tầng Code?
Nếu chỉ kiểm tra bằng code ở tầng ứng dụng theo mô hình **Check-Then-Act** (`SELECT` kiểm tra xem khung giờ đã có ai đặt chưa, nếu chưa thì `INSERT`), hệ thống sẽ dính lỗi **Race Condition (TOCTOU – Time-of-Check to Time-of-Use)** khi có nhiều request đồng thời:

1. Request A và Request B cùng gửi `POST /api/bookings` cho sân `court-1` khung `18:00–19:00` vào cùng thời điểm.
2. Cả A và B cùng thực hiện lệnh `SELECT` kiểm tra bảng khóa và đều nhận kết quả là khung giờ đang trống (do chưa transaction nào commit).
3. Cả A và B cùng chạy lệnh `INSERT` tạo đơn đặt sân, dẫn đến 2 đơn đặt trùng cùng một sân và khung giờ.

Để triệt tiêu hoàn toàn race condition, `BookingsService.createBooking` (`BE/src/modules/bookings/bookings.service.ts`) gói toàn bộ quy trình vào một **Database Transaction** (`this.prisma.$transaction(..., { timeout: 10_000 })`) kết hợp trực tiếp với unique index `UNIQUE(courtId, startAt)` của PostgreSQL:

- Trong transaction (`createBookingInTx`), hệ thống kiểm tra trạng thái sân/cụm sân (`ACTIVE`), kiểm tra khung giờ hợp lệ qua `assertSlotsBookable` (chưa qua, thuộc giờ mở cửa kể cả ca qua đêm ngày trước, không chồng lịch bảo trì), tính giá qua `PricingService.quote`, tạo bản ghi `Booking` ở trạng thái `PENDING`, rồi khóa khung giờ qua `SlotLockService`.
- Khi hai transaction chạy song song cùng chạm tới bước `tx.slotLock.createMany(...)` cho cùng cặp `(courtId, startAt)`, PostgreSQL sẽ cấp row-level lock trên unique index cho transaction đến trước. Transaction thứ hai bị chặn lại cho đến khi transaction đầu commit, sau đó ngay lập tức bị PostgreSQL từ chối với lỗi vi phạm ràng buộc duy nhất (Prisma error code **`P2002`**).
- Toàn bộ transaction thứ hai được rollback tự động (không để lại bản ghi `Booking` rác). Ở tầng service, `createBooking` bắt lỗi qua `isPrismaUniqueError(error)`:
  - Nếu `meta.target` chứa `'code'` (trùng mã đơn ngẫu nhiên), hệ thống tự động retry 1 lần để sinh mã đơn mới.
  - Nếu trùng `(courtId, startAt)`, hệ thống ném `AppException(HttpStatus.CONFLICT, 'SLOT_ALREADY_BOOKED', 'Khung giờ bạn chọn vừa có người đặt. Vui lòng chọn khung khác.')` trả về HTTP **409 Conflict**.
- Sự kiện `AppEvents.BookingCreated` chỉ được phát ra (`eventEmitter.emit`) **sau khi** transaction đã commit thành công.

### 1.3. Luồng chuyển đổi từ Giữ chỗ tạm thời (Hold) sang Đơn đặt sân (Booking)
Để tránh việc khách hàng đang điền thông tin ở trang Checkout thì bị người khác đặt mất sân, hệ thống hỗ trợ giữ chỗ tạm thời 5 phút (`BookingHold`) và chuyển đổi nguyên tử sang `Booking` trong `createBookingInTx`:

1. **Khi khách chưa có Hold (`input.holdId` không truyền):**
   - Trước khi chèn khóa mới, `SlotLockService.purgeExpiredHoldLocks(tx, input.courtId, slotStarts, now)` xóa tất cả các `SlotLock` giữ chỗ đã quá hạn (`holdId IS NOT NULL AND expiresAt < now`) trên các khung giờ đang đặt. Nhờ vậy, các phiên giữ chỗ hết hạn không cản trở khách mới ngay cả khi cron job dọn dẹp mỗi phút chưa kịp chạy.
   - Sau đó, `SlotLockService.lockForBooking` dùng `tx.slotLock.createMany` chèn các khóa chính thức (`bookingId = booking.id`, `holdId = null`, `expiresAt = null`).
2. **Khi khách đặt sân từ phiên Hold hợp lệ (`input.holdId` có truyền):**
   - Hệ thống truy vấn `tx.bookingHold.findUnique({ where: { id: input.holdId } })` và kiểm tra 4 điều kiện: hold tồn tại, `hold.userId === customerId`, chưa hết hạn (`hold.expiresAt >= now`), và khớp chính xác `(courtId, startAt, endAt)`. Nếu vi phạm bất kỳ điều kiện nào, hệ thống ném lỗi 409 `HOLD_EXPIRED`.
   - Khi hợp lệ, thay vì xóa đi tạo lại (dễ tạo khe hở), hệ thống **nâng cấp trực tiếp** các bản ghi `SlotLock` hiện có từ hold sang booking ngay trong cùng transaction rồi xóa bản ghi `BookingHold`:
     ```ts
     await tx.slotLock.updateMany({
       where: { holdId: input.holdId },
       data: { bookingId: booking.id, holdId: null, expiresAt: null },
     });
     await tx.bookingHold.delete({ where: { id: input.holdId } });
     ```
3. **Khi đơn bị hủy hoặc từ chối:** `SlotLockService.releaseBooking(tx, bookingId)` xóa các `SlotLock` theo `bookingId`, giải phóng ngay khung giờ trên lưới lịch cho khách khác đặt.

### 1.4. Kiểm thử đồng thời bằng `race-booking.ts` và kết quả thực nghiệm
Để chứng minh cơ chế chống đặt trùng hoạt động đúng dưới tải đồng thời thực tế, script `BE/scripts/race-booking.ts` giả lập kịch bản 20 khách hàng cùng bấm đặt một khung giờ tại cùng một thời điểm:

- **Cách chạy thử nghiệm:**
  ```bash
  # Khởi động PostgreSQL, migrate + seed dữ liệu mẫu và chạy server BE
  cd BE
  npx tsx scripts/race-booking.ts --n 20
  ```
- **Quy trình của script:**
  1. Đăng nhập đồng thời 20 tài khoản khách hàng (`customer001@sango.vn` … `customer020@sango.vn`) để lấy 20 JWT token riêng biệt.
  2. Chọn cùng 1 sân con (`courtId`) và 1 khung giờ trống vào ngày mai.
  3. Dùng `Promise.all` bắn đồng thời 20 request `POST /api/bookings` với cùng `courtId`, `startAt`, `endAt`.
  4. Thống kê mã trạng thái HTTP trả về và truy vấn trực tiếp vào CSDL để đếm số lượng `Booking` và `SlotLock` được tạo ra cho khung giờ đó.
- **Kết quả thu được:**
  - Có đúng **1 request trả về `201 Created`** (tạo đơn thành công, giữ được khóa `SlotLock`).
  - Có đúng **19 request trả về `409 Conflict`** với mã lỗi `SLOT_ALREADY_BOOKED`.
  - Kiểm tra trong PostgreSQL: chỉ có duy nhất **1 bản ghi `Booking`** và **1 bản ghi `SlotLock`** cho khung giờ được thử nghiệm, khẳng định không xảy ra đặt trùng dưới tải song song.

---

## 2. Kiến trúc Component React: Compound Component & Render Props

Lưới lịch sân (`AvailabilityGrid` trong `FE/src/features/availability/components/AvailabilityGrid/AvailabilityGrid.tsx`) cần được sử dụng ở hai phân hệ có giao diện và nghiệp vụ khác nhau:
- **Phân hệ Khách hàng (`CourtWeekSchedule`):** hiển thị giá tiền từng khung, cho phép chọn dải nhiều ô liên tiếp để đặt sân hoặc đặt lịch cố định, chặn lùi về tuần trong quá khứ.
- **Phân hệ Chủ sân (`OwnerSchedulePage`):** hiển thị tên khách hàng, mã đơn, màu sắc theo trạng thái đơn (`PENDING`, `CONFIRMED`, …), ô bảo trì gạch chéo, bấm vào ô mở drawer chi tiết đơn đặt sân.

Để tái sử dụng 100% logic dựng lưới 7 ngày × N khung giờ và responsive mobile/desktop mà không nhân bản code hay tạo một component khổng lồ chứa hàng chục props điều kiện (`isOwner`, `showPrice`, `onOrderClick`, …), `AvailabilityGrid` được thiết kế kết hợp hai pattern **Compound Component** và **Render Props**:

### 2.1. Compound Component (`AvailabilityGrid.Toolbar`, `WeekNav`, `Legend`, `Table`)
```tsx
<AvailabilityGrid data={week} mode="customer" isFetching={isFetching} isSelected={isSelected}>
  <AvailabilityGrid.Toolbar>
    <AvailabilityGrid.WeekNav weekStart={weekStart} onChange={setWeekStart} />
    <AvailabilityGrid.Legend />
  </AvailabilityGrid.Toolbar>
  <AvailabilityGrid.Table
    renderCell={(slot, { isSelected: cellSelected }) => (
      <SlotCell slot={slot} selected={cellSelected} onClick={toggle} />
    )}
  />
</AvailabilityGrid>
```

- **Chia sẻ state lưới qua Context:** Component gốc `AvailabilityGrid` tính toán cấu trúc lưới (danh sách 7 cột ngày `days` kèm cờ `isToday`, danh sách hàng `rows` là tập hợp các `minuteOfDay` sắp xếp tăng dần, bảng băm `slotMap: Map<"date|minute", AvailabilitySlot>`, chế độ `mode`, trạng thái tải `isFetching`, hàm kiểm tra `isSelected`, và ngày đang chọn trên giao diện di động `activeMobileDate`) rồi cung cấp xuống cây con qua `AvailabilityGridContext.Provider`.
- **Linh hoạt bố cục (Inversion of Layout Control):** Các thành phần con (`Toolbar`, `WeekNav`, `Legend`, `Table`) được gắn tĩnh qua `Object.assign(AvailabilityGridRoot, { Toolbar, WeekNav, Legend, Table })`. Component cha ở từng trang toàn quyền sắp xếp vị trí thanh công cụ, chèn thêm nút lọc hoặc ẩn bớt `Legend` mà không cần sửa đổi cấu trúc bên trong `AvailabilityGrid`. Trên màn hình nhỏ (`< md`), dải chip chọn từng ngày và bảng lịch cùng đọc/ghi `activeMobileDate` từ Context để chỉ hiển thị 1 cột ngày tại một thời điểm, tránh tràn cuộn ngang trang.

### 2.2. Render Props (`renderCell` trên `AvailabilityGrid.Table`)
- `AvailabilityGrid.Table` chịu trách nhiệm toàn bộ phần khung xương phức tạp của bảng: dựng header 7 ngày, cột mốc giờ bên trái, xử lý trạng thái loading skeleton, hiển thị cột đóng cửa (`CLOSED`), và tra cứu từng ô theo khóa `${day.date}|${minuteOfDay}` với độ phức tạp $O(1)$ từ `slotMap`.
- Tuy nhiên, việc **vẽ nội dung bên trong từng ô** được ủy quyền hoàn toàn cho prop hàm `renderCell(slot, { day, isSelected })`:
  - Ở trang khách hàng, `renderCell` trả về `<SlotCell slot={slot} selected={isSelected} onClick={toggle} />` kết nối với custom hook generic `useSlotSelection`.
  - Ở trang chủ sân, `renderCell` trả về `<OwnerSlotCell slot={slot} onClick={openBookingDrawer} />` để hiển thị thông tin khách và trạng thái đơn.
- Nhờ sự tách biệt này, logic ma trận thời gian chỉ viết một lần duy nhất nhưng phục vụ được mọi biến thể giao diện.

---

## 3. Tối ưu hiệu năng Frontend (Performance Optimization)

Lưới lịch một tuần gồm $7 \text{ ngày} \times 16 \text{ khung giờ} = 112 \text{ ô}$. Nếu không tối ưu, mỗi lần người dùng bấm chọn 1 ô hoặc chuyển tuần sẽ kéo theo cả trang chi tiết cụm sân (thông tin sân, bản đồ, danh sách đánh giá) và toàn bộ 112 ô trên lưới bị re-render không cần thiết. Hệ thống áp dụng 4 kỹ thuật tối ưu trọng tâm:

1. **Cô lập state tuần (`weekStart`) cục bộ bên trong khu vực lưới:**
   - State `weekStart` được quản lý trực tiếp trong hook `useCourtWeekAvailability` bên trong component lịch, không đẩy (lift state up) lên trang chi tiết `VenueDetailPage`. Khi người dùng bấm **"Tuần sau"** hoặc **"Tuần trước"**, chỉ cây con của lưới lịch cập nhật dữ liệu mới; các phần tĩnh của trang chi tiết hoàn toàn không re-render.
2. **Tiền xử lý cấu trúc lưới bằng `useMemo` và tra cứu $O(1)$:**
   - Trong `AvailabilityGrid.tsx`, danh sách cột `days`, danh sách hàng `rows`, và `slotMap` (`Map<"date|minute", AvailabilitySlot>`) được bọc trong `useMemo` phụ thuộc vào `data`. Khi khách hàng bấm chọn các khung giờ trên lưới (`selected` thay đổi nhưng `data` từ server không đổi), bảng băm 112 phần tử không bị tính toán lại.
3. **Memo hóa từng ô (`React.memo`) kết hợp `useCallback` và truyền prop `selected: boolean`:**
   - Trong `useSlotSelection.ts`, danh sách ô đã chọn được chuyển thành `selectedKeys = useMemo(() => new Set(selected.map(getKey)), [selected])` để kiểm tra thuộc tập chọn trong thời gian $O(1)$.
   - Hàm `toggle` sử dụng `optionsRef` (`useRef`) và được bọc `useCallback(..., [])` nên giữ nguyên một tham chiếu hàm duy nhất suốt vòng đời component.
   - Mỗi ô `SlotCell` / `OwnerSlotCell` được bọc `React.memo` và chỉ nhận prop nguyên thủy `selected: boolean` thay vì nhận cả mảng `selectedSlots`. Nhờ đó, khi người dùng click nối thêm 1 ô vào dải chọn, **chỉ đúng 1 ô vừa đổi trạng thái `selected`** (hoặc các ô khi reset dải) được re-render, hơn 110 ô còn lại trên lưới được React bỏ qua hoàn toàn.
4. **Prefetch tuần kế tiếp (`usePrefetch` của RTK Query):**
   - Hook `useCourtWeekAvailability` sử dụng `availabilityApi.usePrefetch('getCourtWeek')` để tải ngầm dữ liệu của tuần kế tiếp (`addDaysToDateStr(weekStart, 7)`). Khi người dùng bấm nút chuyển sang tuần sau, dữ liệu đã nằm sẵn trong cache của RTK Query (`keepUnusedDataFor: 30`), giúp lưới lịch chuyển tuần tức thì mà không bị chớp skeleton.

### Kết quả đo đạc bằng React DevTools Profiler
> *Ghi chú: Hiếu tự chụp sau khi chạy React DevTools Profiler trên trình duyệt và lưu vào thư mục ảnh báo cáo.*

![Profiler before](images/perf/profiler-grid-before.png)
*(Hình 3.1: Flamegraph trước khi tối ưu – Hiếu tự chụp sau)*

![Profiler after](images/perf/profiler-grid-after.png)
*(Hình 3.2: Flamegraph sau khi áp dụng state cục bộ, `React.memo` và `useCallback` – Hiếu tự chụp sau)*

---

## 4. Quản lý State với Redux Toolkit (`bookingDraftSlice`) & `sessionStorage`

### 4.1. Tại sao đặt `bookingDraftSlice` trong Redux Store thay vì Local State?
Luồng đặt sân của khách hàng trải qua nhiều bước và đi qua các route khác nhau:
1. Tại trang chi tiết cụm sân (`/venues/:slug`), khách chọn sân con, chọn dải khung giờ liên tiếp trên `CourtWeekSchedule` và bấm **"Đặt sân"** (gọi API `POST /holds` tạo phiên giữ chỗ 5 phút).
2. Ứng dụng điều hướng (`navigate('/booking/checkout')`) sang trang thanh toán/xác nhận đặt sân (`CheckoutPage` tại `/booking/checkout`). Nếu khách chưa đăng nhập, hệ thống còn điều hướng qua `/login?redirect=...` trước khi vào trang đặt sân.

Nếu lưu bản nháp đặt sân (`venue`, `court`, `slots`, `holdId`, `holdExpiresAt`) trong `useState` cục bộ của `CourtWeekSchedule`, toàn bộ dữ liệu sẽ bị hủy ngay khi component unmount lúc chuyển route sang `/booking/checkout`. Việc đưa trạng thái này vào Redux slice `bookingDraftSlice` (`FE/src/features/booking/model/bookingDraftSlice.ts`) mang lại các lợi ích rõ rệt:

- **Sống xuyên qua điều hướng (Cross-Route Persistence):** Dữ liệu bản nháp và thông tin giữ chỗ (`holdId`, `holdExpiresAt`) được giữ nguyên trong bộ nhớ ứng dụng khi chuyển từ `/venues/:slug` sang `/booking/checkout`.
- **Tách biệt trách nhiệm và tính toán dẫn xuất hiệu quả:** Slice định nghĩa rõ 3 action tương ứng với vòng đời đơn nháp: `draftStarted` (khởi tạo khi chọn khung giờ), `holdAttached` (gắn mã giữ chỗ và thời점 hết hạn 5 phút để hiển thị đồng hồ đếm ngược `mm:ss`), và `draftCleared` (dọn sạch sau khi `POST /bookings` thành công hoặc khi hủy giữ chỗ). Các selector được memo hóa bằng `createSelector` như `selectDraftTotal` (tính tổng tiền tạm tính) và `selectDraftRange` (lấy `startAt` của khung đầu và `endAt` của khung cuối để gọi `POST /pricing/quote` và `POST /bookings`) giúp các component đọc dữ liệu nhất quán mà không phải tính lại thủ công.

### 4.2. Đồng bộ tự động với `sessionStorage`
Mặc dù Redux giữ được state khi chuyển trang bằng React Router (SPA navigation), bộ nhớ RAM của Redux vẫn sẽ bị xóa nếu người dùng vô tình bấm **F5 (Refresh)** tại trang `/booking/checkout`. Trong khi đó, phiên giữ chỗ 5 phút (`BookingHold`) trên server vẫn đang còn hiệu lực.

Để khắc phục, `bookingDraftSlice.ts` và `FE/src/app/store.ts` kết hợp cơ chế hydrate và persist tự động với `sessionStorage` dưới khóa `'sango.bookingDraft'`:
- **Khởi tạo (Hydration):** Khi nạp ứng dụng, hàm `loadFromSession()` trong `bookingDraftSlice.ts` đọc và parse JSON từ `sessionStorage.getItem('sango.bookingDraft')` (có `try/catch` an toàn) để khôi phục ngay `initialState` cho `venue`, `court`, `slots`, `holdId`, và `holdExpiresAt`.
- **Đồng bộ & Dọn dẹp (Persistence & Cleanup):** Trong `makeStore` (`FE/src/app/store.ts`), `store.subscribe` tự động ghi `state.bookingDraft` xuống `sessionStorage` mỗi khi có thay đổi; nếu `slots` rỗng và không có `holdId`, hoặc khi action `draftCleared` được kích hoạt (qua `authListener.startListening`), khóa `'sango.bookingDraft'` sẽ bị xóa khỏi `sessionStorage`.
- Việc chọn **`sessionStorage`** thay vì `localStorage` là có chủ đích: bản nháp đặt sân và phiên giữ chỗ 5 phút chỉ có ý nghĩa trong phiên làm việc của tab hiện tại. Khi người dùng đóng tab trình duyệt, bản nháp tự động được giải phóng, tránh tình trạng mở lại web sau nhiều ngày vẫn thấy một đơn nháp đã quá hạn từ lâu.
