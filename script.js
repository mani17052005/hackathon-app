/* HoldSense - final full app with custom alarm tone support and live location weather
   Replace OPENWEATHER_API_KEY value with your OpenWeatherMap key if needed.
*/

/* ---------- Configuration ---------- */
const OPENWEATHER_API_KEY = "357c34ab8062a8aaf991e47747413147"; // <-- replace or keep for demo

/* ---------- DOM refs ---------- */
const orientationLabel = document.getElementById('orientationLabel');
const app = document.getElementById('app');
const alarmAudio = document.getElementById('alarmAudio');
const timerBeep = document.getElementById('timerBeep');
const alarmOverlay = document.getElementById('alarmOverlay');
const overlayMsg = document.getElementById('overlayMsg');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const snoozeAlarmBtn = document.getElementById('snoozeAlarmBtn');

/* ---------- App state ---------- */
let alarmInterval = null;
let alarmTimeVal = null;     // "HH:MM" (24h)
let alarmSoundEnabled = false;
let isRinging = false;
let alarmLooping = false;
let alarmSourceURL = '';     // URL or object URL for selected tone

/* Stopwatch state */
let stopwatchInterval = null;
let stopwatchTime = 0; // ms
let lapTimes = [];

/* Timer state */
let timerInterval = null;
let timerRemaining = 0;

/* Weather cache (so we can keep last data on rotation) */
let lastWeather = null;

/* ---------- UTIL ---------- */
function showNotice(text){
  // fallback: update a small notice area in app if present
  const n = document.querySelector('.notice');
  if(n) n.textContent = text;
}

/* ---------- RENDER PANELS ---------- */

/* ALARM panel - supports selecting custom tone or built-in tones */
function renderAlarm(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Alarm Clock (portrait upright)</div>

      <div class="row" style="margin-top:12px;">
        <button id="enableSoundBtn" class="bigBtn">Enable Alarm Sound</button>
        <label style="display:flex;align-items:center;gap:8px;">
          Tone:
          <select id="presetTones">
            <option value="">(Select built-in)</option>
            <option value="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg">Alarm classic</option>
            <option value="https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg">Digital</option>
            <option value="https://actions.google.com/sounds/v1/alarms/slow_silent_clock.ogg">Slow chime</option>
          </select>
        </label>
      </div>

      <div class="row" style="margin-top:12px;">
        <label style="display:flex;align-items:center;gap:8px;">
          Choose file:
          <input id="toneFile" type="file" accept="audio/*">
        </label>
      </div>

      <div class="row" style="margin-top:12px;">
        <input id="alarmTime" type="time">
        <button id="setAlarmBtn" class="bigBtn">Set</button>
        <button id="cancelAlarmBtn" class="bigBtn">Cancel</button>
      </div>

      <div id="alarmStatus" class="notice">No alarm set</div>
    </div>
  `;

  // wire events
  document.getElementById('enableSoundBtn').addEventListener('click', unlockAudio);
  document.getElementById('presetTones').addEventListener('change', e=>{
    const url = e.target.value;
    if(url){
      alarmSourceURL = url;
      // set into audio element
      alarmAudio.src = url;
      // unlock automatically when user selects (this is a user gesture)
      alarmAudio.play().then(()=>{ alarmAudio.pause(); alarmAudio.currentTime=0; alarmSoundEnabled = true; })
        .catch(()=>{});
    }
  });
  document.getElementById('toneFile').addEventListener('change', e=>{
    const f = e.target.files[0];
    if(f){
      // revoke previous ObjectURL if any
      if(alarmSourceURL && alarmSourceURL.startsWith('blob:')) URL.revokeObjectURL(alarmSourceURL);
      alarmSourceURL = URL.createObjectURL(f);
      alarmAudio.src = alarmSourceURL;
      // user selected file is a gesture - we can unlock audio
      alarmSoundEnabled = true;
      showNotice('Custom tone selected');
    }
  });

  document.getElementById('setAlarmBtn').addEventListener('click', setAlarmHandler);
  document.getElementById('cancelAlarmBtn').addEventListener('click', cancelAlarmHandler);

  // overlay controls (ensure these exist)
  stopAlarmBtn.addEventListener('click', stopAlarm);
  snoozeAlarmBtn.addEventListener('click', snoozeAlarm);
}

function unlockAudio(){
  // play/pause a short sound to unlock audio autoplay for the page (user gesture required)
  if(!alarmAudio.src){
    // set a default small beep if none chosen
    alarmAudio.src = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg';
  }
  alarmAudio.play().then(()=>{
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    alarmSoundEnabled = true;
    alert('Alarm sound enabled for this session.');
  }).catch(err=>{
    console.warn('unlock audio failed', err);
    alert('Could not enable sound. Try tapping the page and try again.');
  });
}

function setAlarmHandler(){
  const val = document.getElementById('alarmTime').value;
  const statusEl = document.getElementById('alarmStatus');
  if(!val){ if(statusEl) statusEl.textContent = 'Please pick a time.'; return; }
  alarmTimeVal = val;
  if(statusEl) statusEl.textContent = `Alarm set for ${alarmTimeVal}`;
  if(alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(checkAlarm, 1000);
}

function cancelAlarmHandler(){
  if(alarmInterval){ clearInterval(alarmInterval); alarmInterval = null; }
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

  // show overlay
  alarmOverlay.classList.remove('hidden');
  overlayMsg.textContent = "⏰ Time's up!";

  // if audio enabled and source available, play looped
  if(alarmSoundEnabled && alarmAudio.src){
    alarmAudio.loop = true;
    alarmAudio.play().catch(err => console.warn('play failed', err));
    alarmLooping = true;
  } else {
    // Try a beep if audio not enabled
    try { timerBeep.play().catch(()=>{}); } catch(e){}
  }

  // vibrate
  if(navigator.vibrate){
    try{ navigator.vibrate([600,200,600]); }catch(e){}
  }
}

function stopAlarm(){
  // stop audio
  try {
    if(alarmAudio && !alarmAudio.paused){
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    }
  } catch(e){}
  // stop vibration
  if(navigator.vibrate) navigator.vibrate(0);

  alarmOverlay.classList.add('hidden');
  isRinging = false;
  alarmLooping = false;
  const statusEl = document.getElementById('alarmStatus');
  if(statusEl) statusEl.textContent = 'No alarm set';
}

function snoozeAlarm(){
  stopAlarm();
  // snooze 5 minutes
  const now = new Date(Date.now() + 5*60000);
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  alarmTimeVal = `${hh}:${mm}`;
  const statusEl = document.getElementById('alarmStatus');
  if(statusEl) statusEl.textContent = `Snoozed to ${alarmTimeVal}`;
  if(alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(checkAlarm, 1000);
}

/* ---------- STOPWATCH (hrs:min:sec:ms + laps) ---------- */
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
      <div id="laps" class="notice" style="margin-top:12px;text-align:left;max-height:180px;overflow:auto;"></div>
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
  stopwatchInterval = setInterval(()=> {
    stopwatchTime = Date.now() - start;
    const el = document.getElementById('stopwatch');
    if(el) el.textContent = formatHMSms(stopwatchTime);
  }, 10);
}

function stopStopwatch(){
  if(stopwatchInterval){ clearInterval(stopwatchInterval); stopwatchInterval = null; }
}

function resetStopwatch(){
  stopStopwatch();
  stopwatchTime = 0;
  lapTimes = [];
  const el = document.getElementById('stopwatch');
  if(el) el.textContent = '0:00:00:000';
  const lapsEl = document.getElementById('laps');
  if(lapsEl) lapsEl.innerHTML = '';
}

function addLap(){
  if(stopwatchTime === 0) return;
  lapTimes.push(stopwatchTime);
  const lapsEl = document.getElementById('laps');
  if(!lapsEl) return;
  lapsEl.innerHTML = lapTimes.map((t,i)=>`<div>Lap ${i+1}: ${formatHMSms(t)}</div>`).join('');
}

function formatHMSms(ms){
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${hours}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}:${String(millis).padStart(3,'0')}`;
}

