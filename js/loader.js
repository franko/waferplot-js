/*
** Data loading and HTML generation.
** Copyright (C) 2015 Francesco Abbate. See Copyright Notice in waferplot.js
*/

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
    MYAPP.loader_start();

    var select = document.getElementById("param_select");
    var option = select.options[select.selectedIndex];
    var dataset = lookup_fx_section(fx, choice);
    var xindex = dataset.colIndexOf("X") > 0 ? dataset.colIndexOf("X") : dataset.colIndexOf("x");
    var yindex = dataset.colIndexOf("Y") > 0 ? dataset.colIndexOf("Y") : dataset.colIndexOf("y");
    if (xindex <= 0 || yindex <= 0) throw "data is missing X, Y columns";
    var plotting_columns = {x: xindex, y: yindex, z: dataset.colIndexOf(option.value)};
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

var norm2 = function(x, y) {
    return Math.sqrt(x*x + y*y);
}

var round_up = function(value, div) {
    return div * Math.ceil(value / div);
}

/* Find a circular region that contains the all the (X, Y) coordinates
   of the dataset. The center coordinates and radius of the circle are
   rounded. */
var dataset_find_region = function(data, columns) {
    var N = data.rows();
    var min_x = data.e(1, columns.x), min_y = data.e(1, columns.y);
    var max_x = min_x, max_y = min_y;
    for (var i = 2; i <= N; i++) {
        var x = data.e(i, columns.x), y = data.e(i, columns.y);
        if (x < min_x) min_x = x;
        if (x > max_x) max_x = x;
        if (y < min_y) min_y = y;
        if (y > max_y) max_y = y;
    }
    var units = MYAPP.scale_units(Math.max(min_x, min_y), Math.max(max_x, max_y), 12);

    /* First evaluate center based on mix / max values. */
    var center_x = (min_x + max_x) / 2, center_y = (min_y + max_y) / 2;
    var cdist = norm2(center_x, center_y);
    var rrad = norm2(max_x - min_x, max_y - min_y);
    var CENTER_TO_RADIUS_SUPRESS_RATIO = 1;
    if (cdist < CENTER_TO_RADIUS_SUPRESS_RATIO * rrad) {
        /* In this case the center norm is small compared to the
           region approx radius. Set center to (0, 0). */
        center_x = 0;
        center_y = 0;
    }
    /* Now compute the radius with the final center coordinates. */
    var radius = 0;
    for (var i = 1; i <= N; i++) {
        var x = data.e(i, columns.x), y = data.e(i, columns.y);
        var r = norm2(x - center_x, y - center_y);
        if (r > radius) radius = r;
    }
    var inv_radius = 1 / round_up(radius, units.div);
    return {x: center_x, y: center_y, inv_radius: inv_radius};
};

var report_error_and_stop = function(context, error_message) {
    MYAPP.report_error(context, error_message);
    MYAPP.loader_stop();
};

var load_dataset = function(data, plotting_columns) {
    var disk = dataset_find_region(data, plotting_columns);
    var norm = function(x, y) {
        return [(x - disk.x) * disk.inv_radius, (y - disk.y) * disk.inv_radius];
    };
    var tps_param = {regularization: 0.001, plotting_columns: plotting_columns, disk: disk};
    var tps_worker = new Worker('js/tps-worker.js');
    tps_worker.onmessage = function(e) {
        var eval_fn = tps_interpolation_fn(e.data.coefficients, e.data.control_points, norm);
        var eval_normal_fn = tps_interpolation_normal_fn(e.data.coefficients, e.data.control_points, norm);
        MYAPP.load_wafer_function(eval_fn, eval_normal_fn, data, plotting_columns, norm);
        MYAPP.loader_stop();
    }
    tps_worker.onerror = function(e) {
        report_error_and_stop("creating model", e.message);
    };
    tps_worker.postMessage({data: data.elements, parameters: tps_param});
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
};

var load_data_text = function(text) {
    MYAPP.clear_error_messages();

    try {
        var fx = new FXParser(text);
        if (fx.matchSfxFormat()) {
            var time = fx.readDateTime();
            var meas_info = {tool: "Tool A", time: time};
            fx.readAll(meas_info);
        } else {
            var warn_fn = function (index, row) {
                MYAPP.report_warning("on input data", "excluding invalid data in row " + index + " [" + row.join(",") + "]");
            };
            fx.readTabularFormat(warn_fn);
        }
        populate_meas_selects(fx);
    } catch (err) {
        report_error_and_stop("importing data", err);
    }

    try {
        load_data_section(fx, current_choice);
    } catch (err) {
        report_error_and_stop("creating model", err);
    }
};

var onLoadFile = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
        load_data_text(evt.target.result);
    }
};

var on_file_selection = function(evt) {
    var files = evt.target.files;
    var handler = files[0];
    var reader = new FileReader();
    reader.onloadend = onLoadFile;
    reader.readAsText(handler);
};

MYAPP.load_data_text = load_data_text;

document.getElementById('file-select').addEventListener('change', on_file_selection, false);

var tps_radial = function(r) {
    return (r <= 0 ? 0 : r*r*Math.log(r));
};

var tps_radial_der = function(r) {
    return r*(1 + 2 * Math.log(r));
};

var tps_interpolation_fn = function(w, control_points, normalize) {
    return function(xr, yr) {
        var coord = normalize(xr, yr);
        var x = coord[0], y = coord[1];
        var N = control_points.length;
        var h = w[N] + x * w[N+1] + y * w[N+2];
        for (var i = 0; i < N; i++) {
            var xi = control_points[i][0], yi = control_points[i][1];
            var elen = Math.sqrt((xi - x)*(xi - x) + (yi - y)*(yi - y));
            h += w[i] * tps_radial(elen);
        }
        return h;
    };
};

var tps_interpolation_normal_fn = function(w, control_points, normalize) {
    return function(xr, yr) {
        var coord = normalize(xr, yr);
        var x = coord[0], y = coord[1];
        var N = control_points.length;
        var dzdx = w[N+1], dzdy = w[N+2];
        for (var i = 0; i < N; i++) {
            var xi = control_points[i][0], yi = control_points[i][1];
            var r = Math.sqrt((xi - x)*(xi - x) + (yi - y)*(yi - y));
            var dudr = tps_radial_der(r);
            if (r > 0) {
                dzdx += w[i] * dudr * (x - xi) / r;
                dzdy += w[i] * dudr * (y - yi) / r;
            }
        }
        var dcoord1 = normalize(1, 1), dcoord0 = normalize(0, 0);
        dzdx *= dcoord1[0] - dcoord0[0];
        dzdy *= dcoord1[1] - dcoord0[1];
        var nf = Math.sqrt(1 + dzdx*dzdx + dzdy*dzdy);
        return new THREE.Vector3(-dzdx / nf, -dzdy / nf, 1 / nf);
    };
};
