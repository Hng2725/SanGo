import { Input } from 'antd';
import { useNavigate } from 'react-router';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
export default function HomePage() { useDocumentTitle('Trang chủ'); const navigate = useNavigate(); return <div className="home-placeholder"><h1>Tìm sân trống, đặt giờ chơi.</h1><p>Chọn sân và giờ phù hợp cho buổi chơi tiếp theo của bạn.</p><Input.Search size="large" enterButton="Tìm sân" placeholder="Tên sân hoặc khu vực" onSearch={value => navigate(`/venues?q=${encodeURIComponent(value)}`)} /></div>; }
