/* Alarm-only focused HoldSense (portrait-primary -> Alarm)
   Mobile-friendly: 'Enable Alarm Sound' + vibration + fullscreen overlay + snooze
*/

/* DOM refs */
const orientationLabel = document.getElementById('orientationLabel');
const app = document.getElementById('app');
const alarmSound = document.getElementById('alarmSound');
const alarmOverlay = document.getElementById('alarmOverlay');
const overlayMsg = document.getElementById('overlayMsg');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const snoozeAlarmBtn = document.getElementById('snoozeAlarmBtn');

/* Alarm state */
let alarmInterval = null;
let alarmTimeVal = null;       // "HH:MM" string
let alarmSoundEnabled = false;
let isRinging = false;

/* Render Alarm UI (shown when in portrait-primary) */
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

  // wire buttons
  document.getElementById('enableAlarmSound').addEventListener('click', enableAlarmSound);
  document.getElementById('setAlarmBtn').addEventListener('click', setAlarmHandler);
  document.getElementById('cancelAlarmBtn').addEventListener('click', cancelAlarmHandler);

  // overlay controls
  stopAlarmBtn.addEventListener('click', stopAlarm);
  snoozeAlarmBtn.addEventListener('click', snoozeAlarm);
}

/* Unlock audio playback by playing & pausing (must be user gesture) */
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

/* Set alarm button handler */
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

/* Cancel alarm button */
function cancelAlarmHandler(){
  if(alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; }
  alarmTimeVal = null;
  const statusEl = document.getElementById('alarmStatus');
  if(statusEl) statusEl.textContent = 'No alarm set';
}

/* Check every second whether alarm time reached */
function checkAlarm(){
  if(!alarmTimeVal) return;
  const now = new Date();
  // Alarm input returns "HH:MM" in 24h format.
  const [h,m] = alarmTimeVal.split(':').map(Number);
  if(now.getHours() === h && now.getMinutes() === m && now.getSeconds() === 0){
    triggerAlarm();
    clearInterval(alarmInterval);
    alarmInterval = null;
    alarmTimeVal = null;
  }
}

/* Trigger the alarm: visual + sound + vibrate */
function triggerAlarm(){
  if(isRinging) return;
  isRinging = true;

  // show overlay
  alarmOverlay.classList.remove('hidden');
  overlayMsg.textContent = "⏰ Time's up!";

  // play sound if enabled
  if(alarmSoundEnabled){
    alarmSound.loop = true;
    alarmSound.play().catch(err => console.warn('Play failed', err));
  }

  // vibrate (Android)
  if(navigator.vibrate){
    try { navigator.vibrate([600,200,600,200,600]); } catch(e){/*ignore*/ }
  }
}

/* Stop alarm (stop sound + hide overlay + stop vibration) */
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

/* Snooze alarm for 5 minutes */
function snoozeAlarm(){
  stopAlarm();
  // set snooze for 5 minutes from now
  const now = new Date(Date.now() + 5 * 60000);
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  alarmTimeVal = `${hh}:${mm}`;
  const statusEl = document.getElementById('alarmStatus');
  if(statusEl) statusEl.textContent = `Snoozed to ${alarmTimeVal}`;
  if(alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(checkAlarm, 1000);
}

/* ---------------- Orientation detection (portrait-primary shows Alarm) ---------------- */
function mapOrientation(type, angle){
  orientationLabel.textContent = `${type || 'unknown'} (${angle ?? 'n/a'}°)`;
  if(!type){
    if(angle === 0) type = 'portrait-primary';
    else if(angle === 180) type = 'portrait-secondary';
    else if(angle === 90) type = 'landscape-primary';
    else if(angle === -90 || angle === 270) type = 'landscape-secondary';
  }

  // we only render the Alarm UI on portrait-primary; otherwise show hint
  if(type === 'portrait-primary'){
    renderAlarm();
  } else {
    // show friendly hint message in app
    app.innerHTML = `
      <div class="center">
        <div class="muted">Hold your phone upright (portrait) to use the Alarm.</div>
        <div class="notice" style="margin-top:12px">Current orientation: ${type}</div>
      </div>
    `;
  }
}

function handleOrientationChange(){
  try {
    const so = screen.orientation || screen.mozOrientation || screen.msOrientation;
    if(so && so.type !== undefined){
      mapOrientation(so.type, so.angle);
    } else if(typeof window.orientation !== 'undefined'){
      mapOrientation(null, window.orientation);
    } else {
      mapOrientation('portrait-primary', 0);
    }
  } catch(e){
    mapOrientation('portrait-primary', 0);
  }
}

/* Listen for orientation changes */
if(screen.orientation && screen.orientation.addEventListener){
  screen.orientation.addEventListener('change', handleOrientationChange);
} else {
  window.addEventListener('orientationchange', handleOrientationChange);
}

/* deviceorientation fallback (rough) */
if(!(screen.orientation && screen.orientation.type)){
  window.addEventListener('deviceorientation', ev=>{
    const g = ev.gamma; const b = ev.beta;
    if(b > 45) mapOrientation('portrait-primary', 0);
    else if(b < -135 || (b < -45 && g < 20)) mapOrientation('portrait-secondary', 180);
    else if(g > 20) mapOrientation('landscape-primary', 90);
    else if(g < -20) mapOrientation('landscape-secondary', 270);
  });
}

/* initial render */
handleOrientationChange();
