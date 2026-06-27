import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import StatsCard from '../../components/user/StatsCard';
import TaskList from '../../components/user/TaskList';
import LeadDistribution from '../../components/user/LeadDistribution';
import CampaignCard from '../../components/user/CampaignCard';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <section className="grid grid-cols-12 gap-12 mb-12">
        <div className="col-span-12 lg:col-span-8 relative overflow-hidden glass-card p-12 flex flex-col justify-center min-h-[340px]">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-[80px]"></div>
          <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-secondary/10 rounded-full blur-[60px]"></div>
          <div className="relative z-10">
            <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-label-sm font-label-sm mb-4">
              <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
              Live Marketing Status
            </span>
            <h1 className="font-display-lg text-display-lg text-on-surface mb-2">Welcome back, {user.name}.</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
              Your Q3 marketing campaigns are performing <span className="text-secondary font-bold">12% above benchmark</span>. You have 4 pending security reviews for the upcoming lead magnets.
            </p>
            <div className="mt-8 flex gap-x-4">
              <button className="bg-primary px-6 py-3 text-white rounded-xl font-label-md text-label-md shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                View Campaigns
              </button>
              <button className="bg-white/80 backdrop-blur-md px-6 py-3 text-on-surface rounded-xl font-label-md text-label-md hover:bg-white transition-all border border-outline-variant/20">
                Generate Report
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-12">
          <StatsCard
            icon="trending_up"
            label="Total Conversion"
            value="24,802"
            change="+8.4%"
            iconBg="bg-secondary-fixed"
          />
          <StatsCard
            icon="groups"
            label="Engaged Leads"
            value="1,240"
            change="Active Now"
            iconBg="bg-primary-fixed"
            borderAccent="border-l-4 border-l-primary"
          />
        </div>
      </section>

      <section className="grid grid-cols-12 gap-12 mb-12">
        <TaskList />
        <LeadDistribution />
      </section>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-8">
          <h4 className="font-headline-md text-headline-md text-on-surface">Active Campaigns</h4>
          <button className="bg-white/50 px-4 py-2 rounded-xl text-label-md font-label-md border border-outline-variant/20 hover:bg-white transition-all">Filter by Platform</button>
        </div>
        <div className="grid grid-cols-12 gap-12">
          <CampaignCard title="LinkedIn Outreach" status="Active" daysLeft="8 days left" progress={65}>
            <img
              className="w-full h-full object-cover"
              alt="Campaign visual"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBI89DRvXDmJ12lb8GGnNO1fZAcV_k43PY2bM8ICH53sdfeeyQq00sErxLfD0aDF5Zn-Ap94tiuiQ8nDEGlW9ctZd1VTk0O4Ng61SM5DDuTEH2btb0_1_rFj8C7HE6hdRJIdD0NQLu2SYCiKd24Gp3rgOLSMWWglBDlD-m_gUjSoPYqew_TvnGbXldhiwYx67HUzSsbdyC68FzNycg2kuHvTZ0uVsaSoqA0l8QY2cINCEtI1NKKNag"
            />
          </CampaignCard>

          <div className="col-span-12 md:col-span-8 lg:col-span-6 glass-card p-8 flex flex-col md:flex-row gap-6 hover:shadow-lg transition-all group">
            <div className="flex-grow">
              <div className="flex justify-between items-start mb-4">
                <h5 className="text-on-surface font-label-md text-label-md">Global Rebrand Awareness</h5>
                <span className="text-primary material-symbols-outlined">auto_awesome</span>
              </div>
              <p className="text-on-surface-variant text-label-sm mb-6">Cross-channel synchronization is at 94% efficiency. Retargeting pixels are firing correctly across all 12 domains.</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-1">CTR</p>
                  <p className="text-headline-md font-headline-md text-primary">3.2%</p>
                </div>
                <div className="w-px bg-outline-variant/20"></div>
                <div>
                  <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mb-1">Budget Spent</p>
                  <p className="text-headline-md font-headline-md text-on-surface">$14.2k</p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-48 h-32 md:h-full bg-surface-container-low rounded-2xl overflow-hidden relative border border-outline-variant/10">
              <div className="absolute inset-0 flex items-end p-3 bg-gradient-to-t from-primary/20 to-transparent">
                <div className="flex gap-1 items-end w-full">
                  <div className="bg-primary/40 w-1/5 h-1/2 rounded-t-sm"></div>
                  <div className="bg-primary/60 w-1/5 h-3/4 rounded-t-sm"></div>
                  <div className="bg-primary w-1/5 h-2/3 rounded-t-sm"></div>
                  <div className="bg-primary/80 w-1/5 h-full rounded-t-sm"></div>
                  <div className="bg-secondary w-1/5 h-4/5 rounded-t-sm"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-12 lg:col-span-3 glass-card p-8 flex flex-col justify-center items-center text-center bg-gradient-to-br from-white/80 to-primary/5">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary text-[32px]">add</span>
            </div>
            <h5 className="text-on-surface font-label-md text-label-md mb-1">New Campaign</h5>
            <p className="text-on-surface-variant text-label-sm">Build a new automated workflow</p>
            <button className="mt-4 text-primary font-bold text-label-sm border-b border-primary/20 hover:border-primary transition-all">Get Started</button>
          </div>
        </div>
      </section>

      <footer className="mt-12 py-8 px-10 border-t border-outline-variant/10 text-center">
        <p className="text-label-sm text-on-surface-variant opacity-50">&copy; 2024 ApexCRM Enterprise &bull; Core Security Powered Dashboard</p>
      </footer>

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all">
        <span className="material-symbols-outlined">chat_bubble</span>
      </button>
    </>
  );
}
