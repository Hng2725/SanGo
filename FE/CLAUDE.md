# QUY TẮC CHO AI CODING AGENT – FRONTEND (React + Vite) – SanGo

> File này được nạp tự động mỗi khi làm việc trong `FE/`. **Bắt buộc tuân thủ 100%.**
> Trước khi code: đọc `../docs/Đề bài/TONG_QUAN_DE_TAI.md` (nguồn sự thật) và file phân công của thành viên đang làm trong `../docs/Phân chia/` (`01_Hung.md`, `02_Hieu.md`, `03_Lam.md`, `04_Duong.md`).
> **Làm giao diện:** đọc thêm `../docs/Thiết kế/00_HE_THONG_THIET_KE.md` (màu, chữ, theme antd, chuyển động) và file thiết kế màn hình của thành viên (vd `../docs/Thiết kế/01_Hung_GIAO_DIEN.md`). Không tự đặt ra màu/font/bố cục khác.
> Nếu file này mâu thuẫn với file tổng quan → làm theo file tổng quan và báo lại cho người dùng.

---

## 1. Bối cảnh

- Đề 4 – Đặt lịch sân thể thao. Kiến trúc B: **SPA React + Vite + React Router**, gọi NestJS REST API qua `/api` (dev dùng Vite proxy).
- Tiêu chí chấm liên quan FE: thư mục theo feature, **≥ 2 custom hook generic**, **HOC / Compound Component / Render Props** (có lý do), **Redux Toolkit + RTK Query** cho state toàn cục, **Context** cho theme/ngôn ngữ, **lazy route + code-splitting**, memo có lý do, **virtualization/phân trang** cho danh sách dài, **trang lỗi/404 + title động**, **≥ 15 test** Vitest + RTL, **dùng được trên điện thoại**.
- Bảo mật **không** nằm ở FE: ẩn nút chỉ là trải nghiệm, server luôn kiểm tra lại.

## 2. Stack – KHÔNG tự ý đổi

| Dùng | Không dùng |
|---|---|
| React 19, Vite, **React Router 7 data mode** (`createBrowserRouter`, import từ `'react-router'`) | `react-router-dom` v5/v6 API cũ, Next.js |
| **Redux Toolkit 2 + RTK Query** (`baseApi.injectEndpoints`) | axios, `fetch` trực tiếp trong component, React Query, Zustand, `createApi` thứ hai |
| react-hook-form + `zodResolver` + **schema từ `@sango/shared`** (Zod 3) | Formik, Yup, tự viết validate tay |
| **Ant Design 6 (`antd`)** + **`@ant-design/icons`** (chỉ bộ Outlined), CSS Modules (`*.module.css`) cho style riêng | Tailwind, MUI, Bootstrap, styled-components/emotion, lucide, sonner, react-toastify |
| `@tanstack/react-virtual`, `recharts`, `leaflet` + `react-leaflet` (OSM), `dayjs` (chỉ để hiển thị) | thư viện bản đồ/biểu đồ trả phí, moment |
| Vitest + Testing Library + `user-event` + MSW 2 | Enzyme, test snapshot thay cho test hành vi |

Cần thư viện mới → phải miễn phí, phổ biến, và nêu lý do cho người dùng trước khi cài.

## 3. TypeScript

- `strict: true`. **Cấm `any`.** Bắt buộc dùng thì: `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Lý do: ...`.
- DTO, input type, enum-constant, label (`SPORT_LABELS`, `BOOKING_STATUS_LABELS`), error code **import từ `@sango/shared`**. Không khai báo lại interface đã có trong shared.
- Props khai báo `interface XxxProps`. Component generic khi hợp lý (`<T,>`). Dùng type guard (`isApiErrorBody`, `isBookingStatus`) thay vì `as`.
- Import bằng alias: `@/...` (= `FE/src`) và `@sango/shared`. Không dùng đường dẫn tương đối dài `../../../`.

## 4. Cấu trúc thư mục

```
src/
├─ app/          store.ts (makeStore), hooks.ts (useAppDispatch/useAppSelector), router.tsx, providers.tsx
├─ common/       api/ (baseApi, errors) · ui/ · theme/ (tokens, antdTheme) · hooks/ · contexts/ · hoc/ · utils/ · i18n/
├─ styles/       global.css (biến chuyển động, view transition, reduced motion)
├─ layouts/      MainLayout, AuthLayout, CustomerLayout, OwnerLayout, AdminLayout
├─ pages/        HomePage, NotFoundPage, ErrorPage, ForbiddenPage
├─ features/<feature>/
│  ├─ api/<feature>Api.ts     # baseApi.injectEndpoints
│  ├─ components/  hooks/  model/  utils/
│  ├─ pages/                  # mỗi page = default export
│  ├─ __tests__/
│  ├─ routes.tsx              # RouteObject[] lazy của feature
│  └─ index.ts                # API công khai cho feature khác
└─ test/         setup.ts, msw/, test-utils.tsx (renderWithProviders)
```

