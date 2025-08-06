/* HoldSense — final fully updated script
   - Includes Alarm (custom tones), Stopwatch (hrs:min:sec:ms + laps),
     Timer, and upgraded Weather (live location + hourly + sunrise/sunset + dynamic bg).
   - OPENWEATHER_API_KEY embedded below.
*/

/* ========== CONFIG ========== */
const OPENWEATHER_API_KEY = "357c34ab8062a8aaf991e47747413147"; // your key

/* ========== DOM refs ========== */
const orientationLabel = document.getElementById('orientationLabel');
const app = document.getElementById('app');
const alarmOverlay = document.getElementById('alarmOverlay');
const overlayMsg = document.getElementById('overlayMsg');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const snoozeAlarmBtn = document.getElementById('snoozeAlarmBtn');
const alarmAudio = document.getElementById('alarmAudio');
const timerBeep = document.getElementById('timerBeep');

/* ========== STATE ========== */
let alarmInterval = null, alarmTimeVal = null, alarmSoundEnabled = false, isRinging=false;
let stopwatchInterval=null, stopwatchTime=0, lapTimes=[];
let timerInterval=null, timerRemaining=0;
let cachedWeather = null;

/* ========== HELPERS ========== */
function safeQuery(sel){ return document.querySelector(sel); }
function pad(n, w=2){ return String(n).padStart(w,'0'); }
function formatHMSms(ms){
  const hours = Math.floor(ms/3600000);
  const mins = Math.floor((ms%3600000)/60000);
  const secs = Math.floor((ms%60000)/1000);
  const millis = ms%1000;
  return `${hours}:${pad(mins)}:${pad(secs)}:${String(millis).padStart(3,'0')}`;
}
function localTime(unixTs, opts={hour12:true, hourOnly:false}){
  const d = new Date(unixTs*1000);
  if(opts.hourOnly) return d.toLocaleTimeString([], {hour:'numeric', hour12:opts.hour12});
  return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit', hour12:opts.hour12});
}

