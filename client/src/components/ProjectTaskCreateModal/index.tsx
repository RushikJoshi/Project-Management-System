import React, { useEffect, useMemo, useState } from 'react';
import { addDaysToDateKey, generateId } from '../../utils/helpers';
import { getReservedTaskTitleError } from '../../utils/taskTitleValidation';
import { PRIORITY_CONFIG, STATUS_CONFIG, TASK_TYPE_CONFIG } from '../../app/constants';
import { Modal } from '../Modal';
import { UserAvatar } from '../UserAvatar';
import { useAppStore } from '../../context/appStore';
import { 
  Tag, X, Plus, Check, Type, AlignLeft, 
  Calendar, Clock, Layout, Hash, Users,
  Paperclip, Bookmark, Flag, ChevronDown, ListPlus,
  Upload as LucideUpload, Info, Settings, Zap, Edit2, Workflow as LucideWorkflow, FolderPlus
} from 'lucide-react';
import { labelsService, projectsService } from '../../services/api';
import { cn } from '../../utils/helpers';
import { Dropdown, DatePicker } from '../ui';
import type { Priority, Project, ProjectCategory, TaskStatus, TaskType, TimelinePhase, User } from '../../app/types';

export interface ProjectTaskCreateValues {
  title: string;
  description?: string;
  taskType: string;
  priority: Priority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  durationDays: number;
  phaseId?: string;
  subcategoryId?: string;
  assigneeIds: string[];
  estimatedHours?: number;
  labels: string[];
  tags: string[];
  files: File[];
}

interface ProjectTaskCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ProjectTaskCreateValues) => Promise<void> | void;
  project: Project;
  members: User[];
  phases: TimelinePhase[];
  defaultStatus?: TaskStatus;
  canSubmit?: boolean;
  submitLabel?: string;
  title?: string;
  initialValues?: Partial<ProjectTaskCreateValues>;
  onCreatePhase?: (input: { id: string; name: string; order: number; color: string }) => Promise<string | void> | string | void;
  onUpdateProject?: (updates: Partial<Project>) => Promise<void> | void;
}

const CATEGORY_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#ea580c', '#dc2626', '#0891b2'];

function createDefaultValues(project: Project, defaultStatus: TaskStatus): ProjectTaskCreateValues {
  const today = new Date().toISOString().split('T')[0];
  const startDate = project.startDate && project.startDate >= today ? project.startDate : today;
  return {
    title: '',
    description: '',
    taskType: 'operational',
    priority: 'medium',
    status: defaultStatus,
    startDate,
    dueDate: startDate,
    durationDays: 1,
    phaseId: '',
    subcategoryId: '',
    assigneeIds: [],
    estimatedHours: undefined,
    labels: [],
    tags: [],
    files: [],
  };
}

