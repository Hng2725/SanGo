# TỔNG QUAN ĐỀ TÀI – SanGo: Website đặt lịch sân thể thao

> **File này là "nguồn sự thật" (single source of truth) của dự án.**
> Mọi AI coding agent và thành viên **PHẢI đọc file này trước mỗi phiên làm việc**, sau đó đọc file phân công của mình trong `docs/Phân chia/`.
> Đề bài gốc: `docs/Đề bài/DeTai_BTL_CuoiKy_LTWNC_v2.pdf` – **Đề 4. Đặt lịch sân thể thao**, **Kiến trúc B: SPA (React + Vite + React Router) + NestJS REST API + JWT/Guard**.

---

## 0. Quy tắc bắt buộc cho AI coding agent (đọc kỹ)

1. **TypeScript `strict: true` ở mọi package.** Cấm `any`. Nếu bắt buộc phải dùng, ghi đúng dạng:
   `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Lý do: <giải thích>`.
2. **Kiểu dữ liệu & schema validate dùng chung nằm trong package `shared/` (`@sango/shared`).** Không định nghĩa lại type DTO/request ở FE hoặc BE nếu đã có trong shared. Thêm type mới → thêm vào shared rồi export ở `shared/src/index.ts`.
3. **Validate đầu vào bằng Zod** (schema trong shared). BE dùng `ZodValidationPipe` (decorator `@ZodBody`, `@ZodQuery`); FE dùng `react-hook-form` + `zodResolver` với **cùng schema**.
4. **Không dùng dữ liệu giả cứng trong code** cho chức năng chính. Dữ liệu mẫu chỉ nằm trong `BE/prisma/seed/*`.
5. **Chỉ sửa trong phạm vi mình sở hữu** (xem mục 14 và file phân công). Khi buộc phải chạm file chung (`app.module.ts`, `router.tsx`, `shared/src/index.ts`, `schema.prisma`, `baseApi.ts`…) chỉ **thêm** dòng tối thiểu (import/route/export/field), không sửa logic của người khác.
6. **Không đổi tên enum, bảng, cột, endpoint, error code đã có** trong file này. Muốn thêm → thêm mới và cập nhật file này trong cùng PR.
7. **Phân quyền nhiều lớp:** chặn ở route (Guard) **và** kiểm tra lại quyền sở hữu ở Service (tầng dữ liệu). Không bao giờ chỉ ẩn nút ở FE.
8. **Mã lỗi HTTP đúng:** 400 validate, 401 chưa đăng nhập/token sai, 403 không đủ quyền, 404 không tồn tại, 409 xung đột (trùng lịch, chuyển trạng thái sai…). Lỗi luôn theo **định dạng thống nhất** (mục 8.2).
9. **Thời gian:** DB lưu UTC (`timestamptz`). Nghiệp vụ dùng giờ Việt Nam (UTC+7, không có DST) qua các hàm trong `shared/src/utils/time.ts`. **Không** dùng `new Date().getHours()` / `getDay()` (phụ thuộc múi giờ máy) trong logic nghiệp vụ.
10. **Mỗi chức năng phải có test** (xem file phân công). Chạy `npm test` xanh trước khi mở PR.
11. **Giao diện phải dùng được trên điện thoại** (antd Grid/`useBreakpoint`, kiểm tra ở width 375px) và **theo đúng hệ thống thiết kế** `docs/Thiết kế/00_HE_THONG_THIET_KE.md`.
12. **Không commit secret.** Chỉ commit `.env.example`. Không commit `node_modules`, `dist`, `coverage`, `.env`.
13. **Commit theo từng tính năng**, message theo Conventional Commits (`feat(booking): ...`, `fix(pricing): ...`, `test(...)`, `docs(...)`). Commit bằng tài khoản Git **của chính thành viên đang làm** (không commit hộ).
14. Trang FE mới phải: lazy-load (React Router `lazy`), gọi `useDocumentTitle(...)` để đặt title động.
15. Khi hoàn thành 1 task: tick checklist trong file phân công của mình (`docs/Phân chia/0x_Ten.md`).

---

## 1. Giới thiệu đề tài

**SanGo** là nền tảng cho **chủ sân** (bóng đá mini, cầu lông, pickleball, tennis…) đăng cụm sân, sân con và khung giờ; **khách** tìm sân trống và đặt theo giờ. **Trọng tâm nghiệp vụ: chống đặt trùng lịch** và **form cấu hình phức tạp** (giờ mở cửa, bảng giá theo khung giờ).

### 1.1. Vai trò

| Vai trò | Mã trong hệ thống | Mô tả |
|---|---|---|
| Khách chưa đăng nhập | (guest) | Xem/tìm sân, xem lịch trống, xem đánh giá |
| Khách đặt sân | `CUSTOMER` | Đặt/hủy sân, lịch sử, đánh giá, khiếu nại, lịch cố định hàng tuần |
| Chủ sân | `OWNER` | Quản lý cụm sân, sân con, giờ mở cửa, bảng giá, bảo trì, xác nhận đơn, doanh thu. **Phải được Admin duyệt** (`ownerStatus = APPROVED`) mới dùng được khu quản lý |
| Quản trị viên | `ADMIN` | Duyệt chủ sân, quản lý người dùng, xử lý khiếu nại, thống kê tổng |

### 1.2. Chức năng bắt buộc (theo đề)

- **Khách:** tìm sân theo môn, khu vực, ngày, giờ; xem lịch trống dạng **lưới ngày × khung giờ**; đặt **một hoặc nhiều khung liên tiếp**; **hủy đặt trước giờ chơi theo quy định**; xem lịch sử đặt; đánh giá sân.
- **Chủ sân:** quản lý **cụm sân** và từng **sân con**; cấu hình **giờ mở cửa**; **bảng giá theo khung giờ** (giờ vàng, cuối tuần); **khóa lịch bảo trì**; **xác nhận/từ chối đơn**; xem **doanh thu theo ngày/tháng**.
- **Admin:** duyệt chủ sân mới, quản lý người dùng, xử lý khiếu nại.
- **Vòng đời đơn:** `Chờ xác nhận (PENDING) → Đã xác nhận (CONFIRMED) → Hoàn thành (COMPLETED)`, hoặc `Đã hủy (CANCELLED)` / `Từ chối (REJECTED)`.

### 1.3. Yêu cầu kỹ thuật riêng của Đề 4

1. Không để 2 đơn trùng cùng sân, cùng khung giờ, **kể cả khi 2 người bấm đặt cùng lúc** → ràng buộc CSDL (`UNIQUE(courtId, startAt)` trên bảng `SlotLock`) + transaction, trả **409 Conflict**; báo cáo mô tả cách thử (script bắn request song song).
2. **Tính giá** và **kiểm tra quy tắc hủy** nằm trong Service ở server, viết dưới dạng **hàm thuần** có unit test đầy đủ trường hợp biên (qua nửa đêm, giờ vàng, hủy sát giờ).
3. Chuyển trạng thái đơn biểu diễn bằng **union type + hàm kiểm tra chuyển trạng thái hợp lệ**; server từ chối chuyển sai.
4. **Form cấu hình bảng giá** validate ở cả client và server, **dùng chung schema/kiểu** (Zod trong `shared`).
5. **Lưới lịch trống là component tái sử dụng** cho cả khách và chủ sân (**Compound Component + Render Props**); **đổi tuần không re-render toàn trang**.
6. (Mục Next.js không áp dụng vì nhóm dùng kiến trúc B.)

### 1.4. Nâng cao (cộng điểm) – nhóm làm đủ cả 4

| Tính năng | Người phụ trách |
|---|---|
| Giữ chỗ tạm 5 phút khi đang đặt | Hiếu |
| Đặt lịch cố định hàng tuần | Dương |
| Bản đồ vị trí sân (Leaflet + OpenStreetMap, miễn phí) | Lâm |
| Gửi email xác nhận (Nodemailer + Mailpit khi dev, Brevo free khi deploy) | Hưng |
| (Thêm) Triển khai online miễn phí: Neon + Render + Vercel | Hưng |

---

## 2. Kiến trúc & công nghệ (100% miễn phí)

```
┌──────────────────────────┐   HTTPS/JSON (Bearer JWT)   ┌──────────────────────────┐      ┌──────────────┐
│ FE: React 19 + Vite      │ ──────────────────────────▶ │ BE: NestJS 11 REST API   │ ───▶ │ PostgreSQL 16│
│ React Router 7 (data)    │      /api/*                 │ Module–Controller–Service│      │ (Prisma 6)   │
│ Redux Toolkit + RTK Query│ ◀────────────────────────── │ Guard/Interceptor/Filter │      └──────────────┘
│ Ant Design 6             │   { data } | { error body } │ @nestjs/schedule (cron)  │ ───▶ SMTP/Brevo (email)
└──────────────────────────┘                             └──────────────────────────┘
            ▲                         @sango/shared (types + Zod schemas + pure utils)        ▲
            └─────────────────────────────── dùng chung ──────────────────────────────────────┘
```

