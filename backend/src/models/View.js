const mongoose = require('mongoose');

const viewSchema = new mongoose.Schema(
  {
    project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    projectOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Visitor info
    ipAddress:  { type: String, default: 'unknown' },
    country:    { type: String, default: 'Unknown' },
    city:       { type: String, default: 'Unknown' },
    device:     { type: String, enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'], default: 'Unknown' },
    browser:    { type: String, default: 'Unknown' },

    // Unique visitor tracking
    // isUniqueVisitor = true if this IP has NEVER visited this project before
    isUniqueVisitor: { type: Boolean, default: false },

    // Logged-in visitor identity
    visitorName:  { type: String, default: '' },
    visitorEmail: { type: String, default: '' },

    // UTM / Referrer
    referrer:    { type: String, default: '' },
    utmSource:   { type: String, default: '' },
    utmMedium:   { type: String, default: '' },
    isRecruiter: { type: Boolean, default: false },
    viewedAt:    { type: Date, default: Date.now },
  },
  { timestamps: false }
);

viewSchema.index({ project: 1, viewedAt: -1 });
viewSchema.index({ projectOwner: 1, viewedAt: -1 });
viewSchema.index({ project: 1, ipAddress: 1, viewedAt: -1 }); // fast unique / recent duplicate check

module.exports = mongoose.model('View', viewSchema);
