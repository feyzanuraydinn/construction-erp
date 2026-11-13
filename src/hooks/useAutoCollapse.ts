import { useEffect, useState } from 'react';

function isNarrowWindow(maxWidth: number): boolean {
  return window.innerWidth > 0 && window.innerWidth <= maxWidth;
}

export function useAutoCollapse(maxWidth: number): [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => isNarrowWindow(maxWidth));

  useEffect(() => {
    let lastNarrow: boolean | null = window.innerWidth > 0 ? isNarrowWindow(maxWidth) : null;
    const onResize = () => {
      if (window.innerWidth === 0) return;
      const narrow = isNarrowWindow(maxWidth);
      if (lastNarrow === null) {
        lastNarrow = narrow;
        if (narrow) setCollapsed(true);
        return;
      }
      if (narrow !== lastNarrow) {
        lastNarrow = narrow;
        setCollapsed(narrow);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [maxWidth]);

  return [collapsed, setCollapsed];
}
