const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  uid: String,
  email: String,
  name: String,
  pic: String,
});

module.exports = mongoose.model("User", userSchema);
