# SanGo

SanGo là ứng dụng đặt lịch sân thể thao theo giờ. Monorepo gồm React/Vite (`FE`), NestJS/Prisma (`BE`) và kiểu dữ liệu, schema Zod, hàm thời gian dùng chung (`shared`).

## Chạy cục bộ

Yêu cầu Node.js 22, npm 10 và Docker Desktop.

```bash
npm ci
docker compose up -d
cp BE/.env.example BE/.env
cp FE/.env.example FE/.env
npm run db:migrate
npm run db:seed
npm run dev
```

Lệnh `npm run dev` in sẵn link Website, API health và Mailpit trong terminal để mở nhanh.

Mở giao diện tại `http://localhost:5173`, API health tại `http://localhost:3000/api/health`, hộp thư Mailpit tại `http://localhost:8025`.

Khi clone hoặc cập nhật code, chạy `npm ci` tại thư mục gốc `SanGo` để cài đúng phiên bản trong `package-lock.json` cho cả FE, BE và shared. Menu tài khoản, ngôn ngữ và thao tác người dùng hỗ trợ rê chuột, bấm/chạm, hoặc dùng Tab rồi Enter/Space.

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `admin@sango.vn` | `Admin@123` | Quản trị viên |
| `owner@sango.vn` | `Owner@123` | Chủ sân đã duyệt |
| `owner2@sango.vn` | `Owner@123` | Chủ sân đã duyệt |
| `owner.pending@sango.vn` | `Owner@123` | Chủ sân chờ duyệt |
| `customer@sango.vn` | `Customer@123` | Khách đặt sân |
| `customer2@sango.vn` | `Customer@123` | Khách đặt sân |

Seed tạo tổng cộng 10 khách đặt sân, 16 chủ sân và 1 quản trị viên. Trang Tổng quan có dữ liệu mẫu gồm 5 cụm sân, 201 đơn trong 7 ngày gần nhất, đánh giá và khiếu nại. Ảnh sân để trống để bổ sung sau. Mật khẩu demo chỉ dành cho môi trường phát triển; thay seed/secret trước khi triển khai công khai.

Để cập nhật dữ liệu mẫu Tổng quan theo ngày hiện tại trên database đang dùng:

```bash
npm run prisma:preview -w @sango/be
```

Lệnh này cập nhật các bản ghi demo, giảm số khách sinh tự động về 10 và giữ tài khoản đã có hoạt động. Có thể chạy lại; các bản ghi demo dùng mã cố định để tránh tạo trùng. `npm run db:seed` vẫn là lệnh khởi tạo lại toàn bộ dữ liệu.

## Kiểm tra

```bash
npm run lint
npm test
npm run build
```

## Cấu trúc

- `shared/src`: constants, DTO, Zod schemas, tiện ích giờ Việt Nam.
- `BE/src/common`: guard, pipe, filter, interceptor, phân trang, event.
- `BE/src/modules`: health, auth, users, admin, mail.
- `FE/src/app`: store, providers, router.
- `FE/src/features`: xác thực, hồ sơ, quản trị người dùng và dashboard.
- `docs/Đề bài`, `docs/Phân chia`, `docs/Thiết kế`: yêu cầu, phân công, giao diện.

## Triển khai

1. PostgreSQL: tạo Neon, đặt `DATABASE_URL` có `sslmode=require`, chạy `npm run prisma:deploy -w @sango/be` rồi `npm run db:seed` nếu cần dữ liệu demo.
2. API: trên Render, build từ gốc bằng `npm ci && npm run build:shared && npm run build -w @sango/be && npm run prisma:deploy -w @sango/be`; start `node BE/dist/main.js`. Cấu hình các biến trong `BE/.env.example`, đặc biệt `JWT_SECRET`, `CORS_ORIGIN`, `APP_URL`, `MAIL_PROVIDER=brevo`, `BREVO_API_KEY`.
3. Giao diện: trên Vercel, chọn root directory `FE`, build command `cd .. && npm ci && npm run build -w @sango/fe`, output `dist` và đặt `VITE_API_URL` thành URL `/api` của Render. `FE/vercel.json` hỗ trợ route SPA.

Link triển khai sẽ được bổ sung sau khi nhóm tạo các dịch vụ đám mây.
