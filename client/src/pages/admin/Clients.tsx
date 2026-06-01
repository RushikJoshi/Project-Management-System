import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Search, MoreHorizontal, Mail, 
  Briefcase, Shield, Globe, ExternalLink, Trash2, 
  Settings, UserPlus, Layers, MapPin, Phone, Info
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { clientsService, projectsService } from '../../services/api';
import { Modal } from '../../components/Modal';
import { Table, EmptyState } from '../../components/ui';
import { emitSuccessToast, emitErrorToast } from '../../context/toastBus';
import type { Client, Project, Role } from '../../app/types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Selected Client
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Forms
  const [newClient, setNewClient] = useState({
    companyName: '',
    email: '',
    contactPerson: '',
    phone: '',
    website: '',
    industry: '',
    clientType: 'enterprise' as const,
    notes: ''
  });
  
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'CLIENT_ADMIN' as Role,
    projectIds: [] as string[]
  });
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  
  // Generated credentials after invite
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string; role: string; companyName: string } | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  useEffect(() => {
    fetchClients();
    fetchProjects();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await clientsService.getAll();
      const data = res.data.data ?? res.data ?? [];
      setClients(data.map((c: any) => ({ ...c, id: c._id })));
    } catch (err) {
      console.error(err);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectsService.getAll();
      setProjects(res.data.data ?? res.data ?? []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clientsService.create(newClient);
      emitSuccessToast('Client created successfully');
      setIsAddModalOpen(false);
      fetchClients();
      setNewClient({
        companyName: '',
        email: '',
        contactPerson: '',
        phone: '',
        website: '',
        industry: '',
        clientType: 'enterprise',
        notes: ''
      });
    } catch (err: any) {
      emitErrorToast(err.response?.data?.message || 'Failed to create client');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const res = await clientsService.invite(selectedClient.id, inviteData);
      const creds = res.data?.data;
      setIsInviteModalOpen(false);
      setInviteData({ email: '', name: '', password: '', role: 'CLIENT_ADMIN', projectIds: [] });
      if (creds?.password) {
        setGeneratedCredentials({
          email: creds.email,
          password: creds.password,
          role: creds.role,
          companyName: creds.companyName || selectedClient.companyName,
        });
      } else {
        emitSuccessToast('Client user account created successfully');
      }
    } catch (err: any) {
      emitErrorToast(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to create client user');
    }
  };

  const handleAssignProjects = async () => {
    if (!selectedClient) return;
    try {
      await clientsService.assignProjects(selectedClient.id, selectedProjectIds);
      emitSuccessToast('Projects assigned successfully');
      setIsProjectModalOpen(false);
      fetchClients();
    } catch (err: any) {
      emitErrorToast(err.response?.data?.message || 'Failed to assign projects');
    }
  };

  const handleToggleStatus = async (client: Client) => {
    try {
      const newStatus = client.status === 'active' ? 'inactive' : 'active';
      await clientsService.update(client.id, { status: newStatus });
      emitSuccessToast(`Client status updated to ${newStatus}`);
      fetchClients();
    } catch (err: any) {
      emitErrorToast(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filteredClients = clients.filter(c =>
    (c.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.clientCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 pt-0 max-w-[1600px] mx-auto space-y-6">
      {/* Header and Stats Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Small Stats Cards */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 w-full lg:w-auto">
          {[
            { label: 'Total Clients', value: clients.length, icon: Building2, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
            { label: 'Active Portals', value: clients.filter(c => c.status === 'active').length, icon: Globe, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Assigned Projects', value: clients.reduce((acc, c) => acc + (c.assignedProjectIds?.length || 0), 0), icon: Layers, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { label: 'Pending Invites', value: '0', icon: Mail, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-surface-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-surface-700 shadow-sm flex items-center gap-2 text-xs min-w-[130px] sm:min-w-0">
              <div className={cn("p-1.5 rounded-lg shrink-0", stat.bg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 dark:text-surface-400 font-medium leading-none mb-0.5 truncate">{stat.label}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-white leading-none">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative group flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-surface-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search clients..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full sm:w-64 dark:text-white placeholder:text-gray-400 dark:placeholder:text-surface-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-gray-100 dark:border-surface-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 dark:text-surface-400">Loading clients...</div>
        ) : filteredClients.length > 0 ? (
          <Table
            columns={[
              {
                key: 'details',
                header: 'Client Details',
                render: (client: Client) => (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                      {client.companyName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{client.companyName}</div>
                      <div className="text-xs text-gray-500 dark:text-surface-400 font-mono">{client.clientCode}</div>
                    </div>
                  </div>
                )
              },
              {
                key: 'contact',
                header: 'Contact',
                render: (client: Client) => (
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 dark:text-white truncate">{client.contactPerson || 'N/A'}</div>
                    <div className="text-xs text-gray-500 dark:text-surface-400 flex items-center gap-1 truncate">
                      <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-surface-500 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  </div>
                )
              },
              {
                key: 'projects',
                header: 'Projects',
                render: (client: Client) => (
                  <div className="px-2 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-md text-xs font-bold border border-blue-100 dark:border-blue-900/30 inline-block whitespace-nowrap">
                    {client.assignedProjectIds?.length || 0} Projects
                  </div>
                )
              },
              {
                key: 'users',
                header: 'Users',
                render: (client: Client & { users?: any[] }) => (
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-bold border border-indigo-100 dark:border-indigo-900/30 inline-block whitespace-nowrap">
                      {client.users?.length || 0} Users
                    </div>
                    {client.users && client.users.length > 0 && (
                      <select 
                        className="text-xs border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-gray-900 dark:text-white rounded p-1 max-w-[150px] outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="" className="bg-white dark:bg-surface-800 text-gray-900 dark:text-white">View Users</option>
                        {client.users.map((u: any) => (
                          <option key={u.email} disabled className="bg-white dark:bg-surface-800 text-gray-500 dark:text-surface-400">
                            {u.name || u.email.split('@')[0]} ({u.role})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              },
              {
                key: 'status',
                header: 'Status',
                render: (client: Client) => (
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap",
                      client.status === 'active' 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900" 
                        : "bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900"
                    )}>
                      {client.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(client);
                      }}
                      className="p-1.5 bg-gray-50 dark:bg-surface-800 text-gray-500 dark:text-surface-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors border border-gray-100 dark:border-surface-700 shrink-0"
                      title="Toggle Status"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (client: Client) => (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                        setSelectedProjectIds(client.assignedProjectIds || []);
                        setIsProjectModalOpen(true);
                      }}
                      className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/30 shrink-0"
                      title="Assign Projects"
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                        setIsInviteModalOpen(true);
                      }}
                      className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/30 shrink-0"
                      title="Invite User"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                )
              }
            ]}
            data={filteredClients}
            keyExtractor={(client) => client.id}
            onRowClick={(client) => {
              setSelectedClient(client);
              setIsDetailModalOpen(true);
            }}
          />
        ) : (
          <EmptyState
            title="No clients found"
            description="Get started by adding your first enterprise client."
            icon={<Building2 className="w-12 h-12" />}
            action={
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Client
              </button>
            }
          />
        )}
      </div>
      {/* Add Client Modal */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Enterprise Client"
        size="lg"
      >
        <form onSubmit={handleCreateClient} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">Company Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-surface-500"
                placeholder="e.g. Acme Corp"
                value={newClient.companyName}
                onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">Official Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-surface-500"
                placeholder="contact@company.com"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">Contact Person</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-surface-500"
                placeholder="John Doe"
                value={newClient.contactPerson}
                onChange={(e) => setNewClient({ ...newClient, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">Phone</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-surface-500"
                placeholder="+1 234 567 890"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">Website</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-surface-500"
                placeholder="https://company.com"
                value={newClient.website}
                onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">Industry</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-surface-500"
                placeholder="Technology"
                value={newClient.industry}
                onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">Internal Notes</label>
            <textarea
              className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-24 resize-none placeholder:text-gray-400 dark:placeholder:text-surface-500"
              placeholder="Additional details about the client..."
              value={newClient.notes}
              onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-gray-700 dark:text-surface-300 font-semibold hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
              Create Client
            </button>
          </div>
        </form>
      </Modal>
      {/* Invite User Modal */}
      <Modal
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title={selectedClient ? `Invite User to ${selectedClient.companyName}` : 'Invite User'}
      >
        <form onSubmit={handleSendInvite} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">Full Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-surface-500"
              placeholder="e.g. Mayur Chavda"
              value={inviteData.name}
              onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">User Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-surface-500" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-surface-500"
                placeholder="user@client.com"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">Client Role</label>
            <select
              className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              value={inviteData.role}
              onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as Role })}
            >
              <option value="CLIENT_ADMIN" className="bg-white dark:bg-surface-800 text-gray-900 dark:text-white">Client Admin (Full Access)</option>
              <option value="CLIENT_MANAGER" className="bg-white dark:bg-surface-800 text-gray-900 dark:text-white">Client Manager (Project Tracking)</option>
              <option value="CLIENT_REVIEWER" className="bg-white dark:bg-surface-800 text-gray-900 dark:text-white">Client Reviewer (Feedback only)</option>
              <option value="CLIENT_VIEWER" className="bg-white dark:bg-surface-800 text-gray-900 dark:text-white">Client Viewer (Read-only)</option>
            </select>
            <p className="text-[10px] text-gray-500 dark:text-surface-450 px-1 italic">
              {inviteData.role === 'CLIENT_ADMIN' && 'Can manage team members and approve milestones.'}
              {inviteData.role === 'CLIENT_MANAGER' && 'Can track all assigned projects and tasks.'}
              {inviteData.role === 'CLIENT_REVIEWER' && 'Can review tasks and provide feedback.'}
              {inviteData.role === 'CLIENT_VIEWER' && 'Can only view progress and files.'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-surface-300">
              Password <span className="text-xs font-normal text-gray-400 dark:text-surface-500">(leave blank to auto-generate)</span>
            </label>
            <div className="relative">
              <input
                type={showInvitePassword ? 'text' : 'password'}
                className="w-full px-4 py-2 pr-10 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-surface-500"
                placeholder="e.g. mayur@123"
                value={inviteData.password}
                onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                minLength={inviteData.password ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowInvitePassword(!showInvitePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-surface-500 hover:text-gray-600 dark:hover:text-surface-300"
              >
                {showInvitePassword ? '🙈' : '👁'}
              </button>
            </div>
            {inviteData.password && inviteData.password.length < 6 && (
              <p className="text-xs text-rose-500">Password must be at least 6 characters</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-800">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 text-gray-700 dark:text-surface-300 font-semibold hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md"
            >
              Create Account & Get Credentials
            </button>
          </div>
        </form>
      </Modal>
      {/* Assign Projects Modal */}
      <Modal
        open={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="Assign Projects to Client"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 dark:text-surface-400">Select projects that should be visible to this client in their portal.</p>
          
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {projects.map((project) => (
              <label
                key={project.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:border-indigo-300",
                  selectedProjectIds.includes(project.id) 
                    ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50" 
                    : "bg-white dark:bg-surface-800 border-gray-100 dark:border-surface-700"
                )}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 dark:bg-surface-900 dark:border-surface-755 rounded focus:ring-indigo-500"
                  checked={selectedProjectIds.includes(project.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProjectIds([...selectedProjectIds, project.id]);
                    } else {
                      setSelectedProjectIds(selectedProjectIds.filter(id => id !== project.id));
                    }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</div>
                  <div className="text-xs text-gray-500 dark:text-surface-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }}></span>
                    <span className="truncate">{project.status.toUpperCase()}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-800">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="px-4 py-2 text-gray-700 dark:text-surface-300 font-semibold hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignProjects}
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md"
            >
              Update Access
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Generated Credentials Modal ───────────────────────────────────── */}
      <Modal
        open={!!generatedCredentials}
        onClose={() => setGeneratedCredentials(null)}
        title="✅ Client Account Created"
        size="sm"
      >
        {generatedCredentials && (
          <div className="p-6 space-y-5">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/40 p-4 text-sm text-emerald-800 dark:text-emerald-400">
              <p className="font-semibold mb-1">Account created successfully!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-500/90">Share these credentials securely with the client. They can change their password after first login.</p>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-surface-450">Company</label>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{generatedCredentials.companyName}</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-surface-450">Login Email</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-surface-800 px-3 py-2 rounded-lg text-sm font-mono text-gray-900 dark:text-white select-all border border-gray-200 dark:border-surface-700">
                    {generatedCredentials.email}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedCredentials.email); emitSuccessToast('Email copied!'); }}
                    className="px-3 py-2 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-surface-700 dark:hover:bg-surface-600 dark:text-white rounded-lg font-semibold transition-colors border border-gray-350 dark:border-surface-650"
                  >Copy</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-surface-450">Password</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 px-3 py-2 rounded-lg text-sm font-mono text-indigo-900 dark:text-indigo-300 select-all tracking-widest">
                    {generatedCredentials.password}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedCredentials.password); emitSuccessToast('Password copied!'); }}
                    className="px-3 py-2 text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-350 rounded-lg font-semibold transition-colors border border-indigo-200 dark:border-indigo-850"
                  >Copy</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-surface-450">Role</label>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-surface-300">{generatedCredentials.role.replace('CLIENT_', '').replace(/_/g, ' ')}</p>
              </div>

              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 p-3 text-xs text-amber-800 dark:text-amber-400">
                ⚠️ This password is shown <strong>only once</strong>. Copy and share it securely. The client can reset it via "Forgot Password".
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  const text = `Login: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}\nPortal: ${window.location.origin}/login`;
                  navigator.clipboard.writeText(text);
                  emitSuccessToast('Credentials copied to clipboard!');
                }}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm"
              >
                Copy All Credentials
              </button>
              <button
                onClick={() => setGeneratedCredentials(null)}
                className="px-4 py-2 text-gray-700 dark:text-surface-300 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-colors text-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Client Details Modal */}
      <Modal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedClient ? `Client Profile: ${selectedClient.companyName}` : 'Client Details'}
        size="lg"
      >
        {selectedClient && (
          <div className="p-6 space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-4 border-b border-surface-100 dark:border-surface-800 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
                {selectedClient.companyName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{selectedClient.companyName}</h3>
                <p className="text-xs text-gray-400 dark:text-surface-450 font-mono">Client Code: {selectedClient.clientCode}</p>
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap",
                selectedClient.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900" : "bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900"
              )}>
                {selectedClient.status}
              </span>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-surface-450">Contact Person</span>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white truncate">{selectedClient.contactPerson || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-surface-450">Official Email</span>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1.5 truncate">
                  <Mail className="w-4 h-4 text-gray-400 dark:text-surface-500 shrink-0" />
                  <span className="truncate">{selectedClient.email}</span>
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-surface-450">Phone</span>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white truncate">{selectedClient.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-surface-450">Website</span>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white truncate">
                  {selectedClient.website ? (
                    <a href={selectedClient.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate">
                      <span className="truncate">{selectedClient.website}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-surface-450">Industry</span>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white truncate">{selectedClient.industry || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-surface-450">Client Type</span>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white capitalize truncate">{selectedClient.clientType}</p>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-surface-450">Internal Notes</span>
              <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl min-h-[60px] italic border border-gray-100 dark:text-surface-300 dark:bg-surface-800/30 dark:border-surface-800">
                {selectedClient.notes || 'No internal notes recorded for this client.'}
              </p>
            </div>

            {/* Assigned Projects */}
            <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-surface-450 block mb-2">Assigned Projects ({selectedClient.assignedProjectIds?.length || 0})</span>
              {selectedClient.assignedProjectIds && selectedClient.assignedProjectIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {projects.filter(p => selectedClient.assignedProjectIds?.includes(p.id)).map(project => (
                    <div key={project.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }}></span>
                      <span className="truncate">{project.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-surface-500 italic">No projects assigned to this client yet.</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-800">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedProjectIds(selectedClient.assignedProjectIds || []);
                  setIsProjectModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold rounded-xl text-xs transition-colors dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
              >
                <Layers className="w-3.5 h-3.5" />
                Assign Projects
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsInviteModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold rounded-xl text-xs transition-colors dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite User
              </button>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-gray-700 dark:text-surface-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
