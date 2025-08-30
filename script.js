// DOM Elements
const orientationLabel = document.getElementById('orientationLabel');
const app = document.getElementById('app');
const instructions = document.getElementById('instructions');
const alarmOverlay = document.getElementById('alarmOverlay');
const overlayMsg = document.getElementById('overlayMsg');

// Tool containers
const alarmClock = document.getElementById('alarmClock');
const stopwatch = document.getElementById('stopwatch');
const timer = document.getElementById('timer');
const weather = document.getElementById('weather');

// Check if device supports orientation events
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', handleOrientation);
} else {
  orientationLabel.textContent = 'Device orientation not supported on this device.';
}

// Handle device orientation
function handleOrientation(event) {
  const beta = event.beta;  // Front-to-back (portrait upright/upside down)
  const gamma = event.gamma; // Left-to-right (landscape)
  
  // Determine orientation based on beta and gamma values
  if (Math.abs(beta) < 45) {
    if (gamma > 30) {
      // Landscape right (stopwatch)
      showTool('stopwatch');
      orientationLabel.textContent = 'Landscape Mode (Right-Side Up) - Stopwatch';
    } else if (gamma < -30) {
      // Landscape left (weather)
      showTool('weather');
      orientationLabel.textContent = 'Landscape Mode (Left-Side Up) - Weather';
    }
  } else {
    if (beta > 45) {
      // Portrait upside down (timer)
      showTool('timer');
      orientationLabel.textContent = 'Portrait Mode (Upside Down) - Timer';
    } else {
      // Portrait upright (alarm clock)
      showTool('alarm');
      orientationLabel.textContent = 'Portrait Mode (Upright) - Alarm Clock';
    }
  }
}

// Show the appropriate tool based on orientation
function showTool(tool) {
  // Hide instructions
  instructions.classList.add('hidden');
  
  // Hide all tools
  alarmClock.classList.remove('active-tool');
  stopwatch.classList.remove('active-tool');
  timer.classList.remove('active-tool');
  weather.classList.remove('active-tool');
  
  // Show the selected tool
  switch(tool) {
    case 'alarm':
      alarmClock.classList.add('active-tool');
      break;
    case 'stopwatch':
      stopwatch.classList.add('active-tool');
      break;
    case 'timer':
      timer.classList.add('active-tool');
      break;
    case 'weather':
      weather.classList.add('active-tool');
      // Fetch weather when this view is shown
      getWeather();
      break;
  }
}

// Alarm Clock functionality
const currentTimeElement = document.getElementById('currentTime');
const alarmTimeInput = document.getElementById('alarmTime');
const setAlarmBtn = document.getElementById('setAlarmBtn');
const clearAlarmBtn = document.getElementById('clearAlarmBtn');
const alarmStatus = document.getElementById('alarmStatus');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const snoozeAlarmBtn = document.getElementById('snoozeAlarmBtn');

let alarmTime = null;
let alarmInterval = null;

function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  currentTimeElement.textContent = timeString;
  
  // Check if alarm should go off
  if (alarmTime) {
    const currentTime = now.getHours() * 60 + now.getMinutes();
    if (currentTime === alarmTime) {
      triggerAlarm();
    }
  }
}

setAlarmBtn.addEventListener('click', () => {
  if (alarmTimeInput.value) {
    const [hours, minutes] = alarmTimeInput.value.split(':');
    alarmTime = parseInt(hours) * 60 + parseInt(minutes);
    alarmStatus.textContent = `Alarm set for ${formatTime(hours, minutes)}`;
  }
});

clearAlarmBtn.addEventListener('click', () => {
  alarmTime = null;
  alarmStatus.textContent = '';
  alarmTimeInput.value = '';
});

function formatTime(hours, minutes) {
  const period = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes} ${period}`;
}

function triggerAlarm() {
  alarmStatus.textContent = 'ALARM! WAKE UP!';
  alarmOverlay.classList.remove('hidden');
  document.body.classList.add('vibrate');
  alarmTime = null;
  alarmTimeInput.value = '';
}

stopAlarmBtn.addEventListener('click', () => {
  alarmOverlay.classList.add('hidden');
  document.body.classList.remove('vibrate');
});

snoozeAlarmBtn.addEventListener('click', () => {
  const now = new Date();
  const snoozeTime = new Date(now.getTime() + 5 * 60000); // 5 minutes from now
  alarmTime = snoozeTime.getHours() * 60 + snoozeTime.getMinutes();
  alarmStatus.textContent = `Snoozed until ${formatTime(snoozeTime.getHours(), snoozeTime.getMinutes())}`;
  alarmOverlay.classList.add('hidden');
  document.body.classList.remove('vibrate');
});

// Update clock every second
setInterval(updateClock, 1000);
updateClock();

// Stopwatch functionality
const stopwatchDisplay = document.getElementById('stopwatchDisplay');
const startStopwatchBtn = document.getElementById('startStopwatchBtn');
const lapStopwatchBtn = document.getElementById('lapStopwatchBtn');
const resetStopwatchBtn = document.getElementById('resetStopwatchBtn');
const lapsContainer = document.getElementById('lapsContainer');

let stopwatchInterval = null;
let stopwatchRunning = false;
let stopwatchTime = 0;
let lapCount = 1;

function updateStopwatch() {
  stopwatchTime += 10; // Update every 10ms for precision
  
  const milliseconds = Math.floor((stopwatchTime % 1000) / 10);
  const seconds = Math.floor((stopwatchTime / 1000) % 60);
  const minutes = Math.floor((stopwatchTime / (1000 * 60)) % 60);
  const hours = Math.floor(stopwatchTime / (1000 * 60 * 60));
  
  stopwatchDisplay.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}.${padZero(milliseconds, 2)}`;
}

