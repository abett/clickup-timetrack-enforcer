import browser from "webextension-polyfill";

import "../css/options.css";

const reminderFrequencyMinDefault = 10;

const teamIdInputEl = document.getElementById("clickUpTeamIdInput"),
  apiKeyInputEl = document.getElementById("clickUpApiKeyInput"),
  reminderFrequencyInputEl = document.getElementById("reminderFrequencyMinInput"),
  submitEl = document.getElementById("submitButton"),
  messageEl = document.getElementById("message");

const handleSave = (event) => {
  const clickUpTeamId = teamIdInputEl.value,
    clickUpApiKey = apiKeyInputEl.value,
    reminderFrequency = reminderFrequencyInputEl.value * 60*1000;

  browser.storage.local.set({ clickUpTeamId, clickUpApiKey, reminderFrequency })
  .then(() => {
    messageEl.textContent = 'Success';
    messageEl.classList.remove("error");
    messageEl.classList.add("success");
  })
  .catch(error => {
    messageEl.textContent = 'Error';
    messageEl.classList.remove("success");
    messageEl.classList.add("error");
  });
}

const handleInputChange = (event) => {
  const clickUpTeamId = teamIdInputEl.value,
    clickUpApiKey = apiKeyInputEl.value,
    reminderFrequency = reminderFrequencyInputEl.value;

  messageEl.textContent = "";

  if( !/^\d+$/.test(clickUpTeamId) ) {
    messageEl.textContent = "team id must be numeric";
    submitEl.disabled = true;
  } else if( !/\w{10,}$/.test(clickUpApiKey) ) {
    messageEl.textContent = "api key too short or containing spaces";
    submitEl.disabled = true;
  } else if ( !/^\d+$/.test(reminderFrequency) ) {
    essageEl.textContent = "reminder frequency must be a number";
    submitEl.disabled = true;
  } else {
    submitEl.disabled = false;
  }
};

browser.storage.local.get(["clickUpTeamId", "clickUpApiKey", "reminderFrequency"])
  .then(({ clickUpTeamId, clickUpApiKey, reminderFrequency = reminderFrequencyMinDefault * 60*1000 }) => {
    teamIdInputEl.value = clickUpTeamId;
    apiKeyInputEl.value = clickUpApiKey;
    reminderFrequencyInputEl.value = reminderFrequency / (60*1000);

    teamIdInputEl.disabled = false;
    apiKeyInputEl.disabled = false;
  })
  .catch(error => {
    messageEl.textContent = 'Error';
    messageEl.classList.remove("success");
    messageEl.classList.add("error");
  });

teamIdInputEl.addEventListener("change", handleInputChange);
apiKeyInputEl.addEventListener("change", handleInputChange);
reminderFrequencyInputEl.addEventListener("change", handleInputChange);
submitEl.addEventListener("click", handleSave);
