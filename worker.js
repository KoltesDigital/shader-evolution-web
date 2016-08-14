importScripts('shader-evolution.min.js');

(function() {
	'use strict';

	var populationCount = 10;

	var coefficients = {
		bestConnectionProbability: 0.8,
		distanceDisjoint: 1,
		distanceExcess: 1,
		distanceWeightDifference: 0.1,
		interspeciesMateProbability: 0.01,
		maximumRankings: 20,
		mutateWeightAddCoefficient: 0.1,
		mutateWeightMultiplyCoefficient: 0.1,
		newConnectionProbability: 0.1,
		newNodeProbability: 0.1,
		selectionCoefficient: 0.9,
		speciesDistanceExponent: 1,
		speciesDistanceThreshold: 10,
		weightMutationProbability: 0.1,
	};

	var biasNodeIndexByType = {
		float: 1,
		vec2: 2,
		vec3: 3,
		vec4: 4,
	};

	function Texture2DNode() {
		this.outType = 'vec3';
		this.inTypes = ['vec2'];
	}

	Texture2DNode.prototype.getInTypes = function() {
		return this.inTypes;
	};

	Texture2DNode.prototype.getOutType = function() {
		return this.outType;
	};

	Texture2DNode.prototype.toString = function(parameters) {
		return 'texture2D(uSampler,mod(' + parameters[0] + ',1.0)).rgb';
	};

	function createGenome() {
		var genome = new shaderEvolution.Genome();
		genome.addNode(new shaderEvolution.OutNode('vec3'));
		genome.addNode(new shaderEvolution.InNode('1.0', 'float'));
		genome.addNode(new shaderEvolution.InNode('vec2(1.0)', 'vec2'));
		genome.addNode(new shaderEvolution.InNode('vec3(1.0)', 'vec3'));
		genome.addNode(new shaderEvolution.InNode('vec4(1.0)', 'vec4'));
		genome.addNode(new shaderEvolution.InNode('uTime', 'float'));
		genome.addNode(new shaderEvolution.InNode('gl_FragCoord.xy/uResolution * vec2(1.0, -1.0) + vec2(0.0, 1.0)', 'vec2'));
		genome.addNode(new shaderEvolution.FunctionCallNode('mat3', 'mat3', ['float', 'float', 'float', 'float', 'float', 'float', 'float', 'float', 'float']));
		genome.addNode(new shaderEvolution.FunctionCallNode('vec3', 'vec3', ['vec2', 'float']));
		genome.addNode(new shaderEvolution.BinaryOperatorNode('*', 'vec3', ['mat3', 'vec3']));
		genome.addNode(new shaderEvolution.MemberNode('xy', 'vec2', 'vec3'));
		genome.addNode(new Texture2DNode());
		genome.addNode(new shaderEvolution.FunctionCallNode('mat3', 'mat3', ['float', 'float', 'float', 'float', 'float', 'float', 'float', 'float', 'float']));
		genome.addNode(new shaderEvolution.BinaryOperatorNode('*', 'vec3', ['mat3', 'vec3']));
		genome.addNode(new shaderEvolution.FunctionCallNode('snoise', 'float', ['vec2']));
		genome.addNode(new shaderEvolution.FunctionCallNode('snoise', 'float', ['vec2']));
		genome.addNode(new shaderEvolution.FunctionCallNode('vec2', 'vec2', ['float', 'float']));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 7, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 7, 1, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 7, 2, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 7, 3, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 7, 4, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 7, 5, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 7, 6, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 7, 7, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 7, 8, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 6, 8, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 6, 14, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 6, 15, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 5, 16, 0, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 14, 16, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 5, 16, 1, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 15, 16, 1, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 16, 8, 0, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 8, 1, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 7, 9, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 8, 9, 1, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 9, 10, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 10, 11, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 12, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 12, 1, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 12, 2, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 12, 3, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 12, 4, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 12, 5, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 12, 6, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 12, 7, 0));
		genome.addConnection(new shaderEvolution.Connection(0, 1, 12, 8, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 12, 13, 0, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 11, 13, 1, 1));
		genome.addConnection(new shaderEvolution.Connection(0, 13, 0, 0, 1));
		return genome;
	}

	var templates = [];

	function f(factor, name, outType, inTypes) {
		inTypes.forEach(function(inType, inIndex) {
			templates.push(new shaderEvolution.Template(factor, inType, outType, function(genome, innovation) {
				var nodeIndex = genome.addNode(new shaderEvolution.FunctionCallNode(name, outType, inTypes));
				inTypes.forEach(function(type, index) {
					if (index !== inIndex)
						genome.addConnection(new shaderEvolution.Connection(innovation, biasNodeIndexByType[type], nodeIndex, index, 0));
				});
				return [nodeIndex, inIndex, nodeIndex];
			}));
		});
	}

	function op(factor, name, outType, inTypes) {
		inTypes.forEach(function(inType, inIndex) {
			templates.push(new shaderEvolution.Template(factor, inType, outType, function(genome, innovation) {
				var nodeIndex = genome.addNode(new shaderEvolution.BinaryOperatorNode(name, outType, inTypes));
				inTypes.forEach(function(type, index) {
					if (index !== inIndex)
						genome.addConnection(new shaderEvolution.Connection(innovation, biasNodeIndexByType[type], nodeIndex, index, 0));
				});
				return [nodeIndex, inIndex, nodeIndex];
			}));
		});
	}

	['float', 'vec2', 'vec3', 'vec4'].forEach(function(type) {
		// f(1, 'radians', type, [type]);
		// f(1, 'degrees', type, [type]);
		f(10, 'sin', type, [type]);
		f(10, 'cos', type, [type]);
		f(2, 'tan', type, [type]);
		f(2, 'asin', type, [type]);
		f(2, 'acos', type, [type]);
		f(1, 'atan', type, [type, type]);
		f(1, 'atan', type, [type]);
		f(2, 'pow', type, [type, type]);
		f(5, 'exp', type, [type]);
		f(5, 'log', type, [type]);
		//f(2, 'exp2', type, [type]);
		//f(2, 'log2', type, [type]);
		//f(3, 'sqrt', type, [type]);
		//f(1, 'inversesqrt', type, [type]);
		f(4, 'abs', type, [type]);
		f(1, 'sign', type, [type]);
		f(2, 'floor', type, [type]);
		f(1, 'ceil', type, [type]);
		f(1, 'fract', type, [type]);
		f(8, 'mod', type, [type, type]);
		f(1, 'min', type, [type, type]);
		f(1, 'max', type, [type, type]);
		f(1, 'clamp', type, [type, type, type]);
		f(5, 'mix', type, [type, type, type]);
		f(2, 'step', type, [type, type]);
		f(2, 'smoothstep', type, [type, type, type]);
		f(7, 'length', 'float', [type]);
		f(1, 'distance', 'float', [type, type]);
		f(1, 'dot', 'float', [type, type]);
		f(1, 'normalize', type, [type]);
		f(1, 'faceforward', type, [type, type, type]);
		f(1, 'reflect', type, [type, type]);
		f(1, 'refract', type, [type, type, 'float']);

		op(1, '*', type, [type, type]);
		op(1, '/', type, [type, type]);
	});

	['vec2', 'vec3', 'vec4'].forEach(function(type) {
		f(8, 'mod', type, [type, 'float']);
		f(1, 'min', type, [type, 'float']);
		f(1, 'max', type, [type, 'float']);
		f(1, 'clamp', type, [type, 'float', 'float']);
		f(5, 'mix', type, [type, type, 'float']);
		f(2, 'step', type, ['float', type]);
		f(2, 'smoothstep', type, ['float', 'float', type]);

		op(1, '*', type, [type, 'float']);
		op(1, '/', type, [type, 'float']);
	});

	f(1, 'cross', 'vec3', ['vec3', 'vec3']);

	f(20, 'snoise', 'float', ['vec2']);

	f(1, 'vec2', 'vec2', ['float']);
	f(1, 'vec2', 'vec2', ['float', 'float']);

	f(1, 'vec3', 'vec3', ['float']);
	f(1, 'vec3', 'vec3', ['float', 'float', 'float']);
	f(1, 'vec3', 'vec3', ['vec2', 'float']);
	f(1, 'vec3', 'vec3', ['float', 'vec2']);

	f(1, 'vec4', 'vec4', ['float']);
	f(1, 'vec4', 'vec4', ['float', 'float', 'float', 'float']);
	f(1, 'vec4', 'vec4', ['vec2', 'float', 'float']);
	f(1, 'vec4', 'vec4', ['float', 'vec2', 'float']);
	f(1, 'vec4', 'vec4', ['float', 'float', 'vec2']);
	f(1, 'vec4', 'vec4', ['vec2', 'vec2']);
	f(1, 'vec4', 'vec4', ['vec3', 'float']);
	f(1, 'vec4', 'vec4', ['float', 'vec3']);

	f(1, 'mat3', 'mat3', ['float']);
	f(1, 'mat3', 'mat3', ['vec3', 'vec3', 'vec3']);
	f(1, 'mat3', 'mat3', ['float', 'float', 'float', 'float', 'float', 'float', 'float', 'float', 'float']);

	function m(factor, name, outType, inType) {
		templates.push(new shaderEvolution.Template(factor, inType, outType, function(genome) {
			var nodeIndex = genome.addNode(new shaderEvolution.MemberNode(name, outType, inType));
			return [nodeIndex, 0, nodeIndex];
		}));
	}

	function diff(a, b) {
		return (a !== b ? 1 : 0);
	}

	function mvec(array, type) {
		array.forEach(function(s0) {
			var f0 = 0.01;
			m(f0, s0, 'float', type);
			array.forEach(function(s1) {
				var f1 = f0 + 0.1 * diff(s0, s1);
				m(f1, s0 + s1, 'vec2', type);
				array.forEach(function(s2) {
					var f2 = f1 + 0.1 * (diff(s0, s2) + diff(s1, s2));
					m(f2, s0 + s1 + s2, 'vec3', type);
					array.forEach(function(s3) {
						var f3 = f2 + 0.1 * (diff(s0, s3) + diff(s1, s3) + diff(s2, s3));
						m(f3, s0 + s1 + s2 + s3, 'vec4', type);
					});
				});
			});
		});
	}

	['vec2', 'vec3', 'vec4'].forEach(function(type) {
		mvec(['x', 'y'], type);
	});

	['vec3', 'vec4'].forEach(function(type) {
		mvec(['x', 'y', 'z'], type);
	});

	mvec(['x', 'y', 'z', 'w'], 'vec4');

	function arr(factor, index, outType, inType) {
		templates.push(new shaderEvolution.Template(factor, inType, outType, function(genome) {
			var nodeIndex = genome.addNode(new shaderEvolution.ArrayAccessNode(index, outType, inType));
			return [nodeIndex, 0, nodeIndex];
		}));
	}

	for (var i = 0; i < 3; ++i)
		arr(0.1, i, 'vec3', 'mat3');

	op(10, '*', 'vec3', ['mat3', 'vec3']);

	var algorithm;
	var awaitingGenome;

	function await(genome) {
		if (awaitingGenome === null) {
			awaitingGenome = genome;
			var shader = genome.toShader().join('\n');
			postMessage(['ranking', shader]);
		}
	}

	function start() {
		algorithm = new shaderEvolution.Algorithm(coefficients, templates, populationCount);

		setInterval(function() {
			if (awaitingGenome)
				return;

			algorithm.evolve();

			if (algorithm.awaitingRankings.length > 0) {
				await(algorithm.awaitingRankings[0]);
			}
/*
			if (algorithm.genomes.length > 0) {
				console.log(algorithm.genomes.map(function(genome) {
					return genome.fitness;
				}));
				console.log(algorithm.genomes.length, algorithm.genomes.reduce(function(sum, genome) {
					return algorithm.genomes.reduce(function(sum, genomeB) {
						return sum + algorithm.getDistance(genome, genomeB);
					}, sum);
				}, 0) / algorithm.genomes.length);
				console.log(algorithm.genomes[0].connections.length, algorithm.getSharing(algorithm.genomes[0], algorithm.rankings[0].genome));
			}*/
		}, 0);
	}

	self.onmessage = function(event) {
		switch (event.data[0]) {
			case 'create':
				awaitingGenome = null;
				start();
				algorithm.awaitingRankings.push(createGenome());
				break;

			case 'ranking':
				if (awaitingGenome) {
					algorithm.addRanking(new shaderEvolution.Ranking(awaitingGenome, event.data[1]));
					awaitingGenome = null;
				}
				break;
		}
	};
})();
