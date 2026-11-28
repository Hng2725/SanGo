# Components dùng chung

```text
components/
├── branding/   BrandLogo, CourtLines
├── charts/     BookingChart (biểu đồ lượt đặt dùng chung cho admin và chủ sân)
├── feedback/   ConfirmAction, EmptyState, ErrorState, FullPageSpinner, StatusDot
├── forms/      RHFFields, PasswordRequirements, FilterField
├── icons/      SportIcon
├── layout/     DashboardShell, HeaderActions, PageHeader, Section, ErrorNavigation
└── index.ts    Các export công khai
```

Đặt ở đây các thành phần giao diện dùng giữa nhiều feature hoặc thuộc hệ thống giao diện chung. Test đặt trong `__tests__` cạnh nhóm component tương ứng.

Component gắn với nghiệp vụ riêng nằm ở `features/<feature>/components`, chẳng hạn `UserRoleTag`, `QuickSearchForm`, `SportShortcuts`, `VenueCard` và `AvailabilityGrid`. Khi một feature khác cần dùng, export qua `features/<feature>/index.ts`.

`layouts/` chứa layout của route, kết hợp các component dùng chung. `pages/` và `features/<feature>/pages/` chứa trang, kết nối API và điều phối component. `common/` chứa API, hook, context, HOC, theme và tiện ích dùng chung.

Ưu tiên import trực tiếp để thể hiện nhóm và giữ phụ thuộc rõ ràng:

```tsx
import { PageHeader } from '@/components/layout/PageHeader';
import { RHFInput } from '@/components/forms/RHFFields';
import { EmptyState } from '@/components/feedback/EmptyState';
```

Component bên trong thư mục này không import từ barrel `@/components` để tránh phụ thuộc vòng.

`ErrorNavigation` giữ menu bên trái cho các trang lỗi công khai (404, 403, lỗi tải trang hoặc cụm sân không tồn tại); dưới 992px dùng drawer bên trái. Lỗi trong khu chủ sân/quản trị/tài khoản dùng lại layout tương ứng, giữ guard và menu của khu đó.

`FilterField` dùng chung nhãn, icon và kích thước ô lọc cho trang chủ và trang Tìm sân. Màu nền được lấy từ CSS variables và theme Ant Design; cập nhật cùng `common/theme/tokens.ts`, `styles/global.css` và tài liệu hệ thống thiết kế khi đổi palette.
