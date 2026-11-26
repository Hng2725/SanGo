# HỆ THỐNG THIẾT KẾ – SanGo (dùng chung cho cả nhóm)

> Áp dụng cho **mọi màn hình FE**. Mỗi thành viên có file thiết kế màn hình riêng (`01_Hung_GIAO_DIEN.md`, …) nhưng phải tuân theo file này.
> Thư viện: **Ant Design 6 (antd, miễn phí, MIT)** + **@ant-design/icons** (chỉ bộ *Outlined*). Không dùng Tailwind, MUI, Bootstrap.
> Coding agent: đọc file này trước khi viết bất kỳ component giao diện nào.

---

## 1. Ý tưởng

**"Vạch sân"** – giao diện như một mặt sân đã kẻ vạch: nền sạch, đường kẻ mảnh và chính xác, màu cỏ chỉ xuất hiện ở nơi người dùng cần hành động.

Ba nguyên tắc:

1. **Một điểm nhấn duy nhất.** Mô-típ vạch kẻ sân (SVG nét mảnh) chỉ xuất hiện ở: màn đăng nhập/đăng ký (lớn, có animation), logo, minh họa trang lỗi, và thanh chỉ mục 3px của menu đang chọn. Không dùng ở chỗ khác.
2. **Màu xanh = hành động hoặc lựa chọn.** Nút chính, link, mục menu đang chọn, ô đang chọn. Không dùng xanh để trang trí nền, không gradient.
3. **Đường viền thay cho bóng đổ.** Khối nội dung trên trang dùng viền 1px, không đổ bóng. Bóng chỉ dành cho lớp nổi (dropdown, modal, drawer, popover) – để mặc định antd.

---

## 2. Màu (token)

| Tên | Light | Dark | Dùng cho |
|---|---|---|---|
| **Cỏ** (primary) | `#1E7A4F` | `#65C694` | Nút chính, link, mục đang chọn, focus |
| **Cỏ đậm** | `#155C3B` | `#4BA77A` | Hover/active nút chính |
| **Mực** (text) | `#1B2420` | `#E9F2EC` | Chữ chính |
| **Đá** (text phụ) | `#5F6B66` | `#ADBCB2` | Mô tả, nhãn phụ, placeholder đậm |
| **Vạch** (border) | `#D2DED5` | `#455B4D` | Viền khối, đường phân cách |
| **Nền** (app bg) | `#EAF0EB` | `#223128` | Nền toàn ứng dụng, nền header bảng |
| **Mặt sân** (surface) | `#F8FAF7` | `#2B3C33` | Nền khối nội dung, header |
| **Lớp nổi** (elevated) | `#FFFFFF` | `#354B3E` | Dropdown, modal, popover |
| **Vùng chọn** (selected) | `#E6F1E9` | `#2B4938` | Nền bộ lọc hoặc menu được chọn |
| **Cỏ đêm** | `#0E3B28` | `#183F2D` | Nền Sider khu quản trị, dải "bảng tỉ số", lớp phủ ảnh màn đăng nhập |
| **Vôi** (accent) | `#C6F06A` | `#C6F06A` | **Chỉ dùng trên nền Cỏ đêm**: icon logo, vạch chỉ mục menu đang chọn, chỉ số tăng, thanh tiến độ trong bảng tỉ số, icon chip môn. Không dùng trên nền trắng |

Màu trạng thái (giữ trầm, đủ tương phản AA trên nền trắng):

| Ý nghĩa | Màu | Ví dụ |
|---|---|---|
| Thành công / đã xác nhận | `#1E7A4F` (= Cỏ) | Đã duyệt, Đã xác nhận |
| Chờ / cảnh báo | `#B7791F` | Chờ duyệt, Chờ xác nhận |
| Lỗi / từ chối / khóa | `#C2410C` | Bị khóa, Từ chối |
| Thông tin / trung tính | `#3B6EA8` | Đang xử lý |
| Kết thúc / không hoạt động | `#8A9690` | Đã hủy, Hoàn thành |

Hiển thị trạng thái bằng **`<Badge status>` (chấm + chữ)**, không dùng `Tag` màu đặc. Chỉ dùng `Tag` (viền, nền trong suốt) cho phân loại như vai trò hoặc môn thể thao.

---

## 3. Chữ

Hai font, vai trò tách bạch (cả hai miễn phí trên Google Fonts, có đủ dấu tiếng Việt):

