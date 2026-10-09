import { Request, Response, NextFunction } from 'express';

export function enforcePatientIsolation(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication session required.',
      },
    });
    return;
  }

  // Admins can query any patient; assign scopedPatientId if specified in params/query
  if (req.user.role === 'admin') {
    const targetPatientId =
      req.params.patientId ||
      (req.query.patientId as string | undefined) ||
      req.body.patientId;

    if (targetPatientId) {
      req.scopedPatientId = targetPatientId;
    }
    next();
    return;
  }

  // For Patients: enforce hard lock to their own authenticated patientId
  const authenticatedPatientId = req.user.patientId;
  if (!authenticatedPatientId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_ISOLATION_VIOLATION',
        message: 'No patient profile linked to this user account.',
      },
    });
    return;
  }

  // Check if caller is attempting to target another patient via params, query, or body
  const paramId = req.params.patientId;
  const queryId = req.query.patientId as string | undefined;
  const bodyId = req.body?.patientId;

  if (paramId && paramId !== authenticatedPatientId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_ISOLATION_VIOLATION',
        message: 'Access denied: You are not authorized to access records for another patient.',
      },
    });
    return;
  }

  if (queryId && queryId !== authenticatedPatientId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_ISOLATION_VIOLATION',
        message: 'Access denied: You are not authorized to query records for another patient.',
      },
    });
    return;
  }

  // If a patient attempts to pass another patientId in the body, reject or force override
  if (bodyId && bodyId !== authenticatedPatientId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_ISOLATION_VIOLATION',
        message: 'Access denied: Cannot assign medical documents to another patient.',
      },
    });
    return;
  }

  // Hard-lock scopedPatientId to the authenticated token
  req.scopedPatientId = authenticatedPatientId;

  // Auto-overwrite body patientId with verified identity for safe downstream ingestion
  if (req.body && typeof req.body === 'object') {
    req.body.patientId = authenticatedPatientId;
  }

  next();
}
