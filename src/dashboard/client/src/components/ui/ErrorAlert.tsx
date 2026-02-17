interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export function ErrorAlert({ message, onRetry, title = 'Something went wrong' }: ErrorAlertProps) {
  const isTimeout = message.toLowerCase().includes('timed out');

  return (
    <div className="p-6">
      <div className="bg-rose-900/30 border border-rose-700 rounded-lg px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-rose-300">{title}</h3>
            <p className="text-xs text-rose-400/80 mt-1">{message}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-rose-400 hover:text-rose-200 px-3 py-1.5 border border-rose-700 rounded transition-colors flex-shrink-0"
            >
              Retry
            </button>
          )}
        </div>
        {isTimeout && (
          <p className="text-[10px] text-rose-400/60">
            The server may be processing a large number of session logs. Try again in a moment.
          </p>
        )}
      </div>
    </div>
  );
}