- **Barlow Condensed** (600 / 700) – font **hiển thị kiểu bảng tỉ số / truyền hình thể thao**. Chỉ dùng cho: chữ "SanGo" ở logo, tiêu đề lớn màn đăng nhập/đăng ký, tiêu đề trang (H1), con số lớn (bảng tỉ số, số đếm hàng chờ, nhãn giá trị biểu đồ). Không dùng cho đoạn văn, nút, nhãn form.
- **Be Vietnam Pro** (400 / 500 / 600 / 700) – font nội dung cho mọi thứ còn lại. Fallback: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Số liệu (tiền, số lượng, ngày giờ trong bảng, thống kê): `font-variant-numeric: tabular-nums` để các cột số thẳng hàng.

| Vai trò | Font | Size / line-height | Weight | Ghi chú |
|---|---|---|---|---|
| Tiêu đề màn đăng nhập | Barlow Condensed | 60 / 60 (mobile 40 / 42) | 700 | 2 dòng ngắn, chỉ ở AuthLayout |
| Tiêu đề form đăng nhập/đăng ký | Barlow Condensed | 40 / 44 | 700 | |
| Tiêu đề trang (H1) | Barlow Condensed | 36 / 40 | 700 | |
| Số trong bảng tỉ số | Barlow Condensed | 46 / 52 (mobile 36 / 42) | 600 | tabular-nums |
| Số đếm hàng chờ, nhãn cột biểu đồ | Barlow Condensed | 28 / 30 và 16 | 600 | |
| Logo "SanGo" | Barlow Condensed | 24 | 700 | |
| Tiêu đề khối (H2) | Be Vietnam Pro | 16 / 24 | 600 | |
| Nội dung | Be Vietnam Pro | 14 / 22 | 400 | mặc định antd |
| Chữ phụ | Be Vietnam Pro | 13 / 20 | 400 | màu Đá |

Quy tắc chữ:
- **Không VIẾT HOA nhãn**, không dòng nhãn nhỏ phía trên tiêu đề, không tô màu riêng một từ trong tiêu đề.
- Viết hoa chữ cái đầu câu (sentence case) cho mọi tiêu đề, nút, menu.
- Không thêm `→` vào nút hoặc link. Không nối thông tin bằng dấu `·`; tách thành cột hoặc dòng riêng.
- Độ dài dòng văn bản ≤ 72 ký tự (`max-width: 60ch` cho đoạn mô tả).

---

## 4. Hình khối, khoảng cách, bố cục

**Bo góc theo cấp bậc** (không dùng một bán kính cho mọi thứ):

| Phần tử | Bo góc |
|---|---|
| Tag, Badge, ô checkbox | 6px |
| Input, Select, Button, mục Menu | 8px (`borderRadius` của antd) |
| Khối nội dung (Section/Card), Table wrapper | 12px |
| Modal, Drawer cạnh nổi | 14px |
| Avatar | tròn |

**Khoảng cách:** bậc 4 → `4, 8, 12, 16, 24, 32, 48`. Padding nội dung trang: desktop 32, tablet 24, mobile 16. Khoảng cách giữa các khối dọc: 24.

**Breakpoint** (theo antd `Grid.useBreakpoint`): `xs < 576`, `sm ≥ 576`, `md ≥ 768`, `lg ≥ 992`, `xl ≥ 1200`.
- `< lg`: Sider khu quản trị chuyển thành Drawer; bảng chuyển thành danh sách.
- `< md`: panel minh họa màn đăng nhập thu thành dải ngang phía trên.

**Căn lề:** nội dung căn trái. Chỉ căn giữa ở: form đăng nhập/đăng ký, trang lỗi, trang chờ duyệt, trạng thái rỗng.

**Độ rộng tối đa vùng nội dung:** 1280px (khu quản trị), 1200px (khu công khai), 720px (trang form như Hồ sơ).

---

## 5. Chuyển động

Token (dùng chung cho CSS và antd):

| Token | Giá trị |
|---|---|
| `--motion-fast` | 120ms |
| `--motion-mid` | 200ms |
| `--motion-slow` | 320ms |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |

Quy tắc:
1. **Chỉ có một khoảnh khắc chuyển động tự chạy:** vạch sân tự kẻ trên AuthLayout khi vào trang (≈ 1,2 giây). Không thêm hiệu ứng fade-up cho từng khối, không animation khi rê chuột lên thẻ.
2. **Chuyển trang:** dùng **View Transitions** của React Router (`viewTransition` trên `Link`/`NavLink`, `navigate(to, { viewTransition: true })`). Chỉ vùng nội dung cross-fade 200ms; header và sider đứng yên (gán `view-transition-name`). Trình duyệt không hỗ trợ thì chuyển ngay, không lỗi.
3. **Chuyển động phản hồi thao tác** (mở modal, drawer, dropdown, thu gọn sider, message): dùng sẵn của antd, không tự viết thêm.
4. Tắt hiệu ứng gợn sóng khi bấm nút (`wave: { disabled: true }`) cho cảm giác gọn.
5. **Tôn trọng `prefers-reduced-motion`:** tắt animation vạch sân, tắt view transition, và đặt `token.motion = false` cho antd.

---

## 6. Theme Ant Design (code mẫu – Hưng tạo, mọi người dùng)

`FE/src/common/theme/tokens.ts`

```ts
export const palette = {
  light: { primary: '#1E7A4F', primaryStrong: '#155C3B', ink: '#1B2420', stone: '#5F6B66', line: '#D2DED5', base: '#EAF0EB', surface: '#F8FAF7', elevated: '#FFFFFF', selected: '#E6F1E9', night: '#0E3B28', onPrimary: '#FFFFFF' },
  dark:  { primary: '#65C694', primaryStrong: '#4BA77A', ink: '#E9F2EC', stone: '#ADBCB2', line: '#455B4D', base: '#223128', surface: '#2B3C33', elevated: '#354B3E', selected: '#2B4938', night: '#183F2D', onPrimary: '#132B1E' },
} as const;
export const accentLime = '#C6F06A'; // chỉ dùng trên nền night
export const fontDisplay = '"Barlow Condensed", "Be Vietnam Pro", sans-serif';
export const statusColor = { success: '#1E7A4F', warning: '#B7791F', error: '#C2410C', info: '#3B6EA8', muted: '#8A9690' } as const;
export type ThemeMode = keyof typeof palette;
```

`FE/src/common/theme/antdTheme.ts`

```ts
import { theme, type ThemeConfig } from 'antd';
import { palette, statusColor, type ThemeMode } from './tokens';

export function getAntdTheme(mode: ThemeMode, reducedMotion: boolean): ThemeConfig {
  const c = palette[mode];
  return {
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    cssVar: { prefix: 'sg' },               // biến CSS: var(--sg-color-primary)…
    token: {
      colorPrimary: c.primary,
      colorLink: c.primary,
      colorSuccess: statusColor.success,
      colorWarning: statusColor.warning,
      colorError: statusColor.error,
      colorInfo: statusColor.info,
      colorText: c.ink,
      colorTextSecondary: c.stone,
      colorBorder: c.line,
      colorBorderSecondary: c.line,
      colorBgLayout: c.base,
      colorBgContainer: c.surface,
      colorBgElevated: c.elevated,
      colorTextPlaceholder: c.stone,
      fontFamily: '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      borderRadius: 8,
      borderRadiusSM: 6,
      borderRadiusLG: 12,
      controlHeight: 38,
      controlHeightLG: 44,
      boxShadowTertiary: 'none',
      motion: !reducedMotion,
      motionDurationMid: reducedMotion ? '0s' : '0.2s',
      motionEaseOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
    components: {
      Layout: { headerBg: c.surface, siderBg: c.night, bodyBg: c.base, headerHeight: 60, headerPadding: '0 28px' },
      Menu: {
        // Menu trong Sider dùng theme="dark" của antd → các token dark* bên dưới
        darkItemBg: c.night, darkSubMenuItemBg: c.night,
        darkItemColor: 'rgba(255,255,255,0.74)', darkItemHoverBg: 'rgba(255,255,255,0.06)', darkItemHoverColor: '#FFFFFF',
        darkItemSelectedBg: 'rgba(255,255,255,0.10)', darkItemSelectedColor: '#FFFFFF',
        itemBorderRadius: 8, itemMarginInline: 10, itemHeight: 42, activeBarBorderWidth: 0,
        // Menu sáng (khu "của tôi" /me/*)
        itemBg: 'transparent', itemSelectedBg: c.selected, itemSelectedColor: c.primary,
      },
      Button: { primaryColor: c.onPrimary, primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none', fontWeight: 500 },
      Card: { headerFontSize: 16, paddingLG: 24 },
      Table: { headerBg: c.base, headerColor: c.stone, headerSplitColor: 'transparent', rowHoverBg: c.base, cellPaddingBlock: 14 },
      Modal: { borderRadiusLG: 14, titleFontSize: 18 },
      Segmented: { itemSelectedBg: c.surface },
      Statistic: { contentFontSize: 28 },
    },
  };
}
```

