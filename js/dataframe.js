/* TODO list:
   IMPORTANT THINGS:
   - introduce coherent naming convetions for factors & co to clarify usage
   - comments each functions
   - put linear estimate functions in a specific namespace

   MINOR:
   - when factors specification are incompatibles (e.g. column 5 should be X and
     column 5 should be Y (!= X)) return immediatly zero in sumOccurrencies.
*/

DataFrame = function() { };

DataFrame.create = function(data, headers) {
    var obj = new DataFrame();
    obj.setElements(data);
    obj.headers = headers.slice();
    return obj;
};

DataFrame.prototype = new Sylvester.Matrix;

DataFrame.prototype.colIndexOf = function(name) {
    return this.headers.indexOf(name) + 1;
};

DataFrame.prototype.findLevels = function(name) {
    var j = this.colIndexOf(name);
    var levels = [];
    for (var i = 1; i <= this.rows(); i++) {
        var y = this.e(i, j);
        if (levels.indexOf(y) < 0) {
            levels.push(y);
        }
    }
    return levels;
};

var arrayAreEqual = function(a, b) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return (b.length === a.length);
};

DataFrame.prototype.findCoupledLevels = function(names) {
    var js = names.map(function(name) { return this.colIndexOf(name); }, this);
    var levels = [];
    for (var i = 1; i <= this.rows(); i++) {
        var ys = js.map(function(j) { return this.e(i, j); }, this);
        if (!levels.some(function(zs) { return arrayAreEqual(ys, zs); })) {
            levels.push(ys);
        }
    }
    return levels;
};

DataFrame.prototype.setElements = function(data) {
    this.elements = data;
};

DataFrame.prototype.rowMatchFactors = function(i, values) {
    var match = 0;
    var kno = values.length;
    for (var k = 0; k < kno; k++) {
        var j = values[k].column, xval = values[k].value;
        if (this.e(i, j) === xval) {
            match += 1;
        }
    }
    return (match == kno);
};

DataFrame.prototype.filter = function(condition) {
    var data = [];
    for (var i = 1; i <= this.rows(); i++) {
        if (this.rowMatchFactors(i, condition)) {
            data.push(this.elements[i-1]);
        }
    }
    return DataFrame.create(data, this.headers);
};