| Hạng mục | Công nghệ (major version) | Ghi chú |
|---|---|---|
| Runtime | Node.js 22 LTS, npm 10 (workspaces) | |
| Ngôn ngữ | TypeScript **5.9** (ghim `~5.9.3` ở gốc, dùng chung cả monorepo – không dùng TS 7), `strict: true` | bắt buộc |
| Frontend | React 19, **Vite 8**, React Router 7 (data mode: `createBrowserRouter`, import từ `react-router`) | |
| State | Redux Toolkit 2 (`createSlice`, `createAsyncThunk`) + **RTK Query** (server state) ; React Context (Theme, Language) | |
| Form | react-hook-form 7 + @hookform/resolvers + Zod 3 | |
| UI | **Ant Design 6** (`antd`, MIT) + `@ant-design/icons` (Outlined) + CSS Modules; font Be Vietnam Pro (Google Fonts) | theme "Vạch sân" trong `FE/src/common/theme`, component dự án trong `FE/src/components`; thông báo bằng `App.useApp().message` – xem `docs/Thiết kế/` |
| Ngày giờ (FE hiển thị) | dayjs | logic nghiệp vụ dùng `shared/utils/time.ts` |
| Virtualization | @tanstack/react-virtual 3 | |
| Biểu đồ | recharts | doanh thu |
| Bản đồ | leaflet 1.9 + react-leaflet 5 + tile OpenStreetMap | miễn phí, không cần API key |
| Backend | NestJS 11, @nestjs/jwt, @nestjs/config, @nestjs/schedule, @nestjs/event-emitter, bcryptjs, helmet | không dùng passport |
| ORM / DB | Prisma 6 (`prisma-client-js`) + PostgreSQL 16 | Docker khi dev, Neon free khi deploy |
| Email | nodemailer (SMTP) ; dev: **Mailpit** (docker) ; prod: **Brevo** free (HTTP API, 300 mail/ngày) | |
| Test FE | **Vitest 5** + @testing-library/react 16 + @testing-library/user-event 14 + @testing-library/jest-dom 7 + MSW 2 + @vitest/coverage-v8 | |
| Test BE | Jest 30 (mặc định NestJS) + ts-jest + jest-mock-extended 4 | |
| Lint | ESLint 9 + typescript-eslint (BE kèm prettier, FE kèm react-hooks/react-refresh) | |
| Test shared | Vitest | |
| Chạy song song | concurrently | |
| Deploy | Neon (Postgres), Render (NestJS – free web service), Vercel (SPA) | |
| CI | GitHub Actions (lint + test) | |

> **Không dùng Prisma 7** (thay đổi lớn về generator/adapter). Ghim `prisma@^6` và `@prisma/client@^6`. **Zod ghim `^3.23`**.

---

## 3. Cấu trúc thư mục (monorepo npm workspaces)

```
SanGo/
├─ package.json              # workspaces: ["shared","BE","FE"], script dev/test/db:*
├─ docker-compose.yml        # postgres:16-alpine + mailpit
├─ .gitignore  .editorconfig  .prettierrc  .nvmrc(22)  README.md
├─ CLAUDE.md / AGENTS.md     # trỏ AI agent tới file này
├─ .github/workflows/ci.yml
├─ docs/
│  ├─ Đề bài/   (PDF đề + TONG_QUAN_DE_TAI.md)
│  ├─ Phân chia/ (00_TONG_QUAN_PHAN_CONG.md, 01_Hung.md, 02_Hieu.md, 03_Lam.md, 04_Duong.md)
│  ├─ Thiết kế/  (00_HE_THONG_THIET_KE.md – dùng chung; 01_Hung_GIAO_DIEN.md – màn hình của Hưng; mỗi người thêm file của mình)
│  └─ bao-cao/  (phần báo cáo từng người + images/)
├─ shared/                   # @sango/shared – build ra dist (CommonJS + .d.ts)
│  └─ src/
│     ├─ index.ts            # barrel export – MỌI thứ export qua đây
│     ├─ constants/          # roles.ts, sports.ts, booking-status.ts, time.ts, error-codes.ts
│     ├─ types/              # api.ts, user.ts, venue.ts, pricing.ts, availability.ts, booking.ts, review.ts, complaint.ts, stats.ts, recurring.ts
│     ├─ schemas/            # common.schema.ts, auth.schema.ts, user.schema.ts, venue.schema.ts, pricing.schema.ts, maintenance.schema.ts, booking.schema.ts, search.schema.ts, review.schema.ts, complaint.schema.ts, recurring.schema.ts, stats.schema.ts
│     ├─ booking/            # booking-status-machine.ts (Dương)
│     └─ utils/              # time.ts, type-guards.ts
├─ BE/                       # @sango/be – NestJS
│  ├─ CLAUDE.md              # RULE bắt buộc cho agent khi làm BE
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  ├─ migrations/
│  │  ├─ seed.ts             # gọi lần lượt các file trong seed/
│  │  └─ seed/               # users.seed.ts (Hưng), venues.seed.ts (Lâm), bookings.seed.ts + reviews-complaints.seed.ts (Dương)
│  ├─ scripts/race-booking.ts  # script thử đặt trùng đồng thời (Hiếu)
│  ├─ src/
│  │  ├─ main.ts  app.module.ts
│  │  ├─ config/             # env.ts (zod validate env)
│  │  ├─ prisma/             # prisma.module.ts (global), prisma.service.ts
│  │  ├─ common/
│  │  │  ├─ decorators/      # public.decorator, roles.decorator, current-user.decorator, zod.decorators (ZodBody/ZodQuery/ZodParam)
│  │  │  ├─ guards/          # jwt-auth.guard.ts, roles.guard.ts
│  │  │  ├─ filters/         # all-exceptions.filter.ts
│  │  │  ├─ interceptors/    # transform.interceptor.ts, logging.interceptor.ts
│  │  │  ├─ pipes/           # zod-validation.pipe.ts
│  │  │  ├─ exceptions/      # app.exception.ts
│  │  │  ├─ events/          # app-events.ts (tên event + payload type)
│  │  │  └─ utils/           # pagination.ts, prisma-errors.ts
│  │  └─ modules/
│  │     ├─ health/ auth/ users/ admin/ mail/                       # Hưng
│  │     ├─ venues/ courts/ pricing/ maintenance/                   # Lâm
│  │     ├─ search/ availability/ bookings/ holds/                  # Hiếu
│  │     └─ booking-lifecycle/ recurring/ reviews/ complaints/ stats/  # Dương
│  └─ test/                  # e2e (tuỳ chọn)
└─ FE/                       # @sango/fe – React + Vite
   ├─ CLAUDE.md              # RULE bắt buộc cho agent khi làm FE
   └─ src/
      ├─ main.tsx
      ├─ app/                # store.ts, hooks.ts (useAppDispatch/useAppSelector), router.tsx, providers.tsx
      ├─ components/         # branding/, feedback/, forms/, icons/, layout/: component UI dùng chung (Hưng)
      ├─ common/
      │  ├─ api/             # baseApi.ts (RTK Query createApi + baseQuery), errors.ts
      │  ├─ theme/           # tokens.ts (bảng màu), antdTheme.ts (getAntdTheme)
      │  ├─ hooks/           # useDocumentTitle, useDebounce<T>, useLocalStorage<T>, useMediaQuery
      │  ├─ contexts/        # ThemeContext, LanguageContext (+ i18n dictionary)
      │  ├─ hoc/             # withAuthGuard.tsx
      │  └─ utils/           # format.ts (tiền, ngày giờ), cn.ts
      ├─ layouts/            # MainLayout, AuthLayout, OwnerLayout, AdminLayout, CustomerLayout
      ├─ pages/              # HomePage (placeholder), NotFoundPage, ErrorPage, ForbiddenPage
      ├─ features/
      │  ├─ auth/  profile/  admin-users/  admin-dashboard/                         # Hưng
      │  ├─ owner-venues/  pricing/  maintenance/  venue-detail/  map/             # Lâm
      │  ├─ search/  availability/  booking/  owner-schedule/                      # Hiếu
      │  ├─ my-bookings/  owner-bookings/  recurring/  reviews/  complaints/  stats/  # Dương
      └─ test/               # setup.ts, msw/server.ts, msw/handlers.ts, test-utils.tsx (renderWithProviders)
```

### 3.1. Cấu trúc 1 feature FE (bắt buộc giống nhau)

```
features/<feature>/
├─ api/<feature>Api.ts        # baseApi.injectEndpoints({...}) – KHÔNG tạo createApi mới
├─ components/                # component riêng của feature
├─ hooks/                     # custom hook riêng
├─ model/                     # slice/selectors (nếu có)
├─ pages/                     # mỗi page là default export (để lazy)
├─ utils/                     # hàm thuần
├─ __tests__/                 # *.test.ts(x)
├─ routes.tsx                 # export const <feature>Routes: RouteObject[] (dùng lazy)
└─ index.ts                   # export công khai cho feature khác dùng
```

### 3.2. Cấu trúc 1 module BE (bắt buộc)

```
modules/<module>/
├─ <module>.module.ts
├─ <module>.controller.ts     # chỉ nhận request, gọi service, không chứa nghiệp vụ
├─ <module>.service.ts        # nghiệp vụ + kiểm tra quyền sở hữu (tầng dữ liệu)
├─ <module>.mapper.ts         # Prisma entity → DTO trong shared (Date → ISO string)
├─ *.ts                       # hàm thuần (vd pricing.calculator.ts, cancellation-policy.ts)
└─ *.spec.ts                  # test Jest cạnh file
```

---

## 4. Quy ước code

