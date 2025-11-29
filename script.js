import * as THREE from 'three';

import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// 1. Change 'const table' to 'let table' and make it empty initially
let table = [];

/* 
// ...existing code... (The hardcoded array is removed/commented out to save space)
*/

let camera, scene, renderer;
let controls;

const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

// 2. Instead of calling init() directly, we call our loader function
// init();
// animate();
loadTableData();

// 3. Add this function to fetch data from Google Sheets
async function loadTableData() {
	// PASTE YOUR GOOGLE SHEET CSV LINK HERE
	const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSV8kUvF5rAQ0m3F22tp6WQl2vh3l3Qge3CBSicQPWuXedQ3P0hfVxHDIL8RipcLW5HdTXTWGY9U-9z/pub?output=csv';

	try {

		const response = await fetch(url);
		const text = await response.text();

		// Split text by new line to get rows
		const rows = text.split(/\r?\n/);

		let itemIndex = 0;
		for (let i = 1; i < rows.length; i++) {

			// Parse CSV line handling quotes
			const row = [];
			let inQuote = false;
			let currentVal = '';
			for (let j = 0; j < rows[i].length; j++) {
				const char = rows[i][j];
				if (char === '"') {
					inQuote = !inQuote;
				} else if (char === ',' && !inQuote) {
					row.push(currentVal.replace(/^"|"$/g, '').replace(/""/g, '"'));
					currentVal = '';
				} else {
					currentVal += char;
				}
			}
			row.push(currentVal.replace(/^"|"$/g, '').replace(/""/g, '"'));

			// We need at least 6 columns: Name, URL, Age, Country, Interest, NetWorth
			if (row.length >= 6) {
				// Calculate grid position (18 columns wide)
				const col = (itemIndex % 18) + 1;
				const rowPos = Math.floor(itemIndex / 18) + 1;

				// Push data into the flat array structure expected by Three.js
				table.push(row[0]);                  // 0: Name (preserve space)
				table.push(row[3].trim());           // 1: Country
				table.push(row[4].trim());           // 2: Interest
				table.push(col);                     // 3: Col
				table.push(rowPos);                  // 4: Row
				table.push(row[1].trim());           // 5: URL Photo
				table.push(parseInt(row[2]));        // 6: Age
				table.push(row[5].trim());           // 7: Net Worth

				itemIndex++;
			}
		}

		// Once data is loaded, start the app
		init();
		animate();

	} catch (error) {
		console.error('Error loading sheet:', error);
	}
}

