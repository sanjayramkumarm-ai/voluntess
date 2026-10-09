import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User";
import { AuthReq } from "../middleware/auth";

const sign = (u: any) =>
  jwt.sign(
    { id: u._id, role: u.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

const reg = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Password needs 8+ characters"),
  role: z.enum(["volunteer", "ngo"])
});

export const register = async (req: AuthReq, res: Response) => {
  const d = reg.parse(req.body);

  const user = await User.create({
    ...d,
    password: await bcrypt.hash(d.password, 12)
  });

  res.status(201).json({
    token: sign(user),
    user: {
      id: user._id,
      name: user.name,
      role: user.role
    }
  });
};

export const login = async (req: AuthReq, res: Response) => {
  const { email, password } = z.object({
    email: z.string().email(),
    password: z.string()
  }).parse(req.body);

  const user = await User.findOne({ email }).select("+password");

  if (
    !user ||
    !(await bcrypt.compare(password, user.password))
  ) {
    return res.status(401).json({
      message: "Wrong email or password"
    });
  }

  res.json({
    token: sign(user),
    user: {
      id: user._id,
      name: user.name,
      role: user.role
    }
  });
};

export const me = async (req: AuthReq, res: Response) =>
  res.json(await User.findById(req.user!.id));
