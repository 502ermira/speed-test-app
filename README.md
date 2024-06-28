# Internet Speed Test Application

## Overview

This project is an internet speed test application that measures download speed, upload speed, and ping. The backend is built with Node.js and Express, while the frontend is a React application. The backend communicates with MongoDB for data storage and uses SSE (Server-Sent Events) to stream data to the frontend in real-time.

## Features

- **Download Speed Test**: Measures the download speed by downloading a test file.
- **Upload Speed Test**: Measures the upload speed by uploading a test file.
- **Ping Test**: Measures the latency to a specified host (google).
- **Quick Estimate**: Provides a quick estimate of the download speed.
- **Real-Time Updates**: Uses Server-Sent Events to update the frontend in real-time.

## Technologies Used

- Backend: Node.js, Express, Mongoose, Axios, Ping, DNS, SSE
- Frontend: React, React-D3-Speedometer, GSAP
- Database: MongoDB

## Installation

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/502ermira/speed-test-app.git
   cd speed-test-app/server
   ```
2. Install dependencies:
  ```bash
   npm install
```
3. Create a `.env` file in the backend directory and add your MongoDB URI:
  ```bash
  MONGO_URI=your_mongo_uri
```
4. Start the backend server:
  ```bash
  node index.js
 ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the frontend directory and add your API base URL:
   ```bash
  REACT_APP_API_BASE_URL=http://localhost:5000/speedtests 
  ```
4. Start the frontend development server:
   ```bash
   npm start
```

## Usage

1. Ensure both the backend and frontend servers are running.
2. Open your web browser and navigate to http://localhost:3000.
3. Click the "GO" button to start the speed test.
4. View the results including download speed, upload speed, and ping.




