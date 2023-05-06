const cookieSession = require("cookie-session");
const express = require("express");
const path = require("path");

const app = express();
const port = 3000;

app.set("views", "./views");
app.set("view engine", "ejs");

app.use(cookieSession({ secret: "secret" }));
app.use(express.urlencoded({ extended: true }));

function login(req) {
  console.log(`login: ${JSON.stringify(req.body.nickname)}`);
  req.session.nickname = req.body.nickname;
}

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  login(req);
  res.redirect("/chat");
});

app.get("/logout", (req, res) => {
  res.redirect("/");
});

app.get("/chat", (req, res) => {
  res.render("chat", { session: req.session });
});

app.post("/chat", (req, res) => {
  res.redirect("/chat");
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
