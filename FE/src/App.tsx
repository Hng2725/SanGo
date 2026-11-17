// Trang tạm để kiểm tra khung dự án + antd chạy được.
// Hưng thay bằng providers (ConfigProvider theme "Vạch sân") + RouterProvider ở task H0.5,
// theo docs/Thiết kế/00_HE_THONG_THIET_KE.md và docs/Thiết kế/01_Hung_GIAO_DIEN.md.
import { RouterProvider } from 'react-router';
import { AppProviders } from './app/providers';
import { router } from './app/router';
export default function App() { return <AppProviders><RouterProvider router={router} /></AppProviders>; }
