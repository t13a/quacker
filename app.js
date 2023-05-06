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
app.use(express.json());
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

async function doGetChat(nickname, options = { from: 0, to: -1, limit: 10 }) {
  console.log(`doGetChat: ${nickname}: ${JSON.stringify(options)}`);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM chat WHERE id BETWEEN ? AND ? ORDER BY id DESC LIMIT ?",
      options.from,
      options.to >= 0 ? options.to : Math.pow(2, 63) - 1,
      options.limit,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

async function doPostChat(nickname, message) {
  console.log(`doPostChat: ${nickname}: ${JSON.stringify(message)}`);
  return new Promise((resolve, reject) => {
    db.run("INSERT INTO chat (message, created_by) values (?, ?)", message, nickname, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
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

app.get("/chat", async (req, res) => {
  if (req.accepts(["json", "html"]) === "json") {
    if (isLoggedIn(req)) {
      const chat = await doGetChat(req.session.nickname, {
        from: !isNaN(parseInt(req.query.from)) ? parseInt(req.query.from) : 0,
        to: !isNaN(parseInt(req.query.to)) ? parseInt(req.query.to) : -1,
        limit: !isNaN(parseInt(req.query.limit)) ? parseInt(req.query.limit) : 10,
      });
      res.json(chat);
    } else {
      res.status(401).json("Unauthorized");
    }
  } else {
    if (isLoggedIn(req)) {
      res.render("chat", { session: req.session });
    } else {
      res.redirect("/login");
    }
  }
});

app.post("/chat", async (req, res) => {
  if (isLoggedIn(req)) {
    await doPostChat(req.session.nickname, req.body.message);
    res.status(201).json("Created");
  } else {
    res.status(401).json("Unauthorized");
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
