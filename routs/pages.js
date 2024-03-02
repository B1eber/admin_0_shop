const express = require("express");
const router = express.Router();
const Page = require("../models/pages");
const createPath = (page) =>
  path.resolve(__dirname, "../views", `${pages}.ejs`);

router.get("/", (req, res) => {
  Page.findOne({ slug: "home" })
    .then((page) => {
        res.render("index", {
          title: page.title,
          content: page.content,
        });
      
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/"); // Обработка ошибки - перенаправление на главную
    });
});

router.get("/", (req, res) => {
  res.render("index", {
    title: "Home",
  });
});

router.get("/:slug", (req, res) => {
  let slug = req.params.slug;

  Page.findOne({ slug: slug })
    .then((page) => {
      if (!page) {
        res.redirect("/");
      } else {
        res.render("index", {
          title: page.title,
          content: page.content,
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/"); // Обработка ошибки - перенаправление на главную
    });
});

router.get("/", (req, res) => {
  res.render("index", {
    title: "Home",
  });
});

module.exports = router;
