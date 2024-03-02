const express = require("express");
const router = express.Router();
const path = require("path");
const Page = require("../models/pages");

const { body, validationResult } = require("express-validator");

const createPath = (page) => path.resolve(__dirname, "../views", `${page}.ejs`);

//======= Get pages index =======//
router.get("/", async (req, res) => {
  try {
    const pages = await Page.find({}).sort({ sorting: 1 }).exec();
    res.render("admin/pages", {
      pages: pages,
    });
  } catch (error) {
    console.error("Error querying the database:", error);
    // Обработка ошибки, например, рендеринг страницы с сообщением об ошибке
    res.render("error", {
      message: "Error querying the database",
      error: error,
    });
  }
});

//===========  get add admin pages=============//
router.get("/add_pages", (req, res) => {
  const title = "";
  const slug = "";
  const content = "";
  res.render("admin/add_pages", {
    title: title,
    slug: slug,
    content: content,
  });
});

//====================  Post add pages =================//
router.post(
  "/add_pages",
  [
    body("title").notEmpty().withMessage("Title must have a value."),
    body("content").notEmpty().withMessage("Content must have a value."),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    const title = req.body.title;
    let slug = req.body.slug.replace(/\s+/g, "-").toLowerCase();
    if (slug === "") slug = title.replace(/\s+/g, "-").toLowerCase();
    const content = req.body.content;

    if (!errors.isEmpty()) {
      console.log("errors");
      res.render("admin/add_pages", {
        errors: errors.array(),
        title: title,
        slug: slug,
        content: content,
      });
    } else {
      try {
        const existingPage = await Page.findOne({ slug: slug });
        if (existingPage) {
          req.flash("danger", "Page slug exists, choose another");
          res.render("admin/add_pages", {
            title: title,
            slug: slug,
            content: content,
          });
        } else {
          const page = new Page({
            title: title,
            slug: slug,
            content: content,
            sorting: 0,
          });

          await page.save();
          Page.find({})
            .sort({ sorting: 1 }) // Исправлено на sorting
            .exec()
            .then((pages) => {
              req.app.locals.pages = pages;
            })
            .catch((err) => {
              console.error(err);
            });
          req.flash("success", "Page added!");
          res.redirect("/admin/pages");
        }
      } catch (error) {
        console.error("Error querying the database:", error);
        req.flash("danger", "Error querying the database");
        res.render("admin/add_pages", {
          title: title,
          slug: slug,
          content: content,
        });
      }
    }
  }
);
//========== Sort pages function =========//
async function sortPages(ids, callback) {
  let count = 0;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    count++;

    (async function (count) {
      try {
        const page = await Page.findById(id);

        if (!page) {
          console.log("Page not found");
          return; // Use return instead of continue
        }

        page.sorting = count;
        await page.save();
      } catch (err) {
        console.log(err);
        if (count >= ids.length) {
          callback();
        }
      }
    })(count);
  }
}

//========== post reorder  pages =========//
router.post("/reorder-pages", async (req, res) => {
  const ids = req.body["id[]"];

  sortPages(ids, function () {
    res.send("Pages reordered successfully");
    Page.find({})
      .sort({ sorting: 1 }) // Исправлено на sorting
      .exec()
      .then((pages) => {
        req.app.locals.pages = pages;
      })
      .catch((err) => {
        console.error(err);
      });
  });
});

//========= get edit page =========//
router.get("/edit_pages/:id", async (req, res) => {
  try {
    const page = await Page.findById({ _id: req.params.id });

    if (!page) {
      console.log("Page not found");
      // Обработка ситуации, когда страница не найдена
      return res.status(404).send("Page not found");
    }

    res.render("admin/edit_pages", {
      title: page.title,
      slug: page.slug,
      content: page.content,
      id: page._id,
    });
  } catch (err) {
    console.log(err);
    // Обработка ошибки
    res.status(500).send("Internal Server Error");
  }
});

//===================== Post edit pages ================//
router.post(
  "/edit_pages/:id",
  [
    body("title").notEmpty().withMessage("Title must have a value."),
    body("content").notEmpty().withMessage("Content must have a value."),
  ],
  function (req, res) {
    let title = req.body.title;
    let slug = req.body.slug.replace(/\s+/g, "-").toLowerCase();
    if (slug === "") {
      slug = req.body.title.replace(/\s+/g, "-").toLowerCase();
    }
    let content = req.body.content;
    let id = req.params.id;
    let updatedPage; // Define the updatedPage variable in a broader scope

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render("admin/edit_pages", {
        errors: errors.array(),
        title: title,
        slug: slug,
        content: content,
        id: id,
      });
    } else {
      Page.findOne({ slug: slug, _id: { $ne: id } })
        .exec()
        .then((page) => {
          if (page) {
            req.flash("danger", "Page slug exists, choose another.");
            return res.render("admin/edit_pages", {
              title: title,
              slug: slug,
              content: content,
              id: id,
            });
          } else {
            return Page.findById(id).exec();
          }
        })
        .then((page) => {
          if (!page) {
            return res.status(404).send("Page not found");
          }

          page.title = title;
          page.slug = slug;
          page.content = content;

          updatedPage = page; // Assign the page to updatedPage

          return page.save();
          Page.find({})
            .sort({ sorting: 1 }) // Исправлено на sorting
            .exec()
            .then((pages) => {
              req.app.locals.pages = pages;
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .then(() => {
          req.flash("success", "Page updated!");
          return res.redirect("/admin/pages/edit_pages/" + id);
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).send("Internal Server Error");
        });
    }
  }
);

//=============== get delete page ==========//
router.get("/delete_pages/:id", async (req, res) => {
  Page.findByIdAndDelete(req.params.id)
    .then((deletedPage) => {
      if (!deletedPage) {
        return res.status(404).send("Page not found");
      }
      Page.find({})
        .sort({ sorting: 1 }) // Исправлено на sorting
        .exec()
        .then((pages) => {
          req.app.locals.pages = pages;
        })
        .catch((err) => {
          console.error(err);
        });
      req.flash("success", "Page deleted!");
      res.redirect("/admin/pages");
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

module.exports = router;