`FE/src/app/providers.tsx` (rút gọn):

```tsx
<ConfigProvider locale={viVN} theme={getAntdTheme(mode, reducedMotion)} wave={{ disabled: true }}>
  <AntdApp>{/* App của antd: cung cấp message, notification, modal qua App.useApp() */}
    {children}
  </AntdApp>
</ConfigProvider>
```

- `locale`: `import viVN from 'antd/locale/vi_VN'` (đổi `en_US` khi LanguageContext = en) và `dayjs.locale('vi')`.
- `mode` lấy từ `ThemeContext`; `reducedMotion` lấy từ `useMediaQuery('(prefers-reduced-motion: reduce)')`.
- **Thông báo:** luôn dùng `const { message, modal, notification } = App.useApp()`. Không gọi `message.success()` tĩnh (không ăn theme).

`FE/src/styles/global.css`:

```css
:root {
  --motion-fast: 120ms; --motion-mid: 200ms; --motion-slow: 320ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1); --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
html, body, #root { min-height: 100%; }
body { margin: 0; -webkit-font-smoothing: antialiased; }
.num { font-variant-numeric: tabular-nums; }

/* Chuyển trang: chỉ vùng nội dung cross-fade, khung đứng yên */
::view-transition-old(root), ::view-transition-new(root) { animation-duration: var(--motion-mid); animation-timing-function: var(--ease-out); }
.app-header { view-transition-name: app-header; }
.app-sider  { view-transition-name: app-sider; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

`index.html` thêm font:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap&subset=vietnamese" rel="stylesheet" />
```

`global.css` thêm lớp tiện ích cho font hiển thị: `.display { font-family: "Barlow Condensed", "Be Vietnam Pro", sans-serif; letter-spacing: 0.005em; }` (hoặc dùng `fontDisplay` từ `tokens.ts` trong CSS Module).

---

## 7. Cách viết style

- **Ưu tiên props và token của antd** (`Flex`, `Space`, `Row/Col`, `Typography`, `theme.useToken()`).
- Style riêng của component: **CSS Modules** (`Xxx.module.css`) dùng biến CSS của antd (`var(--sg-color-primary)`, `var(--sg-color-border)`…), **không** ghi cứng mã màu trong component.
- Không dùng `style={{…}}` inline cho thứ lặp lại; chỉ dùng inline cho giá trị động (chiều cao virtualizer…).
- Dark mode: tự có nhờ `algorithm` và biến CSS. Không viết CSS riêng cho dark trừ SVG minh họa (dùng `currentColor`).

---

## 8. Component dùng chung (Hưng làm trong `components`, mọi người dùng)

| Component | Dựa trên antd | Mô tả |
|---|---|---|
| `BrandLogo` | SVG + Typography | Dấu sân (ô chữ nhật bo 4, vạch giữa, vòng tròn tâm) + chữ "SanGo" 600. Props `size`, `inverted` (trắng trên nền xanh) |
| `CourtLines` | SVG | Hình sân nét mảnh. Props `variant: 'pitch' | 'out'`, `animated` |
| `PageHeader` | Typography + Flex | Tiêu đề H1, mô tả (tùy chọn), vùng hành động bên phải, breadcrumb (tùy chọn). Mobile: hành động xuống dòng |
| `Section` | `div` + CSS Module | Khối nội dung: nền Mặt sân, viền Vạch 1px, bo 12, padding 24 (mobile 16), tiêu đề H2 + hành động. **Thay cho Card có bóng** |
| `StatusDot` | `Badge status` | Nhận `tone: 'success' | 'warning' | 'error' | 'info' | 'muted'` + `text` |
| `EmptyState` | `Empty` | Hình đơn giản + 1 câu nói rõ chuyện gì + 1 nút hành động |
| `FullPageSpinner` | `Spin` | Logo + Spin, hiện sau 300ms để tránh nháy |
| `RHFInput`, `RHFPassword`, `RHFSelect`, `RHFTextArea` | `Form.Item` + `Controller` | Nối react-hook-form với antd: `validateStatus='error'` + `help={error.message}`. Form dùng `<Form layout="vertical" component="form" onFinish={…}>` |
| `ConfirmAction` | `modal.confirm` (App.useApp) | Hộp xác nhận có tiêu đề nói rõ hành động, nút xác nhận gọi đúng tên hành động |
| `DashboardShell` | `Layout`, `Sider`, `Menu`, `Drawer` | Khung khu quản trị dùng chung cho Owner và Admin (xem `01_Hung_GIAO_DIEN.md` mục 4) |

