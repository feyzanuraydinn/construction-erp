import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiShield } from 'react-icons/fi';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

interface DataReviewBannerProps {
  className?: string;
}

export function DataReviewBanner({ className = '' }: DataReviewBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pending, setPending] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [checkKey, setCheckKey] = useState(0);
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === '/data-review' && pathname !== '/data-review')
      setCheckKey((key) => key + 1);
    previousPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (completed) return;
    let cancelled = false;
    window.electronAPI.review
      .getStatus()
      .then((status) => {
        if (cancelled) return;
        setCompleted(status.completed);
        setPending(status.completed ? 0 : status.pending);
      })
      .catch((error: unknown) => console.error('Data review status failed:', error));
    return () => {
      cancelled = true;
    };
  }, [checkKey, completed]);

  if (completed || pending === 0 || pathname === '/data-review') return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-between gap-4 px-6 py-3 text-sm border-b text-amber-900 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <FiShield className="mt-0.5 flex-shrink-0" />
        <p>{t('dataReview.banner', { count: pending })}</p>
      </div>
      <Button size="sm" onClick={() => navigate('/data-review')}>
        {t('dataReview.bannerAction')}
      </Button>
    </div>
  );
}
