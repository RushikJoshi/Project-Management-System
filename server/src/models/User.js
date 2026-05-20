import mongoose from 'mongoose';

const roles = ['super_admin', 'admin', 'manager', 'team_leader', 'team_member', 'CLIENT_ADMIN', 'CLIENT_MANAGER', 'CLIENT_REVIEWER', 'CLIENT_VIEWER'];
const userTypes = ['internal', 'client'];

const userSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    employeeId: { type: String, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    userType: { type: String, enum: userTypes, default: 'internal', index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
    role: { type: String, enum: roles, required: true, default: 'team_member' },
    roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    customPermissions: [{ type: String }],
    deniedPermissions: [{ type: String }],
    isSuperAdmin: { type: Boolean, default: false },
    jobTitle: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 2000 },
    department: { type: String, trim: true, maxlength: 120 },
    avatar: { type: String, trim: true, maxlength: 2048 },
    isActive: { type: Boolean, default: true },
    canUsePrivateQuickTasks: { type: Boolean, default: false },
    color: { type: String, trim: true, maxlength: 32 },
    preferences: {
      notifications: {
        taskAssigned: { type: Boolean, default: true },
        taskCompleted: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        deadlines: { type: Boolean, default: true },
        projectUpdates: { type: Boolean, default: false },
        weeklyDigest: { type: Boolean, default: true },
        emailNotifs: { type: Boolean, default: true },
        pushNotifs: { type: Boolean, default: false },
      },
      appearance: {
        theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
        density: { type: String, enum: ['compact', 'default', 'comfortable'], default: 'default' },
      },
      locale: {
        language: { type: String, default: 'English (US)' },
        timezone: { type: String, default: 'UTC+0 (GMT)' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' },
        weekStartsOn: { type: String, default: 'Monday' },
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index(
  { tenantId: 1, employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { employeeId: { $type: 'string' } }
  }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

export function getUserModel(conn) {
  return conn.models.User || conn.model('User', userSchema);
}

export { userSchema };

