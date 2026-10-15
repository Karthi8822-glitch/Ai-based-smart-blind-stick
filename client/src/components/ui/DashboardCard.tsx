import React, { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  tag?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  tag,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`p-6 md:p-8 bg-zinc-950/70 border border-white/10 flex flex-col justify-between ${className}`}>
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          {tag && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
              {tag}
            </span>
          )}
          <h4 className="font-display font-medium text-lg text-white tracking-tight">{title}</h4>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Card Body */}
      <div className="flex-1">{children}</div>
    </div>
  );
};
