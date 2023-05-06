const express = require("express");
const path = require("path");

const app = express();
const port = 3000;

app.set("views", "./views");
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  res.redirect("/chat");
});

app.get("/logout", (req, res) => {
  res.redirect("/");
});

app.get("/chat", (req, res) => {
  const randomNickname = Math.random().toString(32).substring(2);
  res.render("chat", { session: { nickname: randomNickname } });
});

app.post("/chat", (req, res) => {
  res.redirect("/chat");
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
