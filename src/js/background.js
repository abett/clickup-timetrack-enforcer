import browser from "webextension-polyfill";

const reminderPageURL = browser.runtime.getURL("reminder.html");


const sleep = (ms) => {
 return new Promise(resolve => setTimeout(resolve, ms));
}


const onInstalledCallback = (details) => {
  if (details.reason === 'install') {
    // Code to be executed on first install
    const optionsUrl = browser.runtime.getURL('options.html');
    browser.tabs.create({
      url: optionsUrl,
    });
  }
};
browser.runtime.onInstalled.addListener(onInstalledCallback);




console.info("enforcing!");

const defaultReminderFrequency = 10;
let reminderTabId,
  counter = 1;

const openReminder = async () => {

  const { reminderActive, clickUpTeamId, clickUpApiKey, user } = await browser.storage.local.get(["reminderActive", "clickUpTeamId", "clickUpApiKey", "user"]);
  if (reminderActive === false) return;
  if (!clickUpTeamId || !clickUpApiKey || !user?.id) {
    console.info("not opening a reminder, because crucial clickUp info is missing.");
    return;
  }

  const reminderTab = await browser.tabs.get( reminderTabId )
  .catch(() => {
    return browser.tabs.create({
      url: reminderPageURL,
    })
  })

  reminderTabId = reminderTab.id;
  counter++;

  browser.tabs.update(reminderTabId, { active: true })
  .then(() => {
    console.info((new Date()).toLocaleString() + ' - opened reminder #' + counter);
  })
  .catch(e => {
    console.warn(e);
  });

}


browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'reminder-alarm') {
    console.info("reminder alarm fired");
    openReminder();
  }
});

browser.storage.local.get(["reminderFrequency", "reminderActive"])
.then(({ reminderFrequency = defaultReminderFrequency, reminderActive = true }) => {
  if (reminderActive === false) return;

  console.info("reminding every " + reminderFrequency + "min");
  browser.alarms.create("reminder-alarm", {
    delayInMinutes: reminderFrequency,
    periodInMinutes: reminderFrequency
  });

});
