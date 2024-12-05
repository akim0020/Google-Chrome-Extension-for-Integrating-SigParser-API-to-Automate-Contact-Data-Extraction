document.addEventListener('DOMContentLoaded', () => {
    const oauthLoginButton = document.getElementById('oauthLoginButton');
    const output = document.getElementById('output');

    console.log('Popup initialized.');

    // Listen for messages from background.js
    chrome.runtime.onMessage.addListener((request) => {
        const { action, data , response} = request;
        console.log("Request", request);
        console.log("Response:", response);

        if (action === 'updatePopup' && data) {
            if (data.type === 'email') {
                console.log("Rendering data for Gmail Account:",data.email )
                renderEmailData(data, response);
                
            } else if (data.type === 'company') {
                console.log("Rendering data for company:", data.companyName)
                const company_email_address = response[0]?.relationships_company_emailaddresses?.[0];
                console.log("Company Email:", company_email_address);
                renderCompanyData(data);
                if (company_email_address) {
                    fetchAdditonalCompanyData(company_email_address);
                }
                
            }
        }
    });

    // Handle OAuth login button click
    oauthLoginButton.addEventListener('click', () => {
        console.log('OAuth Login button clicked');
        chrome.runtime.sendMessage({ action: 'login' }, (response) => {
            if (response?.error) {
                output.textContent = `Error: ${response.error}`;
            } else {
                console.log('Login successful!');
                chrome.storage.local.set({ accessToken: response.token }, () => {
                    console.log('Access token stored successfully.');
                    handleDomainSpecificAction();
                });
            }
        });
    });

    // Handle domain-specific actions
    function handleDomainSpecificAction() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].url) {
                output.textContent = 'Error: No active tab found.';
                return;
            }
    
            const domain = new URL(tabs[0].url).hostname;
            console.log('Detected domain:', domain);
    
            if (domain === 'mail.google.com') {
                console.log("Detected Gmail Domain. Triggering fetchGoogleEmail...");
                chrome.runtime.sendMessage({ action: 'fetchGoogleEmail' }, (response) => {
                    if (response?.error) {
                        console.error("Error fetching Gmail email data:", response.error);
                    } else {
                        console.log("'Gmail-specific action executed successfully:", response);
                    }
                });
            } else if (domain === 'www.linkedin.com') {
                console.log("Detected LinkedIn Domain. Triggering injectLinkedInScript...");
                chrome.runtime.sendMessage({ action: 'injectLinkedInScript' }, (response) => {
                    if (response?.error) {
                        console.error("Error injecting LinkedIn script:", response.error);
                    } else {
                        console.log("LinkedIn script injected successfully!");
                    }
                });
            } else {
                console.log("Fetching general domain data...");
                chrome.runtime.sendMessage({ action: 'fetchDomainData', domain }, (response) => {
                    if (response?.error) {
                        output.textContent = `Error: ${response.error}`;
                    } else {
                        console.log('Domain data fetched:', response);
                    }
                });
            }
        });
    }
    

    // Render email data
    function renderEmailData(data, response) {
        console.log('Data received in renderEmailData:', data);
        console.log('Response received in renderEmailData:', response)
        output.innerHTML = `
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Emails To:</strong> ${data.emailsTo}</p>
            <p><strong>Emails From:</strong> ${data.emailsFrom}</p>
            <p><strong>Completed Meetings:</strong> ${data.completedMeetings}</p>
            <p><strong>Upcoming Meetings:</strong> ${data.upcomingMeetings}</p>
            <p><strong>First Interaction:</strong> ${data.firstInteraction}</p>
            <p><strong>Latest Interaction:</strong> ${data.latestInteraction}</p>
        `;
        // Call displayTopContactsAndCoworkers from within renderEmailData
        if (response ) {
            console.log('Calling displayTopContactsAndCoworkers from renderEmailData...');
            displayTopContactsAndCoworkers(response, data.name);
        } else {
            console.error('Response data is undefined. Cannot display contacts and coworkers.');
        }
    }

    function fetchAdditonalCompanyData(email) {
        chrome.runtime.sendMessage(
            {action: 'fetchAdditionalData', email},
            (response) => {
                if (response?.error) {
                    console.error("Error fetching additional data", response.error);
                } else {
                    console.log("Additional data fetched for email", response);
                }
            }
        )
    }
   // Render company data
    function renderCompanyData(data) {
        document.getElementById('companyDetails').textContent = data.companyName || 'Not available';
        document.getElementById('emailDomain').textContent = `Email Domain: ${data.emailDomain || 'Not available'}`;
        document.getElementById('emailTo').textContent = `Emails To: ${data.emailsTo || 'Not available'}`;
        document.getElementById('emailFrom').textContent = `Emails From: ${data.emailsFrom || 'Not available'}`;
        document.getElementById('ComMeeting').textContent = `Completed Meetings: ${data.completedMeetings || 'Not available'}`;
        document.getElementById('upMeeting').textContent = `Upcoming Meetings: ${data.upcomingMeetings || 'Not available'}`;
        document.getElementById('toInteract').textContent = `Total Interactions: ${data.totalInteractions || 'Not available'}`;
        document.getElementById('latestRelationship').textContent = `Latest Relationship: ${data.relationshipLatest || 'Not available'}`;
        document.getElementById('strongestRelationship').textContent = `Strongest Relationship: ${data.relationshipStrongest || 'Not available'}`;
        document.getElementById('activeRelationship').textContent = `Most Active Relationship: ${data.relationshipMostActive || 'Not available'}`;
        document.getElementById('firstRelationship').textContent = `First Relationship: ${data.relationshipFirst || 'Not available'}`;

    }

    // Function to display top contacts and coworkers
    function displayTopContactsAndCoworkers(listOfContacts, currentEmail) {
        console.log("List of Contacts for Display:", listOfContacts);
        console.log("Current Email:", currentEmail);
        const topContactsContainer = document.getElementById('topContacts');
        const topCoworkersContainer = document.getElementById('topCoworkers');
        const contactsCountElem = document.getElementById('contactsCount');
        const coworkersCountElem = document.getElementById('coworkersCount');
        const personNameElem = document.getElementById('company');
        // Clear previous data
        topContactsContainer.innerHTML = '';
        topCoworkersContainer.innerHTML = '';

        // Validate listOfContacts
        if (!Array.isArray(listOfContacts)) {
            console.error('listOfContacts is not an array. Cannot display contacts.');
            return;
        }


        // Map and sort contacts
        const sortedContacts = listOfContacts
            .map(person => ({
                name: person.related_contact_name,
                title: person.related_contact_title,
                emailTo: person.emails_to || 0,
                emailFrom: person.emails_from || 0,
                meetings: person.completed_meetings || 0,
                latestInteraction: person.latest_interaction,
                contactEmail: person.related_contact_email,
                email: person.related_contact_email,
                upcomingMeetings: person.upcoming_meetings || 0
            }))
            .sort((contactA, contactB) => {
                const totalA = contactA.emailTo + contactA.emailFrom;
                const totalB = contactB.emailTo + contactB.emailFrom;
                return totalB - totalA;
            });
            
            

        // Top Contacts
        const topContacts = sortedContacts.slice(0, 2);
        topContacts.forEach(contact => {
            const contactElem = document.createElement('div');
            contactElem.innerHTML = `
                <p><strong>Name:</strong> ${contact.name || 'Not available'}</p>
                <p><strong>Emails To:</strong> ${contact.emailTo}</p>
                <p><strong>Emails From:</strong> ${contact.emailFrom}</p>
                <p><strong>Meetings:</strong> ${contact.meetings}</p>
                <p><strong>Latest Interaction:</strong> ${
                    contact.latestInteraction
                        ? new Date(contact.latestInteraction).toLocaleDateString('en-US')
                        : 'Not available'
                }</p>
            `;
            topContactsContainer.appendChild(contactElem);
        });

        // Top Coworkers
        const filteredContacts = sortedContacts.filter(
            contact => contact.contactEmail !== currentEmail && contact.contactEmail.endsWith('@vcfparser.com')
        );

        const topCoworkers = filteredContacts.slice(0, 2); // Top 2 coworkers
        const totalCoworkers = filteredContacts.length;

        console.log('Total coworkers:', totalCoworkers);
        console.log('Top coworkers:', topCoworkers);

        if (topCoworkers.length > 0) {
            topCoworkers.forEach(coworker => {
                const coworkerElem = document.createElement('div');
                coworkerElem.innerHTML = `
                    <p><strong>Name:</strong> ${coworker.name || 'Not available'}</p>
                    <p><strong>Emails To:</strong> ${coworker.emailTo}</p>
                    <p><strong>Emails From:</strong> ${coworker.emailFrom}</p>
                    <p><strong>Meetings:</strong> ${coworker.meetings}</p>
                    <p><strong>Latest Interaction:</strong> ${
                        coworker.latestInteraction
                            ? new Date(coworker.latestInteraction).toLocaleDateString('en-US')
                            : 'Not available'
                    }</p>
                `;
                topCoworkersContainer.appendChild(coworkerElem);
            });
        } else {
            const noCoworkersElem = document.createElement('p');
            noCoworkersElem.textContent = 'No coworkers found for this user.';
            topCoworkersContainer.appendChild(noCoworkersElem);
        }
   // Calculate total contacts
const totalContacts = sortedContacts.length;

// Update counts in the HTML
contactsCount.textContent = totalContacts;
coworkersCount.textContent = totalCoworkers;

// Update the person's name
const personName = currentEmail?.split('@')[0] || 'Unknown';
companyDetails.textContent = personName;

console.log('Total contacts:', totalContacts);
console.log('Total coworkers:', totalCoworkers);
}

});