/* ---------- TIMER ---------- */
function renderTimer(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Timer (portrait upside-down)</div>
      <div class="row" style="margin-top:12px;">
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
      // play beep
      timerBeep.play().catch(()=>{});
      // vibrate and show a small overlay using alert
      if(navigator.vibrate) navigator.vibrate(500);
      alert("⏳ Timer finished!");
      return;
    }
    updateTimerDisplay();
  }, 200);
}

function pauseTimer(){ if(timerInterval){ clearInterval(timerInterval); timerInterval = null; } }
function resetTimer(){ if(timerInterval) clearInterval(timerInterval); timerInterval=null; timerRemaining=0; updateTimerDisplay(); }

/* ---------- WEATHER (live location) ---------- */
async function renderWeather(){
  // show UI
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
  // if we have cached weather, show it
  if(lastWeather) {
    document.getElementById('weatherLoc').textContent = `${lastWeather.name} • ${Math.round(lastWeather.temp)}°C`;
    document.getElementById('weatherDesc').textContent = `${lastWeather.main} — ${lastWeather.desc}`;
  }
}

async function fetchWeather(){
  if(!navigator.geolocation){ document.getElementById('weatherDesc').textContent='Geolocation not available.'; return; }
  document.getElementById('weatherDesc').textContent = 'Getting location…';
  navigator.geolocation.getCurrentPosition(async pos=>{
    const {latitude, longitude} = pos.coords;
    document.getElementById('weatherDesc').textContent = 'Fetching weather…';
    try{
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const r = await fetch(url);
      if(!r.ok) throw new Error('Bad response');
      const data = await r.json();
      const name = data.name || `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
      const temp = data.main.temp;
      const main = data.weather?.[0]?.main || '';
      const desc = data.weather?.[0]?.description || '';
      lastWeather = { name, temp, main, desc };
      document.getElementById('weatherLoc').textContent = `${name} • ${Math.round(temp)}°C`;
      document.getElementById('weatherDesc').textContent = `${main} — ${desc}`;
    }catch(err){
      console.error(err);
      document.getElementById('weatherDesc').textContent = 'Weather fetch failed — check API or CORS.';
    }
  }, err=>{
    document.getElementById('weatherDesc').textContent = 'Location denied or unavailable.';
  }, {timeout:10000});
}

/* ---------- ORIENTATION MAPPING ---------- */
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

/* add listeners */
if(screen.orientation && screen.orientation.addEventListener){
  screen.orientation.addEventListener('change', handleOrientationChange);
} else {
  window.addEventListener('orientationchange', handleOrientationChange);
}
handleOrientationChange();

/* fallback: deviceorientation heuristics */
if(!(screen.orientation && screen.orientation.type)){
  window.addEventListener('deviceorientation', ev=>{
    const g = ev.gamma; const b = ev.beta;
    if(b > 45) mapOrientation('portrait-primary', 0);
    else if(b < -135 || (b < -45 && g < 20)) mapOrientation('portrait-secondary', 180);
    else if(g > 20) mapOrientation('landscape-primary', 90);
    else if(g < -20) mapOrientation('landscape-secondary', 270);
  });
}