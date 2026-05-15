const authService = require(
  '../services/authService'
);


// Register
const register = async (
  req,
  res
) => {

  try {

    const user =
      await authService.register(
        req.body
      );


    res.status(201).json(user);

  } catch (error) {

    res.status(400).json({
      error: error.message
    });

  }

};


// Login
const login = async (
  req,
  res
) => {

  try {

    const {
      email,
      password
    } = req.body;


    const result =
      await authService.login(
        email,
        password
      );


    res.json(result);

  } catch (error) {

    res.status(401).json({
      error: error.message
    });

  }

};


module.exports = {
  register,
  login
};