/* ========== ALARM ========== */
function renderAlarm(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Alarm Clock (portrait upright)</div>

      <div class="row" style="margin-top:12px">
        <button id="enableSoundBtn" class="bigBtn">Enable Alarm Sound</button>
        <label style="display:flex;align-items:center;gap:8px">
          Tone:
          <select id="presetTones">
            <option value="">(none)</option>
            <option value="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg">Classic</option>
            <option value="https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg">Digital</option>
            <option value="https://actions.google.com/sounds/v1/alarms/slow_silent_clock.ogg">Slow chime</option>
          </select>
        </label>
      </div>

      <div class="row" style="margin-top:12px">
        <label style="display:flex;align-items:center;gap:8px;">
          Choose file:
          <input id="toneFile" type="file" accept="audio/*">
        </label>
      </div>

      <div class="row" style="margin-top:12px">
        <input id="alarmTime" type="time">
        <button id="setAlarmBtn" class="bigBtn">Set</button>
        <button id="cancelAlarmBtn" class="bigBtn">Cancel</button>
      </div>

      <div id="alarmStatus" class="notice">No alarm set</div>
    </div>
  `;

  safeQuery('#enableSoundBtn').addEventListener('click', unlockAudio);
  safeQuery('#presetTones').addEventListener('change', e=>{
    const url = e.target.value;
    if(url){ alarmAudio.src = url; alarmSoundEnabled = true; }
  });
  safeQuery('#toneFile').addEventListener('change', e=>{
    const f = e.target.files[0];
    if(f){
      if(alarmAudio.src && alarmAudio.src.startsWith('blob:')) URL.revokeObjectURL(alarmAudio.src);
      const obj = URL.createObjectURL(f);
      alarmAudio.src = obj;
      alarmSoundEnabled = true;
      safeQuery('.notice').textContent = 'Custom tone selected';
    }
  });

  safeQuery('#setAlarmBtn').addEventListener('click', setAlarmHandler);
  safeQuery('#cancelAlarmBtn').addEventListener('click', cancelAlarmHandler);

  stopAlarmBtn.addEventListener('click', stopAlarm);
  snoozeAlarmBtn.addEventListener('click', snoozeAlarm);
}

function unlockAudio(){
  if(!alarmAudio.src) alarmAudio.src = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg';
  alarmAudio.play().then(()=>{ alarmAudio.pause(); alarmAudio.currentTime = 0; alarmSoundEnabled = true; alert('Alarm sound enabled for this session'); })
    .catch(()=> alert('Unable to enable audio. Try tapping the page or choose a file.'));
}

function setAlarmHandler(){
  const val = safeQuery('#alarmTime').value;
  const status = safeQuery('#alarmStatus');
  if(!val){ if(status) status.textContent = 'Please pick a time.'; return; }
  alarmTimeVal = val;
  if(status) status.textContent = `Alarm set for ${alarmTimeVal}`;
  if(alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(checkAlarm, 1000);
}

function cancelAlarmHandler(){
  if(alarmInterval){ clearInterval(alarmInterval); alarmInterval = null; }
  alarmTimeVal = null;
  const s = safeQuery('#alarmStatus'); if(s) s.textContent = 'No alarm set';
}

function checkAlarm(){
  if(!alarmTimeVal) return;
  const now = new Date(); const [h,m] = alarmTimeVal.split(':').map(Number);
  if(now.getHours()===h && now.getMinutes()===m && now.getSeconds()===0){
    triggerAlarm(); clearInterval(alarmInterval); alarmInterval=null; alarmTimeVal=null;
  }
}

function triggerAlarm(){
  if(isRinging) return; isRinging=true;
  alarmOverlay.classList.remove('hidden'); overlayMsg.textContent = "⏰ Time's up!";
  if(alarmSoundEnabled && alarmAudio.src){
    alarmAudio.loop = true;
    alarmAudio.play().catch(()=>{});
  } else {
    try{ timerBeep.play().catch(()=>{}); }catch(e){}
  }
  if(navigator.vibrate) try{ navigator.vibrate([600,200,600]); }catch(e){}
}

function stopAlarm(){
  try{ if(alarmAudio && !alarmAudio.paused){ alarmAudio.pause(); alarmAudio.currentTime = 0; } }catch(e){}
  if(navigator.vibrate) navigator.vibrate(0);
  alarmOverlay.classList.add('hidden'); isRinging=false;
  const s = safeQuery('#alarmStatus'); if(s) s.textContent = 'No alarm set';
}

function snoozeAlarm(){
  stopAlarm();
  const now = new Date(Date.now() + 5*60000);
  const hh = pad(now.getHours()); const mm = pad(now.getMinutes());
  alarmTimeVal = `${hh}:${mm}`;
  const s = safeQuery('#alarmStatus'); if(s) s.textContent = `Snoozed to ${alarmTimeVal}`;
  if(alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(checkAlarm, 1000);
}

/* ========== STOPWATCH ========== */
function renderStopwatch(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Stopwatch (landscape right — hours:mins:secs:ms)</div>
      <div id="stopwatch" class="stat">${formatHMSms(stopwatchTime)}</div>
      <div class="row" style="margin-top:12px">
        <button id="swStart" class="bigBtn">Start</button>
        <button id="swStop" class="bigBtn">Stop</button>
        <button id="swLap" class="bigBtn">Lap</button>
        <button id="swReset" class="bigBtn">Reset</button>
      </div>
      <div id="laps" class="notice" style="margin-top:12px;text-align:left;max-height:180px;overflow:auto;"></div>
    </div>
  `;
  safeQuery('#swStart').addEventListener('click', startStopwatch);
  safeQuery('#swStop').addEventListener('click', stopStopwatch);
  safeQuery('#swLap').addEventListener('click', addLap);
  safeQuery('#swReset').addEventListener('click', resetStopwatch);
}

function startStopwatch(){
  if(stopwatchInterval) return;
  const start = Date.now() - stopwatchTime;
  stopwatchInterval = setInterval(()=> {
    stopwatchTime = Date.now() - start;
    const el = safeQuery('#stopwatch'); if(el) el.textContent = formatHMSms(stopwatchTime);
  }, 10);
}

function stopStopwatch(){ if(stopwatchInterval){ clearInterval(stopwatchInterval); stopwatchInterval=null; } }

function resetStopwatch(){
  stopStopwatch(); stopwatchTime=0; lapTimes=[]; const el=safeQuery('#stopwatch'); if(el) el.textContent='0:00:00:000'; const l=safeQuery('#laps'); if(l) l.innerHTML='';
}

function addLap(){ if(stopwatchTime===0) return; lapTimes.push(stopwatchTime); const l=safeQuery('#laps'); if(l) l.innerHTML = lapTimes.map((t,i)=>`<div>Lap ${i+1}: ${formatHMSms(t)}</div>`).join(''); }

