import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpeningHoursForm } from '../OpeningHoursForm';

describe('OpeningHoursForm', () => {
  const defaultHours = [
    { dayOfWeek: 0, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 1, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 2, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 3, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 4, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 5, isClosed: false, openMinute: 360, closeMinute: 1320 },
    { dayOfWeek: 6, isClosed: false, openMinute: 360, closeMinute: 1320 },
  ];

  it('submit thành công khi mở cửa chuẩn hoặc mở qua nửa đêm hợp lệ', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    // Thứ 6 (dayOfWeek: 5) mở 18:00 (1080) đến 02:00 hôm sau (1560)
    // Thứ 7 (dayOfWeek: 6) mở từ 06:00 (360) => 120 <= 360 => hợp lệ
    const validOvernight = defaultHours.map((h) =>
      h.dayOfWeek === 5 ? { ...h, openMinute: 1080, closeMinute: 1560 } : h,
    );

    render(<OpeningHoursForm initialValues={validOvernight} onSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /lưu cấu hình giờ mở cửa/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  it('báo lỗi khi ca qua nửa đêm chồng vào ca mở cửa của ngày kế tiếp', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    // Thứ 6 (dayOfWeek: 5) mở đến 06:00 hôm sau (1440 + 360 = 1800)
    // Thứ 7 (dayOfWeek: 6) mở từ 05:00 (300) => 360 > 300 => chồng ca!
    const conflictOvernight = defaultHours.map((h) => {
      if (h.dayOfWeek === 5) return { ...h, openMinute: 1080, closeMinute: 1800 };
      if (h.dayOfWeek === 6) return { ...h, openMinute: 300, closeMinute: 1320 };
      return h;
    });

    render(<OpeningHoursForm initialValues={conflictOvernight} onSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /lưu cấu hình giờ mở cửa/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/chồng vào ca mở cửa của ngày kế tiếp/i)).toBeInTheDocument();
    });
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
