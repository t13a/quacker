const express = require("express");
const path = require("path");

const app = express();
const port = 3000;

app.set("views", "./views");
app.set("view engine", "ejs");

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/chat", (req, res) => {
  res.render("chat");
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
