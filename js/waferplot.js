/*
** Waferplot-js -- an HTML application to plot wafer data
**
** Copyright (C) 2015 Francesco Abbate. All rights reserved.
**
** This file is part of Waferplot-js.
**
** Waferplot-js is free software: you can redistribute it and/or modify
** it under the terms of the GNU General Public License as published by
** the Free Software Foundation, either version 3 of the License, or
** (at your option) any later version.
**
** Waferplot-js is distributed in the hope that it will be useful,
** but WITHOUT ANY WARRANTY; without even the implied warranty of
** MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
** GNU General Public License for more details.
**
** You should have received a copy of the GNU General Public License
** along with Waferplot-js.  If not, see <http://www.gnu.org/licenses/>.
**
*/

MYAPP.FLATTEN = false;

var container = document.getElementById("three-js");

var renderer_element;
var data_element;

var enable_output = function(what) {
	if (container.firstChild) {
		container.removeChild(container.firstChild);
	}
	if (what === "Data") {
		container.appendChild(data_element);
	} else {
		container.appendChild(renderer_element);
	}
}

var foreach_nav_a = function(action) {
	var ul = document.getElementById("tab-ul");
	var lis = ul.childNodes;
	for (var k = 0; k < lis.length; k++) {
		var li = lis[k];
		var a = li.firstChild;
		if (a && a.tagName === "A") {
			action(a);
		}
	}
}

foreach_nav_a(function(a) {
	a.addEventListener('click', function(event) {
		event.preventDefault();
		foreach_nav_a(function(a) { a.className = ""; });
		event.target.classList.add("selected");
		enable_output(event.target.text);
	});
});

