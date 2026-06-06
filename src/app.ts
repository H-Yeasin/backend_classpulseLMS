import cors from "cors";
import express from "express";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import router from "./routes";
const app = express();

// When credentials are required, browsers reject wildcard origins (`*`).
// Reflect the request origin instead so credentials can be used safely.
const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:3001",
  "http://127.0.0.1:5500",
  "https://admin.classpulse.info",
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: any) {
    // allow requests with no origin (like mobile apps / postman)
    if (!origin) return callback(null, true);
    const envOrigin = process.env.CORS_ORIGIN;
    if (allowedOrigins.includes(origin) || (envOrigin && origin === envOrigin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["set-cookie"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  next();
});

app.use(express.static("public"));

// app.get('/', (_req, res) => {
//   res.json({ success: true, message: 'Opalmer API is running' })
// })
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Opalmer API is running",
    uptime: process.uptime(),
  });
});

app.use("/api/v1", router);

app.use(notFound as never);
app.use(globalErrorHandler);

export default app;
