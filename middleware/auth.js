// custom middleware
import jwt from "jsonwebtoken";

export const authorizedUser = async (req, res, next) => {

  const header = req.header('Authorization');
  const [type, token] = header.split(' ');
  if (type === 'Bearer' && typeof token !== 'undefined') {
    try {
      let payload = jwt.verify(token, process.env.SECRET_KEY);
      next();
    } catch (err) {
      res.status(401).send({ code: 123, message: 'Invalid or expired token.' });
    }
  } else {
    res.status(401).send({ code: 456, message: 'Invalid token' });
  }
};