/* ========== TIMER ========== */
function renderTimer(){
  app.innerHTML = `
    <div class="center">
      <div class="muted">Timer (portrait upside-down)</div>
      <div class="row" style="margin-top:12px">
        <input id="timerMin" type="number" min="0" placeholder="min" style="width:90px">
        <input id="timerSec" type="number" min="0" max="59" placeholder="sec" style="width:90px">
        <button id="setTimerBtn" class="bigBtn">Set</button>
      </div>
      <div id="timerDisplay" class="stat">00:00</div>
      <div class="row" style="margin-top:10px">
        <button id="timerStart" class="bigBtn">Start</button>
        <button id="timerPause" class="bigBtn">Pause</button>
        <button id="timerReset" class="bigBtn">Reset</button>
      </div>
    </div>
  `;
  safeQuery('#setTimerBtn').addEventListener('click', ()=>{
    const m = parseInt(safeQuery('#timerMin').value||0,10);
    const s = parseInt(safeQuery('#timerSec').value||0,10);
    timerRemaining = (m*60 + s) * 1000; updateTimerDisplay();
  });
  safeQuery('#timerStart').addEventListener('click', startTimer);
  safeQuery('#timerPause').addEventListener('click', pauseTimer);
  safeQuery('#timerReset').addEventListener('click', resetTimer);
}

function updateTimerDisplay(){ const sec=Math.ceil(timerRemaining/1000); const mm=pad(Math.floor(sec/60)); const ss=pad(sec%60); const el=safeQuery('#timerDisplay'); if(el) el.textContent=`${mm}:${ss}`; }

function startTimer(){
  if(timerInterval || timerRemaining<=0) return;
  let last = Date.now();
  timerInterval = setInterval(()=>{
    const now = Date.now();
    timerRemaining -= (now - last);
    last = now;
    if(timerRemaining <= 0){
      clearInterval(timerInterval); timerInterval=null; timerRemaining=0; updateTimerDisplay();
      timerBeep.play().catch(()=>{});
      if(navigator.vibrate) navigator.vibrate(500);
      alert('Timer finished!');
      return;
    }
    updateTimerDisplay();
  }, 200);
}
function pauseTimer(){ if(timerInterval){ clearInterval(timerInterval); timerInterval=null; } }
function resetTimer(){ if(timerInterval) clearInterval(timerInterval); timerInterval=null; timerRemaining=0; updateTimerDisplay(); }

/* ========== WEATHER (improved live location + hourly + sunrise/sunset + dynamic bg) ========== */
async function renderWeather(){
  app.innerHTML = `
    <div class="center weather-root">
      <div id="weatherHeader" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:6px">
        <div id="weatherLocation" class="stat">—</div>
        <div id="weatherCurrent" class="notice">Loading…</div>
        <div id="sunTimes" class="notice" style="font-size:0.95rem"></div>
      </div>

      <div style="width:100%;margin-top:12px">
        <div style="display:flex;justify-content:center">
          <button id="refreshWeather" class="bigBtn">Refresh</button>
        </div>
        <div id="hourlyContainer" style="margin-top:14px"></div>
      </div>
      <div id="weatherMsg" class="notice" style="margin-top:8px"></div>
    </div>
  `;
  safeQuery('#refreshWeather').addEventListener('click', fetchWeather);
  if(cachedWeather) applyWeatherToUI(cachedWeather);
  else fetchWeather();
}

async function fetchWeather(){
  const msg = safeQuery('#weatherMsg'); if(!navigator.geolocation){ if(msg) msg.textContent='Geolocation not supported.'; return; }
  if(msg) msg.textContent='Getting location…';
  navigator.geolocation.getCurrentPosition(async pos=>{
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    if(msg) msg.textContent='Fetching weather…';
    try{
      const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const r = await fetch(oneCallUrl);
      if(!r.ok) throw new Error('OWM error ' + r.status);
      const data = await r.json();

      // reverse geocode (Nominatim) for friendly place name (best-effort)
      let place = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      try{
        const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        if(rev.ok){
          const revj = await rev.json();
          if(revj && revj.address){
            const c = revj.address.city || revj.address.town || revj.address.village || revj.address.county || revj.address.state;
            const country = revj.address.country;
            place = c ? `${c}${country? ', ' + country: ''}` : (country || place);
          }
        }
      }catch(e){ /* ignore reverse geocode failure */ }

      const weatherObj = {
        lat, lon, place,
        current: {
          temp: data.current.temp,
          feels_like: data.current.feels_like,
          dt: data.current.dt,
          sunrise: data.current.sunrise,
          sunset: data.current.sunset,
          weather: data.current.weather && data.current.weather[0]
        },
        hourly: (data.hourly || []).slice(0,12)
      };
      cachedWeather = weatherObj;
      applyWeatherToUI(weatherObj);
      if(msg) msg.textContent = '';
    }catch(err){
      console.error('fetchWeather err', err);
      if(msg) msg.textContent = 'Weather fetch failed — check API/key/CORS.';
    }
  }, err=>{
    console.error('geo err', err);
    if(msg) msg.textContent = 'Location permission denied or unavailable.';
  }, {enableHighAccuracy:true, timeout:10000, maximumAge:60000});
}

