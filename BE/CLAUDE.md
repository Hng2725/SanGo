# QUY TẮC CHO AI CODING AGENT – BACKEND (NestJS) – SanGo

> File này được nạp tự động mỗi khi làm việc trong `BE/`. **Bắt buộc tuân thủ 100%.**
> Trước khi code: đọc `../docs/Đề bài/TONG_QUAN_DE_TAI.md` (nguồn sự thật) và file phân công của thành viên đang làm trong `../docs/Phân chia/` (`01_Hung.md`, `02_Hieu.md`, `03_Lam.md`, `04_Duong.md`).
> Nếu file này mâu thuẫn với file tổng quan → làm theo file tổng quan và báo lại cho người dùng.

---

## 1. Bối cảnh

- Đề 4 – Đặt lịch sân thể thao. Kiến trúc B: **NestJS 11 REST API + JWT + Guard**, FE là SPA React riêng.
- Trọng tâm chấm điểm: **chống đặt trùng (409)**, **tính giá & chính sách hủy là hàm thuần có test biên**, **máy trạng thái đơn (union type)**, **schema dùng chung client/server**, **phân quyền nhiều lớp**, **Module–Controller–Service + DI + Interceptor + Exception Filter**.
- Vai trò: `CUSTOMER`, `OWNER` (phải `ownerStatus = APPROVED`), `ADMIN`, cộng thêm guest.

## 2. Stack – KHÔNG tự ý đổi

| Dùng | Không dùng |
|---|---|
| NestJS 11, `@nestjs/jwt`, `@nestjs/config`, `@nestjs/schedule`, `@nestjs/event-emitter`, `helmet` | `passport`, `@nestjs/passport` |
| **Prisma 6** (`prisma-client-js`) + PostgreSQL 16 | Prisma 7, TypeORM, Mongoose, SQL thô nối chuỗi |
| **Zod 3** (schema nằm ở `@sango/shared`) + `ZodValidationPipe` | `class-validator`/`class-transformer` (không trộn 2 kiểu validate) |
| `bcryptjs` | `bcrypt` (native, lỗi build Windows) |
| `nodemailer` (SMTP/Mailpit) + Brevo HTTP API | dịch vụ trả phí |
| Jest + ts-jest + `jest-mock-extended` | |

Cần thư viện mới → phải miễn phí, phổ biến, và nêu lý do cho người dùng trước khi cài.

## 3. TypeScript

- `strict: true`. **Cấm `any`.** Bắt buộc dùng thì: `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Lý do: ...`.
- Request/response DTO, enum-constant, error code **import từ `@sango/shared`**. Không khai báo lại type đã có trong shared. Type mới dùng được cả ở FE → thêm vào `shared/src/...` rồi export qua `shared/src/index.ts`.
- Kiểu Prisma (`Prisma.BookingGetPayload<...>`, `Prisma.TransactionClient`) chỉ dùng **bên trong BE**, không bao giờ trả thẳng entity Prisma ra API → luôn qua `*.mapper.ts` (đổi `Date` → ISO string, bỏ `passwordHash`).
- Ưu tiên `unknown` + type guard (`isPrismaUniqueError`, `isBookingStatus`…) thay vì ép kiểu `as`.
- Dùng utility type khi hợp lý (`Pick`, `Omit`, `Partial`, `Record<BookingStatus, …>`), discriminated union cho kết quả nghiệp vụ (vd `CancellationDecision`).

## 4. Cấu trúc & phân tầng

```
src/
├─ main.ts, app.module.ts
├─ config/        env.ts (Zod validate env)
├─ prisma/        PrismaModule (@Global) + PrismaService
├─ common/        decorators/ guards/ filters/ interceptors/ pipes/ exceptions/ events/ utils/
└─ modules/<module>/
   ├─ <module>.module.ts
   ├─ <module>.controller.ts   # MỎNG: nhận request → gọi service → trả payload
   ├─ <module>.service.ts      # nghiệp vụ + KIỂM TRA SỞ HỮU + transaction
   ├─ <module>.mapper.ts       # entity → DTO (shared)
   ├─ <tên>.ts                 # hàm THUẦN (calculator, policy, generator, grouping…) – không import Nest/Prisma
   └─ *.spec.ts                # test cạnh file
```

