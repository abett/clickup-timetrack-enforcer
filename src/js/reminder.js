import browser from "webextension-polyfill";

import axios from "axios";
import { get, orderBy, groupBy, forEach } from 'lodash-es';

import 'bootstrap';

import "bootstrap/dist/css/bootstrap.css";
import "../css/reminder.css";

let timeoutDefault = 30,
  timeout = timeoutDefault,
  countdownInterval;

const clickUp = axios.create();



const timeoutEl = document.getElementById("timeout"),
  cancelTimeoutButtonEl = document.getElementById('cancelTimeoutButton');

const countdown = () => {
  if (timeout === 0) {
    browser.runtime.sendMessage( null, { type: 'close_me' } );
    // window.close();
  }
  timeoutEl.textContent = timeout;
  timeout--;
}

const startCountdown = () => {
  countdownInterval = setInterval(countdown, 1000);
  cancelTimeoutButtonEl.disabled = false;

  ['mousemove', 'touchmove', 'click', 'input'].forEach(function(e) {
    window.addEventListener(e, () => {timeout = timeoutDefault});
  });

  cancelTimeoutButtonEl.addEventListener("click", handleCountDownStop, { once: true });
}

const handleCountDownStop = (event) => {
  clearInterval(countdownInterval);
  timeoutEl.closest('div.card-body').innerHTML = "countdown stopped";
}


browser.storage.local.get(["clickUpTeamId", "clickUpApiKey", "user", "reminderFrequency", "defaultTaskId", "lastLoggedTaskId"])
.then(({ clickUpTeamId, clickUpApiKey, user, reminderFrequency, defaultTaskId, lastLoggedTaskId }) => {
  if (!clickUpTeamId || !clickUpApiKey || !user?.id) throw new Error("ClickUp API Details missing");

  const userNameEl = document.getElementById('userName'),
    reminderFrequencyEl = document.getElementById('reminderFrequency'),
    listsNavEl = document.getElementById('clickupListsNav'),
    listsTabContentEL = document.getElementById("clickupListsTabContent"),
    allTasksTabRowEl = document.getElementById("allTasksTabRow");

  if (userNameEl) userNameEl.textContent = user.username;
  if (reminderFrequencyEl) reminderFrequencyEl.textContent = reminderFrequency;

  clickUp.defaults.baseURL = `https://api.clickup.com/api/v2/team/${clickUpTeamId}`
  clickUp.defaults.headers.common['Authorization'] = clickUpApiKey;

  clickUp.get('/task', {
    params: {
      order_by: 'updated',
      //reverse: true,
      subtasks: true,
      //space_ids: [],
      //project_ids: [],
      //list_ids: [],
      statuses: [],
      include_closed: false,
      assignees: [user.id],
      // tags: [],
    }
  })
  .then((res) => {
    console.log(res.data);

    const tasksBySpace = groupBy(res.data?.tasks || [], "space.id");

    forEach(tasksBySpace, (spaceTasks, spaceId) => {

      const tasksByList = groupBy(spaceTasks, "list.name");

      forEach(tasksByList, (listTasks, listName) => {
        const listId = get(listTasks, [0, "list", "id"], "default");

        const listNavLinkEl = document.createElement("a");
        listNavLinkEl.classList.add("nav-link", "mx-1");
        listNavLinkEl.dataset.bsToggle = "pill";
        listNavLinkEl.dataset.bsTarget = `#listTab-${listId}`;
        listNavLinkEl.textContent = listName;

        const listTabContentEl = document.createElement("div");
        listTabContentEl.id = `listTab-${listId}`;
        listTabContentEl.classList.add("tab-pane", "fade");
        listTabContentEl.tabindex = 0;
        listTabContentEl.innerHTML = `${listTasks.length} tasks on the list ${listName} in space ${spaceId}`;

        listsNavEl.append(listNavLinkEl);
        listsTabContentEL.append(listTabContentEl);

        const listTabRowEl = document.createElement("div");
        listTabRowEl.classList.add("row", "my-1");
        listTabContentEl.append(listTabRowEl);

        const tasksByParent = groupBy(listTasks, "parent");
        const tasksById = groupBy(listTasks, "id");
        const tasksToDisplay = orderBy(listTasks, ["priority.id", "due_date"], ["asc", "asc"])
        .filter(task => get(tasksById, task.parent, null) === null);

        forEach(tasksToDisplay, (task) => {
          const listTaskEl = document.createElement("div");
          listTaskEl.classList.add("task-item", "col-12", "col-md-6", "col-lg-3", "p-1");
          listTaskEl.id = `task-${task.id}`;

          const listTaskEl2 = document.createElement("div");
          listTaskEl2.classList.add("task-item", "col", "col-md-6", "col-lg-3", "p-1");
          if ((defaultTaskId && task.id === defaultTaskId) || (lastLoggedTaskId && task.id === lastLoggedTaskId)) listTaskEl2.classList.add("order-first");
          listTaskEl.id = `task-${task.id}-2`;

          const cardContent = `<div class="card h-100 text-start" style="${task.priority?.color ? ('border-color:'+task.priority.color+';') : ''}">
            <div class="list-name card-header text-truncate"><small>${task.list.name}</small></div>
            <div class="card-body">
              <h6 class="task-name card-title">${task.name}</h6>
              <p class="task-description d-none">${task.description}</p>
            </div>
            <div class="list-group list-group-flush">
              ${
                get(tasksByParent, task.id, []).map(subtask => {
                  if ((defaultTaskId && subtask.id === defaultTaskId) || (lastLoggedTaskId && subtask.id === lastLoggedTaskId)) listTaskEl2.classList.add("order-first");
                  return `<a class="time-log-button subtask-name list-group-item list-group-item-action list-group-item-light text-start text-truncate" data-task-id="${subtask.id}" href="#"><small>> ${subtask.name}</small></a>`
                }).join('')
              }
              <a class="time-log-button list-group-item list-group-item-action list-group-item-light text-start text-truncate" data-task-id="${task.id}" href="#"><strong>LOG HERE</strong></a>
            </div>
          </div>`;

          listTaskEl.innerHTML = cardContent;
          listTaskEl2.innerHTML = cardContent;

          listTabRowEl.append(listTaskEl);
          allTasksTabRowEl.append(listTaskEl2);
        });

      })

    })

    Array.from(document.querySelectorAll('.time-log-button'))
    .forEach(timeLogButtonEl => {
      timeLogButtonEl.addEventListener("click", (event) => {
        const buttonEl = event.currentTarget;
        const taskId = buttonEl.dataset.taskId;
        if (!taskId) return;

        clickUp.post('/time_entries', {
          tid: taskId,
          description: "auto-logged",
          start: (new Date()).valueOf() - (reminderFrequency * (60*1000)),
          duration: reminderFrequency * (60*1000),
        })
        .then(() => {
          return browser.storage.local.set({ lastLoggedTaskId: taskId });
        })
        .then(() => {
          buttonEl.closest('.list-group').innerHTML = `<div class="list-group-item list-group-item-success text-start"><strong>SUCCESS</strong></div>`;
          return true;
        })
        .catch(error => {
          console.info("ERROR: " + error.message);
        })

      }, { once: true })
    })


  })
  .catch((error) => {
    console.error(error)
  });
});


