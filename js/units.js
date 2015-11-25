// var deltas = [1, 2, 2.5, 5, 10];
var deltas = [1, 2, 2.5, 3, 5, 6, 8, 9, 10];

var find_units = function(xmin, xmax, ndiv) {
	var xdelta = (xmax != xmin ? Math.abs(xmax - xmin) : 1);
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
	return deltas[i] * p;
};

MYAPP.scale_units = find_units;
