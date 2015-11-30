var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );
camera.position.z = 5;

var ok = false;

var create_sprite = function(texture) {
	var sprite_mat = new THREE.SpriteMaterial( {map: texture} );

	var width = sprite_mat.map.image.width;
	var height = sprite_mat.map.image.height;

	var sprite = new THREE.Sprite( sprite_mat );
	sprite.scale.set( width, height, 1 );
	sprite.position.set( 0, 0, 3 );

	scene.add(sprite);

	ok = true;
};

var init = function() {
	var img_texture = THREE.ImageUtils.loadTexture( "textures/sprite0.png", undefined, create_sprite );
};

var render = function() {
	requestAnimationFrame( render );
	if (ok) {
		cube.rotation.x += 0.01; cube.rotation.y += 0.01;
		renderer.render( scene, camera );
	}
};

init();
render();
