import browser from "webextension-polyfill";

const reminderPageURL = browser.runtime.getURL("reminder.html");


const sleep = (ms) => {
 return new Promise(resolve => setTimeout(resolve, ms));
}

console.info("enforcing!");

let timeLog = [];
let reminderTabId;

let counter = 1,
  openReminderInterval;

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

  if (openReminderInterval && counter >= 5) {
    clearInterval(openReminderInterval);
  }
}


browser.storage.local.get(["reminderFrequency", "reminderActive"])
.then(({ reminderFrequency = 10*60*1000, reminderActive = true }) => {
  if (reminderActive === false) return;

  console.info("reminding every " + reminderFrequency/(60*1000) + "min");

  openReminderInterval = setInterval(openReminder, reminderFrequency);
})
