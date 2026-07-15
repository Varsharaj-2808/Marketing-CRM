export default function Skeleton({ className = '', width, height, circle, rounded = false }) {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  const shape = circle
    ? 'rounded-full'
    : rounded
      ? 'rounded-xl'
      : 'rounded-lg';

  return (
    <div
      className={`skeleton ${shape} ${className}`}
      style={style}
    />
  );
}
