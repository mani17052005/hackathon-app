/* script.js — Polished front-end (client) */
/* Assumes serverless endpoint at /api/weather (Vercel). */
/* The client does NOT hold the OpenWeather key. */

const shell = document.querySelector('.app-shell');
const orientationLabel = document.getElementById('orientationLabel');
const app = document.getElementById('app');

const alarmOverlay = document.getElementById('alarmOverlay');
const overlayMsg = document.getElementById('overlayMsg');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const snoozeAlarmBtn = document.getElementById('snoozeAlarmBtn');
const alarmAudio = document.getElementById('alarmAudio');
const timerBeep = document.getElementById('timerBeep');

let alarmInterval = null, alarmTimeVal = null, alarmSoundEnabled = false;
let stopwatchInterval = null, stopwatchTime = 0, lapTimes = [];
let timerInterval = null, timerRemaining = 0;
let cachedWeather = null;

const SERVERLESS_WEATHER_PATH = '/api/weather'; // Vercel: /api/weather ; Netlify: change accordingly

function setModeClass(mode){
  shell.classList.remove('mode-alarm','mode-stopwatch','mode-timer','mode-weather');
  if(mode) shell.classList.add(`mode-${mode}`);
}

/* ---------- Renderers ---------- */

function clearApp(){ app.innerHTML = ''; }

function renderHome(){
  setModeClass(null);
  clearApp();
  app.innerHTML = `
    <div class="card pane center">
      <div class="welcome"><h2>Rotate your phone</h2>
      <p class="muted">Portrait ↑ = Alarm • Landscape → = Stopwatch • Portrait ↓ = Timer • Landscape ← = Weather</p>
      <div class="cta-row">
        <button id="quickEnable" class="bigBtn">Enable Alarm Sound</button>
        <button id="quickRefresh" class="bigBtn ghost">Refresh Weather</button>
      </div>
      </div>
    </div>
  `;
  document.getElementById('quickEnable').addEventListener('click', unlockAudio);
  document.getElementById('quickRefresh').addEventListener('click', ()=> fetchWeather().catch(()=>{}));
}

/* ALARM */
function renderAlarm(){
  setModeClass('alarm');
  clearApp();
  app.innerHTML = `
    <div class="card">
      <div class="center"><strong>Alarm Clock</strong></div>
      <label>Alarm time: <input id="alarmTime" type="time"></label>
      <div class="row" style="margin-top:8px">
        <button id="setAlarmBtn">Set Alarm</button>
        <button id="cancelAlarmBtn" class="btn-ghost">Cancel</button>
      </div>
      <div style="margin-top:12px">
        <button id="enableSoundBtn" class="btn-ghost">Enable Alarm Sound</button>
        <label style="display:block;margin-top:8px">Choose tone file: <input id="toneFile" type="file" accept="audio/*"></label>
      </div>
      <div id="alarmStatus" class="muted small" style="margin-top:10px">No alarm set</div>
    </div>
  `;
  document.getElementById('enableSoundBtn').addEventListener('click', unlockAudio);
  document.getElementById('toneFile').addEventListener('change', e=>{
    const f = e.target.files[0];
    if(f){
      if(alarmAudio.src && alarmAudio.src.startsWith('blob:')) try{ URL.revokeObjectURL(alarmAudio.src); }catch(e){}
      alarmAudio.src = URL.createObjectURL(f);
      alarmSoundEnabled = true;
      document.getElementById('alarmStatus').textContent = 'Custom tone selected';
    }
  });
  document.getElementById('setAlarmBtn').addEventListener('click', ()=>{
    const val = document.getElementById('alarmTime').value;
    const status = document.getElementById('alarmStatus');
    if(!val){ status.textContent = 'Pick a valid time'; return; }
    alarmTimeVal = val;
    if(alarmInterval) clearInterval(alarmInterval);
    alarmInterval = setInterval(checkAlarm, 1000);
    status.textContent = `Alarm set for ${val}`;
  });
  document.getElementById('cancelAlarmBtn').addEventListener('click', ()=>{
    if(alarmInterval) clearInterval(alarmInterval);
    alarmInterval = null; alarmTimeVal = null;
    document.getElementById('alarmStatus').textContent = 'No alarm set';
  });

  stopAlarmBtn.onclick = stopAlarm;
  snoozeAlarmBtn.onclick = snoozeAlarm;
}

function unlockAudio(){
  if(!alarmAudio.src) alarmAudio.src = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg';
  alarmAudio.play().then(()=>{ alarmAudio.pause(); alarmAudio.currentTime = 0; alarmSoundEnabled = true; alert('Alarm sound enabled'); }).catch(()=>alert('Tap or select a file to enable audio'));
}

function checkAlarm(){
  if(!alarmTimeVal) return;
  const now = new Date();
  const [h,m] = alarmTimeVal.split(':').map(Number);
  if(now.getHours() === h && now.getMinutes() === m && now.getSeconds() === 0){
    clearInterval(alarmInterval); alarmInterval = null; alarmTimeVal = null;
    triggerAlarm();
    const st = document.getElementById('alarmStatus'); if(st) st.textContent = 'Alarm triggered';
  }
}

