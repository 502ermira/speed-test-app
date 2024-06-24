const SpeedTest = require('../models/SpeedTest');
const axios = require('axios');
const { performance } = require('perf_hooks');
const SSE = require('express-sse');
const ping = require('ping');

const sse = new SSE();

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
  const fileUrl = 'http://ipv4.download.thinkbroadband.com/100MB.zip';

  try {
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const fileSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;
    const startTime = performance.now();

    response.data.on('data', (chunk) => {
      downloadedSize += chunk.length;
      const currentTime = performance.now();
      const duration = (currentTime - startTime) / 1000;
      const speedMbps = (downloadedSize * 8) / (duration * 1024 * 1024);
      sse.send({ downloadSpeed: speedMbps.toFixed(2) });
    });

    response.data.on('end', () => {
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const speedMbps = (downloadedSize * 8) / (duration * 1024 * 1024);
      sse.send({ downloadSpeed: speedMbps.toFixed(2), done: true });
      res.status(200).end();
    });

    response.data.on('error', (err) => {
      console.error('Error during download:', err);
      sse.send({ error: 'Error during download' });
      res.status(500).end();
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    sse.send({ error: 'Error downloading file' });
    res.status(500).end();
  }
};

exports.sse = (req, res) => {
  sse.init(req, res);
};

exports.quickEstimate = async (req, res) => {
  const fileUrl = 'http://ipv4.download.thinkbroadband.com/10MB.zip';

  try {
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const fileSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;
    const startTime = performance.now();

    response.data.on('data', (chunk) => {
      downloadedSize += chunk.length;
      const currentTime = performance.now();
      const duration = (currentTime - startTime) / 1000;
      const speedMbps = (downloadedSize * 8) / (duration * 1024 * 1024);
      if (duration >= 1) {
        response.data.destroy(); 
        res.json({ estimatedSpeed: speedMbps.toFixed(2) });
      }
    });

    response.data.on('error', (err) => {
      console.error('Error during quick estimate:', err);
      res.status(500).json({ message: 'Error during quick estimate' });
    });
  } catch (error) {
    console.error('Error downloading file for quick estimate:', error);
    res.status(500).json({ message: 'Error downloading file for quick estimate' });
  }
};


// Upload speed test
exports.uploadFile = async (req, res) => {
  const startTime = performance.now();

  try {
    const fileUrl = 'http://ipv4.download.thinkbroadband.com/100MB.zip';
    const response = await axios.get(fileUrl, { responseType: 'stream' });

    let uploadedSize = 0;

    response.data.on('data', (chunk) => {
      uploadedSize += chunk.length;
      const currentTime = performance.now();
      const duration = (currentTime - startTime) / 1000;
      const speedMbps = (uploadedSize * 8) / (duration * 1024 * 1024);
      sse.send({ uploadSpeed: speedMbps.toFixed(2) });
    });

    response.data.on('end', () => {
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const speedMbps = (uploadedSize * 8) / (duration * 1024 * 1024);
      sse.send({ uploadSpeed: speedMbps.toFixed(2), done: true });
      res.status(200).json({ uploadSpeed: speedMbps.toFixed(2) });
    });

    response.data.on('error', (err) => {
      console.error('Error during upload:', err);
      sse.send({ error: 'Error during upload' });
      res.status(500).send('Error during upload');
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    sse.send({ error: 'Error uploading file' });
    res.status(500).send('Error uploading file');
  }
};

// Ping test
exports.ping = async (req, res) => {
  const host = 'google.com';
  const attempts = 16;
  let totalPing = 0;

  try {
    for (let i = 0; i < attempts; i++) {
      const response = await ping.promise.probe(host);
      if (response && response.time !== undefined) {
        totalPing += response.time;
      } else {
        throw new Error('Error calculating ping');
      }
    }

    const averagePing = totalPing / attempts;
    res.json({ ping: averagePing.toFixed(2) });
  } catch (error) {
    console.error('Error pinging:', error);
    res.status(500).send('Error pinging');
  }
};