(function () {
  "use strict";

  document.querySelectorAll(".tri-card").forEach((card) => {
    const buttons = card.querySelectorAll(".tri-btn");
    const result = card.querySelector(".tri-result");

    function cover(key) {
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.q === key)));
      card.querySelectorAll(".tri-letter").forEach((letter) => letter.classList.toggle("covered", letter.dataset.q === key));
      card.querySelectorAll(".tri-forms li").forEach((item) => item.classList.toggle("active", item.dataset.q === key));
      const form = card.querySelector(`.tri-forms li[data-q="${key}"] span`);
      result.textContent = form ? form.textContent : "";
      result.classList.add("shown");
    }

    buttons.forEach((button) => button.addEventListener("click", () => cover(button.dataset.q)));
    card.querySelectorAll(".tri-letter").forEach((letter) => letter.addEventListener("click", () => cover(letter.dataset.q)));
  });
})();
