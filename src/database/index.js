import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const conncectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB Connected! DB HOST: ${conncectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB conncection error", error);
    process.exit(1);
  }
};

export default connectDB;
