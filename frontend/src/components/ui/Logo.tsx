import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * BoxerConnect Logo Component
 *
 * A theme-aware logo that displays the boxing glove icon with optional text.
 * Uses the brand colors: Red (#DC2626), Gold (#F59E0B), Navy (#1E293B)
 */
export const Logo: React.FC<LogoProps> = ({
  className,
  showText = true,
  size = 'md',
}) => {
  const sizes = {
    sm: { iconSize: 24, fontSize: 'text-sm' },
    md: { iconSize: 32, fontSize: 'text-xl' },
    lg: { iconSize: 48, fontSize: 'text-3xl' },
  };

  const { iconSize, fontSize } = sizes[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Boxing Glove Icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Main Glove Body */}
        <path
          d="M6 12c0-4.418 3.582-8 8-8h6c4.418 0 8 3.582 8 8v10c0 4.418-3.582 8-8 8h-6c-4.418 0-8-3.582-8-8V12z"
          fill="#DC2626"
        />
        {/* Thumb */}
        <path
          d="M3 14c0-2.209 1.791-4 4-4h2v12H7c-2.209 0-4-1.791-4-4v-4z"
          fill="#DC2626"
        />
        {/* Stitching Details */}
        <path
          d="M10 8h12M10 14h12M10 20h12"
          stroke="#991B1B"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Wrist Cuff */}
        <rect
          x="6"
          y="26"
          width="22"
          height="5"
          rx="2"
          className="fill-slate-800 dark:fill-slate-500"
        />
        {/* Gold Accent - Connection Symbol */}
        <circle cx="26" cy="14" r="2.5" fill="#F59E0B" />
        <path
          d="M29 14h4"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="35" cy="14" r="1.5" fill="#F59E0B" opacity="0.5" />
      </svg>

      {/* Text */}
      {showText && (
        <span className={cn('font-bold tracking-tight', fontSize)}>
          <span className="text-boxing-red">Boxer</span>
          <span className="text-foreground">Connect</span>
        </span>
      )}
    </div>
  );
};

/**
 * Logo Icon Only Component
 * For use in favicons, app icons, or small spaces
 */
export const LogoIcon: React.FC<{ className?: string; size?: number }> = ({
  className,
  size = 32,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main Glove Body */}
      <path
        d="M6 12c0-4.418 3.582-8 8-8h6c4.418 0 8 3.582 8 8v10c0 4.418-3.582 8-8 8h-6c-4.418 0-8-3.582-8-8V12z"
        fill="#DC2626"
      />
      {/* Thumb */}
      <path
        d="M3 14c0-2.209 1.791-4 4-4h2v12H7c-2.209 0-4-1.791-4-4v-4z"
        fill="#DC2626"
      />
      {/* Stitching Details */}
      <path
        d="M10 8h12M10 14h12M10 20h12"
        stroke="#991B1B"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Wrist Cuff */}
      <rect x="6" y="26" width="22" height="5" rx="2" fill="#1E293B" />
      {/* Gold Accent */}
      <circle cx="26" cy="14" r="2.5" fill="#F59E0B" />
      <path
        d="M29 14h4"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="35" cy="14" r="1.5" fill="#F59E0B" opacity="0.5" />
    </svg>
  );
};

export default Logo;
