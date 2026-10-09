import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "./config/db";
import routes from "./routes";
import { errorHandler } from "./middleware/error";

const app = express();

app.use(helmet());
const allowedOrigins = ["http://localhost:3000", "http://10.76.32.66:3000"];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));
app.use(mongoSanitize());

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300
}));

app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30
}));

app.use("/api", routes);
app.use(errorHandler);

connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log("API running");
  });
});