- Controller **không** chứa logic nghiệp vụ, **không** gọi Prisma trực tiếp.
- Service nhận dependency qua **constructor DI**. Module export service mà module khác cần (vd `PricingModule` export `PricingService`).
- Module mới → tự thêm **1 dòng** import vào `AppModule`. Không sửa module của người khác; cần thêm hàm ở service người khác → nhờ người đó hoặc chỉ thêm method mới, không đổi chữ ký cũ.
- Tên file `kebab-case`. Prefix API `/api` đã đặt global – controller **không** tự thêm `api/`.

## 5. Validate đầu vào

```ts
@Post()
@Roles('OWNER')
create(@CurrentUser() user: AuthUser, @ZodBody(createVenueSchema) body: CreateVenueInput) {
  return this.venuesService.create(user.id, body);
}
@Get()
@Public()
search(@ZodQuery(searchVenuesQuerySchema) query: SearchVenuesQuery) { ... }
```

- **Mọi** body/query/param từ client đi qua `@ZodBody / @ZodQuery / @ZodParam` với schema của shared. Không tự `parseInt`, không tin dữ liệu client.
- Schema mà FE form cũng dùng (bảng giá, giờ mở cửa, đặt sân…) **chỉ định nghĩa một lần trong shared**.
- Query số dùng `z.coerce.number()`. Lỗi Zod → 400 `VALIDATION_ERROR`, `details = [{ path, message }]` (pipe tự làm).

## 6. Xác thực & phân quyền (3 lớp ở BE)

1. `JwtAuthGuard` (global): **mọi route mặc định cần đăng nhập**. Route công khai phải gắn `@Public()`. Guard nạp user từ DB, chặn `LOCKED` (403 `ACCOUNT_LOCKED`).
2. `RolesGuard` (global): `@Roles('OWNER' | 'ADMIN' | 'CUSTOMER', ...)`. OWNER chưa duyệt → 403 `OWNER_NOT_APPROVED` (trừ route có `@AllowUnapprovedOwner()`).
3. **Service kiểm tra sở hữu – BẮT BUỘC, không được bỏ dù đã có Guard:**
   - Không tồn tại → **404 `NOT_FOUND`**; tồn tại nhưng không thuộc user → **403 `FORBIDDEN`**.
   - Danh sách lọc theo sở hữu ngay trong `where` (vd `court: { venue: { ownerId: user.id } }`).
   - Dùng helper có sẵn: `VenuesService.assertVenueOwner`, `CourtsService.getCourtForOwner`.
- Lấy user bằng `@CurrentUser()` (route bắt buộc đăng nhập) hoặc `@OptionalUser()` (route public muốn biết người xem).
- Không bao giờ nhận `userId`/`ownerId`/`role` từ body để quyết định quyền.

## 7. Lỗi & response

- Ném lỗi nghiệp vụ: `throw new AppException(HttpStatus.CONFLICT, 'SLOT_ALREADY_BOOKED', 'Thông điệp tiếng Việt cho người dùng', details?)`.
- Chỉ dùng `code` có trong `ERROR_CODES` (shared). Cần code mới → thêm vào shared + bảng 8.2 của file tổng quan.

| HTTP | Khi nào |
|---|---|
| 400 `VALIDATION_ERROR` | input sai |
| 401 `UNAUTHORIZED` / `INVALID_CREDENTIALS` | chưa đăng nhập, token sai / sai email-mật khẩu |
| 403 `FORBIDDEN` / `ACCOUNT_LOCKED` / `OWNER_NOT_APPROVED` | không đủ quyền / không sở hữu |
| 404 `NOT_FOUND` | không tồn tại |
| 409 `SLOT_ALREADY_BOOKED`, `SLOT_UNAVAILABLE`, `HOLD_EXPIRED`, `INVALID_STATUS_TRANSITION`, `CANCELLATION_NOT_ALLOWED`, `MAINTENANCE_CONFLICT`, `REVIEW_NOT_ALLOWED`, `EMAIL_TAKEN`, `CONFLICT` | xung đột trạng thái/dữ liệu |

