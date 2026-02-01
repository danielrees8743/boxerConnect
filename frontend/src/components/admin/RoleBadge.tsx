import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  ADMIN: {
    label: 'Admin',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  BOXER: {
    label: 'Boxer',
    className: 'bg-boxing-red-100 text-boxing-red-800 border-boxing-red-200',
  },
  COACH: {
    label: 'Coach',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  GYM_OWNER: {
    label: 'Gym Owner',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className }) => {
  const config = roleConfig[role];

  return (
    <Badge variant="outline" className={cn('font-medium', config.className, className)}>
      {config.label}
    </Badge>
  );
};
