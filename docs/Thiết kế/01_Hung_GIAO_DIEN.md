# THIẾT KẾ GIAO DIỆN – PHẦN CỦA HƯNG

> Đọc trước: `docs/Thiết kế/00_HE_THONG_THIET_KE.md` (màu, chữ, theme antd, chuyển động, quy tắc viết).
> Phạm vi: khung giao diện toàn site + màn hình của Hưng (H1–H5 trong `docs/Phân chia/01_Hung.md`).
> Thư viện: **antd 6** + **@ant-design/icons** (Outlined). Form: react-hook-form + zod (schema shared) nối qua `RHFInput`… (mục 8 file 00).

## Danh sách màn hình

| # | Màn hình | Route | File FE |
|---|---|---|---|
| A | Khung công khai (header, footer, menu mobile) | mọi trang công khai | `layouts/MainLayout.tsx` |
| B | Khung tài khoản (khu "của tôi") | `/me/*` | `layouts/CustomerLayout.tsx` (+ `AccountNav`) |
| C | Khung quản trị dùng chung | `/owner/*`, `/admin/*` | `common/ui/DashboardShell/`, `layouts/OwnerLayout.tsx`, `layouts/AdminLayout.tsx` |
| D | Khung đăng nhập / đăng ký | `/login`, `/register` | `layouts/AuthLayout.tsx` + `common/ui/CourtLines.tsx` |
| E | Đăng nhập | `/login` | `features/auth/pages/LoginPage.tsx` |
| F | Đăng ký | `/register` | `features/auth/pages/RegisterPage.tsx` |
| G | Chờ duyệt chủ sân | `/owner/pending` | `features/auth/pages/OwnerPendingPage.tsx` |
| H | Hồ sơ | `/me/profile` | `features/profile/pages/ProfilePage.tsx` |
| I | Tổng quan quản trị | `/admin` | `features/admin-dashboard/pages/AdminDashboardPage.tsx` |
| J | Quản lý người dùng | `/admin/users` | `features/admin-users/pages/AdminUsersPage.tsx` |
| K | 404 / 403 / lỗi tải trang | `*`, `/403`, `errorElement` | `pages/NotFoundPage.tsx`, `ForbiddenPage.tsx`, `ErrorPage.tsx` |
| L | Màn chờ khi khởi động | (bootstrap auth) | `common/ui/FullPageSpinner.tsx` |

---

## D. Khung đăng nhập / đăng ký (AuthLayout) – điểm nhấn của sản phẩm

Đây là **nơi duy nhất** có chuyển động tự chạy: hình sân bóng đá mini được "kẻ vạch" khi vào trang.

### Bố cục

Desktop (≥ lg):

```
┌──────────────────────────────┬──────────────────────────────────────────┐
│ [▭ SanGo]  (logo trắng)       │                                          │
│                               │            Đăng nhập                     │
│      ┌───────────────┐        │            Chưa có tài khoản? Đăng ký    │
│      │       │       │        │                                          │
│      │   ┌───┴───┐   │        │            Email                         │
│      │   └───────┘   │        │            [                        ]    │
│      │───────◯───────│  ← vạch│            Mật khẩu                      │
│      │   ┌───────┐   │   sân  │            [                     👁 ]    │
│      │   └───┬───┘   │  tự kẻ │                                          │
│      │       │       │        │            [       Đăng nhập        ]    │
│      └───────────────┘        │                                          │
│                               │            ▸ Dùng tài khoản demo         │
│  Tìm sân trống,               │                                          │
│  đặt giờ chơi.                │                                          │
│  Bóng đá mini, cầu lông,      │                                          │
│  pickleball và tennis tại     │                                          │
│  TP.HCM và Hà Nội.            │                                          │
└──────────────────────────────┴──────────────────────────────────────────┘
   44% – nền Cỏ đậm #155C3B         56% – nền Mặt sân, form rộng tối đa 380px
```

Mobile (< md):

```
┌──────────────────────────────┐
│ [▭ SanGo]        ╱ vạch sân   │  dải 148px, nền Cỏ đậm, hình sân bị cắt
│                 ╱  (mờ hơn)   │  một phần ở mép phải, không có chữ lớn
├──────────────────────────────┤
│ Đăng nhập                     │  padding 24 16
│ Chưa có tài khoản? Đăng ký    │
│ Email [                    ]  │
│ Mật khẩu [               👁]  │
│ [        Đăng nhập         ]  │
└──────────────────────────────┘
```

### Quy cách

- `Layout` không có Sider. Hai cột bằng `Row` / `Col` (mỗi bên `lg={12}`), chiều cao `100dvh`. Bản xem trước: `docs/Thiết kế/preview_Hung.html`.
- **Panel trái (3 lớp chồng nhau):**
  1. **Ảnh nền** `auth-hero.webp` (xem mục 11 file 00): `<img>` phủ kín, `object-fit: cover`, `alt=""` (ảnh trang trí).
  2. **Lớp phủ** màu Cỏ đêm `rgba(10,46,31,0.74)` (một màu, không gradient) để chữ trắng đủ tương phản. Chưa có ảnh → nền `#0E3B28`.
  3. **Hình vạch sân** `CourtLines variant="pitch" animated`, màu `rgba(255,255,255,0.32)`, cao `min(560px, 70vh)`, đặt lệch phải và tràn ra mép phải 40px (`right: -40px`), căn giữa dọc.
- Nội dung panel trái (padding 40 48, chữ trắng):
  - Trên: `BrandLogo inverted` – dấu sân màu Vôi `#C6F06A`, chữ "SanGo" Barlow Condensed 24/700 trắng.
  - Dưới (rộng tối đa 520): tiêu đề **"Tìm sân trống. / Đặt giờ chơi."** (2 dòng, Barlow Condensed 60/60 700); mô tả **"Xem lịch trống theo từng giờ, giữ chỗ trong vài giây và nhận xác nhận từ chủ sân."** (16/25, trắng 80%, ≤ 40ch); hàng **chip môn thể thao**: Bóng đá mini, Cầu lông, Pickleball, Tennis – mỗi chip cao 34, bo tròn, viền trắng 28%, nền trắng 6%, icon môn màu Vôi bên trái (icon SVG riêng, xem mục `SportIcon` dưới).
- Mobile (< md): panel cao 240, ẩn mô tả và chip môn, tiêu đề 40/42.
- Panel phải: căn giữa theo cả hai chiều, nội dung là `<Outlet />` (LoginPage hoặc RegisterPage).

