import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { autoCancel } from "./scheduler/autoCancel";
import { checkInReminder } from "./scheduler/checkInReminder";

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // autoCancel();
  // checkInReminder();
});
