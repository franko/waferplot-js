MYAPP = {};

var Grid = function(nx, ny, grid_gen, zfun) {
    this.vertices = [];
    for (var i = 0; i <= nx; i++) {
        for (var j = 0; j <= ny; j++) {
            this.vertices.push(grid_gen(i, j, zfun));
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
        if (zlevels.indexOf(p.z) >= 0) {
            p.z += epsilon;
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

var break_face = function(geometry, iface_parent, iedge1, vert1, iedge2, vert2) {
    // Add new vertex into geometry vertex list.
    var ivert1 = geometry.vertices.push(vert1) - 1;
    var ivert2 = geometry.vertices.push(vert2) - 1;

    // Create new faces. At this step not bound to grid object.
    var face1 = { ivertices: [] };
    var face2 = { ivertices: [] };

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

    return [face1, face2];
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
    var z1 = p1.z, z2 = p2.z;
    var alpha = (z - z1) / (z2 - z1);
    return new THREE.Vector3(p1.x + alpha * (p2.x - p1.x), p1.y + alpha * (p2.y - p1.y), z);
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
    // The faces that are added inside the loop *needs* to be inspected by
    // this loop.
    for (var i = 0; i < this.faces.length; i++) {
        var face = this.faces[i];
        var fvert = -1;
        var pcut;
        for (var k = 0; k < face.ivertices.length; k++) {
            var ivert = face.ivertices[k];
            var p1 = this.vertices[ivert];
            var knext = face_index_next(face, k);
            var p2 = this.vertices[face.ivertices[knext]];
            var z1 = normalize(p1.z, zlevels), z2 = normalize(p2.z, zlevels);
            if ((z1 < zindex && z2 > zindex) || (z1 > zindex && z2 < zindex)) {
                if (fvert < 0) {
                    fvert = ivert;
                    pcut = get_zlevel_cut_point(this, ivert, face.ivertices[knext], zvalue);
                } else {
                    var pcut2 = get_zlevel_cut_point(this, ivert, face.ivertices[knext], zvalue);
                    var new_faces = break_face(this, i, fvert, pcut, ivert, pcut2);
                    // The first face is the one that was "carved" out. Put it
                    // in-place.
                    this.faces[i] = new_faces[0];
                    // The second face is the remaining one. It is added at the
                    // end so that is examinated again in the loop in case it
                    // needs to be broken again.
                    this.faces.push(new_faces[1]);
                    break;
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
            inside = inside && (vert.z >= zvalue1 && vert.z <= zvalue2);
        }
        if (inside) {
            for (var k = 0; k < face.ivertices.length; k++) {
                var ivert = face.ivertices[k];
                if (vertmap[ivert] === undefined) {
                    var vert = this.vertices[ivert];
                    // Normally here a "clone" of vert should be taken but we
                    // assume that the three.js geometry can share the vertices
                    // with the Grid object.
                    var threeindex = threegeo.vertices.push(vert) - 1;
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
