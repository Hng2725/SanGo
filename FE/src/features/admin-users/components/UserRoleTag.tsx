import { Tag } from 'antd';
import { ROLE_LABELS, type UserDto } from '@sango/shared';

interface UserRoleTagProps {
  role: UserDto['role'];
}

export function UserRoleTag({ role }: UserRoleTagProps) {
  return <Tag className={`user-role-tag user-role-${role.toLowerCase()}`}>{ROLE_LABELS[role]}</Tag>;
}
