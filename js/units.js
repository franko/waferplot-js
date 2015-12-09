/*
** Find plotting scale units.
** Copyright (C) 2015 Francesco Abbate. See Copyright Notice in waferplot.js
*/

// var deltas = [1, 2, 2.5, 5, 10];
var deltas = [1, 2, 2.5, 3, 5, 6, 8, 9, 10];
var deltas_offset = [0, 0, 1, 0, 0, 0, 0, 0, -1];

var floor_log = function(x) { return Math.floor(Math.log10(x)); };

var find_units = function(xmin, xmax, ndiv) {
	var xdelta = Math.abs(xmax - xmin);
	if (xdelta < 1.0e-48) xdelta = 1;
	var dx = xdelta / ndiv;
	var plog = floor_log(dx);
	var p = Math.pow(10, plog);
	var dxnorm = (dx * 1.05) / p;
	var i;
	var bestdiv;
	for (i = 0; i < deltas.length - 1; i++) {
		var div = deltas[i] * p;
		var idiv = Math.ceil(xmax / div) - Math.floor(xmin / div);
		if (idiv <= ndiv) break;
	}
	var min_plog = plog - deltas_offset[i];
	var max_plog = floor_log(xmax) + 1;
	var digits = max_plog - (min_plog < 0 ? min_plog : 0);
	var format = function(x) {
		var xlog = floor_log(x) + 1;
		return x.toPrecision(digits - (xlog < max_plog ? max_plog - xlog : 0));
	}
	return { div: deltas[i] * p, format: format };
};

MYAPP.scale_units = find_units;
