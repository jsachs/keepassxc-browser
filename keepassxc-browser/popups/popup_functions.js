'use strict';

var $ = function(elem)
{
    return document.querySelector(elem);
};

function updateAvailableResponse(available) {
    if (available) {
        $('#update-available').style.display = 'block';
    }
}

function initSettings() {
    const optionsButton = $('#settings #btn-options');
    if (optionsButton) {
        optionsButton.addEventListener('click', function() {
            browser.runtime.openOptionsPage().then(close());
        });
    }

    const chooseCredentialsButton = $('#settings #btn-choose-credential-fields');
    if (chooseCredentialsButton) {
        chooseCredentialsButton.addEventListener('click', function() {
            browser.windows.getCurrent().then((win) => {
                browser.tabs.query({ 'active': true, 'currentWindow': true }).then((tabs) => {
                    const tab = tabs[0];
                    browser.runtime.getBackgroundPage().then((global) => {
                        browser.tabs.sendMessage(tab.id, {
                            action: 'choose_credential_fields'
                        });
                        close();
                    });
                });
            });
        });
    }
}

initSettings();

browser.runtime.sendMessage({
    action: 'update_available_keepassxc'
}).then(updateAvailableResponse);
