'use strict';

const kpxcEvent = {};

kpxcEvent.onMessage = function(request, sender, response) {
    return new Promise(resolve => {
        if (request.action in kpxcEvent.messageHandlers) {
            //console.log('onMessage(' + request.action + ') for #' + sender.tab.id);
            if (!sender.hasOwnProperty('tab') || sender.tab.id < 1) {
                sender.tab = {};
                sender.tab.id = page.currentTabId;
            }

            //kpxcEvent.invoke(kpxcEvent.messageHandlers[request.action], callback, sender.tab.id, request.args);

            // Test
            if (!page.tabs[sender.tab.id]) {
                page.createTabEntry(sender.tab.id);
            }

            // remove information from no longer existing tabs
            page.removePageInformationFromNotExistingTabs();

            if (!page.tabs[sender.tab.id]) {
                page.createTabEntry(sender.tab.id);
            }

            request.args = request.args || [];
            //resolve(kpxcEvent.messageHandlers[request.action](sender.tab, request.args));
            request.args.unshift(sender.tab);
            resolve(kpxcEvent.messageHandlers[request.action].apply(this, request.args));

            // onMessage closes channel for callback automatically
            // if this method does not return true
            /*if (callback !== undefined) {
                return true;
            }*/
        }
    });
};

/**
 * Get interesting information about the given tab.
 * Function adapted from AdBlock-Plus.
 *
 * @param {function} handler to call after invoke
 * @param {function} callback to call after handler or null
 * @param {integer} senderTabId
 * @param {array} args
 * @param {bool} secondTime
 * @returns null (asynchronous)
 */
kpxcEvent.invoke = function(handler, callback, senderTabId, args, secondTime) {
    if (senderTabId < 1) {
        return;
    }

    if (!page.tabs[senderTabId]) {
        page.createTabEntry(senderTabId);
    }

    // remove information from no longer existing tabs
    page.removePageInformationFromNotExistingTabs();

    browser.tabs.get(senderTabId).then((tab) => {
        if (!tab) {
            return;
        }

        if (!tab.url) {
            // Issue 6877: tab URL is not set directly after you opened a window
            // using window.open()
            if (!secondTime) {
                window.setTimeout(function() {
                    kpxcEvent.invoke(handler, callback, senderTabId, args, true);
                }, 250);
            }
            return;
        }

        if (!page.tabs[tab.id]) {
            page.createTabEntry(tab.id);
        }

        args = args || [];

        args.unshift(tab);
        args.unshift(callback);

        if (handler) {
            handler.apply(this, args);
        }
        else {
            console.log('undefined handler for tab ' + tab.id);
        }
    }).catch((e) => {
        console.log(e);
    });
};

kpxcEvent.onShowNotification = function(tab, message) {
    return new Promise(resolve => {
        if (page.settings.showNotifications) {
            showNotification(message);
        }
        resolve();
    });
};

kpxcEvent.showStatus = function(configured, tab) {
    return new Promise(resolve => {
        let keyId = null;
        if (configured) {
            keyId = keepass.keyRing[keepass.databaseHash].id;
        }

        browserAction.showDefault(null, tab);
        const errorMessage = page.tabs[tab.id].errorMessage;
        resolve({
            identifier: keyId,
            configured: configured,
            databaseClosed: keepass.isDatabaseClosed,
            keePassXCAvailable: keepass.isKeePassXCAvailable,
            encryptionKeyUnrecognized: keepass.isEncryptionKeyUnrecognized,
            associated: keepass.isAssociated(),
            error: errorMessage ? errorMessage : null
        });
    });
};

kpxcEvent.onLoadSettings = function(tab) {
    return new Promise(resolve => {
        page.initSettings().then((settings) => {
            resolve(settings);
        }, (err) => {
            console.log('error loading settings: ' + err);
        });
    });
};