**`SportIcon`** (`common/ui/SportIcon.tsx`, Hưng làm – Hiếu/Lâm/Dương dùng lại): prop `sport: Sport`, `size`; trả SVG nét 1.7 (`currentColor`) cho FOOTBALL (quả bóng ngũ giác), BADMINTON (quả cầu), PICKLEBALL (vợt + bóng), TENNIS (bóng tennis 2 đường cong), BASKETBALL, VOLLEYBALL; có `aria-label` = `SPORT_LABELS[sport]` khi đứng một mình. Antd icons không có icon môn thể thao nên tự vẽ (lấy path từ file preview).
- Đổi giữa đăng nhập và đăng ký: **panel trái không vẽ lại** (layout không remount), chỉ phần form cross-fade bằng view transition.

### Chuyển động vạch sân (khoảnh khắc duy nhất)

| Thời điểm | Phần tử | Hiệu ứng |
|---|---|---|
| 0ms | Đường biên ngoài | kẻ vạch 1000ms `--ease-out` |
| 150ms | Vạch giữa sân | kẻ vạch 700ms |
| 300ms | Vòng tròn giữa + chấm tâm | kẻ vạch 700ms |
| 450ms | Hai vòng cấm địa + hai cung | kẻ vạch 700ms |
| 650ms | Khối chữ đáy trái (tiêu đề, mô tả, chip) | `opacity 0→1`, `translateY 10px→0`, 360ms |

`prefers-reduced-motion: reduce` → hiện ngay toàn bộ, không animation.

### Component `CourtLines` (code mẫu – dùng chung cho AuthLayout và trang lỗi)

```tsx
// common/ui/CourtLines.tsx
import styles from './CourtLines.module.css';

interface CourtLinesProps { variant?: 'pitch' | 'out'; animated?: boolean; className?: string }

const PITCH: ReadonlyArray<{ d: string; delay: number }> = [
  { d: 'M10 10 H290 V440 H10 Z', delay: 0 },                                     // biên ngoài
  { d: 'M10 225 H290', delay: 150 },                                              // vạch giữa
  { d: 'M105 225 A45 45 0 1 0 195 225 A45 45 0 1 0 105 225', delay: 300 },        // vòng tròn giữa
  { d: 'M75 10 V80 H225 V10', delay: 450 },                                       // vòng cấm trên
  { d: 'M75 440 V370 H225 V440', delay: 450 },                                    // vòng cấm dưới
  { d: 'M122 80 A32 32 0 0 0 178 80', delay: 550 },                               // cung trên
  { d: 'M122 370 A32 32 0 0 1 178 370', delay: 550 },                             // cung dưới
];

export function CourtLines({ variant = 'pitch', animated = false, className }: CourtLinesProps) {
  return (
    <svg viewBox={variant === 'out' ? '0 0 340 450' : '0 0 300 450'} aria-hidden="true"
         className={[styles.root, animated ? styles.animated : '', className].join(' ')}>
      {PITCH.map((p) => (
        <path key={p.d} d={p.d} pathLength={1} className={styles.line} style={{ ['--d' as string]: `${p.delay}ms` }} />
      ))}
      <circle cx="150" cy="225" r="2.5" className={styles.spot} />
      {variant === 'out' && <circle cx="318" cy="118" r="9" className={styles.ball} />}
    </svg>
  );
}
```

```css
/* common/ui/CourtLines.module.css */
.root { display: block; height: 100%; width: auto; color: currentColor; }
.line { fill: none; stroke: currentColor; stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.spot { fill: currentColor; }
.ball { fill: none; stroke: currentColor; stroke-width: 1.5; }
.animated .line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 900ms var(--ease-out) forwards; animation-delay: var(--d, 0ms); }
.animated .spot { opacity: 0; animation: appear 200ms var(--ease-out) 900ms forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes appear { to { opacity: 1; } }
```

### `BrandLogo`

Dấu 24×24 (hiển thị 26): hình chữ nhật bo góc 4 (nét 2), một vạch dọc giữa, một vòng tròn nhỏ ở tâm (r = 3) – tức mặt sân thu nhỏ. Bên phải là chữ **"SanGo"** Barlow Condensed 24px weight 700, **cả chữ cùng một màu** (không tô riêng chữ "Go"). Biến thể: thường (dấu màu Cỏ, chữ `colorText`) và `inverted` cho nền Cỏ đêm (dấu màu Vôi `#C6F06A`, chữ trắng). Bấm logo → `/`.

---

## E. Đăng nhập (`/login`)

```
Đăng nhập                                   ← H1 Barlow Condensed 40/44 700
Chưa có tài khoản? Đăng ký                  ← 14, "Đăng ký" là Link
                                            ← khoảng 32
[Alert lỗi – chỉ hiện khi server trả lỗi]
Email
[ ten@email.com                       ]
Mật khẩu
[ ••••••••                         👁 ]
                                            ← khoảng 8
[            Đăng nhập                ]    ← Button primary, block, size large
                                            ← khoảng 24
▸ Dùng tài khoản demo                       ← chỉ khi VITE_SHOW_DEMO_ACCOUNTS=true
```

| Phần tử | antd | Chi tiết |
|---|---|---|
| Form | `Form layout="vertical" component="form" requiredMark={false}` | RHF + `zodResolver(loginSchema)`; Enter để gửi |
| Email | `RHFInput` → `Input size="large" prefix={<MailOutlined/>} autoComplete="email" inputMode="email"` (cao 46) | placeholder "ten@email.com"; icon tiền tố màu muted |
| Mật khẩu | `RHFPassword` → `Input.Password size="large" prefix={<LockOutlined/>} autoComplete="current-password"` (cao 46) | |
| Lỗi server | `Alert type="error" showIcon` phía trên trường Email | `INVALID_CREDENTIALS`: "Email hoặc mật khẩu chưa đúng. Kiểm tra lại rồi thử lần nữa." · `ACCOUNT_LOCKED`: "Tài khoản này đang bị khóa. Liên hệ quản trị viên để được mở khóa." · lỗi mạng: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." |
| Nút | `Button type="primary" htmlType="submit" block size="large" loading={isLoading}` | Chữ luôn là "Đăng nhập" |
| Tài khoản demo | `Collapse` có viền (bo 12, `size="small"`), một mục, nhãn "Dùng tài khoản demo", cách nút 28px | Bên trong là danh sách 3 dòng: "Khách đặt sân", "Chủ sân", "Quản trị viên", mỗi dòng kèm email (chữ phụ). Bấm một dòng → điền sẵn email + mật khẩu vào form (không tự gửi). Dùng để quay video demo |

