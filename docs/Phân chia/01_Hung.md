# PHÂN CÔNG: HƯNG – Nền tảng dự án + Xác thực/Phân quyền + Quản trị người dùng + Email + Deploy

> **Đọc trước:** `docs/Đề bài/TONG_QUAN_DE_TAI.md`. File này mô tả chính xác việc Hưng phải làm.
> Hưng là **người làm đầu tiên**: mục tiêu số 1 là dựng **website chạy ổn định** (GĐ0) để Hiếu, Lâm, Dương vào làm tiếp.

## 0. Prompt mẫu cho AI agent

```
Bạn là AI coding agent hỗ trợ Hưng trong dự án SanGo.
Đọc docs/Đề bài/TONG_QUAN_DE_TAI.md và docs/Phân chia/01_Hung.md.
Làm task <H0.x / H1 / ...> đúng mô tả. Chỉ sửa trong phạm vi sở hữu của Hưng (mục 1).
Viết test kèm theo; `npm test` và `npm run build` phải pass. Tick checklist khi xong.
```

## 1. Phạm vi sở hữu

| Tầng | Sở hữu |
|---|---|
| Gốc repo | `package.json`, `docker-compose.yml`, `.gitignore`, `.editorconfig`, `.prettierrc`, `.nvmrc`, `README.md`, `CLAUDE.md`, `AGENTS.md`, `.github/workflows/ci.yml` |
| shared | `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts` (barrel), `src/constants/*`, `src/types/api.ts`, `src/types/user.ts`, `src/schemas/common.schema.ts`, `auth.schema.ts`, `user.schema.ts`, `src/utils/time.ts`, `src/utils/type-guards.ts` |
| DB | Toàn bộ `schema.prisma` ban đầu (khung chung) + **model `User`**; `prisma/seed.ts` (điều phối) + `prisma/seed/users.seed.ts` |
| BE | `main.ts`, `app.module.ts`, `config/`, `prisma/`, `common/**`, `modules/health`, `modules/auth`, `modules/users`, `modules/admin`, `modules/mail` |
| FE | `main.tsx`, `app/**`, `common/**`, `layouts/**`, `pages/**`, `test/**`, `features/auth`, `features/profile`, `features/admin-users`, `features/admin-dashboard`, `vite.config.ts`, `index.html`, `styles/global.css`, `common/theme/` |
| Docs | `docs/bao-cao/hung.md` |

---

## 2. GIAI ĐOẠN 0 – NỀN TẢNG (ưu tiên tuyệt đối, làm xong trước khi làm task khác)

### ✅ Mục tiêu nghiệm thu GĐ0

Sau khi clone repo, một thành viên chạy:
```bash
npm install && docker compose up -d && cp BE/.env.example BE/.env && cp FE/.env.example FE/.env
npm run db:migrate && npm run db:seed && npm run dev
```
→ FE `http://localhost:5173` hiển thị trang chủ placeholder có header/footer responsive, đăng ký/đăng nhập được bằng tài khoản seed, vào `/admin` bằng admin, vào `/owner` bằng owner (trang placeholder), owner pending bị chuyển `/owner/pending`, URL lạ hiện 404; BE `http://localhost:3000/api/health` trả `{"data":{"status":"ok","db":"up"}}`; `npm test` xanh ở cả 3 workspace; `npm run build` thành công.

---

### ⚡ ĐÃ DỰNG SẴN (15/11/2026) – agent KHÔNG làm lại, chỉ làm phần "CÒN LẠI"

Đã có và đã kiểm tra (`npm run build`, `npm test`, `npm run lint` đều pass):
- Gốc: `package.json` (workspaces + scripts dev/build/test/lint/db:*), `.gitignore`, `.nvmrc`, `.editorconfig`, `.prettierrc`, `docker-compose.yml` (postgres:16 + mailpit); devDeps `typescript@~5.9.3`, `concurrently`, `prettier`.
- `shared/`: `package.json`, `tsconfig.json`, `vitest.config.mts`, `src/index.ts` (mới có `APP_NAME`), cài `zod@^3.25`, `vitest`.
- `BE/`: khung NestJS 11, `tsconfig.json` **strict**, `eslint.config.mjs` (cấm `any`), `.env.example` + `.env`, `prisma/schema.prisma` **đầy đủ theo mục 7 tổng quan (đã validate + generate)**, thư mục `prisma/seed/` trống, đã cài mọi dependency ở H0.3 (+ jest, jest-mock-extended, supertest, tsx, prisma 6).
- `FE/`: khung Vite 8 + React 19, `vite.config.ts` (alias `@`, `@sango/shared`, proxy `/api`, cấu hình Vitest + coverage), `tsconfig.app.json` **strict** + paths, `eslint.config.js` (cấm `any`, react-hooks), **antd 6 + @ant-design/icons** (Tailwind đã gỡ), `src/styles/global.css`, font Be Vietnam Pro, `.env.example` + `.env`, `src/test/setup.ts`, 1 smoke test; đã cài mọi dependency ở H0.5 (+ recharts, leaflet, react-leaflet cho Dương/Lâm). Thiết kế giao diện: `docs/Thiết kế/`.

**CÒN LẠI của GĐ0:** `git init` + repo GitHub + `CLAUDE.md`/`AGENTS.md` gốc + README (H0.1); constants/types/schemas/utils của shared + test (H0.2); toàn bộ code core NestJS: config, prisma module, common/* , health (H0.3); bật Docker Desktop → `docker compose up -d` → `npm run db:migrate -- -n init` → seed users (H0.4); app/, common/, layouts/, pages/, router, store, baseApi, UI kit, MSW, test-utils (H0.5); CI (H0.6).

### H0.1 – Khung repo & monorepo (GĐ0a – push trong 1–2 ngày đầu)

- [ ] `git init`, tạo repo GitHub `<MãNhóm>_LTWNC_CuoiKy`, bật branch protection cho `main`, mời 3 thành viên.
- [x] `.gitignore`: `node_modules`, `dist`, `build`, `coverage`, `.env`, `.env.*` (trừ `.env.example`), `*.log`, `.DS_Store`, `BE/uploads`.
- [x] `.nvmrc` = `22`; `.editorconfig` (utf-8, lf, indent 2); `.prettierrc` `{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }`.
- [x] Tạo `CLAUDE.md` và `AGENTS.md` ở gốc với nội dung: "Trước khi làm bất cứ việc gì, đọc `docs/Đề bài/TONG_QUAN_DE_TAI.md` và file phân công của thành viên trong `docs/Phân chia/`. Tuân thủ mục 0 của file tổng quan."
- [x] Root `package.json`:

```json
{
  "name": "sango",
  "private": true,
  "workspaces": ["shared", "BE", "FE"],
  "scripts": {
    "build:shared": "npm run build -w @sango/shared",
    "dev": "npm run build:shared && concurrently -k -n shared,be,fe -c gray,blue,green \"npm run dev -w @sango/shared\" \"npm run start:dev -w @sango/be\" \"npm run dev -w @sango/fe\"",
    "build": "npm run build:shared && npm run build -w @sango/be && npm run build -w @sango/fe",
    "test": "npm run build:shared && npm run test -w @sango/shared && npm run test -w @sango/be && npm run test -w @sango/fe",
    "test:cov": "npm run build:shared && npm run test:cov -w @sango/shared && npm run test:cov -w @sango/be && npm run test:cov -w @sango/fe",
    "lint": "npm run lint -w @sango/be && npm run lint -w @sango/fe",
    "db:migrate": "npm run prisma:migrate -w @sango/be",
    "db:seed": "npm run prisma:seed -w @sango/be",
    "db:reset": "npm run prisma:reset -w @sango/be"
  },
  "devDependencies": { "concurrently": "^9.0.0", "prettier": "^3.3.0" }
}
```

- [x] `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: sango, POSTGRES_PASSWORD: sango, POSTGRES_DB: sango }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  mailpit:
    image: axllent/mailpit:latest
    ports: ["1025:1025", "8025:8025"]
volumes:
  pgdata:
```

### H0.2 – Package `shared` (@sango/shared)

- [x] `shared/package.json`: `name: "@sango/shared"`, `main: "dist/index.js"`, `types: "dist/index.d.ts"`, scripts `build: tsc -p tsconfig.json`, `dev: tsc -p tsconfig.json --watch --preserveWatchOutput`, `test: vitest run`, `test:cov: vitest run --coverage`; dependency `zod@^3.23`; devDeps `typescript`, `vitest`, `@vitest/coverage-v8`.
- [x] `shared/tsconfig.json`: `target ES2022`, `module commonjs`, `moduleResolution node`, `declaration true`, `outDir dist`, `rootDir src`, `strict true`, `esModuleInterop true`, `skipLibCheck true`, exclude `**/*.test.ts`.
- [x] `src/constants/`:
  - `roles.ts`: `ROLES = ['CUSTOMER','OWNER','ADMIN'] as const`, `type Role`; `USER_STATUSES`, `OWNER_STATUSES` + type; `ROLE_LABELS: Record<Role, string>`.
  - `sports.ts`: `SPORTS = ['FOOTBALL','BADMINTON','PICKLEBALL','TENNIS','BASKETBALL','VOLLEYBALL'] as const`, `type Sport`, `SPORT_LABELS: Record<Sport, string>` (Bóng đá mini, Cầu lông, Pickleball, Tennis, Bóng rổ, Bóng chuyền).
  - `booking-status.ts`: `BOOKING_STATUSES`, `type BookingStatus`, `BOOKING_STATUS_LABELS: Record<BookingStatus, string>` (Chờ xác nhận, Đã xác nhận, Hoàn thành, Đã hủy, Từ chối). Cũng khai báo `DAY_TYPES`, `VENUE_STATUSES`, `COMPLAINT_STATUSES`, `RECURRING_STATUSES` (mirror enum Prisma).
  - `time.ts`: `VN_UTC_OFFSET_MINUTES = 420`, `SLOT_MINUTES = 60`, `MAX_SLOTS_PER_BOOKING = 6`, `MAX_CLOSE_MINUTE = 1800`, `HOLD_TTL_MINUTES = 5`.
  - `error-codes.ts`: `ERROR_CODES` (đủ bảng 8.2 của tổng quan) `as const`, `type ErrorCode`.
- [x] `src/types/api.ts`: `ApiResponse<T>`, `Paginated<T>`, `ApiErrorBody`, `ValidationIssue { path: string; message: string }`.
- [x] `src/types/user.ts`: `UserDto`, `AuthUser = Pick<UserDto, ...>`, `AuthResponse`, `JwtPayload { sub: string; role: Role }`.
- [x] `src/schemas/common.schema.ts`: `idSchema`, `dateStrSchema` (regex `^\d{4}-\d{2}-\d{2}$` + kiểm tra ngày hợp lệ), `isoDateTimeSchema`, `timeStrSchema` (`HH:mm`), `paginationQuerySchema` (`page` coerce int ≥1 mặc định 1, `pageSize` coerce int 1..100 mặc định 20), `phoneVnSchema` (`^(0|\+84)\d{9}$`).
- [x] `src/schemas/auth.schema.ts`: `registerSchema` { email, password (≥8, có chữ hoa, chữ thường, số), confirmPassword (refine khớp), fullName (2..100), phone? , role: `z.enum(['CUSTOMER','OWNER'])` }, `loginSchema`; export `type RegisterInput = z.infer<...>` (FE dùng cả confirmPassword; BE dùng `registerSchema` nguyên vẹn).
- [x] `src/schemas/user.schema.ts`: `updateProfileSchema`, `changePasswordSchema`, `adminUserQuerySchema` (= `paginationQuerySchema.extend({ q, role, status, ownerStatus })`), `updateUserStatusSchema`, `ownerApprovalSchema` { decision, note? (bắt buộc khi REJECTED – refine) }.
- [x] `src/utils/time.ts`: viết đúng các hàm ở mục 6.1 tổng quan, **thuần**, chỉ dùng `Date.UTC`/`getUTC*` cộng offset 420 phút (không phụ thuộc TZ máy).
- [x] `src/utils/type-guards.ts`: `isOneOf<T extends readonly string[]>(values: T, x: unknown): x is T[number]` (generic), `isRole`, `isBookingStatus`, `isApiErrorBody(x: unknown): x is ApiErrorBody`, `isApiResponse<T>(x: unknown): x is ApiResponse<T>`.
- [x] `src/index.ts` export tất cả.
- [x] Test Vitest: `utils/time.test.ts` (≥ 8 case: đổi múi giờ quanh 17:00 UTC = 00:00 VN, minute ≥ 1440, startOfWeek khi là CN, enumerateSlotStarts, formatMinute "01:00 (+1)"), `type-guards.test.ts`.

### H0.3 – Backend NestJS khung

- [ ] **KHÔNG xóa `BE/`** (đã có `BE/CLAUDE.md` – file rule cho agent). Tạo project ở thư mục tạm rồi chép vào: `npx @nestjs/cli@11 new be-tmp --skip-git --skip-install --package-manager npm --strict` → chép toàn bộ nội dung `be-tmp/` vào `BE/` (giữ nguyên `BE/CLAUDE.md`) → xóa `be-tmp/`. Không giữ `package-lock.json` con (cài từ gốc), đổi `name` thành `@sango/be`, thêm dependency `"@sango/shared": "*"`.
- [x] `BE/tsconfig.json`: `strict: true` (bỏ các cờ nới lỏng mặc định của Nest như `strictNullChecks: false`, `noImplicitAny: false`).
- [x] Cài: `@nestjs/config @nestjs/jwt @nestjs/schedule @nestjs/event-emitter @prisma/client@^6 bcryptjs helmet nodemailer zod@^3.23` ; dev: `prisma@^6 tsx jest-mock-extended @types/bcryptjs @types/nodemailer`.
- [x] Scripts BE: `prisma:migrate: prisma migrate dev`, `prisma:seed: prisma db seed`, `prisma:reset: prisma migrate reset --force`, `prisma:generate: prisma generate`, `test:cov: jest --coverage`, `postinstall: prisma generate`; `"prisma": { "seed": "tsx prisma/seed.ts" }`.
- [x] `config/env.ts`: schema Zod cho mọi biến ở mục 12.1 tổng quan; `ConfigModule.forRoot({ isGlobal: true, validate: (raw) => envSchema.parse(raw) })`. Export type `Env`.
- [x] `prisma/prisma.service.ts` (extends PrismaClient, `onModuleInit` connect) + `prisma.module.ts` (`@Global()`).
- [x] `main.ts`: `app.setGlobalPrefix('api')`, `helmet()`, `enableCors({ origin: env.CORS_ORIGIN.split(','), credentials: true })`, `enableShutdownHooks()`, listen `PORT`.
- [x] `common/exceptions/app.exception.ts`: `class AppException extends HttpException { constructor(status: HttpStatus, code: ErrorCode, message: string, details?: unknown) }`.
- [x] `common/pipes/zod-validation.pipe.ts`:

```ts
export class ZodValidationPipe<TSchema extends ZodTypeAny> implements PipeTransform<unknown, z.infer<TSchema>> {
  constructor(private readonly schema: TSchema) {}
  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ',
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    }
    return result.data;
  }
}
```

- [x] `common/decorators/zod.decorators.ts`: `ZodBody(schema) = Body(new ZodValidationPipe(schema))`, `ZodQuery(schema)`, `ZodParam(name, schema)`.
- [x] `common/decorators/`: `@Public()` (SetMetadata `isPublic`), `@Roles(...roles: Role[])`, `@AllowUnapprovedOwner()`, `@CurrentUser()` (param decorator trả `AuthUser`; route public trả `AuthUser | undefined` – tạo thêm `@OptionalUser()`).
- [x] `common/guards/jwt-auth.guard.ts` (đăng ký `APP_GUARD`): lấy Bearer token → `jwtService.verifyAsync` → `prisma.user.findUnique` → không có user: 401 `UNAUTHORIZED`; `LOCKED`: 403 `ACCOUNT_LOCKED`; gắn `req.user: AuthUser`. Route `@Public()`: không có/ sai token vẫn cho qua (không gắn user).
- [x] `common/guards/roles.guard.ts` (đăng ký `APP_GUARD` sau JWT): không có `@Roles` → qua; không có user → 401; role không nằm trong danh sách → 403 `FORBIDDEN`; role OWNER mà `ownerStatus !== 'APPROVED'` và route không có `@AllowUnapprovedOwner` → 403 `OWNER_NOT_APPROVED`.
- [x] `common/filters/all-exceptions.filter.ts` (`APP_FILTER`): trả đúng định dạng 8.2. Xử lý: `AppException` → giữ code; `HttpException` khác → map status → code (400 `VALIDATION_ERROR`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`); `Prisma.PrismaClientKnownRequestError` `P2002` → 409 `CONFLICT`, `P2025` → 404 `NOT_FOUND`; còn lại → 500 `INTERNAL_ERROR` (log stack bằng `Logger`, không trả stack).
- [x] `common/interceptors/transform.interceptor.ts` (`APP_INTERCEPTOR`): bọc `{ data }`; nếu handler trả `undefined` (204) thì không bọc.
- [x] `common/interceptors/logging.interceptor.ts` (`APP_INTERCEPTOR`): log `METHOD url status - xx ms - userId`.
- [x] `common/utils/pagination.ts`: `toSkipTake(page, pageSize)`, `paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T>` (generic).
- [x] `common/utils/prisma-errors.ts`: type guard `isPrismaUniqueError(e: unknown): e is Prisma.PrismaClientKnownRequestError` (code `P2002`) – Hiếu dùng để trả 409.
- [x] `common/events/app-events.ts`: hằng số tên event + payload type (để mọi người emit cùng một kiểu):