- Feature khác chỉ import qua `@/features/<x>` (file `index.ts`), không import sâu vào file nội bộ của feature người khác.
- Code dùng chung nhiều feature → `common/` (thuộc Hưng; thêm file mới thì báo nhóm, không sửa hành vi component có sẵn).
- Tên file: component `PascalCase.tsx`, hook `useXxx.ts`, util/slice `camelCase.ts`.

## 5. Routing, trang, title

- **Mọi page lazy** theo mẫu, khai báo trong `features/<x>/routes.tsx`, rồi thêm 1 dòng spread vào `app/router.tsx`:

```ts
export const ownerVenueRoutes: RouteObject[] = [
  { path: 'venues', lazy: () => import('./pages/OwnerVenuesPage').then((m) => ({ Component: m.default })) },
];
```

- Route đặt đúng nhánh layout (bảng 10.1 file tổng quan). Guard nằm ở layout qua HOC `withAuthGuard` – **không** tự viết guard riêng trong page.
- **Mỗi page gọi `useDocumentTitle('...')`** (title động, vd `useDocumentTitle(\`${venue.name} – Đặt sân\`)`).
- Không tìm thấy dữ liệu (404 từ API) → hiển thị trạng thái "Không tìm thấy" có nút quay lại; lỗi router đã có `ErrorPage`.
- Điều hướng bằng `<Link>`/`useNavigate`; chưa đăng nhập mà cần đăng nhập → `/login?redirect=<đường dẫn hiện tại>`.

## 6. Quản lý state – chọn đúng chỗ

| Loại state | Dùng |
|---|---|
| Dữ liệu từ server (danh sách, chi tiết, lưới lịch…) | **RTK Query** – không copy vào slice/useState |
| State toàn cục phía client, sống qua nhiều trang | **Redux slice** (`authSlice`, `bookingDraftSlice`) |
| Giá trị ít thay đổi, cần ở mọi nơi | **Context**: chỉ `ThemeContext`, `LanguageContext` |
| Bộ lọc/tìm kiếm/phân trang có thể chia sẻ link | **URL search params** (`useSearchParams`, `useUrlFilters`) |
| State cục bộ UI (mở modal, tab, tuần đang xem của lưới) | `useState` trong component gần nhất |

RTK Query:
- Endpoint mới: `export const xApi = baseApi.injectEndpoints({ endpoints: (build) => ({ ... }) })`. `baseQuery` đã tự gắn token và **tự bóc `{ data }`** → kiểu trả về của endpoint là payload thật (`BookingDto`, `Paginated<VenueCardDto>`).
- Dùng `providesTags` / `invalidatesTags` với tag đã khai báo trong `baseApi` (`Venue`, `Court`, `Pricing`, `Availability`, `Booking`, `Review`, `Stats`…). Thao tác làm thay đổi lịch (đặt, hủy, từ chối, bảo trì) **phải invalidate `Availability`**.
- Dùng `useAppSelector`/`useAppDispatch` có kiểu, không dùng `useSelector` thuần.

## 7. Form

- `useForm<Input>({ resolver: zodResolver(<schemaTừShared>) })` – **cùng schema server dùng** (bảng giá, giờ mở cửa, đặt sân, đánh giá…). Không viết lại rule validate ở FE.
- Danh sách động dùng `useFieldArray`; xem trước realtime dùng `useWatch` + `useMemo`.
- Giao diện form: `<Form layout="vertical" component="form">` của antd + các wrapper `RHFInput`, `RHFPassword`, `RHFSelect`, `RHFTextArea` (`@/common/ui`) nối `Controller` của RHF với `Form.Item` (`validateStatus` + `help`). **Không** dùng `Form.useForm`/rules của antd để validate.
- Lỗi 400 từ server (`details[].path`) map vào field bằng `setError`; lỗi khác hiển thị bằng `getErrorMessage(error)` (`Alert` trong form hoặc `message.error`).
- Nút submit: `loading` khi đang gửi; thành công → `message.success('Đã <động từ của nút>')` lấy từ `App.useApp()` (không gọi `message` tĩnh của antd).

## 8. Gọi API & hiển thị lỗi

