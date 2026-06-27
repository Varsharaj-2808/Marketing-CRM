const DISTRIBUTION = [
  { label: 'Enterprise', color: 'bg-primary', count: 412 },
  { label: 'Mid-Market', color: 'bg-secondary', count: 284 },
  { label: 'Small Business', color: 'bg-outline-variant', count: 110 },
];

export default function LeadDistribution() {
  const total = DISTRIBUTION.reduce((s, d) => s + d.count, 0);
  const qualifiedPct = Math.round((DISTRIBUTION[0].count / total) * 100);

  return (
    <div className="col-span-12 md:col-span-5 glass-card rounded-[1.5rem] p-6 flex flex-col">
      <h4 className="font-headline-md text-headline-md text-on-surface mb-4">Lead Distribution</h4>
      <div className="flex-grow flex items-center justify-center py-12 relative">
        <div className="w-48 h-48 rounded-full border-[16px] border-surface-container-high relative flex items-center justify-center">
          <div className="text-center">
            <span className="text-headline-lg font-headline-lg text-primary">{qualifiedPct}%</span>
            <p className="text-label-sm font-label-sm text-on-surface-variant">Qualified</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {DISTRIBUTION.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center">
              <span className={`w-3 h-3 ${item.color} rounded-full mr-3`}></span>
              <span className="text-label-md font-label-md text-on-surface">{item.label}</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface-variant">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
