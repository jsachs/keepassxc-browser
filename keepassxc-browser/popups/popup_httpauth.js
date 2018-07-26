'use strict';

const getLoginData = function() {
    return new Promise((resolve, reject) => {
        browser.runtime.getBackgroundPage().then((global) => {
            browser.tabs.query({'active': true, 'currentWindow': true}).then((tabs) => {
                resolve(global.page.tabs[tabs[0].id].loginList);
            });
        });
    });
};

getLoginData().then((data) => {
    let ll = document.getElementById('login-list');
    for (let i = 0; i < data.logins.length; ++i) {
        const a = document.createElement('a');
        a.setAttribute('class', 'list-group-item');
        a.textContent = data.logins[i].login + " (" + data.logins[i].name + ")";
        a.setAttribute('login', data.logins[i].login);
        a.setAttribute('password', data.logins[i].password);
        a.addEventListener('click', function (e) {
            if (data.resolve) {
                data.resolve({
                    authCredentials: {
                        username: e.currentTarget.getAttribute('login'),
                        password: e.currentTarget.getAttribute('password')
                    }
                });
            }
            close();
        });
        ll.appendChild(a);
    }
});

$('#lock-database-button').addEventListener('click', function() {
    browser.runtime.sendMessage({
        action: 'lock-database'
    }).then(status_response);
});

$('#btn-dismiss').addEventListener('click', function() {
    getLoginData().then((data) => {
        // Using reject won't work with every browser. So return empty credentials instead.
        if (data.resolve) {
            data.resolve({
                authCredentials: {
                    username: '',
                    password: ''
                }
            });
        }
        close();
    });
});
