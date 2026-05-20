import mongoose from 'mongoose';

const customPermissionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    module: { type: String, required: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

customPermissionSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export function getCustomPermissionModel(conn) {
  return conn.models.CustomPermission || conn.model('CustomPermission', customPermissionSchema);
}

export { customPermissionSchema };
