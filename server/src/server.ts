import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import fs from "fs";

import { connectDB } from "./config/db";
import routes from "./routes";
import { errorHandler } from "./middleware/error";

const app = express();

const avatarDirectory = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(avatarDirectory, { recursive: true });

app.use(helmet());

const allowedOrigins = [
  "http://localhost:3000",
  "http://10.76.32.66:3000",
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));
app.use(mongoSanitize());

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    dotfiles: "deny",
    index: false,
  })
);

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
  })
);

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
  })
);

app.use("/api", routes);
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log("API running");
      console.log("Profile photo storage ready");
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });
