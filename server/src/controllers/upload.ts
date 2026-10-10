import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import * as UserModule from "../models/User";

const User: any = (UserModule as any).default || (UserModule as any).User;

const avatarDir = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(avatarDir, { recursive: true });

const allowed: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: avatarDir,
    filename: (_req, file, cb) => {
      cb(null, crypto.randomBytes(16).toString("hex") + allowed[file.mimetype]);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (allowed[file.mimetype]) cb(null, true);
    else cb(new Error("Only JPEG, PNG or WebP images are allowed"));
  },
}).single("photo");

export function handleAvatarUpload(req: Request, res: Response, next: NextFunction) {
  upload(req, res, (err: any) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "Image must be 3 MB or smaller" : err.message;
    res.status(400).json({ message });
  });
}

function hasValidSignature(filePath: string) {
  const buf = Buffer.alloc(12);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const webp =
    buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
  return jpeg || png || webp;
}

export async function updateProfilePhoto(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    if (!hasValidSignature(req.file.path)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "File is not a valid image" });
    }

    const u = (req as any).user;
    const userId = u?.id || u?._id || u?.userId;

    const user = await User.findById(userId);
    if (!user) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "User not found" });
    }

    if (user.profilePhoto) {
      fs.unlink(path.join(avatarDir, path.basename(user.profilePhoto)), () => {});
    }

    user.profilePhoto = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ profilePhoto: user.profilePhoto });
  } catch (error) {
    res.status(500).json({ message: "Could not update profile photo" });
  }
}
