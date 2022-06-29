import browser from "webextension-polyfill";

import axios from "axios";
import { get } from 'lodash-es';

import 'bootstrap';

import "bootstrap/dist/css/bootstrap.css";
import "../css/options.css";

const clickUp = axios.create();

const defaultReminderFrequency = 10;

const teamIdInputEl = document.getElementById("clickUpTeamIdInput"),
  apiKeyInputEl = document.getElementById("clickUpApiKeyInput"),
  defaultTaskInputEl = document.getElementById("defaultTaskInput"),
  reminderFrequencyInputEl = document.getElementById("reminderFrequencyMinInput"),
  submitEl = document.getElementById("submitButton"),
  messageEl = document.getElementById("message");

const handleSave = (event) => {
  event.preventDefault();

  const updateLocalStorage = async () => {
    const clickUpTeamId = teamIdInputEl.value,
      clickUpApiKey = apiKeyInputEl.value,
      defaultTask = defaultTaskInputEl.value;
    let reminderFrequency = reminderFrequencyInputEl.value;

    if ( !/^\d+$/.test(clickUpTeamId) ) throw new Error("team id must be numeric");
    if ( !/^\w{10,}$/.test(clickUpApiKey) ) throw new Error("api key too short or containing spaces");

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
    reminderFrequency = parseInt(reminderFrequency);

    if ( defaultTask && !/^(https\:\/\/app\.clickup\.com\/t\/)?\w{7}$/.test(defaultTask) ) throw new Error(defaultTask + " is not a task ID or URL");
    const defaultTaskId = get(defaultTask.match(/^(?:https\:\/\/app\.clickup\.com\/t\/)?(\w{7})$/), 1, null);

    await browser.storage.local.set({ clickUpTeamId, clickUpApiKey, reminderFrequency, defaultTaskId });

    return true;
  }

  updateLocalStorage()
  .then(() => {
    messageEl.textContent = 'Success - Restarting extension in 10s to apply updates.';
    messageEl.classList.remove("error");
    messageEl.classList.add("success");

    console.info("Restarting extension now.");
    setTimeout(browser.runtime.reload, 10*1000);
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
    defaultTask = defaultTaskInputEl.value,
    reminderFrequency = reminderFrequencyInputEl.value;

  messageEl.textContent = "";

  if( !/^\d+$/.test(clickUpTeamId) ) {
    messageEl.textContent = "team id must be numeric";
    submitEl.disabled = true;
  } else if( !/\w{10,}$/.test(clickUpApiKey) ) {
    messageEl.textContent = "api key too short or containing spaces";
    submitEl.disabled = true;
  } else if ( !/^\d+$/.test(reminderFrequency) ) {
    messageEl.textContent = "reminder frequency must be a number";
    submitEl.disabled = true;
  } else if ( defaultTask && !/^(https\:\/\/app\.clickup\.com\/t\/)?\w{7}$/.test(defaultTask) ) {
    messageEl.textContent = defaultTask + " is not a task ID or URL";
    submitEl.disabled = true;
  } else {
    submitEl.disabled = false;
  }
};

browser.storage.local.get(["clickUpTeamId", "clickUpApiKey", "defaultTaskId", "reminderFrequency"])
  .then(({ clickUpTeamId, clickUpApiKey, defaultTaskId, reminderFrequency = defaultReminderFrequency }) => {
    if (clickUpTeamId) teamIdInputEl.value = clickUpTeamId;
    if (clickUpApiKey) apiKeyInputEl.value = clickUpApiKey;
    if (defaultTaskId) defaultTaskInputEl.value = defaultTaskId;
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
defaultTaskInputEl.addEventListener("input", handleInputChange);
reminderFrequencyInputEl.addEventListener("input", handleInputChange);
submitEl.addEventListener("click", handleSave);