- `AllExceptionsFilter` tạo định dạng lỗi thống nhất `{ statusCode, error, code, message, details?, path, timestamp }` – **không tự `res.status().json()`** trong controller, không trả stack trace.
- Thành công: controller **trả payload thô**; `TransformInterceptor` bọc `{ data }`. Phân trang trả `paginate<T>(items, total, page, pageSize)` → `{ items, page, pageSize, total, totalPages }`.
- Status: tạo mới 201 (mặc định của `@Post`), action `@Post` không tạo tài nguyên (vd login) dùng `@HttpCode(200)`, xóa `@HttpCode(204)` và không trả body.

## 8. Thời gian – quy tắc cứng

- DB lưu UTC (`@db.Timestamptz(3)`). Nghiệp vụ theo **giờ VN UTC+7** bằng hàm trong `@sango/shared` (`toVnParts`, `vnDateMinuteToUtc`, `enumerateSlotStarts`, `startOfWeekDateStr`, `isWeekendDay`, `isSlotAligned`).
- **CẤM** `getHours()`, `getDay()`, `getDate()`, `toLocaleString()`, `setHours()` trong logic (phụ thuộc múi giờ máy chủ). Chỉ dùng `getUTC*` bên trong util của shared.
- Khung (slot) = **60 phút**; `startAt/endAt` phải chia hết 60 phút; 1 đơn tối đa `MAX_SLOTS_PER_BOOKING = 6` khung liên tiếp, cùng sân, cùng ngày hoạt động.
- Ngày-only qua API là chuỗi `YYYY-MM-DD` (giờ VN); datetime là ISO UTC.
- Hàm thuần nhận `now: Date` làm tham số (không gọi `new Date()` bên trong) để test được.

## 9. CSDL & Prisma

- `prisma/schema.prisma` có comment `[OWNER: <tên>]` cho từng model. **Chỉ sửa model mình sở hữu**; không đổi tên enum/bảng/cột đã có.
- Thay đổi schema → `npx prisma migrate dev -n <ten_ro_rang>`. **Không sửa migration đã commit.** CHECK constraint/SQL đặc biệt → `--create-only` rồi viết SQL.
- Ghi nhiều bảng → **`prisma.$transaction(async (tx) => …)`**; hàm dùng lại trong transaction nhận tham số `tx: Prisma.TransactionClient`.
- **Không query trong vòng lặp** (N+1): gom `findMany({ where: { id: { in } } })`, `createMany`, `groupBy`.
- `select`/`include` vừa đủ; không bao giờ select `passwordHash` ra ngoài AuthService.
- Seed nằm trong `prisma/seed/<phần>.seed.ts`, gọi từ `prisma/seed.ts`, phải idempotent, dữ liệu thực tế. **Không có dữ liệu giả cứng trong code chức năng.**

## 10. Bất biến nghiệp vụ – KHÔNG ĐƯỢC PHÁ

1. **Chống trùng:** chiếm khung = tạo dòng `SlotLock` (`@@unique([courtId, startAt])`) **trong cùng transaction** tạo Booking/Hold. Bắt `isPrismaUniqueError(e)` → 409 `SLOT_ALREADY_BOOKED`. **Không** thay bằng kiểu "SELECT kiểm tra rồi INSERT" (bị race condition).
2. Lock giữ chỗ hết hạn (`expiresAt < now`) được coi là trống; xóa nó trong transaction trước khi chèn lock mới.
3. Đơn `CANCELLED`/`REJECTED` → **xóa SlotLock của đơn trong cùng transaction** (`SlotLockService.releaseBooking(tx, id)`). `COMPLETED` giữ lock.
4. **Mọi thay đổi `Booking.status` đi qua `BookingLifecycleService.transition()`**, dùng `assertTransition` (shared) và `updateMany({ where: { id, status: from } })` (khóa lạc quan). Không `update({ data: { status } })` ở chỗ khác.
5. Giá tính bằng `calculatePrice`/`PricingService.quote` **ở server**; không tin giá client gửi. Đơn lưu `totalPrice` + `priceBreakdown` lúc đặt.
6. Hủy đơn chỉ khi `evaluateCancellation(...)` cho phép → không thì 409 `CANCELLATION_NOT_ALLOWED`.
7. Đặt sân/giữ chỗ phải: trong giờ mở cửa (kể cả ca qua nửa đêm), không chồng bảo trì, `startAt > now`, sân & cụm sân đang hoạt động.
8. Đánh giá chỉ cho đơn `COMPLETED` của chính khách, 1 đơn 1 đánh giá; cập nhật `Venue.avgRating/reviewCount` trong cùng transaction.
9. OWNER mới đăng ký luôn `ownerStatus = PENDING`; không ai tự đăng ký được `ADMIN`.