startStopwatchBtn.addEventListener('click', () => {
  if (stopwatchRunning) {
    // Pause stopwatch
    clearInterval(stopwatchInterval);
    startStopwatchBtn.textContent = 'Resume';
  } else {
    // Start stopwatch
    stopwatchInterval = setInterval(updateStopwatch, 10);
    startStopwatchBtn.textContent = 'Pause';
  }
  stopwatchRunning = !stopwatchRunning;
});

lapStopwatchBtn.addEventListener('click', () => {
  if (stopwatchRunning) {
    const lapTime = document.createElement('div');
    lapTime.textContent = `Lap ${lapCount++}: ${stopwatchDisplay.textContent}`;
    lapsContainer.prepend(lapTime);
  }
});

resetStopwatchBtn.addEventListener('click', () => {
  clearInterval(stopwatchInterval);
  stopwatchTime = 0;
  stopwatchDisplay.textContent = '00:00:00.00';
  startStopwatchBtn.textContent = 'Start';
  stopwatchRunning = false;
  lapCount = 1;
  lapsContainer.innerHTML = '';
});

// Timer functionality
const timerDisplay = document.getElementById('timerDisplay');
const minutesInput = document.getElementById('minutesInput');
const startTimerBtn = document.getElementById('startTimerBtn');
const pauseTimerBtn = document.getElementById('pauseTimerBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');

let timerInterval = null;
let timerRunning = false;
let timerTime = 25 * 60; // 25 minutes in seconds
let timerOriginalTime = timerTime;

function updateTimerDisplay() {
  const minutes = Math.floor(timerTime / 60);
  const seconds = timerTime % 60;
  timerDisplay.textContent = `${padZero(minutes)}:${padZero(seconds)}`;
}

function updateTimer() {
  if (timerTime > 0) {
    timerTime--;
    updateTimerDisplay();
  } else {
    clearInterval(timerInterval);
    timerRunning = false;
    overlayMsg.textContent = "Timer completed!";
    alarmOverlay.classList.remove('hidden');
    document.body.classList.add('vibrate');
  }
}

startTimerBtn.addEventListener('click', () => {
  if (!timerRunning) {
    if (timerTime === 0) {
      const minutes = parseInt(minutesInput.value) || 25;
      timerTime = minutes * 60;
      timerOriginalTime = timerTime;
    }
    
    timerInterval = setInterval(updateTimer, 1000);
    timerRunning = true;
    startTimerBtn.textContent = 'Resume';
  }
});

pauseTimerBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  startTimerBtn.textContent = 'Start';
});

resetTimerBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerTime = timerOriginalTime;
  updateTimerDisplay();
  timerRunning = false;
  startTimerBtn.textContent = 'Start';
});

// Initialize timer display
updateTimerDisplay();

// Weather functionality
const weatherIcon = document.querySelector('.weather-icon i');
const temperatureElement = document.querySelector('.temperature');
const weatherDescElement = document.querySelector('.weather-desc');
const locationElement = document.querySelector('.location');
const refreshWeatherBtn = document.getElementById('refreshWeatherBtn');

refreshWeatherBtn.addEventListener('click', getWeather);

function getWeather() {
  // Using OpenWeatherMap API (free tier)
  // Note: In a real application, you would use your own API key
  // This is a simulated response as we don't have an actual API key for this demo
  
  // Simulate API call with random data
  const weatherConditions = [
    { type: 'Sunny', icon: 'fa-sun', temp: 25 },
    { type: 'Cloudy', icon: 'fa-cloud', temp: 18 },
    { type: 'Rainy', icon: 'fa-cloud-rain', temp: 12 },
    { type: 'Snowy', icon: 'fa-snowflake', temp: -2 }
  ];
  
  const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
  
  // Update weather display
  temperatureElement.textContent = `${randomCondition.temp}°C`;
  weatherDescElement.textContent = randomCondition.type;
  locationElement.textContent = 'Current Location';
  weatherIcon.className = `fas ${randomCondition.icon}`;
}

// Utility function to pad numbers with zero
function padZero(num, length = 2) {
  return num.toString().padStart(length, '0');
}

// Initial tool display based on window orientation
if (window.innerHeight > window.innerWidth) {
  showTool('alarm');
  orientationLabel.textContent = 'Portrait Mode (Upright) - Alarm Clock';
} else {
  showTool('stopwatch');
  orientationLabel.textContent = 'Landscape Mode (Right-Side Up) - Stopwatch';
}
