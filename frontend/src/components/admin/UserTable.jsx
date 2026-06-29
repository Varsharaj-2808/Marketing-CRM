import { useState } from 'react';

const STATUS_STYLES = {
  Active: 'bg-emerald-500/10 text-emerald-600',
  Inactive: 'bg-error-container text-on-error-container',
};

export default function UserTable({ users, onEdit, onDeactivate, onActivate }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" role="table">
        <thead>
          <tr className="text-label-sm text-primary uppercase tracking-widest border-b border-primary/20 bg-surface-container-low/60 backdrop-blur-sm">
            <th className="py-2.5 px-3 font-semibold">Employee ID</th>
            <th className="py-2.5 px-3 font-semibold">Employee Name</th>
            <th className="py-2.5 px-3 font-semibold">Email</th>
            <th className="py-2.5 px-3 font-semibold">Mobile</th>
            <th className="py-2.5 px-3 font-semibold">Role</th>
            <th className="py-2.5 px-3 font-semibold">Status</th>
            <th className="py-2.5 px-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="text-body-md text-on-surface">
          {users.map((user) => (
            <tr
              key={user.employee_id}
              className="border-b border-outline-variant/10 hover:bg-primary/[0.03] transition-colors group relative"
            >
              <td className="py-3 px-3 font-semibold text-on-surface">{user.employee_id}</td>
              <td className="py-3 px-3 text-on-surface">{user.employee_name}</td>
              <td className="py-3 px-3 text-on-surface-variant">{user.email}</td>
              <td className="py-3 px-3 text-on-surface-variant">{user.mobile}</td>
              <td className="py-3 px-3">
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-label-sm font-semibold">
                  {user.role}
                </span>
              </td>
              <td className="py-3 px-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-semibold ${STATUS_STYLES[user.status] || 'bg-surface-container-high text-on-surface-variant'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-error'}`}></span>
                  {user.status}
                </span>
              </td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(user)}
                    className="px-2.5 py-1 text-label-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  {user.status === 'Active' ? (
                    <button
                      onClick={() => onDeactivate(user)}
                      className="px-2.5 py-1 text-label-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => onActivate(user)}
                      className="px-2.5 py-1 text-label-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
