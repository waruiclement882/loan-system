const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

const authRepository = require(
  '../repositories/authRepository'
);


// Register
const register = async (data) => {

  const {
    full_name,
    email,
    password,
    role
  } = data;


  const existingUser =
    await authRepository.getByEmail(email);


  if (existingUser) {
    throw new Error(
      'Email already exists'
    );
  }


  const password_hash =
    await bcrypt.hash(password, 10);


  const user =
    await authRepository.create({
      full_name,
      email,
      password_hash,
      role
    });


  return user;
};


// Login
const login = async (
  email,
  password
) => {

  const user =
    await authRepository.getByEmail(email);


  if (!user) {
    throw new Error(
      'Invalid credentials'
    );
  }


  const validPassword =
    await bcrypt.compare(
      password,
      user.password_hash
    );


  if (!validPassword) {
    throw new Error(
      'Invalid credentials'
    );
  }


  const token = jwt.sign({

      user_id: user.user_id,

      role: user.role

    },

    process.env.JWT_SECRET,

    {
      expiresIn: '1d'
    }
  );


  return {
    token,
    user
  };
};


module.exports = {
  register,
  login
};