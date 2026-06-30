import { useState } from 'react';

export default function SecurityForm() {
  const [threshold, setThreshold] = useState(5);
  const [duration, setDuration] = useState(15);

  return (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="space-y-4">
        <label htmlFor="threshold" className="font-label-md text-on-surface block px-1">Lockout Threshold</label>
        <p className="text-label-sm text-on-surface-variant/60 mb-2 px-1">Number of failed login attempts before the account is temporarily locked.</p>
        <input
          id="threshold"
          type="number"
          min="1"
          max="10"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
        />
      </div>
      <div className="space-y-4">
        <label htmlFor="duration" className="font-label-md text-on-surface block px-1">Lockout Duration</label>
        <p className="text-label-sm text-on-surface-variant/60 mb-2 px-1">Duration in minutes for which the account will remain locked after the threshold is reached.</p>
        <div className="relative">
          <input
            id="duration"
            type="number"
            min="5"
            step="5"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-label-md text-on-surface-variant/50">minutes</span>
        </div>
      </div>
    </form>
  );
}
