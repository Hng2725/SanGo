# Components dùng chung

```text
components/
├── branding/   BrandLogo, CourtLines
├── feedback/   ConfirmAction, EmptyState, ErrorState, FullPageSpinner, StatusDot
├── forms/      RHFFields, PasswordRequirements, FilterField
├── icons/      SportIcon
├── layout/     DashboardShell, HeaderActions, PageHeader, Section
└── index.ts    Các export công khai
```

Đặt ở đây các thành phần giao diện dùng giữa nhiều feature hoặc thuộc hệ thống giao diện chung. Test đặt trong `__tests__` cạnh nhóm component tương ứng.

Component gắn với nghiệp vụ riêng nằm ở `features/<feature>/components`, chẳng hạn `BookingChart`, `UserRoleTag`, `QuickSearchForm`, `SportShortcuts`, `VenueCard` và `AvailabilityGrid`. Khi một feature khác cần dùng, export qua `features/<feature>/index.ts`.

`layouts/` chứa layout của route, kết hợp các component dùng chung. `pages/` và `features/<feature>/pages/` chứa trang, kết nối API và điều phối component. `common/` chứa API, hook, context, HOC, theme và tiện ích dùng chung.

Ưu tiên import trực tiếp để thể hiện nhóm và giữ phụ thuộc rõ ràng:

```tsx
import { PageHeader } from '@/components/layout/PageHeader';
import { RHFInput } from '@/components/forms/RHFFields';
import { EmptyState } from '@/components/feedback/EmptyState';
```

Component bên trong thư mục này không import từ barrel `@/components` để tránh phụ thuộc vòng.

`FilterField` dùng chung nhãn, icon và kích thước ô lọc cho trang chủ và trang Tìm sân. Màu nền được lấy từ CSS variables và theme Ant Design; cập nhật cùng `common/theme/tokens.ts`, `styles/global.css` và tài liệu hệ thống thiết kế khi đổi palette.
