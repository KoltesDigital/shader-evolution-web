(function() {
	'use strict';

	if (!window.Worker) {
		alert('Your browser does not support WebGL.');
		return;
	}

	var canvas = document.getElementById('canvas');
	var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser may not support it.');
		return;
	}

	var width, height;

	function onWindowResize() {
		width = window.innerWidth;
		height = window.innerHeight;

		canvas.width = width;
		canvas.height = height;

		gl.viewport(0, 0, width, height);
	}

	window.addEventListener('resize', onWindowResize);
	onWindowResize();

	function cancelEvent(e) {
		e.stopPropagation();
		e.preventDefault();
	}

	gl.activeTexture(gl.TEXTURE0);

	var imageTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, imageTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	var html = document.documentElement;

	html.addEventListener('dragover', cancelEvent, false);
	html.addEventListener('dragenter', cancelEvent, false);
	html.addEventListener('drop', function(event) {
		var messageElement = document.getElementById('message');
		if (messageElement)
			messageElement.remove();
			
		if (event.preventDefault) event.preventDefault();
		if (event.dataTransfer.files.length > 0) {
			var file = event.dataTransfer.files[0];
			var reader = new FileReader();
			reader.onload = function(e) {
				var image = document.createElement('img');
				image.onload = function() {
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
				};
				image.src = e.target.result;
			};
			reader.readAsDataURL(file);
		}
		return false;
	}, false);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	var squareVerticesBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);

	var vertices = [
		 1.0,	 1.0,
		-1.0,	 1.0,
		 1.0,	-1.0,
		-1.0,	-1.0,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	function compileShader(type, source) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
			return;
		}
		return shader;
	}

	var vertexShader = compileShader(gl.VERTEX_SHADER, [
		'attribute vec2 aVertexPosition;',
		'void main(void) {',
			'gl_Position = vec4(aVertexPosition, 0.0, 1.0);',
		'}',
	].join(''));

	function useProgram(fragmentShaderSource) {
		var fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

		var shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(shaderProgram));
			return;
		}

		gl.useProgram(shaderProgram);

		var vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
		gl.enableVertexAttribArray(vertexPositionAttribute);
		gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

		gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

		return shaderProgram;
	}

	var worker = new Worker('worker.js');

	var requestId = 0;
	var showingShader = false;
	var startTime;

	function showShader(fragmentShaderSource) {
		console.log(fragmentShaderSource);
		var shaderProgram = useProgram([
			'precision mediump float;',
			'uniform vec2 uResolution;',
			'uniform float uTime;',
			'uniform sampler2D uSampler;',
			'vec3 mod289(vec3 x) {',
				'return x - floor(x * (1.0 / 289.0)) * 289.0;',
			'}',
			'vec2 mod289(vec2 x) {',
				'return x - floor(x * (1.0 / 289.0)) * 289.0;',
			'}',
			'vec3 permute(vec3 x) {',
				'return mod289(((x*34.0)+1.0)*x);',
			'}',
			'float snoise(vec2 v)',
			'{',
				'const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0',
				'0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)',
				'-0.577350269189626,  // -1.0 + 2.0 * C.x',
				'0.024390243902439); // 1.0 / 41.0',
				'vec2 i  = floor(v + dot(v, C.yy) );',
				'vec2 x0 = v -   i + dot(i, C.xx);',
				'vec2 i1;',
				'i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
				'vec4 x12 = x0.xyxy + C.xxzz;',
				'x12.xy -= i1;',
				'i = mod289(i); // Avoid truncation effects in permutation',
				'vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))',
				'+ i.x + vec3(0.0, i1.x, 1.0 ));',
				'vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
				'm = m*m ;',
				'm = m*m ;',
				'vec3 x = 2.0 * fract(p * C.www) - 1.0;',
				'vec3 h = abs(x) - 0.5;',
				'vec3 ox = floor(x + 0.5);',
				'vec3 a0 = x - ox;',
				'm *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );',
				'vec3 g;',
				'g.x  = a0.x  * x0.x  + h.x  * x0.y;',
				'g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
				'return 130.0 * dot(m, g);',
			'}',
			'void main(void) {',
				fragmentShaderSource,
				'gl_FragColor = vec4(_0, 1.0);',
			'}',
		].join('\n'));

		if (!shaderProgram)
			return;

		var uResolution = gl.getUniformLocation(shaderProgram, 'uResolution');
		gl.uniform2f(uResolution, width, height);

		function render() {
			requestId = requestAnimationFrame(render);

			var time = (Date.now() - startTime) * 0.001;

			var uTime = gl.getUniformLocation(shaderProgram, 'uTime');
			gl.uniform1f(uTime, time);

			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}

		showingShader = true;
		startTime = Date.now();
		requestId = requestAnimationFrame(render);
	}

	function rank(fitness) {
		showingShader = false;
		cancelAnimationFrame(requestId);
		worker.postMessage(['ranking', fitness]);
	}

	addEventListener('keydown', function(event) {
		if (showingShader) {
			if (event.which >= 49 && event.which <= 57)
				rank(event.which - 48);
			if (event.which >= 97 && event.which <= 105)
				rank(event.which - 96);
		}
	}, false);

	worker.onmessage = function(event) {
		switch (event.data[0]) {
			case 'ranking':
				showShader(event.data[1]);
				break;
		}
	};

	worker.postMessage(['create']);
})();
