'use strict'
const webpack = require('webpack');
const webpackConfig = require('./webpack.config');
const del = require('del');
const exec = require('child_process').exec;

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-copy');

  function dirFilter(dirsToFilter) {
    return (path) => {
      for (let dir of dirsToFilter) {
        if (path.startsWith(dir + '/') || path == dir) {
          return false;
        }
      }
      return true;
    }
  }
  
  grunt.initConfig({
    copy: {
      resources: {
        expand: true,
        cwd: 'web',
        src: '**',
        dest: 'dist/',
        filter: dirFilter(['web/app', 'web/test'])
      }
    }
  });
  
  grunt.registerTask('clean', function() {
    del.sync('dist');
  });

  grunt.registerTask('build', function() {
    const done = this.async();
    webpack(webpackConfig, function (error) {
      if (error) {
        console.log('webpack failed');
        console.log(error);
      }
      done();
    });
  });

  grunt.registerTask('show-revision', function() {
    const done = this.async();
    exec('git rev-parse --short HEAD', (err, stdout, stderr) => {
      grunt.log.writeln(stdout);
      done();
    });
  });

  grunt.registerTask('mark-revision', function() {
    const done = this.async();
    exec('mkdir -p dist && git rev-parse HEAD > dist/.rev', function (err, stdout, stderr) {
      done(err);
    });
  });
  
  grunt.registerTask('default', ['clean', 'build', 'copy:resources', 'mark-revision', 'show-revision']);
};