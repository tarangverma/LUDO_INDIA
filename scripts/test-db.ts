import mongoose from "mongoose";
import { User } from "../server/models/User";
import "dotenv/config";

async function testDB() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ludo-app");
    console.log("Connected!");

    const testUsername = "testuser_" + Date.now();
    console.log(`Creating user: ${testUsername}`);

    const user = new User({
      username: testUsername,
      password: "hashedpassword123",
    });

    await user.save();
    console.log("User created successfully:", user);

    const foundUser = await User.findOne({ username: testUsername });
    console.log("Found user:", foundUser);

    if (foundUser && foundUser.username === testUsername) {
      console.log("Verification PASSED");
    } else {
      console.log("Verification FAILED");
    }

    await User.deleteOne({ _id: user._id });
    console.log("Cleanup done");

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testDB();
