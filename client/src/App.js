import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import ReactSpeedometer from 'react-d3-speedometer';
import { gsap } from 'gsap';
import './App.css';
import { MdNetworkPing, MdOutlineDownload, MdOutlineUpload } from "react-icons/md";

function App() {
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [ping, setPing] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [testDate, setTestDate] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [downloadResult, setDownloadResult] = useState(0);
  const [maxValue, setMaxValue] = useState(null);
  const [testRun, setTestRun] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);

  const testDateRef = useRef(null);
  const pingRef = useRef(null);
  const downloadSpeedRef = useRef(null);
  const uploadSpeedRef = useRef(null);

  useEffect(() => {
    const eventSource = new EventSource(`${process.env.REACT_APP_API_BASE_URL}/events`);

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
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/upload`, formData, {
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
    setShowWelcomeMessage(false);
    setDownloadComplete(false);
    setUploadComplete(false);
    setDownloadSpeed(0);
    setUploadSpeed(0);
    setPing(null);
    setDownloadResult(0);
    setMaxValue(null);
    setTestRun(true);

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
      // Quick estimate for download speed
      console.log('Fetching quick estimate...');
      const estimateResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/quick-estimate`);
      const estimatedSpeed = parseFloat(estimateResponse.data.estimatedSpeed);
      console.log('Estimated speed:', estimatedSpeed);
      const newMaxValue = Math.ceil(estimatedSpeed / 50) * 50;
      console.log('Setting max value to:', newMaxValue);
      setMaxValue(newMaxValue);

      // Measure ping
      const pingResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/ping`);
      setPing(pingResponse.data.ping);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Measure download speed
      await axios.get(`${process.env.REACT_APP_API_BASE_URL}/download`);
    } catch (error) {
      console.error('Error running speed test:', error);
    }
  };

  useEffect(() => {
    if (downloadComplete && uploadComplete) {
      setIsTesting(false);
    }
  }, [downloadComplete, uploadComplete]);

  useEffect(() => {
    if (testDate) {
      gsap.fromTo(testDateRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8 });
    }
  }, [testDate]);

  useEffect(() => {
    if (ping !== null) {
      gsap.fromTo(pingRef.current, { opacity: 0 }, { opacity: 1, duration: 0.9 });
    }
  }, [ping]);

  useEffect(() => {
    if (downloadComplete) {
      gsap.fromTo(downloadSpeedRef.current, { opacity: 0 }, { opacity: 1, duration: 0.9 });
    }
  }, [downloadComplete]);

  useEffect(() => {
    if (uploadComplete) {
      gsap.fromTo(uploadSpeedRef.current, { opacity: 0 }, { opacity: 1, duration: 0.9 });
    }
  }, [uploadComplete]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Internet Speed Test</h1>
        {showWelcomeMessage && !isTesting && (
          <div className="welcome-message">
            <p>Welcome to the Internet Speed Test!</p>
            <p>Click the "GO" button to start the test.</p>
          </div>
        )}
        <button
          className="speed-test-button"
          onClick={runSpeedTest}
          disabled={isTesting}
          style={{ display: isTesting ? 'none' : 'block' }}
        >
          GO
        </button>
        <div className="speedometer-container" style={{ display: isTesting && !isTransitioning && maxValue !== null ? 'block' : 'none' }}>
          {maxValue !== null && (
            <ReactSpeedometer
              key={`speedometer-${maxValue}`}
              value={downloadComplete ? uploadSpeed : downloadSpeed}
              minValue={0}
              maxValue={maxValue}
              needleColor="#EDEDED"
              startColor={downloadComplete ? '#A3B18A' : '#52734D'}
              segments={10}
              endColor={downloadComplete ? '#4CAF50' : '#1A2E1A'}
              currentValueText={
                downloadComplete
                  ? `Upload Speed: ${uploadSpeed.toFixed(2)} Mbps`
                  : `Download Speed: ${downloadSpeed.toFixed(2)} Mbps`
              }
              ringWidth={35}
              needleTransitionDuration={200}
              needleHeightRatio={0.75}
            />
          )}
        </div>
        <div className="transition-message" style={{ display: isTransitioning ? 'block' : 'none' }}>
          <p>Please wait...</p>
        </div>
        <div className="speed-test-results">
          {testDate && <p ref={testDateRef}><span className="label">Test initiated at: </span>{testDate}</p>}
          {(isTesting || testRun) && ping !== null && <p ref={pingRef}><span className="label"><MdNetworkPing />Ping: </span>{ping} ms</p>}
          {downloadComplete && <p ref={downloadSpeedRef}><span className="label"><MdOutlineDownload />Download: </span>{downloadResult} Mbps</p>}
          {uploadComplete && <p ref={uploadSpeedRef}><span className="label"><MdOutlineUpload />Upload: </span>{uploadSpeed.toFixed(2)} Mbps</p>}
        </div>
      </header>
    </div>
  );
}

export default App;
