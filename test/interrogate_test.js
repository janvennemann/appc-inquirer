var _ = require('lodash'), 
	async = require('async'),
	net = require('net'),
	prompt = require('..'), 
	should = require('should');

var DEFAULT_PORT = 22212;
var BASIC = {
	type: 'input',
	name: 'basic',
	message: 'gimme test'
};
var COMPLEX = {
	type: 'input',
	name: 'complex',
	message: 'gimme test',
	default: function(answers) {
		return 'defaultcomplex';
	},
	validate: function(answer) {
		return answer === 'test' || answer === 'defaultcomplex';
	},
	filter: function(answer) {
		return answer.toUpperCase();
	},
	when: function(answers) {
		return true;
	}
};
var LIST = {
	type: 'list',
	name: 'list',
	message: function(answers) {
		return 'list';
	},
	default: 'answer2_value',
	choices: function(answers) {
		return [
			{ name: 'answer1_name', value: 'answer1_value' },
			{ name: 'answer2_name', value: 'answer2_value' },
			{ name: 'answer3_name', value: 'answer3_value' }
		];
	}
};
var OMIT_PROPS = ['validate','filter','when','choices'];

describe('prompt', function() {

	it('exposes prompt()', function() {
		should.exist(prompt);
		prompt.should.be.a.Function;
	});

	it('gets user input via command line', function(done) {
		var val = 'workit';
		prompt([BASIC], function(err, answers) {
			should.not.exist(err);
			answers.should.be.an.Object;
			answers.basic.should.equal(val);
			return done();
		});

		setTimeout(function() {
			process.stdin.emit('data', val + '\n');
		}, 200);
	});

	it('gets user input via socket', function(done) {
		var val = 'workit';

		var server = net.createServer(function(c) {
			c.once('data', function(data) {
				server.close();
				(function() {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(BASIC);
				c.write(JSON.stringify(val));
			});
		});
		server.listen(DEFAULT_PORT, function() {
			prompt([BASIC], {socket:true}, function(err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('gets user input via socket with single question', function(done) {
		var val = 'workit';

		var server = net.createServer(function(c) {
			c.once('data', function(data) {
				server.close();
				(function() {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(BASIC);
				c.write(JSON.stringify(val));
			});
		});
		server.listen(DEFAULT_PORT, function() {
			prompt(BASIC, {socket:true}, function(err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('gets user input via socket with complex question', function(done) {
		var server = net.createServer(function(c) {
			c.once('data', function(data) {
				server.close();
				(function() {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(_.omit(COMPLEX, OMIT_PROPS));
				c.write(JSON.stringify('defaultcomplex'));
			});
		});
		server.listen(DEFAULT_PORT, function() {
			prompt([COMPLEX], {socket:true}, function(err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.complex.should.equal('DEFAULTCOMPLEX');
				return done();
			});
		});
	});

	it('skips questions that fail when() checks', function(done) {
		var question = _.clone(BASIC);
		question.when = function(answers) {
			return false;
		};

		var server = net.createServer(function(c) {
			server.close();
		});
		server.listen(DEFAULT_PORT, function() {
			prompt(question, {socket:true}, function(err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.should.be.empty;
				return done();
			});
		});
	});

	it('gets user input via socket with complex lists', function(done) {
		var server = net.createServer(function(c) {
			c.once('data', function(data) {
				server.close();
				(function() {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(_.omit(LIST, OMIT_PROPS));

				for (var i = 0; i < data.question.choices.length; i++) {
					var choice = data.question.choices[i];
					choice.should.be.an.Object;
					choice.name.should.equal('answer' + (i+1) + '_name');
					choice.value.should.equal('answer' + (i+1) + '_value');
				}

				c.write(JSON.stringify('answer2_value'));
			});
		});
		server.listen(DEFAULT_PORT, function() {
			prompt([LIST], {socket:true}, function(err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.list.should.equal('answer2_value');
				return done();
			});
		});
	});

	it('resends question when it receives bad response JSON', function(done) {
		var val = 'workit';

		var server = net.createServer(function(c) {

			// handle initial question
			c.once('data', function(data) {
				(function() {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(BASIC);

				// send bad JSON as response
				c.write(JSON.stringify(val) + '}}');

				// handle error response, try again
				c.once('data', function(data) {
					server.close();
					(function() {
						data = JSON.parse(data.toString());
					}).should.not.throw();
					data.should.be.an.Object;
					data.type.should.equal('error');
					data.message.should.match(/parse error/);
					data.question.should.be.an.Object;
					data.question.should.have.properties(BASIC);

					// send good JSON this time
					c.write(JSON.stringify(val));
				});
			});
		});
		server.listen(DEFAULT_PORT, function() {
			prompt(BASIC, {socket:true}, function(err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('resends question when answer fails validation (default message)', function(done) {
		var val = 'workit', 
			question = _.clone(BASIC);
		question.validate = function(answer) {
			return answer === val;
		};

		var server = net.createServer(function(c) {

			// handle initial question
			c.once('data', function(data) {
				(function() {
					data = JSON.parse(data.toString());
				}).should.not.throw();
				data.should.be.an.Object;
				data.type.should.equal('question');
				data.question.should.be.an.Object;
				data.question.should.have.properties(_.omit(question, OMIT_PROPS));

				// send bad JSON as response
				c.write(JSON.stringify(val + '}}'));

				// handle error response, try again
				c.once('data', function(data) {
					server.close();
					(function() {
						data = JSON.parse(data.toString());
					}).should.not.throw();
					data.should.be.an.Object;
					data.type.should.equal('error');
					data.message.should.match(/validate error/);
					data.question.should.be.an.Object;
					data.question.should.have.properties(_.omit(question, OMIT_PROPS));

					// send good JSON this time
					c.write(JSON.stringify(val));
				});
			});
		});
		server.listen(DEFAULT_PORT, function() {
			prompt(question, {socket:true}, function(err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.basic.should.equal(val);
				return done();
			});
		});
	});

	it('handles many questions, with validation failures', function(done) {
		var val = 'workit';
		var questions = [
			{
				type: 'input',
				name: 'q1'
			},
			{
				type: 'list',
				name: 'q2',
				message: function(answers) {
					return 'q2 for ' + answers.q1;
				},
				default: '3',
				choices: ['1','2','3','4'],
				filter: function(answer) {
					return 'answer' + answer;
				}
			},
			{
				type: 'checkbox',
				name: 'q3',
				choices: [
					{ name: 'a1', value: 'v1', checked: true },
					{ name: 'a2', value: 'v2', checked: false },
					{ name: 'a3', value: 'v3', checked: true },
					{ name: 'a4', value: 'v4', checked: false }
				]
			},
			{
				type: 'input',
				name: 'q4',
				validate: function(answer) {
					return answer === val ? true : 'failed!!!';
				}
			},
			{
				type: 'confirm',
				name: 'q5',
				default: true
			}
		];

		var server = net.createServer(function(c) {
			c.on('data', function(data) {
				(function() { data = JSON.parse(data.toString()); }).should.not.throw();
				data.should.be.an.Object;
				if (data.type === 'error') { return; }

				switch (data.question.name) {
					case 'q1':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[0], OMIT_PROPS));
						c.write(JSON.stringify('answer#1'));
						break;
					case 'q2':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[1], OMIT_PROPS));
						c.write(JSON.stringify('2'));
						break;
					case 'q3':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[2], OMIT_PROPS));
						c.write(JSON.stringify(['v1','v3']));
						break;
					case 'q4':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[3], OMIT_PROPS));
						c.write(JSON.stringify(val + '!!!!'));

						c.once('data', function(data) {
							(function() { data = JSON.parse(data.toString()); }).should.not.throw();
							data.type.should.equal('error');
							data.message.should.match(/failed!!!/);
							data.question.should.have.properties(_.omit(questions[3], OMIT_PROPS));
							c.write(JSON.stringify(val));
						});
						break;
					case 'q5':
						data.type.should.equal('question');
						data.question.should.have.properties(_.omit(questions[4], OMIT_PROPS));
						c.write(JSON.stringify(true));
						break;
				}
			});
		});

		server.listen(9374, function() {
			prompt(questions, {socket:true, port:9374}, function(err, answers) {
				should.not.exist(err);
				answers.should.be.an.Object;
				answers.q1.should.equal('answer#1');
				answers.q2.should.equal('answer2');
				answers.q3.should.eql(['v1','v3']);
				answers.q4.should.equal(val);
				answers.q5.should.be.true;
				server.close();
				return done();
			});
		});
	});

});
