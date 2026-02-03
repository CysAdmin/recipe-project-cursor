import React from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const skeletonOptions = {
  baseColor: '#e2e8f0',
  highlightColor: '#f1f5f9',
  duration: 1.2,
};

export function RecipeRowSkeleton() {
  return (
    <SkeletonTheme {...skeletonOptions}>
      <div className="flex rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-l-xl overflow-hidden">
          <Skeleton width="100%" height="100%" style={{ borderRadius: 0 }} />
        </div>
        <div className="flex-1 min-w-0 p-4 flex flex-col justify-center gap-2">
          <Skeleton width="30%" height={12} />
          <Skeleton width="85%" height={18} />
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={14} />
        </div>
      </div>
    </SkeletonTheme>
  );
}

export function RecipeCardSkeleton() {
  return (
    <SkeletonTheme {...skeletonOptions}>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
        <div className="w-full h-40 overflow-hidden">
          <Skeleton width="100%" height="100%" style={{ borderRadius: 0 }} />
        </div>
        <div className="p-4 space-y-2">
          <Skeleton height={18} width="90%" />
          <Skeleton height={14} width="50%" />
          <Skeleton height={12} width="70%" />
          <Skeleton height={12} width="55%" />
        </div>
        <div className="p-4 pt-0">
          <Skeleton height={40} borderRadius={8} />
        </div>
      </div>
    </SkeletonTheme>
  );
}
