document.getElementById("exportButton").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "exportBookmarks" }, (response) => {
    if (response && response.status === "started") {
      document.getElementById("status").textContent =
        "Export started. Check the Twitter tab.";
    } else {
      document.getElementById("status").textContent = "Error starting export.";
    }
  });
});
