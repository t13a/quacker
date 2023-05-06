import cookieSession from "cookie-session";
import express, { Request } from "express";
import core from "express-serve-static-core";
import path from "path";
import sqlite3 from "sqlite3";
import webpack from "webpack";
import webpackDevMiddleware from "webpack-dev-middleware";

interface ChatEntity {
  id: number;
  created_by: string;
  created_at: number;
  message: string;
}

interface Session {
  nickname: string;
}

interface SessionRequest<
  P = core.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = core.Query,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  session: Session;
}

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

app.use(cookieSession({ secret: "secret" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function isLoggedIn<P = core.ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = core.Query, Locals extends Record<string, any> = Record<string, any>>(
  req: Request<P, ResBody, ReqBody, ReqQuery, Locals>
): req is SessionRequest<P, ResBody, ReqBody, ReqQuery, Locals> {
  return typeof req.session?.nickname === "string";
}

function login(req: Request): void {
  console.log(`login: ${JSON.stringify(req.body.nickname)}`);
  if (req.session) {
    req.session.nickname = req.body.nickname;
  }
}

function logout(req: Request): void {
  if (isLoggedIn(req)) {
    console.log(`logout: ${JSON.stringify(req.session.nickname)}`);
  }
  req.session = null;
}

async function doGetChat(nickname: string, options = { from: 0, to: -1, limit: 10 }): Promise<ChatEntity[]> {
  console.log(`doGetChat: ${nickname}: ${JSON.stringify(options)}`);
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM chat WHERE id BETWEEN ? AND ? ORDER BY id DESC LIMIT ?",
      options.from,
      options.to >= 0 ? options.to : Math.pow(2, 63) - 1,
      options.limit,
      (err: Error, rows: ChatEntity[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

async function doPostChat(nickname: string, message: string): Promise<void> {
  console.log(`doPostChat: ${nickname}: ${JSON.stringify(message)}`);
  return new Promise((resolve, reject) => {
    db.run("INSERT INTO chat (message, created_by) values (?, ?)", message, nickname, (err: Error) => {
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

app.get("/login", (req, res, next) => {
  if (isLoggedIn(req)) {
    res.redirect("/chat");
  } else {
    next();
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

app.get("/session", async (req, res) => {
  if (isLoggedIn(req)) {
    console.log(`session: ${req.session.nickname}: ${JSON.stringify(req.session)}`);
    res.json(req.session);
  } else {
    res.status(401).json("Unauthorized");
  }
});

app.get("/chat", async (req: Request<{}, ChatEntity[] | string, {}, { from: string; to: string; limit: string }>, res, next) => {
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
      next();
    } else {
      res.redirect("/login");
    }
  }
});

app.post("/chat", async (req: Request<{}, string, { message: string }>, res) => {
  if (isLoggedIn(req)) {
    await doPostChat(req.session.nickname, req.body.message);
    res.status(201).json("Created");
  } else {
    res.status(401).json("Unauthorized");
  }
});

app.use(webpackDevMiddleware(webpack(require("./webpack.config.js"))));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
