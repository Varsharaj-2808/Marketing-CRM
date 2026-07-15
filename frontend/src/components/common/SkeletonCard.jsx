import Skeleton from './Skeleton';

export default function SkeletonCard({ lines = 2, hasIcon = true, hasBar = false }) {
  return (
    <div className="glass-card p-5 relative overflow-hidden">
      <div className="flex justify-between items-start mb-3">
        {hasIcon && <Skeleton circle width="44px" height="44px" />}
        <Skeleton width="50px" height="18px" rounded />
      </div>
      <Skeleton width="80px" height="12px" rounded className="mb-1" />
      <Skeleton width="110px" height="26px" rounded className="mb-1" />
      {lines > 2 && <Skeleton width="60px" height="12px" rounded className="mt-1" />}
      {hasBar && (
        <div className="mt-3 h-1 w-full skeleton rounded-full" />
      )}
    </div>
  );
}
