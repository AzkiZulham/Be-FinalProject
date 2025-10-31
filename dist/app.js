"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("./config/passport"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const transaction_routes_1 = __importDefault(require("./routes/transaction.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const path_1 = __importDefault(require("path"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const property_routes_1 = __importDefault(require("./routes/property.routes"));
const propertyDashboard_routes_1 = __importDefault(require("./routes/propertyDashboard.routes"));
const propertyCategory_routes_1 = __importDefault(require("./routes/propertyCategory.routes"));
const geolocation_routes_1 = __importDefault(require("./routes/geolocation.routes"));
const bookingFilter_routes_1 = __importDefault(require("./routes/bookingFilter.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const room_routes_1 = __importDefault(require("./routes/room.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const peakSeason_routes_1 = __importDefault(require("./routes/peakSeason.routes"));
const tenantProfile_routes_1 = __importDefault(require("./routes/tenantProfile.routes"));
const autoCancel_1 = require("./scheduler/autoCancel");
const checkInReminder_1 = require("./scheduler/checkInReminder");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        "https://fe-final-project-five.vercel.app",
        "https://fe-final-project-alpha.vercel.app",
    ],
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
}));
app.use(express_1.default.static("public"));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use("/api/auth", auth_routes_1.default);
app.use("/api/transaction", transaction_routes_1.default);
app.use("/api/payment", payment_routes_1.default);
app.use("/api/review", review_routes_1.default);
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../public/uploads")));
app.use("/api/user", user_routes_1.default);
app.use("/api/properties/dashboard", propertyDashboard_routes_1.default);
app.use("/api/properties-categories", propertyCategory_routes_1.default);
app.use("/api/properties", property_routes_1.default);
app.use("/api/geolocation", geolocation_routes_1.default);
app.use("/api/booking", bookingFilter_routes_1.default);
app.use("/api/report", report_routes_1.default);
app.use("/api/rooms", room_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/peak-season", peakSeason_routes_1.default);
app.use("/api/tenant", tenantProfile_routes_1.default);
(0, autoCancel_1.autoCancel)();
(0, checkInReminder_1.checkInReminder)();
exports.default = app;
