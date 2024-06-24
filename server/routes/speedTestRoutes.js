const express = require('express');
const router = express.Router();
const speedTestController = require('../controllers/speedTestController');

router.get('/', speedTestController.getSpeedTests);
router.post('/', speedTestController.addSpeedTest);
router.get('/download', speedTestController.downloadFile);
router.post('/upload', speedTestController.uploadFile);
router.get('/ping', speedTestController.ping);
router.get('/events', speedTestController.sse);
router.get('/quick-estimate', speedTestController.quickEstimate);

module.exports = router;
