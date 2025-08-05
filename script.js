/* Final HoldSense — full app
   Mappings:
   portrait-primary  -> Alarm (upright)
   portrait-secondary-> Timer (upside-down)
   landscape-primary -> Stopwatch (right-side up)
   landscape-secondary-> Weather (other landscape)
*/

/* ---------- DOM refs ---------- */
const orientationLabel = document.getElementById('orientationLabel');
const app = document.getElementById('app');
const alarmSound = document.getElementById('alarmSound');
const timerBeep = document.getElementById('timerBeep');
const alarmOverlay = document.getElementById('alarmOverlay');
const overlayMsg = document.getElementById('overlayMsg');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const snoozeAlarmBtn = document.getElementById('snoozeAlarmBtn');

/* ========== ALARM ========== */
let alarmInterval = null;
let alarmTimeVal = null;
let alarmSoundEnabled = false;
let isRinging = false;

function renderAlarm(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Alarm Clock (portrait upright)</div>

      <button id="enableAlarmSound" class="bigBtn" style="margin:12px 0;">Enable Alarm Sound</button>

      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap">
        <input id="alarmTime" type="time">
        <button id="setAlarmBtn" class="bigBtn">Set</button>
        <button id="cancelAlarmBtn" class="bigBtn">Cancel</button>
      </div>
      <div id="alarmStatus" class="notice">No alarm set</div>
    </div>
  `;

  document.getElementById('enableAlarmSound').addEventListener('click', enableAlarmSound);
  document.getElementById('setAlarmBtn').addEventListener('click', setAlarmHandler);
  document.getElementById('cancelAlarmBtn').addEventListener('click', cancelAlarmHandler);

  stopAlarmBtn.addEventListener('click', stopAlarm);
  snoozeAlarmBtn.addEventListener('click', snoozeAlarm);
}

function enableAlarmSound(){
  alarmSound.play().then(()=>{
    alarmSound.pause();
    alarmSound.currentTime = 0;
    alarmSoundEnabled = true;
    alert('✅ Alarm sound enabled for this session');
  }).catch(err=>{
    console.warn('enable sound failed', err);
    alert('Cannot enable sound. Try tapping the page or allow media playback in browser settings.');
  });
}

function setAlarmHandler(){
  const val = document.getElementById('alarmTime').value;
  const statusEl = document.getElementById('alarmStatus');
  if(!val){
    if(statusEl) statusEl.textContent = 'Please pick a time.';
    return;
  }
  alarmTimeVal = val;
  if(statusEl) statusEl.textContent = `Alarm set for ${alarmTimeVal}`;
  if(alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(checkAlarm, 1000);
}

function cancelAlarmHandler(){
  if(alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; }
  alarmTimeVal = null;
  const statusEl = document.getElementById('alarmStatus');
  if(statusEl) statusEl.textContent = 'No alarm set';
}

function checkAlarm(){
  if(!alarmTimeVal) return;
  const now = new Date();
  const [h,m] = alarmTimeVal.split(':').map(Number);
  if(now.getHours() === h && now.getMinutes() === m && now.getSeconds() === 0){
    triggerAlarm();
    clearInterval(alarmInterval);
    alarmInterval = null;
    alarmTimeVal = null;
  }
}

function triggerAlarm(){
  if(isRinging) return;
  isRinging = true;

  // overlay
  alarmOverlay.classList.remove('hidden');
  overlayMsg.textContent = "⏰ Time's up!";

  if(alarmSoundEnabled){
    alarmSound.loop = true;
    alarmSound.play().catch(err => console.warn('Play failed', err));
  }

  if(navigator.vibrate){
    try { navigator.vibrate([600,200,600]); } catch(e) {}
  }
}

function stopAlarm(){
  if(alarmSound && !alarmSound.paused){
    alarmSound.pause();
    alarmSound.currentTime = 0;
  }
  if(navigator.vibrate) navigator.vibrate(0);
  alarmOverlay.classList.add('hidden');
  isRinging = false;
  const statusEl = document.getElementById('alarmStatus');
  if(statusEl) statusEl.textContent = 'No alarm set';
}

function snoozeAlarm(){
  stopAlarm();
  const now = new Date(Date.now() + 5 * 60000);
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  alarmTimeVal = `${hh}:${mm}`;
  const statusEl = document.getElementById('alarmStatus');
  if(statusEl) statusEl.textContent = `Snoozed to ${alarmTimeVal}`;
  if(alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(checkAlarm, 1000);
}

/* ========== STOPWATCH (hours:mins:secs:ms + laps) ========== */
let stopwatchInterval = null;
let stopwatchTime = 0; // ms
let lapTimes = [];

function renderStopwatch(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Stopwatch (landscape right — hours:mins:secs:ms)</div>
      <div id="stopwatch" class="stat">0:00:00:000</div>
      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
        <button id="swStart" class="bigBtn">Start</button>
        <button id="swStop" class="bigBtn">Stop</button>
        <button id="swLap" class="bigBtn">Lap</button>
        <button id="swReset" class="bigBtn">Reset</button>
      </div>
      <div id="lapList" class="notice" style="margin-top:12px;text-align:left;max-height:200px;overflow:auto;"></div>
    </div>
  `;
  document.getElementById('swStart').addEventListener('click', startStopwatch);
  document.getElementById('swStop').addEventListener('click', stopStopwatch);
  document.getElementById('swLap').addEventListener('click', addLap);
  document.getElementById('swReset').addEventListener('click', resetStopwatch);
}

