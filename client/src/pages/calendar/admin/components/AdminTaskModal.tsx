import React, { useEffect, useMemo, useState } from 'react';
import { addHours, format, startOfHour } from 'date-fns';
import { Bell, Bookmark, CalendarDays, ChevronDown, Flag, Paperclip, Plus, RefreshCcw, Video, X } from 'lucide-react';
import { Modal } from '../../../../components/Modal/index.tsx';
import { useAdminCalendarStore, AdminTask } from '../store/useAdminCalendarStore.ts';
import { useAuthStore } from '../../../../context/authStore.ts';
import { useAppStore } from '../../../../context/appStore.ts';
import { emitErrorToast, emitSuccessToast } from '../../../../context/toastBus.ts';
import { cn } from '../../../../utils/helpers.ts';
import { Dropdown, DatePicker, TimePicker } from '../../../../components/ui/index.tsx';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers to read stored tag-encoded values
// ──────────────────────────────────────────────────────────────────────────────
const readTagValue = (tags: string[] | undefined, prefix: string, fallback: string) =>
    tags?.find((tag) => tag.startsWith(prefix))?.replace(prefix, '') || fallback;

const readParticipants = (tags: string[] | undefined) => {
    const raw = tags?.find((tag) => tag.startsWith('Participants: '))?.replace('Participants: ', '');
    if (!raw) return [];
    return raw.split(',').map((n) => n.trim()).filter(Boolean);
};

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
export const AdminTaskModal = () => {
    const { selectedTask, setSelectedTask, createTask, updateTask, deleteTask, addComment, uploadAttachment } =
        useAdminCalendarStore();
    const { user } = useAuthStore();
    const { teams, users } = useAppStore();

    const isNew = selectedTask === 'new';
    const task = isNew ? null : (selectedTask as AdminTask);
    const isOpen = selectedTask !== null;

    // ── form state ──────────────────────────────────────────────────────────
    const [eventName, setEventName] = useState('');
    const [notes, setNotes] = useState('');
    const [priority, setPriority] = useState<AdminTask['priority']>('none');
    const [status, setStatus] = useState<AdminTask['status']>('Pending');
    const [startTime, setStartTime] = useState(startOfHour(addHours(new Date(), 1)));
    const [endTime, setEndTime] = useState(addHours(startOfHour(addHours(new Date(), 1)), 1));
    const [repeatEvent, setRepeatEvent] = useState(false);
    const [createIn, setCreateIn] = useState('');
    const [eventType, setEventType] = useState('Meeting & Interview');
    const [meetingProvider, setMeetingProvider] = useState('Google Meet');
    const [participants, setParticipants] = useState<string[]>([]);
    const [showParticipants, setShowParticipants] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [taskColor, setTaskColor] = useState('#4DA3FF');
    const [recurrenceFrequency, setRecurrenceFrequency] = useState<any>('weekly');

    // ── reminder state ───────────────────────────────────────────────────────
    const [showReminderPicker, setShowReminderPicker] = useState(false);
    const [reminderDate, setReminderDate] = useState('');
    const [reminderTime, setReminderTime] = useState('');

    const reminderAt: Date | null = useMemo(() => {
        if (!reminderDate || !reminderTime) return null;
        const d = new Date(`${reminderDate}T${reminderTime}`);
        return isNaN(d.getTime()) ? null : d;
    }, [reminderDate, reminderTime]);

    const meetingLinkHint = meetingProvider === 'None' ? 'No meeting link will be created' : 'Link will be generated automatically';

    const availableParticipants = useMemo(() => {
        if (!Array.isArray(users) || users.length === 0) return [];
        return users.filter((u) => u.isActive !== false);
    }, [users]);

    // ── populate form when opening ───────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const defaultStart = task?.startDateTime ? new Date(task.startDateTime as any) : startOfHour(addHours(new Date(), 1));
        const defaultEnd = task?.endDateTime ? new Date(task.endDateTime as any) : addHours(defaultStart, 1);
        const stored = readParticipants(task?.tags);
        const assigned = task?.assignedUser ? [task.assignedUser] : [];

        setEventName(task?.title || '');
        setNotes(task?.description || '');
        setPriority(task?.priority || 'none');
        setStatus(task?.status || 'Pending');
        setStartTime(defaultStart);
        setEndTime(defaultEnd);
        setRepeatEvent(Boolean(task?.tags?.includes('Repeat event')));
        setCreateIn(readTagValue(task?.tags, 'Create in: ', teams[0]?.name || 'General'));
        setEventType(readTagValue(task?.tags, 'Type: ', 'Meeting & Interview'));
        setMeetingProvider(readTagValue(task?.tags, 'Provider: ', 'Google Meet'));
        setParticipants(stored.length > 0 ? stored : assigned);
        setCommentText('');
        setPendingFiles([]);
        setTaskColor(task?.color || '#4DA3FF');
        setRecurrenceFrequency(task?.recurrenceRule?.frequency || 'weekly');
        setShowReminderPicker(false);
        if (task?.reminderAt) {
            const rd = new Date(task.reminderAt);
            setReminderDate(format(rd, 'yyyy-MM-dd'));
            setReminderTime(format(rd, 'HH:mm'));
        } else {
            setReminderDate('');
            setReminderTime('');
        }
        setShowParticipants(false);
    }, [isOpen, task, teams]);

    if (!isOpen) return null;

    // ── participant toggle ───────────────────────────────────────────────────
    const toggleParticipant = (name: string) =>
        setParticipants((cur) => cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]);

    // ── save ─────────────────────────────────────────────────────────────────
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventName.trim()) return;
        if (endTime <= startTime) { emitErrorToast('End time must be after start time.', 'Invalid time range'); return; }

        const payload: Partial<AdminTask> = {
            title: eventName.trim(),
            description: notes.trim(),
            priority,
            status,
            assignedUser: participants[0] || user?.name || 'Admin',
            startDateTime: startTime.toISOString(),
            endDateTime: endTime.toISOString(),
            color: taskColor,
            isRecurring: repeatEvent,
            recurrenceRule: repeatEvent ? { frequency: recurrenceFrequency, interval: 1 } : undefined,
            participants,                                       // ← stored on task
            reminderAt: reminderAt ? reminderAt.toISOString() : undefined,  // ← reminder
            tags: [
                `Create in: ${createIn}`,
                `Type: ${eventType}`,
                `Provider: ${meetingProvider}`,
                `Participants: ${participants.join(', ')}`,
            ].filter(Boolean),
        };

        const saved = isNew ? await createTask(payload) : task ? await updateTask(task._id, payload) : null;

        if (saved && pendingFiles.length > 0) {
            for (const file of pendingFiles) await uploadAttachment(saved._id, file);
        }

        if (!saved) { emitErrorToast(isNew ? 'Failed to create event.' : 'Failed to save event.', 'Calendar action failed'); return; }

        emitSuccessToast(isNew ? 'Event created! Participants notified.' : 'Event updated successfully.');
        if (reminderAt) {
            emitSuccessToast(`Reminder set for ${format(reminderAt, 'dd MMM yyyy, HH:mm')}.`);
        }
        setSelectedTask(null);
    };

    const handleDelete = async () => {
        if (!isNew && task && window.confirm('Are you sure you want to delete this event?')) {
            await deleteTask(task._id);
            setSelectedTask(null);
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || isNew || !task) return;
        await addComment(task._id, { text: commentText, userId: user?.id || 'admin', userName: user?.name || 'Admin' });
        setCommentText('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        if (isNew || !task) { setPendingFiles((cur) => [...cur, ...files]); return; }
        for (const file of files) await uploadAttachment(task._id, file);
    };

    // ──────────────────────────────────────────────────────────────────────────
    return (
        <Modal
            open={isOpen}
            onClose={() => setSelectedTask(null)}
            size="full"
            showClose={false}
            className="max-w-[860px] h-auto max-h-[90vh] rounded-[24px] border-0 bg-white dark:bg-surface-900 shadow-2xl overflow-hidden"
        >
            <div className="flex h-full flex-col bg-white dark:bg-surface-900">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-surface-100 dark:border-surface-800">
                    <h2 className="text-[22px] font-bold text-surface-900 dark:text-white">
                        {isNew ? 'Create event' : 'Edit event'}
                    </h2>
                    <div className="flex items-center gap-4">
                        {/* Repeat toggle */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setRepeatEvent(!repeatEvent)}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border',
                                    repeatEvent ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-surface-500 dark:text-surface-300 border-transparent hover:bg-surface-50 dark:hover:bg-surface-800'
                                )}
                            >
                                <RefreshCcw size={15} /><span>Repeat event</span>
                            </button>
                            {repeatEvent && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {['day', 'weekly', 'monthly', 'yearly'].map((freq) => (
                                        <button
                                            key={freq}
                                            type="button"
                                            onClick={() => setRecurrenceFrequency(freq)}
                                            className={cn(
                                                'w-full text-left px-3 py-2 rounded-lg text-sm font-bold capitalize',
                                                recurrenceFrequency === freq
                                                    ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400'
                                                    : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
                                            )}
                                        >
                                            Every {freq.replace('ly', '')}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Reminder toggle */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowReminderPicker((v) => !v)}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border',
                                    reminderAt
                                        ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 border-brand-200 dark:border-brand-800 shadow-sm'
                                        : 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 border-transparent hover:bg-brand-100 dark:hover:bg-brand-900/50'
                                )}
                            >
                                <Bell size={16} />
                                <span>{reminderAt ? `Reminder: ${format(reminderAt, 'dd MMM HH:mm')}` : 'Set reminder'}</span>
                            </button>

                            {showReminderPicker && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider">Set Reminder</h4>
                                        <button onClick={() => setShowReminderPicker(false)} className="text-surface-400 hover:text-surface-600">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <DatePicker
                                            value={reminderDate || format(new Date(), 'yyyy-MM-dd')}
                                            onChange={setReminderDate}
                                            placeholder="Pick Date"
                                            className="w-full"
                                        />
                                        <TimePicker
                                            value={reminderTime || '09:00'}
                                            onChange={setReminderTime}
                                            className="w-full"
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => { setReminderDate(''); setReminderTime(''); setShowReminderPicker(false); }}
                                                className="flex-1 px-3 py-2 rounded-xl border border-surface-100 dark:border-surface-700 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                onClick={() => setShowReminderPicker(false)}
                                                className="flex-1 px-3 py-2 rounded-xl bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-brand-700 shadow-md shadow-brand-500/20"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type="button" onClick={() => setSelectedTask(null)} className="text-surface-400 hover:text-surface-700 dark:text-surface-500 dark:hover:text-surface-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* ── Main content ───────────────────────────────────────────── */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3">
                    {/* Left content */}
                    <div className="md:col-span-2 p-8 space-y-6 overflow-y-auto">

                        {/* Event name */}
                        <input
                            type="text"
                            placeholder="Project status update meeting"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            className="w-full text-[20px] font-bold text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 outline-none border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-2.5 bg-surface-50 dark:bg-surface-800 focus:bg-white dark:focus:bg-surface-700 focus:border-brand-400 transition-all shadow-sm"
                        />

                        {/* Date & Time */}
                        <div className="flex items-center gap-3">
                            <DatePicker
                                value={format(startTime, 'yyyy-MM-dd')}
                                onChange={(dateVal) => {
                                    const [y, m, d] = dateVal.split('-').map(Number);
                                    const nextS = new Date(startTime); nextS.setFullYear(y, m - 1, d);
                                    const nextE = new Date(endTime); nextE.setFullYear(y, m - 1, d);
                                    setStartTime(nextS); setEndTime(nextE);
                                }}
                                className="w-[140px]"
                            />
                            <div className="flex items-center gap-1.5">
                                <TimePicker
                                    value={format(startTime, 'HH:mm')}
                                    onChange={(timeVal) => {
                                        const [h, m] = timeVal.split(':').map(Number);
                                        const n = new Date(startTime); n.setHours(h, m);
                                        setStartTime(n);
                                    }}
                                />
                                <span className="text-surface-300 dark:text-surface-600 font-bold">-</span>
                                <TimePicker
                                    value={format(endTime, 'HH:mm')}
                                    onChange={(timeVal) => {
                                        const [h, m] = timeVal.split(':').map(Number);
                                        const n = new Date(endTime); n.setHours(h, m);
                                        setEndTime(n);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Meeting provider */}
                        <div className="flex items-center gap-4">
                            <Dropdown
                                value={meetingProvider}
                                onChange={(val) => setMeetingProvider(val)}
                                className="flex-1"
                                triggerClassName="bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 h-[42px] font-bold"
                                items={[
                                    { id: 'Google Meet', label: 'Google Meet', icon: <Video size={16} className="text-emerald-500" /> },
                                    { id: 'Zoom', label: 'Zoom', icon: <Video size={16} className="text-blue-500" /> },
                                    { id: 'Teams', label: 'Teams', icon: <Video size={16} className="text-brand-500" /> },
                                    { id: 'None', label: 'None', icon: <Video size={16} className="text-surface-400" /> },
                                ]}
                            />
                        </div>

                        {/* Description */}
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={"Let's discuss:\n• What progress have we made toward the campaign's launch\n• What are the major challenges or obstacles\n• Are we on track to meet our next set of milestones"}
                            className="w-full h-[160px] border border-surface-200 dark:border-surface-700 rounded-2xl bg-surface-50 dark:bg-surface-800 p-4 text-[14px] leading-relaxed text-surface-700 dark:text-surface-200 placeholder:text-surface-300 dark:placeholder:text-surface-600 outline-none focus:bg-white dark:focus:bg-surface-700 focus:border-brand-400 transition-all resize-none shadow-inner"
                        />

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 pt-1 flex-wrap">
                            {/* Attach file */}
                            <label className="flex items-center gap-2 text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors cursor-pointer">
                                <Paperclip size={16} />
                                <span>Attach file</span>
                                <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                            </label>
                            {pendingFiles.length > 0 && (
                                <span className="text-xs font-bold text-surface-500">{pendingFiles.length} file(s) ready</span>
                            )}
                        </div>

                        {/* Reminder picker */}
                        {showReminderPicker && (
                            <div className="flex items-center gap-3 p-4 border border-brand-200 dark:border-brand-800 rounded-xl bg-brand-50 dark:bg-brand-900/20 transition-all">
                                <Bell size={18} className="text-brand-600 dark:text-brand-400 shrink-0" />
                                <div className="flex flex-col gap-2 flex-1">
                                    <p className="text-[12px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Reminder time</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={reminderDate}
                                            min={format(new Date(), 'yyyy-MM-dd')}
                                            onChange={(e) => setReminderDate(e.target.value)}
                                            className="border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-1.5 text-sm font-bold text-surface-900 dark:text-white bg-white dark:bg-surface-800 outline-none focus:border-brand-500"
                                        />
                                        <input
                                            type="time"
                                            value={reminderTime}
                                            onChange={(e) => setReminderTime(e.target.value)}
                                            className="border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-1.5 text-sm font-bold text-surface-900 dark:text-white bg-white dark:bg-surface-800 outline-none focus:border-brand-500"
                                        />
                                    </div>
                                    {reminderAt && (
                                        <p className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                                            Alert fires at: {format(reminderAt, 'dd MMM yyyy, HH:mm')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div className="w-[300px] bg-surface-50 dark:bg-surface-950 border-l border-surface-100 dark:border-surface-800 px-6 py-6 overflow-y-auto space-y-6 transition-colors">

                        {/* Create In */}
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2 ml-1">Create in</p>
                            <Dropdown
                                value={createIn}
                                onChange={(val) => setCreateIn(val)}
                                items={teams.length > 0 
                                    ? teams.map(t => ({ id: t.name, label: t.name }))
                                    : [{ id: 'General', label: 'General' }]
                                }
                            />
                        </div>

                        {/* Type */}
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2 ml-1">Type</p>
                            <Dropdown
                                value={eventType}
                                onChange={(val) => setEventType(val)}
                                items={[
                                    { id: 'Meeting & Interview', label: 'Meeting & Interview', icon: <div className="h-3 w-3 rounded-full bg-brand-500" /> },
                                    { id: 'Planning', label: 'Planning', icon: <div className="h-3 w-3 rounded-full bg-emerald-500" /> },
                                    { id: 'Feedback', label: 'Feedback', icon: <div className="h-3 w-3 rounded-full bg-amber-500" /> },
                                ]}
                            />
                        </div>

                        {/* Priority */}
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2 ml-1">Priority</p>
                            <Dropdown
                                value={priority}
                                onChange={(val) => setPriority(val as any)}
                                triggerClassName={cn(
                                    priority === 'high' ? "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" :
                                        priority === 'medium' ? "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" :
                                            priority === 'low' ? "border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" :
                                                ""
                                )}
                                items={[
                                    { id: 'none', label: 'None', icon: <Flag size={14} className="text-surface-300 dark:text-surface-600" /> },
                                    { id: 'high', label: 'High', icon: <Flag size={14} className="text-red-500 fill-red-500" /> },
                                    { id: 'medium', label: 'Medium', icon: <Flag size={14} className="text-amber-500 fill-amber-500" /> },
                                    { id: 'low', label: 'Low', icon: <Flag size={14} className="text-blue-500 fill-blue-500" /> },
                                ]}
                            />
                        </div>

                        {/* Participants */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-400 dark:text-surface-500">Participants</p>
                                <button type="button" onClick={() => setShowParticipants((v) => !v)} className="text-brand-600 dark:text-brand-400 text-sm font-bold hover:underline">
                                    Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {/* Currently selected */}
                                {participants.map((name) => {
                                    const found = availableParticipants.find((u) => u.name === name);
                                    return (
                                        <div key={name} className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-full border-2 border-white dark:border-surface-800 flex items-center justify-center text-white font-bold text-xs shadow-sm" style={{ backgroundColor: found?.color || '#4DA3FF' }}>
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-bold text-surface-900 dark:text-white flex-1 truncate">{name}</span>
                                            <button type="button" onClick={() => toggleParticipant(name)} className="text-surface-400 dark:text-surface-500 hover:text-red-500 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    );
                                })}

                                {/* Participant picker dropdown (Refactored to close correctly) */}
                                {showParticipants && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowParticipants(false)} />
                                        <div className="relative z-50 mt-1 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 shadow-xl max-h-[220px] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                                            <div className="overflow-y-auto flex-1">
                                                {availableParticipants.map((p) => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                            toggleParticipant(p.name);
                                                        }}
                                                        className={cn(
                                                            'w-full flex items-center gap-2.5 px-3 py-2 text-sm font-bold transition-colors text-left',
                                                            participants.includes(p.name)
                                                                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                                                                : 'hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200'
                                                        )}
                                                    >
                                                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: p.color || '#4DA3FF' }}>
                                                            {p.name.charAt(0)}
                                                        </div>
                                                        <span className="flex-1 truncate">{p.name}</span>
                                                        {participants.includes(p.name) && <Bookmark size={12} className="text-brand-500 fill-brand-500" />}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="border-t border-surface-100 dark:border-surface-700 p-2 flex justify-end bg-surface-50 dark:bg-surface-800/50 rounded-b-xl">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowParticipants(false)}
                                                    className="px-4 py-1.5 bg-brand-600 text-white text-xs font-black uppercase tracking-wider rounded-lg hover:bg-brand-700 transition-colors"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-8 py-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-950/50 transition-colors">
                    {!isNew ? (
                        <button type="button" onClick={handleDelete} className="text-red-500 text-sm font-bold hover:underline">
                            Delete event
                        </button>
                    ) : <div />}
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setSelectedTask(null)} className="px-6 py-2.5 text-sm font-bold text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-brand-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all active:scale-[0.98]"
                        >
                            {isNew ? 'Create event' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AdminTaskModal;
