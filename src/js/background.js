import browser from "webextension-polyfill";

const reminderPageURL = browser.runtime.getURL("reminder.html");


const sleep = (ms) => {
 return new Promise(resolve => setTimeout(resolve, ms));
}

console.info("enforcing!");

let timeLog = [];
let reminderTabId;

let counter = 1;

const openReminder = async () => {

  const { reminderActive } = await browser.storage.local.get("reminderActive");
  if (reminderActive === false) return;

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
    console.info((new Date()).toLocaleString() + 'opened reminder #' + counter);
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

  let openReminderInterval;
  openReminderInterval = setInterval(openReminder, reminderFrequency);
})
