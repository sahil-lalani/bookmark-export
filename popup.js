document.getElementById("exportButton").addEventListener("click", async () => {
  try {
    const response = await browser.runtime.sendMessage({ action: "exportBookmarks" });
    if (response && response.status === "started") {
      document.getElementById("status").textContent = "Export started. Check the Twitter tab.";
    } else {
      document.getElementById("status").textContent = "Error starting export.";
    }
  } catch (error) {
    document.getElementById("status").textContent = "Error: " + error.message;
  }
});

// Listen for status updates from background
browser.runtime.onMessage.addListener((request) => {
  if (request.action === "updateStatus") {
    document.getElementById("status").textContent = request.message;
  }
});