import { authService } from "../services/auth.service.js";

export async function adminLoginController(req, res, next) {
  try {
    const payload = await authService.adminLogin(req.body);
    res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
}

export async function firebaseLoginController(req, res, next) {
  try {
    const payload = await authService.firebaseLogin(req.body);
    res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
}

export async function verifySessionController(req, res, next) {
  try {
    const payload = await authService.verifySession(req.auth);
    res.status(200).json({ success: true, ...payload });
  } catch (error) {
    next(error);
  }
}
