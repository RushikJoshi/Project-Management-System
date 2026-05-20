import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getTenantModels } from './src/config/tenantDb.js';
import Company from './src/models/Company.js';

dotenv.config();

const SYSTEM_ROLES = [
  {
    name: 'Super Admin',
    slug: 'super_admin',
    description: 'System owner with absolute access to everything.',
    isSystemRole: true,
    permissions: ['*'],
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Workspace administrator with full access except billing and core settings.',
    isSystemRole: true,
    permissions: [
      'task.view.global', 'task.create', 'task.update', 'task.delete', 'task.assign',
      'project.view.global', 'project.create', 'project.edit', 'project.delete',
      'user.view', 'user.manage', 'report.view', 'report.export', 'mis.view.global', 'mis.approve',
      'permission.manage', 'settings.manage'
    ],
  },
  {
    name: 'Manager',
    slug: 'manager',
    description: 'Can manage projects, teams, and view workspace reports.',
    isSystemRole: true,
    permissions: [
      'task.view.global', 'task.create', 'task.update', 'task.assign',
      'project.view.global', 'project.create', 'project.edit',
      'user.view', 'report.view', 'mis.view.global', 'mis.approve'
    ],
  },
  {
    name: 'Team Leader',
    slug: 'team_leader',
    description: 'Can manage own and team tasks, and view team reports.',
    isSystemRole: true,
    permissions: [
      'task.view.team', 'task.create', 'task.update', 'task.assign',
      'project.view.team', 'user.view', 'report.view', 'mis.view.team', 'mis.approve'
    ],
  },
  {
    name: 'Employee',
    slug: 'team_member',
    description: 'Standard access. Can view and update own tasks and projects.',
    isSystemRole: true,
    permissions: [
      'task.view.own', 'task.update', 'project.view.own', 'mis.view.own'
    ],
  }
];

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  const companies = await Company.find();
  console.log(`Found ${companies.length} companies to migrate.`);

  for (const company of companies) {
    console.log(`\nMigrating company: ${company.name} (${company._id})`);
    const { Role, User } = await getTenantModels(company._id);
    
    // 1. Seed Roles
    const roleMap = {}; // old string -> new Role ObjectId
    
    for (const sysRole of SYSTEM_ROLES) {
      let role = await Role.findOne({ tenantId: company._id, slug: sysRole.slug });
      if (!role) {
        console.log(`Creating role: ${sysRole.name}`);
        role = await Role.create({
          tenantId: company._id,
          name: sysRole.name,
          slug: sysRole.slug,
          description: sysRole.description,
          isSystemRole: true,
          permissions: sysRole.permissions
        });
      } else {
        // Update permissions if it exists just in case
        role.permissions = sysRole.permissions;
        await role.save();
      }
      roleMap[sysRole.slug] = role._id;
    }

    // 2. Map Users
    const users = await User.find({ tenantId: company._id });
    console.log(`Found ${users.length} users to map.`);
    
    let updatedCount = 0;
    for (const user of users) {
      const oldRoleStr = user.role || 'team_member';
      const roleId = roleMap[oldRoleStr];
      
      if (roleId) {
        user.roleIds = [roleId];
        user.isSuperAdmin = (oldRoleStr === 'super_admin');
        await user.save();
        updatedCount++;
      }
    }
    console.log(`Successfully mapped ${updatedCount} users.`);
  }

  console.log('\nMigration complete!');
  process.exit(0);
}

migrate().catch(console.error);
