const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PageSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  sorting: {
    type: String,
    default: 1
  },
});

const Page = mongoose.model("Page", PageSchema);

module.exports = Page;
