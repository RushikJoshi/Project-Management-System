import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../context/authStore';
import api from '../services/api';
import { Bell, Calendar, Clock, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '../utils/helpers';
import { AdminTask } from '../pages/calendar/admin/store/useAdminCalendarStore';

export const ReminderListener: React.FC = () => {
    const { user } = useAuthStore();
    const [activeReminders, setActiveReminders] = useState<AdminTask[]>([]);
    const [shownIds, setShownIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) return;

        const checkReminders = async () => {
            try {
                const res = await api.get('/admin/calendar/due-reminders');
                const dueTasks: AdminTask[] = res.data || [];

                const myReminders = dueTasks.filter(task => {
                    if (shownIds.has(task._id)) return false;
                    
                    // User matches if they are assigned or a participant
                    const isAssigned = task.assignedUser === user.name || task.assignedUser === user.id;
                    const isParticipant = task.participants?.some(p => p === user.name || p === user.id);
                    
                    return isAssigned || isParticipant;
                });

                if (myReminders.length > 0) {
                    setActiveReminders(prev => [...prev, ...myReminders]);
                    setShownIds(prev => {
                        const next = new Set(prev);
                        myReminders.forEach(r => next.add(r._id));
                        return next;
                    });
                    
                    // Play a subtle notification sound if possible
                    try {
                        const audio = new Audio('/notification.mp3');
                        audio.volume = 0.5;
                        audio.play().catch(() => {});
                    } catch (e) {}
                }
            } catch (error) {
                console.error('[Reminders] Failed to fetch:', error);
            }
        };

        const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
        checkReminders();

        return () => clearInterval(interval);
    }, [user, shownIds]);

    const removeReminder = (id: string) => {
        setActiveReminders(prev => prev.filter(r => r._id !== id));
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-4 pointer-events-none">
            <AnimatePresence>
                {activeReminders.map((reminder) => (
                    <motion.div
                        key={reminder._id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="pointer-events-auto w-80 bg-white dark:bg-surface-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-surface-100 dark:border-surface-800 overflow-hidden"
                    >
                        <div className="bg-brand-600 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <Bell size={16} className="animate-bounce" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Event Reminder</span>
                            </div>
                            <button 
                                onClick={() => removeReminder(reminder._id)}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-5">
                            <h3 className="text-sm font-bold text-surface-900 dark:text-white mb-3 leading-tight">
                                {reminder.title}
                            </h3>
                            
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
                                    <Calendar size={13} />
                                    <span className="text-xs font-semibold">
                                        {reminder.startDateTime ? format(new Date(reminder.startDateTime), 'MMM dd, yyyy') : 'No date set'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
                                    <Clock size={13} />
                                    <span className="text-xs font-semibold">
                                        {reminder.startDateTime ? format(new Date(reminder.startDateTime), 'HH:mm') : 'All day'}
                                    </span>
                                </div>
                                {reminder.assignedUser && (
                                    <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
                                        <User size={13} />
                                        <span className="text-xs font-semibold">Assigned: {reminder.assignedUser}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    // Could open the calendar or task modal here
                                    window.location.href = '/calendar';
                                    removeReminder(reminder._id);
                                }}
                                className="mt-5 w-full bg-surface-50 dark:bg-surface-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-surface-700 dark:text-surface-200 hover:text-brand-600 dark:hover:text-brand-400 py-2.5 rounded-xl text-xs font-bold transition-all border border-surface-100 dark:border-surface-700 hover:border-brand-200"
                            >
                                View in Calendar
                            </button>
                        </div>
                        
                        {/* Progress bar to visual dismiss? Maybe just a static line */}
                        <div className="h-1 w-full bg-surface-50 dark:bg-surface-800">
                            <motion.div 
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 30, ease: "linear" }}
                                className="h-full bg-brand-500"
                                onAnimationComplete={() => removeReminder(reminder._id)}
                            />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
