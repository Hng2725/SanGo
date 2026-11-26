# Search and Theme Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution.

**Goal:** Làm nền sáng/tối dịu mắt và đồng bộ trang Tìm sân với hệ thống Vạch sân theo yêu cầu người dùng.

**Architecture:** Cập nhật palette chung, CSS variables và Ant Design cùng lúc để nền trang, khối nội dung và popup có ba cấp độ rõ ràng. SearchPage kết nối API/URL; SearchFilters quản lý phần trình bày; FilterField dùng chung với form trang chủ để đồng bộ nhãn và chiều cao.

**Tech Stack:** React, TypeScript, Ant Design, CSS Modules, RTK Query, Vitest/RTL/MSW.

**Spec:** Yêu cầu mới về màu nền; `docs/Thiết kế/00_HE_THONG_THIET_KE.md`, `FE/CLAUDE.md`, phân công Hưng và Hiếu.

## Design decisions

- Sáng: nền xanh xám `#EAF0EB`, mặt khối `#F8FAF7`, popup trắng. Tối: nền `#223128`, mặt khối `#2B3C33`, popup `#354B3E`.
- Giữ nhận diện xanh; tăng độ sáng primary dark để dễ đọc trên nền mới, dùng chữ tối trên nút primary dark để đủ tương phản.
- Hai hàng lọc trên desktop; mỗi trường có nhãn/icon, cao 46px. Các nút môn có icon và trạng thái chọn rõ ràng.
- Tách hàng kết quả/sắp xếp khỏi bộ lọc, giữ tên sắp xếp đầy đủ. Tái sử dụng VenueCard; dùng VenuesMap hiện có cho tab bản đồ.
- Giữ bộ lọc trên URL; chỉ debounce truy vấn từ khóa, tránh trạng thái input bị cũ khi đặt lại hoặc điều hướng lịch sử.

## Global Constraints

- Không đổi API/shared/DB hoặc nghiệp vụ đặt sân; không thêm dependency.
- Giữ các thay đổi chưa commit; không commit/push.
- Kiểm tra 375/768/1280px, dark mode và reduced motion.

## Review Focus

- Đổi thành phố phải xóa quận cũ và quay về trang 1.
- Xóa ngày phải xóa khung giờ; giờ kết thúc lớn hơn giờ bắt đầu.
- Đặt lại và back/forward không giữ từ khóa cũ; API vẫn debounce 400ms.
- Lỗi khác trạng thái rỗng và có nút thử lại; số kết quả không hiển thị số giả.
- Nền/khối/popup phân biệt được; chữ và nút đủ tương phản.

## Tasks

- [x] Viết/chạy test bộ lọc phụ thuộc, từ khóa/đặt lại và thử lại API lỗi.
- [x] Cập nhật theme, tạo FilterField/SearchFilters, sửa SearchPage và đồng bộ form trang chủ.
- [x] Cập nhật tài liệu màu, chạy lint/test/build và kiểm tra trình duyệt.

## Verification results

- Root build PASS; FE build repeated after final palette contrast edits PASS.
- Root tests PASS: shared 30, BE 120, FE 63 (213 total).
- Targeted ESLint for changed theme/form/search files PASS. Full FE lint now has 7 existing errors, 8 warnings; root lint stops at existing BE 41 errors, 7 warnings.
- BE lint auto-format edits restored to baseline. No BE/shared source changes.
- Browser: light desktop search layout reviewed; search controls all 46px high. Home/search checked at 375px, search also 768px and 1280px; no horizontal overflow.
- Dark theme uses a sage canvas, lighter surfaces and elevated popup background. Actual primary button contrast measured 5.44:1. Selected filter backgrounds adjusted to >=4.5:1 with primary text in both themes.
- Reduced-motion mobile dropdown opens and uses the elevated dark surface.
- Map tab correctly explains missing coordinates; existing data has no geolocated venues, so live markers cannot be verified against that data. No coordinates fabricated.
- API local was unavailable during final browser verification. Started the existing BE start:dev command; API health and Vite proxy return 200, and venue data loads.
- `git diff --check` PASS. No commit or push.
