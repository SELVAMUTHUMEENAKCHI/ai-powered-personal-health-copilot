import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import {
  LoginSchema,
  RegisterPatientSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '@health-copilot/shared';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = LoginSchema.parse(req.body);
      const { user, token } = await AuthService.authenticateUser(
        validated.email,
        validated.password
      );

      // Issue httpOnly secure cookie
      AuthService.setAuthCookie(res, token);

      res.status(200).json({
        success: true,
        user,
        message: 'Authenticated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RegisterPatientSchema.parse(req.body);
      const result = await AuthService.registerPatient(validated);

      // Issue httpOnly secure cookie
      AuthService.setAuthCookie(res, result.token);

      res.status(201).json({
        success: true,
        user: result.user,
        patientId: result.patientId,
        abhaId: (result as any).abhaId || null,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ForgotPasswordSchema.parse(req.body);
      const result = await AuthService.forgotPassword(validated.email);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = ResetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword(validated.email, validated.newPassword);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No active session found.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        patientId: req.user.patientId,
        name: req.user.name,
      },
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    AuthService.clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }
}

