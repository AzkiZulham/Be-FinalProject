if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

import app from "./app";

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
});

export default app;
