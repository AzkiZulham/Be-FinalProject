import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./config/passport"; // file passport.ts yang isinya Google & Facebook strategy
import authRoutes from "./routes/auth.routes";
import transactionRoutes from "./routes/transaction.routes";
import paymentRoutes from "./routes/payment.routes";
import reviewRoutes from "./routes/review.routes";
import path from "path";
import userRoutes from "./routes/user.routes";
import propertyRoutes from "./routes/property.routes";
import geolocationRoutes from "./routes/geolocation.routes";
import bookingFilterRoutes from "./routes/bookingFilter.routes";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", 
    credentials: true, 
  })
);
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());


app.use("/api/auth", authRoutes);
app.use("/api/transaction", transactionRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/review", reviewRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/user", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/geolocation", geolocationRoutes);
app.use("/api/booking", bookingFilterRoutes);


export default app;
