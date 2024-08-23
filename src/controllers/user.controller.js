import { asyncHandler } from "../utils/asyncHandler.js";

import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validations - not empty
  // check if user already exists : username , email
  // check for cover images and avatar and upload to cloudinary
  // create a user object for mongodb
  // create entry in Database
  // remove password and refresh token from response
  // check for user creation
  // return response

  const { userName, email, fullname, password } = req.body;
  console.log(
    "userName :",
    userName,
    "Email :",
    email,
    "FullName :",
    fullname,
    "Password :",
    password
  );

  if (!fullname || !userName || !password || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with same username or email already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log(req.files);
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  const userDetails = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });
  const createdUser = await User.findById(userDetails._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body data
  // username or email checking
  //check if user is created or not
  // password validation
  //generate tokens access and refresh
  // send cookie
  //send response

  const { email, userName, password } = req.body;
  if (!userName && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password us incorrect");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized access");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh token is expired or used");
    }
    const options={
      httpOnly:true,
      secure:true
    }
    const (accessToken,newRefreshToken) = await generateAccessAndRefreshTokens(user._id);

    return res.status(200).cookie("AccessToken",accessToken,options).cookie("refreshToken",newRefreshToken,options).json(200,{
      accessToken,newRefreshToken
    },"Access token refreshed")
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
  }
});
export { registerUser };
export { loginUser, logOutUser,refreshAccessToken };
