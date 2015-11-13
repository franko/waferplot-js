var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


var controls = new THREE.OrbitControls( camera, renderer.domElement );

var Nx = 30, Ny = 30, Dx = 1, Dy = 1;

var myfun = function(x, y) { return Math.exp(-10*(x*x+y*y)); };

var xygen = function(i, j) {
	var x = -1 + 2 * i / Nx, y = -1 + 2 * j / Ny;
	var phi = Math.atan2(y, x);
	// var cosphi = Math.max(Math.abs(Math.cos(phi)), Math.abs(Math.sin(phi)));
	var cosphi = 1;
	return [x * cosphi, y * cosphi];
};

var lines_mat = new THREE.LineBasicMaterial({ color: 0x444444 });
for (var i = 0; i <= Nx; i += Dx) {
	var line = new THREE.Geometry();
	for (var j = 0; j <= Ny; j++) {
		var xylist = xygen(i, j)
		var x = xylist[0], y = xylist[1];
		var z = myfun(x, y);
		line.vertices.push(new THREE.Vector3(x, y, z));
	}
	scene.add(new THREE.Line(line, lines_mat));
}

for (var j = 0; j <= Ny; j += Dy) {
	var line = new THREE.Geometry();
	for (var i = 0; i <= Nx; i++) {
		var xylist = xygen(i, j)
		var x = xylist[0], y = xylist[1];
		var z = myfun(x, y);
		line.vertices.push(new THREE.Vector3(x, y, z));
	}
	scene.add(new THREE.Line(line, lines_mat));
}

var add_geometry_to_scene = function(scene, geometry, color) {
	// var material = new THREE.MeshPhongMaterial( { color: color, specular: 0xdddddd, shininess: 30, shading: THREE.SmoothShading, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 0.8 } )
	var material = new THREE.MeshBasicMaterial( { color: color, polygonOffset: true, polygonOffsetFactor: 0.8 } )
	var mesh = new THREE.Mesh( geometry, material );
	scene.add(mesh);
}

var geometry;

geometry = GEO_CUT_TEST1;
geometry.computeFaceNormals();
geometry.computeVertexNormals();
add_geometry_to_scene(scene, geometry, 0x00bb00);

geometry = GEO_CUT_TEST2;
geometry.computeFaceNormals();
geometry.computeVertexNormals();
add_geometry_to_scene(scene, geometry, 0x00bbbb);

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
