import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactSpeedometer from 'react-d3-speedometer';
import './App.css';

function App() {
  const [speedTests, setSpeedTests] = useState([]);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [ping, setPing] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [testDate, setTestDate] = useState(null); // State to hold the test initiation date

  useEffect(() => {
    axios.get('http://localhost:5000/speedtests')
      .then(response => {
        setSpeedTests(response.data);
      })
      .catch(error => {
        console.error('Error fetching speed tests:', error);
      });
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:5000/speedtests/events');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.downloadSpeed !== undefined) {
        const parsedDownloadSpeed = parseFloat(data.downloadSpeed);
        if (!isNaN(parsedDownloadSpeed)) {
          setDownloadSpeed(parsedDownloadSpeed);
        }
      }
      if (data.done) {
        setDownloadComplete(true);
      }
    };
    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      setIsTesting(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const runSpeedTest = async () => {
    setIsTesting(true);
    setDownloadComplete(false);
    setDownloadSpeed(0);
    setUploadSpeed(0);
    setPing(0);

    const testStartDate = new Date().toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
    setTestDate(testStartDate);

    try {
      // Measure ping
      const pingResponse = await axios.get('http://localhost:5000/speedtests/ping');
      setPing(pingResponse.data.ping);

      // Measure download speed
      const downloadResponse = await axios.get('http://localhost:5000/speedtests/download');
      const parsedDownloadSpeed = parseFloat(downloadResponse.data.downloadSpeed);
      if (!isNaN(parsedDownloadSpeed)) {
        setDownloadSpeed(parsedDownloadSpeed);
      }

      // Measure upload speed
      const formData = new FormData();
      const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)]);
      formData.append('file', blob);

      const uploadResponse = await axios.post('http://localhost:5000/speedtests/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
      });
      const parsedUploadSpeed = parseFloat(uploadResponse.data.uploadSpeed);
      if (!isNaN(parsedUploadSpeed)) {
        setUploadSpeed(parsedUploadSpeed);
      }

      const result = {
        downloadSpeed: parsedDownloadSpeed,
        uploadSpeed: parsedUploadSpeed,
        ping: pingResponse.data.ping,
        date: testStartDate 
      };

      await axios.post('http://localhost:5000/speedtests', result);
      setSpeedTests((prevTests) => [...prevTests, result]);
    } catch (error) {
      console.error('Error running speed test:', error);
    } finally {
      if (downloadComplete && uploadSpeed > 0) {
        setIsTesting(false);
      }
    }
  };

  useEffect(() => {
    if (downloadComplete && uploadSpeed > 0) {
      setIsTesting(false);
    }
  }, [downloadComplete, uploadSpeed]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Internet Speed Tests</h1>
        <button className="speed-test-button" onClick={runSpeedTest} disabled={isTesting}>
          {isTesting ? 'Testing...' : 'Run Speed Test'}
        </button>
        <div className="speedometer-container">
          <ReactSpeedometer
            value={downloadSpeed}
            minValue={0}
            maxValue={100}
            needleColor="#666"
            startColor='#6e4c3e'
            segments={10}
            endColor='#9a7c67'
            currentValueText={`Download Speed: ${downloadSpeed.toFixed(2)} Mbps`}
            ringWidth={30}
            needleTransitionDuration={200}
            needleHeightRatio={0.7} 
          />
        </div>
        <div className="speed-test-results">
          {testDate && <p>{`Test initiated at: ${testDate}`}</p>}
          <p>{`Ping: ${ping} ms`}</p>
          <p>{`Upload Speed: ${uploadSpeed.toFixed(2)} Mbps`}</p>
        </div>
        {speedTests.length > 0 ? (
          <ul className="speed-test-list">
            {speedTests.map(test => (
              <li key={test._id}>
                <span>Download:</span> {test.downloadSpeed} Mbps, <span>Upload:</span> {test.uploadSpeed} Mbps, <span>Ping:</span> {test.ping} ms, <span>Date:</span> {new Date(test.date).toLocaleString()}
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
