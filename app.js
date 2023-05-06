const cookieSession = require("cookie-session");
const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("db.sqlite3", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      created_by TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )`);
  }
});

const app = express();
const port = 3000;

app.set("views", "./views");
app.set("view engine", "ejs");

app.use(cookieSession({ secret: "secret" }));
app.use(express.urlencoded({ extended: true }));

function isLoggedIn(req) {
  return typeof req.session.nickname === "string";
}

function login(req) {
  console.log(`login: ${JSON.stringify(req.body.nickname)}`);
  req.session.nickname = req.body.nickname;
}

function logout(req) {
  console.log(`logout: ${JSON.stringify(req.session.nickname)}`);
  req.session = null;
}

app.get("/", (req, res) => {
  if (isLoggedIn(req)) {
    res.redirect("/chat");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  if (isLoggedIn(req)) {
    res.redirect("/chat");
  } else {
    res.render("login");
  }
});

app.post("/login", (req, res) => {
  login(req);
  res.redirect("/chat");
});

app.get("/logout", (req, res) => {
  logout(req);
  res.redirect("/");
});

app.get("/chat", (req, res) => {
  if (isLoggedIn(req)) {
    res.render("chat", { session: req.session });
  } else {
    res.redirect("/login");
  }
});

app.post("/chat", (req, res) => {
  if (isLoggedIn(req)) {
    res.redirect("/chat");
  } else {
    res.status(401).send("Unauthorized");
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
