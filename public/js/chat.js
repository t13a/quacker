"use strict";

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

window.addEventListener("DOMContentLoaded", async () => {
  const sendFormElement = document.querySelector(".send-form");
  const sendFormMessageElement = document.querySelector(".send-form *[name=message]");

  sendFormElement.addEventListener("submit", async (e) => {
    e.preventDefault();
    await doPostChat(sendFormMessageElement.value);
  });
});
