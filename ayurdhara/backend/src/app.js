const express = require("express");
const app = express();

const userRouter = require("./users/router");

app.use(express.json());
app.get("/api/test-users", (req, res) => {
  res.json({ message: "Users test route works" });
});
app.use("/api/users", userRouter);

app.get("/", (req, res) => {
  res.send("Welcome to the Ayurdhara API");
});

module.exports = app;