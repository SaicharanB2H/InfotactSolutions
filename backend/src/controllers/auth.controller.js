import { User } from "../models/User.js";

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: "Email and password are required." }
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      const token = `streamweaver_token_${user._id}_${Date.now()}`;
      return res.status(200).json({
        success: true,
        message: "User registered successfully.",
        token,
        user: {
          id: user._id,
          name: user.name || name || "User",
          email: user.email
        }
      });
    }

    user = await User.create({
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      password
    });

    const token = `streamweaver_token_${user._id}_${Date.now()}`;

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: "Email and password are required." }
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name: email.split("@")[0],
        email: email.toLowerCase(),
        password
      });
    }

    const token = `streamweaver_token_${user._id}_${Date.now()}`;

    return res.status(200).json({
      success: true,
      message: "User logged in successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
}
