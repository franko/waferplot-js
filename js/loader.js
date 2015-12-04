MYAPP = {};

var current_choice;
var current_fx;

var lookup_fx_section = function(fx, choice) {
    for (var i = 0; i < fx.measSections.length; i++) {
        var section = fx.measSections[i];
        var match = true;
        for (var key in choice) {
            if (!section.info[key] || String(section.info[key]) !== choice[key]) {
                match = false;
                break;
            }
        }
        if (match) {
            return section.table;
        }
    }
}

on_parameter_value = function(fx, choice) {
    var select = document.getElementById("param_select");
    var option = select.options[select.selectedIndex];
    var dataset = lookup_fx_section(fx, choice);
    var plotting_columns = {x: dataset.colIndexOf("X"), y: dataset.colIndexOf("Y"), z: dataset.colIndexOf(option.value)};
    if (dataset) {
        if (plotting_columns.z > 0) {
            load_dataset(dataset, plotting_columns);
        }
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
        var hcase = head.toUpperCase();
        if (hcase === "X" || hcase === "Y" || hcase === "SITE") continue;
        var option = document.createElement("option");
        option.setAttribute("value", head);
        option.text = head;
        select.add(option);
    }
};

var normalize300 = function(x) { return x / 150; };

var load_dataset = function(data, plotting_columns) {
    var tps_param = {regularization: 0.001, plotting_columns: plotting_columns, normalize: normalize300};
    var fit = MYAPP.tps_fit(data, tps_param);
    MYAPP.load_wafer_function(fit.eval, fit.eval_normal, data, plotting_columns);
};

var load_data_section = function(fx, choice) {
    var dataset = lookup_fx_section(fx, choice);
    populate_param_select(dataset);
    on_parameter_value(fx, choice);
};

var remove_div_childs = function(div) {
    while (div.firstChild) {
        div.removeChild(div.firstChild);
    }
}

var populate_meas_selects = function(fx) {
    var occur = {};
    for (var i = 0; i < fx.measSections.length; i++) {
        var section = fx.measSections[i];
        for (var key in section.info) {
            if (section.info.hasOwnProperty(key)) {
                var value = section.info[key];
                if (!occur[key]) { occur[key] = []; }
                if (occur[key].indexOf(value) < 0) {
                    occur[key].push(value);
                }
            }
        }
    }
    var select_div = document.getElementById("select_meas_div");
    remove_div_childs(select_div);
    current_choice = {};
    for (var key in occur) {
        if (occur[key].length <= 1) continue;
        var select = document.createElement("select");
        select.setAttribute("id", "meas_select_" + key);
        for (var i = 0; i < occur[key].length; i++) {
            var entry = occur[key][i];
            var option = document.createElement("option");
            option.setAttribute("value", entry);
            option.text = entry;
            select.add(option);
        }
        var handler_gen = function(xkey, xselect) {
            return function() {
                current_choice[xkey] = xselect.options[xselect.selectedIndex].value;
                load_data_section(fx, current_choice);
            };
        };
        var on_change = handler_gen(key, select);
        select.addEventListener("change", on_change);
        current_choice[key] = select.options[select.selectedIndex].value;
        select_div.appendChild(select);
    }
    load_data_section(fx, current_choice);
};

var onLoadFile = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
        current_fx = new FXParser(evt.target.result);
        var time = current_fx.readDateTime();
        var meas_info = {tool: "Tool A", time: time};
        current_fx.readAll(meas_info);
        populate_meas_selects(current_fx);
    }
};

onFileSelection = function(evt) {
    var files = evt.target.files;
    var handler = files[0];
    var reader = new FileReader();
    reader.onloadend = onLoadFile;
    reader.readAsText(handler);
};


MYAPP.on_parameter = function() { on_parameter_value(current_fx, current_choice); };
