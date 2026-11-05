import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";
import { BadRequestError } from "../utils/errors";

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new BadRequestError("Email and password are required.");
    }
    const result = await authService.loginUser(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new BadRequestError("Email and password are required.");
    }
    const result = await authService.signupUser(email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      throw new BadRequestError("Email and confirmation code are required.");
    }
    const result = await authService.confirmUser(email, code);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function resendCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      throw new BadRequestError("Email is required.");
    }
    const result = await authService.resendConfirmationCode(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
