import { StarFilled, StarOutlined } from '@ant-design/icons';
import { Space } from 'antd';

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  label?: string;
}

export function RatingStars({ value, onChange, readOnly = false, label = 'Số sao' }: RatingStarsProps) {
  return <div className="rating-stars" role="radiogroup" aria-label={label}>
    <Space size={2}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-label={`${star} sao`}
          aria-checked={value === star}
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onKeyDown={(event) => {
            if (!readOnly && (event.key === 'ArrowRight' || event.key === 'ArrowUp')) onChange?.(Math.min(5, star + 1));
            if (!readOnly && (event.key === 'ArrowLeft' || event.key === 'ArrowDown')) onChange?.(Math.max(1, star - 1));
          }}
          className="rating-star-button"
        >
          {star <= value ? <StarFilled aria-hidden /> : <StarOutlined aria-hidden />}
        </button>
      ))}
    </Space>
  </div>;
}
