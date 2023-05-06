import avatar from "animal-avatar-generator";
import { Toast } from "bootstrap";
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

function adjustHTMLTextareaElementHeight(e: HTMLTextAreaElement) {
  e.style.height = "0px";

  const clientHeight = e.clientHeight;
  const scrollHeight = e.scrollHeight;
  const paddingBottom = parseInt(window.getComputedStyle(e).getPropertyValue("padding-bottom"));
  const paddingTop = parseInt(window.getComputedStyle(e).getPropertyValue("padding-top"));
  const maxHeight = (clientHeight - paddingBottom - paddingTop) * 5 + paddingBottom + paddingTop;

  e.style.height = `${scrollHeight < maxHeight ? scrollHeight : maxHeight}px`;
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

const createNewMessageManager = (options: { root: Element; toast: Element; updateCountCallback: (count: number) => void }) => {
  let count = 0;
  let current: Element | null;
  let observer: IntersectionObserver;

  const toast = new Toast(options.toast);

  const dismiss = () => {
    if (current) {
      observer.unobserve(current);
      current = null;
    }
    count = 0;
    toast.hide();
  };

  const notify = (target: Element) => {
    count++;
    options.updateCountCallback(count);
    if (!current) {
      current = target;
      observer.observe(target);
      toast.show();
    }
  };

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          dismiss();
        }
      });
    },
    { root: options.root, threshold: 0.5 }
  );

  return {
    current() {
      return current;
    },
    dismiss() {
      dismiss();
    },
    notify(target: Element) {
      notify(target);
    },
  };
};

const createScrollManager = () => {
  let neededCallback: (() => Element | null) | null;
  return {
    scrollIfNeeded() {
      if (neededCallback) {
        const e = neededCallback();
        if (e) {
          e.scrollIntoView({ behavior: "smooth" });
        }
        neededCallback = null;
      }
    },
    needScroll(callback: () => Element | null) {
      neededCallback = callback;
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

const observeLoadMore = (options: {
  root: Element;
  target: Element;
  loadCallback: () => Promise<void>;
  preLoadCallback: () => Promise<void>;
  postLoadCallback: () => Promise<void>;
}) => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          await options.preLoadCallback();
          const scrollTop = options.root.scrollTop;
          const oldScrollHeight = options.root.scrollHeight;
          await options.loadCallback();
          const newScrollHeight = options.root.scrollHeight;
          options.root.scrollTo(0, scrollTop + newScrollHeight - oldScrollHeight);
          await options.postLoadCallback();
        }
      });
    },
    {
      root: options.root,
      threshold: 1.0,
    }
  );
  observer.observe(options.target);
  return observer;
};

async function sleep(ms: number) {
  await new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
}

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
  const mainBodyElement = document.querySelector<HTMLElement>("#main-body");
  const sendFormElement = document.querySelector<HTMLFormElement>("#send-form");
  const sendFormMessageElement = document.querySelector<HTMLTextAreaElement>("#send-form *[name=message]");
  const chatListElement = document.querySelector<HTMLUListElement>("#chat-list");
  const loadMoreElement = document.querySelector<HTMLDivElement>("#load-more");
  const newMessageElement = document.querySelector<HTMLDivElement>("#new-message");
  const newMessageBodyElement = document.querySelector<HTMLSpanElement>("#new-message-body");

  assert(titleElement);
  assert(navbarTogglerElement);
  assert(nicknameElement);
  assert(mainBodyElement);
  assert(sendFormElement);
  assert(sendFormMessageElement);
  assert(chatListElement);
  assert(loadMoreElement);
  assert(newMessageElement);
  assert(newMessageBodyElement);

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

  const newMessage = createNewMessageManager({
    root: mainBodyElement,
    toast: newMessageElement,
    updateCountCallback(count) {
      newMessageBodyElement.innerText = count > 1 ? `You have ${count} new messages.` : "You have a new message.";
    },
  });

  const scroll = createScrollManager();

  const chat = createChatManager({
    limit: query.limit,
    loadNewerCallback: (newerChat) => {
      const scrollMargin = 16;
      if (mainBodyElement.scrollTop + scrollMargin >= mainBodyElement.scrollHeight - mainBodyElement.clientHeight) {
        scroll.needScroll(() => chatListElement.firstElementChild);
      }
      for (let i = newerChat.length - 1; i >= 0; i--) {
        const e = createChatEntityElement(newerChat[i]);
        chatListElement.insertBefore(e, chatListElement.firstElementChild);
        if (newerChat[i].created_by !== session.nickname) {
          newMessage.notify(e);
        }
      }
      scroll.scrollIfNeeded();
    },
    loadOlderCallback: (olderChat) => {
      for (let i = 0; i < olderChat.length; i++) {
        chatListElement.appendChild(createChatEntityElement(olderChat[i]));
      }
      if (olderChat.length == 0 || olderChat[olderChat.length - 1].id == 1) {
        assert(loadMoreElement.parentElement);
        loadMoreElement.parentElement.removeChild(loadMoreElement);
      }
    },
  });

  sendFormElement.addEventListener("submit", async (e) => {
    e.preventDefault();
    await doPostChat(sendFormMessageElement.value);
    sendFormElement.reset();
    sendFormMessageElement.focus();
    adjustHTMLTextareaElementHeight(sendFormMessageElement);

    const firstElement = chatListElement.firstElementChild;
    scroll.needScroll(() => (firstElement ? firstElement.previousElementSibling : chatListElement.firstElementChild));
    await chat.loadNewer();
  });

  sendFormMessageElement.addEventListener("input", (e) => {
    adjustHTMLTextareaElementHeight(sendFormMessageElement);
  });

  newMessageElement.addEventListener("click", async (e) => {
    e.preventDefault();
    scroll.needScroll(() => newMessage.current());
    scroll.scrollIfNeeded();
  });

  adjustHTMLTextareaElementHeight(sendFormMessageElement);

  await chat.loadOlder();
  scroll.needScroll(() => chatListElement.firstElementChild);
  scroll.scrollIfNeeded();

  setTimeout(() => {
    observeLoadMore({
      root: mainBodyElement,
      target: loadMoreElement,
      loadCallback: async () => {
        await chat.loadOlder();
      },
      preLoadCallback: async () => {
        assert(loadMoreElement.firstElementChild);
        loadMoreElement.firstElementChild.classList.remove("invisible");
        await sleep(1 * 1000);
      },
      postLoadCallback: async () => {
        assert(loadMoreElement.firstElementChild);
        loadMoreElement.firstElementChild.classList.add("invisible");
      },
    });
  }, 1 * 1000);

  setInterval(async () => await chat.loadNewer(), query.interval);
});
