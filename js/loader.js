var list_tonumber = function(row) {
    for (var i = 0; i < row.length; i++) {
        var x = Number(row[i]);
        if (!isNaN(x) && row[i] != "") {
            row[i] = x;
        }
    }
};

var csvReader = function(text) {
    var lines = text.split("\n");
    var i = 0;
    var next = function() {
        if (i < lines.length) {
            var row = lines[i++].replace("\r", "").split(",");
            if (row.length > 0 && row[0] !== "") {
                list_tonumber(row);
                return row;
            }
        }
    }
    return {next: next};
};

var normalize300 = function(x) { return x / 150; };

var onLoadFile = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
        try {
            var reader = csvReader(evt.target.result);
            var headers = reader.next();
            var data = [];
            for (var line = reader.next(); line; line = reader.next()) {
                data.push(line);
            }
            var dframe = DataFrame.create(data, headers);
            var fn = MYAPP.zernike_fit(dframe, 1, normalize300);
            MYAPP.load_wafer_function(fn)
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
