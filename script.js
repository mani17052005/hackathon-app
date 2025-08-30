// ====== Tool Switcher ======
function switchTool(tool) {
  document.querySelectorAll(".tool").forEach(el => el.classList.add("hidden"));
  document.getElementById(tool).classList.remove("hidden");
  document.getElementById("orientationLabel").textContent = `Now in: ${tool}`;
}

// ====== Orientation Detection ======
function handleOrientation() {
  let angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;

  if (angle === 0) {
    switchTool("alarm"); // Portrait Upright
  } else if (angle === 180) {
    switchTool("timer"); // Portrait Upside Down
  } else if (angle === 90) {
    switchTool("stopwatch"); // Landscape Right
  } else if (angle === -90 || angle === 270) {
    switchTool("weather"); // Landscape Left
  }
}

if (screen.orientation && screen.orientation.addEventListener) {
  screen.orientation.addEventListener("change", handleOrientation);
} else {
  window.addEventListener("orientationchange", handleOrientation);
}
handleOrientation();

// ====== Alarm ======
let alarmTimeout;
function setAlarm() {
  const timeInput = document.getElementById("alarmTime").value;
  const status = document.getElementById("alarmStatus");
  if (!timeInput) {
    status.textContent = "Please select a time!";
    return;
  }
  const alarmTime = new Date();
  const [h, m] = timeInput.split(":");
  alarmTime.setHours(h, m, 0, 0);

  const now = new Date();
  let timeToAlarm = alarmTime.getTime() - now.getTime();
  if (timeToAlarm < 0) timeToAlarm += 24 * 60 * 60 * 1000;

  clearTimeout(alarmTimeout);
  alarmTimeout = setTimeout(() => {
    document.getElementById("alarmAudio").play();
    alert("⏰ Alarm ringing!");
  }, timeToAlarm);

  status.textContent = `Alarm set for ${timeInput}`;
}

// ====== Stopwatch ======
let stopwatchInterval, startTime;
function startStopwatch() {
  if (!stopwatchInterval) {
    startTime = Date.now() - (window.elapsed || 0);
    stopwatchInterval = setInterval(() => {
      window.elapsed = Date.now() - startTime;
      document.getElementById("stopwatchDisplay").textContent = new Date(window.elapsed).toISOString().substr(11, 12);
    }, 10);
  }
}
function stopStopwatch() {
  clearInterval(stopwatchInterval);
  stopwatchInterval = null;
}
function resetStopwatch() {
  stopStopwatch();
  window.elapsed = 0;
  document.getElementById("stopwatchDisplay").textContent = "00:00:00.000";
}

// ====== Timer ======
let timerInterval;
function startTimer() {
  let minutes = parseInt(document.getElementById("timerMinutes").value) || 0;
  let remaining = minutes * 60;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (remaining <= 0) {
      clearInterval(timerInterval);
      document.getElementById("timerDisplay").textContent = "00:00";
      alert("⏳ Timer done!");
      return;
    }
    remaining--;
    let min = String(Math.floor(remaining / 60)).padStart(2, "0");
    let sec = String(remaining % 60).padStart(2, "0");
    document.getElementById("timerDisplay").textContent = `${min}:${sec}`;
  }, 1000);
}

// ====== Weather ======
function getWeather() {
  if (!navigator.geolocation) {
    document.getElementById("weatherResult").textContent = "Geolocation not supported.";
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    document.getElementById("weatherResult").textContent =
      `Your location: (${latitude.toFixed(2)}, ${longitude.toFixed(2)})\n(Demo mode — plug in API here)`;
  });
}