- Mỗi màn hình có đủ 4 trạng thái: **loading** (Skeleton/Spinner), **empty** (`EmptyState` có hành động gợi ý), **error** (thông báo + nút thử lại), **data**.
- Lấy thông điệp lỗi bằng `getErrorMessage(error)`, mã lỗi bằng `getErrorCode(error)` (`@/common/api/errors`).
- Xử lý riêng các mã quan trọng: `SLOT_ALREADY_BOOKED` / `SLOT_UNAVAILABLE` / `HOLD_EXPIRED` → báo rõ + nút "Chọn lại khung"; `CANCELLATION_NOT_ALLOWED` → hiển thị hạn hủy; `OWNER_NOT_APPROVED` → `/owner/pending`.
- Hiển thị nút hành động đơn theo `allowedActions` server trả về (hoặc `canTransition` của shared) – nhưng vẫn coi server là quyết định cuối.

## 9. Ngày giờ & tiền

- Tiền là số nguyên VND → hiển thị bằng `formatCurrency` (`150.000 ₫`).
- Ngày giờ hiển thị theo **giờ VN** bằng `formatDate`, `formatDateTime`, `formatTimeRange` (`@/common/utils/format`), phút trong ngày bằng `formatMinute` (shared, "01:00 (+1)").
- **CẤM** dùng `getHours()`, `getDay()`, `setHours()`… để tính nghiệp vụ (phụ thuộc múi giờ trình duyệt). Tính tuần/ngày bằng util shared (`startOfWeekDateStr`, `addDaysToDateStr`, `toVnParts`). Gửi API: ngày `YYYY-MM-DD`, thời điểm ISO UTC lấy nguyên từ dữ liệu server (`slot.startAt`).
- Khung giờ = 60 phút, tối đa 6 khung liên tiếp (`MAX_SLOTS_PER_BOOKING`).

## 10. UI, responsive, accessibility

- Dùng trực tiếp component antd (Button, Input, Select, Table, List, Modal, Drawer, Tabs, Segmented, Skeleton, Empty, Badge…) **cùng** các component dự án trong `@/common/ui`: `PageHeader`, `Section` (thay Card có bóng), `StatusDot`, `EmptyState`, `RHF*`, `ConfirmAction`, `BrandLogo`, `CourtLines`, `DashboardShell`. Thiếu component dùng chung → báo Hưng/nhóm; component chỉ một feature dùng thì để trong feature đó.
- **Theme:** mọi màu/bo góc/font lấy từ token (`theme.useToken()` hoặc biến CSS `var(--sg-…)`); **không ghi cứng mã màu** trong component (chỉ `common/theme/tokens.ts` được chứa mã màu). Khối nội dung dùng viền, không đổ bóng; không gradient.
- Trạng thái hiển thị bằng `StatusDot` (chấm + chữ), không dùng `Tag` màu đặc. Icon chỉ dùng bộ **Outlined**.
- Chuyển động: dùng sẵn của antd + View Transitions của React Router (`viewTransition`); không thêm animation fade-up cho từng khối hay hover cho từng thẻ (xem file thiết kế 00, mục 5).
- **Mobile-first**: kiểm tra ở width **375px**; trang không được cuộn ngang (bảng rộng → chuyển `List` trên < lg); menu owner/admin là `Drawer` trên < lg (đã có trong `DashboardShell`).
- Dark mode: tự có nhờ `theme.darkAlgorithm` + token; mọi component mới phải nhìn đúng ở cả hai chế độ (bật thử bằng nút ở header).
- Copy: viết hoa đầu câu, không VIẾT HOA nhãn, không thêm `→` vào nút, nút và thông báo dùng cùng động từ ("Lưu thay đổi" → "Đã lưu thay đổi").
- Text giao diện tiếng Việt có dấu; nhãn menu/layout/nút chung lấy qua `t(key)` của `LanguageContext`.
- Accessibility: phần tử bấm được là `<button>`/`<a>`, có `aria-label` cho nút chỉ có icon, input có `<label>`, ô lưới lịch có `aria-label` ("Thứ 7 21/11, 18:00, còn trống, 300.000 ₫"), modal đóng được bằng Esc.
- Ảnh: `loading="lazy"`, có `width`/`height` (tránh layout shift), có `alt`.

## 11. Hiệu năng

- Page luôn lazy. Thư viện nặng (`leaflet`, `recharts`) chỉ load qua `React.lazy` + `Suspense` ở component dùng nó. Import antd theo tên (`import { Button } from 'antd'`) để tree-shaking; không import cả `antd/dist`.
- `React.memo` / `useMemo` / `useCallback` **chỉ dùng khi có lý do** và ghi comment ngắn lý do (vd ô lưới lịch, hàng danh sách virtualized, callback truyền xuống component memo).
- Lưới lịch: **đổi tuần không re-render toàn trang** – state tuần nằm trong component lưới, không đẩy lên page.
- Danh sách ≥ 200 dòng: **phân trang server** hoặc **`@tanstack/react-virtual`**. Không render cả trăm phần tử nặng cùng lúc.
- Ô tìm kiếm dùng `useDebounce` (400ms).

