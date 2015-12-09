MYAPP = {};

var current_choice;
var current_parameter;

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
    current_parameter = option.value;
};

var populate_param_select = function(data) {
    var select = document.getElementById("param_select");
    for (var i = select.length - 1; i >= 0; i--) {
        select.remove(i);
    }
    var iselect = 0, k;
    for (var i = 0, k = 0; i < data.headers.length; i++) {
        var head = data.headers[i];
        var hcase = head.toUpperCase();
        if (hcase === "X" || hcase === "Y" || hcase === "SITE") continue;
        var option = document.createElement("option");
        option.setAttribute("value", head);
        option.text = head;
        select.add(option);
        if (current_parameter && current_parameter === head) {
            iselect = k;
        }
        k += 1;
    }
    select.selectedIndex = iselect;
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

var create_select = function(options_list, id) {
    var select = document.createElement("select");
    select.setAttribute("id", id);
    for (var i = 0; i < options_list.length; i++) {
        var entry = options_list[i];
        var option = document.createElement("option");
        option.setAttribute("value", entry);
        option.text = entry;
        select.add(option);
    }
    return select;
}

var select_terms = ["SLOT", "RECIPE", "MEAS SET", "SITE"];

var append_td_with_child = function(tr, child) {
    var td = document.createElement("td");
    td.appendChild(child);
    tr.appendChild(td);
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

    current_choice = {};

    var select_div = document.getElementById("select_meas_div");
    remove_div_childs(select_div);

    var table = document.createElement("table");
    var thead = document.createElement("thead");
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    table.appendChild(tbody);
    select_div.appendChild(table);

    var occur_keys = [];
    for (var key in occur) {
        if (select_terms.indexOf(key) < 0) continue;
        occur_keys.push(key);
    }

    var tr = document.createElement("tr");
    for (var i = 0; i < occur_keys.length; i++) {
        var th = document.createElement("th");
        th.innerHTML = occur_keys[i];
        tr.appendChild(th);
    }
    var th = document.createElement("th");
    th.innerHTML = "Parameter";
    tr.appendChild(th);
    thead.appendChild(tr);

    var handler_gen = function(xkey, xselect) {
        return function() {
            current_choice[xkey] = xselect.options[xselect.selectedIndex].value;
            load_data_section(fx, current_choice);
        };
    };

    tr = document.createElement("tr");
    for (var k = 0; k < occur_keys.length; k++) {
        var key = occur_keys[k];

        var select = create_select(occur[key], "meas_select_" + key);
        select.addEventListener("change", handler_gen(key, select));
        current_choice[key] = select.options[select.selectedIndex].value;

        append_td_with_child(tr, select);
    }

    var param_select = document.createElement("select");
    param_select.setAttribute("id", "param_select");
    param_select.addEventListener("change", function() { on_parameter_value(fx, current_choice); });
    append_td_with_child(tr, param_select);

    tbody.appendChild(tr);
    load_data_section(fx, current_choice);
};

var onLoadFile = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
        var fx = new FXParser(evt.target.result);
        var time = fx.readDateTime();
        var meas_info = {tool: "Tool A", time: time};
        fx.readAll(meas_info);
        populate_meas_selects(fx);
    }
};

onFileSelection = function(evt) {
    var files = evt.target.files;
    var handler = files[0];
    var reader = new FileReader();
    reader.onloadend = onLoadFile;
    reader.readAsText(handler);
};
