
var create_grid_geometry = function(nx, ny, xygen) {
    var geometry = { vertices: [], faces: [] };
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
            face.ivertices = [vert_index(i, j), vert_index(i, j+1), vert_index(i+1, j+1), vert_index(i+1, j)];
            face.adjacents = [];
            if (j > 0 ) { face.adjacents.push(face_index(i    , j - 1)); }
            if (j < ny) { face.adjacents.push(face_index(i    , j + 1)); }
            if (i > 0 ) { face.adjacents.push(face_index(i - 1, j    )); }
            if (i < nx) { face.adjacents.push(face_index(i + 1, j    )); }
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

// Find the adjacent face passing from ivert1-ivert2. Return -1 if
// not found.
var find_adjacent = function(geometry, face, ivert1, ivert2) {
    var iface_adj = -1;
    for (var i = 0; i < face.adjacents.length; i++) {
        var ifx = face.adjacents[i];
        var fx = geometry.faces[ifx];
        if (face_contain_edge(fx, ivert1, ivert2) >= 0) {
            iface_adj = ifx;
            break;
        }
    }
    return iface_adj;
}

var adjacents_add_edge_vertex = function(geometry, iface_parent, ivert1, ivert2, ivert_add, iface1, iface2)
{
    var face_parent = geometry.faces[iface_parent];

    // Search an face adjacent to face_parent which contain the edge
    // ivert1-ivert2.
    var iface_adj = find_adjacent(geometry, face_parent, ivert1, ivert2);
    if (iface_adj < 0) return (-1);
    var face_adj = geometry.faces[iface_adj];

    // Add the new vertex to the adjacent face, between ivert1-ivert2.
    var index_insert = face_contain_edge(face_adj, ivert1, ivert2);
    face_adj.ivertices.splice(index_insert + 1, 0, ivert_add);

    // Remove face_parent from the adjacents of face_adj and
    // put instead iface1 and iface2.
    var ix = face_adj.adjacents.indexOf(iface_parent);
    if (ix >= 0) {
        face_adj.adjacents[ix] = iface1;
    }
    face_adj.adjacents.push(iface2);
    return iface_adj;
};

var break_face = function(geometry, iface_parent, iedge1, vert1, iedge2, vert2) {
    // Add new vertex into geometry vertex list.
    var ivert1 = geometry.vertices.push(vert1) - 1;
    var ivert2 = geometry.vertices.push(vert2) - 1;

    // Create new faces. At this step not bound to geometry.
    var face1 = { ivertices: [], adjacents: [] };
    var face2 = { ivertices: [], adjacents: [] };

    var iface1 = iface_parent; // geometry.faces.push(face1) - 1;
    var iface2 = geometry.faces.push(face2) - 1;

    var face_parent = geometry.faces[iface_parent];

    face1.ivertices.push(ivert1);
    var iedge1_next = face_vertex_next(face_parent, iedge1);
    var iface_adj1 = adjacents_add_edge_vertex(geometry, iface_parent, iedge1, iedge1_next, ivert1, iface1, iface2);
    if (iface_adj1 >= 0) {
        face1.adjacents.push(iface_adj1);
        face2.adjacents.push(iface_adj1);
    }
    face1.ivertices.push(iedge1_next);
    for (var ivertj = iedge1_next; ivertj != iedge2; ivertj = face_vertex_next(face_parent, ivertj)) {
        face1.ivertices.push(face_vertex_next(face_parent, ivertj));
        var iface_adj_x = find_adjacent(geometry, face_parent, ivertj, face_vertex_next(face_parent, ivertj));
        if (iface_adj_x >= 0) {
            face1.adjacents.push(iface_adj_x);
        }
    }
    face1.ivertices.push(ivert2);

    face2.ivertices.push(ivert2);
    var iedge2_next = face_vertex_next(face_parent, iedge2);
    var iface_adj2 = adjacents_add_edge_vertex(geometry, iface_parent, iedge2, iedge2_next, ivert2, iface1, iface2);
    if (iface_adj2 >= 0) {
        face1.adjacents.push(iface_adj2);
        face2.adjacents.push(iface_adj2);
    }
    face2.ivertices.push(iedge2_next);
    for (var ivertj = iedge2_next; ivertj != iedge1; ivertj = face_vertex_next(face_parent, ivertj)) {
        face2.ivertices.push(face_vertex_next(face_parent, ivertj));
        var iface_adj_x = find_adjacent(geometry, face_parent, ivertj, face_vertex_next(face_parent, ivertj));
        if (iface_adj_x >= 0) {
            face2.adjacents.push(iface_adj_x);
        }
    }
    face2.ivertices.push(ivert1);

    face1.adjacents.push(iface2);
    face2.adjacents.push(iface1);

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
                    pcut = p_interp(p1, p2, zvalue);
                } else {
                    var pcut2 = p_interp(p1, p2, zvalue);
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
cut_zlevel(geo, my_zlevels[4], my_zlevels);
// geometry_cut_zlevels(geo, my_zlevels);
GEO_CUT_TEST = select_zlevel(geo, my_zlevels[1], my_zlevels[4], my_zlevels);
