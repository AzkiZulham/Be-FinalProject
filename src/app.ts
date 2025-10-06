import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./config/passport"; // file passport.ts yang isinya Google & Facebook strategy
import authRoutes from "./routes/auth.routes";
import transactionRoutes from "./routes/transaction.routes";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", // domain frontend
    credentials: true, // izinkan cookie
  })
);
app.use(express.json());

// session diperlukan kalau mau simpan role di req.session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
  })
);

// inisialisasi passport
app.use(passport.initialize());
app.use(passport.session());

// route auth
app.use("/api/auth", authRoutes);
app.use("/api/transaction", transactionRoutes);

export default app;
