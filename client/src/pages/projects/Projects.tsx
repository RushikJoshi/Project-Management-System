import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Plus, Search, LayoutGrid, List,
  FolderKanban, Calendar, MoreVertical, Trash2, Edit3, Archive, ChevronDown, Upload as LucideUpload,
  Users, UserCheck, DollarSign, IndianRupee, Workflow as LucideWorkflow, Clock, X, Check, SearchIcon, Crown, Palette,
  GripVertical
} from 'lucide-react';
import { cn, formatDate, getProgressColor } from '../../utils/helpers';
import { useAppStore } from '../../context/appStore';
import { useAuthStore } from '../../context/authStore';
import { PROJECT_COLORS } from '../../app/constants';
import { ColorPicker } from '../../components/ColorPicker';
import { UserAvatar, AvatarGroup } from '../../components/UserAvatar';
import { ProgressBar, EmptyState, Dropdown, DatePicker } from '../../components/ui';
import { Modal } from '../../components/Modal';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Project, ProjectStatus, Role } from '../../app/types';
import { projectsService } from '../../services/api';
import { emitErrorToast, emitSuccessToast } from '../../context/toastBus';


const STATUS_FILTERS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const PROJECT_STATUS_BADGES: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'badge-green' },
  on_hold: { label: 'On Hold', className: 'badge-amber' },
  completed: { label: 'Completed', className: 'badge-blue' },
  archived: { label: 'Archived', className: 'badge-gray' },
};

const DEPARTMENTS = ['General', 'Development', 'Design', 'Marketing', 'Product'];
const INITIAL_SDLC = [
  { name: 'Requirement', durationDays: 0, enabled: true },
  { name: 'Analysis', durationDays: 0, enabled: true },
  { name: 'Design', durationDays: 0, enabled: true },
  { name: 'Development', durationDays: 0, enabled: true },
  { name: 'Testing', durationDays: 0, enabled: true },
  { name: 'Deployment', durationDays: 0, enabled: true },
  { name: 'Maintenance', durationDays: 0, enabled: false }
];


interface ProjectFormData {
  name: string;
  description: string;
  color: string;
  startDate: string;
  endDate: string;
  department: string;
  budget: number;
  budgetCurrency: string;
  sdlcPlan: { name: string; durationDays: number; enabled: boolean }[];
}

const ProjectCard = React.forwardRef<HTMLDivElement, {
  project: Project;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onEdit: (project: Project) => void;
}>(({ project, onDelete, onArchive, onEdit }, ref) => {
  const navigate = useNavigate();
  const { users, workspaces } = useAppStore();
  const members = users.filter(u => project.members.includes(u.id));
  const { user } = useAuthStore();
  const workspacePermissions = workspaces[0]?.settings?.permissions || {};
  const canEditOtherProjects = Boolean((workspacePermissions as any)?.editOtherProjects?.[user?.role || 'team_member']);
  const isClient = user?.userType === 'client';
  const canManageProjects = !isClient && (user?.role !== 'team_member' || canEditOtherProjects);
  const badge = PROJECT_STATUS_BADGES[project.status];
  const isArchived = project.status === 'archived';

  return (
    <motion.div
      ref={ref} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} whileHover={{ y: -2 }}
      className={cn("card p-5 cursor-pointer hover:shadow-card-hover transition-all relative overflow-hidden", isArchived && "opacity-75 grayscale-[0.3]")}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-bold text-base flex-shrink-0" style={{ backgroundColor: project.color }}>
            {project.name[0]}
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-surface-900 dark:text-white truncate">{project.name}</h3>
            <span className={cn('badge text-[10px] mt-0.5', badge.className)}>{badge.label}</span>
          </div>
        </div>
        {canManageProjects && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button onClick={e => e.stopPropagation()} className="btn w-7 h-7 rounded-lg opacity group-hover:opacity-100"><MoreVertical size={14} /></button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content onClick={e => e.stopPropagation()} className="z-50 min-w-[160px] bg-white dark:bg-surface-900 rounded-xl shadow-modal border border-surface-100 dark:border-surface-800 p-1" sideOffset={4} align="end">
                <DropdownMenu.Item onClick={() => onEdit(project)} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer text-surface-700 dark:text-surface-300 outline-none"><Edit3 size={14} /> Edit</DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => onArchive(project.id)} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer text-surface-700 dark:text-surface-300 outline-none"><Archive size={14} /> Archive</DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-surface-100 dark:bg-surface-800 my-1" />
                <DropdownMenu.Item onClick={() => onDelete(project.id)} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer text-rose-600 outline-none"><Trash2 size={14} /> Delete</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
      {project.description && <p className="text-xs text-surface-400 mb-3 line-clamp-2 leading-relaxed">{project.description}</p>}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] text-surface-500 mb-2">
          <span className="font-semibold uppercase tracking-wider opacity-60">Progress</span>
          <span className="font-bold text-surface-700 dark:text-surface-300">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={getProgressColor(project.progress)} size="md" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-surface-50 dark:border-surface-800/50 mt-1">
        <AvatarGroup users={members} max={3} size="xs" />
        {project.endDate && <span className="flex items-center gap-1 text-[10px] font-bold text-surface-400 uppercase tracking-tight"><Calendar size={10} /> {formatDate(project.endDate, 'MMM d')}</span>}
      </div>
    </motion.div>
  );
});