function init() {

	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 3000;

	scene = new THREE.Scene();

	// table

	for (let i = 0; i < table.length; i += 8) {

		const element = document.createElement('div');
		element.className = 'element';
		
		// Determine color based on Net Worth (table[i + 7])
		// You can adjust these thresholds as needed
		const netWorth = parseFloat(table[i + 7].replace(/[$,]/g, ""));
		
		// Default background color logic (can be overridden or combined with border colors)
		// element.style.backgroundColor = 'rgba(0,127,127,' + (Math.random() * 0.5 + 0.25) + ')';
		
		if (netWorth < 100000) { // Example: Less than 1M
			element.classList.add('red');
			element.style.backgroundColor = 'rgba(239, 48, 34, 0.5)';
		} else if (netWorth < 200000) { // Example: Less than 10M
			element.classList.add('yellow');
			element.style.backgroundColor = 'rgba(253, 202, 53, 0.5)';
		} else { // 10M+
			element.classList.add('green');
			element.style.backgroundColor = 'rgba(58, 159, 72, 0.5)';
		}

		const number = document.createElement('div');
		number.className = 'number';
		number.textContent = table[i + 6]; // Age
		element.appendChild(number);

		const country = document.createElement('div');
		country.className = 'country';
		country.textContent = table[i + 1]; // Country
		element.appendChild(country);

		const name = document.createElement( 'div' );
		name.className = 'name';
		name.textContent = table[ i ]; // Name
		element.appendChild( name );

		const details = document.createElement( 'div' );
		details.className = 'details';
		details.innerHTML = table[ i + 2 ]; // Interest
		element.appendChild( details );

		if ( table[ i + 5 ] ) {
			const photo = document.createElement( 'div' );
			photo.className = 'photo';
			const img = document.createElement( 'img' );
			img.src = table[ i + 5 ];
			photo.appendChild( img );
			element.appendChild( photo );
		}

		const objectCSS = new CSS3DObject(element);
		objectCSS.position.x = Math.random() * 4000 - 2000;
		objectCSS.position.y = Math.random() * 4000 - 2000;
		objectCSS.position.z = Math.random() * 4000 - 2000;
		scene.add(objectCSS);

		objects.push(objectCSS);

		//

		const object = new THREE.Object3D();
		object.position.x = (table[i + 3] * 140) - 1330;
		object.position.y = - (table[i + 4] * 180) + 990;

		targets.table.push(object);

	}

	// sphere

	const vector = new THREE.Vector3();

	for (let i = 0, l = objects.length; i < l; i++) {

		const phi = Math.acos(- 1 + (2 * i) / l);
		const theta = Math.sqrt(l * Math.PI) * phi;

		const object = new THREE.Object3D();

		object.position.setFromSphericalCoords(800, phi, theta);

		vector.copy(object.position).multiplyScalar(2);

		object.lookAt(vector);

		targets.sphere.push(object);

	}

	// helix

	for (let i = 0, l = objects.length; i < l; i++) {

		const object = new THREE.Object3D();

		// Double Helix: Pair items at the same height, opposite sides
		const row = Math.floor(i / 2);
		const col = i % 2;

		const theta = row * 0.2 + Math.PI + (col * Math.PI);
		const y = - (row * 40) + 450; // Change 15 to adjust vertical spacing (height of cylinder)

		object.position.setFromCylindricalCoords(900, theta, y); // Change 900 to adjust radius (width of cylinder)

		vector.x = object.position.x * 2;
		vector.y = object.position.y;
		vector.z = object.position.z * 2;

		object.lookAt(vector);

		targets.helix.push(object);

	}

	// grid

	for (let i = 0; i < objects.length; i++) {

		const object = new THREE.Object3D();

		// Grid Configuration
		const cols = 5; // Number of columns
		const rows = 4; // Number of rows per layer

		object.position.x = ((i % cols) * 400) - 800;
		object.position.y = (- (Math.floor(i / cols) % rows) * 400) + 800;
		object.position.z = (Math.floor(i / (cols * rows))) * 1000 - 2000;

		targets.grid.push(object);

	}

	//

	renderer = new CSS3DRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.getElementById('container').appendChild(renderer.domElement);

	//

	controls = new TrackballControls(camera, renderer.domElement);
	controls.minDistance = 500;
	controls.maxDistance = 6000;
	controls.addEventListener('change', render);

	const buttonTable = document.getElementById('table');
	buttonTable.addEventListener('click', function () {

		transform(targets.table, 2000);

	});

	const buttonSphere = document.getElementById('sphere');
	buttonSphere.addEventListener('click', function () {

		transform(targets.sphere, 2000);

	});

	const buttonHelix = document.getElementById('helix');
	buttonHelix.addEventListener('click', function () {

		transform(targets.helix, 2000);

	});

	const buttonGrid = document.getElementById('grid');
	buttonGrid.addEventListener('click', function () {

		transform(targets.grid, 2000);

	});

	transform(targets.table, 2000);

	//

	window.addEventListener('resize', onWindowResize);

}

function transform(targets, duration) {

	TWEEN.removeAll();

	for (let i = 0; i < objects.length; i++) {

		const object = objects[i];
		const target = targets[i];

		new TWEEN.Tween(object.position)
			.to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();

		new TWEEN.Tween(object.rotation)
			.to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();

	}

	new TWEEN.Tween(this)
		.to({}, duration * 2)
		.onUpdate(render)
		.start();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

	render();

}

function animate() {

	requestAnimationFrame(animate);

	TWEEN.update();

	controls.update();

}

function render() {

	renderer.render(scene, camera);

}

