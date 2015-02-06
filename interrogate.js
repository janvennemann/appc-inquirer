var async = require('async'),
	inquirer = require('inquirer'),
	net = require('net');

module.exports = prompt;

function prompt(questions, opts, callback) {
	callback = arguments[arguments.length-1];
	if (!opts || isFunction(opts)) { opts = {}; }

	// ask our questions over a socket 
	if (opts.socket) {
		return new SocketPrompt(opts).prompt(questions, callback);
	} 

	// have inquirer handle questions via stdio
	else {
		return inquirer.prompt(questions, function(answers) {
			return callback(null, answers);
		});
	}
}

function SocketPrompt(opts) {
	this.host = opts.host || '127.0.0.1';
	this.port = opts.port || 22212;
}

SocketPrompt.prototype.prompt = function(questions, callback) {
	questions = !Array.isArray(questions) ? [questions] : questions;

	var client = net.connect({ 
		host: this.host,
		port: this.port 
	}), answers = {};

	async.series([

		// set up handlers for socket
		function(cb) {
			client.on('error', callback);
			client.on('connect', cb);
		},

		// send question, receive answer
		function(cb) {
			async.eachSeries(questions, function(q, done) {
				// when
				if (isFunction(q.when) && !q.when(answers)) { return done(); }

				// message, default, and choices can be a function
				if (isFunction(q.message)) { q.message = q.message(answers); }
				if (isFunction(q.default)) { q.default = q.default(answers); }
				if (isFunction(q.choices)) { q.choices = q.choices(answers); }

				// send question over socket
				client.write(JSON.stringify({
					type: 'question',
					question: q
				}));

				function waitForResponse() {
					client.once('data', function(answer) {
						// make sure we got JSON back
						try {
							answer = JSON.parse(answer);	
						} catch (e) {
							client.write(JSON.stringify({
								type: 'error',
								message: 'parse error: ' + e.message,
								question: q
							}));
							return waitForResponse();
						}

						// validate the answer
						if (isFunction(q.validate)) {
							var valid = q.validate(answer);
							if (valid !== true) {
								client.write(JSON.stringify({
									type: 'error',
									message: 'validate error: ' + (valid || 'invalid value for ' + q.name ),
									question: q
								}));
								return waitForResponse();
							}
						}

						// filter
						if (isFunction(q.filter)) {
							answer = q.filter(answer);
						}

						// save answer
						answers[q.name] = answer;
						return done();
					});
				}

				return waitForResponse();
			}, cb);
		}
	], function(err) {
		client.end();
		return callback(err, answers);
	});
};

function isFunction(o) {
	return o && Object.prototype.toString.call(o) === '[object Function]';
}
