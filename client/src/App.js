import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [speedTests, setSpeedTests] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:5000/speedtests')
      .then(response => {
        setSpeedTests(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the data!', error);
      });
  }, []);

  const runSpeedTest = async () => {
    setIsTesting(true);
    try {
      // Measure download speed
      const downloadResponse = await axios.get('http://localhost:5000/speedtests/download');
      const downloadSpeed = downloadResponse.data.downloadSpeed;

      // Measure upload speed
      const formData = new FormData();
      const blob = new Blob([new ArrayBuffer(10 * 1024 * 1024)]); // Create a 10 MB blob for more accurate testing
      formData.append('file', blob);
      const uploadResponse = await axios.post('http://localhost:5000/speedtests/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const uploadSpeed = uploadResponse.data.uploadSpeed;

      // Measure ping
      const pingResponse = await axios.get('http://localhost:5000/speedtests/ping');
      const ping = pingResponse.data.ping;

      // Save result
      const result = {
        downloadSpeed,
        uploadSpeed,
        ping,
        date: new Date().toLocaleString()
      };

      setTestResult(result);

      // Optionally, send the result to the server
      await axios.post('http://localhost:5000/speedtests', result);
    } catch (error) {
      console.error('Error running speed test:', error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Internet Speed Tests</h1>
        <button onClick={runSpeedTest} disabled={isTesting}>
          {isTesting ? 'Testing...' : 'Run Speed Test'}
        </button>
        {testResult && (
          <div>
            <p>Download: {testResult.downloadSpeed} Mbps</p>
            <p>Upload: {testResult.uploadSpeed} Mbps</p>
            <p>Ping: {testResult.ping} ms</p>
            <p>Date: {testResult.date}</p>
          </div>
        )}
        {speedTests.length > 0 ? (
          <ul>
            {speedTests.map(test => (
              <li key={test._id}>
                Download: {test.downloadSpeed} Mbps, Upload: {test.uploadSpeed} Mbps, Ping: {test.ping} ms, Date: {new Date(test.date).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>No speed tests available</p>
        )}
      </header>
    </div>
  );
}

export default App;
