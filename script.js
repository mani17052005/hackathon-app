/* HoldSense - Orientation Based App */

function switchTool(tool) {
  const app = document.getElementById("app");
  const label = document.getElementById("orientationLabel");

  if (tool === "alarm") {
    label.textContent = "Portrait ↑ — Alarm Clock";
    app.innerHTML = `
      <h2>⏰ Alarm Clock</h2>
      <input type="time" id="alarmTime">
      <button onclick="setAlarm()">Set Alarm</button>
      <div id="alarmStatus"></div>`;
  }
  else if (tool === "stopwatch") {
    label.textContent = "Landscape → — Stopwatch";
    app.innerHTML = `
      <h2>⏱ Stopwatch</h2>
      <div id="stopwatch">00:00:00.000</div>
      <button onclick="startStopwatch()">Start</button>
      <button onclick="stopStopwatch()">Stop</button>
      <button onclick="resetStopwatch()">Reset</button>`;
  }
  else if (tool === "timer") {
    label.textContent = "Portrait ↓ — Timer";
    app.innerHTML = `
      <h2>⏳ Timer</h2>
      <input type="number" id="timerInput" placeholder="Seconds">
      <button onclick="startTimer()">Start</button>
      <div id="timerDisplay">0</div>`;
  }
  else if (tool === "weather") {
    label.textContent = "Landscape ← — Weather";
    app.innerHTML = `
      <h2>☀️ Weather</h2>
      <div id="weatherResult">Loading...</div>`;
    getWeather();
  }
}

/* === Alarm Clock === */
let alarmTimeout;
function setAlarm() {
  const time = document.getElementById("alarmTime").value;
  document.getElementById("alarmStatus").textContent = "Alarm set for " + time;
  if (alarmTimeout) clearTimeout(alarmTimeout);

  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  let alarm = new Date();
  alarm.setHours(h, m, 0, 0);
  if (alarm < now) alarm.setDate(alarm.getDate() + 1);

  const diff = alarm - now;
  alarmTimeout = setTimeout(triggerAlarm, diff);
}

function triggerAlarm() {
  const overlay = document.getElementById("alarmOverlay");
  overlay.classList.remove("hidden");
  const audio = document.getElementById("alarmAudio");
  audio.src = "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg";
  audio.loop = true;
  audio.play();
}
document.getElementById("stopAlarmBtn").onclick = () => {
  document.getElementById("alarmOverlay").classList.add("hidden");
  const audio = document.getElementById("alarmAudio");
  audio.pause();
  audio.currentTime = 0;
};
document.getElementById("snoozeAlarmBtn").onclick = () => {
  document.getElementById("alarmOverlay").classList.add("hidden");
  const audio = document.getElementById("alarmAudio");
  audio.pause();
  audio.currentTime = 0;
  setTimeout(triggerAlarm, 5 * 60 * 1000);
};

/* === Stopwatch === */
let swInterval, swStartTime, swElapsed = 0;
function startStopwatch() {
  if (swInterval) return;
  swStartTime = Date.now() - swElapsed;
  swInterval = setInterval(() => {
    swElapsed = Date.now() - swStartTime;
    const ms = swElapsed % 1000;
    const s = Math.floor(swElapsed / 1000) % 60;
    const m = Math.floor(swElapsed / 60000) % 60;
    const h = Math.floor(swElapsed / 3600000);
    document.getElementById("stopwatch").textContent =
      `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}.${ms.toString().padStart(3,"0")}`;
  }, 50);
}
function stopStopwatch() {
  clearInterval(swInterval);
  swInterval = null;
}
function resetStopwatch() {
  stopStopwatch();
  swElapsed = 0;
  document.getElementById("stopwatch").textContent = "00:00:00.000";
}

/* === Timer === */
let timerInterval;
function startTimer() {
  let secs = parseInt(document.getElementById("timerInput").value);
  const display = document.getElementById("timerDisplay");
  clearInterval(timerInterval);
  display.textContent = secs;
  timerInterval = setInterval(() => {
    secs--;
    display.textContent = secs;
    if (secs <= 0) {
      clearInterval(timerInterval);
      document.getElementById("timerBeep").play();
      alert("Timer finished!");
    }
  }, 1000);
}

/* === Weather === */
function getWeather() {
  const result = document.getElementById("weatherResult");
  if (!navigator.geolocation) {
    result.textContent = "Geolocation not supported.";
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
      .then(r => r.json())
      .then(data => {
        const w = data.current_weather;
        result.textContent = `Temperature: ${w.temperature}°C, Windspeed: ${w.windspeed} km/h`;
      })
      .catch(() => result.textContent = "Weather fetch error.");
  });
}

/* === Orientation Auto-Switch === */
function handleOrientation() {
  let angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  if (angle === 0) switchTool("alarm");           // Portrait ↑
  else if (angle === 180) switchTool("timer");    // Portrait ↓
  else if (angle === 90) switchTool("stopwatch"); // Landscape →
  else if (angle === -90 || angle === 270) switchTool("weather"); // Landscape ←
}
if (screen.orientation && screen.orientation.addEventListener) {
  screen.orientation.addEventListener("change", handleOrientation);
} else {
  window.addEventListener("orientationchange", handleOrientation);
}
handleOrientation();
