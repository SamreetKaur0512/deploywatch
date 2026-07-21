const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    platform: {
      type: String,
      enum: ['Vercel', 'Render', 'Netlify', 'Heroku', 'GitHub Pages', 'Railway', 'Cyclic', 'Other'],
      required: [true, 'Platform is required'],
    },
    liveUrl: {
      type: String,
      required: [true, 'Live URL is required'],
      trim: true,
    },
    githubUrl: {
      type: String,
      trim: true,
      default: '',
    },
    techStack: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'checking', 'down', 'unknown'],
      default: 'unknown',
    },
    lastChecked: { type: Date, default: null },
    responseTime: { type: Number, default: null },
    totalViews:   { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    trackingEnabled: { type: Boolean, default: true },
    trackingId: { type: String, unique: true, sparse: true },

    // Public key (SPKI, base64) for end-to-end encrypting visitor name/email
    // captured by the tracking script. Safe to store as plaintext — that's the
    // point of a public key. The matching private key is generated in the
    // developer's own browser and is NEVER sent to or stored by DeployWatch;
    // only the developer can decrypt visitor identities encrypted with this key.
    visitorEncryptionPublicKey: { type: String, default: '' },

    // Encrypted credentials (ciphertext only — server never stores plain values)
    encryptedMongoUri:       { type: String, default: '', select: false },
    encryptedGithubToken:    { type: String, default: '', select: false },
    encryptedVercelToken:    { type: String, default: '', select: false },
    // MySQL / PostgreSQL
    encryptedDbUri:          { type: String, default: '', select: false },
    // Firebase — service account JSON
    encryptedFirebaseCreds:  { type: String, default: '', select: false },
    // Supabase
    encryptedSupabaseUrl:    { type: String, default: '', select: false },
    encryptedSupabaseKey:    { type: String, default: '', select: false },
    // SQLite — file path (relative to project root)
    encryptedSQLitePath:     { type: String, default: '', select: false },

    // Boolean flags
    hasMongoUri:        { type: Boolean, default: false },
    hasGithubToken:     { type: Boolean, default: false },
    hasVercelToken:     { type: Boolean, default: false },
    hasDbCredentials:   { type: Boolean, default: false },

    // Collection name in developer's DB (default 'users')
    userCollection: { type: String, default: 'users' },

    // Language of the project (for showing correct tracking script)
    language: {
      type: String,
      enum: ['react', 'vue', 'angular', 'html', 'php', 'python', 'nodejs', 'next', 'nuxt', 'other'],
      default: 'react',
    },

    // Database type (for user management)
    dbType: {
      type: String,
      enum: ['mongodb', 'mysql', 'postgresql', 'firebase', 'supabase', 'sqlite', 'none'],
      default: 'none',
    },
  },
  { timestamps: true }
);

projectSchema.pre('save', function (next) {
  if (!this.trackingId) {
    this.trackingId = `dw_${this._id.toString()}`;
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
