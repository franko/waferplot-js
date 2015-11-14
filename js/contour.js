
var Grid = function(nx, ny, xygen, zfun) {
    this.vertices = [];
    for (var i = 0; i <= nx; i++) {
        for (var j = 0; j <= ny; j++) {
            var xy = xygen(i, j);
            xy.push(zfun(xy[0], xy[1]));
            this.vertices.push(xy);
        }
    }

    var vert_index = function(i, j) { return (ny + 1) * i + j; };
    var face_index = function(i, j) { return ny * i + j; };

    this.faces = [];
    for (var i = 0; i < nx; i++) {
        for (var j = 0; j < ny; j++) {
            this.faces.push({});
        }
    }
    for (var i = 0; i < nx; i++) {
        for (var j = 0; j < ny; j++) {
            var face = this.faces[face_index(i, j)];
            face.ivertices = [vert_index(i, j), vert_index(i+1, j), vert_index(i+1, j+1), vert_index(i, j+1)];
        }
    }

    this.cut_map = {};
};

Grid.prototype.prepare = function(zlevels) {
    // To not confuse the algorithm it is required that the z function
    // never assumes an exact z level value at evaluation point.
    // Add a small epsilon for points that does not satisfy the condition.
    var epsilon = Math.abs(zlevels[zlevels.length - 1] - zlevels[0]) * 1e-12;
    for (var i = 0; i < this.vertices.length; i++) {
        var p = this.vertices[i];
        if (zlevels.indexOf(p[2]) >= 0) {
            p[2] += epsilon;
        }
    }
};

var face_index_next = function(face, i) {
    return (i + 1 < face.ivertices.length ? i + 1 : 0);
};

var face_index_prev = function(face, i) {
    return (i - 1 >= 0 ? i - 1 : face.ivertices.length - 1);
};

var face_vertex_next = function(face, ivert) {
    var i = face.ivertices.indexOf(ivert);
    if (i < 0) { throw new Error("internal error: face vertex next"); }
    return face.ivertices[i + 1 < face.ivertices.length ? i + 1 : 0];
};

var face_vertex_prev = function(face, ivert) {
    var i = face.ivertices.indexOf(ivert);
    if (i < 0) { throw new Error("internal error: face vertex prev"); }
    return face.ivertices[i - 1 >= 0 ? i - 1 : face.ivertices.length - 1];
};

var face_contain_edge = function(face, ivert1, ivert2) {
    for (var i = 0; i < face.ivertices.length; i++) {
        var ivertk = face.ivertices[i];
        if (ivertk == ivert1) {
            var inext = face_index_next(face, i);
            var iprev = face_index_prev(face, i);
            if (face.ivertices[inext] == ivert2) {
                return i;
            } else if (face.ivertices[iprev] == ivert2) {
                return iprev;
            }
        }
    }
    return -1;
};

var break_face = function(geometry, iface_parent, iedge1, vert1, iedge2, vert2) {
    // Add new vertex into geometry vertex list.
    var ivert1 = geometry.vertices.push(vert1) - 1;
    var ivert2 = geometry.vertices.push(vert2) - 1;

    // Create new faces. At this step not bound to geometry.
    var face1 = { ivertices: [] };
    var face2 = { ivertices: [] };

    var iface1 = iface_parent; // geometry.faces.push(face1) - 1;
    var iface2 = geometry.faces.push(face2) - 1;

    var face_parent = geometry.faces[iface_parent];

    face1.ivertices.push(ivert1);
    var iedge1_next = face_vertex_next(face_parent, iedge1);
    face1.ivertices.push(iedge1_next);
    for (var ivertj = iedge1_next; ivertj != iedge2; ivertj = face_vertex_next(face_parent, ivertj)) {
        face1.ivertices.push(face_vertex_next(face_parent, ivertj));
    }
    face1.ivertices.push(ivert2);

    face2.ivertices.push(ivert2);
    var iedge2_next = face_vertex_next(face_parent, iedge2);
    face2.ivertices.push(iedge2_next);
    for (var ivertj = iedge2_next; ivertj != iedge1; ivertj = face_vertex_next(face_parent, ivertj)) {
        face2.ivertices.push(face_vertex_next(face_parent, ivertj));
    }
    face2.ivertices.push(ivert1);

    geometry.faces[iface1] = face1;
};

