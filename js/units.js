// var deltas = [1, 2, 2.5, 5, 10];
var deltas = [1, 2, 2.5, 3, 5, 6, 8, 9, 10];
var deltas_offset = [0, 0, 1, 0, 0, 0, 0, 0, -1];

var find_units = function(xmin, xmax, ndiv) {
	var xdelta = Math.abs(xmax - xmin);
	if (xdelta < 1.0e-48) xdelta = 1;
	var dx = xdelta / ndiv;
	var plog = Math.floor(Math.log10(dx));
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
	var max_plog = Math.floor(Math.log10(xmax)) + 1;
	var digits = max_plog - (min_plog < 0 ? min_plog : 0);
	return { div: deltas[i] * p, digits: digits };
};

MYAPP.scale_units = find_units;
