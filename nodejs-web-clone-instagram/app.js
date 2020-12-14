var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var consign = require('consign');

var app = express();

// view engine setup
app.set('view engine', 'ejs');
app.set('views', './app/views');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static('./app/public'));

/* efetua o autoload das rotas, dos models e dos controllers para o objeto app */
consign()
    .include('app/routes')
    .then('app/models')
    .then('app/controllers')
    .into(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404).render('errors/404');
  next();
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('errors/error');
});

module.exports = app;
