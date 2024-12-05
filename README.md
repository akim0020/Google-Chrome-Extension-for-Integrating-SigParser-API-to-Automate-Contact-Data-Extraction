# SigParser Chrome Extension

A Chrome extension to integrate SigParser's API with Gmail and LinkedIn, offering enhanced relationship management tools directly within your browser.

## Adding the Chrome Extension to the Google Cloud Console

Follow these steps to set up the Chrome extension on Google Cloud Console for OAuth2 integration:

1. **Go to the Google Cloud Console**:
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/).

2. **Create a New Project**:
   - Click on the dropdown menu in the top-left corner and select "New Project."
   - Enter a project name and click "Create."

3. **Enable APIs**:
   - Go to "APIs & Services" > "Library."
   - Search for "Google Drive API" and enable it (if required for your project).
   - Repeat for other necessary APIs.

4. **Set Up OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth Consent Screen."
   - Select "External" if the app is for external users and fill in the necessary details.
   - Add the scope for `https://www.googleapis.com/auth/userinfo.email`.

5. **Create OAuth Credentials**:
   - Go to "APIs & Services" > "Credentials."
   - Click "Create Credentials" > "OAuth Client ID."
   - Select "Web Application" and enter the details:
     - Authorized redirect URIs: `https://ldmpjmpicigfhojakldmfnlmdolcepeh.chromiumapp.org/`
   - Save the client ID and secret.

6. **Add Client ID to Manifest File**:
   - Update the `externally_connectable` field in `manifest.json` with your client ID.

7. **Deploy the Extension**:
   - Load the unpacked extension in Chrome for testing.
   - Test the OAuth flow to ensure everything is working as expected.

---

## Project Files

### 1. `manifest.json`
Defines the Chrome extension configuration, permissions, and content scripts. It links the extension to Gmail and LinkedIn and specifies the service worker for background tasks.

### 2. `proxy-server.mjs`
A Node.js-based Express server acting as a proxy for secure communication with the SigParser API, handling token exchange and API requests.

### 3. `gmail.js`
Handles Gmail-specific functionality, extracting email information and sending it to the background script for processing.

### 4. `linkedin.js`
Injects custom UI elements into LinkedIn pages and interacts with the LinkedIn API for fetching company data.

### 5. `linkedin-styles.css`
Styles for the LinkedIn content injected by the extension, ensuring a seamless and professional look.

### 6. `popup.html`
The UI for the Chrome extension popup, featuring sections for top contacts, coworkers, and company relationships.

### 7. `popup.css`
Styles for the popup UI, including buttons, headers, and relationship graphs.

### 8. `popup.js`
Manages the popup's functionality, including OAuth login, displaying fetched data, and handling domain-specific actions.

---

## Features

- **OAuth2 Authentication**: Secure login using SigParser credentials.
- **Email Integration**: Extracts and processes email data from Gmail.
- **LinkedIn Integration**: Enhances LinkedIn profiles with company and contact data.
- **Custom Popup**: Displays detailed contact and relationship data.

---

## Installation

1. Clone the repository to your local machine.
2. Navigate to Chrome > Extensions.
3. Enable "Developer Mode."
4. Click "Load Unpacked" and select the project directory.

---

## Development

### Prerequisites

- Node.js and npm
- Chrome browser

### Running the Proxy Server

1. Navigate to the directory containing `proxy-server.mjs`.
2. Install dependencies: `npm install`.
3. Start the server: `node proxy-server.mjs`.

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

