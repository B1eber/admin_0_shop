const express = require("express");
const router = express.Router();
const path = require("path");
const mkdirp = require("mkdirp");
const fileupload = require("express-fileupload");
const fs = require("fs-extra");
const resizeImg = require("resize-img");
const fsPromises = require("fs/promises");
const multer = require('multer');

// Используйте корректный путь к директории
//========= get product modul ==========//
const Product = require("../models/product");
//========= get category modul ==========//
const Category = require("../models/category");

const { body, validationResult } = require("express-validator");

const createPath = (page) => path.resolve(__dirname, "../views", `${page}.ejs`);

//======= Get product index =======//
router.get("/", async (req, res) => {
  try {
    const count = await Product.countDocuments();
    const products = await Product.find();

    res.render("admin/products", {
      products: products,
      count: count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

//===========  Get add product=============//
router.get("/add_product", async (req, res) => {
  const title = "";
  const desc = "";
  const price = "";

  try {
    const categories = await Category.find().exec();

    res.render("admin/add_product", {
      title: title,
      desc: desc,
      categories: categories,
      price: price,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

//====================  Post add product =================//
let imageFile;
router.post(
  "/add_product",
  [
    body("title").notEmpty().withMessage("Title must have a value."),
    body("desc").notEmpty().withMessage("Description must have a value."),
    body("price").isDecimal().withMessage("Price must have a value."),
    body("image").custom((value, { req }) => {
      imageFile =
        typeof req.files.image !== "undefined" ? req.files.image.name : "";
      if (!value && !imageFile) {
        throw new Error("Image must have a value.");
      }
      return true;
    }),
  ],

  async (req, res) => {
    const errors = validationResult(req);

    const title = req.body.title;
    slug = title.replace(/\s+/g, "-").toLowerCase();
    const desc = req.body.desc;
    const price = req.body.price;
    const category = req.body.category;

    if (!errors.isEmpty()) {
      const categories = await Category.find().exec();
      res.render("admin/add_product", {
        errors: errors.array(),
        title: title,
        desc: desc,
        categories: categories,
        price: price,
      });
    } else {
      try {
        const existingProduct = await Product.findOne({ slug: slug }).exec();
        if (existingProduct) {
          req.flash("danger", "Product slug exists, choose another");
          const categories = await Category.find().exec();
          res.render("admin/add_product", {
            title: title,
            desc: desc,
            categories: categories,
            price: price,
          });
        } else {
          let price2 = parseFloat(price).toFixed(2);
          const product = new Product({
            title: title,
            slug: slug,
            desc: desc,
            price: price2,
            category: category,
            image: imageFile,
          });

          await product.save();
          const createDirectories = () => {
            return new Promise(async (resolve, reject) => {
              const directoryPath = "public/product_images/" + product._id;

              try {
                await fsPromises.mkdir(directoryPath, { recursive: true });
                resolve();
                await Promise.all([
                  mkdirp(directoryPath + "/gallery"),
                  mkdirp(directoryPath + "/gallery/thumbs"),
                ]);
              } catch (err) {
                reject(err);
              }
            });
          };

          const moveImage = () => {
            return new Promise((resolve, reject) => {
              if (imageFile != "") {
                let productImage = req.files.image;
                let path =
                  "public/product_images/" + product._id + "/" + imageFile;

                productImage.mv(path, function (err) {
                  if (err) reject(err);
                  resolve();
                });
              } else {
                resolve();
              }
            });
          };

          await Promise.all([createDirectories(), moveImage()]);

          req.flash("success", "Product added!");
          res.redirect("/admin/products");
        }
      } catch (error) {
        console.error("Error querying the database:", error);
        const categories = await Category.find().exec();
        req.flash("danger", "Error querying the database");
        res.render("admin/add_product", {
          title: title,
          slug: slug,
          desc: desc,
          price: price,
          categories: categories,
        });
      }
    }
  }
);

//========= get edit product =========//
router.get("/edit_product/:id", async (req, res) => {
  let errors;
  let categories;
  if (req.session.errors) errors = req.session.errors;
  req.session.errors = null;
  try {
    categories = await Category.find().exec();
    const p = await Product.findById(req.params.id).exec();
    if (p) {
      var galleryDir = "public/product_images/" + p.id;
      var galleryImages = null;
      fs.readdir(galleryDir, function (err, files) {
        if (err) {
          console.log(err);
        } else {
          galleryImages = files;
          res.render("admin/edit_product", {
            title: p.title,
            errors: errors,
            desc: p.desc,
            categories: categories,
            category: p.category.replace(/\s+/g, "-").toLocaleLowerCase(),
            price: parseFloat(p.price).toFixed(2),
            image: p.image,
            galleryImages: galleryImages,
            id: p.id,
          });
        }
      });
    } else {
      console.log("Product not found");
      res.redirect("/admin/products");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

//===================== Post edit pages ================//
let imageFile2;

router.post(
  "/edit_product/:id",
  [
    body("title").notEmpty().withMessage("Title must have a value."),
    body("desc").notEmpty().withMessage("Description must have a value."),
    body("price").isDecimal().withMessage("Price must have a value."),
    body("image").custom((value, { req }) => {
      imageFile2 =
        typeof req.files.image !== "undefined" ? req.files.image.name : "";
      if (!value && !imageFile2) {
        throw new Error("Image must have a value.");
      }
      return true;
    }),
  ],

  async (req, res) => {
    const title = req.body.title;
    const slug = title.replace(/\s+/g, "-").toLowerCase();
    const desc = req.body.desc;
    const price = req.body.price;
    const category = req.body.category;
    const pimage = req.body.pimage;
    const id = req.params.id;

    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        req.session.errors = errors;
        res.redirect("/admin/products/edit_product/" + id);
        return;
      }

      const existingProduct = await Product.findOne({
        slug: slug,
        _id: { $ne: id },
      });

      if (existingProduct) {
        req.flash("danger", "Product title exists, choose another");
        res.redirect("/admin/products/edit_product/" + id);
        return;
      }

      const updatedProduct = await Product.findById(id);

      updatedProduct.title = title;
      updatedProduct.slug = slug;
      updatedProduct.desc = desc;
      updatedProduct.price = parseFloat(price).toFixed(2);
      updatedProduct.category = category;

      if (imageFile2 !== "") {
        updatedProduct.image = imageFile2;
      }

      await updatedProduct.save();

      if (imageFile2 !== "") {
        if (pimage !== "") {
          fs.remove("public/product_images/" + id + "/" + pimage, (err) => {
            if (err) {
              console.log(err);
            }
          });
        }

        const productImage = req.files.image;
        const path = "public/product_images/" + id + "/" + imageFile2;

        await productImage.mv(path, (err) => {
          return console.log(err);
        });
      }

      req.flash("success", "Product edited!");
      res.redirect("/admin/products/edit_product/" + id);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

//=============== Post product gallery ==========//
// const upload = multer({ dest: 'public/product_images' });
// router.post('/product_gallery/:id', upload.single('file'), async (req, res) => {
//   try {
//     let productImage = req.file;
//     let id = req.params.id;
//     let path = `public/product_images/${id}/${productImage.filename}`;

//     productImage.mv(path, (err) => {
//       if (err) {
//         console.log(err);
//         return res.status(500).send(err);
//       }

//       res.sendStatus(200);
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal Server Error");
//   }
// });
//=============== get delete pкщвгсе ==========//
router.get("/delete_product/:id", async (req, res) => {
  let id = req.params.id;
  let path = 'public/product_images/' + id;

  try {
    // Remove the directory
    await fs.remove(path);

    // Delete the product using Mongoose
    await Product.findByIdAndDelete(id).exec();

    req.flash('success', 'Product deleted');
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

