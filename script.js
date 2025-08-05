let stopwatchInterval;
let stopwatchTime = 0;
let timerInterval;

// Alarm Clock
function loadAlarmClock() {
    document.getElementById("app").innerHTML = `
        <h1>Alarm Clock</h1>
        <input type="time" id="alarmTime">
        <button onclick="setAlarm()">Set Alarm</button>
    `;
}

function setAlarm() {
    const alarmTime = document.getElementById("alarmTime").value;
    if (!alarmTime) {
        alert("Please select a time.");
        return;
    }
    alert(`Alarm set for ${alarmTime}`);
}

// Stopwatch
function loadStopwatch() {
    document.getElementById("app").innerHTML = `
        <h1>Stopwatch</h1>
        <div id="stopwatch">0:00</div>
        <button onclick="startStopwatch()">Start</button>
        <button onclick="stopStopwatch()">Stop</button>
        <button onclick="resetStopwatch()">Reset</button>
    `;
}

function startStopwatch() {
    stopwatchInterval = setInterval(() => {
        stopwatchTime++;
        document.getElementById("stopwatch").innerText = formatTime(stopwatchTime);
    }, 1000);
}

function stopStopwatch() {
    clearInterval(stopwatchInterval);
}

function resetStopwatch() {
    clearInterval(stopwatchInterval);
    stopwatchTime = 0;
    document.getElementById("stopwatch").innerText = "0:00";
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Timer
function loadTimer() {
    document.getElementById("app").innerHTML = `
        <h1>Timer</h1>
        <input type="number" id="minutes" placeholder="Minutes">
        <button onclick="startTimer()">Start Timer</button>
        <div id="timerDisplay"></div>
    `;
}

function startTimer() {
    let minutes = parseInt(document.getElementById("minutes").value);
    if (isNaN(minutes) || minutes <= 0) {
        alert("Please enter a valid number of minutes.");
        return;
    }
    let seconds = minutes * 60;
    document.getElementById("timerDisplay").innerText = formatTime(seconds);

    timerInterval = setInterval(() => {
        seconds--;
        document.getElementById("timerDisplay").innerText = formatTime(seconds);
        if (seconds <= 0) {
            clearInterval(timerInterval);
            alert("Time's up!");
        }
    }, 1000);
}

// Weather
async function loadWeather() {
    let city = "London"; // you can change this
    let apiKey = "357c34ab8062a8aaf991e47747413147";
    let url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    let res = await fetch(url);
    let data = await res.json();

    document.getElementById("app").innerHTML = `
        <h1>Weather in ${data.name}</h1>
        <p>${data.weather[0].description}</p>
        <p>${data.main.temp}°C</p>
    `;
}

// Orientation handling
function handleOrientationChange() {
    let angle = window.orientation;

    if (angle === 0) {
        loadAlarmClock();
    } else if (angle === 90) {
        loadStopwatch();
    } else if (angle === 180) {
        loadTimer();
    } else if (angle === -90) {
        loadWeather();
    }
}

window.addEventListener("orientationchange", handleOrientationChange);
