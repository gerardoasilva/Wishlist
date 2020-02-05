let express = require("express"),
  morgan = require("morgan"),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  jwt = require("jsonwebtoken"),
  bcrypt = require("bcrypt"),
  jsonParser = bodyParser.json(),
  { UserList, WishlistList, ItemList } = require("./model"),
  { DATABASE_URL, PORT } = require("./config"),
  app = express(),
  server;


app.get("/users", (req, res) => {
  UserList.getAll()
    .then(userList => {
      return res.status(200).json(userList);
    })
    .catch(error => {
      console.log(error);
      res.statusMessage = "Hubo un error de conexion con la BD";
      return res.status(500).send();
    });
});

app.get("/wishlists", (req, res) => {
  WishlistList.getAll()
    .then(wishlists => {
      return res.status(200).json(wishlists);
    })
    .catch(error => {
      res.statusMessage = "Hubo un error de conexion con la BD";
      return res.status(500).send();
    });
});

app.get("/wishes", (req, res) => {
  ItemList.getAll()
    .then(items => {
      return res.status(200).json(items);
    })
    .catch(error => {
      console.log(error);
      res.statusMessage = "Hubo un error de conexion con la BD";
      return res.status(500).send();
    });
});

app.use(express.static("public"));
app.use(morgan("dev"));

/* 
////////////////////// ENDPOINTS START //////////////////////
*/

///////////////////////////
/////     SIGN IN     /////
///////////////////////////
app.post('/signIn', jsonParser, (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  // Validates inputs
  if (!username || username == "") {
    res.statusMessage = "Nombre de usuario no proporcionado";
    return res.status(406).send();
  }

  if (!password || password == "") {
    res.statusMessage = "Contraseña no proporcionada";
    return res.status(406).send();
  }

  // Validates if user exists
  UserList.getUserByUsername(username)
    .then(user => {
      // User exists
      if (user) {
        // Stores hashed password of user
        let hashedPassword = user.password;

        // Compares input password to saved password in DB
        bcrypt
          .compare(password, hashedPassword)
          .then(result => {
            // Password matches
            if (result) {
              let data = {
                username
              };
              // Create token
              let token = jwt.sign(data, "secret", {
                expiresIn: 60 * 10
              });

              return res.status(200).json({ token });
              // Password doesn't match
            } else {
              console.log("Contraseña incorrecta");
              res.statusMessage = "Contraseña incorrecta";
              return res.status(400).send();
            }
          })
          .catch(error => {
            throw Error(error);
          });
      } else {
        // User doen't exist
        console.log("error");
        res.statusMessage = "Usuario no encontrado";
        return res.status(400).send();
      }
    })
    .catch(error => {
      res.statusMessage = "Hubo un error de conexión con la BD";
      return res.status(500).send();
    });
});

