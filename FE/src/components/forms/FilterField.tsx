import type { ReactNode } from 'react';
import { cn } from '@/common/utils/format';
import styles from './FilterField.module.css';

interface FilterFieldProps {
  htmlFor: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FilterField({ htmlFor, label, icon, children, className }: FilterFieldProps) {
  return (
    <div className={cn(styles.field, className)}>
      <label htmlFor={htmlFor}>
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
