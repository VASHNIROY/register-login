const express = require("express");

const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());

const databasePath = path.join(__dirname, "userData.db");

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost/3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const userNameQuery = `SELECT *
             FROM user
             WHERE username = '${username}';`;
  const userDetails = await database.get(userNameQuery);

  if (userDetails !== undefined) {
    //user already exists
    response.status(400);
    response.send("User already exists");
  } else {
    if (password < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `INSERT INTO 
                user(username,name,password,gender,location)
                VALUES(
                    '${username}',
                    '${name}',
                    '${hashedPassword}',
                    '${gender}',
                    '${location}');`;
      const createdUser = await database.run(createUserQuery);

      response.status(200);
      response.send("User created successfully");
    }
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `SELECT *
         FROM user
         WHERE username = '${username}';`;
  const userDetails = await database.get(userQuery);

  if (userDetails === undefined) {
    //unregistered user
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      userDetails.password
    );
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//change password API 3

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const convertnewToHashedPassword = await bcrypt.hash(
    request.body.newPassword,
    10
  );
  const getPasswordQuery = `SELECT *
             FROM user
             WHERE username = '${username}';`;
  const databasePassword = await database.get(getPasswordQuery);
  const isPasswordMatched = await bcrypt.compare(
    oldPassword,
    databasePassword.password
  );

  if (isPasswordMatched !== true) {
    response.status(400);
    response.send("Invalid current password");
  } else {
    if (newPassword < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const updatePasswordQuery = `UPDATE 
                        user
                     SET
                        password = '${convertnewToHashedPassword}'
                    WHERE username = '${username}';`;
      await database.run(updatePasswordQuery);
      response.status(200);
      response.send("Password updated");
    }
  }
});

module.exports = app;