---

## 9. Icon

- Chỉ dùng `@ant-design/icons` bản **Outlined** (`HomeOutlined`, `TeamOutlined`, …). Không trộn Filled/TwoTone.
- Icon đi kèm chữ ở menu và nút hành động. Nút chỉ có icon phải có `aria-label` và `Tooltip`.
- Kích thước: 16 trong menu và nút, 20 cho icon nút đứng một mình ở header.

---

## 10. Viết nội dung (copy)

- Gọi tên theo cách người dùng hiểu: "Lịch đặt của tôi", không gọi "Bookings"; "Khóa tài khoản", không gọi "Set status LOCKED".
- Nút nói đúng việc sẽ xảy ra, và thông báo sau đó dùng lại đúng động từ đó: nút **"Lưu thay đổi"** → message **"Đã lưu thay đổi"**; nút **"Duyệt chủ sân"** → **"Đã duyệt chủ sân"**.
- Lỗi: nói rõ chuyện gì xảy ra và cách sửa, không xin lỗi, không mơ hồ. Ví dụ: "Email hoặc mật khẩu chưa đúng. Kiểm tra lại rồi thử lần nữa."
- Trạng thái rỗng: một câu hướng dẫn + một nút. Ví dụ: "Chưa có chủ sân nào chờ duyệt."
- Không dùng chữ quảng cáo ("tuyệt vời", "nhanh chóng vượt trội"), không emoji trong giao diện.

---

## 11. Ảnh (chỗ nào cần ảnh, lấy ở đâu)

Nguyên tắc: **chỉ dùng ảnh thật ở nơi cần cảm giác "ra sân"**; mọi minh họa khác dùng SVG vạch sân (`CourtLines`) và icon. Ảnh tĩnh để ở `FE/src/assets/images/` (import trong code để Vite tối ưu), định dạng WebP, có bản JPG dự phòng nếu cần.

| File | Dùng ở | Nội dung ảnh | Kích thước | Ghi chú |
|---|---|---|---|---|
| `auth-hero.webp` | Nền panel trái màn **Đăng nhập** và **Đăng ký** | Sân bóng đá mini (cỏ nhân tạo) buổi tối dưới đèn, góc chụp rộng, không có người nhìn thẳng ống kính, tông xanh | Ảnh dọc ≥ 1200×1600, ≤ 300 KB | Phủ lớp `rgba(10,46,31,0.74)` để chữ trắng đọc được; `object-fit: cover; object-position: center` |
| (dữ liệu) `venue.imageUrls[0]` | Ảnh thu nhỏ 64×44 trong bảng "Cụm sân nhiều lượt đặt nhất" (dashboard admin), và các trang của Lâm/Hiếu | Ảnh do **chủ sân tải lên** (URL lưu trong DB) | – | Không phải ảnh tĩnh trong code. Không có ảnh → ô nền Nền + icon môn thể thao |

Nguồn ảnh miễn phí, dùng thương mại không cần ghi công: **Unsplash** (unsplash.com, tìm "futsal night", "five a side football", "badminton court") hoặc **Pexels** (pexels.com). Ghi link nguồn ảnh vào `FE/src/assets/images/CREDITS.md`. Ảnh seed cho cụm sân: `https://picsum.photos/seed/<slug>/800/500` (miễn phí).

Những chỗ **không** dùng ảnh: avatar (dùng chữ cái đầu tên), trang lỗi 404/403 (SVG vạch sân), trạng thái rỗng (SVG + icon), logo (SVG).

## 12. Khả năng truy cập & responsive (bắt buộc)

- Kiểm tra ở 375px, 768px, 1280px; trang không cuộn ngang.
- Giữ focus ring mặc định của antd; không `outline: none`.
- Tương phản chữ ≥ 4.5:1 (các màu trên đã đạt với nền tương ứng).
- Vùng bấm trên mobile ≥ 40×40px.
- Mọi ảnh/SVG trang trí có `aria-hidden="true"`; SVG mang nghĩa có `role="img"` + `aria-label`.