- Tên file: `kebab-case` ở BE/shared (`booking-lifecycle.service.ts`), `PascalCase.tsx` cho component React, `camelCase.ts` cho hook/util FE (`useDebounce.ts`).
- Import trong FE dùng alias `@/` (= `FE/src`) và `@sango/shared`. BE import `@sango/shared`.
- Tiền: số nguyên **VND** (`Int`), format hiển thị `formatCurrency(150000) → "150.000 ₫"`.
- Phút trong ngày: số nguyên `minuteOfDay` (0 = 00:00, 1080 = 18:00). Hiển thị bằng `formatMinute()` ("18:00", "01:00 (+1)" nếu ≥ 1440).
- Ngày (date-only) truyền qua API dạng chuỗi `YYYY-MM-DD` theo giờ VN. Thời điểm (datetime) truyền dạng ISO UTC (`2026-11-20T11:00:00.000Z`).
- Mọi response DTO có `Date` phải đổi sang ISO string trong `*.mapper.ts`.
- ESLint: `@typescript-eslint/no-explicit-any: error`, `react-hooks/exhaustive-deps: warn`. Prettier: single quote, semi, printWidth 100.

---

## 5. Hiện thực 8 nhóm yêu cầu kỹ thuật chung (mục 2 của đề)

| # | Nhóm | Cách hiện thực trong SanGo | Người minh chứng chính |
|---|---|---|---|
| 1 | TypeScript | `strict: true` ở shared/BE/FE; **generic tự viết**: `ApiResponse<T>`, `Paginated<T>`, `ZodValidationPipe<TSchema>`, `isOneOf<T>()`, `useDebounce<T>`, `useLocalStorage<T>`, `useSlotSelection<TSlot>`, `paginate<T>()`; **utility type**: `Pick<UserDto,…>` (AuthUser), `Partial<CreateVenueInput>` (UpdateVenueInput), `Omit<…>`, `Record<BookingStatus, …>` (bảng chuyển trạng thái, nhãn); **type guard**: `isApiErrorBody`, `isBookingStatus`, `isRole`, `isPrismaUniqueError`; **kiểu dùng chung giữa các tầng** qua `@sango/shared` | Tất cả (Hưng dựng nền) |
| 2 | Kiến trúc & pattern React | Thư mục theo feature (mục 3.1); custom hook generic: `useDebounce<T>`, `useLocalStorage<T>` (Hưng), `useSlotSelection<TSlot>` (Hiếu), `useUrlFilters<T>` (Hiếu); **HOC** `withAuthGuard` (Hưng); **Compound Component + Render Props** `AvailabilityGrid` (Hiếu) – lý do ghi trong báo cáo | Hưng, Hiếu |
| 3 | Quản lý state | **Redux Toolkit**: `authSlice` + `createAsyncThunk bootstrapAuth` (Hưng), `bookingDraftSlice` (Hiếu); **RTK Query** cho mọi gọi API (cache + invalidate theo tag); **Context** cho Theme (sáng/tối) và Language (vi/en) – ít thay đổi | Hưng, Hiếu |
| 4 | Hiệu năng | `React.lazy`/route `lazy` cho mọi page; `memo/useMemo/useCallback` trong `AvailabilityGrid` (đổi tuần không re-render toàn trang, ảnh Profiler trước/sau – Hiếu); danh sách dài: **phân trang server** (Admin users ≥ 250 dòng – Hưng) và **virtualization** (đơn đặt của chủ sân ≥ 300 dòng – Dương); Lighthouse trước/sau (Hưng) | Hiếu, Dương, Hưng |
| 5 | Kiểm thử | Vitest + RTL + MSW ở FE, Jest ở BE, Vitest ở shared; **≥ 15 test FE** (mỗi người ≥ 4) + unit test hàm thuần BE/shared; coverage ≥ 50% ở thư mục logic | Tất cả |
| 6 | Xác thực & phân quyền | Đăng ký/đăng nhập JWT; 3 vai trò + guest; ma trận RBAC (mục 9); 3 lớp: FE `withAuthGuard` → BE `JwtAuthGuard` + `RolesGuard` → Service kiểm tra sở hữu; + ràng buộc DB | Hưng (nền), mỗi người ở service của mình |
| 7 | Backend & API | Zod + `ZodValidationPipe`; mã lỗi 400/401/403/404/409; định dạng lỗi thống nhất qua `AllExceptionsFilter`; `TransformInterceptor` + `LoggingInterceptor`; Module–Controller–Service + DI | Hưng (nền), mọi module tuân theo |
| 8 | Render & SEO (kiến trúc B) | Lazy route; `ErrorPage` (errorElement) + `NotFoundPage` (`*`) + `ForbiddenPage`; title động `useDocumentTitle` cho từng trang (vd "Sân ABC – Đặt sân | SanGo") | Hưng (nền), mọi page |
| + | Khác | Git theo tính năng + PR; `.env.example`; không commit secret; responsive mobile | Tất cả |

---

## 6. Nghiệp vụ chi tiết (mọi agent phải tuân theo)

### 6.1. Thời gian & khung giờ (slot)

- **Múi giờ nghiệp vụ:** Việt Nam, UTC+7 cố định (`VN_UTC_OFFSET_MINUTES = 420`).
- **Độ dài 1 khung (slot): 60 phút** (`SLOT_MINUTES = 60`). Mọi `startAt/endAt` của đơn, giữ chỗ, bảo trì phải **chia hết cho 60 phút** (phút = 0, giây = 0).
- Một đơn gồm **1 → 6 khung liên tiếp** (`MAX_SLOTS_PER_BOOKING = 6`) trên **cùng 1 sân con** và **cùng 1 ngày hoạt động**.
- Không đặt khung đã qua (`startAt <= now`).
- Hàm dùng chung trong `shared/src/utils/time.ts` (Hưng viết, có test):
  - `toVnParts(date: Date): { dateStr: string; dayOfWeek: number; minuteOfDay: number }`
  - `vnDateMinuteToUtc(dateStr: string, minuteOfDay: number): Date` (minuteOfDay có thể ≥ 1440 → sang ngày hôm sau)
  - `addDaysToDateStr(dateStr, n)`, `startOfWeekDateStr(dateStr)` (tuần bắt đầu **Thứ 2**), `isWeekendDay(dayOfWeek)` (0 = CN, 6 = T7 → true)
  - `enumerateSlotStarts(startAt: Date, endAt: Date): Date[]` (bước 60 phút)
  - `formatMinute(minute: number): string`
  - `isSlotAligned(date: Date): boolean`

### 6.2. Giờ mở cửa (OpeningHour – Lâm)

- Mỗi cụm sân có 7 bản ghi (0 = CN … 6 = T7). `isClosed = true` → nghỉ cả ngày.
- `openMinute` ∈ [0, 1380], `closeMinute` ∈ (openMinute, 1800], đều **bội số của 60**, `closeMinute - openMinute ≥ 60`.
- **Qua nửa đêm:** `closeMinute > 1440` nghĩa là đóng cửa sau 0h hôm sau (vd 18:00–02:00 ⇒ `open=1080, close=1560`). Ràng buộc: `closeMinute - 1440 ≤ openMinute của ngày kế tiếp` (không chồng ca).
- **"Ngày hoạt động" (operating day):** lưới lịch của ngày D gồm các khung từ `D + openMinute` đến `D + closeMinute` (có thể lấn sang D+1). Khung 01:00 thuộc ca tối của D hiển thị là "01:00 (+1)" trong cột ngày D.

### 6.3. Bảng giá (PriceRule – Lâm)

- Mỗi sân con có `basePricePerHour` (giá mặc định) + danh sách `PriceRule { dayType: WEEKDAY|WEEKEND, startMinute, endMinute, pricePerHour, label }`.
- `0 ≤ startMinute < endMinute ≤ 1440`, bội số 60; các rule **cùng dayType không được chồng nhau**; `pricePerHour` ∈ [10.000, 10.000.000], bội số 1.000.
- **Cách tính giá (hàm thuần `calculatePrice`, BE `modules/pricing/pricing.calculator.ts`):**
  - Duyệt từng khung 60 phút của đơn. Với mỗi khung lấy **ngày theo lịch & phút bắt đầu theo giờ VN của chính khung đó**.
  - `dayType` = WEEKEND nếu ngày đó là T7/CN, ngược lại WEEKDAY.
  - Tìm rule có `dayType` khớp và `startMinute ≤ minuteOfDay < endMinute` → giá khung = `pricePerHour` của rule, `label` của rule. Không khớp rule nào → `basePricePerHour`, `label = null`.
  - `total` = tổng giá các khung. Trả về `PriceQuote { total, breakdown: PriceBreakdownItem[] }`.
  - Ví dụ qua nửa đêm: đơn 23:00 T6 → 01:00 T7: khung 23–24 tính giá **WEEKDAY**, khung 0–1 tính giá **WEEKEND**.
- Đơn lưu `totalPrice` và `priceBreakdown` (JSON) tại thời điểm đặt → đổi bảng giá sau đó **không** ảnh hưởng đơn cũ.

### 6.4. Bảo trì (MaintenanceBlock – Lâm)

- Chủ sân khóa 1 sân con trong khoảng `[startAt, endAt)` (bội số 60 phút, `startAt > now`).
- Tạo bảo trì **chồng với đơn đang hiệu lực** (có `SlotLock` với `bookingId`) → **409 `MAINTENANCE_CONFLICT`** (kèm danh sách mã đơn bị trùng).
- Khung nằm trong bảo trì hiển thị `MAINTENANCE`, không giữ chỗ/đặt được (kiểm tra lại trong transaction tạo đơn).

### 6.5. Chống đặt trùng (Hiếu) – TRỌNG TÂM

- Bảng **`SlotLock`**: mỗi hàng = 1 khung 60 phút của 1 sân đang bị chiếm, **`@@unique([courtId, startAt])`**.
  - Chiếm bởi đơn: `bookingId != null`, `holdId = null`, `expiresAt = null`.
  - Chiếm bởi giữ chỗ: `holdId != null`, `bookingId = null`, `expiresAt = now + 5 phút`.
