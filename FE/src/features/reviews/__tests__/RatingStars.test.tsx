import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RatingStars } from '../components/RatingStars';

describe('RatingStars', () => {
  it('cho phép chọn sao bằng click và bàn phím', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RatingStars value={3} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: '4 sao' }));
    expect(onChange).toHaveBeenCalledWith(4);
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