document.getElementById("taskSearchInput").addEventListener("input", (event) => {
  const searchTerm = event.currentTarget.value?.trim();

  if (!searchTerm) {
    Array.from(document.querySelectorAll(".task-item")).forEach(i => i.classList.remove("text-muted", "order-first", "order-1", "order-2", "order-3", "order-4", "order-5", "order-last"));
  } else {
    Array.from(document.querySelectorAll(".task-item")).forEach(i => {
      i.classList.remove("text-muted", "order-first", "order-1", "order-2", "order-3", "order-4", "order-5", "order-last");

      if (Array.from(i.querySelectorAll(".task-name")).filter(x => new RegExp(searchTerm, "i").test(x.textContent)).length > 0) {
        i.classList.add("order-first");
      } else if (Array.from(i.querySelectorAll(".subtask-name")).filter(x => new RegExp(searchTerm, "i").test(x.textContent)).length > 0) {
        i.classList.add("order-1");
      } else if (Array.from(i.querySelectorAll(".task-description")).filter(x => new RegExp(searchTerm, "i").test(x.textContent)).length > 0) {
        i.classList.add("order-2");
      } else if (Array.from(i.querySelectorAll(".list-name")).filter(x => new RegExp(searchTerm, "i").test(x.textContent)).length > 0) {
        i.classList.add("order-3", "text-muted");
      } else {
        i.classList.add("order-last", "text-muted");
      }
    });
  }
});

startCountdown();