- **Tạo đơn** (`BookingsService.createBooking`) trong `prisma.$transaction` (interactive):
  1. Validate (Zod + quy tắc 6.1), sân & cụm sân đang hoạt động, khung nằm trong giờ mở cửa, không chồng bảo trì.
  2. Nếu có `holdId`: hold phải của user, chưa hết hạn, khớp court/start/end → chuyển lock của hold sang booking.
  3. Nếu không có hold: xóa lock **giữ chỗ đã hết hạn** của các khung đó (`expiresAt < now`), rồi `createMany` SlotLock.
  4. Tính giá bằng `PricingService.quote(...)`; tạo `Booking` (PENDING) – mã `code` dạng `SG` + `yyMMdd` + 4 ký tự base36 in hoa.
  5. Bắt lỗi Prisma `P2002` (vi phạm unique) → **409 `SLOT_ALREADY_BOOKED`** (transaction tự rollback).
  6. Sau commit: emit event `booking.created`.
- **Giải phóng khung** khi đơn `CANCELLED`/`REJECTED`: xóa SlotLock có `bookingId` đó **trong cùng transaction** đổi trạng thái (gọi `SlotLockService.releaseBooking(tx, bookingId)` của Hiếu). Đơn `COMPLETED` giữ nguyên lock.
- **Cách thử đồng thời (ghi vào báo cáo):** `BE/scripts/race-booking.ts` đăng nhập N user, bắn N request `POST /api/bookings` cùng sân/khung bằng `Promise.all` → kỳ vọng **đúng 1 response 201, N-1 response 409**, DB chỉ có 1 đơn.

### 6.6. Giữ chỗ tạm 5 phút (Hiếu – nâng cao)

- Khách chọn khung trên lưới → `POST /api/holds` → tạo `BookingHold` + SlotLock (`expiresAt = now + HOLD_TTL_MINUTES(5)`). Mỗi user tối đa **1 hold đang hiệu lực** (tạo mới thì xóa hold cũ).
- Trang checkout hiển thị **đồng hồ đếm ngược**; hết giờ → báo hết hạn, quay lại lưới.
- Khung đang bị người khác giữ hiển thị `HELD`; của chính mình `HELD_BY_ME`.
- Cron mỗi phút (`@nestjs/schedule`) xóa hold hết hạn (lock cascade theo).

### 6.7. Vòng đời đơn – máy trạng thái (Dương)

```ts
// shared/src/constants/booking-status.ts (Hưng tạo danh sách) + shared/src/booking/booking-status-machine.ts (Dương)
export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingActor = 'CUSTOMER' | 'OWNER' | 'ADMIN' | 'SYSTEM';
```

| Từ → Đến | Ai được làm | Điều kiện |
|---|---|---|
| PENDING → CONFIRMED | OWNER (của cụm sân) | `startAt > now` |
| PENDING → REJECTED | OWNER (bắt buộc lý do) ; SYSTEM (tự động khi `startAt <= now` mà chưa xác nhận, lý do "Quá hạn xác nhận") | |
| PENDING → CANCELLED | CUSTOMER (chủ đơn) ; ADMIN | `now < startAt` |
| CONFIRMED → CANCELLED | CUSTOMER (theo chính sách hủy 6.8) ; ADMIN | |
| CONFIRMED → COMPLETED | SYSTEM (cron khi `endAt <= now`) ; OWNER | `endAt <= now` |
| COMPLETED / CANCELLED / REJECTED | – | trạng thái cuối, không chuyển tiếp |

- `canTransition(from, to, actor): boolean` và `assertTransition(...)` (ném lỗi) dùng chung FE/BE. FE chỉ hiện nút hợp lệ; **BE luôn kiểm tra lại** → sai trả **409 `INVALID_STATUS_TRANSITION`**.
- Cron mỗi 10 phút: CONFIRMED đã kết thúc → COMPLETED; PENDING đã tới giờ chơi → REJECTED (SYSTEM).

### 6.8. Chính sách hủy (Dương) – hàm thuần `evaluateCancellation`

- Mỗi cụm sân có `cancelBeforeHours` (mặc định 2, khoảng 0–72) – do chủ sân cấu hình (form của Lâm).
- Quy tắc:
  - Trạng thái không phải PENDING/CONFIRMED → `{ allowed: false, reason: 'INVALID_STATUS' }`.
  - `now >= startAt` → `{ allowed: false, reason: 'ALREADY_STARTED' }`.
  - PENDING → được hủy bất cứ lúc nào trước giờ chơi.
  - CONFIRMED → được hủy nếu `now <= startAt - cancelBeforeHours giờ` (đúng bằng mốc vẫn được), ngược lại `{ allowed: false, reason: 'TOO_LATE' }`.
- Kết quả là **discriminated union**: `{ allowed: true } | { allowed: false; reason: 'INVALID_STATUS' | 'ALREADY_STARTED' | 'TOO_LATE' }`. Không cho hủy → **409 `CANCELLATION_NOT_ALLOWED`**.
- ADMIN được hủy bỏ qua mốc giờ (nhưng vẫn phải trước giờ chơi).

### 6.9. Đặt lịch cố định hàng tuần (Dương – nâng cao)

- Khách chọn sân, ngày bắt đầu (`firstDate`), giờ bắt đầu, số khung (1–6), số tuần (2–12) → tạo `RecurringSeries` + N đơn PENDING (mỗi tuần 1 đơn, cùng thứ trong tuần).
- Mặc định **all-or-nothing**: tuần nào trùng → 409 kèm danh sách ngày trùng. Tùy chọn `skipConflicts = true`: tạo các tuần trống, trả về danh sách ngày bị bỏ qua.
- Dùng lại `BookingsService.createBookingInTx(tx, …)` của Hiếu trong **một transaction** (kiểm tra trước các tuần trống, nếu có race → toàn bộ 409, người dùng thử lại).
- Chủ sân có thể **xác nhận cả chuỗi** (mọi đơn PENDING trong chuỗi). Khách có thể **hủy cả chuỗi** (hủy các đơn tương lai thỏa chính sách hủy).

### 6.10. Đánh giá (Dương)

- Chỉ khách của đơn **COMPLETED** được đánh giá; mỗi đơn **1** đánh giá (`Review.bookingId @unique`); `rating` 1–5, `comment` ≤ 1000 ký tự.
- Tạo/sửa/xóa đánh giá cập nhật `Venue.avgRating`, `Venue.reviewCount` **trong cùng transaction**.
- Chủ sân trả lời đánh giá (`ownerReply`) cho cụm sân của mình.

### 6.11. Khiếu nại (Dương)

- Khách gửi khiếu nại về 1 cụm sân (tùy chọn gắn 1 đơn của chính mình). Trạng thái: `OPEN → IN_PROGRESS → RESOLVED | REJECTED`. Admin xử lý, ghi `adminResponse`, `handledById`, `resolvedAt`.

### 6.12. Doanh thu (Dương)

- Doanh thu = tổng `totalPrice` các đơn **COMPLETED**, nhóm theo **ngày VN** hoặc **tháng VN** của `startAt`. Kèm số đơn, và (thêm) "doanh thu dự kiến" từ đơn CONFIRMED chưa diễn ra.
- Gom nhóm bằng **hàm thuần** `groupRevenue(rows, groupBy)` (có unit test), lấp các ngày/tháng không có doanh thu bằng 0.

### 6.13. Duyệt chủ sân (Hưng)

- Đăng ký chọn vai trò `CUSTOMER` hoặc `OWNER`. OWNER mới → `ownerStatus = PENDING`; được đăng nhập nhưng mọi API `/api/owner/*` trả **403 `OWNER_NOT_APPROVED`**, FE chuyển tới `/owner/pending`.
- Admin duyệt (`APPROVED`) hoặc từ chối (`REJECTED` + ghi chú) → emit `owner.approved` / `owner.rejected` → gửi email.
- Không cho đăng ký vai trò `ADMIN` (chỉ có qua seed).

### 6.14. Khóa tài khoản (Hưng)

- `status = LOCKED` → đăng nhập trả **403 `ACCOUNT_LOCKED`**; token cũ bị `JwtAuthGuard` chặn (guard đọc user từ DB mỗi request).

---

## 7. Cơ sở dữ liệu – Prisma schema (đầy đủ)

> Hưng tạo **toàn bộ** schema dưới đây trong giai đoạn nền để mọi người làm song song không xung đột migration. Mỗi thành viên **sở hữu** các model ghi trong comment: được thêm field/index/constraint, viết seed, viết service cho model đó (tạo migration mới với tên rõ ràng, vd `npx prisma migrate dev -n add_venue_amenities`).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ================= ENUMS (không đổi tên giá trị) =================
enum Role {
  CUSTOMER
  OWNER
  ADMIN
}

enum UserStatus {
  ACTIVE
  LOCKED
}

enum OwnerStatus {
  NONE
  PENDING
  APPROVED
  REJECTED
}

enum Sport {
  FOOTBALL
  BADMINTON
  PICKLEBALL
  TENNIS
  BASKETBALL
  VOLLEYBALL
}

enum VenueStatus {
  ACTIVE
  HIDDEN
}

enum DayType {
  WEEKDAY
  WEEKEND
}

enum BookingStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
  REJECTED
}

enum RecurringStatus {
  ACTIVE
  CANCELLED
}

enum ComplaintStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  REJECTED
}

