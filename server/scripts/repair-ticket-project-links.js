import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import Company from '../src/models/Company.js';
import { getTenantModels } from '../src/config/tenantDb.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const write = process.argv.includes('--write');

function rawId(value) {
  if (!value) return '';
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
}

async function resolveProjectId(Project, ticket) {
  const current = rawId(ticket.projectId);
  if (mongoose.Types.ObjectId.isValid(current)) {
    const project = await Project.findById(current).select('_id').lean();
    return project?._id || null;
  }

  const legacyProjectKey = current || ticket.project || ticket.projectName || ticket.projectCode || '';
  if (!legacyProjectKey) return null;

  const project = await Project.findOne({
    $or: [
      { name: legacyProjectKey },
      { projectCode: legacyProjectKey },
    ],
  }).select('_id').lean();

  return project?._id || null;
}

async function main() {
  await connectDB();
  const companies = await Company.find({}).select('_id name organizationId').lean();
  let scanned = 0;
  let repaired = 0;
  let unresolved = 0;

  for (const company of companies) {
    const { Ticket, Project } = await getTenantModels(company._id);
    const tickets = await Ticket.collection.find({}).toArray();
    for (const ticket of tickets) {
      scanned += 1;
      const current = rawId(ticket.projectId);
      const validCurrent = current && mongoose.Types.ObjectId.isValid(current);
      if (validCurrent) {
        const exists = await Project.exists({ _id: current });
        if (exists) continue;
      }

      const repairedProjectId = await resolveProjectId(Project, ticket);
      if (!repairedProjectId) {
        unresolved += 1;
        console.warn('[unresolved]', {
          companyId: String(company._id),
          ticketId: String(ticket._id),
          ticketNo: ticket.ticketId,
          projectId: ticket.projectId,
          project: ticket.project,
          projectName: ticket.projectName,
          projectCode: ticket.projectCode,
        });
        continue;
      }

      repaired += 1;
      console.log(write ? '[repair]' : '[dry-run repair]', {
        companyId: String(company._id),
        ticketId: String(ticket._id),
        ticketNo: ticket.ticketId,
        from: ticket.projectId,
        to: String(repairedProjectId),
      });

      if (write) {
        await Ticket.collection.updateOne(
          { _id: ticket._id },
          {
            $set: { projectId: repairedProjectId },
            $push: {
              activities: {
                action: 'PROJECT_LINK_REPAIRED',
                details: { from: ticket.projectId, to: String(repairedProjectId) },
                createdAt: new Date(),
              },
            },
          }
        );
      }
    }
  }

  console.log({ scanned, repaired, unresolved, mode: write ? 'write' : 'dry-run' });
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
