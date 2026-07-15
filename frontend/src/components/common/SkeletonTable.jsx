import Skeleton from './Skeleton';

export default function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-outline-variant/10">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="pb-3 px-3">
                <Skeleton width={`${Math.floor(Math.random() * 30 + 50)}px`} height="12px" rounded />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-outline-variant/10">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="py-3 px-3">
                  <Skeleton
                    width={`${Math.floor(Math.random() * 50 + 50)}px`}
                    height="14px"
                    rounded
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
