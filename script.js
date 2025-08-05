let stopwatchInterval;
let stopwatchTime = 0; // in milliseconds

function loadStopwatch() {
    document.getElementById("app").innerHTML = `
        <h1>Stopwatch</h1>
        <div id="stopwatch">0:00:00:000</div>
        <button onclick="startStopwatch()">Start</button>
        <button onclick="stopStopwatch()">Stop</button>
        <button onclick="resetStopwatch()">Reset</button>
    `;
}

function startStopwatch() {
    if (!stopwatchInterval) {
        const startTime = Date.now() - stopwatchTime;
        stopwatchInterval = setInterval(() => {
            stopwatchTime = Date.now() - startTime;
            document.getElementById("stopwatch").innerText = formatTimeWithMs(stopwatchTime);
        }, 10); // update every 10ms
    }
}

function stopStopwatch() {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
}

function resetStopwatch() {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
    stopwatchTime = 0;
    document.getElementById("stopwatch").innerText = "0:00:00:000";
}

function formatTimeWithMs(ms) {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;

    return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}:${millis.toString().padStart(3, '0')}`;
}
