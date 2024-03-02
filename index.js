const express = require("express");
const flash = require("connect-flash");
const nodemon = require("nodemon");
const morgan = require("morgan");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");
const ejs = require("ejs");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const validator = require("express-validator");
const app = express();
const expressMessages = require("express-messages");
const expressValidator = require("express-validator");

//============= Set routs =============//
const config = require("./config/database.js");
const pages = require("./routs/pages.js");
// const product = require("./routs/products.js");
const admin_pages = require("./routs/admin-pages.js");
const admin_categories = require("./routs/admin-categories.js");
const admin_products = require("./routs/admin-products.js");
const { CustomValidation } = require("express-validator/src/context-items");

const { body, validationResult } = require("express-validator");

app.use(
  express.json(),
  express.urlencoded({ extended: true }),
  express.static("public")
);

//=============== to conect ejs ===============//
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

//========== global  error var ==========//
app.locals.errors = null;

//=============== Get page Model =============//
const Page = require("./models/pages");

//========== Get all Pages to pass to header ejs =============//
Page.find({})
  .sort({ sortting: 1 })
  .exec()
  .then((pages) => {
    app.locals.pages = pages;
  })
  .catch((err) => {
    console.error(err);
  });

//=============== Get Category Moell =============//
const Category = require("./models/category");

//========== Get all categories to pass to header ejs =============//
Category.find({})
  .then((categories) => {
    app.locals.categories = categories;
  })
  .catch((err) => {
    console.error(err);
  });

//======== express fileupload middleware ========//
app.use(fileupload());

//============== body parser midlware =========//
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use("/public/css", express.static(path.join(__dirname, "public/css")));
app.use(express.static("style"));

app.use(
  "/public/product_images",
  express.static(path.join(__dirname, "public/product_images"))
);
app.use(express.static("product"));

//=========== morgan midleware ========//
app.use(
  morgan(":method :url :status :res[content-lenght] - :response-time ms")
);
//====== express-sessions midleware =====//
app.set("trust proxy", 1);
app.use(
  session({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true,
    //cookie: { secure: true },
  })
);

//======== validator midleware ==========//
app.use(
  expressValidator.body({
    errorFormatter: function (param, msg, value) {
      var namespace = param.split("."),
        root = namespace.shift(),
        formParam = root;

      while (namespace.length) {
        formParam += "[" + namespace.shift() + "]";
      }
      return {
        param: formParam,
        msg: msg,
        value: value,
      };
    },
    customValidators: {
      isImage: function (value, filename) {
        let extension = path.extname(filename).toLowerCase();
        switch (extension) {
          case ".jpg":
            return ".jpg";
          case ".jpeg":
            return ".jpeg";
          case ".png":
            return ".png";
          case "":
            return ".png";
          default:
            return false;
        }
      },
    },
  })
);

//========== express masagess ============//
app.use(require("connect-flash")());
app.use(function (req, res, next) {
  res.locals.messages = require("express-messages")(req, res);
  next();
});

// === flash midleware ===//
app.use(flash());

app.use("/", pages);
// app.use("/product", products);
app.use("/admin/pages", admin_pages);
app.use("/admin/categories", admin_categories);
app.use("/admin/products", admin_products);

//========== to connect mongodb ==========//
const mongoURI = config.database;

mongoose.connect(mongoURI);
const db = mongoose.connection;
db.on(
  "error",
  console.error.bind(console, "Problems to connection   MongoDB:")
);
db.once("open", () => {
  console.log("Anelya allowed to connect MongoDB");
});

//=========== listening the server ===========//
const PORT = 3000;

app.listen(PORT, (req, res) => {
  console.log(`Server started on port ${PORT}`);
});
