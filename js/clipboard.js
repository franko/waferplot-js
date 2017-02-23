// Code from:
// http://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript

var copyTextToClipboard = function(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
}

function copyToClipboardOnKeyPress(getSelection) {
    return function(evt) {
        var c = evt.keyCode;
        var ctrlDown = evt.ctrlKey;

        // Check for ctrl+c
        // Check for Alt+Gr (http://en.wikipedia.org/wiki/AltGr_key)
        if (ctrlDown && (c===67 && !evt.altKey)) {
            copyTextToClipboard(getSelection());
            return false;
        }
    }
}
