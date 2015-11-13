
var create_grid_geometry = function(nx, ny, xygen) {
    var geometry = { vertices: [], faces: [], cut_map: {} };
    for (var i = 0; i <= nx; i++) {
        for (var j = 0; j <= ny; j++) {
            var xy = xygen(i, j);
            geometry.vertices.push(xy);
        }
    }

    var vert_index = function(i, j) { return (ny + 1) * i + j; };
    var face_index = function(i, j) { return ny * i + j; };

    for (var i = 0; i < nx; i++) {
        for (var j = 0; j < ny; j++) {
            geometry.faces.push({});
        }
    }

    for (var i = 0; i < nx; i++) {
        for (var j = 0; j < ny; j++) {
            var face = geometry.faces[face_index(i, j)];
            face.ivertices = [vert_index(i, j), vert_index(i+1, j), vert_index(i+1, j+1), vert_index(i, j+1)];
        }
    }

    return geometry;
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

var eval_zmap = function(geometry, zfun) {
    for (var i = 0; i < geometry.vertices.length; i++) {
        var p = geometry.vertices[i];
        p.push(zfun(p[0], p[1]));
    }
};

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

var cut_zlevel = function(geometry, zvalue, zlevels) {
    var zindex = normalize(zvalue, zlevels);
    for (var i = 0; i < geometry.faces.length; i++) {
        var face = geometry.faces[i];
        var fvert = -1;
        var pcut;
        for (var k = 0; k < face.ivertices.length; k++) {
            var ivert = face.ivertices[k];
            var p1 = geometry.vertices[ivert];
            var knext = face_index_next(face, k);
            var p2 = geometry.vertices[face.ivertices[knext]];
            var z1 = normalize(p1[2], zlevels), z2 = normalize(p2[2], zlevels);
            if ((z1 < zindex && z2 > zindex) || (z1 > zindex && z2 < zindex)) {
                if (fvert < 0) {
                    fvert = ivert;
                    pcut = get_zlevel_cut_point(geometry, ivert, face.ivertices[knext], zvalue);
                } else {
                    var pcut2 = get_zlevel_cut_point(geometry, ivert, face.ivertices[knext], zvalue);
                    break_face(geometry, i, fvert, pcut, ivert, pcut2);
                    fvert = -1;
                }
            }
        }
    }
};

var geometry_cut_zlevels = function(geometry, zlevels) {
    for (var i = 0; i < zlevels.length; i++) {
        cut_zlevel(geometry, zlevels[i], zlevels);
    }
};

var select_zlevel = function(geometry, zvalue1, zvalue2, zlevels) {
    var threegeo = new THREE.Geometry();
    var vertmap = {};
    for (var i = 0; i < geometry.faces.length; i++) {
        var face = geometry.faces[i];
        var inside = true;
        for (var k = 0; k < face.ivertices.length; k++) {
            var ivert = face.ivertices[k];
            var vert = geometry.vertices[ivert];
            inside = inside && (vert[2] >= zvalue1 && vert[2] <= zvalue2);
        }
        if (inside) {
            for (var k = 0; k < face.ivertices.length; k++) {
                var ivert = face.ivertices[k];
                if (vertmap[ivert] === undefined) {
                    var vert = geometry.vertices[ivert];
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

var Nx = 30, Ny = 30;
var xygen_test = function(i, j) { return [-1 + 2 * i / Nx, -1 + 2 * j / Ny]; };
var myfun = function(x, y) { return Math.exp(-10*(x*x+y*y)); };
// var zfun_test = function(x, y) { return Math.pow(1.777777 * x + 2.3333 * y, 2); }
var geo = create_grid_geometry(Nx, Ny, xygen_test);
var my_zlevels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
eval_zmap(geo, myfun);
cut_zlevel(geo, my_zlevels[1], my_zlevels);
cut_zlevel(geo, my_zlevels[2], my_zlevels);
cut_zlevel(geo, my_zlevels[3], my_zlevels);
// geometry_cut_zlevels(geo, my_zlevels);
GEO_CUT_TEST1 = select_zlevel(geo, my_zlevels[1], my_zlevels[2], my_zlevels);
GEO_CUT_TEST2 = select_zlevel(geo, my_zlevels[2], my_zlevels[3], my_zlevels);
