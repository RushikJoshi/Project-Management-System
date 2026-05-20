import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    clientCode: { type: String, required: true, trim: true, maxlength: 50 },
    clientSlug: { type: String, required: true, trim: true, maxlength: 100 },
    
    // Contact Info
    contactPerson: { type: String, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30 },
    website: { type: String, trim: true, maxlength: 500 },
    industry: { type: String, trim: true, maxlength: 120 },
    
    // Address & Tax
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    taxId: { type: String, trim: true, maxlength: 80 }, // GST/VAT
    
    // Status & Settings
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active', index: true },
    clientType: { type: String, enum: ['enterprise', 'individual', 'partner'], default: 'enterprise' },
    logo: { type: String, trim: true, maxlength: 2048 },
    timezone: { type: String, default: 'UTC' },
    notes: { type: String, trim: true, maxlength: 5000 },
    
    // Access Control
    assignedProjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  },
  { timestamps: true }
);

// Compound unique indexes — scoped per tenant so different tenants can have same codes
clientSchema.index({ tenantId: 1, clientCode: 1 }, { unique: true });
clientSchema.index({ tenantId: 1, clientSlug: 1 }, { unique: true });
clientSchema.index({ tenantId: 1, companyName: 1 });

clientSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    return ret;
  },
});

export function getClientModel(conn) {
  return conn.models.Client || conn.model('Client', clientSchema);
}

export { clientSchema };
