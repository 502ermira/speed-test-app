const mongoose = require('mongoose');

const SpeedTestSchema = new mongoose.Schema({
  downloadSpeed: Number,
  uploadSpeed: Number,
  ping: Number,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SpeedTest', SpeedTestSchema);