```ts
export const AppEvents = {
  BookingCreated: 'booking.created',     // emit bởi Hiếu
  BookingConfirmed: 'booking.confirmed', // emit bởi Dương
  BookingRejected: 'booking.rejected',
  BookingCancelled: 'booking.cancelled',
  BookingCompleted: 'booking.completed',
  RecurringCreated: 'recurring.created',
  OwnerApproved: 'owner.approved',       // emit bởi Hưng
  OwnerRejected: 'owner.rejected',
} as const;
export interface BookingEventPayload { bookingId: string }
export interface RecurringEventPayload { seriesId: string }
export interface OwnerEventPayload { userId: string; note?: string }
```

- [x] `EventEmitterModule.forRoot()` và `ScheduleModule.forRoot()` trong `AppModule`.
- [x] `modules/health`: `GET /api/health` `@Public()` chạy `SELECT 1` qua Prisma.
- [x] **Không** tạo sẵn module của người khác – mỗi người tự tạo module của mình và tự đăng ký vào `AppModule` (1 dòng import).

### H0.4 – Prisma schema + migration + seed khung

- [x] `npx prisma init` trong BE, dán **nguyên văn** schema ở mục 7 tổng quan. Chạy `npx prisma migrate dev -n init`.
- [x] `prisma/seed.ts`: hàm `main()` xóa dữ liệu theo thứ tự phụ thuộc (Complaint, Review, SlotLock, BookingHold, Booking, RecurringSeries, MaintenanceBlock, PriceRule, OpeningHour, Court, Venue, User) rồi gọi lần lượt `seedUsers(prisma)`; để sẵn comment chỗ gọi `seedVenues` (Lâm), `seedBookings`, `seedReviewsAndComplaints` (Dương). Mỗi seed function nhận `PrismaClient` và trả về dữ liệu cần cho seed sau (vd danh sách user id).
- [x] `prisma/seed/users.seed.ts`: 6 tài khoản demo (mục 7.2 tổng quan) + **≥ 250 user** sinh theo vòng lặp có quy luật (tên `Khách hàng 001`…, `customer001@sango.vn`, một số OWNER PENDING/REJECTED, một số LOCKED) – dùng `createMany`. Mật khẩu hash bằng `bcryptjs` (salt 10, hash 1 lần dùng chung cho user sinh hàng loạt cho nhanh).

