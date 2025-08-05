/* HoldSense — orientation-driven app
   Mapping:
   portrait-primary  -> Alarm
   portrait-secondary-> Timer (upside-down)
   landscape-primary -> Stopwatch (right-side up)
   landscape-secondary-> Weather (other landscape)
*/

/* ----------------- Utility & DOM ----------------- */
const orientationLabel = document.getElementById('orientationLabel');
const app = document.getElementById('app');
const alarmSound = document.getElementById('alarmSound');
const timerBeep = document.getElementById('timerBeep');

/* ----------------- Mode Panels ----------------- */
// ALARM
let alarmInterval = null;
let alarmTimeVal = null;
function renderAlarm(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Alarm Clock (portrait upright)</div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;align-items:center">
        <input id="alarmTime" type="time">
        <button id="setAlarmBtn">Set</button>
      </div>
      <div id="alarmStatus" class="notice">No alarm set</div>
    </div>
  `;
  document.getElementById('setAlarmBtn').addEventListener('click', ()=>{
    const val = document.getElementById('alarmTime').value;
    if(!val){ document.getElementById('alarmStatus').textContent = 'Pick a time'; return; }
    alarmTimeVal = val;
    document.getElementById('alarmStatus').textContent = `Alarm set for ${alarmTimeVal}`;
    if(alarmInterval) clearInterval(alarmInterval);
    alarmInterval = setInterval(checkAlarm, 1000);
  });
}
function checkAlarm(){
  if(!alarmTimeVal) return;
  const now = new Date();
  const [h,m] = alarmTimeVal.split(':').map(Number);
  if(now.getHours() === h && now.getMinutes() === m && now.getSeconds() === 0){
    alarmSound.play().catch(()=>{});
    document.getElementById('alarmStatus').textContent = 'ALARM! 🛎️';
    clearInterval(alarmInterval);
    alarmInterval = null;
    alarmTimeVal = null;
  }
}

// STOPWATCH (hours:minutes:seconds:milliseconds)
let stopwatchInterval;
let stopwatchTime = 0; // ms
function renderStopwatch(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Stopwatch (landscape right — hours:mins:secs:ms)</div>
      <div id="stopwatch" class="stat">0:00:00:000</div>
      <div style="margin-top:10px">
        <button id="swStart">Start</button>
        <button id="swStop">Stop</button>
        <button id="swReset">Reset</button>
      </div>
    </div>
  `;
  document.getElementById('swStart').addEventListener('click', startStopwatch);
  document.getElementById('swStop').addEventListener('click', stopStopwatch);
  document.getElementById('swReset').addEventListener('click', resetStopwatch);
}
function startStopwatch(){
  if (stopwatchInterval) return;
  const start = Date.now() - stopwatchTime;
  stopwatchInterval = setInterval(()=> {
    stopwatchTime = Date.now() - start;
    document.getElementById('stopwatch').textContent = formatHMSms(stopwatchTime);
  }, 10);
}
function stopStopwatch(){
  clearInterval(stopwatchInterval);
  stopwatchInterval = null;
}
function resetStopwatch(){
  clearInterval(stopwatchInterval);
  stopwatchInterval = null;
  stopwatchTime = 0;
  const el = document.getElementById('stopwatch');
  if(el) el.textContent = '0:00:00:000';
}
function formatHMSms(ms){
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${hours}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}:${String(millis).padStart(3,'0')}`;
}

// TIMER
let timerInterval;
let timerRemaining = 0;
function renderTimer(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Timer (portrait upside-down)</div>
      <div style="margin-top:12px;display:flex;gap:8px;align-items:center;justify-content:center">
        <input id="timerMin" type="number" min="0" placeholder="min" style="width:90px">
        <input id="timerSec" type="number" min="0" max="59" placeholder="sec" style="width:90px">
        <button id="setTimerBtn">Set</button>
      </div>
      <div id="timerDisplay" class="stat">00:00</div>
      <div style="margin-top:10px">
        <button id="timerStart">Start</button>
        <button id="timerPause">Pause</button>
        <button id="timerReset">Reset</button>
      </div>
    </div>
  `;
  document.getElementById('setTimerBtn').addEventListener('click', ()=>{
    const m = parseInt(document.getElementById('timerMin').value||0,10);
    const s = parseInt(document.getElementById('timerSec').value||0,10);
    timerRemaining = (m*60 + s) * 1000;
    updateTimerDisplay();
  });
  document.getElementById('timerStart').addEventListener('click', startTimer);
  document.getElementById('timerPause').addEventListener('click', pauseTimer);
  document.getElementById('timerReset').addEventListener('click', resetTimer);
}
function updateTimerDisplay(){
  const sec = Math.ceil(timerRemaining/1000);
  const mm = String(Math.floor(sec/60)).padStart(2,'0');
  const ss = String(sec%60).padStart(2,'0');
  const el = document.getElementById('timerDisplay');
  if(el) el.textContent = `${mm}:${ss}`;
}
function startTimer(){
  if(timerInterval || timerRemaining<=0) return;
  let last = Date.now();
  timerInterval = setInterval(()=>{
    const now = Date.now();
    timerRemaining -= (now - last);
    last = now;
    if(timerRemaining <= 0){
      clearInterval(timerInterval);
      timerInterval = null;
      timerRemaining = 0;
      updateTimerDisplay();
      timerBeep.play().catch(()=>{});
      alert("Timer finished!");
      return;
    }
    updateTimerDisplay();
  }, 200);
}
function pauseTimer(){ if(timerInterval){ clearInterval(timerInterval); timerInterval = null; } }
function resetTimer(){ if(timerInterval) clearInterval(timerInterval); timerInterval=null; timerRemaining=0; updateTimerDisplay(); }

