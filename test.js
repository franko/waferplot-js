var scene = new THREE.Scene();
var wratio = window.innerWidth / window.innerHeight;
var camera = new THREE.OrthographicCamera(-5 * wratio, 5 * wratio, 5, -5, -1, 100);
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );
camera.position.z = 5;

var create_sprite = function(texture) {
	var sprite_mat = new THREE.SpriteMaterial( {map: texture} );

	var width = sprite_mat.map.image.width;
	var height = sprite_mat.map.image.height;

	var sprite = new THREE.Sprite( sprite_mat );
	sprite.scale.set( 3, 3, 1 );
	sprite.position.set( 0, 0, 0 );

	scene.add(sprite);
};

var init = function() {
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    var context = canvas.getContext('2d');
    context.fillStyle = "#8888ff";
    context.fillRect(0, 0, 256, 256);

    context.font = "20px Arial";
    context.fillStyle = "#00ff00";
	context.fillText("Hello!", 10, 100);

	document.body.appendChild(canvas);

    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    create_sprite(texture);
};

var render = function() {
	requestAnimationFrame( render );
	cube.rotation.x += 0.01; cube.rotation.y += 0.01;
	renderer.render( scene, camera );
};

init();
render();