function applyWeatherToUI(w){
  if(!w) return;
  const locEl = safeQuery('#weatherLocation');
  const curEl = safeQuery('#weatherCurrent');
  const sunEl = safeQuery('#sunTimes');
  const hourlyContainer = safeQuery('#hourlyContainer');

  locEl.textContent = w.place || 'Your location';
  const cw = w.current.weather || {};
  const iconUrl = cw.icon ? `https://openweathermap.org/img/wn/${cw.icon}@2x.png` : '';
  curEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;justify-content:center">
      ${iconUrl? `<img src="${iconUrl}" alt="${cw.description||''}" style="width:56px;height:56px">` : ''}
      <div style="text-align:left">
        <div style="font-weight:600">${Math.round(w.current.temp)}°C</div>
        <div style="font-size:0.95rem">${(cw.main||'')} — ${cw.description||''}</div>
      </div>
    </div>
  `;
  sunEl.textContent = `Sunrise: ${localTime(w.current.sunrise)}  •  Sunset: ${localTime(w.current.sunset)}`;
  hourlyContainer.innerHTML = `<div class="hourly-scroll">${w.hourly.map(h=>hourCardHtml(h)).join('')}</div>`;
  applyDynamicBackground(cw);
}

function hourCardHtml(h){
  const t = localTime(h.dt, {hour12:true, hourOnly:true});
  const icon = h.weather && h.weather[0] && h.weather[0].icon;
  const desc = h.weather && h.weather[0] && h.weather[0].description;
  const pop = Math.round((h.pop||0)*100);
  const temp = Math.round(h.temp);
  return `
    <div class="hourCard">
      <div class="hourTime">${t}</div>
      <div class="hourIcon">${icon? `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">`:''}</div>
      <div class="hourTemp">${temp}°</div>
      <div class="hourPop">${pop}%</div>
    </div>
  `;
}

function applyDynamicBackground(weatherObj){
  document.body.classList.remove('weather-sunny','weather-cloudy','weather-rain','weather-snow','weather-night','weather-mist');
  if(!weatherObj) return;
  const main = (weatherObj.main||'').toLowerCase();
  const icon = weatherObj.icon || '';
  if(icon.endsWith('n')) document.body.classList.add('weather-night');
  else if(main.includes('cloud')) document.body.classList.add('weather-cloudy');
  else if(main.includes('rain') || main.includes('drizzle') || main.includes('thunder')) document.body.classList.add('weather-rain');
  else if(main.includes('snow')) document.body.classList.add('weather-snow');
  else if(main.includes('mist')||main.includes('fog')||main.includes('haze')) document.body.classList.add('weather-mist');
  else document.body.classList.add('weather-sunny');
}

/* ========== ORIENTATION MAPPING ========== */
function mapOrientation(type, angle){
  orientationLabel.textContent = `${type || 'unknown'} (${angle ?? 'n/a'}°)`;
  if(!type){
    if(angle===0) type='portrait-primary';
    else if(angle===180) type='portrait-secondary';
    else if(angle===90) type='landscape-primary';
    else if(angle===-90 || angle===270) type='landscape-secondary';
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
    if(so && so.type !== undefined) mapOrientation(so.type, so.angle);
    else if(typeof window.orientation !== 'undefined') mapOrientation(null, window.orientation);
    else mapOrientation('portrait-primary',0);
  }catch(e){ mapOrientation('portrait-primary',0); }
}

if(screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', handleOrientationChange);
else window.addEventListener('orientationchange', handleOrientationChange);
handleOrientationChange();

/* deviceorientation fallback */
if(!(screen.orientation && screen.orientation.type)){
  window.addEventListener('deviceorientation', ev=>{
    const g = ev.gamma, b = ev.beta;
    if(b>45) mapOrientation('portrait-primary',0);
    else if(b < -135 || (b < -45 && g < 20)) mapOrientation('portrait-secondary',180);
    else if(g > 20) mapOrientation('landscape-primary',90);
    else if(g < -20) mapOrientation('landscape-secondary',270);
  });
}