## 11. Event, cron, email

- Emit event **sau khi transaction commit**, dùng hằng `AppEvents.*` và payload type trong `common/events/app-events.ts`: `this.events.emit(AppEvents.BookingCreated, { bookingId })`.
- Không gửi email trực tiếp từ service nghiệp vụ – `MailListener` (module mail) lắng nghe event. Lỗi gửi mail không được làm hỏng request.
- Cron dùng `@nestjs/schedule` (`@Cron`), idempotent, log số bản ghi xử lý.

## 12. Bảo mật & cấu hình

- Đọc env qua `ConfigService<Env>` / `config/env.ts` (đã validate bằng Zod). Không `process.env.X` rải rác.
- Không commit `.env`, secret, token. Biến mới → thêm vào `config/env.ts` **và** `BE/.env.example`.
- Mật khẩu hash `bcryptjs` (salt 10). Đăng nhập sai luôn trả cùng một thông điệp.
- Dữ liệu người dùng chèn vào HTML email phải escape.

## 13. Test

- File `*.spec.ts` cạnh file nguồn. Chạy: `npm test -w @sango/be` (hoặc `npm test` ở gốc).
- **Hàm thuần**: test đủ trường hợp biên (qua nửa đêm, T6→T7, CN→T2, đúng mốc/quá mốc 1 phút, input không hợp lệ), truyền `now` cố định, dựng thời điểm bằng ISO UTC (`new Date('2026-11-20T10:00:00Z')`).
- **Service**: mock `PrismaService` bằng `mockDeep<PrismaClient>()` (jest-mock-extended); `$transaction` mock để gọi callback với chính mock. Phải có case 403 (không sở hữu), 404, 409.
- Test không phụ thuộc DB thật/mạng/giờ hệ thống. Coverage ≥ 50% cho `*.service.ts` và hàm thuần.

## 14. Phân công module (chỉ sửa phần của thành viên đang làm)

| Thành viên | Module / file |
|---|---|
| Hưng | `main.ts`, `app.module.ts`, `config/`, `prisma/` (PrismaService), `common/**`, `modules/health`, `auth`, `users`, `admin`, `mail`; model `User`; `seed.ts`, `seed/users.seed.ts` |
| Hiếu | `modules/search`, `availability`, `bookings` (tạo đơn, `SlotLockService`, `toBookingDto`), `holds`; `scripts/race-booking.ts`; model `Booking` (tạo), `SlotLock`, `BookingHold` |
| Lâm | `modules/venues`, `courts`, `pricing`, `maintenance`; model `Venue`, `OpeningHour`, `Court`, `PriceRule`, `MaintenanceBlock`; `seed/venues.seed.ts` |
| Dương | `modules/booking-lifecycle`, `recurring`, `reviews`, `complaints`, `stats`; model `Booking` (trạng thái), `RecurringSeries`, `Review`, `Complaint`; `seed/bookings.seed.ts`, `seed/reviews-complaints.seed.ts` |

Phần của người khác chưa có → tạo adapter/stub cùng chữ ký trong module của mình, đánh dấu `// TODO(<tên>): thay bằng <Service> khi merge`.

## 15. Checklist trước khi báo xong

- [ ] Endpoint đúng path/method/quyền như bảng 8.3 file tổng quan.
- [ ] Input validate bằng schema shared; quyền kiểm tra cả Guard **và** Service.
- [ ] Mã lỗi đúng, qua `AppException`; không lộ stack/passwordHash.
- [ ] Không `any`, không `console.log` (dùng `Logger`), không N+1, ghi nhiều bảng có transaction.
- [ ] Không dùng hàm thời gian theo múi giờ máy.
- [ ] Có test; `npm test` và `npm run build` pass.
- [ ] Biến env mới có trong `.env.example`; type/schema mới đã export từ shared.
- [ ] Tick checklist trong file phân công. **Không tự commit/push** nếu người dùng chưa yêu cầu; khi commit dùng Conventional Commits (`feat(booking): ...`).
