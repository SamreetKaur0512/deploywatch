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
    // Plaintext fields — used only when the project has NOT set up encryption keys.
    visitorName:  { type: String, default: '' },
    visitorEmail: { type: String, default: '' },
    sessionId:    { type: String, default: '' },

    // Persistent visitor identifier (first-party cookie DeployWatch itself sets,
    // separate from the developer's own login/session). Lets a returning visitor
    // be recognized across days/sessions even when the developer's project uses
    // cookie-based auth and never exposes identity via localStorage again.
    uid: { type: String, default: '' },

    // End-to-end encrypted visitor identity (base64 ciphertext). Encrypted in the
    // visitor's browser using the project's public key — DeployWatch's backend
    // never sees the plaintext and cannot decrypt this; only the developer,
    // holding the matching private key, can. Used instead of visitorName/
    // visitorEmail once a project has encryption keys set up.
    encryptedVisitorData: { type: String, default: '' },

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
viewSchema.index({ project: 1, sessionId: 1, viewedAt: -1 }); // fast session-based deduplication
viewSchema.index({ project: 1, uid: 1, viewedAt: -1 }); // fast lookup of a returning visitor's last known encrypted identity

module.exports = mongoose.model('View', viewSchema);
