import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusType = 'active' | 'inactive' | 'pending' | 'verified' | 'unverified';

interface StatusBadgeProps {
  status: StatusType | boolean;
  type?: 'user' | 'boxer' | 'verification';
  className?: string;
}

const statusConfig: Record<
  StatusType,
  { label: string; className: string; icon: React.ElementType }
> = {
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
  },
  verified: {
    label: 'Verified',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Shield,
  },
  unverified: {
    label: 'Unverified',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Clock,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'user',
  className,
}) => {
  // Convert boolean to status type
  let statusType: StatusType;
  if (typeof status === 'boolean') {
    if (type === 'user') {
      statusType = status ? 'active' : 'inactive';
    } else if (type === 'verification') {
      statusType = status ? 'verified' : 'unverified';
    } else {
      statusType = status ? 'verified' : 'pending';
    }
  } else {
    statusType = status;
  }

  const config = statusConfig[statusType];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-medium', config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};
