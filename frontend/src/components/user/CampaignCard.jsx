export default function CampaignCard({ title, status, daysLeft, progress, children }) {
  return (
    <div className="col-span-12 md:col-span-4 lg:col-span-3 glass-card rounded-[1.5rem] overflow-hidden hover:shadow-lg transition-all group">
      <div className="h-24 bg-surface-container-high relative">
        {children}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>
      <div className="p-3">
        <h5 className="text-on-surface font-label-md text-label-md mb-1">{title}</h5>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-surface-container-high text-on-surface-variant'
          }`}>{status}</span>
          <span className="text-on-surface-variant text-[11px]">{daysLeft}</span>
        </div>
        {typeof progress === 'number' && (
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>
    </div>
  );
}