Sau khi đăng nhập thành công: không hiện message, điều hướng ngay (`viewTransition`) theo `?redirect` hoặc theo vai trò (ADMIN → `/admin`, OWNER → `/owner`, CUSTOMER → `/`).

Title trang: **"Đăng nhập | SanGo"**.

---

## F. Đăng ký (`/register`)

```
Tạo tài khoản
Đã có tài khoản? Đăng nhập

Bạn dùng SanGo để
┌─────────────────────────┐ ┌─────────────────────────┐
│ 📅                    ◉ │ │ 🏪                    ○ │
│ Đặt sân                 │ │ Cho thuê sân            │
│ Tìm sân trống và đặt    │ │ Đăng cụm sân, quản lý   │
│ theo giờ.               │ │ lịch và doanh thu.      │
└─────────────────────────┘ └─────────────────────────┘
(i) Tài khoản chủ sân cần quản trị viên duyệt trước khi đăng sân.   ← chỉ khi chọn "Cho thuê sân"

Họ và tên            [                      ]
Email                [                      ]
Số điện thoại        [                      ]  (không bắt buộc)
Mật khẩu             [                   👁 ]
  ✓ Ít nhất 8 ký tự   ✓ Có chữ hoa và chữ thường   ○ Có chữ số
Nhập lại mật khẩu    [                   👁 ]

[             Tạo tài khoản              ]
```

| Phần tử | antd | Chi tiết |
|---|---|---|
| Chọn vai trò | `Radio.Group` bọc 2 ô tự style (CSS Module), mỗi ô là `Radio` ẩn nút tròn mặc định | 2 cột từ sm trở lên, xếp dọc trên xs. Ô: viền Vạch 1px, bo 12, padding 16. Ô được chọn: viền Cỏ 1.5px, nền Cỏ 4%, icon `CheckCircleOutlined` màu Cỏ ở góc phải trên (chuyển viền/nền 120ms). Icon chính đặt trong ô 40×40 bo 10 (nền Nền, icon Đá; khi chọn: nền Cỏ, icon trắng): `CalendarOutlined` (Đặt sân), icon mặt sân tự vẽ hoặc `ShopOutlined` (Cho thuê sân). Mặc định CUSTOMER; `?role=OWNER` trên URL thì chọn sẵn Chủ sân |
| Thông báo chủ sân | `Alert type="info" showIcon` (không có nút đóng) | Xuất hiện bằng chuyển động chiều cao của antd (`motion`) |
| Gợi ý mật khẩu | `Flex wrap gap={12}` gồm 3 dòng chữ 13px | Mỗi dòng: icon `CheckCircleOutlined` màu Cỏ khi đạt, `MinusCircleOutlined` màu Đá khi chưa đạt; cập nhật theo `useWatch` |
| Bố cục trường | `Row gutter={12}` | Từ sm trở lên: Họ và tên + Số điện thoại cùng hàng, Email một hàng, Mật khẩu + Nhập lại mật khẩu cùng hàng; gợi ý mật khẩu nằm dưới hàng mật khẩu. Tiêu đề "Tạo tài khoản" Barlow Condensed 40/44 |
| Nút | `Button type="primary" block size="large"` | "Tạo tài khoản" |
| Lỗi `EMAIL_TAKEN` | lỗi ngay dưới trường Email | "Email này đã được đăng ký. Đăng nhập hoặc dùng email khác." |

Sau khi tạo: CUSTOMER → `/` + `message.success('Đã tạo tài khoản')`; OWNER → `/owner/pending`.
Title: **"Tạo tài khoản | SanGo"**.

---

## A. Khung công khai (MainLayout)

Desktop:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [▭ SanGo]   Tìm sân                               [☾] [🌐]  Đăng nhập  [Đăng ký] │ 64px, sticky
├────────────────────────────────────────────────────────────────────────────┤
│                         nội dung (max 1200, padding 32)                    │
├────────────────────────────────────────────────────────────────────────────┤
│ © 2026 SanGo                                   Tìm sân    Đăng ký chủ sân  │ footer
└────────────────────────────────────────────────────────────────────────────┘
```

Đã đăng nhập: thay "Đăng nhập / Đăng ký" bằng `Avatar` (chữ cái đầu tên, nền Cỏ 12%, chữ Cỏ) + tên (ẩn tên khi < md) + `DownOutlined`.

Mobile (< md):

```
┌──────────────────────────────┐
│ [▭ SanGo]          (NA)  [☰] │
└──────────────────────────────┘
☰ mở Drawer bên phải rộng 280, các dòng từ trên xuống:
  Tìm sân
  (các mục tài khoản theo vai trò, như menu người dùng)
  Giao diện tối            [Switch]
  Ngôn ngữ                 [Segmented: Tiếng Việt | English]
  Đăng xuất