///////////////////////////
/////   CREATE USER   /////
///////////////////////////
app.post('/signUp', jsonParser, (req, res) => {
  let { username, fName, lName, email, password, confirmPassword, bDate } = req.body;

  if (!fName || fName == "") {
    res.statusMessage = "Nombre no proporcionado";
    return res.status(406).send();
  }

  if (!lName || lName == "") {
    res.statusMessage = "Apellido no proporcionado";
    return res.status(406).send();
  }
  if (!username || username == "") {
    res.statusMessage = "Usuario no proporcionado";
    return res.status(406).send();
  }

  if (!email || email == "") {
    res.statusMessage = "Correo electrónico no proporcionado";
    return res.status(406).send();
  }

  if (!password || password == "") {
    res.statusMessage = "Contraseña no proporcionada";
    return res.status(406).send();
  }

  if (!confirmPassword || confirmPassword == "") {
    res.statusMessage = "Contraseña de confirmación no proporcionada";
    return res.status(406).send();
  }

  if (!bDate || bDate == "") {
    res.statusMessage = "Fecha de nacimiento no proporcionada";
    return res.status(406).send();
  }

  if (password != confirmPassword) {
    res.statusMessage = "Contraseñas no coinciden";
    return res.status(406).send();
  }

  // Validate if username is unique
  UserList.getUserByUsername(username)
    .then(result => {
      // User repeated
      if (result) {
        res.statusMessage = "Nombre de usuario no disponible";
        return res.status(409).send();
      }
      // Unique user
      else {
        // Validate if email is unique
        UserList.findByEmail(email)
          .then(result => {
            // Email repeated
            if (result) {
              res.statusMessage =
                "Correo electrónico no disponible, ya existe una cuenta con este correo electrónico";
              return res.status(406).send();
            }
            // Unique email
            else {
              let newUser = {
                username: username,
                fName: fName,
                lName: lName,
                email: email,
                bDate: bDate
              };

              // Encrypt password and adds user to DB
              bcrypt
                .hash(password, 10)
                .then(hashedPassword => {
                  // Add hashed password to user
                  newUser.password = hashedPassword;
                  // Create user in DB
                  UserList.create(newUser)
                    .then(result => {
                      let data = {
                        username
                      };
                      // Creates token
                      let token = jwt.sign(data, "secret", {
                        expiresIn: 60 * 10
                      });

                      res.statusMessage = "Usuario agregado a BD";
                      return res.status(200).json({ result, token });
                    })
                    .catch(error => {
                      res.statusMessage = "Hubo un error de conexión con la BD";
                      return res.status(500).send();
                    });
                })
                .catch(error => {
                  res.statusMessage = "Hubo un error al encriptar el password";
                  return res.status(500).send();
                });
            }
          })
          .catch(error => {
            res.statusMessage = "Hubo un error de conexión con la BD";
            return res.status(500).send();
          });
      }
    })
    .catch(error => {
      res.statusMessage = "Hubo un error de conexión con la BD";
      return res.status(500).send();
    });
});

///////////////////////////
/////   UPDATE USER   ///// *
///////////////////////////
app.put(':username/edit', jsonParser, (req, res) => {
  let userN = req.params.username;
  let token = req.headers.authorization;
  token = token.replace("Bearer ", "");
  // Validate token
  jwt.verify(token, "secret", (err, user) => {
    // Token not valid
    if (err) {
      res.statusMessage = "Token no válido";
      return res.status(401).send();
    }

    // Token valid
    let {username, fName, lName, email, password, confirmPassword, bDate} = req.body;
    //let userN = req.params.username;

    if(userN != user.username || username != user.username){
      res.statusMessage = "El usuario de la sesión activa no coincide";
      return res.status(400).send();
    }

    let newUser = {};

    //Validate inputs
    if (password && password != "") {
      newUser.password = password;

      if(!confirmPassword || confirmPassword == "" ){
        res.statusMessage = "Contraseña de confirmación no proporcionada";
        return res.status(400).send();
      }

    }

    if (password != confirmPassword) {
      res.statusMessage = "Contraseñas no coinciden";
      return res.status(400).send();
    }

    if (username && username != "") {
      newUser.username = username;
    }

    if (fName && fName != "") {
      newUser.fName = fName;
    }

    if (lName && lName != "") {
      newUser.lName = lName;
    }

    if (email && email != "") {
      newUser.email = email;
    }

    if (bDate && bDate != "") {
      newUser.bDate = bDate;
    }

    // Validate if user exists
    UserList.updateUser( user.username, newUser )
      .then ( user => {
        // User exist
        if( user ){

          let data = {
            username
          };
          // Create token
          token = jwt.sign(data, "secret", {
            expiresIn: 60 * 10
          });
          
          res.statusMessage = "Información del usuario actualizada exitosamente";
          return res.status(200).json({user, token})
        }
        // User does not exist
        else{
          res.statusMessage = "Usuario no encontrado";
          return res.status(404).send();
        }

      })
      .catch( error => {
        res.statusMessage = "Error en la BD al actualizar la infromación del usuario";
        return res.status(500);
      })

  });
});

