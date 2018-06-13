var assert = require('assert'),
    rewire = require('rewire');

var BG_URL = '../keepassxc-browser/background/';

// Unit tests
describe('Unit tests with background/keepass.js', function() {
    it('Test error message handling', function() {
        var keepass = rewire(BG_URL + 'keepass.js');
        var kpErrors = keepass.__get__('kpErrors');
        var page = keepass.__get__('page');
        var tab = {id:0};

        keepass.handleError(tab, 123, 'A manually set error message');
        assert.equal(page.tabs[tab.id].errorMessage, 'A manually set error message');

        keepass.handleError(tab, kpErrors.CANNOT_DECRYPT_MESSAGE);
        assert.equal(page.tabs[tab.id].errorMessage, kpErrors.errorMessages[kpErrors.CANNOT_DECRYPT_MESSAGE].msg);

        keepass.handleError(tab, kpErrors.EMPTY_MESSAGE_RECEIVED);
        assert.equal(page.tabs[tab.id].errorMessage, kpErrors.errorMessages[kpErrors.EMPTY_MESSAGE_RECEIVED].msg);
    });

    it('Test nonce incrementation', function() {
        var keepass = rewire(BG_URL + 'keepass.js');
        var nacl = rewire(BG_URL + 'nacl.min.js');
        nacl.util = rewire(BG_URL + 'nacl-util.min.js');

        var nonce = keepass.getNonce();
        var incrementedNonce = keepass.incrementedNonce(nonce);
        nonce = nacl.util.decodeBase64(nonce);
        incrementedNonce = nacl.util.decodeBase64(incrementedNonce);
        assert.equal(nonce[0]+1, incrementedNonce[0]);
    });
});