```

| Phần tử | antd | Chi tiết |
|---|---|---|
| Header | `Layout.Header` class `app-header` | `position: sticky; top: 0; z-index: 10`, viền dưới Vạch, không bóng |
| Điều hướng chính | `NavLink` (React Router, `viewTransition`) | Mục đang mở: chữ Cỏ + gạch chân 2px Cỏ cách chữ 6px (vạch sân thu nhỏ). Hiện chỉ có "Tìm sân" – Hiếu có thể thêm |
| Đổi giao diện | `Button type="text" shape="circle"` + `Tooltip` | Icon `MoonOutlined` / `SunOutlined`; tooltip "Chuyển sang giao diện tối" / "Chuyển sang giao diện sáng". Đổi theme cross-fade bằng `document.startViewTransition` nếu có |
| Ngôn ngữ | `Dropdown` từ `Button type="text" shape="circle" icon={<GlobalOutlined/>}` | "Tiếng Việt", "English" (mục đang chọn có dấu check) |
| Menu người dùng | `Dropdown` `menu.items` | Dòng đầu (không bấm được): tên 500 + email chữ phụ. Sau đó theo vai trò: CUSTOMER "Lịch đặt của tôi"; OWNER "Quản lý sân"; ADMIN "Trang quản trị". Rồi "Hồ sơ", đường phân cách, "Đăng xuất" |
| Footer | `Layout.Footer` | Viền trên Vạch, chữ 13 màu Đá. Trái: "© 2026 SanGo". Phải: link "Tìm sân", "Đăng ký chủ sân" (`/register?role=OWNER`) |

Đăng xuất: không hỏi lại; `message.success('Đã đăng xuất')`, về `/`.

---

## B. Khung tài khoản (`/me/*` – CustomerLayout)

Dùng chung header/footer của MainLayout, thêm điều hướng tài khoản:

```
Desktop (≥ lg)                                   Mobile
┌──────────────┬──────────────────────────┐     ┌────────────────────────────┐
│ ▍Lịch đặt    │  PageHeader               │     │ [Lịch đặt][Lịch cố định][…]│ ← Tabs cuộn ngang
│  Lịch cố định│  nội dung trang           │     ├────────────────────────────┤
│  Khiếu nại   │                           │     │ nội dung                   │
│  Hồ sơ       │                           │     └────────────────────────────┘
└──────────────┴──────────────────────────┘
   220px
```

- Desktop: `Menu mode="inline"` rộng 220, nền trong suốt, không viền phải. Mục đang chọn có **vạch chỉ mục 3px màu Cỏ ở cạnh trái** (xem mục C) + nền Cỏ 8%.
- Mobile: `Tabs` (chỉ dùng thanh tab, không dùng panel) cuộn ngang, đồng bộ với route.
- Mục theo vai trò: CUSTOMER: Lịch đặt của tôi (`ScheduleOutlined`), Lịch cố định (`RedoOutlined`), Khiếu nại (`MessageOutlined`), Hồ sơ (`UserOutlined`). OWNER/ADMIN vào `/me/profile`: chỉ có "Hồ sơ" và link "Về trang quản lý".
- Cấu hình menu là một mảng (`accountNavItems`) để Dương thêm mục bằng một dòng.

---

## C. Khung quản trị dùng chung (DashboardShell – Owner & Admin)

Sider **nền Cỏ đêm** (tối, cảm giác phòng điều hành sân), nội dung nền sáng.

```
┌────────────────┬────────────────────────────────────────────────────────────┐
│ [▭ SanGo]      │ Quản trị / Người dùng                  [🌐] [☾] (QT) Trần Quản Trị ▾│ 60px, nền trắng
│ Quản trị hệ    ├────────────────────────────────────────────────────────────┤
│ thống          │                                                            │
│▍▣ Tổng quan    │  PageHeader                                                │
│  ⚇ Người dùng 3│                                                            │
│  ✉ Khiếu nại  5│  nội dung (max 1320, padding 28 32)                        │
│                │                                                            │
│  ┌──┬──┐       │                                                            │
│  │ ─◯─ │ ← vạch sân mờ (trang trí)                                           │
│  └──┴──┘       │                                                            │
│ ⇤ Thu gọn menu │                                                            │
└────────────────┴────────────────────────────────────────────────────────────┘
   240px, nền #0E3B28 (thu gọn 72px)
```

Mobile (< lg): ẩn Sider, header có `MenuOutlined` ở trái mở `Drawer placement="left"` rộng 264 (nền Cỏ đêm, cùng menu); chọn mục thì Drawer tự đóng.

| Phần tử | antd | Chi tiết |
|---|---|---|
| Sider | `Layout.Sider` `theme="dark"` `width={240}` `collapsedWidth={72}` `collapsible trigger={null}` class `app-sider` | Nền Cỏ đêm (token `siderBg`). Trạng thái thu gọn lưu `useLocalStorage('sango.sider.collapsed')` |
| Logo | `BrandLogo inverted` (thu gọn: chỉ dấu) | Cao 68, padding trái 24 |
| Nhãn nhóm | `Typography.Text` 12px, trắng 45% | "Quản trị hệ thống" (Admin) / "Quản lý sân" (Owner); ẩn khi thu gọn |
| Menu | `Menu theme="dark" mode="inline"` `selectedKeys` theo route | Chữ trắng 74%, hover nền trắng 6%, mục đang chọn nền trắng 10% + chữ trắng 500. **Vạch chỉ mục:** `.ant-menu-item-selected::before` thanh 3×20px **màu Vôi** `#C6F06A`, dính mép trái Sider, xuất hiện `scaleY(0→1)` 140ms. Badge: chờ xử lý dùng màu cảnh báo, số thông tin dùng nền trắng 14% |
| Trang trí | SVG vạch sân ngang 300×180, màu trắng 12%, đặt sát đáy trên nút thu gọn | `aria-hidden`; ẩn khi thu gọn và trên mobile |
| Nút thu gọn | `Button type="text" block` ở đáy Sider, viền trên trắng 8% | `MenuFoldOutlined` + "Thu gọn menu" / `MenuUnfoldOutlined` (chỉ icon, tooltip "Mở rộng menu") |
| Header | `Layout.Header` cao 60, nền trắng, viền dưới Vạch | Trái: `Breadcrumb` từ `handle.crumb` của route (mục cuối đậm 500). Phải: nút ngôn ngữ (`GlobalOutlined`), nút giao diện tối (`MoonOutlined`), nút người dùng: `Avatar` 34 + tên (500) + vai trò (12px Đá) + `DownOutlined`. **Không** có ô tìm kiếm chung hay chuông thông báo (dự án không có chức năng đó) |
| Content | `Layout.Content` | `max-width: 1320px; margin: 0 auto; padding: 28px 32px 40px` (md 24, xs 16) |

Avatar theo vai trò (chữ cái đầu, không dùng ảnh): Khách đặt sân nền Cỏ 12% chữ Cỏ · Chủ sân nền `#FDF2E2` chữ `#9A6417` · Quản trị viên nền Cỏ đêm chữ Vôi.

API component:

```ts
export interface ShellMenuItem { key: string; path: string; label: string; icon: ReactNode; badge?: { count: number; tone: 'warning' | 'neutral' } }
interface DashboardShellProps { menu: ShellMenuItem[]; homePath: string; groupLabel: string }
// AdminLayout = withAuthGuard(() => <DashboardShell menu={adminMenu} homePath="/admin" groupLabel="Quản trị hệ thống" />, { roles: ['ADMIN'] })
```

Menu Admin (Hưng): **Tổng quan** `/admin` (`AppstoreOutlined`), **Người dùng** `/admin/users` (`TeamOutlined`, badge cảnh báo = số chủ sân chờ duyệt), **Khiếu nại** `/admin/complaints` (`MessageOutlined`, badge trung tính = số khiếu nại mở; Dương làm trang).
Menu Owner (Hưng tạo mảng, thành viên khác điền trang): **Tổng quan** `/owner` (`LineChartOutlined`), **Cụm sân** `/owner/venues` (`EnvironmentOutlined`), **Lịch sân** `/owner/schedule` (`CalendarOutlined`), **Đơn đặt** `/owner/bookings` (`ScheduleOutlined`, badge cảnh báo = đơn chờ xác nhận), **Đánh giá** `/owner/reviews` (`StarOutlined`).

### PageHeader (mọi trang trong khung)

```
Người dùng                                             [Hành động phụ] [Hành động chính]
Quản lý tài khoản, duyệt chủ sân mới và khóa tài khoản vi phạm.   ← mô tả, 14 màu Đá, ≤ 60ch
```
H1 **Barlow Condensed 36/40 700**. Không có nhãn nhỏ phía trên tiêu đề. Khoảng cách tới nội dung: 24.

---

## I. Tổng quan quản trị (`/admin`)

Thứ tự đọc của admin: **hôm nay thế nào → xu hướng → việc cần làm → phân bổ → sân nổi bật**. Điểm nhấn duy nhất của khu quản trị là **dải "bảng tỉ số" hôm nay** (nền Cỏ đêm, số Barlow Condensed lớn).

```
Tổng quan                                                   Cập nhật lúc 09:41  [⟳ Làm mới]
Hoạt động đặt sân trên toàn hệ thống.

╔══════════════════════════════════════════════════════════════════════════════════════╗
║ 📅 Hôm nay, Thứ Ba 17/11/2026                                        ● Đang cập nhật ║  nền Cỏ đêm
║ Lượt đặt mới   │ Tỉ lệ lấp sân    │ Doanh thu hôm nay  │ Đơn chờ chủ sân xác nhận     ║  vạch sân mờ
║ 86             │ 72%              │ 24,6 tr ₫          │ 14                           ║  góc phải
║ ▲ 12 so với    │ ▬▬▬▬▬▬▬▬▬▭▭▭      │ ▲ 8% so với        │ ! 3 đơn sắp tới giờ chơi     ║
║   hôm qua      │                  │   hôm qua          │                              ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
┌ Lượt đặt 7 ngày qua ─────────── Tổng 573 lượt ┐ ┌ Việc cần xử lý ──────────────────┐
│        118                                    │ │ [⚇] Chủ sân chờ duyệt          3 │
│        ██  104                          86    │ │ (NA) Nguyễn Văn An [Duyệt][Từ chối]│
│  58 64 71 ██  ██  72   ██ ← hôm nay màu Cỏ    │ │ (TL) Trần Thị Lan  [Duyệt][Từ chối]│
│  ██ ██ ██ ██  ██  ██   ██                     │ │ Xem cả 3 chủ sân chờ duyệt        │
│  T4 T5 T6 T7  CN  T2  Hôm nay                 │ │ ─────────────────────────────────│
└───────────────────────────────────────────────┘ │ [✉] Khiếu nại đang mở          5 │
                                                  │ [Xử lý khiếu nại]                 │
                                                  └───────────────────────────────────┘
┌ Lượt đặt theo môn ─────── Tháng 11 ┐ ┌ Đơn đặt theo trạng thái ──────── 1.245 đơn ┐
│ ⚽ Bóng đá mini       598 lượt (48%) │ │ ███████████▆▆▆▆▆▆▆▆▆▆▃▃▂                     │
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▭▭▭▭▭▭▭▭▭▭▭▭▭           │ │ ● Chờ xác nhận   120  ● Đã xác nhận   310  │
│ 🏸 Cầu lông           336 lượt (27%) │ │ ● Hoàn thành     680  ● Đã hủy        105  │
│ … Pickleball, Tennis                 │ │ ● Từ chối         30                        │
└──────────────────────────────────────┘ └─────────────────────────────────────────────┘
┌ Cụm sân nhiều lượt đặt nhất ─────────────────────────────────────────── Tháng 11 ┐
│ [Ảnh] Sân bóng Hoa Lư   ⚽   Lê Hoàng Nam      142    42.600.000 ₫    ★ 4,8          │
│       Quận 1, TP.HCM                                                               │
└────────────────────────────────────────────────────────────────────────────────────┘
```

| Khối | antd | Chi tiết |
|---|---|---|
| Hành động trang | `Typography.Text type="secondary"` + `Button icon={<ReloadOutlined/>}` | "Cập nhật lúc HH:mm" (thời điểm `fulfilledTimeStamp`); "Làm mới" gọi `refetch` |
| **Bảng tỉ số hôm nay** | `div` CSS Module, nền Cỏ đêm, bo 16, padding 24 28 | Dòng đầu: icon `CalendarOutlined` + "Hôm nay, <Thứ> DD/MM/YYYY" (500) và nhãn "Đang cập nhật" (nền Vôi 14%, chữ Vôi, chấm Vôi nhấp nháy 1,6s – **tắt khi reduced motion**; polling 60 giây). 4 cột (`grid auto-fit minmax(200px,1fr)`), ngăn bằng viền trái trắng 12%: nhãn 13px trắng 65%; số **Barlow Condensed 46/52 600** trắng; dòng phụ 12px: tăng = `CaretUpOutlined` màu Vôi, giảm/cảnh báo = màu `#FFB38A`. Cột "Tỉ lệ lấp sân" có thanh 6px (nền trắng 14%, phần đầy màu Vôi). Doanh thu rút gọn: `24,6 tr ₫` (≥ 1 tỷ → `1,2 tỷ ₫`). SVG vạch sân trắng 7% ở góc phải trên, `aria-hidden` |
| Lượt đặt 7 ngày qua | `Section` (`flex: 1.5`) – **biểu đồ cột tự vẽ bằng div** (không cần thư viện) | 7 cột, cột hôm nay màu Cỏ, các ngày khác `#CFE3D7`; số trên đầu cột (Barlow Condensed 16/600); nhãn ngày T2…CN, cột cuối "Hôm nay" đậm. Chiều cao cột = giá trị / max. Biểu đồ giãn cao bằng khối bên cạnh. Có `role="img"` + `aria-label` liệt kê số từng ngày. Đổi dữ liệu → chiều cao chuyển 320ms |
| Việc cần xử lý | `Section` (`flex: 1`) | Mỗi nhóm: ô icon 34×34 bo 9 (chủ sân: nền `#FDF2E2` icon `UserAddOutlined`; khiếu nại: nền `#FDECE4` icon `ExclamationCircleOutlined` đỏ) + nhãn 600 + số Barlow Condensed 28. Tối đa **2** chủ sân mới nhất (`GET /admin/users?ownerStatus=PENDING&pageSize=2`): `Avatar` vai trò chủ sân, tên 500, "Đăng ký 2 giờ trước" (dayjs `relativeTime`), nút `size="small"` "Duyệt" (primary) / "Từ chối" (default) – **cùng modal** với trang Người dùng. Link "Xem cả N chủ sân chờ duyệt" → `/admin/users?tab=pending`. Khiếu nại: nút "Xử lý khiếu nại" → `/admin/complaints`. Cả hai bằng 0: `CheckCircleOutlined` màu Cỏ + "Không có việc nào cần xử lý." |
| Lượt đặt theo môn | `Section` | Mỗi môn: ô icon 28×28 nền Nền với `SportIcon` màu Cỏ, tên môn 500, "598 lượt (48%)" chữ phụ căn phải, thanh 6px màu Cỏ bên dưới. Sắp giảm dần. Kỳ: tháng hiện tại |
| Đơn đặt theo trạng thái | `Section` | Tổng ở góc phải tiêu đề. Thanh xếp chồng cao 12, bo 6, khe 2px giữa các đoạn; màu: Chờ xác nhận = cảnh báo, Đã xác nhận = Cỏ, Hoàn thành = `#9BC5AE`, Đã hủy = muted, Từ chối = lỗi. Chú thích 2 cột: chấm + nhãn + số căn phải |
| Cụm sân nhiều lượt đặt nhất | `Section` chứa `Table size="middle" pagination={false}` (5 dòng) | Cột: **Cụm sân** (ảnh thu nhỏ 64×44 bo 8 lấy từ `imageUrl` của cụm sân – không có ảnh thì ô nền Nền + `SportIcon`; tên 500 + quận/thành phố chữ phụ) · **Môn** (các ô `SportIcon` 26×26, có `Tooltip` tên môn) · **Chủ sân** · **Lượt đặt** (phải, tabular) · **Doanh thu** (phải) · **Đánh giá** (★ màu `#D99A1E` + điểm). Bấm dòng → `/venues/:slug` (tab mới) |
| Đang tải | `Skeleton active` đúng hình từng khối (bảng tỉ số dùng Skeleton trên nền Cỏ đêm, khối khác nền trắng) | Không nhảy layout |
| Lỗi | `Result status="warning"` nhỏ trong khối | "Không tải được số liệu." + nút "Thử lại" |

**Dữ liệu cần thêm ở BE (H4 – Hưng làm, mở rộng `GET /api/admin/stats/overview`):**

```ts
interface AdminOverviewDto {
  today: {
    date: string;                    // YYYY-MM-DD (giờ VN)
    newBookings: number; newBookingsDelta: number;      // so với hôm qua (đơn tạo trong ngày)
    occupancyRate: number;           // 0..1 = số khung đã có đơn hiệu lực hôm nay / tổng khung mở cửa hôm nay của mọi sân active
    revenue: number; revenueDeltaPct: number;           // tổng totalPrice đơn CONFIRMED+COMPLETED có startAt trong hôm nay
    pendingConfirm: number; startingSoon: number;       // đơn PENDING; trong đó số đơn bắt đầu trong 3 giờ tới
  };
  last7Days: { date: string; bookings: number }[];      // 7 phần tử, cũ → mới, ngày cuối = hôm nay
  bySport: { sport: Sport; bookings: number }[];        // tháng hiện tại
  bookingsByStatus: Record<BookingStatus, number>;
  pendingOwners: number; openComplaints: number;
  topVenues: { id: string; slug: string; name: string; district: string; city: string; imageUrl: string | null;
               sports: Sport[]; ownerName: string; bookings: number; revenue: number; avgRating: number }[]; // tháng hiện tại, top 5
}
```

Tỉ lệ lấp sân dùng `generateDaySlots` (Hiếu) để đếm tổng khung mở cửa hôm nay; nếu phần của Hiếu chưa xong thì tạm trả `null` và FE hiển thị "–".

Title: **"Tổng quan quản trị | SanGo"**.

---

## J. Quản lý người dùng (`/admin/users`)

```
Người dùng
Quản lý tài khoản, duyệt chủ sân mới và khóa tài khoản vi phạm.

 Tất cả (1.204)   Khách đặt sân (1.164)   Chủ sân (38)   Chờ duyệt (3)   Đã khóa (12)     ← Tabs, gạch chân 3px màu Cỏ
──────────────────────────────────────────────────────────────────────────────────────
[🔍 Tìm tên, email, số điện thoại        ]  [Sắp xếp: Mới tham gia ▾]

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Người dùng              Vai trò     Tài khoản    Duyệt chủ sân  Số điện thoại  Ngày tham gia     │
│ (NA) Nguyễn Văn An      [Chủ sân]   ● Hoạt động  ● Chờ duyệt    0901 234 567   14/11/2026  [Duyệt][Từ chối] ⋯ │ ← dòng chờ duyệt nền #FFFBF3
│      an.nguyen@gmail.com                                                                     │
│ (VH) Võ Thu Hà          [Khách…]    ● Hoạt động  –              0977 410 822   01/11/2026         ⋯ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
Hiển thị 1–20 trong 1.204 người dùng                         ‹ 1 2 3 … 61 ›   [20 / trang ▾]
```

### Tabs và thanh công cụ

| Phần tử | antd | Chi tiết |
|---|---|---|
| Nhóm người dùng | `Tabs` (chỉ thanh tab) | 5 tab kèm số đếm: **Tất cả**, **Khách đặt sân** (`role=CUSTOMER`), **Chủ sân** (`role=OWNER`), **Chờ duyệt** (`ownerStatus=PENDING`, số trên nền cảnh báo), **Đã khóa** (`status=LOCKED`). Tab đang chọn: chữ đậm, số trên nền Cỏ chữ trắng, gạch chân 3px Cỏ. Đồng bộ `?tab=` trên URL. Số đếm lấy từ API mới `GET /api/admin/users/counts` → `{ all, customers, owners, pendingOwners, locked }` (Hưng làm, cùng module admin) |
| Tìm kiếm | `Input` `prefix={<SearchOutlined/>}` `allowClear` rộng 320, cao 40 | placeholder "Tìm tên, email, số điện thoại"; `useDebounce` 400ms; BE lọc `q` trên `fullName`, `email`, `phone` |
| Sắp xếp | `Select` cao 40 | Nhãn trước "Sắp xếp:" (chữ phụ) + giá trị: **Mới tham gia** (`createdAt desc`, mặc định) / **Cũ nhất** (`createdAt asc`) / **Tên A–Z** (`fullName asc`). BE nhận `sort` |

Đổi tab, tìm kiếm, sắp xếp → về trang 1; tất cả đồng bộ URL.

### Bảng

`Table` `rowKey="id"` `size="middle"`, phân trang server (`current`, `pageSize`, `total`, `pageSizeOptions: [10, 20, 50]`), `loading={isFetching}` (giữ dữ liệu cũ khi chuyển trang). Bọc khối viền Vạch bo 14; header nền `#FAFBFA`, chữ 12.5 Đá. `rowClassName`: dòng chủ sân đang **Chờ duyệt** có nền `#FFFBF3` (hover `#FFF6E6`) để nổi bật hàng chờ.

| Cột | Nội dung |
|---|---|
| Người dùng | `Avatar size={34}` màu theo vai trò (mục C) + tên (500) + email (chữ phụ 13) |
| Vai trò | `Tag` viền (không màu nền): Khách đặt sân / Chủ sân / Quản trị viên |
| Tài khoản | `StatusDot`: Hoạt động (success) / Đã khóa (error) |
| Duyệt chủ sân | chỉ OWNER: Chờ duyệt (warning) / Đã duyệt (success) / Từ chối (error); vai trò khác "–" màu muted |
| Số điện thoại | định dạng `0901 234 567`, tabular; không có → "–" |
| Ngày tham gia | `DD/MM/YYYY`, tabular |
| Thao tác | căn phải. Chủ sân chờ duyệt: `Button size="small" type="primary"` "Duyệt" + `Button size="small"` "Từ chối" (hover viền/chữ đỏ). Luôn có `Dropdown` từ `Button type="text" icon={<MoreOutlined/>} aria-label="Thao tác khác"`: "Khóa tài khoản" (chữ đỏ) hoặc "Mở khóa tài khoản". Dòng của chính admin và dòng ADMIN khác: không có mục khóa |

Dưới bảng: trái "Hiển thị 1–20 trong 1.204 người dùng" (chữ phụ, tabular), phải `Pagination` + chọn số dòng/trang.

### Hộp thoại (dùng `App.useApp().modal` hoặc `Modal` có form)

| Hành động | Tiêu đề | Nội dung | Nút | Message sau khi xong |
|---|---|---|---|---|
| Duyệt | "Duyệt chủ sân Nguyễn Văn An?" | `Descriptions column={1} size="small"`: Email, Số điện thoại, Ngày đăng ký. Đoạn: "Sau khi duyệt, chủ sân có thể đăng cụm sân và nhận đơn đặt. Hệ thống gửi email báo cho họ." | Hủy, **Duyệt chủ sân** (primary) | "Đã duyệt chủ sân" |
| Từ chối | "Từ chối chủ sân Nguyễn Văn An?" | `TextArea` bắt buộc, nhãn "Lý do từ chối", help "Lý do được gửi kèm email cho chủ sân.", 3–300 ký tự, `showCount` | Hủy, **Từ chối** (`danger`) | "Đã từ chối chủ sân" |
| Khóa | "Khóa tài khoản Nguyễn Văn An?" | "Người này bị đăng xuất và không đăng nhập lại được cho đến khi bạn mở khóa." | Hủy, **Khóa tài khoản** (`danger`) | "Đã khóa tài khoản" |
| Mở khóa | "Mở khóa tài khoản Nguyễn Văn An?" | "Người này có thể đăng nhập lại ngay." | Hủy, **Mở khóa** (primary) | "Đã mở khóa tài khoản" |

Nút xác nhận có `loading` trong lúc gọi API; lỗi → giữ modal mở, hiện `Alert` lỗi trong modal. Thành công → invalidate cả danh sách và số đếm tab.

### Mobile (< lg)

- Tabs cuộn ngang (không hiện thanh cuộn). Ô tìm kiếm rộng 100%; Sắp xếp xuống dòng dưới.
- Bảng thay bằng `List`: mỗi mục gồm avatar, tên, email, một hàng `StatusDot` (tài khoản + duyệt), và `MoreOutlined` mở Dropdown chứa **mọi** hành động (Duyệt, Từ chối, Khóa/Mở khóa). Mục chờ duyệt cũng có nền `#FFFBF3`.
- `Pagination simple`.

### Trạng thái rỗng

- Có từ khóa tìm kiếm: "Không có người dùng khớp với “<từ khóa>”." + nút "Xóa tìm kiếm".
- Tab Chờ duyệt rỗng: "Chưa có chủ sân nào chờ duyệt."
- Tab Đã khóa rỗng: "Không có tài khoản nào bị khóa."

Title: **"Người dùng | SanGo"**.

---

## H. Hồ sơ (`/me/profile`)

```
Hồ sơ

┌──────────────────────┐  ┌ Thông tin cá nhân ─────────────────────────────┐
│       (NA)  64px     │  │ Họ và tên        [Nguyễn Văn An              ] │
│  Nguyễn Văn An       │  │ Email            [an.nguyen@gmail.com        ] │ (khóa)
│  Khách đặt sân       │  │   Email dùng để đăng nhập, không thể thay đổi. │
│  an.nguyen@gmail.com │  │ Số điện thoại    [0901234567                 ] │
│  Tham gia 11/2026    │  │                                [Lưu thay đổi]  │
└──────────────────────┘  └────────────────────────────────────────────────┘
                          ┌ Đổi mật khẩu ──────────────────────────────────┐
                          │ Mật khẩu hiện tại [                       👁 ] │
                          │ Mật khẩu mới      [                       👁 ] │
                          │   ✓ Ít nhất 8 ký tự  ○ Chữ hoa và chữ thường … │
                          │ Nhập lại mật khẩu [                       👁 ] │
                          │                                 [Đổi mật khẩu] │
                          └────────────────────────────────────────────────┘
```

- `Row gutter={24}`: `Col xs={24} md={8}` (khối tóm tắt, `position: sticky; top: 88px` trên md+) và `Col xs={24} md={16}` (2 `Section` xếp dọc, cách 24). Độ rộng tối đa 960.
- Khối tóm tắt: `Avatar size={64}` chữ cái đầu, tên 18/600, vai trò (chữ phụ), email, "Tham gia 11/2026". OWNER thêm `StatusDot` trạng thái duyệt.
- Form thông tin: nút "Lưu thay đổi" **disable khi chưa sửa gì** (`formState.isDirty`). Thành công → `message.success('Đã lưu thay đổi')`, cập nhật tên trên header ngay.
- Form mật khẩu: gợi ý mật khẩu giống trang Đăng ký. Sai mật khẩu hiện tại → lỗi dưới trường đó: "Mật khẩu hiện tại chưa đúng." Thành công → `message.success('Đã đổi mật khẩu')` + reset form.

Title: **"Hồ sơ | SanGo"**.

---

## G. Chờ duyệt chủ sân (`/owner/pending`)

Dùng MainLayout, nội dung căn giữa, rộng tối đa 560:

```
                    ( ◷ )                      ← icon 28 trong vòng tròn 56, nền cảnh báo 10%
     Tài khoản chủ sân đang chờ duyệt          ← H1 24/32
 Quản trị viên sẽ xem xét hồ sơ của bạn. Kết quả
 được gửi tới an.nguyen@gmail.com.             ← 14 màu Đá

 ✓ Tạo tài khoản ─── ◷ Quản trị viên duyệt ─── ○ Đăng cụm sân đầu tiên   ← Steps

            [Kiểm tra lại]   [Đăng xuất]
```

- `Steps current={1} size="small"` (đây là một quy trình có thứ tự thật nên dùng Steps); `direction="vertical"` khi < sm.
- "Kiểm tra lại": gọi lại `/auth/me`; nếu đã APPROVED → `message.success('Tài khoản đã được duyệt')` + chuyển `/owner`; nếu chưa → `message.info('Hồ sơ vẫn đang chờ duyệt')`.
- **Trạng thái REJECTED:** icon `CloseCircleOutlined` nền lỗi 10%; tiêu đề "Hồ sơ chủ sân chưa được duyệt"; `Alert type="error"` hiển thị lý do (`ownerNote`); đoạn "Bạn có thể đăng ký tài khoản khác bằng email khác để đặt sân."; chỉ có nút "Đăng xuất". Steps bước 2 ở trạng thái `error`.

Title: **"Chờ duyệt | SanGo"**.

---

## K. Trang lỗi

Chung một bố cục căn giữa, rộng tối đa 480, cách đầu trang 96px (mobile 48):

```
        ┌────────┐ ○       ← CourtLines variant="out" (bóng ra ngoài biên), cao 140, màu Đá 60%, không animation
        │───◯────│
        └────────┘
     Không tìm thấy trang
  Đường dẫn có thể đã đổi hoặc không còn tồn tại.
     [Về trang chủ]   [Tìm sân]
```

| Trang | Tiêu đề | Mô tả | Nút |
|---|---|---|---|
| 404 `NotFoundPage` | Không tìm thấy trang | Đường dẫn có thể đã đổi hoặc không còn tồn tại. | **Về trang chủ** (primary) · Tìm sân |
| 403 `ForbiddenPage` | Bạn không có quyền xem trang này | Trang này dành cho vai trò khác. Đăng nhập bằng tài khoản phù hợp để tiếp tục. | **Về trang chủ** · Đăng nhập tài khoản khác (đăng xuất rồi chuyển `/login`) |
| Lỗi tải trang `ErrorPage` | Không tải được trang này | Thử tải lại trang. Nếu lỗi lặp lại, báo cho quản trị viên kèm thời điểm xảy ra lỗi. | **Tải lại trang** · Về trang chủ |

- `ErrorPage`: dùng `useRouteError()` + `isRouteErrorResponse`; nếu là 404 thì hiển thị nội dung 404. Khi `import.meta.env.DEV`, thêm `Collapse ghost` "Chi tiết lỗi" chứa thông báo/stack trong `<pre>` 12px.
- 403 và 404 dùng CourtLines `out`; ErrorPage dùng `pitch` tĩnh.

---

## L. Màn chờ khởi động (FullPageSpinner)

Khi `authSlice.status = 'loading'` (đang `bootstrapAuth`): căn giữa màn hình, dấu `BrandLogo` (chỉ dấu, 32px, màu Cỏ) + `Spin size="small"` phía dưới cách 16. **Chỉ hiện sau 300ms** (tránh nháy khi mạng nhanh).

---

## Placeholder trang chủ (Hưng tạo, Hiếu thay sau)

Căn trái trong khung 1200: H1 "Tìm sân trống, đặt giờ chơi." (28/36), một `Input.Search size="large" enterButton="Tìm sân"` (rộng tối đa 560, placeholder "Tên sân hoặc khu vực") → `/venues?q=…`. Không thêm hình minh họa (Hiếu thiết kế trang chủ thật).

---

## Kiểm tra trước khi bàn giao (Definition of Done giao diện)

- [ ] Đúng màu, chữ, bo góc, khoảng cách theo file 00; không ghi cứng mã màu trong component (trừ `tokens.ts`).
- [ ] Không có: nhãn viết hoa phía trên tiêu đề, gradient, bóng đổ trên khối nội dung, `→` trong nút, chuỗi nối bằng `·`.
- [ ] Vạch sân tự kẻ chạy mượt ở AuthLayout, không chạy lại khi đổi giữa đăng nhập ↔ đăng ký, tắt khi reduced motion.
- [ ] Chuyển trang trong khung quản trị: chỉ nội dung cross-fade, sider/header đứng yên.
- [ ] Kiểm tra ở 375 / 768 / 1280: không cuộn ngang; Sider thành Drawer < lg; bảng người dùng thành List < lg.
- [ ] Dark mode hiển thị đúng mọi màn hình (bật bằng nút ở header).
- [ ] Mọi nút chỉ có icon có `aria-label` + `Tooltip`; điều hướng bằng bàn phím được; focus ring còn nguyên.
- [ ] Mọi trang có `useDocumentTitle` đúng như ghi ở từng mục.
- [ ] Nút và message dùng cùng động từ (Lưu thay đổi → Đã lưu thay đổi…).
