var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/mainrouter/index");
var usersRouter = require("./routes/users/users");

var app = express();
const lusca = require("lusca");
const rateLimiter = require("express-rate-limit");
const ipfilter = require("express-ipfilter").IpFilter;

// IP Filtering
const ips = [];
const ipfilterMidilware = ipfilter(ips, { mode : "deny" });

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//security

//Rate Limiting
const limiter = rateLimiter({
  windowMs : 5*60*1000, // 5 minutes
  max : 1000, // requests allowed the windowMs time
  message : "Too many requests from this IP, please try again in a few minutes",
});

app.use(limiter);
app.use(ipfilterMidilware);

app.use(
  lusca({
    csrf: false,
    // csp: {
    //   /* ... */
    // },
    xframe: "SAMEORIGIN",
    // p3p: "ABCDEF",
    // hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    xssProtection: true,
    nosniff: true,
    referrerPolicy: "same-origin",
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
