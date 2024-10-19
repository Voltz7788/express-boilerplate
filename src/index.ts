import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import https from "https";
import fs from "fs";
import path from "path";

dotenv.config();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "../localhost-key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "../localhost.pem")),
};

const app: Express = express();
const port = process.env.PORT;

app.get("/", (req: Request, res: Response) => {
  res.send("Express + Typescript Server");
});

https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`);
});
