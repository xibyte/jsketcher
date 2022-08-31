'use strict'
const webpack = require('webpack');
const webpackConfig = require('./webpack.config');
const del = require('del');
const libAssets = require("./build/libAssets");
const glob = require("glob");
const {marked} = require("marked");
const Handlebars = require("handlebars");
const exec = require('child_process').exec;

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');

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

  let DOCS_PATTERN = '*/features/*/docs/**';
  grunt.initConfig({
    watch: {
      docs: {
        files: ['modules/workbenches/' + DOCS_PATTERN],
        tasks: ['gen-docs']
      }
    },

    copy: {

      lib_assets: {
        files: libAssets.map(asset => ({
          expand: true,
          cwd: 'node_modules',
          src: asset, //path.join('node_modules', asset),
          dest: `dist/lib-assets/`
        }))
      },

      resources: {
          expand: true,
          cwd: 'web',
          src: '**',
          dest: 'dist/',
          filter: dirFilter(['web/app', 'web/test'])
      },

      docs: {
        cwd: 'modules/workbenches',
        src: DOCS_PATTERN,
        dest: 'web/docs',
        expand: true
      },
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

  grunt.registerTask('default', ['clean', 'build', 'copy:resources', 'copy:lib_assets', 'gen-docs', 'mark-revision', 'show-revision']);

  grunt.registerTask('gen-docs', ['copy:docs', 'process-markdown']);

  grunt.registerTask('process-markdown', function() {
    const done = this.async();

    const mainTemplate = Handlebars.compile(grunt.file.read("modules/doc/doc-layout.handlebars"));

    glob("web/docs/**/*.md", function (er, files) {


      const workbenches = new Map();
      files.forEach(file => {

        const parts = file.split('/');

        const workbenchName = parts[2];
        const operationName = parts[4];
        let workbench = workbenches.get(workbenchName);
        if (!workbench) {
          workbench = {
            workbenchName,
            operations: []
          };
          workbenches.set(workbenchName, workbench);
        }
        let link = file.substring(file.indexOf('/') + 1); //drop web prefix
        workbench.operations.push({
          operationName,
          href: '../../../../../../'  + convertMdPathToHtml(link)
        });
      });

      const sidenav = Array.from(workbenches.values());

      files.forEach(file => {

        const content = grunt.file.read(file);
        const dest = convertMdPathToHtml(file);

        const htmlContent = mainTemplate({
          sidenav,
          content: fixLinks(marked(content))
        });

        grunt.file.write(dest, htmlContent);

        console.log("generated "+ dest);
      })
      done();
    });
  });

  grunt.registerTask('docs-start', ['gen-docs', 'watch:docs']);
};

function convertMdPathToHtml(mdPath) {
  return mdPath.substring(0, mdPath.length-('.md'.length)) + '.html';
}

function fixLinks(htmlContent) {
  return htmlContent.replace(/href=['"](.+)['"]/g, function(expr, link){
    return 'href="' + convertMdPathToHtml(link) + '"';
  });
}