var normalize = function(z, zlevels) {
    for (var i = 0; i < zlevels.length; i++) {
        var zlev = zlevels[i];
        if (zlev > z) {
            return i - 0.5;
        } else if (zlev == z) {
            return i;
        }
    }
    return zlevels.length - 0.5;
}

var p_interp = function(p1, p2, z) {
    var z1 = p1[2], z2 = p2[2];
    var alpha = (z - z1) / (z2 - z1);
    return [p1[0] + alpha * (p2[0] - p1[0]), p1[1] + alpha * (p2[1] - p1[1]), z];
};

var list_tuple_find = function(ls, value) {
    for (var i = 0; i < ls.length; i++) {
        var tp = ls[i];
        if (tp[1] === value) {
            return tp[0];
        }
    }
}

var get_zlevel_cut_point = function(geometry, ivert1, ivert2, zvalue) {
    var p;
    if (geometry.cut_map[ivert1] && geometry.cut_map[ivert1][ivert2]) {
        p = list_tuple_find(geometry.cut_map[ivert1][ivert2], zvalue);
        if (p) return p;

    } else if (geometry.cut_map[ivert2] && geometry.cut_map[ivert2][ivert1]) {
        p = list_tuple_find(geometry.cut_map[ivert2][ivert1], zvalue);
        if (p) return p;
    }
    var p1 = geometry.vertices[ivert1], p2 = geometry.vertices[ivert2];
    p = p_interp(p1, p2, zvalue);
    if (!geometry.cut_map[ivert1]) {
        geometry.cut_map[ivert1] = {};
    }
    if (!geometry.cut_map[ivert1][ivert2]) {
        geometry.cut_map[ivert1][ivert2] = [];
    }
    geometry.cut_map[ivert1][ivert2].push([p, zvalue]);
    return p;
};

Grid.prototype.cut_zlevel = function(zvalue, zlevels) {
    var zindex = normalize(zvalue, zlevels);
    // Inside the loop below the number of faces will normally increase.
    // Store the number of faces to avoid visiting newly added faces.
    var faces_number = this.faces.length;
    for (var i = 0; i < faces_number; i++) {
        var face = this.faces[i];
        var fvert = -1;
        var pcut;
        for (var k = 0; k < face.ivertices.length; k++) {
            var ivert = face.ivertices[k];
            var p1 = this.vertices[ivert];
            var knext = face_index_next(face, k);
            var p2 = this.vertices[face.ivertices[knext]];
            var z1 = normalize(p1[2], zlevels), z2 = normalize(p2[2], zlevels);
            if ((z1 < zindex && z2 > zindex) || (z1 > zindex && z2 < zindex)) {
                if (fvert < 0) {
                    fvert = ivert;
                    pcut = get_zlevel_cut_point(this, ivert, face.ivertices[knext], zvalue);
                } else {
                    var pcut2 = get_zlevel_cut_point(this, ivert, face.ivertices[knext], zvalue);
                    break_face(this, i, fvert, pcut, ivert, pcut2);
                    fvert = -1;
                }
            }
        }
    }
};

Grid.prototype.select_zlevel = function(zvalue1, zvalue2, zlevels) {
    var threegeo = new THREE.Geometry();
    var vertmap = {};
    for (var i = 0; i < this.faces.length; i++) {
        var face = this.faces[i];
        var inside = true;
        for (var k = 0; k < face.ivertices.length; k++) {
            var ivert = face.ivertices[k];
            var vert = this.vertices[ivert];
            inside = inside && (vert[2] >= zvalue1 && vert[2] <= zvalue2);
        }
        if (inside) {
            for (var k = 0; k < face.ivertices.length; k++) {
                var ivert = face.ivertices[k];
                if (vertmap[ivert] === undefined) {
                    var vert = this.vertices[ivert];
                    var vec = new THREE.Vector3(vert[0], vert[1], vert[2]);
                    var threeindex = threegeo.vertices.push(vec) - 1;
                    vertmap[ivert] = threeindex;
                }
            }
            var a = face.ivertices[0], b = face.ivertices[1];
            for (var k = 2; k < face.ivertices.length; k++) {
                var c = face.ivertices[k];
                threegeo.faces.push(new THREE.Face3(vertmap[a], vertmap[b], vertmap[c]));
                b = c;
            }
        }
    }
    return threegeo;
};

CONTOUR = { Grid: Grid };
