import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  Crown,
  Edit3,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { cn, formatDate } from '../../utils/helpers';
import { useAppStore } from '../../context/appStore';
import { PROJECT_COLORS, STATUS_CONFIG } from '../../app/constants';
import { ColorPicker } from '../../components/ColorPicker';
import { UserAvatar, AvatarGroup } from '../../components/UserAvatar';
import { Modal } from '../../components/Modal';
import { ProgressBar, EmptyState } from '../../components/ui';
import { WorkloadMatrix } from '../../components/WorkloadMatrix';
import type { Project, Task, Team, User } from '../../app/types';
import { teamsService, performanceService } from '../../services/api';
import { emitSuccessToast } from '../../context/toastBus';

type TeamFormModalProps = {
  open: boolean;
  onClose: () => void;
  team?: Team | null;
  onSaved: (team: Team) => void;
};

type TeamMetrics = {
  members: User[];
  leaders: User[];
  teamProjects: Project[];
  teamTasks: Task[];
  doneTasks: number;
  activeTasks: number;
  progress: number;
  completionRate: number;
};

function getLinkedProjects(team: Team, projects: Project[]) {
  return projects.filter((project) => project.teamId === team.id || team.projectIds.includes(project.id));
}

function getTeamMetrics(team: Team, users: User[], projects: Project[], tasks: Task[]): TeamMetrics {
  const members = users.filter((user) => 
    team.members.includes(user.id) && 
    user.role !== 'admin' && 
    user.role !== 'super_admin'
  );
  const leaderIds = team.leaderIds?.length ? team.leaderIds : [team.leaderId];
  const leaders = users.filter((user) => leaderIds.includes(user.id));
  const teamProjects = getLinkedProjects(team, projects);
  const teamTasks = tasks.filter((task) => teamProjects.some((project) => project.id === task.projectId));
  const doneTasks = teamTasks.filter((task) => task.status === 'done').length;
  const activeTasks = teamTasks.filter((task) => task.status !== 'done').length;
  const progress = teamTasks.length ? Math.round((doneTasks / teamTasks.length) * 100) : 0;

  return {
    members,
    leaders,
    teamProjects,
    teamTasks,
    doneTasks,
    activeTasks,
    progress,
    completionRate: progress,
  };
}

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; tone?: string; onClick?: () => void }> = ({
  icon,
  label,
  value,
  tone = 'bg-surface-50 dark:bg-surface-900/60',
  onClick,
}) => (
  <div
    onClick={onClick}
    className={cn(
      'rounded-xl border border-surface-100 p-2.5 dark:border-surface-800 transition-all duration-200',
      tone,
      onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
    )}
  >
    <div className="flex items-center gap-1.5 text-surface-400 dark:text-surface-500">
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <p className="mt-1 text-lg font-display font-bold text-surface-900 dark:text-white leading-none">{value}</p>
  </div>
);

const TeamCard: React.FC<{
  team: Team;
  onOpen: (teamId: string) => void;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}> = ({ team, onOpen, onEdit, onDelete }) => {
  const { projects, tasks, users } = useAppStore();
  const { members, leaders, teamProjects, activeTasks, progress } = getTeamMetrics(team, users, projects, tasks);

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
      <button type="button" onClick={() => onOpen(team.id)} className="w-full p-5 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-display font-bold text-base flex-shrink-0"
              style={{ backgroundColor: team.color }}
            >
              {team.name[0]}
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-surface-900 dark:text-white truncate">{team.name}</h3>
              <p className="mt-1 text-xs text-surface-400 line-clamp-2">{team.description || 'No description yet.'}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-surface-400">{formatDate(team.createdAt, 'MMM d')}</span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-50 px-3 py-2.5 dark:bg-surface-800/60">
          <ShieldCheck size={13} className="text-amber-500 flex-shrink-0" />
          <span className="text-xs text-surface-600 dark:text-surface-300 truncate">
            {leaders.length ? leaders.map((leader) => leader.name).join(', ') : 'No leader assigned'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-surface-50 px-3 py-3 text-center dark:bg-surface-800/60">
            <p className="text-lg font-semibold text-surface-900 dark:text-white">{members.length}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-surface-400">Members</p>
          </div>
          <div className="rounded-2xl bg-surface-50 px-3 py-3 text-center dark:bg-surface-800/60">
            <p className="text-lg font-semibold text-surface-900 dark:text-white">{teamProjects.length}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-surface-400">Projects</p>
          </div>
          <div className="rounded-2xl bg-surface-50 px-3 py-3 text-center dark:bg-surface-800/60">
            <p className="text-lg font-semibold text-surface-900 dark:text-white">{activeTasks}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-surface-400">Open Tasks</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-surface-500">
            <span>Delivery health</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} color={team.color} size="md" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <AvatarGroup users={members} max={4} size="xs" />
          <span className="text-xs text-surface-400">Open workspace</span>
        </div>
      </button>

      <div className="border-t border-surface-100 px-5 py-3 dark:border-surface-800">
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => onEdit(team)} className="btn-ghost btn-sm"><Edit3 size={14} />Edit</button>
          <button type="button" onClick={() => onDelete(team)} className="btn-ghost btn-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={14} />Delete</button>
        </div>
      </div>
    </motion.div>
  );
};