var populate_data_grid = function(dataset, table_container) {
	if (table_container.firstChild) {
		table_container.removeChild(table_container.firstChild);
	}
	var table = document.createElement("table");
	table.classList.add("data");
	var thead = document.createElement("thead");
	var tr = document.createElement("tr");
	for (var j = 0; j < dataset.headers.length; j++) {
		var th = document.createElement("th");
		th.innerHTML = dataset.headers[j];
		tr.appendChild(th);
	}
	thead.appendChild(tr);
	var tbody = document.createElement("tbody");
	for (var i = 1; i <= dataset.rows(); i++) {
		tr = document.createElement("tr");
		for (var j = 1; j <= dataset.headers.length; j++) {
			var td = document.createElement("td");
			td.innerHTML = String(dataset.e(i, j));
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}
	table.appendChild(thead);
	table.appendChild(tbody);
	table_container.appendChild(table);
}

var camera, cameraOrtho;

var compute_area_size = function() {
	var width = Math.ceil(window.innerWidth * 0.7);
	return { width: width, height: Math.ceil(width * 0.65) };
}

var setup_cameras = function(width, height) {
	camera.aspect = width / height;
	camera.updateProjectionMatrix();

	cameraOrtho = new THREE.OrthographicCamera( - width / 2, width / 2, height / 2, - height / 2, -10, 10 );
	cameraOrtho.position.z = 10;
}

var viewport = compute_area_size();
camera = new THREE.PerspectiveCamera( 75, viewport.width/viewport.height, 0.1, 1000 );
setup_cameras();

var renderer = new THREE.WebGLRenderer({antialias: true, sortObjects: false});
renderer.setSize(viewport.width, viewport.height);
renderer.setClearColor(0xffffff);
renderer.autoClear = false; // To allow render overlay on top of sprited sphere

renderer_element = renderer.domElement;
data_element = document.createElement("p");
data_element.innerHTML = "<h3>No data currently loaded.</h3>";

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

var gen_carrier_geometry = function(plot, height, ztransform) {
	var Nx = plot.Nx, Ny = plot.Ny;
	var xygen = plot.xygen, zfun = ztransform ? function(x, y) { return ztransform(plot.zfun(x, y)); } : plot.zfun;
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

var rgba_string = function(n) {
	var b = n % 256;
	n = (n - b) / 256;
	var g = n % 256;
	n = (n - g) / 256;
	return 'rgba(' + String(n) + ',' + String(g) + ',' + String(b) + ',256)';
}

var create_legend_texture = function(zlevels, legend_format) {
    var width = 512, height = 512;
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext('2d');
    context.font = "14px Arial";
    context.fillStyle = "#000";

	var text_width = 0;
	for (var i = 0; i < zlevels.length; i++) {
		var metrics = context.measureText(legend_format(zlevels[i]));
		text_width = (metrics.width > text_width ? metrics.width : text_width);
	}
    var text_height = 14;
	var th_spacing = text_height;
	var text_yoffs = text_height / 3;
	var canvas_y = function(i) { return height - 4 - i * (text_height + th_spacing) - text_yoffs; };

	var colormap = get_colormap(zlevels.length - 1);

	var ww = text_height + th_spacing, hh = text_height;
    for (var i = 0; i < zlevels.length; i++) {
		var y1 = canvas_y(i), y2 = canvas_y(i + 1);
		var x0 = 4, x1 = x0 + text_width + 12, x2 = x1 + ww;

		context.fillStyle = '#000';
		context.fillText(legend_format(zlevels[i]), x0, y1 + text_yoffs);

		context.beginPath();
		context.moveTo(x1 - 4, y1);
		context.lineTo(x2, y1);
		context.stroke();

		if (i + 1 < zlevels.length) {
			context.fillStyle = rgba_string(colormap[i]);
			context.fillRect(x1, y1, ww, y2 - y1);

			context.fillStyle = '#000';
			context.moveTo(x2, y1);
			context.lineTo(x2, y2);
			context.moveTo(x1, y1);
			context.lineTo(x1, y2);
			context.stroke();
		}
    }

    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return {texture: texture, width: text_width + 12 + ww, height: (text_height + th_spacing) * zlevels.length};
};

var add_geometry_to_scene = function(plot, scene, geometry, color) {
	var material;
	if (MYAPP.FLATTEN) {
		material = new THREE.MeshBasicMaterial( { color: color, polygonOffset: true, polygonOffsetFactor: 0.8 } );
	} else {
		material = new THREE.MeshPhongMaterial( { color: color, polygonOffset: true, polygonOffsetFactor: 0.8 } );
	}
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

var zselect_dataset = function(dataset, column, ztransform) {
	return function(i) {
		var x = dataset.e(i, column.x), y = dataset.e(i, column.y), z = dataset.e(i, column.z);
		return new THREE.Vector3(x, y, ztransform ? ztransform(z) : z);
	};
};

var zselect_proj = function(dataset, column, zfun, ztransform) {
	return function(i) {
		var x = dataset.e(i, column.x), y = dataset.e(i, column.y);
		var z = zfun(x, y);
		return new THREE.Vector3(x, y, ztransform ? ztransform(z) : z);
	};
};

var plot3d_legend_scene = function(plot, width, height) {
	var sceneOrtho = new THREE.Scene();
	var legend = create_legend_texture(plot.zlevels, plot.legend_format);
	var material = new THREE.SpriteMaterial({map: legend.texture});
	var sprite = new THREE.Sprite(material);
	sprite.scale.set(material.map.image.width, material.map.image.height, 1);
	sprite.position.set(width / 2 + material.map.image.width / 2 - legend.width - 20, material.map.image.height / 2 - legend.height / 2, 0);
	sceneOrtho.add(sprite);
	return sceneOrtho;
};

var plot3d_compute_normals = function(geometry, normal_fun) {
	var normals = [];
	for (var v = 0; v < geometry.vertices.length; v++) {
		var vert = geometry.vertices[v];
		normals[v] = normal_fun(vert.x, vert.y);
	}
	for (var f = 0; f < geometry.faces.length; f++) {
		var face = geometry.faces[f];
		var vertex_normals = face.vertexNormals;
		vertex_normals[0] = normals[face.a].clone();
		vertex_normals[1] = normals[face.b].clone();
		vertex_normals[2] = normals[face.c].clone();

		var va = geometry.vertices[face.a];
		var vb = geometry.vertices[face.b];
		var vc = geometry.vertices[face.c];
		var xcent = (va.x + vb.x + vc.x) / 3, ycent = (va.y + vb.y + vc.y) / 3;

		face.normal.copy(normal_fun(xcent, ycent));
	}
	geometry.normalsNeedUpdate = true;
};

var new_plot3d_scene = function(plot) {
	var scene = new THREE.Scene();

	var zmin = plot.zlevels[0], zmax = plot.zlevels[plot.zlevels.length - 1];
	var zmin_apply = MYAPP.FLATTEN && function(z) { return zmin; };
	var zmin_pp_apply = MYAPP.FLATTEN && function(z) { return zmin + (zmax - zmin)*0.01; };

	if (plot.dataset && plot.show_points) {
		if (!MYAPP.FLATTEN) {
			var points = create_points(plot.dataset, plot.norm_matrix, 0x8888ff, zselect_dataset(plot.dataset, plot.plotting_columns));
			scene.add(points);
		}

		var proj = create_points(plot.dataset, plot.norm_matrix, 0x000000, zselect_proj(plot.dataset, plot.plotting_columns, plot.zfun, zmin_pp_apply));
		scene.add(proj);
	}

	var carrier = gen_carrier_geometry(plot, zmin - (zmax - zmin) / 3, zmin_apply);
	carrier.computeFaceNormals();
	carrier.computeVertexNormals();
	add_geometry_to_scene(plot, scene, carrier, 0xbbbbbb);

	var zlevels = plot.zlevels;
	var grid = new CONTOUR.Grid(plot.Nx, plot.Ny, plot.xygen, plot.zfun);
	grid.prepare(zlevels);
	for (var i = 0; i < zlevels.length; i++) {
		grid.cut_zlevel(zlevels[i], zlevels);
	}

	var z_unit_vector = new THREE.Vector3(0, 0, 1);
	var surf_normal_fun = MYAPP.FLATTEN ? function(x, y) { return z_unit_vector; } : plot.normal_fun;

	var colormap = get_colormap(zlevels.length - 1);
	for (var i = 0; i < zlevels.length - 1; i++) {
		var geometry = grid.select_zlevel(zlevels[i], zlevels[i+1], zlevels, zmin_apply);
		plot3d_compute_normals(geometry, surf_normal_fun);
		add_geometry_to_scene(plot, scene, geometry, colormap[i]);
	}

	add_pointlight(scene, 0x888888, new THREE.Vector3(1, 3, 5));
	add_pointlight(scene, 0x888888, new THREE.Vector3(-1, -3, 5));
	scene.add(new THREE.AmbientLight(0x333333));
	return scene;
};

var CAMERA_DIST = 1.85, CAMERA_ANGLE = 30 * Math.PI / 180;
var point_camera = function(scene) {
	if (MYAPP.FLATTEN) {
		camera.position.x = 0;
		camera.position.y = 0;
		camera.position.z = 1.5;
	} else {
		camera.position.x = 0;
		camera.position.y = - CAMERA_DIST * Math.cos(CAMERA_ANGLE);
		camera.position.z = + CAMERA_DIST * Math.sin(CAMERA_ANGLE);
	}
	camera.lookAt(scene.position);
};

var norm_find_scale = function(norm) {
    var v1 = norm(1, 1), v0 = norm(0, 0);
    var radius = 1 / (v1[0] - v0[0]);
    var x0 = -v0[0] * radius, y0 = -v0[1] * radius;
    return { x0: x0, y0: y0, radius: radius };
}

var new_plot = function(zfun, normal_fun, xy_norm, dataset, plotting_columns) {
	var Nx = 80, Ny = 80, Dx = 5, Dy = 5;

    var scale = norm_find_scale(xy_norm);

	var xyeval = function(i, j, action) {
        var x = -1 + 2 * i / Nx, y = -1 + 2 * j / Ny;
		var phi = Math.atan2(y, x);
		var cosphi = Math.max(Math.abs(Math.cos(phi)), Math.abs(Math.sin(phi)));
		return action((x * cosphi) * scale.radius + scale.x0, (y * cosphi) * scale.radius + scale.y0);
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
	var zunits = MYAPP.scale_units(zmin, zmax, ZLEVEL_NUMBER);
	var zdiv = zunits.div;
	var zindex1 = Math.floor(zmin / zdiv), zindex2 = Math.ceil(zmax / zdiv);
	if (zindex2 <= zindex1) zindex2 = zindex1 + 1;
	var zrange = (zindex2 - zindex1) * zdiv;

	var zlevels = [];
	for (var zi = zindex1; zi <= zindex2; zi++) { zlevels.push(zi * zdiv); }

	var xygen = function(i, j, zfun) {
		return xyeval(i, j, function(x, y) { return new THREE.Vector3(x, y, zfun(x, y)); });
	};

	var offset = new THREE.Matrix4().setPosition(new THREE.Vector3(-scale.x0, -scale.y0, -zmin));
	var Z_SHRINK_FACTOR = 3;
	var mat = new THREE.Matrix4().makeScale(1/scale.radius, 1/scale.radius, 1/(Z_SHRINK_FACTOR * zrange)).multiply(offset);

	var plot = {
		Nx: Nx,
		Ny: Ny,
		xygen: xygen,
		zfun: zfun,
		normal_fun: normal_fun,
		zlevels: zlevels,
		dataset: dataset,
		plotting_columns: plotting_columns,
		norm_matrix: mat,
		legend_format: zunits.format,
		show_points: document.getElementById("show-points-check").checked,
	};

	return plot;
};

// Setup the 3D and HUD scenes for the given plot.
var setup_plot_scene = function(plot) {
	MYAPP.scene = new_plot3d_scene(plot);
	var viewport = renderer.getSize();
	MYAPP.sceneHUD = plot3d_legend_scene(plot, viewport.width, viewport.height);
}

MYAPP.load_wafer_function = function(zfun, normal_fun, dataset, plotting_columns, xy_norm) {
	populate_data_grid(dataset, data_element);
	MYAPP.plot = new_plot(zfun, normal_fun, xy_norm, dataset, plotting_columns);
	setup_plot_scene(MYAPP.plot);
	render();
};

setup_cameras(viewport.width, viewport.height);

var zfun0 = function(x, y) { return 0; };
var normal_fun0 = function(x, y) {return new THREE.Vector3(0, 0, 1); };
var xy_norm0 = function(x, y) { return [x / 150, y / 150]; }
MYAPP.plot = new_plot(zfun0, normal_fun0, xy_norm0);
setup_plot_scene(MYAPP.plot);

point_camera(MYAPP.scene);

var render = function() {
	renderer.clear();
	renderer.render(MYAPP.scene, camera);
	renderer.clearDepth();
	if (MYAPP.sceneHUD) {
		renderer.render(MYAPP.sceneHUD, cameraOrtho);
	}
};

controls.addEventListener('change', render);

var onWindowResize = function() {
	var viewport = compute_area_size();
	setup_cameras(viewport.width, viewport.height);
	renderer.setSize(viewport.width, viewport.height);
	MYAPP.sceneHUD = plot3d_legend_scene(MYAPP.plot, viewport.width, viewport.height);
	render();
}

window.addEventListener('resize', onWindowResize)

var refresh_plot_options = function(plot) {
	plot.show_points = document.getElementById("show-points-check").checked;
}

var animate = function() {
	requestAnimationFrame(animate);
	controls.update();
}

var onChangePlotType = function(event) {
	MYAPP.FLATTEN = (event.target.value === "contour");
	setup_plot_scene(MYAPP.plot);
	point_camera(MYAPP.scene);
	render();
}

var sample_datasets = {
	dataset1: "examples/mesures-37pts-set3.csv",
	dataset2: "examples/Q527127_CMPSTI_SET1.csv",
	dataset3: "examples/RR_OX6000_POST.csv",
}

var onChangeDatasetExample = function(event) {
	var dataset = sample_datasets[event.target.value];
	if (dataset) {
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (xhttp.readyState == 4 && (xhttp.status == 200 || xhttp.status == 0)) {
				MYAPP.load_data_text(xhttp.responseText);
			}
		};
		xhttp.open("GET", dataset, true);
		xhttp.send();
	}
}

document.getElementById("plot_type_select").addEventListener("change", onChangePlotType);
document.getElementById("example_dataset_select").addEventListener("change", onChangeDatasetExample);
document.getElementById("show-points-check").addEventListener("change", function(event) {
	refresh_plot_options(MYAPP.plot);
	setup_plot_scene(MYAPP.plot);
	render();
});

render();
animate();
