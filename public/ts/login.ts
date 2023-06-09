import avatar from "animal-avatar-generator";
import "@fontsource/bad-script";
import "../scss/style.scss";

function assert(value: any): asserts value {
  if (!value) {
    throw new Error();
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const avatarElement = document.querySelector<HTMLDivElement>(".avatar");
  const nicknameElement = document.querySelector<HTMLInputElement>("*[name=nickname]");

  assert(avatarElement);
  assert(nicknameElement);

  const updateAvatar = () => {
    if (avatarElement.firstElementChild) {
      avatarElement.removeChild(avatarElement.firstElementChild);
    }
    if (nicknameElement.value) {
      avatarElement.insertAdjacentHTML("afterbegin", avatar(nicknameElement.value, { blackout: false }));
      assert(avatarElement.firstElementChild);
      avatarElement.firstElementChild.removeAttribute("width");
      avatarElement.firstElementChild.removeAttribute("height");
    } else {
      const questionIconElement = document.createElement("i");
      questionIconElement.classList.add("bi", "bi-person-fill", "position-absolute", "start-50", "top-50", "translate-middle", "text-dark");
      avatarElement.appendChild(questionIconElement);
    }
  };

  nicknameElement.addEventListener("input", () => updateAvatar());

  updateAvatar();
});