function startStopwatch(){
  if (stopwatchInterval) return;
  const start = Date.now() - stopwatchTime;
  stopwatchInterval = setInterval(() => {
    stopwatchTime = Date.now() - start;
    const el = document.getElementById('stopwatch');
    if (el) el.textContent = formatHMSms(stopwatchTime);
  }, 10);
}

function stopStopwatch(){
  if (stopwatchInterval) { clearInterval(stopwatchInterval); stopwatchInterval = null; }
}

function resetStopwatch(){
  stopStopwatch();
  stopwatchTime = 0;
  lapTimes = [];
  const sw = document.getElementById('stopwatch');
  if (sw) sw.textContent = '0:00:00:000';
  const lapList = document.getElementById('lapList');
  if (lapList) lapList.innerHTML = '';
}

function addLap(){
  if (stopwatchTime === 0) return;
  lapTimes.push(stopwatchTime);
  renderLaps();
}

function renderLaps(){
  const lapList = document.getElementById('lapList');
  if (!lapList) return;
  lapList.innerHTML = lapTimes.map((t,i)=>`<div>Lap ${i+1}: ${formatHMSms(t)}</div>`).join('');
}

function formatHMSms(ms){
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${hours}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}:${String(millis).padStart(3,'0')}`;
}

/* ========== TIMER ========== */
let timerInterval = null;
let timerRemaining = 0;

function renderTimer(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Timer (portrait upside-down)</div>
      <div style="margin-top:12px;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap">
        <input id="timerMin" type="number" min="0" placeholder="min" style="width:90px">
        <input id="timerSec" type="number" min="0" max="59" placeholder="sec" style="width:90px">
        <button id="setTimerBtn" class="bigBtn">Set</button>
      </div>
      <div id="timerDisplay" class="stat">00:00</div>
      <div style="margin-top:10px">
        <button id="timerStart" class="bigBtn">Start</button>
        <button id="timerPause" class="bigBtn">Pause</button>
        <button id="timerReset" class="bigBtn">Reset</button>
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

/* ========== WEATHER ========== */
async function renderWeather(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Weather of the Day (landscape opposite)</div>
      <div style="margin-top:12px">
        <div id="weatherLoc" class="stat">—</div>
        <div id="weatherDesc" class="notice">Tap refresh to fetch weather</div>
        <div style="margin-top:12px">
          <button id="refreshWeather" class="bigBtn">Refresh Weather</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('refreshWeather').addEventListener('click', fetchWeather);
}

async function fetchWeather(){
  // NOTE: this demo includes the key client-side. For production hide the key using a serverless proxy.
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

/* ========== ORIENTATION MAPPING ========== */
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

/* deviceorientation fallback for older devices */
if(!(screen.orientation && screen.orientation.type)){
  window.addEventListener('deviceorientation', ev=>{
    const g = ev.gamma; const b = ev.beta;
    if(b > 45) mapOrientation('portrait-primary', 0);
    else if(b < -135 || (b < -45 && g < 20)) mapOrientation('portrait-secondary', 180);
    else if(g > 20) mapOrientation('landscape-primary', 90);
    else if(g < -20) mapOrientation('landscape-secondary', 270);
  });
}
