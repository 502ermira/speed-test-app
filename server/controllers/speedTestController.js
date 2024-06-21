const SpeedTest = require('../models/SpeedTest');
const axios = require('axios');
const ping = require('ping');
const multer = require('multer');
const { performance } = require('perf_hooks');

const upload = multer().single('file');

exports.getSpeedTests = async (req, res) => {
  try {
    const tests = await SpeedTest.find();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addSpeedTest = async (req, res) => {
  const { downloadSpeed, uploadSpeed, ping } = req.body;

  const newTest = new SpeedTest({
    downloadSpeed,
    uploadSpeed,
    ping,
    date: new Date()
  });

  try {
    const savedTest = await newTest.save();
    res.status(201).json(savedTest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Download test
exports.downloadFile = async (req, res) => {
  const fileUrl = 'http://ipv4.download.thinkbroadband.com/100MB.zip'; // A large file

  const startTime = Date.now();

  try {
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const fileSize = parseInt(response.headers['content-length'], 10); // size in bytes
    let downloadedSize = 0;

    response.data.on('data', (chunk) => {
      downloadedSize += chunk.length;
    });

    response.data.on('end', () => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // duration in seconds
      const speedMbps = (downloadedSize * 8) / (duration * 1024 * 1024); // speed in Mbps
      res.json({ downloadSpeed: speedMbps.toFixed(2) });
    });

    response.data.on('error', (err) => {
      console.error('Error during download:', err);
      res.status(500).send('Error during download');
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
};

// Upload speed test
exports.uploadFile = (req, res) => {
  const startTime = performance.now();
  upload(req, res, (err) => {
    if (err) {
      return res.status(500).json({ message: 'Upload failed' });
    }
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000; // duration in seconds
    const fileSize = req.file.size; // size in bytes
    const speedMbps = (fileSize * 8) / (duration * 1024 * 1024); // speed in Mbps
    res.json({ uploadSpeed: speedMbps.toFixed(2) });
  });
};

// Ping test
exports.ping = async (req, res) => {
  const host = '8.8.8.8'; // Google DNS server for reliable ping

  try {
    const pingResult = await ping.promise.probe(host, { timeout: 2 });
    res.json({ ping: pingResult.time });
  } catch (error) {
    console.error('Error during ping test:', error);
    res.status(500).send('Error during ping test');
  }
};