// ================= [OWNER: Hưng] =================
model User {
  id           String      @id @default(cuid())
  email        String      @unique
  passwordHash String
  fullName     String
  phone        String?
  role         Role        @default(CUSTOMER)
  status       UserStatus  @default(ACTIVE)
  ownerStatus  OwnerStatus @default(NONE)
  ownerNote    String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  venues            Venue[]
  bookings          Booking[]
  holds             BookingHold[]
  recurringSeries   RecurringSeries[]
  reviews           Review[]
  complaints        Complaint[]        @relation("ComplaintAuthor")
  handledComplaints Complaint[]        @relation("ComplaintHandler")
  maintenanceBlocks MaintenanceBlock[]

  @@index([role, status])
}

// ================= [OWNER: Lâm] =================
model Venue {
  id                String      @id @default(cuid())
  ownerId           String
  owner             User        @relation(fields: [ownerId], references: [id])
  name              String
  slug              String      @unique
  description       String?
  address           String
  district          String
  city              String
  latitude          Float?
  longitude         Float?
  phone             String?
  imageUrls         String[]
  cancelBeforeHours Int         @default(2)
  status            VenueStatus @default(ACTIVE)
  avgRating         Float       @default(0)   // cập nhật bởi Reviews (Dương)
  reviewCount       Int         @default(0)   // cập nhật bởi Reviews (Dương)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  courts       Court[]
  openingHours OpeningHour[]
  reviews      Review[]
  complaints   Complaint[]

  @@index([city, district])
  @@index([ownerId])
}

model OpeningHour {
  id          String  @id @default(cuid())
  venueId     String
  venue       Venue   @relation(fields: [venueId], references: [id], onDelete: Cascade)
  dayOfWeek   Int     // 0=CN, 1=T2, ..., 6=T7
  isClosed    Boolean @default(false)
  openMinute  Int     // bội số 60, 0..1380
  closeMinute Int     // bội số 60, openMinute < closeMinute <= 1800 (qua nửa đêm nếu > 1440)

  @@unique([venueId, dayOfWeek])
}

model Court {
  id               String   @id @default(cuid())
  venueId          String
  venue            Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  name             String
  sport            Sport
  basePricePerHour Int
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  priceRules        PriceRule[]
  maintenanceBlocks MaintenanceBlock[]
  bookings          Booking[]
  slotLocks         SlotLock[]
  holds             BookingHold[]
  recurringSeries   RecurringSeries[]

  @@unique([venueId, name])
  @@index([sport])
}

model PriceRule {
  id           String  @id @default(cuid())
  courtId      String
  court        Court   @relation(fields: [courtId], references: [id], onDelete: Cascade)
  dayType      DayType
  startMinute  Int     // 0..1380, bội số 60
  endMinute    Int     // startMinute < endMinute <= 1440, bội số 60
  pricePerHour Int
  label        String?

  @@index([courtId, dayType])
}

model MaintenanceBlock {
  id          String   @id @default(cuid())
  courtId     String
  court       Court    @relation(fields: [courtId], references: [id], onDelete: Cascade)
  startAt     DateTime @db.Timestamptz(3)
  endAt       DateTime @db.Timestamptz(3)
  reason      String?
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())

  @@index([courtId, startAt])
}

// ================= [OWNER: Hiếu] =================
model Booking {
  id                String           @id @default(cuid())
  code              String           @unique
  customerId        String
  customer          User             @relation(fields: [customerId], references: [id])
  courtId           String
  court             Court            @relation(fields: [courtId], references: [id])
  startAt           DateTime         @db.Timestamptz(3)
  endAt             DateTime         @db.Timestamptz(3)
  totalPrice        Int
  priceBreakdown    Json             // PriceBreakdownItem[]
  status            BookingStatus    @default(PENDING)   // chuyển trạng thái: Dương
  contactPhone      String
  note              String?
  cancelReason      String?
  rejectReason      String?
  confirmedAt       DateTime?
  rejectedAt        DateTime?
  cancelledAt       DateTime?
  completedAt       DateTime?
  recurringSeriesId String?
  recurringSeries   RecurringSeries? @relation(fields: [recurringSeriesId], references: [id])
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  slotLocks  SlotLock[]
  review     Review?
  complaints Complaint[]

  @@index([courtId, startAt])
  @@index([customerId, createdAt])
  @@index([status, endAt])
}

model SlotLock {
  id        String       @id @default(cuid())
  courtId   String
  court     Court        @relation(fields: [courtId], references: [id], onDelete: Cascade)
  startAt   DateTime     @db.Timestamptz(3)
  bookingId String?
  booking   Booking?     @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  holdId    String?
  hold      BookingHold? @relation(fields: [holdId], references: [id], onDelete: Cascade)
  expiresAt DateTime?    @db.Timestamptz(3)
  createdAt DateTime     @default(now())

  @@unique([courtId, startAt]) // <<< RÀNG BUỘC CHỐNG ĐẶT TRÙNG
  @@index([bookingId])
  @@index([holdId])
  @@index([expiresAt])
}

model BookingHold {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courtId   String
  court     Court    @relation(fields: [courtId], references: [id], onDelete: Cascade)
  startAt   DateTime @db.Timestamptz(3)
  endAt     DateTime @db.Timestamptz(3)
  expiresAt DateTime @db.Timestamptz(3)
  createdAt DateTime @default(now())

  slotLocks SlotLock[]

  @@index([userId])
  @@index([expiresAt])
}

// ================= [OWNER: Dương] =================
model RecurringSeries {
  id          String          @id @default(cuid())
  customerId  String
  customer    User            @relation(fields: [customerId], references: [id])
  courtId     String
  court       Court           @relation(fields: [courtId], references: [id])
  dayOfWeek   Int
  startMinute Int
  slotCount   Int
  firstDate   String          // 'YYYY-MM-DD' (giờ VN)
  weeks       Int
  status      RecurringStatus @default(ACTIVE)
  createdAt   DateTime        @default(now())

  bookings Booking[]
}

model Review {
  id         String   @id @default(cuid())
  bookingId  String   @unique
  booking    Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  venueId    String
  venue      Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  rating     Int
  comment    String?
  ownerReply String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([venueId, createdAt])
}

model Complaint {
  id            String          @id @default(cuid())
  authorId      String
  author        User            @relation("ComplaintAuthor", fields: [authorId], references: [id])
  venueId       String
  venue         Venue           @relation(fields: [venueId], references: [id])
  bookingId     String?
  booking       Booking?        @relation(fields: [bookingId], references: [id])
  title         String
  content       String
  status        ComplaintStatus @default(OPEN)
  adminResponse String?
  handledById   String?
  handledBy     User?           @relation("ComplaintHandler", fields: [handledById], references: [id])
  resolvedAt    DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([status, createdAt])
}
```

> Hiếu thêm (migration riêng, SQL thủ công) CHECK constraint: `ALTER TABLE "SlotLock" ADD CONSTRAINT slotlock_owner_chk CHECK ((("bookingId" IS NOT NULL)::int + ("holdId" IS NOT NULL)::int) = 1);`

### 7.1. Sơ đồ quan hệ (tóm tắt)

```
User 1─n Venue 1─n Court 1─n PriceRule
              │        ├─n MaintenanceBlock
              │        ├─n SlotLock n─1 Booking / BookingHold
              │        └─n Booking n─1 User(customer)
              ├─n OpeningHour (7)
              ├─n Review 1─1 Booking
              └─n Complaint n─1 User(author), n─0..1 Booking
RecurringSeries 1─n Booking
```

### 7.2. Dữ liệu mẫu (seed) & tài khoản demo

| Email | Mật khẩu | Vai trò |
|---|---|---|
| admin@sango.vn | Admin@123 | ADMIN |
| owner@sango.vn | Owner@123 | OWNER (APPROVED) – sở hữu phần lớn cụm sân mẫu |
| owner2@sango.vn | Owner@123 | OWNER (APPROVED) |
| owner.pending@sango.vn | Owner@123 | OWNER (PENDING) |
| customer@sango.vn | Customer@123 | CUSTOMER |
| customer2@sango.vn | Customer@123 | CUSTOMER |

Khối lượng seed: ≥ 250 user (để test phân trang admin), ≥ 8 cụm sân / ≥ 24 sân con ở TP.HCM & Hà Nội (Lâm), ≥ 300 đơn trải 60 ngày trước → 14 ngày sau với đủ trạng thái (Dương), đánh giá & khiếu nại (Dương). `npm run db:seed` phải **idempotent** (xóa dữ liệu cũ theo thứ tự rồi tạo lại).

---

## 8. API – quy ước & danh sách endpoint

### 8.1. Quy ước

- Prefix: **`/api`** (`app.setGlobalPrefix('api')`). Dev: FE gọi `/api/...` qua **Vite proxy** tới `http://localhost:3000`.
- Xác thực: header `Authorization: Bearer <accessToken>`. JWT payload `{ sub: userId, role }`, hạn `JWT_EXPIRES_IN` (mặc định `1d`).
- **Mọi route mặc định yêu cầu đăng nhập** (JwtAuthGuard global). Route công khai đánh dấu `@Public()` (guard vẫn gắn `req.user` nếu có token hợp lệ).
- Phân quyền: `@Roles('OWNER')`, `@Roles('ADMIN')`, `@Roles('CUSTOMER')`. Route `@Roles('OWNER')` tự động yêu cầu `ownerStatus = APPROVED` (trừ route gắn `@AllowUnapprovedOwner()`).
- **Thành công:** `TransformInterceptor` bọc `{ "data": <payload> }`. Danh sách phân trang: `data = Paginated<T> = { items, page, pageSize, total, totalPages }`.
- Query phân trang chung: `page` (mặc định 1), `pageSize` (mặc định 20, tối đa 100; riêng `/owner/bookings` tối đa 500).
- Tạo mới trả **201**, cập nhật **200**, xóa **204** (không body).

