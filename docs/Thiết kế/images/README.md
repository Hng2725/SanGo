# Ảnh cho bản xem trước và cho dự án

Đặt file ảnh vào **thư mục này** với đúng tên bên dưới thì `preview_Hung.html` tự hiện ảnh thay cho khung tím nét đứt.
Khi code thật, chép ảnh sang `FE/src/assets/images/` (đổi sang `.webp`) và ghi nguồn vào `FE/src/assets/images/CREDITS.md`.

| Tên file | Dùng ở | Nội dung cần tìm | Kích thước |
|---|---|---|---|
| `auth-hero.jpg` | Nền panel trái màn Đăng nhập và Đăng ký | Sân bóng đá mini cỏ nhân tạo buổi tối dưới đèn, góc rộng, tông xanh, không có người nhìn thẳng ống kính | Ảnh dọc, ≥ 1200×1600 |
| `venue-1.jpg`, `venue-2.jpg`, `venue-3.jpg` | Ảnh thu nhỏ trong bảng "Cụm sân nhiều lượt đặt nhất" (chỉ để xem trước) | Sân bóng đá mini, sân cầu lông trong nhà, sân pickleball | Ngang, ≥ 640×440 |

Trong dự án thật, ảnh cụm sân **không** phải file tĩnh: chủ sân nhập link ảnh khi tạo cụm sân (`venue.imageUrls`), seed dùng `https://picsum.photos/seed/<slug>/800/500`.

Nguồn ảnh miễn phí, dùng thương mại không cần ghi công:
- Unsplash – https://unsplash.com (từ khóa: `futsal night`, `five a side football`, `badminton court`, `pickleball court`)
- Pexels – https://www.pexels.com
