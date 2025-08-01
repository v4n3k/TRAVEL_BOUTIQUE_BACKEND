import bcrypt from 'bcrypt';
import { config as dotenvConfig } from 'dotenv-esm';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { getDotEnvVar, validateAuthToken } from '../utils/utils.js';

dotenvConfig();

const JWT_SECRET = getDotEnvVar("JWT_SECRET");
const SIGN_UP_SECRET = getDotEnvVar("SIGN_UP_SECRET");
const IS_DEV = getDotEnvVar('NODE_ENV') === 'dev';

class AuthController {
  async signUp(req, res) {
    try {
      const { login, password, signUpSecret } = req.body;

      if (!login || !password || !signUpSecret) {
        return res.status(400).json({ error: 'Login, password and secret key are required' });
      }

      if (signUpSecret !== SIGN_UP_SECRET) {
        return res.status(401).json({ error: 'Invalid secret key' });
      }

      const existingUser = await db.query('SELECT * FROM users WHERE login = $1', [login]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'login already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 8);

      const newUserResult = await db.query(
        'INSERT INTO users (login, password) VALUES ($1, $2) RETURNING id, login',
        [login, hashedPassword]
      );

      const newUser = newUserResult.rows[0];

      res.json({ message: 'User created successfully', user: newUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async signIn(req, res) {
    try {
      const { login, password } = req.body;

      const adminDoesNotExistError = {
        error: `Admin with login ${login} does not exist`,
        errorRu: `Администратор с логином ${login} не существует`
      };
      const wrongPasswordError = { error: 'Wrong password', errorRu: 'Неправильный пароль' };

      if (!login || !password) {
        return res.status(400).json({ error: 'Login and password are required' });
      }

      const userResult = await db.query('SELECT * FROM users WHERE login = $1', [login]);
      const user = userResult.rows[0];

      if (!user) {
        return res.status(401).json(adminDoesNotExistError);
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json(wrongPasswordError);
      }

      const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, {
        expiresIn: '7d',
      });

      res.cookie('authToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: IS_DEV ? 'None' : 'Lax',
        maxAge: 60 * 60 * 1000 * 24 * 7, // 7 days
      });

      res.json({ message: 'Sign in successful', login });
    } catch (err) {
      res.status(500).json({ error: err, errorMessage: err.message });
    }
  }

  async signOut(req, res) {
    try {
      validateAuthToken(req);

      res.cookie('authToken', '', {
        httpOnly: true,
        secure: IS_DEV ? true : false,
        sameSite: IS_DEV ? 'None' : 'Lax',
        expires: new Date(0),
      });

      res.json({ message: 'Sign out successful' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  checkIsAuth(req, res) {
    try {
      const authHeader = req.headers.cookie;

      if (!authHeader) {
        return res.status(401).json({ isAuth: false, error: 'Unauthorized: No cookie header' });
      }

      const tokenMatch = authHeader.match(/authToken=([^;]+)/);

      if (!tokenMatch) {
        return res.status(401).json({ isAuth: false, error: 'Unauthorized: authToken not found in cookie' });
      }

      const token = tokenMatch[1];

      if (!token) {
        return res.status(401).json({ isAuth: false, error: 'Unauthorized: No token in cookie' });
      }

      try {
        jwt.verify(token, process.env.JWT_SECRET, (err) => {
          if (err) {
            return res.status(401).json({ isAuth: false, error: 'Invalid or expired token', message: err.message });
          } else {
            return res.json({ isAuth: true });
          }
        });
      } catch (err) {
        return res.status(500).json({ isAuth: false, error: 'Internal server error during verification', message: err.message });
      }
    } catch (err) {
      res.status(500).json({ isAuth: false, error: 'Internal Server Error', message: err.message });
    }
  }
}

export default new AuthController();