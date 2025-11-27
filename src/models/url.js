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
    required: true,
    trim: true
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  customAlias: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  qrCode: {
    type: String // Base64 encoded QR code
  },
  clicks: {
    type: Number,
    default: 0
  },
  clickDetails: [clickSchema],
  customDomain: {
    type: String,
    trim: true
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
    trim: true
  }],
  metadata: {
    title: String,
    description: String,
    image: String
  },
  createdBy: {
    type: String, // IP address or user ID
    required: true
  },
  lastAccessed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
urlSchema.index({ createdBy: 1, createdAt: -1 });
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
urlSchema.index({ isActive: 1 });
urlSchema.index({ customDomain: 1, shortCode: 1 });

// Virtual for full short URL
urlSchema.virtual('shortUrl').get(function() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/${this.shortCode}`;
});

// Method to record a click with analytics
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

// Static method to get analytics summary
urlSchema.statics.getAnalyticsSummary = async function(shortCode) {
  const url = await this.findOne({ shortCode });
  
  if (!url) return null;
  
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const recentClicks = url.clickDetails.filter(
    click => click.timestamp >= last7Days
  );
  
  // Group by date
  const clicksByDate = recentClicks.reduce((acc, click) => {
    const date = click.timestamp.toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  
  // Group by country
  const clicksByCountry = recentClicks.reduce((acc, click) => {
    if (click.country) {
      acc[click.country] = (acc[click.country] || 0) + 1;
    }
    return acc;
  }, {});
  
  // Group by device
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

// Ensure virtual fields are serialized
urlSchema.set('toJSON', { virtuals: true });
urlSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('url', urlSchema);