export const ProjectTaskCreateModal: React.FC<ProjectTaskCreateModalProps> = ({
  open,
  onClose,
  onSubmit,
  project,
  members,
  phases,
  defaultStatus = 'todo',
  canSubmit = true,
  submitLabel = 'Create Task',
  title = 'New Task',
  initialValues = {},
  onCreatePhase,
  onUpdateProject,
}) => {
  const [form, setForm] = useState<ProjectTaskCreateValues>(() => ({
    ...createDefaultValues(project, defaultStatus),
    ...initialValues
  }));
  const [showNewPhaseInput, setShowNewPhaseInput] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  
  // Custom Task Types
  const [customTypes, setCustomTypes] = useState<Array<{id: string, label: string}>>([]);
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Custom Categories
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [assigneeError, setAssigneeError] = useState(false);
  const titleError = getReservedTaskTitleError(form.title);

  const categories = useMemo<ProjectCategory[]>(() => project.subcategories || [], [project.subcategories]);

  // Only reset form when modal is first opened
  useEffect(() => {
    if (open) {
      setForm({
        ...createDefaultValues(project, defaultStatus),
        ...initialValues
      });
      setShowNewPhaseInput(false);
      setShowNewTypeInput(false);
      setShowNewCategoryInput(false);
      setNewPhaseName('');
      setNewTypeName('');
      setNewCategoryName('');
      setSubmitting(false);
      setAssigneeError(false);
    }
  }, [open]); // Only depend on 'open' transition

  useEffect(() => {
    setForm((current) => {
      if (!current.startDate || !current.dueDate) return current;
      const nextDuration = Math.max(
        1,
        Math.floor((new Date(current.dueDate).getTime() - new Date(current.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
      if (nextDuration === current.durationDays) return current;
      return { ...current, durationDays: nextDuration };
    });
  }, [form.startDate, form.dueDate]);

  const setField = <K extends keyof ProjectTaskCreateValues>(key: K, value: ProjectTaskCreateValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleStartDateChange = (value: string) => {
    setForm((current) => {
      const dueDate = current.dueDate && current.dueDate >= value ? current.dueDate : value;
      const durationDays = Math.max(
        1,
        Math.floor((new Date(dueDate).getTime() - new Date(value).getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
      return { ...current, startDate: value, dueDate, durationDays };
    });
  };

  const handleDueDateChange = (date: string) => {
    setForm((current) => {
      const safeDueDate = date >= current.startDate ? date : current.startDate;
      const durationDays = Math.max(
        1,
        Math.floor((new Date(safeDueDate).getTime() - new Date(current.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
      return { ...current, dueDate: safeDueDate, durationDays };
    });
  };

  const handleDurationChange = (value: number) => {
    const durationDays = Math.max(1, Number(value) || 1);
    setForm((current) => ({
      ...current,
      durationDays,
      dueDate: addDaysToDateKey(current.startDate, durationDays - 1),
    }));
  };

  const handleCreatePhase = async () => {
    const name = newPhaseName.trim();
    if (!name || !onCreatePhase) return;
    const nextPhase = {
      id: generateId(),
      name,
      order: phases.length,
      color: CATEGORY_COLORS[phases.length % CATEGORY_COLORS.length],
    };
    const createdPhaseId = await onCreatePhase(nextPhase);
    setForm((current) => ({ ...current, phaseId: createdPhaseId || nextPhase.id }));
    setNewPhaseName('');
    setShowNewPhaseInput(false);
  };

  const handleCreateType = () => {
    const name = newTypeName.trim();
    if (!name) return;
    const newId = name.toLowerCase().replace(/\s+/g, '_');
    setCustomTypes(prev => [...prev, { id: newId, label: name }]);
    setField('taskType', newId);
    setNewTypeName('');
    setShowNewTypeInput(false);
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || !onUpdateProject) return;
    const newCategory: ProjectCategory = {
      id: generateId(),
      name,
      order: categories.length,
      color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
    };
    try {
      await onUpdateProject({
        subcategories: [...categories, newCategory]
      });
      setField('subcategoryId', newCategory.id);
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (e) {
      console.error('Failed to create category', e);
    }
  };

  const toggleAssignee = (userId: string) => {
    setForm((current) => ({
      ...current,
      assigneeIds: current.assigneeIds.includes(userId)
        ? current.assigneeIds.filter((id) => id !== userId)
        : [...current.assigneeIds, userId],
    }));
  };

  const { allLabels, bootstrap } = useAppStore();
  const [tagInput, setTagInput] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const res = await labelsService.create({ name: newLabelName.trim(), color: newLabelColor });
      const newL = res.data.data;
      await bootstrap();
      setField('labels', [...form.labels, newL.id]);
      setNewLabelName('');
      setIsCreatingLabel(false);
    } catch (e: any) {
      // Error handled by interceptor
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !form.title.trim() || !form.startDate || !form.dueDate || titleError) return;
    if (form.assigneeIds.length === 0) {
      setAssigneeError(true);
      document.getElementById('assignees-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setAssigneeError(false);
    try {
      setSubmitting(true);
      await onSubmit({
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        taskType: form.taskType as TaskType,
        phaseId: form.phaseId || undefined,
        subcategoryId: form.subcategoryId || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const typeItems = [
    ...Object.keys(TASK_TYPE_CONFIG).map(k => ({ id: k, label: TASK_TYPE_CONFIG[k as TaskType].label })),
    ...customTypes,
    { id: '__new__', label: '+ Add new type', className: 'text-brand-600 font-bold border-t border-surface-50 dark:border-surface-800' }
  ];
  const priorityItems = Object.keys(PRIORITY_CONFIG).map(k => ({ id: k, label: PRIORITY_CONFIG[k as Priority].label }));
  const statusItems = Object.keys(STATUS_CONFIG).map(k => ({ id: k, label: STATUS_CONFIG[k as TaskStatus].label }));
  const phaseItems = [
    { id: '', label: 'Ungrouped' },
    ...phases.map(p => ({ id: p.id, label: p.name })),
    ...(onCreatePhase ? [{ id: '__new__', label: '+ Add new phase', className: 'text-brand-600 font-bold border-t border-surface-50 dark:border-surface-800' }] : [])
  ];
  const categoryItems = [
    { id: '', label: 'All categories / none' },
    ...categories.map(c => ({ id: c.id, label: c.name })),
    ...(onUpdateProject ? [{ id: '__new__', label: '+ Add new category', className: 'text-brand-600 font-bold border-t border-surface-50 dark:border-surface-800' }] : [])
  ];

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <form onSubmit={handleSubmit} className="p-0 overflow-hidden bg-white dark:bg-surface-950">
        <div className="flex flex-col lg:flex-row max-h-[85vh] relative">
          
          {/* Left Section: Content, Assignments, Labels, Attachments */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar border-r border-surface-100 dark:border-surface-800/50 space-y-6">
            
            {/* Header: Title & Dates */}
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-12 md:col-span-8 space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-surface-300 flex items-center gap-2 italic">
                  <Type size={10} className="text-brand-500" /> Task Title *
                </label>
                <input
                  className={cn(
                    "w-full bg-surface-50/50 dark:bg-surface-900/30 border border-surface-100 dark:border-surface-800 rounded-xl px-4 h-9 text-sm font-bold text-surface-900 dark:text-surface-50 transition-all outline-none",
                    "focus:border-brand-500",
                    titleError && "border-rose-300 dark:border-rose-900"
                  )}
                  value={form.title}
                  onChange={(event) => setField('title', event.target.value)}
                  placeholder="What needs to be done?"
                  required
                  autoFocus
                />
                {titleError ? <p className="mt-1 text-[9px] font-bold text-rose-500 ml-1 uppercase tracking-wider">{titleError}</p> : null}
              </div>
              <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-surface-300 flex items-center gap-2">
                    <Calendar size={10} className="text-brand-500" /> Start
                  </label>
                  <DatePicker value={form.startDate} onChange={handleStartDateChange} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-surface-300 flex items-center gap-2">
                    <Calendar size={10} className="text-brand-500" /> Due
                  </label>
                  <DatePicker value={form.dueDate} onChange={handleDueDateChange} minDate={form.startDate} className="h-9" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-surface-300 flex items-center gap-2 italic">
                <AlignLeft size={10} className="text-brand-500" /> Description
              </label>
              <textarea
                className="w-full bg-surface-50/50 dark:bg-surface-900/30 border border-surface-100 dark:border-surface-800 rounded-xl px-4 py-3 text-sm font-medium text-surface-700 dark:text-surface-200 transition-all outline-none min-h-[90px] resize-none focus:border-brand-500"
                value={form.description || ''}
                onChange={(event) => setField('description', event.target.value)}
                placeholder="Enter task details, requirements, or notes..."
              />
            </div>

            {/* Assignment Section */}
            <div className="space-y-3" id="assignees-section">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-surface-300 flex items-center gap-2 italic">
                  <Users size={10} className="text-brand-500" /> Assign Team Members *
                </label>
                {form.assigneeIds.length > 0 && (
                  <span className="text-[8px] font-black text-brand-600 bg-brand-50 dark:bg-brand-950/30 px-2 py-0.5 rounded-full border border-brand-100/30 uppercase tracking-widest">
                    {form.assigneeIds.length} Selected
                  </span>
                )}
              </div>
              
              <div className={cn(
                'grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 rounded-xl border transition-all',
                assigneeError
                  ? 'border-rose-300 bg-rose-50/30 dark:border-rose-900/50'
                  : 'border-surface-100 bg-surface-50/30 dark:border-surface-800'
              )}>
                {members.filter(m => ['team_leader', 'team_member'].includes(m.role)).length ? members.filter(m => ['team_leader', 'team_member'].includes(m.role)).map((member) => (
                  <label 
                    key={member.id} 
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all cursor-pointer group",
                      form.assigneeIds.includes(member.id) 
                        ? "bg-white dark:bg-surface-800 border-brand-200 dark:border-brand-900 shadow-sm" 
                        : "bg-transparent border-transparent hover:bg-white dark:hover:bg-surface-800"
                    )}
                  >
                    <input type="checkbox" className="sr-only" checked={form.assigneeIds.includes(member.id)} onChange={() => { toggleAssignee(member.id); setAssigneeError(false); }} />
                    <div className={cn(
                      "w-3 h-3 rounded border flex items-center justify-center transition-all flex-shrink-0",
                      form.assigneeIds.includes(member.id) ? "bg-brand-500 border-brand-500" : "border-surface-300 dark:border-surface-600 group-hover:border-brand-400"
                    )}>
                      {form.assigneeIds.includes(member.id) && <Check size={8} className="text-white" strokeWidth={4} />}
                    </div>
                    <UserAvatar name={member.name} color={member.color} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[10px] font-bold text-surface-800 dark:text-surface-200 leading-none mb-0.5">{member.name}</p>
                      <p className="truncate text-[7px] text-surface-400 font-bold uppercase tracking-widest">{member.role.replace('_', ' ')}</p>
                    </div>
                  </label>
                )) : (
                  <div className="col-span-full py-2 text-center">
                     <p className="text-[9px] text-surface-400 font-bold uppercase tracking-widest">No members available</p>
                  </div>
                )}
              </div>
              {assigneeError && <p className="text-[8px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 ml-1"><Info size={9} /> Assignment required</p>}
            </div>

            {/* Labels & Attachments (Fixed Layout) */}
            <div className="space-y-6 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand-600">
                    <Tag size={13} strokeWidth={2.5} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Labels</h4>
                  </div>
                  {!isCreatingLabel && (
                    <button type="button" onClick={() => setIsCreatingLabel(true)} className="text-[9px] font-black text-brand-600 hover:text-brand-700 uppercase tracking-wider flex items-center gap-0.5">
                      <Plus size={10} /> Add New Label
                    </button>
                  )}
                </div>
                {isCreatingLabel ? (
                  <div className="p-3 bg-brand-50/20 dark:bg-brand-950/10 rounded-xl border border-brand-100/50 animate-in fade-in zoom-in-95 space-y-3">
                    <div className="flex items-center gap-3">
                      <input autoFocus className="flex-1 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-lg px-3 py-1.5 text-[11px] font-bold outline-none h-8 focus:border-brand-500" placeholder="Label Name..." value={newLabelName} onChange={e => setNewLabelName(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateLabel())} />
                      <div className="flex gap-1.5 px-2 py-1 bg-white dark:bg-surface-900 rounded-lg border border-surface-100 dark:border-surface-800">
                        {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899'].map(c => (
                          <button key={c} type="button" onClick={() => setNewLabelColor(c)} className={cn("w-4 h-4 rounded-full border-2 transition-all", newLabelColor === c ? "border-white dark:border-surface-800 ring-1 ring-brand-500 scale-110" : "border-transparent opacity-60 hover:opacity-100")} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setIsCreatingLabel(false)} className="px-3 h-7 rounded-lg text-[9px] font-black uppercase tracking-widest text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">Cancel</button>
                      <button type="button" onClick={() => void handleCreateLabel()} className="px-4 h-7 rounded-lg bg-brand-600 text-white text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-brand-700 transition-colors">Save Label</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-2.5 min-h-[44px] bg-surface-50/30 dark:bg-surface-900/30 rounded-xl border border-surface-100 dark:border-surface-800/50">
                    {allLabels.map(l => {
                      const isSelected = form.labels.includes(l.id);
                      return (
                        <button key={l.id} type="button" onClick={() => setField('labels', isSelected ? form.labels.filter(id => id !== l.id) : [...form.labels, l.id])} className={cn("px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border", isSelected ? "shadow-sm" : "opacity-30 grayscale hover:opacity-100 hover:grayscale-0 border-transparent")} style={{ backgroundColor: isSelected ? `${l.color}15` : 'transparent', color: isSelected ? l.color : undefined, borderColor: isSelected ? l.color : 'transparent' }}>
                          {l.name}
                        </button>
                      );
                    })}
                    {allLabels.length === 0 && <p className="text-[9px] text-surface-400 font-bold uppercase tracking-widest italic py-1.5 opacity-50">No labels yet</p>}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-brand-600">
                  <Paperclip size={13} strokeWidth={2.5} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Attachments</h4>
                </div>
                <div className="space-y-3">
                  <div className="relative group">
                    <input 
                      type="file" 
                      multiple 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                      onChange={(event) => {
                        const newFiles = event.target.files ? Array.from(event.target.files) : [];
                        if (newFiles.length > 0) {
                          setField('files', [...form.files, ...newFiles]);
                        }
                        event.target.value = ''; // Reset to allow same file selection
                      }} 
                    />
                    <div className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-xl group-hover:border-brand-500/50 transition-all bg-surface-50/50 dark:bg-surface-900/30 group-hover:bg-brand-50/10">
                      <LucideUpload size={14} className="text-surface-400 group-hover:text-brand-500 transition-colors" />
                      <span className="text-[10px] font-black text-surface-500 group-hover:text-brand-600 uppercase tracking-widest">Click or drag files to upload</span>
                    </div>
                  </div>
                  {form.files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.files.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-lg shadow-sm animate-in slide-in-from-left-2">
                          <Paperclip size={10} className="text-surface-400" />
                          <span className="text-[10px] font-bold text-surface-600 dark:text-surface-300 truncate max-w-[150px]">{file.name}</span>
                          <button type="button" onClick={() => setField('files', form.files.filter((_, i) => i !== index))} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition-colors"><X size={10} strokeWidth={3} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Inline Input Overlays (Modern Integrated Style) */}
            {(showNewPhaseInput || showNewTypeInput || showNewCategoryInput) && (
              <div className="absolute inset-0 z-[100] bg-white/40 dark:bg-surface-950/40 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div className="w-full max-w-[320px] bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-100 dark:border-surface-800 p-5 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center gap-2.5 mb-5 text-brand-600">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
                      {showNewTypeInput ? <Edit2 size={16} strokeWidth={2.5} /> : showNewCategoryInput ? <FolderPlus size={16} strokeWidth={2.5} /> : <ListPlus size={16} strokeWidth={2.5} />}
                    </div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest">
                      {showNewTypeInput ? 'New Task Type' : showNewCategoryInput ? 'New Category' : 'New Phase'}
                    </h4>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-surface-400 uppercase tracking-widest ml-1">Display Name</label>
                      <input
                        autoFocus
                        className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all"
                        value={showNewTypeInput ? newTypeName : showNewCategoryInput ? newCategoryName : newPhaseName}
                        onChange={(e) => {
                          if (showNewTypeInput) setNewTypeName(e.target.value);
                          else if (showNewCategoryInput) setNewCategoryName(e.target.value);
                          else setNewPhaseName(e.target.value);
                        }}
                        placeholder={showNewTypeInput ? "e.g. Design Review" : showNewCategoryInput ? "e.g. Documentation" : "e.g. Launch"}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (showNewTypeInput) handleCreateType();
                            else if (showNewCategoryInput) void handleCreateCategory();
                            else void handleCreatePhase();
                          }
                          if (e.key === 'Escape') {
                            setShowNewTypeInput(false); setShowNewPhaseInput(false); setShowNewCategoryInput(false);
                          }
                        }}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
                        onClick={() => {
                          if (showNewTypeInput) handleCreateType();
                          else if (showNewCategoryInput) void handleCreateCategory();
                          else void handleCreatePhase();
                        }}
                        disabled={
                          showNewTypeInput ? !newTypeName.trim() : 
                          showNewCategoryInput ? !newCategoryName.trim() : 
                          !newPhaseName.trim()
                        }
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        className="px-5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all"
                        onClick={() => { setShowNewTypeInput(false); setShowNewPhaseInput(false); setShowNewCategoryInput(false); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Properties Sidebar */}
          <div className="w-full lg:w-[280px] bg-surface-50/40 dark:bg-surface-900/40 p-5 space-y-6 overflow-y-auto custom-scrollbar border-t lg:border-t-0 border-surface-100 dark:border-surface-800/50">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-600">
                <Zap size={12} strokeWidth={2.5} />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Properties</h4>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-surface-400 uppercase ml-1">Task Type</label>
                  <Dropdown value={form.taskType} items={typeItems} onChange={v => { if (v === '__new__') setShowNewTypeInput(true); else setField('taskType', v); }} triggerClassName="h-9 bg-white dark:bg-surface-900 border-surface-100 dark:border-surface-800" />
                </div>
                <Dropdown label="Priority" value={form.priority} items={priorityItems} onChange={v => setField('priority', v as Priority)} triggerClassName="h-9 bg-white dark:bg-surface-900 border-surface-100 dark:border-surface-800" />
                <Dropdown label="Status" value={form.status} items={statusItems} onChange={v => setField('status', v as TaskStatus)} triggerClassName="h-9 bg-white dark:bg-surface-900 border-surface-100 dark:border-surface-800" />
              </div>
            </div>

            <div className="space-y-4 pt-1 border-t border-surface-100 dark:border-surface-800/50">
              <div className="flex items-center gap-2 text-brand-600">
                <LucideWorkflow size={12} strokeWidth={2.5} />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Workflow</h4>
              </div>
              <div className="space-y-3">
                <Dropdown label="Phase" value={form.phaseId || ''} items={phaseItems} onChange={v => { if (v === '__new__') setShowNewPhaseInput(true); else setField('phaseId', v); }} triggerClassName="h-9 bg-white dark:bg-surface-900 border-surface-100 dark:border-surface-800" />
                <Dropdown label="Category" value={form.subcategoryId || ''} items={categoryItems} onChange={v => { if (v === '__new__') setShowNewCategoryInput(true); else setField('subcategoryId', v); }} triggerClassName="h-9 bg-white dark:bg-surface-900 border-surface-100 dark:border-surface-800" />
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-surface-400 uppercase ml-1 block">Est. Hours</label>
                  <div className="relative">
                    <input className="w-full bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 rounded-xl px-3 h-9 text-[11px] font-bold outline-none focus:border-brand-500" type="number" min={0} step={0.5} placeholder="0" value={form.estimatedHours ?? ''} onChange={(event) => setField('estimatedHours', event.target.value ? Number(event.target.value) : undefined)} />
                    <Clock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-300 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-1 border-t border-surface-100 dark:border-surface-800/50">
              <div className="flex items-center gap-2 text-brand-600">
                <Clock size={12} strokeWidth={2.5} />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Duration</h4>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-surface-400 uppercase ml-1 block">Days</label>
                <div className="relative">
                  <input className="w-full bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 rounded-xl px-3 h-9 text-[11px] font-bold outline-none focus:border-brand-500" type="number" min={1} value={form.durationDays} onChange={(event) => handleDurationChange(Number(event.target.value))} />
                  <Calendar size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-300 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-surface-50/50 dark:bg-surface-900/50 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-surface-400 px-2 opacity-60">
            <Info size={12} />
            <span className="text-[8px] font-black uppercase tracking-[0.15em] italic">All * fields are mandatory</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-surface-400 hover:text-surface-700 transition-all">Discard</button>
            <button
              type="submit"
              disabled={!canSubmit || submitting || !form.title.trim() || Boolean(titleError)}
              className="px-12 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-500/25 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Creating...' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectTaskCreateModal;
