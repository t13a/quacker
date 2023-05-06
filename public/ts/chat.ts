import avatar from "animal-avatar-generator";
import "bootstrap";
import "@fontsource/bad-script";
import "../scss/style.scss";

interface ChatEntity {
  id: number;
  created_by: string;
  created_at: number;
  message: string;
}

interface Session {
  nickname: string;
}

function assert(value: any): asserts value {
  if (!value) {
    throw new Error();
  }
}

function createChatEntityElement(entity: ChatEntity) {
  const e = document.createElement("li");
  e.classList.add("d-flex", "position-relative", "mb-2");

  const avatarElement = document.createElement("div");
  avatarElement.classList.add("avatar", "position-absolute");
  avatarElement.insertAdjacentHTML("afterbegin", avatar(entity.created_by, { blackout: false }));
  assert(avatarElement.firstElementChild);
  avatarElement.firstElementChild.removeAttribute("width");
  avatarElement.firstElementChild.removeAttribute("height");
  e.appendChild(avatarElement);

  const bubbleElement = document.createElement("div");
  bubbleElement.classList.add("overflow-hidden", "px-3", "py-2", "border", "rounded", "shadow-sm", "bg-white");
  bubbleElement.style.marginLeft = "3.5rem";
  e.appendChild(bubbleElement);

  const headerElement = document.createElement("div");
  headerElement.classList.add("d-flex", "mx-0", "my-1", "p-0");
  bubbleElement.appendChild(headerElement);

  const createdByElement = document.createElement("strong");
  createdByElement.classList.add("d-inline-block", "me-auto", "text-nowrap", "text-truncate");
  createdByElement.innerText = entity.created_by;
  headerElement.appendChild(createdByElement);

  const createdAtElement = document.createElement("span");
  createdAtElement.classList.add("ms-2", "text-nowrap", "text-secondary");
  createdAtElement.innerText = formatCreatedAt(entity.created_at);
  headerElement.appendChild(createdAtElement);

  const messageElement = document.createElement("p");
  messageElement.classList.add("m-0", "pb-1", "overflow-x-auto", "white-space-pre-wrap");
  messageElement.innerText = entity.message;
  bubbleElement.appendChild(messageElement);

  return e;
}

const createChatManager = (options: {
  limit: number;
  loadNewerCallback: (newerChat: ChatEntity[]) => void;
  loadOlderCallback: (olderChat: ChatEntity[]) => void;
}) => {
  const allChat: ChatEntity[] = [];
  return {
    async loadNewer() {
      await withLock("loadNewer", async () => {
        const newest = allChat.length > 0 ? allChat[0].id : 0;
        const newerChat = await doGetChat({ from: newest + 1, to: newest + options.limit, limit: options.limit });
        allChat.unshift(...newerChat);
        options.loadNewerCallback(newerChat);
      });
    },
    async loadOlder() {
      await withLock("loadOlder", async () => {
        const oldest = allChat.length > 0 ? allChat[allChat.length - 1].id : 0;
        const olderChat = await doGetChat({ from: 0, to: oldest - 1, limit: options.limit });
        allChat.push(...olderChat);
        options.loadOlderCallback(olderChat);
      });
    },
  };
};

async function doGetSession(): Promise<Session> {
  return (
    await fetch("/session", {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })
  ).json();
}

async function doGetChat(options = { from: 0, to: -1, limit: 10 }): Promise<ChatEntity[]> {
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

async function doPostChat(message: string): Promise<void> {
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
  return (createdAt: number) => dtf.format(new Date(createdAt * 1000));
})();

const withLock = (() => {
  const state: { [key: string]: true } = {};
  return async (key: string, callback: () => Promise<void>) => {
    if (state[key]) {
      return;
    }
    state[key] = true;
    try {
      await callback();
    } finally {
      delete state[key];
    }
  };
})();

window.addEventListener("DOMContentLoaded", async () => {
  const titleElement = document.querySelector<HTMLTitleElement>("title");
  const navbarTogglerElement = document.querySelector<HTMLButtonElement>(".navbar-toggler");
  const nicknameElement = document.querySelector<HTMLSpanElement>("#nickname");
  const sendFormElement = document.querySelector<HTMLFormElement>("#send-form");
  const sendFormMessageElement = document.querySelector<HTMLTextAreaElement>("#send-form *[name=message]");
  const chatListElement = document.querySelector<HTMLUListElement>("#chat-list");
  const loadMoreElement = document.querySelector<HTMLAnchorElement>("#load-more");

  assert(titleElement);
  assert(navbarTogglerElement);
  assert(nicknameElement);
  assert(sendFormElement);
  assert(sendFormMessageElement);
  assert(chatListElement);
  assert(loadMoreElement);

  const query = (() => {
    const params = new URL(window.location.href).searchParams;
    return {
      interval: parseInt(params.get("interval") ?? "") || 3 * 1000,
      limit: parseInt(params.get("limit") ?? "") || 10,
    };
  })();

  const session = await doGetSession();
  titleElement.innerText = `${session.nickname} - Quacker`;
  navbarTogglerElement.insertAdjacentHTML("afterbegin", avatar(session.nickname, { blackout: false }));
  nicknameElement.innerText = session.nickname;

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
      if (olderChat.length == 0 || olderChat[olderChat.length - 1].id == 1) {
        assert(loadMoreElement.parentElement?.parentElement);
        loadMoreElement.parentElement.parentElement.removeChild(loadMoreElement.parentElement);
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

  loadMoreElement.addEventListener("click", async (e) => {
    e.preventDefault();
    await chat.loadOlder();
  });

  await chat.loadOlder();
  setInterval(async () => await chat.loadNewer(), query.interval);
});