///////////////////////////
/////   DELETE USER   /////
///////////////////////////
app.delete('/:username/unregister', jsonParser, (req, res) => {
  let usrN = req.params.username;
  let token = req.headers.authorization;
  token = token.replace("Bearer ", "");

  // Validate token
  jwt.verify(token, "secret", (err, user) => {
    // Not valid token
    if (err) {
      res.statusMessage = "Token no es válido";
      return res.status(403).send();
    }

    // Valid token
    // Validate username and active session's username are the same
    if (usrN != user.username) {
      res.statusMessage = "El usuario de la sesión activa no coincide";
      return res.status(400).send();
    }

    // Delete user from DB
    UserList.delete(usrN)
      .then(deletedUsr => {
        if(deletedUsr.length == 0){
          res.statusMessage = "Usuario no encontrado en la BD";
          return res.status(401).send();
        }
        else{
          res.statusMessage = "Usuario eliminado exitosamente de la BD";
          return res.status(200).json(deletedUsr);

        }
        
      })
      .catch(error => {
        res.statusMessage = "Usuario no encontrado en la BD";
        return res.status(404).send();
      });
  });
});

///////////////////////////
///// CREATE WISHLIST /////
///////////////////////////
app.post('/:username/newWishlist', jsonParser, (req, res) => {
  // Store token
  let token = req.headers.authorization;
  token = token.replace("Bearer ", "");
  // Validate token
  jwt.verify(token, "secret", (err, user) => {
    // Token not valid
    if (err) {
      res.statusMessage = "Token no válido";
      return res.status(401).send();
    }
    // Token valid
    let username = req.params.username;
    let { title, description, isPublic, isSecured, password } = req.body;

    // Validate user with active session to the url parameter
    if (username != user.username) {
      res.statusMessage = "El usuario de la sesión activa no coincide";
      return res.status(400).send();
    }

    // Validate inputs
    if (!title || title == "") {
      res.statusMessage = "Título no proporcionado";
      return res.status(406).send();
    }

    let newWishlist = {
      title
    };

    if (description && description != "") {
      newWishlist.description = description;
    }

    if (isPublic) {
      newWishlist.isPublic = true;
    }

    if (isSecured) {
      newWishlist.isSecured = true;
      if (!password || password == "") {
        res.statusMessage = "Contraseña no proporcionada";
        return res.status(406).send();
      }
      newWishlist.password = password;
    }

    // Get user from username
    UserList.getUserByUsername(username)
      .then(user => {
        // Get user's wishlists
        WishlistList.getAllByAuthor(user._id)
          .then(wishlists => {
            console.log(wishlists);
            // Validate if number of wishlists is exceeded
            if (wishlists.length >= 5) {
              res.statusMessage = "Número de wihlistas excedido";
              return res.status(403).send();
            }
            // Number of wishlists not exceeded
            for (let i of wishlists) {
              // Title is repeated
              if (i.title == title) {
                res.statusMessage =
                  "Título de wishlista no disponible, ya existe";
                return res.status(409).send();
              }
            }
            // Whishlist title available
            // Add author to newWishlist
            newWishlist.author = user._id;
            // Create wishlist
            WishlistList.create(newWishlist)
              .then(wishlist => {
                let data = {
                  username
                };
                // Renew token
                token = jwt.sign(data, "secret", {
                  expiresIn: 60 * 10
                });

                res.statusMessage = "Wishlista creada exitosamente";
                return res.status(201).json({ wishlist, token });
              })
              .catch(error => {
                res.statusMessage = "Hubo un error de conexión con la BD.";
                return res.status(500).send();
              });
          })
          .catch(error => {
            res.statusMessage = "Hubo un error de conexión con la BD";
            return res.status(500).send();
          });
      })
      .catch(error => {
        res.statusMessage = "Hubo un error de conexión con la BD";
        return res.status(500).send();
      });
  });
});

