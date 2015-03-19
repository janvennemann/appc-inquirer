module.exports = function(grunt) {

	var tests = ['test/**/*_test.js'];

	// Project configuration.
	grunt.initConfig({
		mochaTest: {
			options: {
				timeout: 3000,
				reporter: 'spec',
				ignoreLeaks: false
			},
			src: tests
		},
		appcJs: {
			options: {
				force: false
			},
			src: ['interrogate.js', 'test/**/*.js']
		},
		kahvesi: { src: tests }
	});

	// Load grunt plugins for modules
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-appc-js');
	grunt.loadNpmTasks('grunt-kahvesi');

	// register tasks
	grunt.registerTask('cover', ['kahvesi']);
	grunt.registerTask('default', ['appcJs', 'mochaTest']);

};
