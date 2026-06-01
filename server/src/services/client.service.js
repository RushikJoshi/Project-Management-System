import { getTenantModels } from '../config/tenantDb.js';
import AuthLookup from '../models/AuthLookup.js';
import crypto from 'crypto';
import { hashPassword } from '../utils/password.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  return Array.from(crypto.randomBytes(length))
    .map(b => chars[b % chars.length])
    .join('');
}

// ─── Client CRUD ──────────────────────────────────────────────────────────────

export async function createClient({ companyId, clientData }) {
  if (!companyId) {
    const err = new Error('companyId is required to create a client');
    err.statusCode = 400;
    throw err;
  }

  const { Client } = await getTenantModels(companyId);

  // 1. Generate sequential unique Client Code (CLI-001, CLI-002, etc.)
  const existingClients = await Client.find({ tenantId: companyId }).lean();
  let maxNum = 0;
  for (const c of existingClients) {
    if (c.clientCode && c.clientCode.startsWith('CLI-')) {
      const numericStr = c.clientCode.replace('CLI-', '').trim();
      if (/^\d+$/.test(numericStr)) {
        const numPart = parseInt(numericStr, 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  }
  const nextNum = String(maxNum + 1).padStart(3, '0');
  const clientCode = `CLI-${nextNum}`;

  // 2. Generate unique Client Slug
  const baseSlug = (clientData.companyName || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const clientSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

  // 3. Create Client
  try {
    const client = new Client({
      ...clientData,
      tenantId: companyId,
      clientCode,
      clientSlug,
    });

    await client.save();
    return client;
  } catch (err) {
    console.error('[ClientService] createClient failed:', {
      message: err.message,
      code: err.code,
      keyValue: err.keyValue,
      companyId,
      clientCode,
      clientSlug,
    });
    throw err;
  }
}

export async function listClients({ companyId }) {
  const { Client, User } = await getTenantModels(companyId);
  const clients = await Client.find({ tenantId: companyId }).sort({ companyName: 1 }).lean();
  
  for (const client of clients) {
    client.users = await User.find({ clientId: client._id }).select('email role name').lean();
  }
  
  return clients;
}

export async function getClient({ companyId, clientId }) {
  const { Client } = await getTenantModels(companyId);
  return Client.findOne({ _id: clientId, tenantId: companyId });
}

export async function updateClient({ companyId, clientId, updates }) {
  const { Client } = await getTenantModels(companyId);
  return Client.findOneAndUpdate(
    { _id: clientId, tenantId: companyId },
    { $set: updates },
    { new: true }
  );
}

// ─── Invite = Create Client User Account ─────────────────────────────────────
// When an admin invites a client user, we immediately create a User + AuthLookup
// + Membership so the client can log in right away with the generated credentials.

export async function inviteClientUser({ companyId, actorId, clientId, invitationData }) {
  const { Client, User, Workspace, Membership } = await getTenantModels(companyId);

  // 1. Validate client exists
  const client = await Client.findOne({ _id: clientId, tenantId: companyId });
  if (!client) throw new Error('Client not found');

  const email = invitationData.email.trim().toLowerCase();

  // 2. Check if user already exists for this email in this tenant
  const existingUser = await User.findOne({ email, tenantId: companyId });
  if (existingUser) {
    const err = new Error('A user with this email already exists in this workspace');
    err.statusCode = 409;
    throw err;
  }

  // 3. Check AuthLookup (global email uniqueness)
  const existingLookup = await AuthLookup.findOne({ email });
  if (existingLookup && String(existingLookup.tenantId) !== String(companyId)) {
    const err = new Error('This email is already registered in another workspace');
    err.statusCode = 409;
    throw err;
  }

  // 4. Generate or use provided password
  const rawPassword = (invitationData.password && invitationData.password.trim().length >= 6)
    ? invitationData.password.trim()
    : generatePassword(12);
  const passwordHash = await hashPassword(rawPassword);

  // 5. Get workspace to attach membership
  let workspace = await Workspace.findOne({ tenantId: companyId });
  if (!workspace) {
    // Fallback: get the first available workspace in this tenant database
    workspace = await Workspace.findOne({});
  }

  if (!workspace) {
    // Last resort: Create a default workspace if none exists at all
    workspace = await Workspace.create({
      tenantId: companyId,
      name: 'Main Workspace',
      slug: 'main-' + crypto.randomBytes(3).toString('hex'),
    });
  }

  // 6. Create User record
  const user = new User({
    tenantId: companyId,
    name: invitationData.name || email.split('@')[0],
    email,
    passwordHash,
    role: invitationData.role,
    userType: 'client',
    clientId: client._id,
    isActive: true,
  });
  await user.save();

  // 7. Create/update AuthLookup for email-based login discovery
  const lookupResult = await AuthLookup.updateOne(
    { email },
    { $set: { email, tenantId: companyId } },
    { upsert: true }
  );
  console.log(`[ClientService] AuthLookup updated for "${email}". Result:`, lookupResult);

  // 8. Create Membership so login doesn't fail on "No active workspace"
  await Membership.updateOne(
    { userId: user._id, workspaceId: workspace._id },
    {
      $set: {
        tenantId: companyId,
        workspaceId: workspace._id,
        userId: user._id,
        role: invitationData.role,
        status: 'active',
      },
    },
    { upsert: true }
  );

  // 9. Return credentials (admin shows these to the client)
  return {
    userId: String(user._id),
    email,
    password: rawPassword,
    role: invitationData.role,
    clientId: String(client._id),
    companyName: client.companyName,
  };
}

// ─── Project Assignment ───────────────────────────────────────────────────────

export async function assignProjectsToClient({ companyId, clientId, projectIds }) {
  const { Client, Project } = await getTenantModels(companyId);

  await Project.updateMany(
    { _id: { $in: projectIds }, tenantId: companyId },
    { $set: { clientId, visibleToClient: true } }
  );

  return Client.findOneAndUpdate(
    { _id: clientId, tenantId: companyId },
    { $addToSet: { assignedProjectIds: { $each: projectIds } } },
    { new: true }
  );
}
