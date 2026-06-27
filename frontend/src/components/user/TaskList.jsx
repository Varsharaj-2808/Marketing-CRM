const TASKS = [
  { icon: 'campaign', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', title: "Review Email Sequence: 'Growth 2024'", meta: 'Due in 2 hours \u2022 High Priority' },
  { icon: 'monitoring', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', title: 'Sync Data with Security Core', meta: 'Due Tomorrow \u2022 System Task' },
  { icon: 'draw', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', title: 'Approve Brand Assets for ApexCore', meta: 'Scheduled for Friday' },
];

export default function TaskList() {
  return (
    <div className="col-span-12 md:col-span-7 glass-card rounded-[1.5rem] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-white/40">
        <h4 className="font-headline-md text-headline-md text-on-surface">Priority Tasks</h4>
        <button className="text-primary font-label-md text-label-md hover:underline">See all</button>
      </div>
      <div className="p-6 space-y-4">
        {TASKS.map((task, i) => (
          <div key={i} className="flex items-center p-4 rounded-2xl hover:bg-white/60 transition-all group border border-transparent hover:border-outline-variant/20">
            <div className={`w-12 h-12 rounded-xl ${task.iconBg} flex items-center justify-center mr-4`}>
              <span className={`material-symbols-outlined ${task.iconColor}`}>{task.icon}</span>
            </div>
            <div className="flex-grow">
              <h5 className="text-on-surface font-label-md text-label-md">{task.title}</h5>
              <p className="text-on-surface-variant text-label-sm font-label-sm">{task.meta}</p>
            </div>
            <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 text-primary rounded-lg">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