### H0.5 – Frontend React + Vite khung

- [ ] **KHÔNG xóa `FE/`** (đã có `FE/CLAUDE.md`). Chạy `npm create vite@latest fe-tmp -- --template react-ts` → chép nội dung `fe-tmp/` vào `FE/` (giữ `FE/CLAUDE.md`) → xóa `fe-tmp/`. Đổi `name` → `@sango/fe`, không giữ lockfile con.
- [x] Cài (đã xong): `react-router @reduxjs/toolkit react-redux react-hook-form @hookform/resolvers zod@^3.25 dayjs clsx @tanstack/react-virtual antd@^6 @ant-design/icons@^6 recharts leaflet react-leaflet` ; dev: `vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw eslint-plugin-react-hooks`. **Không dùng Tailwind/lucide/sonner** (đã gỡ).
- [x] `vite.config.ts` (đã xong):

```ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src'), '@sango/shared': path.resolve(__dirname, '../shared/src/index.ts') } },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  test: {
    environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8', include: ['src/features/**/{hooks,utils,model}/**', 'src/common/{hooks,api,utils}/**'], thresholds: { lines: 50, functions: 50, statements: 50, branches: 50 } },
  },
});
```

- [x] `tsconfig.app.json`: `strict: true`, `paths: { "@/*": ["./src/*"], "@sango/shared": ["../shared/src/index.ts"] }`, include thêm `../shared/src`.
- [x] ESLint: bật `@typescript-eslint/no-explicit-any: error`, `react-hooks`.
- [x] **Giao diện theo `docs/Thiết kế/00_HE_THONG_THIET_KE.md` + `01_Hung_GIAO_DIEN.md`:** `common/theme/tokens.ts` + `antdTheme.ts` (`getAntdTheme(mode, reducedMotion)`), `src/styles/global.css` (đã có), font Be Vietnam Pro trong `index.html` (đã có).
- [x] `common/api/baseApi.ts`: `fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_URL, prepareHeaders })` → bọc thành `baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiErrorBody>`: bóc `data` (dùng `isApiResponse`), chuẩn hóa lỗi (dùng `isApiErrorBody`, lỗi mạng → `{ statusCode: 0, code: 'INTERNAL_ERROR', message: 'Không kết nối được máy chủ' ... }`), 401 → `dispatch(loggedOut())`. `createApi` với đủ `tagTypes` ở mục 10.2 tổng quan.
- [x] `common/api/errors.ts`: `getErrorMessage(error: unknown): string`, `getErrorCode(error: unknown): ErrorCode | undefined`.
- [x] `app/store.ts` (`configureStore`, export `RootState`, `AppDispatch`), `app/hooks.ts` (`useAppDispatch`, `useAppSelector` có kiểu), `app/providers.tsx` (Redux Provider + ThemeProvider + LanguageProvider + `ConfigProvider` antd (theme, `locale` vi_VN/en_US, `wave` tắt) + `<App>` của antd để dùng `App.useApp()` cho message/modal/notification).
- [x] `app/router.tsx`: `createBrowserRouter` – ghép `RouteObject[]` từ từng feature (`...authRoutes`, `...adminRoutes`, … mỗi người thêm 1 dòng import khi có feature). Mọi page lazy theo mẫu:

```ts
{ path: 'login', lazy: () => import('@/features/auth/pages/LoginPage').then((m) => ({ Component: m.default })) }
```

  Cấu trúc gốc: `MainLayout` (public + `/venues…`), `AuthLayout` (`/login`, `/register`), `CustomerLayout` (`/me/*` – CUSTOMER, riêng `/me/profile` mọi vai trò), `OwnerLayout` (`/owner/*`), `AdminLayout` (`/admin/*`), `/403`, `*`. Mỗi nhánh có `errorElement: <ErrorPage />`. Để sẵn **route placeholder** `/owner` và `/admin` (trang "Đang xây dựng") để kiểm thử guard – người sở hữu sẽ thay.
- [x] `common/hoc/withAuthGuard.tsx` (**HOC – minh chứng pattern**):

```ts
interface AuthGuardOptions { roles?: readonly Role[]; allowUnapprovedOwner?: boolean }
export function withAuthGuard<P extends object>(Component: ComponentType<P>, options: AuthGuardOptions = {}) { ... }
// đang bootstrap → <FullPageSpinner/>; chưa đăng nhập → <Navigate to={`/login?redirect=${encodeURIComponent(location)}`} replace/>
// sai role → <Navigate to="/403"/>; OWNER chưa APPROVED (không allowUnapprovedOwner) → <Navigate to="/owner/pending"/>
```

  Lý do chọn HOC (ghi báo cáo): tái sử dụng một logic cắt ngang (auth) cho nhiều layout mà không lặp code, không làm thay đổi props của component bị bọc; layouts được export dạng `export default withAuthGuard(OwnerLayoutBase, { roles: ['OWNER'] })`.
- [x] `common/hooks/`: `useDocumentTitle(title: string)` (đặt `document.title = \`${title} | SanGo\``, khôi phục khi unmount), `useDebounce<T>(value: T, delayMs = 400): T`, `useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void]` (an toàn khi JSON lỗi), `useMediaQuery(query)`.
- [x] `common/contexts/ThemeContext.tsx` (`mode: 'light' | 'dark'`, mặc định theo `prefers-color-scheme`, lưu `useLocalStorage`; truyền vào `getAntdTheme`; đổi theme bọc trong `document.startViewTransition` nếu có), `LanguageContext.tsx` (`vi`/`en`, từ điển `common/i18n/{vi,en}.ts` cho menu/nhãn chung, `t(key: TranslationKey)` – `TranslationKey = keyof typeof vi` để có type-safe; đổi cả `locale` antd và `dayjs.locale`).
- [x] `components/`: các component ở mục 8 của `docs/Thiết kế/00_HE_THONG_THIET_KE.md` (`BrandLogo`, `CourtLines`, `PageHeader`, `Section`, `StatusDot`, `EmptyState`, `FullPageSpinner`, `RHFInput`/`RHFPassword`/`RHFSelect`/`RHFTextArea`, `ConfirmAction`, `DashboardShell`), có kiểu props đầy đủ, đúng ở dark mode, mobile-first.
- [x] `common/utils/format.ts`: `formatCurrency`, `formatDate`, `formatDateTime`, `formatTimeRange(startAt, endAt)` (theo giờ VN, dùng dayjs + offset hoặc hàm shared), `cn()` (clsx).
- [x] `layouts/`: `MainLayout`, `AuthLayout`, `CustomerLayout`, `OwnerLayout`, `AdminLayout` – **làm đúng bố cục, kích thước, chuyển động ở `docs/Thiết kế/01_Hung_GIAO_DIEN.md` mục A, B, C, D**. Menu là mảng cấu hình để người khác thêm mục bằng 1 dòng.
- [x] `pages/`: `HomePage` (placeholder), `NotFoundPage` (404), `ErrorPage` (`useRouteError`, phân biệt `isRouteErrorResponse`), `ForbiddenPage` (403) – theo mục K và phần placeholder của file thiết kế. Mỗi trang gọi `useDocumentTitle`.
- [x] `test/setup.ts` (jest-dom, MSW `server.listen/resetHandlers/close`), `test/msw/server.ts`, `test/msw/handlers.ts` (handler mặc định `/api/auth/me`), `test/test-utils.tsx`:

```ts
export function renderWithProviders(ui: ReactElement, opts?: { preloadedState?: Partial<RootState>; route?: string; path?: string })
// tạo store mới (makeStore(preloadedState)), bọc Provider + Theme/Language + createMemoryRouter
```

  → cần `app/store.ts` export `makeStore(preloadedState?)`.

### H0.6 – README & CI tối thiểu

- [x] README: giới thiệu, yêu cầu (Node 22, Docker), các lệnh mục 12.2 tổng quan, bảng tài khoản demo, cấu trúc thư mục, link tài liệu `docs/`.
- [x] `.github/workflows/ci.yml`: trên `pull_request` và push `main`: setup Node 22, `npm ci`, `npm run lint`, `npm test` (BE test dùng mock nên không cần DB), `npm run build`.

---

## 3. CÁC CHỨC NĂNG CỦA HƯNG (sau GĐ0)

> Mọi màn hình FE dưới đây làm **đúng thiết kế** ở `docs/Thiết kế/01_Hung_GIAO_DIEN.md` (Đăng nhập = mục E, Đăng ký = F, Chờ duyệt = G, Hồ sơ = H, Tổng quan admin = I, Người dùng = J).

### H1 – Đăng ký / Đăng nhập / Phiên đăng nhập (làm ngay trong GĐ0 vì mọi người cần)

**DB:** model `User` (đã có).

**BE – `modules/auth`, `modules/users`:**
- [x] `UsersService`: `findByEmail`, `findById`, `create`, `toUserDto` (mapper `users.mapper.ts`, bỏ `passwordHash`).
- [x] `AuthService.register(input)`: email lower-case; tồn tại → 409 `EMAIL_TAKEN`; hash bcryptjs (salt 10); role OWNER → `ownerStatus = 'PENDING'`, CUSTOMER → `'NONE'`; trả `AuthResponse` (ký JWT luôn). Emit không cần.
- [x] `AuthService.login`: không có user / sai mật khẩu → 401 `INVALID_CREDENTIALS` (cùng thông điệp, không lộ email tồn tại); `LOCKED` → 403 `ACCOUNT_LOCKED`.
- [x] `AuthController`: `POST /auth/register` (`@Public`, `@ZodBody(registerSchema)`, 201), `POST /auth/login` (`@Public`, 200 – dùng `@HttpCode(200)`), `GET /auth/me`.
- [x] `JwtModule.registerAsync` dùng `JWT_SECRET`, `JWT_EXPIRES_IN`.

**FE – `features/auth`:**
- [x] `model/authSlice.ts`: state `{ user: UserDto | null; accessToken: string | null; status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' }`; reducers `credentialsReceived`, `loggedOut`, `userUpdated`; **`createAsyncThunk` `bootstrapAuth`**: đọc token từ localStorage → gọi `/auth/me` (dùng `authApi.endpoints.me.initiate`) → set user hoặc logout. Token lưu `localStorage['sango.token']` qua listener middleware hoặc trong reducer side-effect-free (dùng `listenerMiddleware`). Selectors `selectCurrentUser`, `selectIsAuthenticated`, `selectAuthStatus`.
- [x] `api/authApi.ts`: `register`, `login`, `me` (provides `Me`).
- [x] `pages/LoginPage.tsx`: form RHF + `zodResolver(loginSchema)`, hiển thị lỗi server (`getErrorMessage`), sau đăng nhập điều hướng theo `redirect` query hoặc theo vai trò (ADMIN → `/admin`, OWNER → `/owner`, CUSTOMER → `/`).
- [x] `pages/RegisterPage.tsx`: chọn vai trò bằng 2 thẻ (Khách đặt sân / Chủ sân), chủ sân hiển thị thông báo "cần Admin duyệt".
- [x] `pages/OwnerPendingPage.tsx` (`/owner/pending`, guard `roles: ['OWNER'], allowUnapprovedOwner: true`): hiển thị trạng thái PENDING/REJECTED + ghi chú.
- [x] Menu user ở header: tên, link theo vai trò, Hồ sơ, Đăng xuất (xóa token + reset `baseApi.util.resetApiState()`).

**Test:**
- [x] BE `auth.service.spec.ts`: đăng ký thành công (OWNER → PENDING), email trùng → 409, đăng nhập sai mật khẩu → 401, tài khoản khóa → 403 (mock PrismaService bằng `jest-mock-extended`).
- [x] BE `roles.guard.spec.ts`: sai role 403, owner chưa duyệt 403 `OWNER_NOT_APPROVED`, `@AllowUnapprovedOwner` cho qua.
- [x] BE `zod-validation.pipe.spec.ts`, `all-exceptions.filter.spec.ts` (P2002 → 409, P2025 → 404, Error → 500 không lộ stack).
- [x] FE `authSlice.test.ts` (reducer + thunk bootstrap với MSW).
- [x] FE `LoginPage.test.tsx`: submit rỗng hiện lỗi validate; nhập đúng → gọi API (MSW) → điều hướng.
- [x] FE `withAuthGuard.test.tsx`: chưa đăng nhập → chuyển `/login`; sai role → `/403`; owner pending → `/owner/pending`.
- [x] FE `useDebounce.test.ts` (fake timers).

