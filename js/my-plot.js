MYAPP = {};

var iwidth = 800, iheight = 600;
var camera = new THREE.PerspectiveCamera( 75, iwidth/iheight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize(iwidth, iheight);
var container = document.getElementById("three-js");
container.appendChild( renderer.domElement );

var controls = new THREE.OrbitControls( camera, renderer.domElement );

var color_level9_i = [0xd73027, 0xf46d43 ,0xfdae61, 0xfee08b, 0xffffbf, 0xd9ef8b, 0xa6d96a, 0x66bd63, 0x1a9850];
var color_level9 = []; for (var i = 0; i < 9; i++) color_level9[i] = color_level9_i[8 - i];

var gen_carrier_geometry = function(plot, height) {
	var Nx = plot.Nx, Ny = plot.Ny;
	var xygen = plot.xygen, zfun = plot.zfun;
	var bo_z = function() { return -height; };
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
	// var material = new THREE.MeshPhongMaterial( { color: color, specular: 0xdddddd, shininess: 30, shading: THREE.SmoothShading, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 0.8 } )
	var material = new THREE.MeshBasicMaterial( { color: color, polygonOffset: true, polygonOffsetFactor: 0.8 } )
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

var new_plot3d_scene = function(plot) {
	var scene = new THREE.Scene();

	var carrier = gen_carrier_geometry(plot, 0);
	add_geometry_to_scene(plot, scene, carrier, 0xbbbbbb);

	var zlevels = plot.zlevels;
	var grid = new CONTOUR.Grid(plot.Nx, plot.Ny, plot.xygen, plot.zfun);
	grid.prepare(zlevels);
	for (var i = 0; i < zlevels.length; i++) {
		grid.cut_zlevel(zlevels[i], zlevels);
	}

	for (var i = 0; i < zlevels.length - 1; i++) {
		var geometry = grid.select_zlevel(zlevels[i], zlevels[i+1], zlevels);
		// geometry.computeFaceNormals();
		// geometry.computeVertexNormals();
		add_geometry_to_scene(plot, scene, geometry, color_level9[i]);
	}

	add_pointlight(scene, 0xffffff, new THREE.Vector3(1, 3, 5));

	return scene;
};

var point_camera = function(scene) {
	camera.position.x = 2;
	camera.position.y = -2;
	camera.position.z = 0;
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

var new_plot_example = function() {
	var Nx = 60, Ny = 60, Dx = 5, Dy = 5;
	var zlevels = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0];

	for (var i = 0; i < zlevels.length; i++) {
		zlevels[i] *= 25;
	}

	var zfun = function(x, y) { var u=x/150, v=y/150; return 25 * 18*(u*u + 0.02)*Math.exp(-10*(u*u+0.2*v*v)); };

	var xygen = function(i, j, zfun) {
		var x = -150 + 300 * i / Nx, y = -150 + 300 * j / Ny;
		var phi = Math.atan2(y, x);
		var cosphi = Math.max(Math.abs(Math.cos(phi)), Math.abs(Math.sin(phi)));
		x *= cosphi;
		y *= cosphi;
		return new THREE.Vector3(x, y, zfun(x, y));
	};

	var mat = new THREE.Matrix4();
	mat.makeScale(1/150, 1/150, 1/25);

	var plot = {
		Nx: Nx,
		Ny: Ny,
		xygen: xygen,
		zfun: zfun,
		zlevels: zlevels,
		norm_matrix: mat,
	};

	return plot;
};

var plot_example = new_plot_example();
MYAPP.scene = new_plot3d_scene(plot_example);

point_camera(MYAPP.scene);
render();
