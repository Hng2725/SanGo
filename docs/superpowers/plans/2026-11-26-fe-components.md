# FE Components Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Tổ chức component FE rõ ràng theo phạm vi tái sử dụng.

**Architecture:** Chuyển UI dùng chung từ `src/common/ui` sang `src/components`, nhóm theo trách nhiệm. Component nghiệp vụ tiếp tục ở `features/<feature>/components`; page và layout của route giữ nguyên thư mục. Tách phần gợi ý mật khẩu bị lặp và nhãn vai trò khỏi page.

**Tech Stack:** React, TypeScript, Ant Design, Vite, Vitest + RTL.

**Spec:** Yêu cầu tổ chức FE của người dùng; `FE/CLAUDE.md`, `docs/Đề bài/TONG_QUAN_DE_TAI.md`, `docs/Phân chia/01_Hung.md`.

## Global Constraints

- Giữ nguyên giao diện, hành vi, hợp đồng API và kiểu dữ liệu shared.
- Không thêm thư viện; không commit/push.
- Giữ các thay đổi sửa reduced motion đang có trong workspace.
- Component dùng chung thuộc phạm vi Hưng; chỉ sửa import ở feature khác.

## Review Focus

- Import sau di chuyển phải được TypeScript/build giải quyết đúng.
- Test của component phải được chuyển cùng và vẫn được Vitest phát hiện.
- Gợi ý mật khẩu ở đăng ký và hồ sơ giữ nguyên nội dung, CSS và trạng thái.
- Nhãn vai trò giữ nguyên màu và nhãn trên cả desktop/mobile.
- Tài liệu chỉ đúng đường dẫn mới, không tạo barrel import vòng.

## Task 1: Shared components và import

**Files:** `FE/src/common/ui/*` → `FE/src/components/{branding,feedback,forms,icons,layout}/`; các file FE đang import UI.

**Interfaces:** Giữ nguyên named exports và props, dùng import trực tiếp `@/components/<group>/<Name>`.

- [x] Di chuyển component, test và cập nhật import; bổ sung root `index.ts`.
- [x] Build để kiểm tra import và lazy route.

## Task 2: Tách phần UI dùng lại trong page

**Files:** `components/forms/PasswordRequirements.tsx`, `features/admin-users/components/UserRoleTag.tsx`; RegisterPage, ProfilePage, AdminUsersPage.

**Interfaces:** `PasswordRequirements({ password?: string, className?: string })`; `UserRoleTag({ role: UserDto['role'] })`.

- [x] Tách nguyên markup và điều kiện đang có, dùng lại ở page.
- [x] Chạy test hiện có của component/auth/admin để phát hiện hồi quy.

## Task 3: Hướng dẫn và kiểm tra

**Files:** `FE/src/components/README.md`, `FE/CLAUDE.md`, README và tài liệu đang trỏ tới `common/ui`.

- [x] Cập nhật cấu trúc và quy tắc chọn shared component hoặc feature component.
- [x] Chạy `npm run lint`, `npm test`, `npm run build`; ghi nhận lỗi có sẵn ngoài phạm vi.
- [x] Rà diff để giữ thay đổi thuần refactor, không sửa hành vi nghiệp vụ.

## Verification results

- `npm run build`: PASS.
- Targeted FE ESLint for components, auth, profile and admin-users: PASS.
- `npm run lint`: existing BE failures (41 errors, 7 warnings). BE auto-format changes restored to pre-run contents.
- FE full lint: existing 8 errors, 8 warnings in availability/search/owner-schedule and context/layout exports.
- `npm test`: shared 30 PASS, BE 120 PASS, FE 56 PASS / 1 existing failure in App.test.tsx (old homepage heading and missing MSW handlers).
- Browser: register and profile pages render; extracted password hints update for valid and invalid passwords. Admin users page renders the extracted role tags with existing labels and color classes.
- Audit: 13 moved components and 2 moved tests preserve original contents except internal import paths.
- Ruling: use existing tests and browser verification for this reversible structural refactor; do not add tests that duplicate the moved implementation. No commit or push.
