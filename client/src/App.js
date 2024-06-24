import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactSpeedometer from 'react-d3-speedometer';
import './App.css';

function App() {
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [ping, setPing] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [testDate, setTestDate] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [downloadResult, setDownloadResult] = useState(0);

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
      if (data.uploadSpeed !== undefined) {
        const parsedUploadSpeed = parseFloat(data.uploadSpeed);
        if (!isNaN(parsedUploadSpeed)) {
          setUploadSpeed(parsedUploadSpeed);
        }
      }
      if (data.done) {
        if (data.downloadSpeed !== undefined) {
          setDownloadComplete(true);
          setDownloadResult(data.downloadSpeed); 
          setIsTransitioning(true);
          setTimeout(() => {
            setIsTransitioning(false);
            setDownloadSpeed(0);
            setTimeout(startUploadSpeedTest, 1000);
          }, 2000);
        }
        if (data.uploadSpeed !== undefined) {
          setUploadComplete(true);
        }
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

  const startUploadSpeedTest = async () => {
    const formData = new FormData();
    const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)]);
    formData.append('file', blob);

    try {
      await axios.post('http://localhost:5000/speedtests/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
      });
    } catch (error) {
      console.error('Error running upload test:', error);
    }
  };

  const runSpeedTest = async () => {
    setIsTesting(true);
    setDownloadComplete(false);
    setUploadComplete(false);
    setDownloadSpeed(0);
    setUploadSpeed(0);
    setPing(0);
    setDownloadResult(0);

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
      await axios.get('http://localhost:5000/speedtests/download');
    } catch (error) {
      console.error('Error running speed test:', error);
    }
  };

  useEffect(() => {
    if (downloadComplete && uploadComplete) {
      setIsTesting(false);
    }
  }, [downloadComplete, uploadComplete]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Internet Speed Tests</h1>
        <button
          className="speed-test-button circular-button"
          onClick={runSpeedTest}
          disabled={isTesting}
          style={{ display: isTesting ? 'none' : 'block' }}
        >
          GO
        </button>
        <div className="speedometer-container" style={{ display: isTesting && !isTransitioning ? 'block' : 'none' }}>
          <ReactSpeedometer
            value={downloadComplete ? uploadSpeed : downloadSpeed}
            minValue={0}
            maxValue={100}
            needleColor="#666"
            startColor={downloadComplete ? '#3e6e4c' : '#6e4c3e'}
            segments={10}
            endColor={downloadComplete ? '#679a7c' : '#9a7c67'}
            currentValueText={
              downloadComplete
                ? `Upload Speed: ${uploadSpeed.toFixed(2)} Mbps`
                : `Download Speed: ${downloadSpeed.toFixed(2)} Mbps`
            }
            ringWidth={30}
            needleTransitionDuration={200}
            needleHeightRatio={0.7}
          />
        </div>
        <div className="transition-message" style={{ display: isTransitioning ? 'block' : 'none' }}>
          <p>Please wait...</p>
        </div>
        <div className="speed-test-results">
          {testDate && <p>{`Test initiated at: ${testDate}`}</p>}
          <p>{`Ping: ${ping} ms`}</p>
          {downloadComplete && <p>{`Download Speed: ${downloadResult} Mbps`}</p>}
          {uploadComplete && <p>{`Upload Speed: ${uploadSpeed.toFixed(2)} Mbps`}</p>}
        </div>
      </header>
    </div>
  );
}

export default App;
