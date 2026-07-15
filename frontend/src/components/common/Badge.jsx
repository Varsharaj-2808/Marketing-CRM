const statusStyles = {
  hot: 'bg-red-100 text-red-700 border-red-200',
  warm: 'bg-amber-100 text-amber-700 border-amber-200',
  cold: 'bg-blue-100 text-blue-700 border-blue-200',
  new: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  contacted: 'bg-purple-100 text-purple-700 border-purple-200',
  qualified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-gray-100 text-gray-700 border-gray-200',
  converted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function Badge({ children, variant = 'new' }) {
  const style = statusStyles[variant?.toLowerCase()] || statusStyles.new;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-label-sm border ${style}`}
    >
      {children}
    </span>
  );
}
