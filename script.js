// ===== Utility: Show section with animation =====
function showTool(id) {
  document.querySelectorAll(".tool").forEach(t => {
    t.classList.remove("active");
    setTimeout(() => { t.style.display = "none"; }, 600); // wait for fade out
  });

  const tool = document.getElementById(id);
  tool.style.display = "block";
  setTimeout(() => tool.classList.add("active"), 20); // trigger fade-in
}

// ===== ALARM =====
let alarmTimeout, alarmSound;

function setAlarm() {
  const alarmTime = document.getElementById("alarmTime").value;
  const alarmFile = document.getElementById("alarmTone").files[0];

  if (!alarmTime) {
    alert("Please select a time!");
    return;
  }

  const alarmDate = new Date();
  const [hours, minutes] = alarmTime.split(":");
  alarmDate.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const timeToAlarm = alarmDate - now;

  if (timeToAlarm < 0) {
    alert("Selected time has already passed today.");
    return;
  }

  alarmSound = alarmFile ? new Audio(URL.createObjectURL(alarmFile)) : new Audio();
  document.getElementById("alarmStatus").textContent = "Alarm set!";

  alarmTimeout = setTimeout(() => {
    document.getElementById("alarmStatus").textContent = "⏰ Alarm Ringing!";
    if (alarmSound) alarmSound.play();
  }, timeToAlarm);
}

// ===== STOPWATCH =====
let stopwatchInterval, swSeconds = 0, running = false;

function updateStopwatch() {
  let hrs = String(Math.floor(swSeconds / 3600)).padStart(2, '0');
  let mins = String(Math.floor((swSeconds % 3600) / 60)).padStart(2, '0');
  let secs = String(swSeconds % 60).padStart(2, '0');
  document.getElementById("stopwatchDisplay").textContent = `${hrs}:${mins}:${secs}`;
}

function startStopwatch() {
  if (!running) {
    running = true;
    stopwatchInterval = setInterval(() => {
      swSeconds++;
      updateStopwatch();
    }, 1000);
  } else {
    clearInterval(stopwatchInterval);
    running = false;
  }
}

function lapStopwatch() {
  if (running) {
    const lap = document.createElement("li");
    lap.textContent = document.getElementById("stopwatchDisplay").textContent;
    document.getElementById("laps").appendChild(lap);
  }
}

function resetStopwatch() {
  clearInterval(stopwatchInterval);
  running = false;
  swSeconds = 0;
  updateStopwatch();
  document.getElementById("laps").innerHTML = "";
}

// ===== TIMER =====
let timerInterval, timerRemaining = 0;

function startTimer() {
  if (timerInterval) return;
  const input = parseInt(document.getElementById("timerInput").value);
  if (!input) return;

  timerRemaining = input;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      alert("⏳ Timer Finished!");
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRemaining = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  let mins = String(Math.floor(timerRemaining / 60)).padStart(2, '0');
  let secs = String(timerRemaining % 60).padStart(2, '0');
  document.getElementById("timerDisplay").textContent = `${mins}:${secs}`;
}

// ===== WEATHER =====
async function getWeather() {
  if (!navigator.geolocation) {
    document.getElementById("weatherResult").textContent = "Geolocation not supported.";
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    try {
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "SmartToolsApp/1.0 github.com/yourusername" }
      });
      const data = await response.json();
      const details = data.properties.timeseries[0].data.instant.details;
      document.getElementById("weatherResult").textContent =
        `🌡 Temp: ${details.air_temperature}°C\n💧 Humidity: ${details.relative_humidity}%\n💨 Wind: ${details.wind_speed} m/s`;
    } catch (err) {
      document.getElementById("weatherResult").textContent = "Failed to fetch weather.";
    }
  });
}

// ===== ORIENTATION SWITCHING =====
function handleOrientation() {
  const angle = window.screen.orientation.angle;
  const type = window.screen.orientation.type;

  if (type.includes("portrait") && angle === 0) {
    showTool("alarm");
  } else if (type.includes("landscape") && angle === 90) {
    showTool("stopwatch");
  } else if (type.includes("portrait") && angle === 180) {
    showTool("timer");
  } else if (type.includes("landscape") && angle === 270) {
    showTool("weather");
  }
}

window.addEventListener("orientationchange", handleOrientation);
window.addEventListener("load", handleOrientation);
