import React, { useEffect, useState } from 'react';
import { extensionRequestsService } from '../services/api';
import { useAppStore } from '../context/appStore';
import { UserAvatar } from './UserAvatar';
import { Check, X, Calendar, AlertTriangle } from 'lucide-react';
import { emitSuccessToast } from '../context/toastBus';
import { formatRelativeTime, formatDate } from '../utils/helpers';
import type { ExtensionRequest } from '../app/types';

export const ExtensionRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<ExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { users, bootstrap } = useAppStore();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await extensionRequestsService.getAll();
      // Only pending requests in this panel for now
      setRequests((res.data.data ?? res.data).filter((r: ExtensionRequest) => r.status === 'pending'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, approve: boolean) => {
    try {
      if (approve) {
        const comment = window.prompt('Approval comment (optional):');
        await extensionRequestsService.approve(id, comment || undefined);
        emitSuccessToast('Extension request approved.', 'Success');
      } else {
        const comment = window.prompt('Reason for rejection (mandatory):');
        if (!comment) {
           alert('Rejection reason is mandatory.');
           return;
        }
        await extensionRequestsService.reject(id, comment);
        emitSuccessToast('Extension request rejected.', 'Rejected');
      }
      bootstrap();
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && requests.length === 0) return <div className="p-8 text-center text-surface-400 font-medium">Loading requests...</div>;
  if (requests.length === 0) return null;

  return (
    <div className="card overflow-hidden h-full flex flex-col">
      <div className="bg-brand-50 dark:bg-brand-950/20 px-5 py-3 border-b border-brand-100 dark:border-brand-900/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-600" />
          <h3 className="text-xs font-bold text-brand-800 dark:text-brand-400 uppercase tracking-widest">
            Due Date Extensions
          </h3>
        </div>
        <span className="bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {requests.length} Pending
        </span>
      </div>
      <div className="divide-y divide-surface-100 dark:divide-surface-800 overflow-y-auto flex-1">
        {requests.map((req) => {
          const requester = typeof req.userId === 'object' ? req.userId as any : users.find(u => u.id === req.userId);
          const taskCount = req.taskIds.length;
          const firstTaskName = req.tasks && req.tasks[0] ? req.tasks[0].title : 'Tasks';

          return (
            <div key={req._id || req.id} className="p-4 bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-tight">{requester?.name || 'Someone'} requested</span>
                    <span className="text-[10px] text-surface-400">• {formatRelativeTime(req.createdAt)}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-surface-900 dark:text-white truncate mb-2" title={firstTaskName}>
                    {taskCount > 1 ? `${firstTaskName} + ${taskCount - 1} more` : firstTaskName}
                  </h4>
                  <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
                     <div className="flex items-center gap-1.5 min-w-0">
                        <AlertTriangle size={12} className="text-rose-500" />
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-300">Requested Due Date:</span>
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-200">{formatDate(req.requestedDueDate, 'MMM d, yyyy')}</span>
                     </div>
                  </div>
                  {req.reason && (
                    <div className="mt-2 text-[11px] text-surface-500 bg-surface-50 dark:bg-surface-800/30 p-2 rounded leading-relaxed border-l-2 border-surface-200 dark:border-surface-700">
                      "{req.reason}"
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleAction(req._id || req.id, true)}
                    className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 transition-all hover:scale-110 active:scale-95"
                    title="Approve Extension"
                  >
                    <Check size={16} />
                  </button>
                  <button 
                    onClick={() => handleAction(req._id || req.id, false)}
                    className="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all hover:scale-110 active:scale-95"
                    title="Reject Request"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
