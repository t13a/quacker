"use strict";

function createChatEntityElement(entity) {
  const e = document.createElement("li");

  const createdByElement = document.createElement("div");
  createdByElement.className = "created_by";
  createdByElement.innerText = entity.created_by;
  e.appendChild(createdByElement);

  const createdAtElement = document.createElement("div");
  createdAtElement.className = "created_at";
  createdAtElement.innerText = formatCreatedAt(entity.created_at);
  e.appendChild(createdAtElement);

  const messageElement = document.createElement("p");
  messageElement.className = "message";
  messageElement.innerText = entity.message;
  e.appendChild(messageElement);

  return e;
}

const createChatManager = (options) => {
  const allChat = [];
  return {
    async loadNewer() {
      const newest = allChat.length > 0 ? allChat[0].id : 0;
      const newerChat = await doGetChat({ from: newest + 1, to: newest + options.limit, limit: options.limit });
      allChat.unshift(...newerChat);
      options.loadNewerCallback(newerChat);
    },
    async loadOlder() {
      const oldest = allChat.length > 0 ? allChat[allChat.length - 1].id : 0;
      const olderChat = await doGetChat({ from: 0, to: oldest - 1, limit: options.limit });
      allChat.push(...olderChat);
      options.loadOlderCallback(olderChat);
    },
  };
};

async function doGetChat(options = { from: 0, to: -1, limit: 10 }) {
  return (
    await fetch(`/chat?from=${options.from}&to=${options.to}&limit=${options.limit}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })
  ).json();
}

async function doPostChat(message) {
  await fetch("/chat", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: message }),
  });
}

const formatCreatedAt = (() => {
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  return (createdAt) => dtf.format(new Date(createdAt * 1000));
})();

window.addEventListener("DOMContentLoaded", async () => {
  const sendFormElement = document.querySelector(".send-form");
  const sendFormMessageElement = document.querySelector(".send-form *[name=message]");
  const chatListElement = document.querySelector(".chat-list");

  const query = (() => {
    const params = new URL(window.location.href).searchParams;
    return {
      limit: parseInt(params.get("limit")) || 10,
    };
  })();

  const chat = createChatManager({
    limit: query.limit,
    loadNewerCallback: (newerChat) => {
      for (let i = newerChat.length - 1; i >= 0; i--) {
        chatListElement.insertBefore(createChatEntityElement(newerChat[i]), chatListElement.firstChild);
      }
    },
    loadOlderCallback: (olderChat) => {
      for (let i = 0; i < olderChat.length; i++) {
        chatListElement.appendChild(createChatEntityElement(olderChat[i]));
      }
    },
  });

  sendFormElement.addEventListener("submit", async (e) => {
    e.preventDefault();
    await doPostChat(sendFormMessageElement.value);
    sendFormElement.reset();
    sendFormMessageElement.focus();
    await chat.loadNewer();
  });

  await chat.loadOlder();
});
