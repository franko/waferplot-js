var iwidth = 800, iheight = 600;
var camera = new THREE.PerspectiveCamera( 75, iwidth/iheight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize(iwidth, iheight);
renderer.setClearColor(0xffffff);
var container = document.getElementById("three-js");
container.appendChild( renderer.domElement );

var controls = new THREE.OrbitControls( camera, renderer.domElement );

var color_level = [];
color_level[6] = [0x1a9850, 0x91cf60, 0xd9ef8b, 0xfee08b, 0xfc8d59, 0xd73027];
color_level[7] = [0x1a9850, 0x91cf60, 0xd9ef8b, 0xffffbf, 0xfee08b, 0xfc8d59, 0xd73027];
color_level[8] = [0x1a9850, 0x66bd63, 0xa6d96a, 0xd9ef8b, 0xfee08b, 0xfdae61, 0xf46d43 ,0xd73027];
color_level[9] = [0x1a9850, 0x66bd63, 0xa6d96a, 0xd9ef8b, 0xffffbf, 0xfee08b, 0xfdae61, 0xf46d43 ,0xd73027];
color_level[10] = [0x006837, 0x1a9850, 0x66bd63, 0xa6d96a, 0xd9ef8b, 0xfee08b, 0xfdae61, 0xf46d43, 0xd73027, 0xa50026];
color_level[11] = [0x006837, 0x1a9850, 0x66bd63, 0xa6d96a, 0xd9ef8b, 0xffffbf, 0xfee08b, 0xfdae61, 0xf46d43, 0xd73027, 0xa50026];
var get_colormap = function(n) { return color_level[n < 6 ? 6 : (n < 11 ? n: 11)]; }

var gen_carrier_geometry = function(plot, height) {
	var Nx = plot.Nx, Ny = plot.Ny;
	var xygen = plot.xygen, zfun = plot.zfun;
	var bo_z = function() { return height; };
	var carrier = new THREE.Geometry();
	var i = 0, j = 0;
	for (/**/; j <= Ny; j++) {
		carrier.vertices.push(xygen(i, j, zfun));
		carrier.vertices.push(xygen(i, j, bo_z));
	}
	for (j = Ny, i++; i <= Nx; i++) {
		carrier.vertices.push(xygen(i, j, zfun));
		carrier.vertices.push(xygen(i, j, bo_z));
	}
	for (i = Nx, j--; j >= 0; j--) {
		carrier.vertices.push(xygen(i, j, zfun));
		carrier.vertices.push(xygen(i, j, bo_z));
	}
	for (j = 0, i--; i >= 0; i--) {
		carrier.vertices.push(xygen(i, j, zfun));
		carrier.vertices.push(xygen(i, j, bo_z));
	}
	var icenter = carrier.vertices.push(xygen(Nx/2, Ny/2, bo_z)) - 1;
	for (var i = 0; i < 2*(Nx + Ny); i++) {
		var a = 2*i, b = 2*i + 1;
		var c = 2*i + 2, d = 2*i + 3;
		carrier.faces.push(new THREE.Face3(a, c, b), new THREE.Face3(b, c, d));
		carrier.faces.push(new THREE.Face3(b, d, icenter));
	}

	return carrier;
};


var add_geometry_to_scene = function(plot, scene, geometry, color) {
	var material = new THREE.MeshLambertMaterial( { color: color, polygonOffset: true, polygonOffsetFactor: 0.8 } )
	var mesh = new THREE.Mesh( geometry, material );
	mesh.matrix.copy(plot.norm_matrix);
	mesh.matrixAutoUpdate = false;
	scene.add(mesh);
};

var add_pointlight = function(scene, color, pos) {
	var pointLight = new THREE.SpotLight(color);
	pointLight.position.copy(pos);
	scene.add(pointLight);
};

var create_points = function(dataset, norm_matrix, color, zselect) {
	var points_geo = new THREE.Geometry();
	for (var i = 1; i <= dataset.rows(); i++) {
		points_geo.vertices.push(zselect(i));
	}
	var points_mat = new THREE.PointsMaterial({color: color, size: 3, sizeAttenuation: false});
	var points = new THREE.Points(points_geo, points_mat);
	points.matrix.copy(norm_matrix);
	points.matrixAutoUpdate = false;
	return points;
};

var zselect_dataset = function(dataset) {
	var dsx = dataset.colIndexOf("x"), dsy = dataset.colIndexOf("y"), dsz = 1;
	return function(i) {
		var x = dataset.e(i, dsx), y = dataset.e(i, dsy), z = dataset.e(i, dsz);
		return new THREE.Vector3(x, y, z);
	};
};

var zselect_proj = function(dataset, zfun) {
	var dsx = dataset.colIndexOf("x"), dsy = dataset.colIndexOf("y");
	return function(i) {
		var x = dataset.e(i, dsx), y = dataset.e(i, dsy);
		return new THREE.Vector3(x, y, zfun(x, y));
	};
};

var new_plot3d_scene = function(plot) {
	var scene = new THREE.Scene();

	var zmin = plot.zlevels[0], zmax = plot.zlevels[plot.zlevels.length - 1];

	if (plot.dataset) {
		var points = create_points(plot.dataset, plot.norm_matrix, 0x8888ff, zselect_dataset(plot.dataset));
		scene.add(points);

		var proj = create_points(plot.dataset, plot.norm_matrix, 0x000000, zselect_proj(plot.dataset, plot.zfun));
		scene.add(proj);
	}

	var carrier = gen_carrier_geometry(plot, zmin - (zmax - zmin));
	carrier.computeFaceNormals();
	carrier.computeVertexNormals();
	add_geometry_to_scene(plot, scene, carrier, 0xbbbbbb);

	var zlevels = plot.zlevels;
	var grid = new CONTOUR.Grid(plot.Nx, plot.Ny, plot.xygen, plot.zfun);
	grid.prepare(zlevels);
	for (var i = 0; i < zlevels.length; i++) {
		grid.cut_zlevel(zlevels[i], zlevels);
	}

	var colormap = get_colormap(zlevels.length - 1);
	for (var i = 0; i < zlevels.length - 1; i++) {
		var geometry = grid.select_zlevel(zlevels[i], zlevels[i+1], zlevels);
		geometry.computeFaceNormals();
		geometry.computeVertexNormals();
		add_geometry_to_scene(plot, scene, geometry, colormap[i]);
	}

	add_pointlight(scene, 0x888888, new THREE.Vector3(1, 3, 5));
	add_pointlight(scene, 0x888888, new THREE.Vector3(-1, -3, 5));
	scene.add(new THREE.AmbientLight(0x333333));
	return scene;
};

var CAMERA_DIST = 2.0, CAMERA_ANGLE = 30 * Math.PI / 180;
var point_camera = function(scene) {
	camera.position.x = 0;
	camera.position.y = - CAMERA_DIST * Math.cos(CAMERA_ANGLE);
	camera.position.z = + CAMERA_DIST * Math.sin(CAMERA_ANGLE);
	camera.lookAt(scene.position);
};

function update()
{
	controls.update();
}

var render = function () {
	requestAnimationFrame( render );
	renderer.render(MYAPP.scene, camera);
	update();
};

var new_plot = function(zfun, dataset) {
	var Nx = 80, Ny = 80, Dx = 5, Dy = 5;

	var xyeval = function(i, j, action) {
		var x = -150 + 300 * i / Nx, y = -150 + 300 * j / Ny;
		var phi = Math.atan2(y, x);
		var cosphi = Math.max(Math.abs(Math.cos(phi)), Math.abs(Math.sin(phi)));
		return action(x * cosphi, y * cosphi);
    }

	var zmin, zmax;
	for (var i = 0; i <= Nx; i++) {
		for (var j = 0; j <= Ny; j++) {
			var z = xyeval(i, j, zfun);
			zmin = (zmin && zmin <= z) ? zmin : z;
			zmax = (zmax && zmax >= z) ? zmax : z;
		}
	}

	var ZLEVEL_NUMBER = 11;
	var zdiv = MYAPP.scale_units(zmin, zmax, ZLEVEL_NUMBER);
	var z1 = Math.floor(zmin / zdiv) * zdiv, z2 = Math.ceil(zmax / zdiv) * zdiv;

	var zlevels = [];
	for (var zcurr = z1; zcurr <= z2; zcurr += zdiv) { zlevels.push(zcurr); }

	var xygen = function(i, j, zfun) {
		return xyeval(i, j, function(x, y) { return new THREE.Vector3(x, y, zfun(x, y)); });
	};

	var offset = new THREE.Matrix4().setPosition(new THREE.Vector3(0, 0, -zmin));
	var Z_SHRINK_FACTOR = 3;
	var mat = new THREE.Matrix4().makeScale(1/150, 1/150, 1/(Z_SHRINK_FACTOR * (zmax - zmin))).multiply(offset);

	var plot = {
		Nx: Nx,
		Ny: Ny,
		xygen: xygen,
		zfun: zfun,
		zlevels: zlevels,
		dataset: dataset,
		norm_matrix: mat,
	};

	return plot;
};

MYAPP.load_wafer_function = function(zfun, dataset) {
	var plot = new_plot(zfun, dataset);
	MYAPP.scene = new_plot3d_scene(plot);
};

var new_plot_example = function() {
	return new_plot(zfun);
};

var zfun_example = function(x, y) { var u=x/150, v=y/150; return 25 * 18*(u*u + 0.02)*Math.exp(-10*(u*u+v*v)); };
var plot_example = new_plot(zfun_example);
MYAPP.scene = new_plot3d_scene(plot_example);

point_camera(MYAPP.scene);
render();
