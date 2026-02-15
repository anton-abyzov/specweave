interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const VARIANTS = {
  default: 'bg-gray-800 text-gray-300',
  success: 'bg-emerald-500/15 text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-400',
  error: 'bg-rose-500/15 text-rose-400',
  info: 'bg-cyan-500/15 text-cyan-400',
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${VARIANTS[variant]}`}>
      {label}
    </span>
  );
}

export function statusBadgeVariant(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'active': case 'running': return 'info';
    case 'completed': case 'success': return 'success';
    case 'paused': case 'pending': case 'planning': return 'warning';
    case 'failed': case 'abandoned': case 'error': return 'error';
    default: return 'default';
  }
}