///////////////////////////
///// UPDATE WISHLIST ///// *
///////////////////////////
app.put('/:username/updateWishlist', jsonParser, (req, res) => {
  // Store token
  let token = req.headers.authorization;
  token = token.replace("Bearer ", "");
  // Validate token
  jwt.verify(token, "secret", (err, user) => {
      // Token not valid
      if (err) {
        res.statusMessage = "Token no válido";
        return res.status(403).send();
      }
      // Token valid
      let username = req.params.username;
      let { title, description, isPublic, isSecured, password } = req.body;

      // Validate user with active session to the url parameter
      if (username != user.username) {
        res.statusMessage = "El usuario de la sesión activa no coincide";
        return res.status(400).send();
      }

      let newWishlist = { };

      if (title && title != "") {
        newWishlist.title = title;
      }

      if (description && description != "") {
        newWishlist.description = description;
      }

      if (isPublic) {
        newWishlist.isPublic = true;
      }

      if (isSecured) {
        newWishlist.isSecured = true;
        if (!password || password == "") {
          res.statusMessage = "Contraseña no proporcionada";
          return res.status(406).send();
        }
        newWishlist.password = password;
      }

      WishlistList.getIdByAuthor(username)
      .then( user => {
        for (let i of wishlists) {
          // Title is repeated
          if (i.title == title) {
            res.statusMessage = "Título de wishlista no disponible, ya existe";
            return res.status(409).send();
          }
        }

        WishlistList.updateWishlist(newWishlist)
          .then( wishist => {
            let data = {
              username
            };

            // Renew token
            token = jwt.sign(data, "secret", {
              expiresIn: 60 * 10
            });

            res.statusMessage = "Wishlista creada exitosamente";
            return res.status(200).json({ wishlist, token });         

          })
          .catch( error => {
            res.statusMessage = "Hubo un error de conexión con la BD";
            return res.status(500).send();
          });



      })
      .catch( error => {
        res.statusMessage = "Hubo un error de conexión con la BD";
        return res.status(500).send();
      });

  });
});


///////////////////////////
///// DELETE WISHLIST /////
///////////////////////////
app.delete('/:username/deleteWishlist/:wishlist', (req, res) => {
  // Store token
  let token = req.headers.authorization;
  token = token.replace("Bearer ", "");

  // Validate token
  jwt.verify(token, "secret", (err, user) => {
    // Not valid token
    if (err) {
      res.statusMessage = "Token no válido";
      return res.status(401).send();
    }

    // Valid token
    let {username, wishlist} = req.params;

    // Validate active user and param user are the same
    if (username != user.username) {
      res.statusMessage = "El usuario de la sesión activa no coincide";
      return res.status(400).send();
    }

    // Get user from username
    UserList.getUserByUsername(username)
    .then( user => {
      // Deletes wishlist
      WishlistList.delete(user._id, wishlist)
      .then(result => {
        let data = {
          username
        };

        // Renew token
        let token = jwt.sign(data, "secret", {
          expiresIn: 60 * 10
        });

        return res.status(200).json({ result, token });
      })
      .catch(error => {
        res.statusMessage = "Wishlista no encontrada";
        return res.status(401).send();
      });
    })
    .catch( error => {
      res.statusMessage= "Usuario no encontrado";
      return res.status(401).send();
    })

  });
});

