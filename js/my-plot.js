var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


var controls = new THREE.OrbitControls( camera, renderer.domElement );

var Nx = 60, Ny = 60, Dx = 5, Dy = 5;
var my_zlevels = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0];

var myfun = function(x, y) { return 15*(x*x + 0.02)*Math.exp(-10*(x*x+y*y)); };

var xygen_grid = function(i, j, zfun) {
	var x = -1 + 2 * i / Nx, y = -1 + 2 * j / Ny;
	return new THREE.Vector3(x, y, zfun(x, y));
};

var xygen = function(i, j, zfun) {
	var x = -1 + 2 * i / Nx, y = -1 + 2 * j / Ny;
	var phi = Math.atan2(y, x);
	var cosphi = Math.max(Math.abs(Math.cos(phi)), Math.abs(Math.sin(phi)));
	x *= cosphi;
	y *= cosphi;
	return new THREE.Vector3(x, y, zfun(x, y));
};

var color_level9_i = [0xd73027, 0xf46d43 ,0xfdae61, 0xfee08b, 0xffffbf, 0xd9ef8b, 0xa6d96a, 0x66bd63, 0x1a9850];
var color_level9 = []; for (var i = 0; i < 9; i++) color_level9[i] = color_level9_i[8 - i];

var lines_mat = new THREE.LineBasicMaterial({ color: 0x444444 });
for (var i = 0; i <= Nx; i += Dx) {
	var line = new THREE.Geometry();
	for (var j = 0; j <= Ny; j++) {
		var p = xygen_grid(i, j, myfun);
		if (p.length() < 1) {
			line.vertices.push(p);
		}
	}
	scene.add(new THREE.Line(line, lines_mat));
}

for (var j = 0; j <= Ny; j += Dy) {
	var line = new THREE.Geometry();
	for (var i = 0; i <= Nx; i++) {
		var p = xygen_grid(i, j, myfun);
		if (p.length() < 1) {
			line.vertices.push(p);
		}
	}
	scene.add(new THREE.Line(line, lines_mat));
}

var add_geometry_to_scene = function(scene, geometry, color) {
	// var material = new THREE.MeshPhongMaterial( { color: color, specular: 0xdddddd, shininess: 30, shading: THREE.SmoothShading, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 0.8 } )
	var material = new THREE.MeshBasicMaterial( { color: color, polygonOffset: true, polygonOffsetFactor: 0.8 } )
	var mesh = new THREE.Mesh( geometry, material );
	scene.add(mesh);
}

var grid = new CONTOUR.Grid(Nx, Ny, xygen, myfun);
grid.prepare(my_zlevels);
for (var i = 0; i < my_zlevels.length; i++) {
	grid.cut_zlevel(my_zlevels[i], my_zlevels);
}

for (var i = 0; i < my_zlevels.length - 1; i++) {
	var geometry = grid.select_zlevel(my_zlevels[i], my_zlevels[i+1], my_zlevels);
	// geometry.computeFaceNormals();
	// geometry.computeVertexNormals();
	add_geometry_to_scene(scene, geometry, color_level9[i]);
}

// create a point light
var pointLight = new THREE.SpotLight(0xFFFFFF);

// set its position
pointLight.position.x = 1;
pointLight.position.y = 3;
pointLight.position.z = 5;

// add to the scene
scene.add(pointLight);

camera.position.x = 2;
camera.position.y = -2;
camera.position.z = 0;
camera.lookAt(scene.position);

function update()
{
	controls.update();
}

var render = function () {
	requestAnimationFrame( render );
	renderer.render(scene, camera);
	update();
};

render();
