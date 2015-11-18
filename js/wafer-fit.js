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

var new_interp_function = function(coeff, zer_order, normalize) {
    return function(ux, uy) {
        var x = normalize(ux), y = normalize(uy);
        var s = 0;
        var r = Math.sqrt(x*x + y*y), phi = Math.atan2(y, x);
        for (var j = 1, n = 0; n <= zer_order; n++) {
            for (var m = -n; m <= n; m += 2, j++) {
                s += coeff.e(j) * zernicke(n, m, r, phi);
            }
        }
        return s;
    };
};

// Returns the number of Zernicke polynomials from 0 to order n.
var zernicke_terms = function(n) {
    return (n + 1) * (n + 2) / 2;
}

var vector_stat = function(v) {
    var n = v.dimensions();
    var s = 0, ssq = 0;
    for (var i = 1; i <= n; i++) {
        s += v.e(i);
    }
    var avg = s / n;
    for (var i = 1; i <= v.dimensions(); i++) {
        ssq += Math.pow(v.e(i) - avg, 2);
    }
    return {average: avg, variance: ssq / (n - 1)};
}

var linear_fit = function(data, y, order, normalize) {
    var X = build_zernike_model(data, order, normalize);
    var M = X.transpose().multiply(X);
    var Minv = M.inverse();
    if (Minv) {
        return { model: X, coeff: Minv.multiply(X.transpose().multiply(y)) };
    }
};

var resid_ratio = function(y, ypred) {
    var stat = vector_stat(y);
    var res_ssq = Math.pow(y.subtract(ypred).modulus(), 2) / (y.dimensions() - 1);
    return res_ssq / stat.variance;
};

var zernike_fit = function(data, y_index, normalize) {
    var y = data.col(y_index);

    var order;
    var order_best = 0, rr_best;
    for (order = 0; zernicke_terms(order) < data.rows(); order++) {
        var fit = linear_fit(data, y, order, normalize);
        if (!fit) continue;
        var ypred = fit.model.multiply(fit.coeff);
        var rr = resid_ratio(y, ypred);
        console.log(">>", order, rr);
        if (!rr_best || rr_best > rr) {
            rr_best = rr;
            order_best = order;
        }
    }
    order = order_best;
    var X = build_zernike_model(data, order, normalize);
    var y = data.col(y_index);
    var M = X.transpose().multiply(X);
    var b = M.inverse().multiply(X.transpose().multiply(y));
    var fn = new_interp_function(b, order, normalize);
    console.log("ORDER", order);
    console.log("Y", y.inspect());
    console.log("PREDICT", X.multiply(b).inspect());
    console.log("RESIDUAL:", y.subtract(X.multiply(b)).modulus());
    return fn;
}

MYAPP.zernike_fit = zernike_fit;
