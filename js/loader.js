var onLoadFile = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
        try {
            console.log(evt.target.result);
        }
        catch (err) {
            var msg_div = document.createElement('div');
            msg_div.innerHTML = '<span class="error"> Error loading file ' + JSON.stringify(files[index].handler.name) + ': ' + err + '</span>';
            document.body.appendChild(msg_div);
        }
    }
};

onFileSelection = function(evt) {
    var files = evt.target.files;
    var handler = files[0];
    var reader = new FileReader();
    reader.onloadend = onLoadFile;
    reader.readAsText(handler);
};