// WEATHER (OpenWeatherMap) — uses provided API key
async function renderWeather(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Weather of the Day (landscape opposite)</div>
      <div style="margin-top:12px">
        <div id="weatherLoc" class="stat">—</div>
        <div id="weatherDesc" class="notice">Tap refresh to fetch weather</div>
        <div style="margin-top:12px">
          <button id="refreshWeather">Refresh Weather</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('refreshWeather').addEventListener('click', fetchWeather);
}
async function fetchWeather(){
  const apiKey = "357c34ab8062a8aaf991e47747413147";
  if(!navigator.geolocation){ document.getElementById('weatherDesc').textContent='Geolocation not available.'; return; }
  document.getElementById('weatherDesc').textContent = 'Getting location…';
  navigator.geolocation.getCurrentPosition(async pos=>{
    const {latitude, longitude} = pos.coords;
    document.getElementById('weatherDesc').textContent = 'Fetching weather…';
    try{
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
      const r = await fetch(url);
      if(!r.ok) throw new Error('Bad response');
      const data = await r.json();
      document.getElementById('weatherLoc').textContent = `${data.name} • ${Math.round(data.main.temp)}°C`;
      document.getElementById('weatherDesc').textContent = `${data.weather?.[0]?.main || ''} — ${data.weather?.[0]?.description || ''}`;
    }catch(err){
      console.error(err);
      document.getElementById('weatherDesc').textContent = 'Weather fetch failed — check API or CORS.';
    }
  }, err=>{
    document.getElementById('weatherDesc').textContent = 'Location denied or unavailable.';
  }, {timeout:10000});
}

/* ----------------- Orientation Detection & Mapping ----------------- */
function mapOrientation(type, angle){
  orientationLabel.textContent = `${type || 'unknown'} (${angle ?? 'n/a'}°)`;
  if(!type){
    if(angle === 0) type = 'portrait-primary';
    else if(angle === 180) type = 'portrait-secondary';
    else if(angle === 90) type = 'landscape-primary';
    else if(angle === -90 || angle === 270) type = 'landscape-secondary';
  }
  switch(type){
    case 'portrait-primary': renderAlarm(); break;
    case 'portrait-secondary': renderTimer(); break;
    case 'landscape-primary': renderStopwatch(); break;
    case 'landscape-secondary': renderWeather(); break;
    default: renderAlarm(); break;
  }
}

function handleOrientationChange(){
  try{
    const so = screen.orientation || screen.mozOrientation || screen.msOrientation;
    if(so && so.type !== undefined){
      mapOrientation(so.type, so.angle);
    } else if(typeof window.orientation !== 'undefined'){
      mapOrientation(null, window.orientation);
    } else {
      mapOrientation('portrait-primary', 0);
    }
  }catch(e){
    mapOrientation('portrait-primary', 0);
  }
}

if(screen.orientation && screen.orientation.addEventListener){
  screen.orientation.addEventListener('change', handleOrientationChange);
} else {
  window.addEventListener('orientationchange', handleOrientationChange);
}
handleOrientationChange();

/* Optional: deviceorientation fallback for older devices */
if(!(screen.orientation && screen.orientation.type)){
  window.addEventListener('deviceorientation', ev=>{
    const g = ev.gamma; const b = ev.beta;
    if(b > 45) mapOrientation('portrait-primary', 0);
    else if(b < -135 || (b < -45 && g < 20)) mapOrientation('portrait-secondary', 180);
    else if(g > 20) mapOrientation('landscape-primary', 90);
    else if(g < -20) mapOrientation('landscape-secondary', 270);
  });
}
