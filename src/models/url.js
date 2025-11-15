const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  shortCode: { type: String, unique: true, index: true }, // the short ID (ex: aZ59Bc)
  originalUrl: { type: String, required: true },          // the long URL
  ownerId: { type: mongoose.Schema.Types.ObjectId, default: null }, // for future user login
  customAlias: { type: String, default: null },           // if user wants custom alias
  createdAt: { type: Date, default: Date.now },           // creation time
  expiresAt: { type: Date, default: null },               // optional: auto-delete feature
  clicks: { type: Number, default: 0 },                   // count clicks
  lastVisited: { type: Date, default: null },             // last time someone clicked
});

module.exports = mongoose.model('Url', urlSchema);
