import { useState } from 'react';
import { toDisplayText } from '../../utils/leadDisplay';

const STATUS_STYLES = {
  Active: 'bg-emerald-500/10 text-emerald-600',
  Inactive: 'bg-error-container text-on-error-container',
};

export default function UserTable({ users, onEdit, onDeactivate, onActivate }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse" role="table">
        <thead>
          <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
            <th className="py-3.5 px-6 font-semibold">Employee ID</th>
            <th className="py-3.5 px-6 font-semibold">Employee Name</th>
            <th className="py-3.5 px-6 font-semibold">Email</th>
            <th className="py-3.5 px-6 font-semibold">Mobile</th>
            <th className="py-3.5 px-6 font-semibold">Role</th>
            <th className="py-3.5 px-6 font-semibold">Status</th>
            <th className="py-3.5 px-6 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm text-slate-700">
          {users.map((user) => {
            const isActive = toDisplayText(user.status).toLowerCase() === 'active';
            const isAdmin = toDisplayText(user.role).toLowerCase() === 'admin';
            return (
              <tr
                key={user.employee_id || user.id || Math.random()}
                className="border-b border-slate-150 hover:bg-slate-50/50 transition-colors duration-150"
              >
                <td className="py-4 px-6 text-slate-500 font-medium">{toDisplayText(user.employee_id, '-')}</td>
                <td className="py-4 px-6 font-semibold text-slate-900">{toDisplayText(user.employee_name, '-')}</td>
                <td className="py-4 px-6 text-slate-650">{toDisplayText(user.email, '-')}</td>
                <td className="py-4 px-6 text-slate-500">{toDisplayText(user.mobile, '-')}</td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                    isAdmin ? 'bg-primary/5 text-primary border-primary/10' : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                  }`}>
                    {toDisplayText(user.role, '-')}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {toDisplayText(user.status, '-')}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      className="px-2.5 py-1 text-xs font-semibold text-primary bg-primary-fixed hover:bg-primary-fixed-dim rounded-md transition-colors"
                    >
                      Edit
                    </button>
                    {isActive ? (
                      <button
                        onClick={() => onDeactivate(user)}
                        className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => onActivate(user)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
