const SpeedTest = require('../models/SpeedTest');
const axios = require('axios');
const { performance } = require('perf_hooks');
const SSE = require('express-sse');
const ping = require('ping');
const dns = require('dns').promises;


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

 // Quick estimate for download speed
exports.quickEstimate = async (req, res) => {
  const fileUrl = 'http://ipv4.download.thinkbroadband.com/2MB.zip'; 
  const iterations = 5;
  let totalSpeed = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      const startTime = performance.now();

      await axios.get(fileUrl, {
        responseType: 'stream',
      });

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; 
      const fileSizeMb = 1; 

      const speedMbps = (fileSizeMb * 8) / duration;
      totalSpeed += speedMbps;
    } catch (error) {
      console.error('Error during quick estimate:', error);
      res.status(500).json({ error: 'Error during quick estimate' });
      return;
    }
  }

  const averageSpeed = totalSpeed / iterations;
  res.json({ estimatedSpeed: averageSpeed.toFixed(2) });
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
  const host = 'www.google.com';
  const iterations = 30;
  const icmpTimeout = 2; 
  const dnsTimeout = 2000;
  const maxRetries = 3;

  const pingHost = async () => {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        const result = await ping.promise.probe(host, { timeout: icmpTimeout });
        if (result.alive && result.time !== undefined) {
          return result.time;
        }
      } catch (error) {
        console.error(`ICMP ping error: ${error.message}`);
      }
      attempts++;
    }
    return null;
  };

  const dnsLookup = async () => {
    let attempts = 0;
    while (attempts < maxRetries) {
      const startTime = performance.now();
      try {
        await dns.lookup(host, { all: true, timeout: dnsTimeout });
        const endTime = performance.now();
        return endTime - startTime;
      } catch (error) {
        console.error(`DNS lookup error: ${error.message}`);
      }
      attempts++;
    }
    return null;
  };

  try {
    let pingTimes = [];

    for (let i = 0; i < iterations / 2; i++) {
      const pingTime = await pingHost();
      if (pingTime !== null) {
        pingTimes.push(pingTime);
      }
    }

    for (let i = 0; i < iterations / 2; i++) {
      const dnsTime = await dnsLookup();
      if (dnsTime !== null) {
        pingTimes.push(dnsTime);
      }
    }

    if (pingTimes.length > 0) {
      pingTimes.sort((a, b) => a - b);

      const trimCount = Math.floor(pingTimes.length * 0.1);
      pingTimes = pingTimes.slice(trimCount, pingTimes.length - trimCount);

      const medianIndex = Math.floor(pingTimes.length / 2);
      const medianPing = (pingTimes.length % 2 === 0)
        ? (pingTimes[medianIndex - 1] + pingTimes[medianIndex]) / 2
        : pingTimes[medianIndex];

      res.json({ ping: medianPing.toFixed(2) });
    } else {
      res.status(500).json({ error: 'No valid ping responses' });
    }
  } catch (error) {
    console.error('Error during ping test:', error);
    res.status(500).json({ error: 'Error during ping test' });
  }
};