### H2 – Hồ sơ cá nhân & đổi mật khẩu

- [x] BE: `PATCH /users/me` (`updateProfileSchema`), `PATCH /users/me/password` (sai mật khẩu hiện tại → 400 `VALIDATION_ERROR` với details path `currentPassword`).
- [x] FE `features/profile/pages/ProfilePage.tsx` (`/me/profile`, mọi vai trò): 2 form (thông tin, mật khẩu), `message.success` khi thành công, cập nhật `authSlice.userUpdated` – giao diện theo `docs/Thiết kế/01_Hung_GIAO_DIEN.md` mục H.

### H3 – Admin: quản lý người dùng & duyệt chủ sân

- [x] BE `modules/admin`: `AdminUsersController` (`@Roles('ADMIN')`): `GET /admin/users` (lọc `q` theo email/tên/số điện thoại `contains insensitive`, `role`, `status`, `ownerStatus`; `sort` = `newest` (mặc định, `createdAt desc`) | `oldest` | `name`; **phân trang server** bằng `paginate<T>`), `GET /admin/users/counts` → `{ all, customers, owners, pendingOwners, locked }` (số đếm cho các tab), `PATCH /admin/users/:id/status` (không khóa chính mình → 409 `CONFLICT`; không khóa ADMIN khác → 403), `PATCH /admin/users/:id/owner-approval` (chỉ user OWNER; set `ownerStatus`, `ownerNote`; emit `owner.approved`/`owner.rejected`).
- [x] FE `features/admin-users/pages/AdminUsersPage.tsx` (`/admin/users`) – **đúng thiết kế mục J** của `docs/Thiết kế/01_Hung_GIAO_DIEN.md`: 5 tab có số đếm (Tất cả / Khách đặt sân / Chủ sân / Chờ duyệt / Đã khóa), ô tìm kiếm **debounce** (`useDebounce`), sắp xếp, bảng (desktop) / List (mobile), **phân trang server** đồng bộ URL, Duyệt/Từ chối (modal), Khóa/Mở khóa (xác nhận).
- [x] Dữ liệu ≥ 250 user từ seed → minh chứng "danh sách dài dùng phân trang".

### H4 – Admin: thống kê tổng quan

- [x] BE `GET /admin/stats/overview` → `AdminOverviewDto` **đúng khai báo trong `docs/Thiết kế/01_Hung_GIAO_DIEN.md` mục I** (`today` gồm lượt đặt mới, tỉ lệ lấp sân, doanh thu hôm nay, đơn chờ xác nhận; `last7Days`; `bySport`; `bookingsByStatus`; `pendingOwners`; `openComplaints`; `topVenues`). Type đặt ở `shared/src/types/admin.ts`. Dùng `prisma.$transaction([...count/groupBy/aggregate])` + hàm thuần tính delta/gom ngày theo giờ VN (có unit test). Làm sau khi Lâm và Hiếu đã merge các model sân và đơn; tỉ lệ lấp sân cần `generateDaySlots` của Hiếu (chưa có thì trả `null`).
- [x] FE `features/admin-dashboard/pages/AdminDashboardPage.tsx` (`/admin`) – **đúng thiết kế mục I**: bảng tỉ số hôm nay, biểu đồ 7 ngày (div tự vẽ), việc cần xử lý, lượt đặt theo môn, đơn theo trạng thái, cụm sân nổi bật. Polling 60 giây.

### H5 – Theme & Language Context (minh chứng Context cho state ít thay đổi)

- [x] Đã dựng ở H0.5; hoàn thiện: nút chuyển theme/ngôn ngữ ở header, dịch toàn bộ menu/layout/nút chung sang en. Ghi báo cáo lý do: Context phù hợp vì giá trị ít đổi, cần ở mọi nơi; dữ liệu server dùng RTK Query, state toàn cục thay đổi nhiều dùng Redux.

### H6 – Email thông báo (NÂNG CAO)

- [x] `modules/mail`: `MailService.send({ to, subject, html })` với 2 provider chọn theo `MAIL_PROVIDER`: `smtp` (nodemailer → Mailpit khi dev, xem mail tại `http://localhost:8025`) và `brevo` (gọi `POST https://api.brevo.com/v3/smtp/email` bằng `fetch`, header `api-key`). `MAIL_ENABLED=false` → chỉ log.
- [x] Template HTML đơn giản (`mail/templates/*.ts` trả string, escape dữ liệu người dùng): xác nhận đã nhận đơn, đơn được xác nhận, bị từ chối (lý do), đã hủy, chuỗi lịch cố định đã tạo, chủ sân được duyệt/từ chối, email cho **chủ sân** khi có đơn mới.
- [x] `MailListener` dùng `@OnEvent(AppEvents.X, { async: true })` cho mọi event ở `app-events.ts`: tự query booking (kèm court, venue, owner, customer) rồi gửi. **Lỗi gửi mail không được làm hỏng request** (try/catch + log).
- [x] Test: `mail.listener.spec.ts` (mock MailService: event `booking.confirmed` → gửi đúng người nhận, lỗi gửi không ném).

### H7 – Deploy miễn phí + CI + Lighthouse (GĐ3)

