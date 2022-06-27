import browser from "webextension-polyfill";

import axios from "axios";

import 'bootstrap';

import "bootstrap/dist/css/bootstrap.css";
import "../css/options.css";

const clickUp = axios.create();

const reminderFrequencyMinDefault = 10;

const teamIdInputEl = document.getElementById("clickUpTeamIdInput"),
  apiKeyInputEl = document.getElementById("clickUpApiKeyInput"),
  reminderFrequencyInputEl = document.getElementById("reminderFrequencyMinInput"),
  submitEl = document.getElementById("submitButton"),
  messageEl = document.getElementById("message");

const handleSave = (event) => {

  const updateLocalStorage = async () => {
    const clickUpTeamId = teamIdInputEl.value,
      clickUpApiKey = apiKeyInputEl.value,
      reminderFrequency = reminderFrequencyInputEl.value * 60*1000;

    if ( !/^\d+$/.test(clickUpTeamId) ) throw new Error("team id must be numeric");
    if ( !/\w{10,}$/.test(clickUpApiKey) ) throw new Error("api key too short or containing spaces");

    clickUp.defaults.baseURL = `https://api.clickup.com/api/v2`
    clickUp.defaults.headers.common['Authorization'] = clickUpApiKey;

    await clickUp.get('/user')
    .then((res) => {
      const { user } = res.data;
      if (!user?.id) throw new Error("couldn't identify ClickUp user with the provided credentials");
      return user;
    })
    .then((user) => {
      console.info(user);
      return browser.storage.local.set({ user });
    });

    if ( !/^\d+$/.test(reminderFrequency) || reminderFrequency <= 0 ) throw new Error("reminder frequency must be a positive number");

    await browser.storage.local.set({ clickUpTeamId, clickUpApiKey, reminderFrequency });

    return true;
  }

  updateLocalStorage()
  .then(() => {
    messageEl.textContent = 'Success - Restarting extension in 1m to apply updates.';
    messageEl.classList.remove("error");
    messageEl.classList.add("success");

    console.info("Restarting extension now.");
    setTimeout(browser.runtime.reload, 1*60*1000);
  })
  .catch(error => {
    messageEl.textContent = 'Error: ' + error.message;
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

teamIdInputEl.addEventListener("input", handleInputChange);
apiKeyInputEl.addEventListener("input", handleInputChange);
reminderFrequencyInputEl.addEventListener("input", handleInputChange);
submitEl.addEventListener("click", handleSave);