const ProjectRow: React.FC<{ project: Project; onDelete: (id: string) => void; onArchive: (id: string) => void; onEdit: (project: Project) => void }> = ({ project, onDelete, onArchive, onEdit }) => {
  const navigate = useNavigate();
  const { users, workspaces } = useAppStore();
  const members = users.filter(u => project.members.includes(u.id));
  const badge = PROJECT_STATUS_BADGES[project.status];
  const { user } = useAuthStore();
  const workspacePermissions = workspaces[0]?.settings?.permissions || {};
  const canEditOtherProjects = Boolean((workspacePermissions as any)?.editOtherProjects?.[user?.role || 'team_member']);
  const isClient = user?.userType === 'client';
  const canManageProjects = !isClient && (user?.role !== 'team_member' || canEditOtherProjects);
  const isArchived = project.status === 'archived';

  return (
    <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={cn("flex items-center gap-4 px-5 py-3.5 border-b border-surface-50 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer transition-colors group", isArchived && "opacity-60 grayscale-[0.2]")} onClick={() => navigate(`/projects/${project.id}`)}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: project.color }}>{project.name[0]}</div>
      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{project.name}</p></div>
      <div className="hidden sm:flex items-center w-24"><span className={cn('badge text-[10px] font-bold uppercase tracking-wider', badge.className)}>{badge.label}</span></div>
      <div className="hidden md:flex items-center gap-3 w-40"><ProgressBar value={project.progress} color={getProgressColor(project.progress)} size="sm" className="flex-1" /><span className="text-[10px] font-bold text-surface-500 w-8 text-right">{project.progress}%</span></div>
      <div className="hidden sm:flex items-center justify-center w-24"><AvatarGroup users={members} max={3} size="xs" /></div>
      <div className="hidden lg:flex items-center w-28">{project.endDate && <span className="text-[11px] font-medium text-surface-400 whitespace-nowrap">{formatDate(project.endDate)}</span>}</div>
      {canManageProjects && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button title="Archive" onClick={e => { e.stopPropagation(); onArchive(project.id); }} className="btn-ghost w-8 h-8 rounded-lg text-surface-300 hover:text-amber-500 flex items-center justify-center"><Archive size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onEdit(project); }} className="btn-ghost w-8 h-8 rounded-lg text-surface-300 hover:text-brand-600 flex items-center justify-center"><Edit3 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(project.id); }} className="btn-ghost w-8 h-8 rounded-lg text-surface-300 hover:text-rose-500 dark:hover:bg-rose-950/30 flex items-center justify-center transition-all"><Trash2 size={13} /></button>
        </div>
      )}
    </motion.div>
  );
};