### 8.2. Định dạng lỗi thống nhất (AllExceptionsFilter)

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "SLOT_ALREADY_BOOKED",
  "message": "Khung giờ bạn chọn vừa có người đặt. Vui lòng chọn khung khác.",
  "details": { "conflictedStartAts": ["2026-11-20T11:00:00.000Z"] },
  "path": "/api/bookings",
  "timestamp": "2026-11-15T08:00:00.000Z"
}
```

| HTTP | `code` | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod lỗi (`details` = mảng `{ path, message }`) |
| 401 | `UNAUTHORIZED` | Thiếu/sai/hết hạn token |
| 401 | `INVALID_CREDENTIALS` | Sai email/mật khẩu |
| 403 | `FORBIDDEN` | Sai vai trò hoặc không sở hữu tài nguyên |
| 403 | `ACCOUNT_LOCKED` | Tài khoản bị khóa |
| 403 | `OWNER_NOT_APPROVED` | Chủ sân chưa được duyệt |
| 404 | `NOT_FOUND` | Không tồn tại (Prisma `P2025` cũng map về đây) |
| 409 | `EMAIL_TAKEN` | Email đã đăng ký |
| 409 | `SLOT_ALREADY_BOOKED` | Trùng khung (Prisma `P2002` trên SlotLock) |
| 409 | `SLOT_UNAVAILABLE` | Khung ngoài giờ mở cửa / bảo trì / đã qua |
| 409 | `HOLD_EXPIRED` | Giữ chỗ hết hạn hoặc không hợp lệ |
| 409 | `INVALID_STATUS_TRANSITION` | Chuyển trạng thái đơn sai |
| 409 | `CANCELLATION_NOT_ALLOWED` | Vi phạm chính sách hủy |
| 409 | `MAINTENANCE_CONFLICT` | Bảo trì trùng đơn đang hiệu lực |
| 409 | `REVIEW_NOT_ALLOWED` | Đơn chưa hoàn thành / đã đánh giá |
| 409 | `CONFLICT` | Xung đột unique khác |
| 500 | `INTERNAL_ERROR` | Lỗi không lường trước (không lộ stack ra client) |

Ném lỗi trong service bằng `throw new AppException(HttpStatus.CONFLICT, 'SLOT_ALREADY_BOOKED', 'Thông điệp tiếng Việt', details?)`.

### 8.3. Danh sách endpoint

**Hưng – Auth / Users / Admin / Health**

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/health` | Public | `{ status: 'ok', db: 'up' }` |
| POST | `/api/auth/register` | Public | body `registerSchema` → 201 `AuthResponse` |
| POST | `/api/auth/login` | Public | body `loginSchema` → `AuthResponse` |
| GET | `/api/auth/me` | Đăng nhập | `UserDto` |
| PATCH | `/api/users/me` | Đăng nhập | cập nhật `fullName`, `phone` |
| PATCH | `/api/users/me/password` | Đăng nhập | `{ currentPassword, newPassword }` |
| GET | `/api/admin/users` | ADMIN | lọc `q, role, status, ownerStatus, page, pageSize` → `Paginated<UserDto>` |
| PATCH | `/api/admin/users/:id/status` | ADMIN | `{ status: 'ACTIVE'|'LOCKED' }` (không tự khóa chính mình) |
| PATCH | `/api/admin/users/:id/owner-approval` | ADMIN | `{ decision: 'APPROVED'|'REJECTED', note? }` |
| GET | `/api/admin/users/counts` | ADMIN | `{ all, customers, owners, pendingOwners, locked }` cho các tab trang Người dùng |
| GET | `/api/admin/stats/overview` | ADMIN | `AdminOverviewDto`: số liệu hôm nay (lượt đặt, tỉ lệ lấp sân, doanh thu, đơn chờ xác nhận), 7 ngày gần nhất, theo môn, theo trạng thái, chủ sân chờ duyệt, khiếu nại mở, top cụm sân – chi tiết `docs/Thiết kế/01_Hung_GIAO_DIEN.md` mục I |

**Lâm – Venues / Courts / Opening hours / Pricing / Maintenance**

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/owner/venues` | OWNER | cụm sân của tôi |
| POST | `/api/owner/venues` | OWNER | tạo cụm sân (tự sinh `slug`, tạo 7 OpeningHour mặc định 06:00–22:00) |
| GET | `/api/owner/venues/:id` | OWNER (sở hữu) | chi tiết + courts + openingHours |
| PATCH | `/api/owner/venues/:id` | OWNER (sở hữu) | cập nhật (`UpdateVenueInput = Partial<CreateVenueInput>`) |
| DELETE | `/api/owner/venues/:id` | OWNER (sở hữu) | ẩn (`status = HIDDEN`) → 204 |
| PUT | `/api/owner/venues/:id/opening-hours` | OWNER (sở hữu) | thay cả 7 ngày |
| POST | `/api/owner/venues/:id/courts` | OWNER (sở hữu) | tạo sân con |
| PATCH | `/api/owner/courts/:courtId` | OWNER (sở hữu) | sửa sân con / bật-tắt `isActive` |
| DELETE | `/api/owner/courts/:courtId` | OWNER (sở hữu) | xóa nếu chưa có đơn, có đơn → `isActive=false` |
| GET | `/api/owner/courts/:courtId/pricing` | OWNER (sở hữu) | `{ basePricePerHour, rules }` |
| PUT | `/api/owner/courts/:courtId/pricing` | OWNER (sở hữu) | body `pricingConfigSchema` – thay toàn bộ rule trong transaction |
| POST | `/api/owner/courts/:courtId/pricing/copy` | OWNER (sở hữu) | `{ targetCourtIds: string[] }` sao chép bảng giá |
| POST | `/api/pricing/quote` | Public | `{ courtId, startAt, endAt }` → `PriceQuote` |
| GET | `/api/owner/courts/:courtId/maintenance` | OWNER (sở hữu) | danh sách bảo trì sắp tới |
| POST | `/api/owner/courts/:courtId/maintenance` | OWNER (sở hữu) | tạo; trùng đơn → 409 `MAINTENANCE_CONFLICT` |
| DELETE | `/api/owner/maintenance/:id` | OWNER (sở hữu) | 204 |
| GET | `/api/venues/:slug` | Public | `VenueDetailDto` (info, courts active, openingHours, bảng giá tóm tắt, avgRating) – chỉ venue ACTIVE |
| GET | `/api/meta/locations` | Public | `{ city: string; districts: string[] }[]` lấy distinct từ venue ACTIVE |

**Hiếu – Search / Availability / Holds / Bookings (tạo đơn)**

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/venues` | Public | tìm kiếm: `q, sport, city, district, date, from(HH:mm), to(HH:mm), sort(rating|newest|name), page, pageSize` → `Paginated<VenueCardDto>` |
| GET | `/api/venues/:venueId/availability?date=` | Public | lưới **sân con × khung giờ** của 1 ngày |
| GET | `/api/courts/:courtId/availability?weekStart=` | Public (owner sở hữu thấy thêm thông tin đơn) | lưới **ngày × khung giờ** 7 ngày |
| POST | `/api/holds` | CUSTOMER | `{ courtId, startAt, endAt }` → 201 `HoldDto` ; trùng → 409 |
| DELETE | `/api/holds/:id` | CUSTOMER (chủ hold) | 204 |
| POST | `/api/bookings` | CUSTOMER | `createBookingSchema` (`courtId, startAt, endAt, contactPhone, note?, holdId?`) → 201 `BookingDto` ; trùng → 409 |

> Lưu ý route: `GET /api/venues` (Hiếu – SearchController) và `GET /api/venues/:slug` (Lâm – VenuesPublicController) cùng prefix nhưng khác controller – hợp lệ. Path `:venueId/availability` có 2 segment nên không đụng `:slug`.