///////////////////////////
/////   CREATE WISH   /////
///////////////////////////
app.post('/:username/:wishlist/createWish', jsonParser, (req, res) => {
  // Store token
  let token = req.headers.authorization;
  token = token.replace("Bearer ", "");
  // Validate token
  jwt.verify(token, "secret", (err, user) => {
    // Token not valid
    if (err) {
      res.statusMessage = "Token no válido";
      return res.status(401).send();
    }
    // Token valid
    let username = req.params.username;
    let wishlistTitle = req.params.wishlist;

    if (username != user.username) {
      res.statusMessage = "El usuario de la sesión activa no coincide";
      return res.status(400).send();
    }

    let {
      wishName,
      productImage,
      priority,
      notes,
      shoppingURL,
      isReserved
    } = req.body;

    // Item to add to wishlist
    let newItem = { wishName, priority };

    // Validate inputs
    if (!wishName || wishName == "") {
      res.statusMessage = "Wish no proporcionado";
      return res.status(406).send();
    }

    if (!priority || priority == "") {
      res.statusMessage = "Prioridad no proporcionada";
      return res.status(406).send();
    }

    if (productImage && productImage != "") {
      newItem.productImage = productImage;
    }

    if (notes && notes != "") {
      newItem.notes = notes;
    }

    if (shoppingURL && shoppingURL != "") {
      newItem.shoppingURL = shoppingURL;
    }

    if (isReserved) {
      newItem.isReserved = true;
    }

    // Find user from username
    UserList.getUserByUsername(username)
      .then(user => {
        // Get all user's wishlists
        WishlistList.getAllByAuthor(user._id)
          .then(wishlists => {
            // Find wishlist
            WishlistList.getWishlistByTitle(wishlistTitle, user._id)
              .then(wishlist => {
                if (!wishlist) {
                  res.statusMessage = "Wishlist no encontrada";
                  return res.status(401).send();
                }
                // Get items from wishlist
                ItemList.getAllByWishlist(wishlist._id)
                  .then(wishes => {
                    // Validate if number of wishes is exceeded
                    if (wishes.length >= 10) {
                      res.statusMessage = "Número de wishes excedido";
                      return res.status(409).send();
                    }
                    // Validate if title is repeated
                    for (let i of wishes) {
                      if (i.wishName == wishName) {
                        res.statusMessage = "Título de wish no disponible, ya existe";
                        return res.status(409).send();
                      }
                      if(i.priority == priority){
                        res.statusMessage = "Prioridad de wish no disponible, ya existe";
                        return res.status(409).send();
                      }
                    }

                    // Wish title available
                    // Add wish to wishlist
                    newItem.wishlist = wishlist._id;
                    // Create wish
                    ItemList.create(newItem)
                      .then(addedItem => {
                        let data = {
                          username
                        };
                        let token = jwt.sign(data, "secret", {
                          expiresIn: 60 * 10
                        });

                        res.statusMessage = "Wish agregado exitosamente a Wishlista";
                        return res.status(201).json({ addedItem, token });
                      })
                      .catch(error => {
                        res.statusMessage =
                          "Hubo un error de conexión con la BD.";
                        return res.status(500).send();
                      });
                  })
                  .catch(error => {
                    res.statusMessage = "Hubo un error de conexión con la BD=";
                    return res.status(500).send();
                  });
              })
              .catch(error => {
                res.statusMessage = "Hubo un error de conexión con la BD.";
                return res.status(401).send();
              });
          })
          .catch(error => {
            res.statusMessage = "Usuario no encontrado";
            return res.status(401).send();
          });
      })
      .catch(error => {
        res.statusMessage = "Hubo un error de conexión con la BD";
        return res.status(500).send();
      });
  });
});

///////////////////////////
/////   UPDATE WISH   /////
///////////////////////////

///////////////////////////
/////   DELETE WISH   /////
///////////////////////////
app.delete('/:username/:wishlist/:wish/delete', jsonParser, (req, res) => {
  
});


////////////////////// ENDPOINTS END //////////////////////

/* Server & Database config */
function runServer(port, databaseUrl) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, response => {
      if (response) {
        return reject(response);
      } else {
        server = app
          .listen(port, () => {
            console.log("App is running on port " + port);
            resolve();
          })
          .on("error", err => {
            mongoose.disconnect();
            return reject(err);
          });
      }
    });
  });
}

function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log("Closing the server");
      server.close(err => {
        if (err) {
          return reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

runServer(PORT, DATABASE_URL);

module.exports = { app, runServer, closeServer };
