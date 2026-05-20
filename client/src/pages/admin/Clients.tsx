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
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-8 h-8 text-indigo-600" />
            Client Management
          </h1>
          <p className="text-gray-500 mt-1">Manage enterprise clients and their portal access.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search clients..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: clients.length, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Active Portals', value: clients.filter(c => c.status === 'active').length, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Assigned Projects', value: clients.reduce((acc, c) => acc + (c.assignedProjectIds?.length || 0), 0), icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Invites', value: '0', icon: Mail, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading clients...</div>
        ) : filteredClients.length > 0 ? (
          <Table
            columns={[
              {
                key: 'details',
                header: 'Client Details',
                render: (client: Client) => (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {client.companyName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{client.companyName}</div>
                      <div className="text-xs text-gray-500 font-mono">{client.clientCode}</div>
                    </div>
                  </div>
                )
              },
              {
                key: 'contact',
                header: 'Contact',
                render: (client: Client) => (
                  <div>
                    <div className="text-sm text-gray-900">{client.contactPerson || 'N/A'}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </div>
                  </div>
                )
              },
              {
                key: 'projects',
                header: 'Projects',
                render: (client: Client) => (
                  <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-bold border border-blue-100 inline-block">
                    {client.assignedProjectIds?.length || 0} Projects
                  </div>
                )
              },
              {
                key: 'users',
                header: 'Users',
                render: (client: Client & { users?: any[] }) => (
                  <div className="flex flex-col gap-1">
                    <div className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold border border-indigo-100 inline-block">
                      {client.users?.length || 0} Users
                    </div>
                    {client.users && client.users.length > 0 && (
                      <select 
                        className="text-xs border border-gray-200 rounded p-1 max-w-[150px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">View Users</option>
                        {client.users.map((u: any) => (
                          <option key={u.email} disabled>
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
                      "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      client.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                    )}>
                      {client.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(client);
                      }}
                      className="p-1.5 bg-gray-50 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-100"
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
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
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
                      className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
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
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Company Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="e.g. Acme Corp"
                value={newClient.companyName}
                onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Official Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="contact@company.com"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Contact Person</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="John Doe"
                value={newClient.contactPerson}
                onChange={(e) => setNewClient({ ...newClient, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Phone</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="+1 234 567 890"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Website</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="https://company.com"
                value={newClient.website}
                onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Industry</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Technology"
                value={newClient.industry}
                onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Internal Notes</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-24 resize-none"
              placeholder="Additional details about the client..."
              value={newClient.notes}
              onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
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
            <label className="text-sm font-semibold text-gray-700">Full Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              placeholder="e.g. Mayur Chavda"
              value={inviteData.name}
              onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">User Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="user@client.com"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Client Role</label>
            <select
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={inviteData.role}
              onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as Role })}
            >
              <option value="CLIENT_ADMIN">Client Admin (Full Access)</option>
              <option value="CLIENT_MANAGER">Client Manager (Project Tracking)</option>
              <option value="CLIENT_REVIEWER">Client Reviewer (Feedback only)</option>
              <option value="CLIENT_VIEWER">Client Viewer (Read-only)</option>
            </select>
            <p className="text-[10px] text-gray-500 px-1 italic">
              {inviteData.role === 'CLIENT_ADMIN' && 'Can manage team members and approve milestones.'}
              {inviteData.role === 'CLIENT_MANAGER' && 'Can track all assigned projects and tasks.'}
              {inviteData.role === 'CLIENT_REVIEWER' && 'Can review tasks and provide feedback.'}
              {inviteData.role === 'CLIENT_VIEWER' && 'Can only view progress and files.'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Password <span className="text-xs font-normal text-gray-400">(leave blank to auto-generate)</span>
            </label>
            <div className="relative">
              <input
                type={showInvitePassword ? 'text' : 'password'}
                className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="e.g. mayur@123"
                value={inviteData.password}
                onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                minLength={inviteData.password ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowInvitePassword(!showInvitePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showInvitePassword ? '🙈' : '👁'}
              </button>
            </div>
            {inviteData.password && inviteData.password.length < 6 && (
              <p className="text-xs text-rose-500">Password must be at least 6 characters</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
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
          <p className="text-sm text-gray-500">Select projects that should be visible to this client in their portal.</p>
          
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {projects.map((project) => (
              <label
                key={project.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:border-indigo-300",
                  selectedProjectIds.includes(project.id) ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-100"
                )}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  checked={selectedProjectIds.includes(project.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProjectIds([...selectedProjectIds, project.id]);
                    } else {
                      setSelectedProjectIds(selectedProjectIds.filter(id => id !== project.id));
                    }
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{project.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }}></span>
                    {project.status.toUpperCase()}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
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
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
              <p className="font-semibold mb-1">Account created successfully!</p>
              <p className="text-xs text-emerald-700">Share these credentials securely with the client. They can change their password after first login.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Company</label>
                <p className="mt-1 font-semibold text-gray-900">{generatedCredentials.companyName}</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Login Email</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono text-gray-900 select-all">
                    {generatedCredentials.email}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedCredentials.email); emitSuccessToast('Email copied!'); }}
                    className="px-3 py-2 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
                  >Copy</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg text-sm font-mono text-indigo-900 select-all tracking-widest">
                    {generatedCredentials.password}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedCredentials.password); emitSuccessToast('Password copied!'); }}
                    className="px-3 py-2 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-semibold transition-colors"
                  >Copy</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Role</label>
                <p className="mt-1 text-sm font-medium text-gray-700">{generatedCredentials.role.replace('CLIENT_', '').replace(/_/g, ' ')}</p>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
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
                className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-xl transition-colors text-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
