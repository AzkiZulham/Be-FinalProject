import app from "./app";

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

export default app;
