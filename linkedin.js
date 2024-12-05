// Function to inject the div after the target element
function injectDivAfterEmber35(profileUrl) {
    const targetElement = document.getElementById('ember419'); // Find the element with ID 'ember35'

    if (targetElement && !document.getElementById('myCustomDiv')) {
        const newDiv = document.createElement('div');
        newDiv.id = 'myCustomDiv';

        // Set styles for the div
        newDiv.style.padding = '10px';
        newDiv.style.backgroundColor = '#0073b1'; // LinkedIn's blue color
        newDiv.style.color = 'white';
        newDiv.style.fontSize = '16px';
        newDiv.style.borderRadius = '5px';
        newDiv.innerHTML = `LinkedIn Profile URL: ${profileUrl || 'URL not found'}`;

        // Insert the new div after the target element
        targetElement.parentNode.insertBefore(newDiv, targetElement.nextSibling);
    }
}

// Function to observe DOM changes and look for the target element
function observeDOMChanges(profileUrl) {
    const targetNode = document.body; // Observe changes in the entire body
    const config = { childList: true, subtree: true };

    const callback = function (mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                injectDivAfterEmber35(profileUrl); // Pass the profile URL to the injection function
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}

// Request LinkedIn URL from the background script
chrome.runtime.sendMessage({ action: 'getLinkedInURL' }, (response) => {
    console.log('getLinkedInURL Response:', response);

    if (response?.profileUrl) {
        console.log('LinkedIn Profile URL:', response.profileUrl);
        chrome.runtime.sendMessage({ 
            action: 'fetchLinkedInCompanyData', 
            profileUrl: response.profileUrl 
        }, (fetchResponse) => {
            console.log('fetchLinkedInCompanyData Response:', fetchResponse);
        });
    } else {
        console.error('Error in getLinkedInURL response:', response?.error);
    }
});


// Listener to handle messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'renderCompanyLinkedInData' && message.data) {
        console.log('Company data received:', message.data);
        renderLinkedInData(message.data); // Function to render data on the page
    }
});

// Function to render data on the LinkedIn page
function renderLinkedInData(data) {
    const targetElement = document.getElementById('ember419'); // Adjust ID or selector as needed

    if (targetElement) {
        const newDiv = document.createElement('div');
        newDiv.id = 'companyDataDiv';
        newDiv.className = 'custom-div';
        newDiv.style.padding = '10px';
        newDiv.style.backgroundColor = '#f3f3f3';
        newDiv.style.border = '1px solid #ddd';
        newDiv.style.borderRadius = '5px';

        // Populate the div with company data
        newDiv.innerHTML = `
            <h3>Company Details</h3>
            <p><strong>Name:</strong> ${data.company_name || 'Not available'}</p>
            <p><strong>Website:</strong> ${data.company_website || 'Not available'}</p>
            <p><strong>Email Domain:</strong> ${data.email_domain || 'Not available'}</p>
            <p><strong>Contacts:</strong> ${data.contacts_count || 'Not available'}</p>
            <p><strong>Industry:</strong> ${data.industry_primary || 'Not available'}</p>
        `;

        // Inject the div after the target element
        targetElement.parentNode.insertBefore(newDiv, targetElement.nextSibling);
    } else {
        console.warn('Target element not found on the LinkedIn page.');
    }
}


