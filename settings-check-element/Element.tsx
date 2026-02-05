import React, { useEffect, useState } from "react";
import styles from "./Element.module.css";
import { ElementAPI } from "@avaya/infinity-elements-api";

// Create API instance
const api = new ElementAPI({
  elementId: "settings-check-element",
  debug: true,
});

export default function Element() {
  const [userAgent, setUserAgent] = useState<string>("Loading...");
  const [screenResolution, setScreenResolution] = useState<string>("Loading...");
  const [notificationPermission, setNotificationPermission] = useState<string>("Checking...");
  const [audioSupport, setAudioSupport] = useState<string>("Checking...");
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const [ringtone, setRingtone] = useState<HTMLAudioElement | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // System Checks
  const checkSettings = () => {
    // User Agent
    setUserAgent(navigator.userAgent);
    
    // Screen Resolution
    setScreenResolution(`${window.screen.width}x${window.screen.height}`);
    
    // Notification Permission
    setNotificationPermission(Notification.permission);
    
    // Audio Support
    const audio = new Audio();
    const canPlayMp3 = audio.canPlayType('audio/mpeg');
    const canPlayOgg = audio.canPlayType('audio/ogg');
    
    const formatSupport = (val: string) => val === '' ? 'No' : `Yes (${val})`;
    setAudioSupport(`MP3: ${formatSupport(canPlayMp3)}, OGG: ${formatSupport(canPlayOgg)}`);
    
    addLog("System checks updated.");
  };

  useEffect(() => {
    checkSettings();
    
    // Smart Audio Loading Strategy
    const loadAudio = async () => {
      // 1. Try local Agent Desktop asset
      // We need the origin of the Agent Desktop (the parent window).
      // Since we are in a cross-origin iframe (loader-server:3200 vs agent-desktop:3000),
      // we cannot access window.parent.location directly due to SOP.
      //
      // However, browsers provide window.location.ancestorOrigins which lists parent origins.
      // ancestorOrigins[0] is the immediate parent (Agent Desktop).
      
      let parentOrigin = '';
      
      try {
        if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
          parentOrigin = window.location.ancestorOrigins[0];
        } else if (document.referrer) {
           // Fallback: try to parse referrer if available
           try {
             const url = new URL(document.referrer);
             parentOrigin = url.origin;
           } catch (e) {
             // Invalid referrer URL
           }
        }
      } catch (e) {
        addLog("Could not determine parent origin.");
      }

      const localPath = parentOrigin ? `${parentOrigin}/noises/demariod.mp3` : '';
      const googleFallback = 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg';
      
      const tryLoad = (url: string): Promise<HTMLAudioElement> => {
        return new Promise((resolve, reject) => {
          const audio = new Audio(url);
          audio.loop = true;
          // We can't fully "check" if it exists without fetch/HEAD, 
          // but we can listen for 'canplaythrough' or 'error' on the audio object.
          
          const onReady = () => {
            cleanup();
            resolve(audio);
          };
          
          const onError = () => {
            cleanup();
            reject(new Error(`Failed to load ${url}`));
          };

          const cleanup = () => {
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onError);
          };

          audio.addEventListener('canplaythrough', onReady);
          audio.addEventListener('error', onError);
          
          // Trigger load
          audio.load();
        });
      };

      try {
        addLog(`Attempting to load local audio: ${localPath}`);
        const audio = await tryLoad(localPath);
        setRingtone(audio);
        addLog("Loaded local audio successfully.");
      } catch (e) {
        addLog("Local audio failed, switching to Google fallback...");
        try {
          const fallbackAudio = new Audio(googleFallback);
          fallbackAudio.loop = true;
          setRingtone(fallbackAudio);
          addLog("Loaded Google fallback audio.");
        } catch (fallbackErr) {
          addLog("All audio sources failed.");
        }
      }
    };

    loadAudio();

    return () => {
      if (ringtone) {
        ringtone.pause();
      }
    };
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev]);
  };

  const toggleRinging = async () => {
    if (!ringtone) {
      addLog("Audio object not initialized.");
      return;
    }

    if (isRinging) {
      ringtone.pause();
      ringtone.currentTime = 0;
      setIsRinging(false);
      addLog("Ringing stopped.");
    } else {
      addLog("Starting ringing...");
      try {
        await ringtone.play();
        setIsRinging(true);
        addLog("Ringing playing...");
      } catch (err) {
        const error = err as Error;
        addLog(`Ringing failed: ${error.message}`);
        console.error(err);
      }
    }
  };

  const requestNotification = () => {
    addLog("Requesting notification...");
    if (Notification.permission === 'granted') {
      try {
        const n = new Notification('Test Notification', { body: 'This is a test notification from Settings Check Element.' });
        n.onshow = () => addLog('Notification event: show');
        n.onclick = () => addLog('Notification event: click');
        n.onerror = (e) => addLog(`Notification event: error ${String(e)}`);
        addLog('Notification object created.');
      } catch (e) {
        const error = e as Error;
        addLog(`Exception creating notification: ${error.message}`);
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          try {
            new Notification('Test Notification', { body: 'Permission granted! This is a test.' });
            addLog('Permission granted and notification sent.');
          } catch (e) {
            const error = e as Error;
            addLog(`Exception creating notification after grant: ${error.message}`);
          }
        } else {
          addLog('Permission denied.');
        }
      });
    } else {
      addLog('Notifications are denied.');
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings Check & Simulation (React Element)</h2>
      
      <div className={styles.section}>
        <h3 className={styles.subtitle}>System Checks</h3>
        <ul className={styles.list}>
          <li><strong>User Agent:</strong> <span className={styles.value}>{userAgent}</span></li>
          <li><strong>Screen Resolution:</strong> <span className={styles.value}>{screenResolution}</span></li>
          
          <li>
            <strong>Notification Permission:</strong> 
            <span className={styles.value} style={{ 
              color: notificationPermission === 'granted' ? '#388e3c' : notificationPermission === 'denied' ? '#d32f2f' : 'inherit' 
            }}>
              {notificationPermission}
            </span>
          </li>
          
          {notificationPermission === 'denied' && (
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <strong>⚠️ Notifications are blocked by Browser</strong><br/>
              To enable them:
              <ol className={styles.instructionList}>
                <li>Click the <strong>Lock icon 🔒</strong> in the browser address bar.</li>
                <li>Find <strong>Notifications</strong> and toggle to <strong>Allow</strong>.</li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>Refresh this page</a>.</li>
              </ol>
            </div>
          )}

          {notificationPermission === 'granted' && (
            <div className={`${styles.alert} ${styles.alertSuccess}`}>
               <strong>✅ Browser Permission Granted</strong><br/>
               If you still don't see notifications:
               <ul className={styles.instructionList}>
                   <li>Check <strong>Do Not Disturb</strong> (Mac) or <strong>Focus Assist</strong> (Windows).</li>
                   <li>Check if the Browser app itself has notifications disabled in OS Settings.</li>
               </ul>
            </div>
          )}

          <li><strong>Audio Support:</strong> <span className={styles.value}>{audioSupport}</span></li>
          <div className={styles.helpText}>
            <strong>Note:</strong> We cannot detect if your computer is muted.<br/>
            "Probably" means the browser is confident it can play the format.<br/>
            "Maybe" means it likely can.
          </div>
        </ul>
        <button onClick={checkSettings} className={styles.button}>Refresh Checks</button>
      </div>

      <div className={`${styles.section} ${styles.simulationSection}`}>
        <h3 className={styles.subtitle}>Simulation</h3>
        <div className={styles.buttonGroup}>
          <button 
            onClick={toggleRinging} 
            className={`${styles.button} ${isRinging ? styles.buttonStop : styles.buttonPrimary}`}
          >
            {isRinging ? '🔕 Stop Ringing' : '🔔 Simulate Ringing'}
          </button>
          
          <button 
            onClick={requestNotification} 
            className={`${styles.button} ${styles.buttonSuccess}`}
          >
            📢 Test Notification
          </button>
        </div>
      </div>
      
      <div className={styles.logContainer}>
        {logs.length === 0 ? <div>Log initialized.</div> : logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  );
}
