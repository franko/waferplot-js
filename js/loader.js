MYAPP = {};

var current_dataset;

MYAPP.on_parameter = function() {
    var select = document.getElementById("param_select");
    var option = select.options[select.selectedIndex];
    var index = current_dataset.headers.indexOf(option.value);
    if (current_dataset && index >= 0) {
        load_dataset(current_dataset, index + 1);
    }
};

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

var read_csv_file = function(text) {
    var reader = csvReader(text);
    var headers = reader.next();
    var data = [];
    for (var line = reader.next(); line; line = reader.next()) {
        data.push(line);
    }
    return DataFrame.create(data, headers);
};

var populate_param_select = function(data) {
    var select = document.getElementById("param_select");
    for (var i = select.length - 1; i >= 0; i--) {
        select.remove(i);
    }
    for (var i = 0; i < data.headers.length; i++) {
        var head = data.headers[i];
        var head_case = head.toUpperCase();
        if (head_case === "X" || head_case === "Y") continue;
        var option = document.createElement("option");
        option.setAttribute("value", head);
        option.text = head;
        select.add(option);
    }
};

var normalize300 = function(x) { return x / 150; };

var load_dataset = function(data, zindex) {
    var tps_param = {regularization: 0.001, zindex: zindex, normalize: normalize300};
    var fit = MYAPP.tps_fit(data, tps_param);
    MYAPP.load_wafer_function(fit.eval, fit.eval_normal, data);
};

var onLoadFile = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
        current_dataset = read_csv_file(evt.target.result);
        populate_param_select(current_dataset);
        MYAPP.on_parameter();
    }
};

onFileSelection = function(evt) {
    var files = evt.target.files;
    var handler = files[0];
    var reader = new FileReader();
    reader.onloadend = onLoadFile;
    reader.readAsText(handler);
};
