document.addEventListener("DOMContentLoaded", () => {
  const helpBtn = document.getElementById("helpBtn");
  const helpTooltip = document.getElementById("helpTooltip");
  const helpOverlay = document.getElementById("helpOverlay");

  if (!helpBtn || !helpTooltip || !helpOverlay) {
    console.warn("Không tìm thấy helpBtn, helpTooltip hoặc helpOverlay");
    return;
  }

  // Nhấn ❔ để bật/tắt
  helpBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const isOpen = helpTooltip.classList.contains("show");

    if (isOpen) {
      closeHelp();
    } else {
      openHelp();
    }
  });

  // Nhấn overlay → tắt help
  helpOverlay.addEventListener("click", closeHelp);

  // Nhấn ra ngoài tooltip → đóng
  document.addEventListener("click", (e) => {
    if (!helpTooltip.contains(e.target) && e.target !== helpBtn) {
      closeHelp();
    }
  });

  function openHelp() {
    helpTooltip.classList.add("show");
    helpOverlay.classList.add("show");
  }

  function closeHelp() {
    helpTooltip.classList.remove("show");
    helpOverlay.classList.remove("show");
  }
});
