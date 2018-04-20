var gulp = require('gulp');
var jshint = require('gulp-jshint');
var gutil = require('gulp-util');
let uglify = require('gulp-uglifyes');

// Check jshint
gulp.task('jshint', () => {
    return gulp.src('./src/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

// Check minify all files
gulp.task('minify', () => {
    return gulp.src('./src/*.js')
    .pipe(gulp.dest('./lib'))
    .pipe(uglify({
        mangle: false,
        ecma: 6
    }))
    .on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()); })
    .pipe(gulp.dest('./lib'));
});

gulp.task('watch', () => {
    gulp.watch('./src/*.js', ['jshint', 'minify']);
});

gulp.task('default', ['jshint', 'minify', 'watch']);