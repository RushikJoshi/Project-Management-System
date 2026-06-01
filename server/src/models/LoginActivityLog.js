import mongoose from 'mongoose';

const loginActivityLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userName: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    role: { type: String, trim: true, maxlength: 50 },
    loginType: { 
      type: String, 
      required: true, 
      enum: ['Email Password', 'Google Login', 'Microsoft Login', 'SSO', 'OTP Login'], 
      default: 'Email Password' 
    },
    status: { 
      type: String, 
      required: true, 
      enum: ['Success', 'Failed', 'Logged Out', 'Session Expired'], 
      index: true 
    },
    ipAddress: { type: String, trim: true, maxlength: 50 },
    deviceType: { type: String, enum: ['Desktop', 'Mobile', 'Tablet'], default: 'Desktop' },
    browser: { type: String, trim: true, maxlength: 100 },
    operatingSystem: { type: String, trim: true, maxlength: 100 },
    userAgent: { type: String, trim: true, maxlength: 500 },
    location: { type: String, trim: true, maxlength: 200, default: 'Unknown' },
    sessionId: { type: String, trim: true, index: true },
    tokenId: { type: String, trim: true },
    loginTime: { type: Date, default: Date.now, index: true },
    logoutTime: { type: Date },
    sessionDuration: { type: Number }, // In seconds
    failureReason: { type: String, trim: true, maxlength: 500 },
    isSuspicious: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

loginActivityLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    if (ret.userId) ret.userId = String(ret.userId);
    if (ret.tenantId) ret.tenantId = String(ret.tenantId);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export function getLoginActivityLogModel(conn) {
  return conn.models.LoginActivityLog || conn.model('LoginActivityLog', loginActivityLogSchema);
}

export { loginActivityLogSchema };
