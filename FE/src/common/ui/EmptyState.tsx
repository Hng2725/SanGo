import { Empty } from 'antd';
import type { ReactNode } from 'react';
interface EmptyStateProps { description: string; action?: ReactNode }
export function EmptyState({ description, action }: EmptyStateProps) { return <Empty description={description}>{action}</Empty>; }
