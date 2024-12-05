(function () {
    console.log('gmail.js is running...');
    document.body.style.border = '5px solid green'; // Visual indicator that the script is running

    // Extract email information
    function extractEmailInfo() {
        const emailElement = document.querySelector('.go'); // Adjust this selector if needed
        if (!emailElement) {
            console.error('Email element not found. Check the Gmail DOM structure.');
            return null;
        }

        const email = emailElement.textContent.trim();
        if (!email) {
            console.error('Email element exists but no email found.');
            return null;
        }

        console.log('Extracted email:', email);
        return email;
    }

    // Extract the email and send it to the extension
    const emailInfo = extractEmailInfo();
    if (emailInfo) {
        // Send the email to the background script
        chrome.runtime.sendMessage({ action: 'fetchGmailData', email: emailInfo }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending email to background:', chrome.runtime.lastError.message);
            } else {
                console.log('Email sent to background.js. Response:', response);
            }
        });
    } else {
        console.log('No email extracted.');
    }
})();









