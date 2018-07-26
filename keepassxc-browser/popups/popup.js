'use strict';

function status_response(r) {
    $('#initial-state').style.display = 'none';
    $('#error-encountered').style.display = 'none';
    $('#need-reconfigure').style.display = 'none';
    $('#not-configured').style.display = 'none';
    $('#configured-and-associated').style.display = 'none';
    $('#configured-not-associated').style.display = 'none';
    $('#lock-database-button').style.display = 'none';
    $('#update-available').style.display = 'none';

    if (!r.keePassXCAvailable) {
        $('#error-message').textContent = r.error;
        $('#error-encountered').style.display = 'block';
    }
    else if (r.keePassXCAvailable && r.databaseClosed) {
        $('#database-error-message').textContent = r.error;
        $('#database-not-opened').style.display = 'block';
    }
    else if (!r.configured) {
        $('#not-configured').style.display = 'block';
    }
    else if (r.encryptionKeyUnrecognized) {
        $('#need-reconfigure').style.display = 'block';
        $('#need-reconfigure-message').textContent = r.error;
    }
    else if (!r.associated) {
        $('#need-reconfigure').style.display = 'block';
        $('#need-reconfigure-message').textContent = r.error;
    }
    else if (r.error !== null) {
        $('#error-encountered').style.display = 'block';
        $('#error-message').textContent = r.error;
    }
    else {
        $('#configured-and-associated').style.display = 'block';
        $('#associated-identifier').textContent = r.identifier;
        $('#lock-database-button').style.display = 'block';
    }
}

$('#connect-button').addEventListener('click', function() {
    browser.runtime.sendMessage({
        action: 'associate'
    });
    close();
});

$('#reconnect-button').addEventListener('click', function() {
    browser.runtime.sendMessage({
        action: 'associate'
    });
    close();
});

$('#reload-status-button').addEventListener('click', function() {
    browser.runtime.sendMessage({
        action: 'reconnect'
    }).then(status_response);
});

$('#reopen-database-button').addEventListener('click', function() {
    browser.runtime.sendMessage({
        action: 'get_status',
        args: [ false, true ]    // Set forcePopup to true
    }).then(status_response);
});

$('#redetect-fields-button').addEventListener('click', function() {
    browser.tabs.query({"active": true, "currentWindow": true}).then(function(tabs) {
        if (tabs.length === 0) {
            return; // For example: only the background devtools or a popup are opened
        }
        let tab = tabs[0];

        browser.tabs.sendMessage(tab.id, {
            action: 'redetect_fields'
        });
    });
});

$('#lock-database-button').addEventListener('click', function() {
    browser.runtime.sendMessage({
        action: 'lock-database'
    }).then(status_response);
});

browser.runtime.sendMessage({
    action: "get_status"
}).then(status_response);