function triggerAlarm(){
  overlayMsg.textContent = "⏰ Alarm ringing";
  alarmOverlay.classList.remove('hidden');
  if(alarmSoundEnabled && alarmAudio.src){
    alarmAudio.loop = true; alarmAudio.play().catch(()=>{});
  } else { try{ timerBeep.play().catch(()=>{}); } catch(e){} }
  if(navigator.vibrate) navigator.vibrate([600,200,600]);
}

function stopAlarm(){
  try{ if(alarmAudio && !alarmAudio.paused){ alarmAudio.pause(); alarmAudio.currentTime = 0; } } catch(e){}
  alarmOverlay.classList.add('hidden');
  if(navigator.vibrate) navigator.vibrate(0);
}

function snoozeAlarm(){
  stopAlarm();
  const d = new Date(Date.now() + 5*60000);
  alarmTimeVal = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  if(alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(checkAlarm,1000);
  const st = document.getElementById('alarmStatus'); if(st) st.textContent = `Snoozed to ${alarmTimeVal}`;
}

/* STOPWATCH */
function renderStopwatch(){
  setModeClass('stopwatch');
  clearApp();
  app.innerHTML = `
    <div class="card center">
      <div class="muted">Stopwatch</div>
      <div id="swDisplay" class="stat">${formatHMSms(stopwatchTime)}</div>
      <div class="row" style="margin-top:8px">
        <button id="swStart">Start</button>
        <button id="swStop" class="btn-ghost">Stop</button>
        <button id="swLap" class="btn-ghost">Lap</button>
        <button id="swReset" class="btn-ghost">Reset</button>
      </div>
      <div id="lapsArea" class="small muted" style="text-align:left;margin-top:10px;max-height:160px;overflow:auto"></div>
    </div>
  `;
  document.getElementById('swStart').addEventListener('click', startStopwatch);
  document.getElementById('swStop').addEventListener('click', stopStopwatch);
  document.getElementById('swLap').addEventListener('click', addLap);
  document.getElementById('swReset').addEventListener('click', resetStopwatch);
}

function formatHMSms(ms){
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  const s = Math.floor((ms%60000)/1000);
  const msr = ms%1000;
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(msr).padStart(3,'0')}`;
}

function startStopwatch(){
  if(stopwatchInterval) return;
  const start = Date.now() - stopwatchTime;
  stopwatchInterval = setInterval(()=> {
    stopwatchTime = Date.now() - start;
    const el = document.getElementById('swDisplay'); if(el) el.textContent = formatHMSms(stopwatchTime);
  }, 10);
}

function stopStopwatch(){ if(stopwatchInterval){ clearInterval(stopwatchInterval); stopwatchInterval=null; } }

function resetStopwatch(){ stopStopwatch(); stopwatchTime=0; lapTimes=[]; const d = document.getElementById('swDisplay'); if(d) d.textContent = formatHMSms(0); const la = document.getElementById('lapsArea'); if(la) la.innerHTML=''; }

function addLap(){ if(stopwatchTime === 0) return; lapTimes.push(stopwatchTime); const la = document.getElementById('lapsArea'); if(la) la.innerHTML = lapTimes.map((t,i)=>`Lap ${i+1}: ${formatHMSms(t)}`).join('<br>'); }

/* TIMER */
function renderTimer(){
  setModeClass('timer');
  clearApp();
  app.innerHTML = `
    <div class="card center">
      <div class="muted">Timer</div>
      <div class="row" style="margin-top:8px">
        <input id="timerMin" type="number" min="0" value="1" style="width:110px">
        <button id="timerSet">Set & Start</button>
      </div>
      <div id="timerDisplay" class="stat">00:00</div>
      <div style="margin-top:8px">
        <button id="timerPause" class="btn-ghost">Pause</button>
        <button id="timerReset" class="btn-ghost">Reset</button>
      </div>
    </div>
  `;
  document.getElementById('timerSet').addEventListener('click', ()=>{
    const m = parseInt(document.getElementById('timerMin').value || 0,10);
    startTimerMs(m*60*1000);
  });
  document.getElementById('timerPause').addEventListener('click', pauseTimer);
  document.getElementById('timerReset').addEventListener('click', resetTimer);
}

function startTimerMs(ms){
  if(timerInterval) clearInterval(timerInterval);
  timerRemaining = ms;
  let last = Date.now();
  timerInterval = setInterval(()=>{
    const now = Date.now();
    timerRemaining -= (now - last);
    last = now;
    if(timerRemaining <= 0){
      clearInterval(timerInterval); timerInterval=null; timerRemaining=0;
      document.getElementById('timerDisplay').textContent = '00:00';
      try{ timerBeep.play().catch(()=>{}); }catch(e){}
      if(navigator.vibrate) navigator.vibrate(500);
      alert('Timer finished!');
      return;
    }
    const sec = Math.ceil(timerRemaining/1000);
    const mm = Math.floor(sec/60);
    const ss = sec%60;
    document.getElementById('timerDisplay').textContent = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  },200);
}
function pauseTimer(){ if(timerInterval){ clearInterval(timerInterval); timerInterval=null; } }
function resetTimer(){ if(timerInterval) clearInterval(timerInterval); timerInterval=null; timerRemaining=0; const el = document.getElementById('timerDisplay'); if(el) el.textContent='00:00'; }

/* WEATHER */
function renderWeather(){
  setModeClass('weather');
  clearApp();
  app.innerHTML = `
    <div class="card center">
      <div class="muted">Weather of the Day</div>
      <div style="margin-top:10px"><button id="refreshWeather" class="bigBtn">Refresh</button></div>
      <div id="weatherMsg" class="muted small" style="margin-top:8px"></div>
      <div id="weatherBox" style="margin-top:10px;text-align:left;width:100%"></div>
    </div>
  `;
  document.getElementById('refreshWeather').addEventListener('click', fetchWeather);
  if(cachedWeather) applyWeather(cachedWeather);
  else fetchWeather();
}

function applyWeather(data){
  cachedWeather = data;
  const box = document.getElementById('weatherBox');
  if(!box) return;
  const place = data.place || data.name || `${(data.lat||'')}, ${(data.lon||'')}`;
  const cur = data.current || data.main || {};
  const weather = (data.current && data.current.weather && data.current.weather[0]) || (data.weather && data.weather[0]) || {};
  const temp = cur.temp ?? cur.temp;
  const desc = weather.description ?? weather.main ?? '';
  box.innerHTML = `
    <div style="font-weight:700">${place}</div>
    <div style="margin-top:6px">Now: ${Math.round(temp)}°C — ${desc}</div>
    <div style="margin-top:8px;color:var(--muted)">Sunrise: ${formatTime(cur.sunrise)} • Sunset: ${formatTime(cur.sunset)}</div>
    <div style="margin-top:10px">
      <div class="hourly-scroll">
        ${(data.hourly||[]).slice(0,12).map(h=>{
          const t = formatTime(h.dt);
          const icon = h.weather?.[0]?.icon ? `https://openweathermap.org/img/wn/${h.weather[0].icon}@2x.png` : '';
          const tempH = h.temp ? Math.round(h.temp) + '°' : '';
          const pop = typeof h.pop !== 'undefined' ? Math.round(h.pop*100)+'%' : '';
          return `<div class="hourCard"><div style="font-size:0.9rem">${t}</div>${icon?`<img src="${icon}" alt="" style="width:44px">`:''}<div style="font-weight:700">${tempH}</div><div style="color:var(--muted)">${pop}</div></div>`;
        }).join('')}
      </div>
    </div>
  `;

  // apply dynamic body classes if available
  const main = (weather.main||'').toLowerCase();
  document.body.classList.remove('weather-sunny','weather-cloudy','weather-rain','weather-snow','weather-night','weather-mist');
  const icon = (weather.icon||'');
  if(icon.endsWith('n')) document.body.classList.add('weather-night');
  else if(main.includes('cloud')) document.body.classList.add('weather-cloudy');
  else if(main.includes('rain') || main.includes('drizzle') || main.includes('thunder')) document.body.classList.add('weather-rain');
  else if(main.includes('snow')) document.body.classList.add('weather-snow');
  else document.body.classList.add('weather-sunny');
}

function formatTime(unixTs){ if(!unixTs) return '--:--'; return new Date(unixTs*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }

async function fetchWeather(){
  const msg = document.getElementById('weatherMsg');
  if(!navigator.geolocation){ if(msg) msg.textContent = 'Geolocation not supported'; return; }
  if(msg) msg.textContent = 'Getting location…';
  navigator.geolocation.getCurrentPosition(async pos=>{
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    if(msg) msg.textContent = 'Requesting weather…';
    try{
      const url = `${SERVERLESS_WEATHER_PATH}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('Server weather error');
      const data = await res.json();
      applyWeather(data);
      if(msg) msg.textContent = '';
    } catch(err){
      console.error(err);
      if(msg) msg.textContent = 'Weather fetch failed — try again later.';
    }
  }, err=>{
    console.error(err);
    if(msg) msg.textContent = 'Location permission denied.';
  }, {enableHighAccuracy:true, timeout:10000, maximumAge:60000});
}

/* ---------- Orientation mapping and init ---------- */
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
    default: renderHome(); break;
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
      renderHome();
    }
  } catch(e){ renderHome(); }
}

if(screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', handleOrientationChange);
else window.addEventListener('orientationchange', handleOrientationChange);

/* deviceorientation fallback for older devices */
if(!(screen.orientation && screen.orientation.type)){
  window.addEventListener('deviceorientation', ev=>{
    const g = ev.gamma, b = ev.beta;
    if(b > 45) mapOrientation('portrait-primary', 0);
    else if(b < -135 || (b < -45 && g < 20)) mapOrientation('portrait-secondary', 180);
    else if(g > 20) mapOrientation('landscape-primary', 90);
    else if(g < -20) mapOrientation('landscape-secondary', 270);
  });
}

/* initialize */
document.addEventListener('DOMContentLoaded', ()=>{
  handleOrientationChange();
});