const TeamFormModal: React.FC<TeamFormModalProps> = ({ open, onClose, team, onSaved }) => {
  const { users, projects, teams, addTeam, updateTeam } = useAppStore();
  const isEditing = Boolean(team);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const usedTeamColors = teams.filter((existingTeam) => existingTeam.id !== team?.id).map((existingTeam) => existingTeam.color.toLowerCase());
  const firstAvailableColor = PROJECT_COLORS.find((candidate) => !usedTeamColors.includes(candidate.toLowerCase())) || PROJECT_COLORS[0];

  useEffect(() => {
    if (!open) return;
    const linkedProjectIds = team ? getLinkedProjects(team, projects).map((project) => project.id) : [];
    setName(team?.name || '');
    setDescription(team?.description || '');
    setColor(team?.color || firstAvailableColor);
    setSelectedLeaderIds(team?.leaderIds?.length ? team.leaderIds : team?.leaderId ? [team.leaderId] : []);
    setSelectedMembers(team?.members || []);
    setSelectedProjects(linkedProjectIds);
    setLeaderSearch('');
    setMemberSearch('');
    setProjectSearch('');
  }, [firstAvailableColor, open, projects, team]);

  const availableLeaderUsers = useMemo(() => {
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.jobTitle || ''}`.toLowerCase().includes(leaderSearch.toLowerCase())
    ).sort((a, b) => {
      const aSel = selectedLeaderIds.includes(a.id);
      const bSel = selectedLeaderIds.includes(b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });
  }, [users, leaderSearch, selectedLeaderIds]);

  const availableMemberUsers = useMemo(() => {
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.jobTitle || ''}`.toLowerCase().includes(memberSearch.toLowerCase())
    ).sort((a, b) => {
      const aSel = selectedMembers.includes(a.id);
      const bSel = selectedMembers.includes(b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });
  }, [users, memberSearch, selectedMembers]);

  const filteredProjects = projects.filter((project) =>
    `${project.name} ${project.description || ''} ${project.department || ''}`.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const toggleLeader = (leaderId: string, checked: boolean) => {
    setSelectedLeaderIds((prev) => checked ? Array.from(new Set([...prev, leaderId])) : prev.filter((id) => id !== leaderId));
    // Also ensure they are in members if they are a leader
    if (checked) setSelectedMembers((prev) => Array.from(new Set([...prev, leaderId])));
  };

  const toggleMember = (memberId: string, checked: boolean) => {
    setSelectedMembers((prev) => checked ? Array.from(new Set([...prev, memberId])) : prev.filter((id) => id !== memberId));
    // If removed from members, also remove from leaders
    if (!checked) setSelectedLeaderIds((prev) => prev.filter((id) => id !== memberId));
  };

  const toggleProject = (projectId: string, checked: boolean) => {
    setSelectedProjects((prev) => checked ? Array.from(new Set([...prev, projectId])) : prev.filter((id) => id !== projectId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedLeaderIds.length) return;
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        color,
        leaderId: selectedLeaderIds[0],
        leaderIds: selectedLeaderIds,
        members: Array.from(new Set([...selectedMembers, ...selectedLeaderIds])),
        projectIds: selectedProjects,
      };
      const response = isEditing && team ? await teamsService.update(team.id, payload) : await teamsService.create(payload);
      const savedTeam = response.data.data ?? response.data;
      if (isEditing && team) {
        updateTeam(team.id, savedTeam);
        emitSuccessToast('Team updated successfully.');
      } else {
        addTeam(savedTeam);
        emitSuccessToast('Team created successfully.');
      }
      onSaved(savedTeam);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Team' : 'Create Team'} size="xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <label className="label">Team name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Delivery Excellence" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input h-auto min-h-[110px] resize-none py-3" rows={4} />
            </div>
            <div>
              <label className="label">Leaders *</label>
              <input value={leaderSearch} onChange={(e) => setLeaderSearch(e.target.value)} className="input h-9 mb-2" placeholder="Search leaders..." />
              <div className="max-h-40 overflow-y-auto rounded-2xl border border-surface-100 p-2 space-y-1.5 dark:border-surface-800">
                {availableLeaderUsers.map((leader) => (
                  <label key={leader.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800">
                    <input type="checkbox" checked={selectedLeaderIds.includes(leader.id)} onChange={(e) => toggleLeader(leader.id, e.target.checked)} />
                    <UserAvatar name={leader.name} color={leader.color} size="sm" isOnline={leader.isActive} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{leader.name}</p>
                      <p className="truncate text-xs text-surface-400">{leader.jobTitle || leader.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Members</label>
              <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="input h-9 mb-2" placeholder="Search members..." />
              <div className="max-h-44 overflow-y-auto rounded-2xl border border-surface-100 p-2 space-y-1.5 dark:border-surface-800">
                {availableMemberUsers.map((member) => (
                  <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800">
                    <input type="checkbox" checked={selectedMembers.includes(member.id)} onChange={(e) => toggleMember(member.id, e.target.checked)} />
                    <UserAvatar name={member.name} color={member.color} size="sm" isOnline={member.isActive} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{member.name}</p>
                      <p className="truncate text-xs text-surface-400">{member.jobTitle || member.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="label">Team color</label>
              <ColorPicker
                value={color}
                onChange={setColor}
                palette={PROJECT_COLORS}
                disallowedColors={usedTeamColors}
                helperText="Choose a unique color for this team workspace."
              />
            </div>
            <div className="rounded-2xl border border-surface-100 p-4 dark:border-surface-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="label mb-0">Linked Projects</p>
                  <p className="text-xs text-surface-400">Attach projects so the team has a proper workspace view.</p>
                </div>
                <span className="badge-gray text-xs">{selectedProjects.length} linked</span>
              </div>
              <input value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="input h-9 mb-2" placeholder="Search projects..." />
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-surface-100 p-2 space-y-1.5 dark:border-surface-800">
                {filteredProjects.map((project) => (
                  <label key={project.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800">
                    <input type="checkbox" checked={selectedProjects.includes(project.id)} onChange={(e) => toggleProject(project.id, e.target.checked)} />
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{project.name}</p>
                      <p className="truncate text-xs text-surface-400">{project.department || 'General'} department</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-surface-100 pt-5 dark:border-surface-800">
          <button type="button" onClick={onClose} className="btn-ghost btn-md">Cancel</button>
          <button type="submit" disabled={loading || !name.trim() || !selectedLeaderIds.length} className="btn-primary btn-md min-w-[140px]">
            {loading ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save Team' : 'Create Team'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const TeamDetailModal: React.FC<{
  team: Team | null;
  onClose: () => void;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}> = ({ team, onClose, onEdit, onDelete }) => {
  const { projects, tasks, users } = useAppStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'workload'>('overview');
  if (!team) return null;


  const { members, leaders, teamProjects, teamTasks, doneTasks, activeTasks, completionRate } = getTeamMetrics(team, users, projects, tasks);
  const statusBreakdown = Object.entries(STATUS_CONFIG)
    .map(([status, config]) => ({
      status,
      label: config.label,
      color: config.color,
      count: teamTasks.filter((task) => task.status === status).length,
    }))
    .filter((item) => item.count > 0);

  return (
    <Modal open={!!team} onClose={onClose} size="xl" showClose={false}>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-3xl flex items-center justify-center text-white font-display font-bold text-xl flex-shrink-0" style={{ backgroundColor: team.color }}>
              {team.name[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-semibold text-2xl text-surface-900 dark:text-white">{team.name}</h2>
                <span className="badge-gray text-[10px]">Team Workspace</span>
              </div>
              <p className="mt-1 text-sm text-surface-400">{team.description || 'No team description has been added yet.'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-surface-400">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> Created {formatDate(team.createdAt)}</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> {leaders.length} leader{leaders.length === 1 ? '' : 's'}</span>
                <span className="flex items-center gap-1.5"><Briefcase size={12} /> {teamProjects.length} linked project{teamProjects.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onEdit(team)} className="btn-secondary btn-sm"><Edit3 size={14} />Edit</button>
            <button type="button" onClick={() => onDelete(team)} className="btn-ghost btn-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={14} />Delete</button>
            <button type="button" onClick={onClose} className="btn-ghost btn-sm">Close</button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-surface-50 dark:bg-surface-800/60 p-1 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'overview' ? "bg-white dark:bg-surface-700 text-primary-600 shadow-sm" : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
            )}
          >
            <LayoutDashboard size={14} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('workload')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'workload' ? "bg-white dark:bg-surface-700 text-primary-600 shadow-sm" : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
            )}
          >
            <BarChart3 size={14} /> Capacity Matrix
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard icon={<Users size={14} />} label="Members" value={String(members.length)} />
              <MetricCard icon={<FolderKanban size={14} />} label="Projects" value={String(teamProjects.length)} />
              <MetricCard icon={<CheckCircle2 size={14} />} label="Completed Tasks" value={String(doneTasks)} />
              <MetricCard icon={<ShieldCheck size={14} />} label="Delivery Health" value={`${completionRate}%`} tone="bg-emerald-50 dark:bg-emerald-950/20" />
            </div>


        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="rounded-3xl border border-surface-100 p-5 dark:border-surface-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display font-semibold text-surface-900 dark:text-white">Leads & Members</h3>
              <AvatarGroup users={members} max={5} size="xs" />
            </div>
            <div className="mt-4 space-y-2">
              {leaders.map((leader) => (
                <div key={leader.id} className="flex items-center gap-3 rounded-2xl bg-surface-50 px-3 py-3 dark:bg-surface-800/60">
                  <UserAvatar name={leader.name} color={leader.color} size="sm" isOnline={leader.isActive} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{leader.name}</p>
                    <p className="truncate text-xs text-surface-400">{leader.jobTitle || leader.email}</p>
                  </div>
                  <span className="badge text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Leader</span>
                </div>
              ))}
              {members.map((member) => {
                const memberTasks = teamTasks.filter((task) => task.assigneeIds.includes(member.id));
                const memberDoneTasks = memberTasks.filter((task) => task.status === 'done').length;
                return (
                  <div key={member.id} className="rounded-2xl border border-surface-100 px-3 py-3 dark:border-surface-800">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={member.name} color={member.color} size="sm" isOnline={member.isActive} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{member.name}</p>
                        <p className="truncate text-xs text-surface-400">{member.jobTitle || member.email}</p>
                      </div>
                      <span className="text-xs text-surface-400">{memberDoneTasks}/{memberTasks.length} done</span>
                    </div>
                    <ProgressBar value={memberDoneTasks} max={memberTasks.length || 1} size="sm" color={member.color || team.color} className="mt-3" />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-surface-100 p-5 dark:border-surface-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display font-semibold text-surface-900 dark:text-white">Workload & Projects</h3>
              <span className="text-xs text-surface-400">{activeTasks} open items</span>
            </div>
            <div className="mt-4 space-y-3">
              {statusBreakdown.map((item) => (
                <div key={item.status} className="rounded-2xl bg-surface-50 px-3 py-3 dark:bg-surface-800/60">
                  <div className="mb-2 flex items-center justify-between text-xs text-surface-500">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <ProgressBar value={item.count} max={teamTasks.length || 1} size="sm" color={item.color} />
                </div>
              ))}
              {teamProjects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-surface-100 px-4 py-4 dark:border-surface-800">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: project.color }}>
                      {project.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">{project.name}</p>
                        <span className="text-xs text-surface-400">{project.progress}%</span>
                      </div>
                      <p className="mt-1 text-xs text-surface-400">{project.department || 'General'} department</p>
                      <div className="mt-3"><ProgressBar value={project.progress} color={project.color} size="sm" /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </>
    ) : (
      <WorkloadMatrix teamId={team.id} teamName={team.name} />
    )}
  </div>
</Modal>


  );
};

const UserListModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  usersList: User[];
}> = ({ open, onClose, title, usersList }) => {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
        {usersList.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-4">No users found.</p>
        ) : (
          usersList.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-surface-100 p-3 hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/60 transition-colors">
              <UserAvatar name={u.name} color={u.color} size="sm" isOnline={u.isActive} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{u.name}</p>
                <p className="truncate text-xs text-surface-400">{u.jobTitle || u.email}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export const TeamsPage: React.FC = () => {
  const { teams, users, projects, tasks, deleteTeam, teamStats, fetchTeamStats } = useAppStore();
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [search, setSearch] = useState('');
  const [listModalConfig, setListModalConfig] = useState<{ open: boolean; title: string; list: User[] }>({ open: false, title: '', list: [] });

  const [workspacePerformance, setWorkspacePerformance] = useState<any>(null);

  useEffect(() => {
    fetchTeamStats();
    const fetchPerformance = async () => {
      try {
        const res = await performanceService.getWorkspace();
        setWorkspacePerformance(res.data.data);
      } catch (err) {
        console.error('Failed to fetch workspace performance:', err);
      }
    };
    fetchPerformance();
  }, [fetchTeamStats]);


  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team) => {
      const metrics = getTeamMetrics(team, users, projects, tasks);
      return [team.name, team.description, ...metrics.members.map((member) => member.name), ...metrics.teamProjects.map((project) => project.name)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [projects, search, tasks, teams, users]);

  const displayStats = teamStats || {
    totalTeams: teams.length,
    totalLeads: Array.from(new Set(teams.flatMap(t => t.leaderIds || [t.leaderId]))).length,
    totalMembers: Array.from(new Set(teams.flatMap(t => t.members))).length,
    linkedProjects: teams.filter(t => t.linkedProjectId).length,
    avgCompletion: teams.length > 0 ? Math.round(teams.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / teams.length) : 0
  };

  const openCreate = () => {
    setEditingTeam(null);
    setShowForm(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setShowForm(true);
  };

  const handleDelete = async (team: Team) => {
    const confirmed = window.confirm(`Delete "${team.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await teamsService.delete(team.id);
      deleteTeam(team.id);
      if (selectedTeamId === team.id) setSelectedTeamId(null);
      emitSuccessToast('Team deleted successfully.');
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 -mt-4">
      {/* Header Section */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-0">
        <div>
          <h1 className="text-xl font-display font-bold text-surface-900 dark:text-white">Organization Teams</h1>
          <p className="text-xs text-surface-400">Manage teams and monitor delivery health across projects.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search teams..." 
              className="input pl-8 py-1.5 text-sm bg-white dark:bg-surface-900/50" 
            />
          </div>
          <button onClick={openCreate} className="btn-primary btn-sm px-4 shadow-lg shadow-primary-500/20 whitespace-nowrap">
            <Plus size={14} /> Create Team
          </button>
        </div>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard 
          onClick={() => setSearch('')} 
          icon={<Users size={16} className="text-primary-500" />} 
          label="Total Teams" 
          value={String(displayStats.totalTeams)} 
          tone="bg-white dark:bg-surface-900"
        />
        <MetricCard 
          onClick={() => setListModalConfig({ open: true, title: 'Team Leaders', list: users.filter(u => teams.some(t => (t.leaderIds || [t.leaderId]).includes(u.id))) })} 
          icon={<ShieldCheck size={16} className="text-amber-500" />} 
          label="Team Leads" 
          value={String(displayStats.totalLeads)} 
          tone="bg-white dark:bg-surface-900"
        />
        <MetricCard 
          onClick={() => setListModalConfig({ open: true, title: 'All Team Members', list: users.filter(u => teams.some(t => t.members.includes(u.id))) })} 
          icon={<Users size={16} className="text-blue-500" />} 
          label="Total Talent" 
          value={String(displayStats.totalMembers)} 
          tone="bg-white dark:bg-surface-900"
        />
        <MetricCard 
          onClick={() => navigate('/projects')} 
          icon={<FolderKanban size={16} className="text-purple-500" />} 
          label="Linked Projects" 
          value={String(displayStats.linkedProjects)} 
          tone="bg-white dark:bg-surface-900"
        />
        <MetricCard 
          icon={<CheckCircle2 size={16} className="text-emerald-500" />} 
          label="Avg. Completion" 
          value={`${displayStats.avgCompletion}%`} 
          tone="bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/30" 
        />
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <EmptyState
          icon={<div className="w-16 h-16 rounded-3xl bg-surface-50 dark:bg-surface-900 flex items-center justify-center text-surface-300"><Users size={32} /></div>}
          title="No Teams Established"
          description="Build your first high-performance team or create a project to generate one automatically."
          action={<button onClick={openCreate} className="btn-primary btn-md"><Plus size={16} /> Initialize Team</button>}
        />
      ) : filteredTeams.length === 0 ? (
        <EmptyState
          icon={<Search size={28} className="text-surface-300" />}
          title="No search results"
          description={`We couldn't find any teams matching "${search}"`}
          action={<button onClick={() => setSearch('')} className="btn-secondary btn-md">View All Teams</button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <motion.div 
              key={team.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedTeamId(team.id)}
              className="group relative bg-white dark:bg-surface-900 rounded-[2rem] border border-surface-100 dark:border-surface-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
            >
              {/* Header Accent */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 opacity-60" 
                style={{ backgroundColor: team.color }}
              />

              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-display font-bold text-lg shadow-md"
                      style={{ 
                        backgroundColor: team.color,
                        boxShadow: `0 4px 12px -2px ${team.color}30`
                      }}
                    >
                      {team.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-md text-surface-900 dark:text-white leading-tight">{team.name}</h3>
                        {workspacePerformance?.teams?.find((t: any) => t.teamId === team.id) && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                            (workspacePerformance.teams.find((t: any) => t.teamId === team.id).productivityScore >= 80) 
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" 
                              : "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
                          )}>
                            <Zap size={9} className="inline mr-1" />
                            {workspacePerformance.teams.find((t: any) => t.teamId === team.id).productivityScore} Pwr
                          </span>
                        )}
                        {(team as any).autoCreated && (

                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-[9px] font-bold text-surface-500 uppercase tracking-wider">
                            <ShieldCheck size={9} /> Auto
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-surface-400 font-medium">{team.teamCode || 'GEN-TEAM'}</p>
                        <span className="w-1 h-1 rounded-full bg-surface-200" />
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          {users.find(u => u.id === team.leaderId)?.name || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(team); }} className="p-1.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-400 hover:text-primary-500 transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(team); }} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-surface-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {team.description && (
                  <p className="text-xs text-surface-500 line-clamp-1 mb-3">
                    {team.description}
                  </p>
                )}

                {/* Performance Stats - Very Compact */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-surface-50/50 dark:bg-surface-800/20">
                    <p className="text-sm font-bold text-surface-900 dark:text-white leading-none">{(team as any).totalTasks || 0}</p>
                    <p className="text-[8px] uppercase text-surface-400 font-bold mt-1">Tasks</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-surface-50/50 dark:bg-surface-800/20">
                    <p className="text-sm font-bold text-rose-500 leading-none">{(team as any).overdueTasks || 0}</p>
                    <p className="text-[8px] uppercase text-rose-400 font-bold mt-1">Overdue</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-1 rounded-lg bg-surface-50/50 dark:bg-surface-800/20">
                    <p className="text-sm font-bold text-surface-900 dark:text-white leading-none">{(team as any).members?.length || 0}</p>
                    <p className="text-[8px] uppercase text-surface-400 font-bold mt-1">Talent</p>
                  </div>
                </div>

                {/* Progress Bar Only */}
                <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden mb-3">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(team as any).completionPercentage || 0}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AvatarGroup users={users.filter(u => team.members.includes(u.id) && u.role !== 'admin' && u.role !== 'super_admin')} max={3} size="xs" />
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-tighter">
                      {(team as any).completionPercentage || 0}% Done
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedTeamId(team.id)}
                    className="p-1.5 rounded-lg text-primary-500 hover:bg-primary-50 transition-colors"
                    title="View Details"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <TeamDetailModal
        team={selectedTeam}
        onClose={() => setSelectedTeamId(null)}
        onEdit={(team) => {
          setSelectedTeamId(null);
          openEdit(team);
        }}
        onDelete={handleDelete}
      />

      <TeamFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTeam(null);
        }}
        team={editingTeam}
        onSaved={() => {
          setShowForm(false);
          setEditingTeam(null);
          fetchTeamStats();
        }}
      />

      <UserListModal 
        open={listModalConfig.open} 
        onClose={() => setListModalConfig(prev => ({ ...prev, open: false }))} 
        title={listModalConfig.title} 
        usersList={listModalConfig.list} 
      />
    </div>
  );
};

export default TeamsPage;
