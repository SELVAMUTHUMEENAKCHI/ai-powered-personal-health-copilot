import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@health-copilot/shared';

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_FORBIDDEN',
          message: `Access denied: Action requires one of role(s): [${allowedRoles.join(', ')}]`,
        },
      });
      return;
    }

    next();
  };
}

export const adminOnly = requireRoles('admin');
export const patientOnly = requireRoles('patient');
