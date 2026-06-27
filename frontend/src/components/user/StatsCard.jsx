export default function StatsCard({ icon, label, value, change, iconBg, borderAccent }) {
  return (
    <div className={`glass-card rounded-[1.5rem] p-6 flex-grow flex flex-col justify-between ${borderAccent || ''}`}>
      <div className="flex justify-between items-start">
        <div className={`p-3 ${iconBg || 'bg-secondary-fixed'} rounded-2xl`}>
          <span className="material-symbols-outlined text-secondary">{icon}</span>
        </div>
        {change && <span className="text-label-sm font-label-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">{change}</span>}
      </div>
      <div>
        <p className="text-on-surface-variant text-label-md font-label-md mb-1">{label}</p>
        <h3 className="text-headline-lg font-headline-lg text-on-surface">{value}</h3>
      </div>
    </div>
  );
}
