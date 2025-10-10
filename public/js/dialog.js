// --- Custom Dialog Logic ---

function showDialog(title, message) {
  const dialogOverlay = document.getElementById("custom-dialog-overlay");
  const dialogTitle = document.getElementById("custom-dialog-title");
  const dialogMessage = document.getElementById("custom-dialog-message");

  if (!dialogOverlay || !dialogTitle || !dialogMessage) {
    console.error("Dialog elements not found in the DOM.");
    return;
  }

  dialogTitle.textContent = title;
  dialogMessage.innerHTML = message; // Use innerHTML to allow for formatted hotkey list

  dialogOverlay.classList.add("show");

  const closeBtn = document.getElementById("custom-dialog-close-btn");
  if (closeBtn) {
    closeBtn.focus(); // Set focus to the close button for accessibility
  }
}

function hideDialog() {
  const dialogOverlay = document.getElementById("custom-dialog-overlay");
  if (dialogOverlay) {
    dialogOverlay.classList.remove("show");
  }
}

function initDialog() {
  fetch('dialog.html')
    .then(response => response.text())
    .then(data => {
      document.body.insertAdjacentHTML('beforeend', data);

      const dialogOverlay = document.getElementById("custom-dialog-overlay");
      const closeBtn = document.getElementById("custom-dialog-close-btn");

      if (dialogOverlay) {
        dialogOverlay.addEventListener("click", (e) => {
          if (e.target === dialogOverlay) {
            hideDialog();
          }
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener("click", hideDialog);
      }

      // Hide dialog on escape key press
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && dialogOverlay.classList.contains("show")) {
          hideDialog();
        }
      });
    })
    .catch(error => console.error('Error loading dialog:', error));
}

// Initialize the dialog when the script loads
document.addEventListener("DOMContentLoaded", initDialog);
