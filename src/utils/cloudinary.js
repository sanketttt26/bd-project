import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (loaclPath) => {
  try {
    if (!loaclPath) return null;
    //uploading to cloudinary
    const response = await cloudinary.uploader.upload(loaclPath, {
      resource_type: "auto",
    });
    //file uploaded to cloudinary
    //console.log("File uploaded succesfully on cloudinary", response.url);
    fs.unlinkSync(loaclPath);
    console.log(response);
    return response;
  } catch (error) {
    fs.unlinkSync(loaclPath); //remove file from local server as upload is failed
    return null;
  }
};

export { uploadOnCloudinary };
