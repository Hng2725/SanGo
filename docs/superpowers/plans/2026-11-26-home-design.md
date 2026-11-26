# Home Design Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution.

**Goal:** Đồng bộ trang chủ với hệ thống thiết kế Vạch sân, giữ luồng tìm sân và dữ liệu API hiện có.

**Architecture:** HomePage kết nối API và điều phối nội dung; tách bộ tìm nhanh và lối tắt môn vào `features/search/components`. Dùng lại VenueCard cho trang chủ và kết quả tìm kiếm, cập nhật component này bằng CSS Module theo token chung.

**Tech Stack:** React, TypeScript, Ant Design, CSS Modules, RTK Query, Vitest/RTL/MSW.

**Spec:** `docs/Thiết kế/00_HE_THONG_THIET_KE.md`, `docs/Thiết kế/01_Hung_GIAO_DIEN.md`, `docs/Phân chia/02_Hieu.md` và yêu cầu chỉnh trang chủ của người dùng.

## Design decisions

- Nền sạch, viền 1px, bo góc 12px; tiêu đề căn trái dùng Barlow Condensed, nội dung Be Vietnam Pro.
- Giữ màu xanh cho nút/link; bỏ gradient xanh dương. Không thêm chuyển động tự chạy, bóng thẻ hoặc họa tiết sân ngoài các vị trí quy định.
- Khối tìm nhanh có nhãn truy cập được, các trường và nút cao đồng bộ. Sáu lối tắt môn có SportIcon.
- Bảng chỉ số nhỏ nền Cỏ đêm dùng tổng cụm sân từ API và số môn từ SPORTS; lỗi/chờ không tạo số giả.
- Thẻ sân dùng ảnh dữ liệu thật; thiếu/hỏng ảnh dùng icon trên nền trung tính, không gọi dịch vụ ảnh placeholder bên ngoài.
- Cân nhắc chỉ đổi màu hero: không giải quyết nhãn form, icon và thẻ sân. Chọn cập nhật cả bố cục tìm sân cùng các thành phần liên quan theo cùng hệ thống thiết kế.

## Global Constraints

- Không đổi REST API, dữ liệu shared, quyền tài khoản hoặc logic đặt sân.
- Không thêm dependency, không commit/push; giữ thay đổi chưa commit của các lượt trước.
- Responsive ở 375/768/1280px, hỗ trợ dark mode và reduced motion.

## Review Focus

- Bộ lọc và ngày đã chọn phải được giữ khi tìm sân và mở chi tiết sân.
- Loading, lỗi và dữ liệu trống phải có trạng thái riêng; lỗi có nút thử lại.
- Ảnh hỏng/thiếu không gây request placeholder ngoài hoặc vỡ bố cục.
- Dropdown vẫn mở khi reduced motion; mobile không cuộn ngang.

## Tasks

- [x] Viết/chạy test hành vi tìm sân, thử lại lỗi và fallback ảnh; bổ sung MSW vào smoke test App.
- [x] Tạo QuickSearchForm, SportShortcuts; cập nhật HomePage và VenueCard cùng CSS Modules.
- [x] Chạy lint, test, build; kiểm tra trình duyệt desktop/mobile/dark/reduced motion và rà diff.

## Verification results

- `npm run build`: PASS; FE build repeated after final CSS edits: PASS.
- `npm test`: PASS, shared 30 tests, BE 120 tests, FE 60 tests (210 total).
- Updated the existing App smoke test with API handlers; it now matches the actual home page and passes.
- New tests verify selected sport/city/date navigation, retaining dates in venue links, retrying API failures, and broken-image fallback.
- Targeted ESLint for changed home/search/test files: PASS.
- `npm run lint`: pre-existing BE 41 errors, 7 warnings; full FE lint: pre-existing 8 errors, 8 warnings. No new lint errors in changed files.
- Unrelated BE auto-format changes from lint restored to their pre-run contents; BE/shared have no changes.
- Browser: desktop 1280px, tablet 768px, mobile 375px have no horizontal overflow. All quick-search controls measure 46px high. Dark mode and reduced-motion dropdown visibility verified.
- `git diff --check`: PASS. No commit or push.
