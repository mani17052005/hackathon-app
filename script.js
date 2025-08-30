// ========== Tool Switching ==========
function switchTool(tool) {
  document.querySelectorAll('.tool').forEach(el => el.classList.add('hidden'));
  document.getElementById(tool).classList.remove('hidden');
}

// Orientation-based switching
function handleOrientation() {
  let angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;

  if (angle === 0) {
    switchTool('alarm');
  } else if (angle === 180) {
    switchTool('timer');
  } else if (angle === 90) {
    switchTool('stopwatch');
  } else if (angle === -90 || angle === 270) {
    switchTool('weather');
  }
}

if (screen.orientation && screen.orientation.addEventListener) {
  screen.orientation.addEventListener("change", handleOrientation);
} else {
  window.addEventListener("orientationchange", handleOrientation);
}
handleOrientation();


// ========== Alarm ==========
let alarmTimeout;

function setAlarm() {
  const time = document.getElementById("alarmTime").value;
  const musicFile = document.getElementById("alarmMusic").files[0];
  const audio = document.getElementById("alarmAudio");

  if (!time) {
    alert("Please set a time for alarm!");
    return;
  }
  if (!musicFile) {
    alert("Please select your favorite music!");
    return;
  }

  audio.src = URL.createObjectURL(musicFile);

  const now = new Date();
  const alarmTime = new Date(now.toDateString() + " " + time);

  if (alarmTime < now) {
    alarmTime.setDate(alarmTime.getDate() + 1); // Next day
  }

  const timeout = alarmTime - now;
  document.getElementById("alarmStatus").textContent = `Alarm set for ${alarmTime}`;

  if (alarmTimeout) clearTimeout(alarmTimeout);

  alarmTimeout = setTimeout(() => {
    audio.play();
    alert("⏰ Wake up! Alarm ringing!");
  }, timeout);
}


// ========== Stopwatch ==========
let swInterval, swTime = 0;

function updateStopwatch() {
  let hrs = Math.floor(swTime / 3600);
  let mins = Math.floor((swTime % 3600) / 60);
  let secs = swTime % 60;
  document.getElementById("swDisplay").textContent =
    `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function startStopwatch() {
  if (swInterval) return;
  swInterval = setInterval(() => {
    swTime++;
    updateStopwatch();
  }, 1000);
}

function stopStopwatch() {
  clearInterval(swInterval);
  swInterval = null;
}

function resetStopwatch() {
  stopStopwatch();
  swTime = 0;
  updateStopwatch();
  document.getElementById("laps").innerHTML = "";
}

function lapStopwatch() {
  const li = document.createElement("li");
  li.textContent = document.getElementById("swDisplay").textContent;
  document.getElementById("laps").appendChild(li);
}


// ========== Timer ==========
let timerInterval;

function startTimer() {
  let minutes = parseInt(document.getElementById("timerMinutes").value) || 0;
  let seconds = minutes * 60;

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (seconds <= 0) {
      clearInterval(timerInterval);
      alert("⏳ Timer finished!");
      return;
    }
    seconds--;
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    document.getElementById("timerDisplay").textContent =
      `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, 1000);
}


// ========== Weather ==========
function getWeather() {
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
      const temp = data.properties.timeseries[0].data.instant.details.air_temperature;

      document.getElementById("weatherResult").textContent =
        `📍 Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}\n🌡️ Temp: ${temp} °C`;
    } catch (err) {
      document.getElementById("weatherResult").textContent = "Failed to fetch weather.";
    }
  });
}
