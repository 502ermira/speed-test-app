const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const compression = require('compression');
const speedTestRoutes = require('./routes/speedTestRoutes');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('Connection error:', error);
});

app.use(cors());
app.use(express.json());
app.use(compression());

app.use('/speedtests', speedTestRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
