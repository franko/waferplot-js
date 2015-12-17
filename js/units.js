/*
** Find plotting scale units.
** Copyright (C) 2015 Francesco Abbate. See Copyright Notice in waferplot.js
*/

// var deltas = [1, 2, 2.5, 5, 10];
var deltas = [1, 2, 2.5, 3, 5, 6, 8, 9, 10];
var deltas_offset = [0, 0, 1, 0, 0, 0, 0, 0, -1];

var floor_log = function(x) { return Math.floor(Math.log10(Math.abs(x))); };

var find_units = function(xmin, xmax, ndiv) {
	var xdelta = Math.abs(xmax - xmin);
	if (xdelta < 1.0e-48) xdelta = 1;
	var dx = xdelta / ndiv;
	var plog = floor_log(dx);
	var p = Math.pow(10, plog);
	var dxnorm = (dx * 1.05) / p;
	for (var i = 0; i < deltas.length - 1; i++) {
		var div = deltas[i] * p;
		var idiv = Math.ceil(xmax / div) - Math.floor(xmin / div);
		if (idiv <= ndiv) break;
	}
	var min_plog = Math.min(plog - deltas_offset[i], 0);
	var format = function(x) {
		var xlog = floor_log(x !== 0 ? x : 1) + 1;
		return x.toPrecision(xlog - min_plog);
	}
	return { div: deltas[i] * p, format: format };
};

MYAPP.scale_units = find_units;
