import browser from "webextension-polyfill";

import "../css/reminder.css";

let timeoutDefault = 20,
  timeout = timeoutDefault,
  countdownInterval;

const timeoutEl = document.getElementById("timeout");

const countdown = () => {
  if (timeout == 0) window.close();

  timeoutEl.textContent = "closing reminder in " + timeout + "s";
  timeout--;
}

const startCountdown = () => {
  countdownInterval = setInterval(countdown, 1000);
}

const handleCountDownStop = (event) => {
  clearInterval(countdownInterval);

  timeoutEl.textContent = "countdown stopped (for 30s)";
  timeout = timeoutDefault;

  setTimeout(startCountdown, 30000);
}
document.body.addEventListener("click", handleCountDownStop);

startCountdown();
