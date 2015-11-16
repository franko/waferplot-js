var fact_gen = function(n, a) {
    if (n <= 1) {
        return a;
    } else {
        return fact_gen(n - 1, n * a);
    }
};

var fact = function(n) { return fact_gen(n, 1); };
var invf = function(n) { return (n >= 0 ? 1 / fact_gen(n, 1) : 0); };

var sign = function(n) { return (n % 2 == 0 ? 1 : -1); };

var zerR = function(n, m, p) {
    if ((n - m) % 2 != 0) return 0;
    var ip = (n+m)/2, im = (n-m)/2;
    var z = 0;
    for (var k = 0; k <= im; k++) {
        var f = fact(n-k) * (invf(k) * invf(ip-k) * invf(im-k));
        if (f > 0) {
            z = z + sign(k) * f * Math.pow(p, n - 2*k);
        }
    }
    return z;
};

var zernicke = function (n, m, p, phi) {
    var pf = (m >= 0 ? Math.cos(m*phi) : Math.sin(-m*phi));
    return zerR(n, m, p) * pf;
};

var build_zernike_model = function(ms, zer_order, normalize) {
    var N = ms.rows();
    var x_index = ms.colIndexOf("x"), y_index = ms.colIndexOf("y");
    var Xdata = [];
    for (var i = 1; i <= N; i++) {
        var j = 0;
        var x = normalize(ms.e(i, x_index)), y = normalize(ms.e(i, y_index));
        var r = Math.sqrt(x*x + y*y), phi = Math.atan2(y, x);
        var Xrow = [];
        for (var n = 0; n <= zer_order; n++) {
            for (var m = -n; m <= n; m += 2, j++) {
                Xrow[j] = zernicke(n, m, r, phi);
            }
        }
        Xdata[i-1] = Xrow;
    }
    return Matrix.create(Xdata);
}
