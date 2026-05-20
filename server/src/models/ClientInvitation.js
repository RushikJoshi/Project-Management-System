import mongoose from 'mongoose';

const clientInvitationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, required: true, enum: ['CLIENT_ADMIN', 'CLIENT_MANAGER', 'CLIENT_REVIEWER', 'CLIENT_VIEWER'] },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending', index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }], // Specific projects for this user
  },
  { timestamps: true }
);

clientInvitationSchema.index({ token: 1 });
clientInvitationSchema.index({ email: 1, status: 1 });

clientInvitationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.token; // Sensitive
    return ret;
  },
});

export function getClientInvitationModel(conn) {
  return conn.models.ClientInvitation || conn.model('ClientInvitation', clientInvitationSchema);
}

export { clientInvitationSchema };