## 12. Pattern bắt buộc của dự án (giữ nguyên, không viết lại kiểu khác)

| Pattern | Vị trí | Ghi chú |
|---|---|---|
| HOC `withAuthGuard(Component, { roles, allowUnapprovedOwner })` | `common/hoc` | bọc layout, chuyển `/login`, `/403`, `/owner/pending` |
| Compound Component + Render Props `AvailabilityGrid` (`.Toolbar`, `.WeekNav`, `.Legend`, `.Table renderCell`) | `features/availability` | dùng chung cho khách (`CourtWeekSchedule`) và chủ sân (`/owner/schedule`) – **không nhân bản lưới** |
| Hook generic `useDebounce<T>`, `useLocalStorage<T>` | `common/hooks` | |
| Hook generic `useSlotSelection<TSlot>`, `useUrlFilters<T>` | `features/availability`, `features/search` | |
| `createAsyncThunk bootstrapAuth`, slice `bookingDraft` | `features/auth`, `features/booking` | |

Component dùng chung giữa thành viên: `CourtWeekSchedule`, `VenueCard` (Hiếu) · `LocationPicker`, `VenueMap`, `VenuesMap` (Lâm) · `VenueReviews`, `RatingStars`, `BookingStatusBadge`, `BookingDetailDrawer` (Dương). Chưa có thì đặt placeholder + `// TODO(<tên>): nhúng component khi merge`.

## 13. Test

- File `features/<x>/__tests__/*.test.ts(x)`. Chạy: `npm test -w @sango/fe`, coverage: `npm run test:cov -w @sango/fe`.
- Render bằng `renderWithProviders(ui, { preloadedState, route, path })` từ `@/test/test-utils`. Mock API bằng **MSW** (`server.use(http.get('/api/...', ...))`), không mock RTK Query hay `fetch` thủ công.
- Tương tác bằng `userEvent.setup()`; truy vấn ưu tiên `getByRole`, `getByLabelText`, `findBy*` cho bất đồng bộ. Không test chi tiết cài đặt (state nội bộ, class CSS).
- Mỗi thành viên ≥ 4 test FE, trong đó ≥ 1 test tương tác người dùng và ≥ 1 test bất đồng bộ có mock API. Có test reducer/hook/util thuần cho logic của mình.
- Thời gian trong test: `vi.useFakeTimers()` + `vi.setSystemTime(new Date('...Z'))`.

## 14. Phân công feature (chỉ sửa phần của thành viên đang làm)

| Thành viên | Thư mục |
|---|---|
| Hưng | `app/**`, `common/**`, `layouts/**`, `pages/**` (trừ `HomePage` nội dung), `test/**`, `features/auth`, `profile`, `admin-users`, `admin-dashboard`, `vite.config.ts`, `index.css` |
| Hiếu | `features/search`, `availability`, `booking`, `owner-schedule`, `pages/HomePage.tsx` |
| Lâm | `features/owner-venues`, `pricing`, `maintenance`, `venue-detail`, `map` |
| Dương | `features/my-bookings`, `owner-bookings`, `recurring`, `reviews`, `complaints`, `stats` |

Được phép chạm file chung chỉ để **thêm**: 1 dòng route vào `app/router.tsx`, 1 mục menu vào cấu hình layout, 1 reducer vào `store.ts`.

## 15. Env & bảo mật

- Chỉ dùng biến `VITE_*` (`VITE_API_URL`, `VITE_MAP_TILE_URL`); biến mới → thêm vào `FE/.env.example`. Không đặt secret nào trong FE.
- Token đọc từ `authSlice` (đã persist), không tự đọc/ghi `localStorage` rải rác. Đăng xuất → `loggedOut()` + `baseApi.util.resetApiState()`.
- Không render HTML thô từ người dùng (`dangerouslySetInnerHTML` bị cấm).

## 16. Checklist trước khi báo xong

- [ ] Page lazy, đúng layout/guard, có `useDocumentTitle`.
- [ ] Gọi API qua RTK Query (`injectEndpoints`), tag invalidate đúng (thay đổi lịch → `Availability`).
- [ ] Form dùng schema shared + `zodResolver`; hiển thị lỗi server.
- [ ] Đủ trạng thái loading / empty / error; dùng tốt ở 375px; dark mode ổn.
- [ ] Không `any`, không `console.log`, không dữ liệu giả cứng, không tính giờ bằng múi giờ trình duyệt.
- [ ] Có test; `npm test` và `npm run build` pass; ESLint không lỗi.
- [ ] Tick checklist trong file phân công. **Không tự commit/push** nếu người dùng chưa yêu cầu; khi commit dùng Conventional Commits (`feat(search): ...`).