kpxcEvent.onLoadKeyRing = function(tab) {
    return new Promise(resolve => {
        browser.storage.local.get({'keyRing': {}}).then(function(item) {
            keepass.keyRing = item.keyRing;
            if (keepass.isAssociated() && !keepass.keyRing[keepass.associated.hash]) {
                keepass.associated = {
                    "value": false,
                    "hash": null
                };
            }
            resolve(item.keyRing);
        }, (err) => {
            console.log('error loading keyRing: ' + err);
        });
    });
};

kpxcEvent.onSaveSettings = function(tab, settings) {
    return new Promise(resolve => {
        browser.storage.local.set({'settings': settings}).then(function() {
            kpxcEvent.onLoadSettings(tab);
            resolve();
        });
    });
};

kpxcEvent.onGetStatus = function(tab, internalPoll = false, triggerUnlock = false) {
    return new Promise(resolve => {
        // When internalPoll is true the event is triggered from content script in intervals -> don't poll KeePassXC
        if (!internalPoll) {
            keepass.testAssociation((response) => {
                if (!response) {
                    resolve(kpxcEvent.showStatus(false, tab));
                }

                keepass.isConfigured().then((configured) => {
                    resolve(kpxcEvent.showStatus(configured, tab));
                });
            }, tab, true, triggerUnlock);
        } else {
            keepass.isConfigured().then((configured) => {
                resolve(kpxcEvent.showStatus(configured, tab));
            });
        }
    });
};

kpxcEvent.onReconnect = function(tab) {
    return new Promise(resolve => {
        keepass.connectToNative();

        // Add a small timeout after reconnecting. Just to make sure. It's not pretty, I know :(
        setTimeout(() => {
            keepass.reconnect(callback, tab).then((configured) => {
                browser.tabs.sendMessage(tab.id, {
                    action: 'redetect_fields'
                });
                kpxcEvent.showStatus(configured, tab, callback);
                resolve();
            });
        }, 500);
    });
};

kpxcEvent.lockDatabase = function(tab) {
    return new Promise(resolve => {
        keepass.lockDatabase(tab).then((response => {
            kpxcEvent.showStatus(true, tab, callback);
            resolve();
        }));
    });
};

kpxcEvent.onPopStack = function(tab) {
    browserAction.stackPop(tab.id);
    browserAction.show(null, tab);
};

kpxcEvent.onGetTabInformation = function(tab) {
    return new Promise(resolve => {
        const id = tab.id || page.currentTabId;
        resolve(page.tabs[id]);
    });
};

kpxcEvent.onGetConnectedDatabase = function(tab) {
    return new Promise(resolve => {
        resolve({
            count: Object.keys(keepass.keyRing).length,
            identifier: (keepass.keyRing[keepass.associated.hash]) ? keepass.keyRing[keepass.associated.hash].id : null
        });
    });
};

kpxcEvent.onGetKeePassXCVersions = function(tab) {
    return new Promise(resolve => {
        if(keepass.currentKeePassXC.version == 0) {
            keepass.getDatabaseHash((res) => {
                resolve({"current": keepass.currentKeePassXC.version, "latest": keepass.currentKeePassXC.version});
            }, tab);
        } else {
            resolve({"current": keepass.currentKeePassXC.version, "latest": keepass.currentKeePassXC.version});
        }
    });
};

kpxcEvent.onCheckUpdateKeePassXC = function(tab) {
    return new Promise(resolve => {
        keepass.checkForNewKeePassXCVersion();
        resolve({current: keepass.currentKeePassXC.version, latest: keepass.latestKeePassXC.version});
    });
};

kpxcEvent.onUpdateAvailableKeePassXC = function(tab) {
    return new Promise(resolve => {
        resolve(keepass.keePassXCUpdateAvailable());
    });
};

kpxcEvent.onRemoveCredentialsFromTabInformation = function(tab) {
    const id = tab.id || page.currentTabId;
    page.clearCredentials(id);
};

