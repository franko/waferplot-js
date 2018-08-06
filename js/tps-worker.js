/*
** Thin Plate Spline implementation.
** Copyright (C) 2015 Francesco Abbate. See Copyright Notice in waferplot.js
**
** Based on the Jarno Elonen's article:
** "Thin Plate Spline editor - an example program in C++""
** from: http://elonen.iki.fi/code/tpsdemo/index.html.
*/

importScripts('lalolib-matrix-solve.js');

var tps_radial = function(r) {
    return (r <= 0 ? 0 : r*r*Math.log(r));
};

var normalize_fn = function(disk) {
    var ir = disk.inv_radius;
    return function(x, y) { return [(x - disk.x) * ir, (y - disk.y) * ir]; };
};

onmessage = function(e) {
    var data = e.data.data, param = e.data.parameters;
    var N = data.length; // Number of rows.

    if (N <= 3) {
        throw "not enough points";
    }

    var xindex = param.plotting_columns.x, yindex = param.plotting_columns.y;
    var zindex = param.plotting_columns.z;
    var cpdata = [];
    var norm = normalize_fn(param.disk);
    for (var i = 0; i < N; i++) {
        cpdata[i] = norm(data[i][xindex - 1], data[i][yindex - 1]);
    }

    var Ld = new lalolib.Matrix(N+3, N+3);
    var Vd = new Float64Array(N+3);
    var a = 0;
    for (var i = 0; i < N; i++) {
        for (var j = i+1; j < N; j++) {
            var xi = cpdata[i][0], yi = cpdata[i][1];
            var xj = cpdata[j][0], yj = cpdata[j][1];
            var elen = Math.sqrt((xi - xj)*(xi - xj) + (yi - yj)*(yi - yj));
            var Ueval = tps_radial(elen);
            Ld.set(i, j, Ueval);
            Ld.set(j, i, Ueval);
            a += elen * 2;
        }
    }
    a /= N*N;

    var regularization = param.regularization;
    for (var i = 0; i < N; i++) {
        Ld.set(i,i, regularization * (a*a));

        Ld.set(i, N+0, 1);
        Ld.set(i, N+1, cpdata[i][0]);
        Ld.set(i, N+2, cpdata[i][1]);

        Ld.set(N+0, i, 1);
        Ld.set(N+1, i, cpdata[i][0]);
        Ld.set(N+2, i, cpdata[i][1]);
    }

    for (var i = 0; i < N; i++) {
        Vd[i] = data[i][zindex - 1];
    }
    Vd[N+0] = 0;
    Vd[N+1] = 0;
    Vd[N+2] = 0;

    var w_array = lalolib.solveGaussianElimination(Ld, Vd);
    if (!w_array) {
        throw "bad points distribution";
    }
    var w_js_array = [];
    for (var i = 0; i < N+3; i++) {
        if (!isFinite(w_array[i])) {
            throw "bad points distribution";
        }
        w_js_array.push(w_array[i]);
    }
    postMessage({coefficients: w_js_array, control_points: cpdata});
};
