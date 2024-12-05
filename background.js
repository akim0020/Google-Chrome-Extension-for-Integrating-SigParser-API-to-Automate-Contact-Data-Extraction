import { CONFIG, buildAuthUrl, buildApiUrl } from './config.js';

let accessToken = null;

// Function to initiate the OAuth login process
function initiateLogin(sendResponse) {
    const authUrl = buildAuthUrl(CONFIG.oauth.clientId, CONFIG.oauth.redirectUri);
    console.log('Initiating OAuth login:', authUrl);

    chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (redirectUrl) => {
            if (chrome.runtime.lastError || !redirectUrl) {
                const error = chrome.runtime.lastError?.message || 'Authorization failed. Redirect URL is missing.';
                console.error('OAuth flow error:', error);
                sendResponse({ error });
                return;
            }

            const urlParams = new URLSearchParams(new URL(redirectUrl).search);
            const code = urlParams.get('code');

            if (code) {
                console.log('Authorization code received:', code);
                exchangeCodeForTokens(code, sendResponse);
            } else {
                const error = 'Authorization code not found in redirect URL.';
                console.error(error);
                sendResponse({ error });
            }
        }
    );
}

// Function to exchange the authorization code for tokens
async function exchangeCodeForTokens(code, sendResponse) {
    const proxyUrl = CONFIG.api.proxyTokenUrl;
    const body = {
        code,
        client_id: CONFIG.oauth.clientId,
        client_secret: CONFIG.oauth.clientSecret,
        redirect_uri: CONFIG.oauth.redirectUri,
        grant_type: 'authorization_code',
    };

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Tokens received:', data);

        accessToken = data.access_token;
        chrome.storage.local.set({ accessToken }, () => {
            console.log('Access token stored.');
            sendResponse({ token: accessToken });
        });
    } catch (error) {
        console.error('Error exchanging code for tokens:', error.message);
        sendResponse({ error: error.message });
    }
}

// Function to load the access token from storage
function loadAccessToken(callback) {
    chrome.storage.local.get('accessToken', (result) => {
        if (result.accessToken) {
            accessToken = result.accessToken;
            console.log('Access token loaded from storage.');
        } else {
            console.warn('No access token found in storage.');
        }
        if (callback) callback();
    });
}

// Generalized function to fetch data from SigParser API
async function fetchData(endpoint, params, sendResponse) {
    if (!accessToken) {
        console.error('No access token available.');
        sendResponse({ error: 'No access token available. Please log in.' });
        return;
    }
    if (params.domain) {
        params.domain = params.domain.replace(/^www\./, '');
        }
   


    const url = buildApiUrl(endpoint, params);
    console.log('Constructed API URL:', url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': accessToken,
                'accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch data. Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Data received:', data);

        if (data.data && data.data.length > 0) {
            const primaryData = data.data[0];

            if (data.next_url?.includes('email=')) {
                // Handle email data
                const formattedEmailData = {
                    type: 'email',
                    name: primaryData.contact_name || 'Not available',
                    email: primaryData.contact_email || 'Not available',
                    emailsTo: primaryData.emails_to || 0,
                    emailsFrom: primaryData.emails_from || 0,
                    completedMeetings: primaryData.completed_meetings || 0,
                    upcomingMeetings: primaryData.upcoming_meetings || 0,
                    firstInteraction: formatDate(primaryData.first_interaction),
                    latestInteraction: formatDate(primaryData.latest_interaction),
                };
                chrome.runtime.sendMessage({ action: 'updatePopup', data: formattedEmailData, response: data.data });
            } else {
                // Handle company data
                const formattedCompanyData = {
                    type: 'company',
                    companyName: primaryData.company_name || 'Not available',
                    emailDomain: primaryData.email_domain || 'Not available',
                    emailsTo: primaryData.interactions_emails_to || 'Not available',
                    emailsFrom: primaryData.interactions_emails_from || 'Not available',
                    completedMeetings: primaryData.interactions_meetings_completed || 'Not available',
                    upcomingMeetings: primaryData.interactions_meetings_upcoming || 'Not available',
                    totalInteractions: primaryData.interactions_total_latest || 'Not available',
                    relationshipLatest: primaryData.relationship_latest || 'Not available',
                    relationshipStrongest: primaryData.relationship_strongest || 'Not available',
                    relationshipMostActive: primaryData.relationship_most_active || 'Not available',
                    relationshipFirst: primaryData.relationship_first || 'Not available',
                };
                chrome.runtime.sendMessage({ action: 'updatePopup', data: formattedCompanyData, response : data.data});
            }
            sendResponse({ success: true,});
        } else {
            sendResponse({ error: 'No data available for the request.' });
        }
    } catch (error) {
        console.error('Error fetching data:', error.message);
        sendResponse({ error: error.message });
    }
}

// Function to format a date string into a readable format
function formatDate(dateString) {
    if (!dateString) return 'Not available';
    try {
        const date = new Date(dateString);
        if (isNaN(date)) throw new Error('Invalid date');
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (error) {
        console.error('Error formatting date:', error.message);
        return 'Not available';
    }
}


// Listener for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const  { action, domain, email, profileUrl } = request;

    switch (action) {
        case 'login':
            loadAccessToken(() => {
                if (!accessToken) {
                    initiateLogin(sendResponse);
                } else {
                    console.log('User already logged in.');
                    sendResponse({ token: accessToken });
                }
            });
            break;

            case 'fetchGoogleEmail':
                console.log('Fetching Google email data...');
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs.length === 0 || !tabs[0].id) {
                        console.error('No active Gmail tab found.');
                        sendResponse({ error: 'No active Gmail tab found.' });
                        return;
                    }
    
                    const tabId = tabs[0].id;
                    const tabUrl = tabs[0].url;
    
                    if (!tabUrl || !tabUrl.includes('mail.google.com')) {
                        console.error('Active tab is not Gmail.');
                        sendResponse({ error: 'Active tab is not Gmail.' });
                        return;
                    }
    
                    console.log('Injecting gmail.js into Gmail tab...');
                    chrome.scripting.executeScript(
                        {
                            target: { tabId },
                            files: ['content_scripts/gmail.js'],
                        },
                        (result) => {
                            if (chrome.runtime.lastError) {
                                console.error('Failed to inject gmail.js:', chrome.runtime.lastError.message);
                                sendResponse({ error: chrome.runtime.lastError.message });
                            } else {
                                console.log('gmail.js successfully injected:', result);
                                sendResponse({ success: 'gmail.js executed successfully.' });
                            }
                        }
                    );
                });
                break;
        
        case 'injectLinkedInScript':
            console.log('Fetching Google email data...');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0 || !tabs[0].id) {
                    console.error('No active Gmail tab found.');
                    sendResponse({ error: 'No active Gmail tab found.' });
                    return;
                }

                const tabId = tabs[0].id;
                const tabUrl = tabs[0].url;

                if (!tabUrl || !tabUrl.includes('linkedin.com')) {
                    console.error('Active tab is not Gmail.');
                    sendResponse({ error: 'Active tab is not Gmail.' });
                    return;
                }

                console.log('Injecting linkedin.js into tab...');
                chrome.scripting.executeScript(
                    {
                        target: { tabId },
                        files: ['content_scripts/linkedin.js'],
                    },
                    (result) => {
                        if (chrome.runtime.lastError) {
                            console.error('Failed to inject linkedin.js:', chrome.runtime.lastError.message);
                            sendResponse({ error: chrome.runtime.lastError.message });
                        } else {
                            console.log('linkedin.js successfully injected:', result);
                            sendResponse({ success: 'linkedin.js executed successfully.' });
                        }
                    }
                );
            });
            break;
        
        case 'getLinkedInURL':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0 || !tabs[0].url) {
                    console.error('No active tab found.');
                    sendResponse({ error: 'No active tab found.' });
                    return;
                }

                const currentTabUrl = tabs[0].url;
                console.log('Current Tab URL:', currentTabUrl);

                if (currentTabUrl.includes('linkedin.com/company/')) {
                    sendResponse({ profileUrl: currentTabUrl });
                } else {
                    console.warn('Not a valid LinkedIn profile URL.');
                    sendResponse({ error: 'Not a valid LinkedIn profile URL.' });
                }
            });
        return true;

        case 'fetchGmailData':
            if (!email) {
                console.error('No email provided for fetching Gmail data.');
                sendResponse({ error: 'No email provided.' });
                return;
            }
            
            let cleanedEmail = email;
            if (cleanedEmail.startsWith('<') && cleanedEmail.endsWith('>')){
                cleanedEmail = cleanedEmail.slice(1,-1)
            }
            console.log('Fetching Gmail data for email:', cleanedEmail);
            fetchData('/graph/contacts', { primary_contact_email: cleanedEmail }, sendResponse);
            break;
        
        case 'fetchLinkedInCompanyData':
            const profileUrl = request.profileUrl; // Ensure we access profileUrl from the request
            if (!profileUrl) {
                console.error('No LinkedIn profile URL provided.');
                sendResponse({ error: 'No LinkedIn profile URL provided.' });
                return;
            }
        
            console.log('Fetching company data using LinkedIn profile URL:', profileUrl);
        
            try {
                // Extract the company name from the LinkedIn URL
                const urlParts = new URL(profileUrl).pathname.split('/');
                const companyName = urlParts[urlParts.indexOf('company') + 1]; // Get the part after "company"
        
                if (!companyName) {
                    console.error('Could not extract company name from LinkedIn URL.');
                    sendResponse({ error: 'Could not extract company name.' });
                    return;
                }
        
                // Construct the domain
                const companyDomain = `${companyName}.com`;
                console.log('Constructed Company Domain:', companyDomain);
        
                // Use fetchData with the constructed domain
                fetchData('/companies', { domain: companyDomain }, (response) => {
                    if (response?.error) {
                        console.error('Error fetching company data:', response.error);
                        sendResponse({ error: response.error });
                    } else {
                        console.log('Company data fetched successfully:', response);
                        // Send the data back to the LinkedIn content script or popup
                        chrome.runtime.sendMessage({
                            action: 'renderLinkedInCompanyData',
                            data: response
                        });
                        sendResponse({ success: true, data: response });
                    }
                });
                chrome.runtime.sendMessage({
                    action: 'renderLinkedInCompanyData',
                    data: response
                }, () => {
                    console.log('Message sent to content script:', response);
                });
                
            } catch (error) {
                console.error('Error processing LinkedIn profile URL:', error.message);
                sendResponse({ error: error.message });
            }
            break;
        
          
        case 'fetchDomainData':
            console.log('Fetching domain data for:', domain);
            fetchData('/companies', { domain }, sendResponse);
            break;
        
        case 'fetchAdditionalData':
            // const email = request.email;
            console.log("Fetching additional data for email:", email);
            fetchData('/graph/contacts', { primary_contact_email: email }, (response) => {
            if (response?.error) {
                console.error("Error fetching additional data:", response.error);
                sendResponse({ error: response.error });
            } else {
                console.log("Additional data fetched successfully:", response);
                sendResponse(response);
                }
            });
    

            break;


        default:
            console.warn('Unknown action:', action);
            sendResponse({ error: 'Unknown action.' });
    }

    return true;
});

// Inject scripts based on the active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const domain = new URL(tab.url).hostname;

        if (domain.includes('mail.google.com')) {
            chrome.scripting.executeScript({ target: { tabId }, files: ['content_scripts/gmail.js'] });
        } else if (domain.includes('linkedin.com')) {
            chrome.scripting.executeScript({ target: { tabId }, files: ['content_scripts/linkedin.js'] });
        }
    }
});


chrome.runtime.onStartup.addListener(() => {
    console.log('Chrome started. Clearing access token.');
    chrome.storage.local.remove('accessToken', () => {
        console.log('Access token cleared on startup.');
    });
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed or reloaded. Clearing access token.');
    chrome.storage.local.remove('accessToken', () => {
        console.log('Access token cleared on reload.');
    });
});




