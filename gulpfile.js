const gulp = require('gulp');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config');
const del = require('del');

gulp.task('clean', function () {
  del('dist')
});

gulp.task('build', function () {
  webpack(webpackConfig, function (error) {
    if (error) {
      console.log('webpack failed');
      console.log(error);
    }
  });
});

gulp.task('resources', function () {
  const res = [];
  excluding('web/app', res);
  excluding('web/test', res);
  res.push('web/**/*');
  gulp.src(res).pipe(gulp.dest('dist'));
});

function excluding(path, filter) {
  filter.push('!' + path + '/**/*', '!' + path);
}


gulp.task('default', ['clean', 'build', 'resources']);
