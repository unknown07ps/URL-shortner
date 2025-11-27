const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  referer: String,
  country: String,
  city: String,
  device: String,
  browser: String,
  os: String
});

const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: [true, 'Original URL is required'],
    trim: true,
    validate: {
      validator: function(v) {
        try {
          const url = new URL(v);
          return ['http:', 'https:'].includes(url.protocol);
        } catch (e) {
          return false;
        }
      },
      message: 'Invalid URL format. Must be http or https.'
    }
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    minlength: [3, 'Short code must be at least 3 characters'],
    maxlength: [20, 'Short code cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Short code can only contain letters, numbers, hyphens and underscores']
  },
  customAlias: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
    minlength: [3, 'Custom alias must be at least 3 characters'],
    maxlength: [50, 'Custom alias cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Custom alias can only contain letters, numbers, hyphens and underscores']
  },
  qrCode: {
    type: String
  },
  clicks: {
    type: Number,
    default: 0,
    min: 0
  },
  clickDetails: [clickSchema],
  customDomain: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
        return domainRegex.test(v);
      },
      message: 'Invalid domain format'
    }
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  metadata: {
    title: String,
    description: String,
    image: String
  },
  createdBy: {
    type: String,
    required: true
  },
  lastAccessed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

urlSchema.index({ createdBy: 1, createdAt: -1 });
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
urlSchema.index({ isActive: 1 });
urlSchema.index({ customDomain: 1, shortCode: 1 });
urlSchema.index({ tags: 1 });

urlSchema.virtual('shortUrl').get(function() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/${this.shortCode}`;
});

urlSchema.methods.recordClick = async function(clickData) {
  this.clicks += 1;
  this.lastAccessed = new Date();
  
  if (clickData) {
    this.clickDetails.push({
      timestamp: new Date(),
      ipAddress: clickData.ipAddress,
      userAgent: clickData.userAgent,
      referer: clickData.referer,
      country: clickData.country,
      city: clickData.city,
      device: clickData.device,
      browser: clickData.browser,
      os: clickData.os
    });
  }
  
  return await this.save();
};

urlSchema.statics.getAnalyticsSummary = async function(shortCode) {
  const url = await this.findOne({ shortCode });
  
  if (!url) return null;
  
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const recentClicks = url.clickDetails.filter(
    click => click.timestamp >= last7Days
  );
  
  const clicksByDate = recentClicks.reduce((acc, click) => {
    const date = click.timestamp.toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  
  const clicksByCountry = recentClicks.reduce((acc, click) => {
    if (click.country) {
      acc[click.country] = (acc[click.country] || 0) + 1;
    }
    return acc;
  }, {});
  
  const clicksByDevice = recentClicks.reduce((acc, click) => {
    if (click.device) {
      acc[click.device] = (acc[click.device] || 0) + 1;
    }
    return acc;
  }, {});
  
  return {
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    totalClicks: url.clicks,
    last7DaysClicks: recentClicks.length,
    clicksByDate,
    clicksByCountry,
    clicksByDevice,
    createdAt: url.createdAt,
    lastAccessed: url.lastAccessed
  };
};

urlSchema.set('toJSON', { virtuals: true });
urlSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('url', urlSchema);