kpxcEvent.onSetRememberPopup = function(tab, username, password, url, usernameExists, credentialsList) {
    return new Promise(resolve => {
        keepass.testAssociation((response) => {
            if (response) {
                keepass.isConfigured().then((configured) => {
                    if (configured) {
                        browserAction.setRememberPopup(tab.id, username, password, url, usernameExists, credentialsList);
                    }
                }).catch((e) => {
                    console.log(e);
                });
                resolve();
            }
        }, tab);
    });
};

kpxcEvent.onLoginPopup = function(tab, logins) {
    return new Promise(resolve => {
        let stackData = {
            level: 1,
            iconType: 'questionmark',
            popup: 'popup_login.html'
        };
        browserAction.stackUnshift(stackData, tab.id);
        page.tabs[tab.id].loginList = logins;
        browserAction.show(null, tab);
        resolve();
    });
};

kpxcEvent.initHttpAuth = function() {
    return new Promise(resolve => {
        httpAuth.init();
        resolve();
    });
}

kpxcEvent.onHTTPAuthPopup = function(tab, data) {
    return new Promise(resolve => {
        let stackData = {
            level: 1,
            iconType: 'questionmark',
            popup: 'popup_httpauth.html'
        };
        browserAction.stackUnshift(stackData, tab.id);
        page.tabs[tab.id].loginList = data;
        browserAction.show(null, tab);
        resolve();
    });
};

kpxcEvent.onMultipleFieldsPopup = function(tab) {
    return new Promise(resolve => {
        let stackData = {
            level: 1,
            iconType: 'normal',
            popup: 'popup_multiple-fields.html'
        };
        browserAction.stackUnshift(stackData, tab.id);
        browserAction.show(null, tab);
        resolve();
    });
};

kpxcEvent.pageClearLogins = function(tab, alreadyCalled) {
    return new Promise(resolve => {
        if (!alreadyCalled) {
            page.clearLogins(tab.id);
        }
        resolve();
    });
};

kpxcEvent.pageGetLoginId = function(tab) {
    return new Promise(resolve => {
        resolve(page.loginId);
    });
};

kpxcEvent.pageSetLoginId = function(tab, loginId) {
    return new Promise(resolve => {
        page.loginId = loginId;
        resolve();
    });
};

// all methods named in this object have to be declared BEFORE this!
kpxcEvent.messageHandlers = {
    'add_credentials': keepass.addCredentials,
    'associate': keepass.associate,
    'check_update_keepassxc': kpxcEvent.onCheckUpdateKeePassXC,
    'generate_password': keepass.generatePassword,
    'get_connected_database': kpxcEvent.onGetConnectedDatabase,
    'get_keepassxc_versions': kpxcEvent.onGetKeePassXCVersions,
    'get_status': kpxcEvent.onGetStatus,
    'get_tab_information': kpxcEvent.onGetTabInformation,
    'init_http_auth': kpxcEvent.initHttpAuth,
    'load_keyring': kpxcEvent.onLoadKeyRing,
    'load_settings': kpxcEvent.onLoadSettings,
    'lock-database': kpxcEvent.lockDatabase,
    'page_clear_logins': kpxcEvent.pageClearLogins,
    'page_get_login_id': kpxcEvent.pageGetLoginId,
    'page_set_login_id': kpxcEvent.pageSetLoginId,
    'pop_stack': kpxcEvent.onPopStack,
    'popup_login': kpxcEvent.onLoginPopup,
    'popup_multiple-fields': kpxcEvent.onMultipleFieldsPopup,
    'reconnect': kpxcEvent.onReconnect,
    'remove_credentials_from_tab_information': kpxcEvent.onRemoveCredentialsFromTabInformation,
    'retrieve_credentials': keepass.retrieveCredentials,
    'show_default_browseraction': browserAction.showDefault,
    'update_credentials': keepass.updateCredentials,
    'save_settings': kpxcEvent.onSaveSettings,
    'set_remember_credentials': kpxcEvent.onSetRememberPopup,
    'show_notification': kpxcEvent.onShowNotification,
    'stack_add': browserAction.stackAdd,
    'update_available_keepassxc': kpxcEvent.onUpdateAvailableKeePassXC
};