- [ ] **DB:** tạo project Neon (free) → lấy `DATABASE_URL` (thêm `?sslmode=require`), chạy `prisma migrate deploy` + seed.
- [ ] **BE:** Render → New Web Service (free) từ repo; root `BE`… (vì workspace: build command ở gốc `npm ci && npm run build:shared && npm run build -w @sango/be && npx prisma migrate deploy --schema BE/prisma/schema.prisma`, start `node BE/dist/main.js`); khai báo env (không commit). Lưu ý free instance ngủ sau 15 phút không dùng → ghi README. Email prod dùng `MAIL_PROVIDER=brevo` (Render free chặn cổng SMTP).
- [ ] **FE:** Vercel import repo, root `FE`, build `cd .. && npm ci && npm run build -w @sango/fe`, output `FE/dist`, env `VITE_API_URL=https://<render-app>.onrender.com/api`; thêm `FE/vercel.json` rewrite mọi path về `/index.html` (SPA). Cập nhật `CORS_ORIGIN` ở BE.
- [ ] Ghi link deploy vào README.
- [ ] **Lighthouse trước/sau:** chụp Lighthouse (mobile) trang `/` và `/venues/:slug` ở bản build **trước** khi tối ưu (tạm tắt lazy route: import tĩnh) và **sau** (lazy route + ảnh `loading="lazy"` + `width/height` + chia chunk vendor bằng `build.rollupOptions.output.manualChunks`). Lưu ảnh `docs/bao-cao/images/perf/lighthouse-{before,after}-*.png`.

---

## 4. Hợp đồng Hưng cung cấp cho người khác (giữ đúng chữ ký)

| Thứ | Vị trí | Cách dùng |
|---|---|---|
| `AppException(status, code, message, details?)` | `BE/src/common/exceptions` | ném lỗi nghiệp vụ |
| `@Public() @Roles() @AllowUnapprovedOwner() @CurrentUser() @OptionalUser()` | `BE/src/common/decorators` | controller |
| `@ZodBody(schema) @ZodQuery(schema) @ZodParam(name, schema)` | `BE/src/common/decorators/zod.decorators.ts` | validate |
| `paginate<T>()`, `toSkipTake()` | `BE/src/common/utils/pagination.ts` | danh sách |
| `isPrismaUniqueError()` | `BE/src/common/utils/prisma-errors.ts` | bắt P2002 |
| `AppEvents` + payload types | `BE/src/common/events/app-events.ts` | `eventEmitter.emit(AppEvents.BookingCreated, { bookingId })` |
| `baseApi` + `tagTypes` | `FE/src/common/api/baseApi.ts` | `baseApi.injectEndpoints` |
| `getErrorMessage`, `getErrorCode` | `FE/src/common/api/errors.ts` | hiển thị lỗi |
| `withAuthGuard` | `FE/src/common/hoc` | (đã áp vào layout) |
| UI kit, `useDocumentTitle`, `useDebounce`, `useLocalStorage`, `format*` | `FE/src/common` | mọi page |
| `renderWithProviders`, MSW `server` | `FE/src/test` | test |
| `time.ts`, `type-guards.ts`, constants | `shared/src` | mọi nơi |

---

## 5. Phần báo cáo Hưng viết (`docs/bao-cao/hung.md`)

- Kiến trúc hệ thống B kèm sơ đồ (FE ↔ BE ↔ DB, shared), cấu trúc thư mục, **sơ đồ CSDL** (xuất ERD bằng `prisma-erd-generator` hoặc vẽ dbdiagram.io – miễn phí).
- Ma trận phân quyền + 4 lớp bảo vệ (kèm trích đoạn guard ngắn và đường dẫn file).
- Lý do chọn Redux Toolkit + RTK Query + Context; lý do chọn HOC cho guard.
- TypeScript: generic tự viết, utility type, type guard, kiểu dùng chung giữa các tầng.
- Interceptor, Exception Filter, định dạng lỗi thống nhất.
- Lighthouse trước/sau; hướng dẫn deploy.

## 6. Checklist Definition of Done của Hưng

- [x] 28/11/2026: hoàn thiện tích hợp auth/guard/cache, duyệt chủ sân, occupancy và mail chuỗi; kiểm tra SMTP Mailpit local. Kết quả tổng và phần H7 còn cần môi trường thật: `docs/bao-cao/KIEM_THU_TICH_HOP_2026-11-28.md`.

- [x] 28/11/2026: giữ layout/menu khi lỗi route và 404 trong khu chủ sân, quản trị, tài khoản; thêm điều hướng trái cho trang lỗi công khai (drawer mobile). Đã có test hồi quy, Chrome desktop/375px và rà soát mã; 282 test và build đạt. Lint file sửa không có lỗi; lint tổng còn 55 lỗi BE có sẵn.

- [ ] GĐ0 đạt mục tiêu nghiệm thu (mục 2) và đã merge `main`, thông báo nhóm.
- [ ] H1 – H7 hoàn thành, test xanh, coverage phần của mình ≥ 50%.
- [ ] Không `any` không chú thích; responsive mobile các trang của mình.
- [ ] README đầy đủ + link deploy.
- [ ] Báo cáo phần mình xong.

## 7. Gợi ý nhánh & commit

`feat/hung-monorepo-setup` → `feat/hung-be-core` → `feat/hung-fe-skeleton` → `feat/hung-auth` → `feat/hung-profile` → `feat/hung-admin-users` → `feat/hung-theme-i18n` → `feat/hung-mail` → `feat/hung-deploy-ci`.
Ví dụ commit: `chore: init npm workspaces monorepo`, `feat(be): add global exception filter and transform interceptor`, `feat(auth): register and login with JWT`, `test(auth): cover AuthService edge cases`.
