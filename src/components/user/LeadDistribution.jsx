const DISTRIBUTION = [
  { label: 'Enterprise', color: 'bg-primary', count: 412 },
  { label: 'Mid-Market', color: 'bg-secondary', count: 284 },
  { label: 'Small Business', color: 'bg-outline-variant', count: 110 },
];

export default function LeadDistribution() {
  const total = DISTRIBUTION.reduce((s, d) => s + d.count, 0);
  const qualifiedPct = Math.round((DISTRIBUTION[0].count / total) * 100);

  return (
    <div className="col-span-12 md:col-span-5 glass-card rounded-[1.5rem] p-4 flex flex-col">
      <h4 className="font-headline-md text-headline-md text-on-surface mb-3">Lead Distribution</h4>
      <div className="flex-grow flex items-center justify-center py-8 relative">
        <div className="w-36 h-36 rounded-full border-[12px] border-surface-container-high relative flex items-center justify-center">
          <div className="text-center">
            <span className="text-headline-lg font-headline-lg text-primary">{qualifiedPct}%</span>
            <p className="text-label-sm font-label-sm text-on-surface-variant">Qualified</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {DISTRIBUTION.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center">
              <span className={`w-2.5 h-2.5 ${item.color} rounded-full mr-2`}></span>
              <span className="text-label-md font-label-md text-on-surface">{item.label}</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface-variant">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
