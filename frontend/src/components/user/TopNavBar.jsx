import { useAuth } from '../../hooks/useAuth';

export default function TopNavBar() {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/10 shadow-sm flex justify-between items-center px-margin-desktop h-20">
      <div className="flex items-center gap-x-8">
        <span className="font-display-lg text-headline-md tracking-tight text-primary">ApexCRM</span>
        <div className="hidden md:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/30">
          <span className="material-symbols-outlined text-outline mr-2">search</span>
          <input className="bg-transparent border-none focus:ring-0 text-label-md w-64 placeholder:text-outline-variant" placeholder="Search insights..." type="text" />
        </div>
      </div>
      <div className="flex items-center gap-x-4">
        <button className="p-2 rounded-full hover:bg-primary/5 transition-colors relative">
          <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <button className="p-2 rounded-full hover:bg-primary/5 transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">settings</span>
        </button>
        <div className="flex items-center gap-2 ml-2">
          <div className="text-right">
            <p className="font-label-md text-label-md text-on-surface">{user?.name}</p>
            <p className="text-label-sm font-label-sm text-on-surface-variant">{user?.role}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </nav>
  );
}