**Dương – Booking lifecycle / Recurring / Reviews / Complaints / Stats**

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/me/bookings` | CUSTOMER | `status?, page, pageSize` → `Paginated<BookingDto>` |
| GET | `/api/bookings/:id` | CUSTOMER chủ đơn / OWNER của sân / ADMIN | `BookingDto` (+ `allowedActions`) |
| PATCH | `/api/bookings/:id/cancel` | CUSTOMER chủ đơn / ADMIN | `{ reason? }` – kiểm tra chính sách hủy |
| GET | `/api/owner/bookings` | OWNER | `venueId?, courtId?, status?, from?, to?, page, pageSize(≤500)` |
| PATCH | `/api/owner/bookings/:id/confirm` | OWNER (sở hữu) | |
| PATCH | `/api/owner/bookings/:id/reject` | OWNER (sở hữu) | `{ reason }` bắt buộc |
| PATCH | `/api/owner/bookings/:id/complete` | OWNER (sở hữu) | chỉ khi `endAt <= now` |
| POST | `/api/recurring/preview` | CUSTOMER | `recurringPreviewSchema` → `RecurringPreviewDto` (từng tuần trống/không, giá) |
| POST | `/api/recurring` | CUSTOMER | `createRecurringSchema` → 201 `{ series, created: BookingDto[], skippedDates: string[] }` |
| GET | `/api/me/recurring` | CUSTOMER | danh sách chuỗi |
| PATCH | `/api/me/recurring/:id/cancel` | CUSTOMER (chủ chuỗi) | hủy các đơn tương lai hợp lệ |
| PATCH | `/api/owner/recurring/:id/confirm` | OWNER (sở hữu) | xác nhận mọi đơn PENDING của chuỗi |
| POST | `/api/reviews` | CUSTOMER | `{ bookingId, rating, comment? }` |
| PATCH | `/api/reviews/:id` / DELETE | CUSTOMER (chủ review) | |
| GET | `/api/venues/:venueId/reviews` | Public | `Paginated<ReviewDto>` |
| PATCH | `/api/owner/reviews/:id/reply` | OWNER (sở hữu venue) | `{ reply }` |
| GET | `/api/owner/reviews` | OWNER | đánh giá các cụm sân của tôi |
| POST | `/api/complaints` | CUSTOMER | `{ venueId, bookingId?, title, content }` |
| GET | `/api/me/complaints` | CUSTOMER | |
| GET | `/api/admin/complaints` | ADMIN | `status?, page` |
| PATCH | `/api/admin/complaints/:id` | ADMIN | `{ status, adminResponse }` |
| GET | `/api/owner/stats/revenue` | OWNER | `venueId?, from, to, groupBy=day|month` → `RevenuePoint[]` + tổng |
| GET | `/api/owner/stats/summary` | OWNER | KPI: đơn hôm nay, chờ xác nhận, doanh thu tháng, rating TB |

### 8.4. Kiểu dữ liệu chính trong shared (tóm tắt – chi tiết do người sở hữu viết)

```ts
// types/api.ts (Hưng)
export interface ApiResponse<T> { data: T }
export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number }
export interface ApiErrorBody { statusCode: number; error: string; code: ErrorCode; message: string; details?: unknown; path: string; timestamp: string }

// types/user.ts (Hưng)
export interface UserDto { id: string; email: string; fullName: string; phone: string | null; role: Role; status: UserStatus; ownerStatus: OwnerStatus; createdAt: string }
export type AuthUser = Pick<UserDto, 'id' | 'email' | 'fullName' | 'role' | 'ownerStatus'>;
export interface AuthResponse { user: UserDto; accessToken: string }

// types/pricing.ts (Lâm)
export interface PriceRuleDto { id: string; dayType: DayType; startMinute: number; endMinute: number; pricePerHour: number; label: string | null }
export interface PriceBreakdownItem { startAt: string; endAt: string; price: number; label: string | null }
export interface PriceQuote { total: number; breakdown: PriceBreakdownItem[] }

// types/availability.ts (Hiếu)
export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'HELD' | 'HELD_BY_ME' | 'MAINTENANCE' | 'CLOSED' | 'PAST';
export interface AvailabilitySlot { startAt: string; endAt: string; minuteOfDay: number; status: SlotStatus; price: number | null; label: string | null; booking?: SlotBookingInfo }
export interface SlotBookingInfo { id: string; code: string; status: BookingStatus; customerName: string } // chỉ trả cho OWNER sở hữu
export interface CourtWeekAvailability { court: CourtSummaryDto; weekStart: string; days: { date: string; isClosed: boolean; slots: AvailabilitySlot[] }[] }
export interface VenueDayAvailability { venueId: string; date: string; courts: { court: CourtSummaryDto; slots: AvailabilitySlot[] }[] }

// types/booking.ts (Hiếu)
export interface BookingDto {
  id: string; code: string; status: BookingStatus;
  court: { id: string; name: string; sport: Sport };
  venue: { id: string; name: string; slug: string; address: string };
  customer: { id: string; fullName: string; phone: string | null };
  startAt: string; endAt: string; totalPrice: number; priceBreakdown: PriceBreakdownItem[];
  contactPhone: string; note: string | null; cancelReason: string | null; rejectReason: string | null;
  recurringSeriesId: string | null; createdAt: string;
}
```

---

## 9. Ma trận phân quyền (RBAC) & các lớp bảo vệ

| Chức năng | Guest | CUSTOMER | OWNER (APPROVED) | ADMIN |
|---|:-:|:-:|:-:|:-:|
| Tìm sân, xem chi tiết, lịch trống, đánh giá | ✅ | ✅ | ✅ | ✅ |
| Đăng ký / đăng nhập | ✅ | – | – | – |
| Hồ sơ cá nhân, đổi mật khẩu | ❌ | ✅ | ✅ (kể cả PENDING) | ✅ |
| Giữ chỗ, đặt sân, đặt lịch cố định | ❌ (→ /login) | ✅ | ❌ | ❌ |
| Xem lịch sử / chi tiết đơn | ❌ | ✅ (đơn của mình) | ✅ (đơn tại sân mình) | ✅ (mọi đơn) |
| Hủy đơn | ❌ | ✅ (của mình, theo chính sách) | ❌ | ✅ |
| Đánh giá sân / gửi khiếu nại | ❌ | ✅ (đơn COMPLETED của mình) | ❌ | ❌ |
| Quản lý cụm sân, sân con, giờ mở cửa, bảng giá, bảo trì | ❌ | ❌ | ✅ (của mình) | ❌ |
| Xác nhận / từ chối / hoàn thành đơn, xác nhận chuỗi | ❌ | ❌ | ✅ (sân của mình) | ❌ |
| Xem lịch sân (lưới chế độ chủ sân), doanh thu, trả lời đánh giá | ❌ | ❌ | ✅ (của mình) | ❌ |
| Duyệt chủ sân, quản lý/khóa người dùng, thống kê tổng | ❌ | ❌ | ❌ | ✅ |
| Xử lý khiếu nại | ❌ | ❌ | ❌ | ✅ |

**Các lớp bảo vệ:**

1. **FE (trải nghiệm):** HOC `withAuthGuard(Component, { roles, allowUnapprovedOwner? })` bọc các layout `CustomerLayout`, `OwnerLayout`, `AdminLayout` → chưa đăng nhập chuyển `/login?redirect=...`, sai vai trò → `/403`, owner chưa duyệt → `/owner/pending`.
2. **BE route:** `JwtAuthGuard` (global, xác thực + nạp user từ DB + chặn LOCKED) → `RolesGuard` (global, đọc `@Roles`, chặn OWNER chưa duyệt).
3. **BE tầng dữ liệu (Service):** truy vấn luôn kèm điều kiện sở hữu, vd `prisma.venue.findFirst({ where: { id, ownerId: user.id } })`; tài nguyên tồn tại nhưng không thuộc user → **403**, không tồn tại → **404**. Kiểm tra trạng thái (máy trạng thái, chính sách hủy) cũng ở đây.
4. **DB:** `UNIQUE(courtId, startAt)` (SlotLock), `UNIQUE(bookingId)` (Review), `UNIQUE(venueId, dayOfWeek)`…

---

## 10. Frontend

### 10.1. Routes (React Router 7 data mode, mọi page lazy)

| Path | Layout / guard | Trang | Người làm |
|---|---|---|---|
| `/` | MainLayout | HomePage (hero + ô tìm kiếm nhanh + sân nổi bật) | Hiếu (Hưng tạo placeholder) |
| `/login`, `/register` | AuthLayout | Đăng nhập / Đăng ký (chọn vai trò) | Hưng |
| `/venues` | MainLayout | Tìm sân (bộ lọc đồng bộ URL, debounce, phân trang, tab Bản đồ) | Hiếu |
| `/venues/:slug` | MainLayout | Chi tiết cụm sân (ảnh, thông tin, bảng giá, bản đồ, lưới lịch, đánh giá) | Lâm (nhúng component của Hiếu, Dương) |
| `/booking/checkout` | CustomerLayout (CUSTOMER) | Xác nhận đặt sân + đếm ngược giữ chỗ | Hiếu |
| `/me/profile` | Đăng nhập (mọi vai trò) | Hồ sơ, đổi mật khẩu | Hưng |
| `/me/bookings`, `/me/bookings/:id` | CustomerLayout | Lịch sử đặt, chi tiết, hủy, đánh giá, khiếu nại | Dương |
| `/me/recurring`, `/me/recurring/new` | CustomerLayout | Lịch cố định hàng tuần | Dương |
| `/me/complaints` | CustomerLayout | Khiếu nại của tôi | Dương |
| `/owner/pending` | Đăng nhập OWNER (allowUnapproved) | Thông báo chờ duyệt | Hưng |
| `/owner` | OwnerLayout | Dashboard doanh thu + KPI | Dương |
| `/owner/venues`, `/owner/venues/new`, `/owner/venues/:id` | OwnerLayout | Quản lý cụm sân (tab: Thông tin, Sân con, Giờ mở cửa, Vị trí) | Lâm |
| `/owner/courts/:courtId/pricing` | OwnerLayout | Cấu hình bảng giá | Lâm |
| `/owner/courts/:courtId/maintenance` | OwnerLayout | Lịch bảo trì | Lâm |
| `/owner/schedule` | OwnerLayout | Lịch sân dạng lưới (AvailabilityGrid chế độ chủ sân) | Hiếu |
| `/owner/bookings` | OwnerLayout | Danh sách đơn (virtualized) + xác nhận/từ chối | Dương |
| `/owner/reviews` | OwnerLayout | Đánh giá & trả lời | Dương |
| `/admin` | AdminLayout | Tổng quan thống kê | Hưng |
| `/admin/users` | AdminLayout | Quản lý người dùng + duyệt chủ sân | Hưng |
| `/admin/complaints` | AdminLayout | Xử lý khiếu nại | Dương |
| `/403` | MainLayout | ForbiddenPage | Hưng |
| `*` | MainLayout | NotFoundPage | Hưng |

Mỗi route gốc có `errorElement: <ErrorPage />`.

### 10.2. State

- `store.ts`: `reducer = { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer, bookingDraft: bookingDraftReducer, ... }`.
- `baseApi` (`common/api/baseApi.ts`, Hưng): `createApi({ reducerPath: 'api', baseQuery, tagTypes: ['Me','User','AdminStats','Venue','OwnerVenue','Court','Pricing','Maintenance','Location','Availability','Hold','Booking','Recurring','Review','Complaint','Stats'], endpoints: () => ({}) })`. `baseQuery` tự gắn token, **tự bóc `data`** từ envelope, chuẩn hóa lỗi về `ApiErrorBody`, gặp 401 thì dispatch `loggedOut()`.
- Mỗi feature: `export const venueApi = baseApi.injectEndpoints({ endpoints: (build) => ({ ... }) })`.
- Hiển thị lỗi: `getErrorMessage(error: unknown): string` (dùng type guard `isApiErrorBody`).
- Context: `ThemeContext` (light/dark, lưu localStorage), `LanguageContext` (vi/en cho layout/menu/nhãn chung, hàm `t(key)`).

### 10.3. Component dùng chung quan trọng

- `components/*` (Hưng, dựa trên antd – chi tiết `docs/Thiết kế/00_HE_THONG_THIET_KE.md` mục 8): `BrandLogo`, `CourtLines`, `PageHeader`, `Section`, `StatusDot`, `EmptyState`, `FullPageSpinner`, `RHFInput`/`RHFPassword`/`RHFSelect`/`RHFTextArea`, `ConfirmAction`, `DashboardShell`. Chia theo nhóm branding, feedback, forms, icons, layout; xem `FE/src/components/README.md`. Các thành phần cơ bản (Button, Input, Table, Modal…) dùng trực tiếp từ antd.
- `features/availability` (Hiếu): `AvailabilityGrid` (Compound: `AvailabilityGrid.Toolbar`, `.WeekNav`, `.Header`, `.Body`, `.Legend`; Render Props `renderCell`) + hook `useCourtWeekAvailability`, `useSlotSelection<TSlot>`; component ghép sẵn `CourtWeekSchedule` (dùng ở `/venues/:slug`) và dùng lại ở `/owner/schedule`.
- `features/map` (Lâm): `LocationPicker`, `VenueMap`, `VenuesMap`.
- `features/reviews` (Dương): `VenueReviews` (nhúng vào trang chi tiết), `RatingStars`.
- `features/my-bookings` (Dương): `BookingStatusBadge`.

---

## 11. Kiểm thử

| Loại | Công cụ | Vị trí | Lệnh |
|---|---|---|---|
| shared (hàm thuần) | Vitest | `shared/src/**/*.test.ts` | `npm test -w @sango/shared` |
| BE unit/service | Jest + jest-mock-extended (mock PrismaService) | `BE/src/**/*.spec.ts` | `npm test -w @sango/be` |
| FE | Vitest + RTL + user-event + MSW | `FE/src/**/__tests__/*.test.tsx` | `npm test -w @sango/fe` |
| Coverage | v8 / jest --coverage | | `npm run test:cov` |

- FE: `renderWithProviders(ui, { preloadedState, route })` trong `FE/src/test/test-utils.tsx`; MSW handler đặt theo feature `features/<x>/__tests__/handlers.ts` và đăng ký trong test.
- Ngưỡng coverage ≥ 50% cho: `shared/src/{utils,booking}`, `BE/src/modules/**/*.{service,calculator,policy,util}.ts`, `FE/src/features/**/{hooks,utils,model}` + `FE/src/common/{hooks,api}`.
- Mỗi người tối thiểu: **4 test FE** (ít nhất 1 test tương tác user, 1 test async có mock API) + unit test hàm thuần/service BE của mình. Tổng FE ≥ 15.

---

## 12. Môi trường & chạy dự án

### 12.1. Biến môi trường

`BE/.env.example`
```
DATABASE_URL=postgresql://sango:sango@localhost:5432/sango?schema=public
PORT=3000
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:5173
APP_URL=http://localhost:5173
MAIL_ENABLED=true
MAIL_PROVIDER=smtp            # smtp | brevo
MAIL_FROM="SanGo <no-reply@sango.local>"
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
BREVO_API_KEY=
```

`FE/.env.example`
```
VITE_API_URL=/api
VITE_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