export const ProjectsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { projects, updateProject, deleteProject, addProject, bootstrap, users } = useAppStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>(() => {
    const incoming = searchParams.get('status');
    return ['active', 'on_hold', 'completed', 'archived'].includes(incoming as any) ? incoming as any : 'all';
  });

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  // Team & Reporting Selection
  const [customDepartments, setCustomDepartments] = useState<string[]>([]);
  const allDepartments = useMemo(() => [...DEPARTMENTS, ...customDepartments], [customDepartments]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedReporters, setSelectedReporters] = useState<string[]>([]);
  const [showLeaderDrop, setShowLeaderDrop] = useState(false);
  const [showMemberDrop, setShowMemberDrop] = useState(false);
  const [showReporterDrop, setShowReporterDrop] = useState(false);
  const [leaderQuery, setLeaderQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [reporterQuery, setReporterQuery] = useState('');

  const leaderRef = useRef<HTMLDivElement>(null);
  const memberRef = useRef<HTMLDivElement>(null);
  const reporterRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, watch, setValue, control } = useForm<ProjectFormData>({
    defaultValues: {
      budgetCurrency: 'INR',
      department: 'General',
      startDate: new Date().toISOString().split('T')[0],
      sdlcPlan: INITIAL_SDLC
    }
  });

  const { fields: sdlcFields } = useFieldArray({ control, name: 'sdlcPlan' });

  const watchSdlc = watch('sdlcPlan');
  const watchStart = watch('startDate');

  const totalDays = useMemo(() => {
    return watchSdlc?.reduce((acc, s) => s.enabled ? acc + (Number(s.durationDays) || 0) : acc, 0) || 0;
  }, [watchSdlc]);

  useEffect(() => {
    if (watchStart) {
      if (totalDays > 0) {
        const start = new Date(watchStart);
        const end = new Date(start);
        end.setDate(start.getDate() + totalDays);
        setValue('endDate', end.toISOString().split('T')[0]);
      } else {
        // If no phase days, default end date to start date so they stay in sync
        setValue('endDate', watchStart);
      }
    }
  }, [watchStart, totalDays, setValue]);

  useEffect(() => {
    const clickOut = (e: MouseEvent) => {
      if (leaderRef.current && !leaderRef.current.contains(e.target as Node)) setShowLeaderDrop(false);
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) setShowMemberDrop(false);
      if (reporterRef.current && !reporterRef.current.contains(e.target as Node)) setShowReporterDrop(false);
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  const filteredUsers = (q: string) => users.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10);

  const canCreateProjects = user?.userType !== 'client' && user?.role !== 'team_member';
  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const isVisibleToClient = user?.userType === 'client' 
      ? (p.clientId === user?.clientId || p.visibleToClient)
      : true;
    return matchesSearch && matchesStatus && isVisibleToClient;
  });

  const openModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setValue('name', project.name);
      setValue('description', project.description || '');
      setValue('department', project.department || 'General');
      setValue('startDate', project.startDate || '');
      setValue('endDate', project.endDate || '');
      setValue('budget', project.budget || 0);
      setValue('budgetCurrency', project.budgetCurrency || 'INR');
      setSelectedColor(project.color);
      setSelectedLeaderId(project.leadId || '');
      setSelectedMembers(project.members);
      setSelectedReporters(project.reportingPersonIds);
      const mappedSdlc = INITIAL_SDLC.map(base => {
        const existing = project.sdlcPlan?.find((p: any) => p.name === base.name);
        return existing ? { name: existing.name, durationDays: existing.durationDays, enabled: true } : { ...base, enabled: false };
      });
      setValue('sdlcPlan', mappedSdlc);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setEditingProject(null);
      reset({
        startDate: today,
        endDate: today,
        department: 'General',
        budgetCurrency: 'INR',
        sdlcPlan: INITIAL_SDLC
      });
      // Find the first color not used by any active project
      const usedColors = projects.map(p => p.color.toLowerCase());
      const availableColor = PROJECT_COLORS.find(c => !usedColors.includes(c.toLowerCase())) || PROJECT_COLORS[0];
      
      setSelectedColor(availableColor);
      
      // Default selections: Only Reporting Heads should have the Admin by default
      const admin = users.find(u => u.role === 'admin' || u.role === 'super_admin');
      
      setSelectedLeaderId(''); // Project Lead empty by default
      setSelectedMembers([]);  // Project Members empty by default
      setSelectedReporters(admin ? [admin.id] : []); // Admin in Reporting Heads only
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setSelectedLeaderId('');
    setSelectedMembers([]);
    setSelectedReporters([]);
    reset();
  };

  const onSaveProject = async (data: ProjectFormData) => {
    setIsSavingProject(true);
    try {
      const payload = {
        ...data,
        color: selectedColor,
        leadId: selectedLeaderId,
        members: Array.from(new Set([...selectedMembers, selectedLeaderId])),
        reportingPersonIds: selectedReporters,
        budget: Number(data.budget) || 0,
        sdlcPlan: data.sdlcPlan.filter(s => s.enabled).map(s => ({
          name: s.name,
          durationDays: Number(s.durationDays) || 0
        }))
      };

      if (editingProject) {
        const res = await projectsService.update(editingProject.id, payload);
        updateProject(editingProject.id, res.data?.data ?? res.data);
        emitSuccessToast('Project updated successfully.');
      } else {
        const res = await projectsService.create(payload);
        addProject(res.data?.data ?? res.data);
        emitSuccessToast('Project created successfully.');
      }
      closeModal();
      await bootstrap();
    } catch (error: any) {
      emitErrorToast(error.response?.data?.message || 'Failed to save project');
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleArchiveProject = async (id: string) => {
    try {
      const res = await projectsService.update(id, { status: 'archived' });
      updateProject(id, res.data.data ?? res.data);
      await bootstrap(); emitSuccessToast('Project archived successfully.');
    } catch (e) { emitErrorToast('Failed to archive project'); }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await projectsService.delete(id); deleteProject(id);
      await bootstrap(); emitSuccessToast('Project deleted successfully.');
    } catch (e) { emitErrorToast('Failed to delete project'); }
  };

  return (
    <div className="max-w-full mx-auto font-sans">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="input pl-9" />
        </div>
        <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl p-1 gap-1">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-all', statusFilter === f.value ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300')}>{f.label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-nowrap">
          {canCreateProjects && <button onClick={() => openModal()} className="btn-primary btn-sm px-4"><Plus size={14} /> New Project</button>}
          <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl p-1">
            <button onClick={() => setView('grid')} className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all', view === 'grid' ? 'bg-white dark:bg-surface-900 shadow-sm text-surface-900 dark:text-white' : 'text-surface-400')}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('list')} className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all', view === 'list' ? 'bg-white dark:bg-surface-900 shadow-sm text-surface-900 dark:text-white' : 'text-surface-400')}><List size={14} /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FolderKanban size={28} />} title="No projects found" description={search ? `No matching projects` : 'Start by creating your first project'} />
      ) : (
        <div className="space-y-8 pb-10">
          {Object.entries(filtered.reduce((acc, p) => { const dept = p.department || 'General'; if (!acc[dept]) acc[dept] = []; acc[dept].push(p); return acc; }, {} as Record<string, Project[]>)).map(([dept, deptProjects]) => (
            <div key={dept} className="space-y-4">
              <div onClick={() => setCollapsedDepts(prev => ({ ...prev, [dept]: !prev[dept] }))} className="flex items-center gap-2 group cursor-pointer">
                <div className="h-px flex-1 bg-surface-100 dark:bg-surface-800" />
                <div className="flex items-center gap-2 px-3 py-1 bg-surface-50 dark:bg-surface-800 rounded-lg group-hover:bg-surface-100 dark:group-hover:bg-surface-700 transition-colors">
                  <span className="text-xs font-bold text-surface-400 uppercase tracking-widest leading-none">{dept} ({deptProjects.length})</span>
                  <ChevronDown size={12} className={cn('text-surface-400 transition-transform', collapsedDepts[dept] ? 'rotate-270' : 'rotate-180')} />
                </div>
                <div className="h-px flex-1 bg-surface-100 dark:bg-surface-800" />
              </div>
              <AnimatePresence>
                {!collapsedDepts[dept] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    {view === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {deptProjects.map(p => <ProjectCard key={p.id} project={p} onDelete={handleDeleteProject} onArchive={handleArchiveProject} onEdit={openModal} />)}
                      </div>
                    ) : (
                      <div className="card overflow-hidden">
                        <div className="flex items-center gap-4 px-5 py-2.5 bg-surface-50 dark:bg-surface-900 border-b border-surface-100 dark:border-surface-800">
                          <div className="w-8" /><p className="flex-1 text-[10px] font-bold text-surface-400 uppercase tracking-widest leading-none">Project</p>
                          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest hidden sm:block w-24">Status</p>
                          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest hidden md:block w-40">Progress</p>
                          <div className="w-8" />
                        </div>
                        {deptProjects.map(p => <ProjectRow key={p.id} project={p} onDelete={handleDeleteProject} onArchive={handleArchiveProject} onEdit={openModal} />)}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Main Modal */}
      <Modal open={showModal} onClose={closeModal} title={editingProject ? "Edit Project" : "New Project"} size="xl">
        <form onSubmit={handleSubmit(onSaveProject)} className="p-0 sm:p-0 flex flex-col font-sans h-full">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
            {/* Basic Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
              <div className="md:col-span-8 space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1.5 block ml-1">
                    Project Name *
                  </label>
                  <input 
                    {...register('name', { required: true })} 
                    className="w-full bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-300" 
                    placeholder="e.g. Website Redesign" 
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1.5 block ml-1">Description</label>
                  <textarea 
                    {...register('description')} 
                    className="w-full bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-2.5 text-sm h-24 resize-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-300 leading-relaxed" 
                    placeholder="What is this project about?" 
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1.5 block ml-1">Department</label>
                  <Dropdown
                    value={watch('department')}
                    onChange={(v) => {
                      if (v === 'ADD_NEW') {
                        const name = prompt('Enter new department name:');
                        if (name && name.trim()) {
                          const newName = name.trim();
                          if (!allDepartments.includes(newName)) {
                            setCustomDepartments(prev => [...prev, newName]);
                          }
                          setValue('department', newName);
                        }
                      } else {
                        setValue('department', v);
                      }
                    }}
                    items={[
                      ...allDepartments.map(d => ({ id: d, label: d })),
                      { id: 'ADD_NEW', label: '+ Add New Department', className: 'text-brand-600 font-bold border-t border-surface-50 dark:border-surface-800 mt-1 pt-2' }
                    ]}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1.5 block ml-1">Brand Color</label>
                  <div className="flex items-center gap-3 p-2.5 bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl">
                    <div className="relative group">
                      <div 
                        className="w-9 h-9 rounded-lg shadow-sm border border-black/5 flex-shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95" 
                        style={{ backgroundColor: selectedColor }}
                        onClick={() => {
                          const usedColors = projects.filter(p => !editingProject || p.id !== editingProject.id).map(p => p.color.toLowerCase());
                          const availablePresets = PROJECT_COLORS.filter(c => !usedColors.includes(c.toLowerCase()));
                          
                          if (availablePresets.length > 0) {
                            const currentIdx = availablePresets.indexOf(selectedColor);
                            const nextIdx = (currentIdx + 1) % availablePresets.length;
                            setSelectedColor(availablePresets[nextIdx]);
                          }
                        }}
                        title="Click to cycle unused colors"
                      />
                      <input 
                        type="color" 
                        value={selectedColor} 
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        style={{ pointerEvents: 'none' }} // Trigger via hex input or other way if needed, or just let users click square?
                        // Actually, I'll let users click the HEX code for picker or just put a tiny icon.
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={selectedColor.toUpperCase()} 
                          onChange={(e) => setSelectedColor(e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-xs font-mono font-bold tracking-widest text-surface-700 dark:text-surface-300 outline-none"
                        />
                        <div className="relative">
                          <input 
                            type="color" 
                            value={selectedColor} 
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="w-4 h-4 opacity-0 absolute inset-0 cursor-pointer"
                          />
                          <div className="text-surface-400 hover:text-brand-500 transition-colors cursor-pointer">
                            <Palette size={13} />
                          </div>
                        </div>
                      </div>
                      <p className="text-[8px] text-surface-400 uppercase font-bold tracking-tight mt-0.5">Cycle unused / Add custom</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline & Budget Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-surface-50 dark:border-surface-800/50">
              <div className="col-span-1">
                <DatePicker
                  label="Start Date"
                  value={watch('startDate')}
                  onChange={(v) => setValue('startDate', v)}
                  minDate={new Date().toISOString().split('T')[0]}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="col-span-1">
                <DatePicker
                  label="Due Date"
                  value={watch('endDate')}
                  onChange={(v) => setValue('endDate', v)}
                  minDate={watch('startDate')}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="col-span-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1.5 block ml-1">Budget</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-brand-500 transition-colors">
                    <IndianRupee size={13} />
                  </div>
                  <input 
                    type="number" 
                    {...register('budget')} 
                    className="w-full bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl pl-9 pr-4 py-2.5 h-10 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-300" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              <div className="col-span-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1.5 block ml-1">Currency</label>
                <Dropdown
                  value={watch('budgetCurrency')}
                  onChange={(v) => setValue('budgetCurrency', v)}
                  items={['INR', 'USD', 'EUR', 'GBP'].map(c => ({ id: c, label: c }))}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Stakeholders & Access Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-surface-50 dark:border-surface-800/50">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1.5 block ml-1">Project Lead *</label>
                <div ref={leaderRef} className="relative">
                  <div onClick={() => setShowLeaderDrop(true)} className="h-10 bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 flex items-center justify-between cursor-pointer hover:border-brand-500/50 transition-all group shadow-sm">
                    {selectedLeaderId ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar name={users.find(u => u.id === selectedLeaderId)?.name || ''} avatar={users.find(u => u.id === selectedLeaderId)?.avatar} size="xs" />
                        <span className="text-[11px] font-bold text-surface-700 dark:text-surface-200 truncate">{users.find(u => u.id === selectedLeaderId)?.name}</span>
                      </div>
                    ) : (
                      <span className="text-surface-300 text-[11px]">Select lead...</span>
                    )}
                    <ChevronDown size={13} className="text-surface-300 group-hover:text-surface-400 transition-colors" />
                  </div>
                  <AnimatePresence>
                    {showLeaderDrop && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[70] left-0 right-0 mt-1 bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 rounded-xl shadow-xl overflow-hidden ring-1 ring-black/5">
                        <div className="p-2 border-b border-surface-50 dark:border-surface-800 bg-surface-50/30 dark:bg-surface-900/30">
                          <div className="relative">
                            <SearchIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
                            <input autoFocus value={leaderQuery} onChange={e => setLeaderQuery(e.target.value)} placeholder="Search..." className="w-full bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-lg pl-8 pr-3 py-1.5 text-[10px] outline-none" />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
                          {filteredUsers(leaderQuery).map(u => (
                            <div key={u.id} onClick={() => { setSelectedLeaderId(u.id); setShowLeaderDrop(false); }} className={cn("px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors mx-1 rounded-lg", selectedLeaderId === u.id && "bg-brand-50 dark:bg-brand-950/30")}>
                              <UserAvatar name={u.name} avatar={u.avatar} size="xs" />
                              <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-surface-900 dark:text-surface-100 truncate">{u.name}</p><p className="text-[9px] text-surface-400 truncate tracking-tight">{u.email}</p></div>
                              {selectedLeaderId === u.id && <Check size={12} className="text-brand-500" />}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1.5 block ml-1">Project Members</label>
                <div ref={memberRef} className="relative">
                  <div onClick={() => setShowMemberDrop(true)} className="min-h-[40px] bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl p-1.5 flex flex-wrap gap-1.5 cursor-pointer hover:border-brand-500/50 transition-all shadow-sm">
                    {selectedMembers.map(id => {
                      const u = users.find(x => x.id === id);
                      return (
                        <div key={id} className="flex items-center gap-1 bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-lg pl-1 pr-1 py-0.5 shadow-sm ring-1 ring-black/[0.01]">
                          <UserAvatar name={u?.name || ''} avatar={u?.avatar} size="xs" />
                          <span className="text-[9px] font-bold text-surface-700 dark:text-surface-200">{u?.name.split(' ')[0]}</span>
                          <X size={10} className="text-surface-300 hover:text-rose-500 transition-colors ml-0.5" onClick={(e) => { e.stopPropagation(); setSelectedMembers(prev => prev.filter(x => x !== id)); }} />
                        </div>
                      );
                    })}
                    {selectedMembers.length === 0 && <span className="text-surface-300 text-[10px] px-2 py-1.5">Add members...</span>}
                    <div className="ml-auto pr-1 flex items-center self-center"><Plus size={12} className="text-surface-300" /></div>
                  </div>
                  <AnimatePresence>
                    {showMemberDrop && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[60] left-0 right-0 mt-1 bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 rounded-xl shadow-xl overflow-hidden ring-1 ring-black/5">
                        <div className="p-2 border-b border-surface-50 dark:border-surface-800 bg-surface-50/30 dark:bg-surface-900/30">
                          <div className="relative">
                            <SearchIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
                            <input autoFocus value={memberQuery} onChange={e => setMemberQuery(e.target.value)} placeholder="Search..." className="w-full bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-lg pl-8 pr-3 py-1.5 text-[10px] outline-none" />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
                          {filteredUsers(memberQuery).map(u => (
                            <div key={u.id} onClick={() => setSelectedMembers(p => p.includes(u.id) ? p.filter(x => x !== u.id) : [...p, u.id])} className={cn("px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors mx-1 rounded-lg", selectedMembers.includes(u.id) && "bg-brand-50 dark:bg-brand-950/30")}>
                              <UserAvatar name={u.name} avatar={u.avatar} size="xs" />
                              <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-surface-900 dark:text-surface-100 truncate">{u.name}</p><p className="text-[9px] text-surface-400 truncate tracking-tight">{u.email}</p></div>
                              {selectedMembers.includes(u.id) && <Check size={12} className="text-brand-500" />}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1.5 block ml-1">Reporting Heads</label>
                <div ref={reporterRef} className="relative">
                  <div onClick={() => setShowReporterDrop(true)} className="min-h-[40px] bg-surface-50/50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl p-1.5 flex flex-wrap gap-1.5 cursor-pointer hover:border-brand-500/50 transition-all shadow-sm">
                    {selectedReporters.map(id => {
                      const u = users.find(x => x.id === id);
                      return (
                        <div key={id} className="flex items-center gap-1 bg-brand-50/50 dark:bg-brand-950/10 border border-brand-200/50 dark:border-brand-800/50 rounded-lg pl-1 pr-1 py-0.5 shadow-sm">
                          <UserAvatar name={u?.name || ''} avatar={u?.avatar} size="xs" />
                          <span className="text-[9px] font-bold text-brand-700 dark:text-brand-300">{u?.name.split(' ')[0]}</span>
                          <X size={10} className="text-brand-400 hover:text-rose-500 transition-colors ml-0.5" onClick={(e) => { e.stopPropagation(); setSelectedReporters(prev => prev.filter(x => x !== id)); }} />
                        </div>
                      );
                    })}
                    {selectedReporters.length === 0 && <span className="text-surface-300 text-[10px] px-2 py-1.5">Assign Reviewers</span>}
                    <div className="ml-auto pr-1 flex items-center self-center"><Plus size={12} className="text-surface-300" /></div>
                  </div>
                  <AnimatePresence>
                    {showReporterDrop && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[60] left-0 right-0 mt-1 bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 rounded-xl shadow-xl overflow-hidden ring-1 ring-black/5">
                        <div className="p-2 border-b border-surface-50 dark:border-surface-800 bg-surface-50/30 dark:bg-surface-900/30">
                          <div className="relative">
                            <SearchIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
                            <input autoFocus value={reporterQuery} onChange={e => setReporterQuery(e.target.value)} placeholder="Search..." className="w-full bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 rounded-lg pl-8 pr-3 py-1.5 text-[10px] outline-none" />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
                          {filteredUsers(reporterQuery).filter(u => !selectedMembers.includes(u.id)).map(u => (
                            <div key={u.id} onClick={() => setSelectedReporters(p => p.includes(u.id) ? p.filter(x => x !== u.id) : [...p, u.id])} className={cn("px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors mx-1 rounded-lg", selectedReporters.includes(u.id) && "bg-brand-50 dark:bg-brand-950/30")}>
                              <UserAvatar name={u.name} avatar={u.avatar} size="xs" />
                              <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-surface-900 dark:text-surface-100 truncate">{u.name}</p><p className="text-[9px] text-surface-400 truncate tracking-tight">{u.email}</p></div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Workflow Section */}
            <div className="space-y-4 pt-2 border-t border-surface-50 dark:border-surface-800/50">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 mb-1 ml-1">SDLC Workflow Setup</label>
                <div className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">{totalDays} Total Days</div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {sdlcFields.map((field, index) => {
                  const isEnabled = watch(`sdlcPlan.${index}.enabled`);
                  return (
                    <div key={field.id} className={cn(
                      "p-2.5 rounded-xl border transition-all flex flex-col gap-2 group relative overflow-hidden", 
                      isEnabled 
                        ? "bg-white dark:bg-surface-800 border-brand-500/20 shadow-sm" 
                        : "bg-surface-50/40 dark:bg-surface-900/40 border-surface-100 dark:border-surface-800 opacity-60"
                    )}>
                      <label className="flex items-center gap-2 cursor-pointer z-10">
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all",
                          isEnabled ? "bg-brand-500 border-brand-500 text-white" : "bg-white dark:bg-surface-800 border-surface-300"
                        )}>
                          {isEnabled && <Check size={10} strokeWidth={4} />}
                        </div>
                        <input type="checkbox" {...register(`sdlcPlan.${index}.enabled`)} className="hidden" />
                        <span className="text-[9px] font-black text-surface-700 dark:text-surface-200 uppercase tracking-tight truncate leading-none">{field.name}</span>
                      </label>
                      
                      {isEnabled && (
                        <div className="relative z-10">
                          <input 
                            type="number" 
                            {...register(`sdlcPlan.${index}.durationDays`)} 
                            className="w-full bg-surface-50 dark:bg-surface-900 border border-brand-100 dark:border-brand-900/50 rounded-lg px-2 h-7 text-[10px] font-bold text-brand-600 dark:text-brand-400 outline-none" 
                            placeholder="0" 
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface-50/50 dark:bg-surface-900/50 border-t border-surface-100 dark:border-surface-800 flex-shrink-0">
            <button type="button" onClick={closeModal} className="px-5 h-10 text-xs font-bold uppercase tracking-widest text-surface-500 hover:text-surface-700 dark:text-surface-400 transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSavingProject} 
              className="px-6 h-10 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-brand-500/10 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSavingProject ? 'Processing...' : (editingProject ? 'Save Changes' : 'Create Project')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
