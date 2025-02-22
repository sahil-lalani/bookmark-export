# Twitter/X Bookmark Exporter

Twitter/X Bookmark Exporter is a browser extension that allows you to export all your bookmarks from Twitter (now X) to a JSON file. Originally developed for Chrome, it has been adapted for Firefox using Manifest V3.

## Features

- Export all your Twitter/X bookmarks with a single click
- Saves bookmarks as a plain JSON file
- Includes tweet text, timestamp, and media information
- Handles pagination to fetch all bookmarks automatically

## Installation

1. Clone this repository or download the source code from GitHub.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click "Load Temporary Add-on" and select any file in the extension directory (e.g., `manifest.json`).

## Usage

1. Click the extension icon in your Firefox toolbar to open the popup.
2. Click "Export Bookmarks".
3. A new tab will open to `https://x.com/i/bookmarks/all`.
4. Wait for the export to complete—status updates will appear in the popup.
5. Once finished, a JSON file (`bookmarks_[timestamp].json`) will download automatically.

## File Structure

- `manifest.json`: Extension configuration (Manifest V3)
- `popup.html`: Popup UI
- `popup.js`: Popup logic
- `background.js`: Background script for fetching and exporting bookmarks

## Permissions

- `"storage"`: Stores authentication data and API IDs
- `"webRequest"`: Captures headers from X requests
- `"downloads"`: Saves the JSON file
- `"host_permissions": ["*://x.com/*", "*://twitter.com/*"]`: Access to X/Twitter domains

## Development

To modify or extend this extension:
1. Update `manifest.json` for new permissions or features.
2. Edit `popup.html` and `popup.js` for UI changes.
3. Modify `background.js` for export logic adjustments.

## Security Notes

- This extension uses an undocumented X API, which may violate X's Terms of Service—use at your own risk.
- No data is encrypted; bookmarks are saved as plain JSON.
- Authentication data (cookies, tokens) is stored in session storage and could be accessed by other extensions with `"storage"` permission.

## Contributing

Contributions are welcome! Fork the repository and submit a Pull Request.

## Authors

- **Original Author**: Sahil Lalani (sahil-lalani)
- **Contributors**:
  - John M. Kenny (john-m-kenny)
  - Grok 3 beta, xAI (created by xAI)

**Date**: February 22, 2025

## License

MIT License

## Disclaimer

This extension is not affiliated with, endorsed, or sponsored by Twitter, Inc. or X Corp. It uses an undocumented API and may stop working if X changes its backend.