### 12.2. Lệnh

```bash
npm install                 # ở thư mục gốc (cài cho cả 3 workspace)
docker compose up -d        # Postgres :5432, Mailpit SMTP :1025, UI http://localhost:8025
cp BE/.env.example BE/.env && cp FE/.env.example FE/.env
npm run db:migrate          # prisma migrate dev
npm run db:seed             # dữ liệu mẫu
npm run dev                 # build shared + chạy song song shared(watch), BE :3000, FE :5173
npm test                    # chạy test cả 3 workspace
```

> Sửa code trong `shared/` → `tsc --watch` build lại `dist`; FE nhận ngay (alias tới `src`), BE cần restart nếu Nest không tự reload.

---

## 13. Git workflow & Definition of Done

- Repo GitHub: `<MãNhóm>_LTWNC_CuoiKy`. Nhánh `main` được bảo vệ, chỉ merge qua Pull Request (≥ 1 thành viên khác review).
- Nhánh tính năng: `feat/<ten>-<chuc-nang>` (vd `feat/hieu-booking-create`, `feat/lam-pricing`). Sửa lỗi: `fix/<ten>-<mo-ta>`.
- Commit nhỏ, theo tính năng, Conventional Commits, **tiếng Anh hoặc tiếng Việt không dấu đều được nhưng thống nhất**.
- Trước khi mở PR: `git pull origin main` (rebase/merge), `npm run lint`, `npm test`, `npm run build` đều pass.
- Xung đột ở file chung (`schema.prisma`, `app.module.ts`, `router.tsx`, `shared/src/index.ts`): giữ **cả hai** phía.

**Definition of Done cho mỗi chức năng:**
1. DB (model/migration/seed) + BE (module/controller/service/mapper, validate Zod, phân quyền 2 lớp, mã lỗi đúng) + shared (type/schema) + FE (page/component, gọi API qua RTK Query, loading/empty/error state, responsive, title động, lazy route) **hoàn chỉnh**.
2. Có test theo yêu cầu, `npm test` xanh.
3. Không còn `any` không chú thích, không `console.log` thừa, không dữ liệu giả cứng.
4. Cập nhật checklist trong file phân công và phần báo cáo của mình.

---

## 14. Phân công tóm tắt

| Thành viên | Phạm vi (làm trọn DB + BE + API + FE + test) | File chi tiết |
|---|---|---|
| **Hưng** (làm đầu tiên) | **Nền tảng toàn dự án** (monorepo, shared, NestJS core, FE skeleton, test setup, Docker, seed, README) + Đăng ký/Đăng nhập/RBAC + Hồ sơ + Admin quản lý người dùng & duyệt chủ sân + Thống kê tổng admin + Theme/Language Context + **Email (nâng cao)** + **Deploy & CI** + Lighthouse | `docs/Phân chia/01_Hung.md` |
| **Hiếu** | Tìm sân (bộ lọc, URL, debounce) + Trang chủ + API lịch trống + **AvailabilityGrid** (Compound/Render Props, tái sử dụng) + Lịch sân chủ sân + **Tạo đơn chống trùng (409 + test đồng thời)** + Checkout + **Giữ chỗ 5 phút (nâng cao)** | `docs/Phân chia/02_Hieu.md` |
| **Lâm** | Quản lý cụm sân & sân con + Giờ mở cửa (qua nửa đêm) + **Bảng giá (form phức tạp, schema dùng chung, hàm tính giá thuần + test biên)** + Bảo trì + Trang chi tiết sân công khai + **Bản đồ (nâng cao)** | `docs/Phân chia/03_Lam.md` |
| **Dương** | **Máy trạng thái đơn** + **Chính sách hủy (hàm thuần + test biên)** + Lịch sử đặt của khách + Quản lý đơn của chủ sân (virtualized) + Cron tự hoàn thành + Đánh giá + Khiếu nại (khách & admin) + Doanh thu (biểu đồ) + **Đặt lịch cố định hàng tuần (nâng cao)** | `docs/Phân chia/04_Duong.md` |

Xem thứ tự, phụ thuộc và lịch tổng ở `docs/Phân chia/00_TONG_QUAN_PHAN_CONG.md`.

---

## 15. Sản phẩm nộp (theo đề)

1. Repo Git có **README** (cài đặt, chạy, tài khoản demo từng vai trò, lệnh seed) – Hưng viết khung, mọi người bổ sung phần mình.
2. **Báo cáo PDF ≤ 20 trang** (A4, bìa, mục lục, đánh số trang, hình/bảng có chú thích): giới thiệu & chức năng; kiến trúc + sơ đồ + cấu trúc thư mục + sơ đồ CSDL; ma trận phân quyền & lớp bảo vệ; giải thích lựa chọn state/pattern; minh chứng hiệu năng trước/sau + kết quả test/coverage; ảnh giao diện; bảng phân công & % đóng góp; kết luận. Mỗi người viết phần của mình trong `docs/bao-cao/`.
3. **Video demo 5–10 phút** các luồng chính.
4. **Link deploy** (Vercel + Render + Neon) – cộng điểm.
