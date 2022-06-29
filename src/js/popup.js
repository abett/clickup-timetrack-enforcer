import browser from "webextension-polyfill";

import "../css/popup.css";

const messageEl = document.getElementById("message");

browser.alarms.get("reminder-alarm")
.then(alarm => {
  if (!alarm.scheduledTime) throw Error("no reminder-alarm scheduled");
  messageEl.innerHTML = `reminder alarm scheduled${alarm.periodInMinutes ? ` every ${alarm.periodInMinutes} min.` : '.'}<br/> next: ` + (new Date(alarm.scheduledTime)).toLocaleString();
})
.catch(error => {
  messageEl.innerHTML = "error: " + error.message;
})
