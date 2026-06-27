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
          <tr className="text-label-md text-on-surface-variant/50 uppercase tracking-widest border-b border-outline-variant/10">
            <th className="pb-4 font-normal px-4">Employee ID</th>
            <th className="pb-4 font-normal px-4">Employee Name</th>
            <th className="pb-4 font-normal px-4">Email</th>
            <th className="pb-4 font-normal px-4">Mobile</th>
            <th className="pb-4 font-normal px-4">Role</th>
            <th className="pb-4 font-normal px-4">Status</th>
            <th className="pb-4 font-normal px-4">Actions</th>
          </tr>
        </thead>
        <tbody className="text-body-md text-on-surface">
          {users.map((user) => (
            <tr key={user.employee_id} className="border-b border-outline-variant/10 hover:bg-primary/5 transition-colors">
              <td className="py-4 px-4 font-bold">{user.employee_id}</td>
              <td className="py-4 px-4">{user.employee_name}</td>
              <td className="py-4 px-4 opacity-70">{user.email}</td>
              <td className="py-4 px-4 opacity-70">{user.mobile}</td>
              <td className="py-4 px-4">
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-label-sm font-bold">
                  {user.role}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold ${STATUS_STYLES[user.status] || 'bg-surface-container-high text-on-surface-variant'}`}>
                  {user.status}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="px-3 py-1.5 text-label-sm font-label-md text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  {user.status === 'Active' ? (
                    <button
                      onClick={() => onDeactivate(user)}
                      className="px-3 py-1.5 text-label-sm font-label-md text-error hover:bg-error/5 rounded-lg transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => onActivate(user)}
                      className="px-3 py-1.5 text-label-sm font-label-md text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
