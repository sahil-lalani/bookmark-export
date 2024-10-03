# X Bookmark Exporter

X Bookmark Exporter is a Chrome extension that allows you to export your bookmarks from X (formerly Twitter, Inc.) to a JSON file.

## Features

- Export all your X bookmarks with a single click
- Saves bookmarks as a JSON file
- Includes tweet text, timestamp, and media information
- Handles pagination to fetch all bookmarks

## Installation

1. Clone this repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.

## Usage

1. Click on the extension icon in your Chrome toolbar to open the popup.
2. Click the "Export Bookmarks" button.
3. The extension will open a new tab to X's bookmarks page.
4. Wait for the export process to complete. The status will be shown in the popup.
5. Once finished, a JSON file containing your bookmarks will be downloaded automatically.

## File Structure

- `manifest.json`: Extension configuration
- `popup.html`: HTML for the extension popup
- `popup.js`: JavaScript for the popup functionality
- `background.js`: Background script for handling bookmark export

## Permissions

This extension requires the following permissions:

- `scripting`: To interact with web pages
- `downloads`: To save the exported bookmarks file
- `storage`: To store necessary data locally
- `webRequest`: To intercept and handle web requests

## Development

To modify or extend this extension:

1. Update the manifest.json file for any new permissions or features.
2. Modify popup.html and popup.js for changes to the user interface.
3. Edit background.js to alter the bookmark fetching and processing logic.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Disclaimer

This extension is not affiliated with, endorsed, or sponsored by X Corp., or X Holdings Corp. Use at your own risk.
