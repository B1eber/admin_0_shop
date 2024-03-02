const express = require("express");
const router = express.Router();
const path = require("path");
const Category = require("../models/category");

const { body, validationResult } = require("express-validator");

const createPath = (page) => path.resolve(__dirname, "../views", `${page}.ejs`);

//======= Get category index =======//
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().exec();
    res.render("admin/categories", {
      categories: categories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

//===========  get add category =============//
router.get("/add_category", (req, res) => {
  const title = "";

  res.render("admin/add_category", {
    title: title,
  });
});

//====================  Post add category =================//
router.post(
  "/add_category",
  [body("title").notEmpty().withMessage("Title must have a value.")],
  async (req, res) => {
    const errors = validationResult(req);

    const title = req.body.title;
    let slug = title.replace(/\s+/g, "-").toLowerCase();
    const content = req.body.content;

    if (!errors.isEmpty()) {
      console.log("errors");
      res.render("admin/add_category", {
        errors: errors.array(),
        title: title,
      });
    } else {
      try {
        const existingCategory = await Category.findOne({ slug: slug });
        if (existingCategory) {
          req.flash("danger", "Category slug exists, choose another");
          res.render("admin/add_category", {
            title: title,
          });
        } else {
          const category = new Category({
            title: title,
            slug: slug,
          });

          await category.save();
          Category.find({})
            .then((categories) => {
              req.app.locals.categories = categories;
            })
            .catch((err) => {
              console.error(err);
            });
          req.flash("success", "Category added!");
          res.redirect("/admin/categories");
        }
      } catch (error) {
        console.error("Error querying the database:", error);
        req.flash("danger", "Error querying the database");
        res.render("admin/add_category", {
          title: title,
          slug: slug,
          content: content,
        });
      }
    }
  }
);

//========= get edit category =========//
router.get("/edit_category/:id", async (req, res) => {
  try {
    const existingCategory = await Category.findById({ _id: req.params.id });

    if (!existingCategory) {
      console.log("Category not found");
      // Обработка ситуации, когда category  не найдена
      return res.status(404).send("Category  not found");
    }

    res.render("admin/edit_category", {
      title: existingCategory.title,
      id: existingCategory._id,
    });
  } catch (err) {
    console.log(err);
    // Обработка ошибки
    res.status(500).send("Internal Server Error");
  }
});

//===================== Post edit category ================//
router.post(
  "/edit_category/:id",
  [body("title").notEmpty().withMessage("Title must have a value.")],
  function (req, res) {
    let title = req.body.title;
    let slug = title.replace(/\s+/g, "-").toLowerCase();
    let id = req.params.id;
    let updatedcategory; // Define the updatedPage variable in a broader scope

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render("admin/edit_category", {
        errors: errors.array(),
        title: title,
        id: id,
      });
    } else {
      Category.findOne({ slug: slug, _id: { $ne: id } })
        .exec()
        .then((category) => {
          if (category) {
            req.flash("danger", "Category title exists, choose another.");
            return res.render("admin/edit_category", {
              title: title,
              id: id,
            });
          } else {
            return Category.findById(id).exec();
          }
        })
        .then((category) => {
          if (!category) {
            return res.status(404).send("Category not found");
          }

          category.title = title;
          category.slug = slug;
          updatedcategory = category; // Assign the page to updatedPage

          return category.save();
          Category.find({})
            .then((categories) => {
              req.app.locals.categories = categories;
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .then(() => {
          req.flash("success", "Category updated!");
          return res.redirect("/admin/categories/edit_category/" + id);
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).send("Internal Server Error");
        });
    }
  }
);

//=============== get delete category ==========//
router.get("/delete_category/:id", async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);

    if (!deletedCategory) {
      return res.status(404).send("Category not found");
    }

    req.flash("success", "Category deleted!");
    const categories = await Category.find({});
    req.app.locals.categories = categories;
    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
module.exports = router;
