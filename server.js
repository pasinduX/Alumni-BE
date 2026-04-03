require("dotenv").config();
const app = require("./dist/app").default;

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
