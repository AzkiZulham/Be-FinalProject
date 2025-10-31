import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "./config/passport";
import authRoutes from "./routes/auth.routes";
import transactionRoutes from "./routes/transaction.routes";
import paymentRoutes from "./routes/payment.routes";
import reviewRoutes from "./routes/review.routes";
import path from "path";
import userRoutes from "./routes/user.routes";
import propertyRoutes from "./routes/property.routes";
import propertyDashboardRoutes from "./routes/propertyDashboard.routes";
import propertyCategoryRoutes from "./routes/propertyCategory.routes";
import geolocationRoutes from "./routes/geolocation.routes";
import bookingFilterRoutes from "./routes/bookingFilter.routes";
import reportRoutes from "./routes/report.routes";
import roomRoutes from "./routes/room.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import peakSeasonRoutes from "./routes/peakSeason.routes";
import tenantProfileRoutes from "./routes/tenantProfile.routes";
import { autoCancel } from "./scheduler/autoCancel";
import { checkInReminder } from "./scheduler/checkInReminder";

const app = express();

app.set("trust proxy", 1);
app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        "http://localhost:3000",
        "https://fe-final-project-five.vercel.app",
        "https://fe-final-project-five.vercel.app/",
        "https://fe-final-project-alpha.vercel.app",
      ];
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  })
);
app.options("*", cors());

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
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));
app.use("/api/user", userRoutes);
app.use("/api/properties/dashboard", propertyDashboardRoutes);
app.use("/api/properties-categories", propertyCategoryRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/geolocation", geolocationRoutes);
app.use("/api/booking", bookingFilterRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/peak-season", peakSeasonRoutes);
app.use("/api/tenant", tenantProfileRoutes);
autoCancel();
checkInReminder();

export default app;
