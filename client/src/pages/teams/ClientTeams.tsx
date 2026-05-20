import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ShieldCheck, CheckCircle2, AlertTriangle, FolderKanban, Zap, Search } from 'lucide-react';
import { clientTeamsService } from '../../services/api';
import { ProgressBar } from '../../components/ui';
import { cn } from '../../utils/helpers';
import { Modal } from '../../components/Modal';
import { UserAvatar } from '../../components/UserAvatar';

export default function ClientTeamsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamDetails, setTeamDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [summaryRes, listRes] = await Promise.all([
          clientTeamsService.getSummary(),
          clientTeamsService.getList()
        ]);
        setSummary(summaryRes.data.data);
        setTeams(listRes.data.data);
      } catch (err) {
        console.error('Failed to fetch client teams data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleTeamClick = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedMember(null); // Reset selected member when team changes
    try {
      setDetailsLoading(true);
      const res = await clientTeamsService.getDetails(teamId);
      setTeamDetails(res.data.data);
    } catch (err) {
      console.error('Failed to fetch team details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    (team.leader?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-6 text-surface-500 text-center">Loading teams data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 -mt-4">
      {/* Header Section */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-0">
        <div>
          <h1 className="text-xl font-display font-bold text-surface-900 dark:text-white">Our Project Teams</h1>
          <p className="text-xs text-surface-400">Monitor teams working on your projects and their delivery health.</p>
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
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-surface-100 p-3 bg-white dark:bg-surface-900 dark:border-surface-800">
            <div className="flex items-center gap-1.5 text-surface-400">
              <Users size={14} className="text-primary-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Total Teams</span>
            </div>
            <p className="mt-1 text-lg font-display font-bold text-surface-900 dark:text-white">{summary.totalTeams}</p>
          </div>
          <div className="rounded-xl border border-surface-100 p-3 bg-white dark:bg-surface-900 dark:border-surface-800">
            <div className="flex items-center gap-1.5 text-surface-400">
              <Users size={14} className="text-blue-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Active Members</span>
            </div>
            <p className="mt-1 text-lg font-display font-bold text-surface-900 dark:text-white">{summary.activeMembers}</p>
          </div>
          <div className="rounded-xl border border-surface-100 p-3 bg-white dark:bg-surface-900 dark:border-surface-800">
            <div className="flex items-center gap-1.5 text-surface-400">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Completed Tasks</span>
            </div>
            <p className="mt-1 text-lg font-display font-bold text-surface-900 dark:text-white">{summary.completedTasks}</p>
          </div>
          <div className="rounded-xl border border-surface-100 p-3 bg-white dark:bg-surface-900 dark:border-surface-800">
            <div className="flex items-center gap-1.5 text-surface-400">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Pending Tasks</span>
            </div>
            <p className="mt-1 text-lg font-display font-bold text-surface-900 dark:text-white">{summary.pendingTasks}</p>
          </div>
          <div className="rounded-xl border border-surface-100 p-3 bg-white dark:bg-surface-900 dark:border-surface-800">
            <div className="flex items-center gap-1.5 text-surface-400">
              <Zap size={14} className="text-purple-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Efficiency</span>
            </div>
            <p className="mt-1 text-lg font-display font-bold text-surface-900 dark:text-white">{summary.overallEfficiency}%</p>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeams.map((team) => (
          <motion.div 
            key={team.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            onClick={() => handleTeamClick(team.id)}
            className="group relative bg-white dark:bg-surface-900 rounded-[2rem] border border-surface-100 dark:border-surface-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-display font-bold text-lg bg-primary-500">
                    {team.name[0]}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-md text-surface-900 dark:text-white leading-tight">{team.name}</h3>
                    <p className="text-[10px] text-surface-400 font-medium">Leader: {team.leader?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                  team.health === 'On Track' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
                )}>
                  {team.health}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/20">
                  <p className="text-sm font-bold text-surface-900 dark:text-white leading-none">{team.memberCount}</p>
                  <p className="text-[8px] uppercase text-surface-400 font-bold mt-1">Members</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/20">
                  <p className="text-sm font-bold text-surface-900 dark:text-white leading-none">{team.completedTasks}</p>
                  <p className="text-[8px] uppercase text-surface-400 font-bold mt-1">Done</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/20">
                  <p className="text-sm font-bold text-surface-900 dark:text-white leading-none">{team.activeTasks}</p>
                  <p className="text-[8px] uppercase text-surface-400 font-bold mt-1">Pending</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                  <span>Progress</span>
                  <span>{team.progress}%</span>
                </div>
                <ProgressBar value={team.progress} color="bg-primary-500" size="sm" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Team Details Modal */}
      <Modal open={!!selectedTeamId} onClose={() => { setSelectedTeamId(null); setTeamDetails(null); setSelectedMember(null); }} title="Team Details" size="xl">
        {detailsLoading ? (
          <div className="p-6 text-center text-surface-500">Loading team details...</div>
        ) : teamDetails ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-3xl flex items-center justify-center text-white font-display font-bold text-xl bg-primary-500">
                {teamDetails.team.name[0]}
              </div>
              <div>
                <h2 className="font-display font-semibold text-2xl text-surface-900 dark:text-white">{teamDetails.team.name}</h2>
                <p className="text-sm text-surface-400">Leader: {teamDetails.team.leader?.name || 'Unassigned'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Members List */}
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-surface-900 dark:text-white">Team Members</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {teamDetails.members.map((member: any) => (
                    <div 
                      key={member.id} 
                      onClick={() => setSelectedMember(member)}
                      className={cn(
                        "rounded-2xl border p-3 dark:border-surface-800 cursor-pointer transition-colors",
                        selectedMember?.id === member.id ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/10" : "border-surface-100 hover:bg-surface-50 dark:hover:bg-surface-800/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar name={member.name} color={member.color} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">{member.name}</p>
                          <p className="truncate text-xs text-surface-400">{member.role}</p>
                        </div>
                        <div className="text-xs text-surface-400 text-right">
                          <p>{member.completedTasks} Done</p>
                          <p>{member.currentTaskCount} Pending</p>
                        </div>
                      </div>
                      <ProgressBar 
                        value={member.completedTasks} 
                        max={(member.completedTasks + member.currentTaskCount) || 1} 
                        size="sm" 
                        color="bg-emerald-500" 
                        className="mt-2" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress & Stats */}
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-surface-900 dark:text-white">
                  {selectedMember ? `${selectedMember.name}'s Performance` : 'Team Performance'}
                </h3>
                <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-800/60 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                      <span>{selectedMember ? 'Member Progress' : 'Overall Progress'}</span>
                      <span>{selectedMember ? selectedMember.progress : Math.round((teamDetails.stats.completedTasks / teamDetails.stats.totalTasks) * 100) || 0}%</span>
                    </div>
                    <ProgressBar 
                      value={selectedMember ? selectedMember.progress : Math.round((teamDetails.stats.completedTasks / teamDetails.stats.totalTasks) * 100) || 0} 
                      color="bg-primary-500" 
                      size="sm" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-surface-400">Total Tasks</p>
                      <p className="text-xl font-bold text-surface-900 dark:text-white">
                        {selectedMember ? (selectedMember.completedTasks + selectedMember.currentTaskCount) : teamDetails.stats.totalTasks}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-400">Completed</p>
                      <p className="text-xl font-bold text-emerald-500">
                        {selectedMember ? selectedMember.completedTasks : teamDetails.stats.completedTasks}
                      </p>
                    </div>
                  </div>
                  {selectedMember && (
                    <div className="flex justify-end">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedMember(null); }} 
                        className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                      >
                        View Team Performance
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-surface-500">No data found.</div>
        )}
      </Modal>
    </div>
  );
}
