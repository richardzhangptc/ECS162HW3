//SERVER.JS


const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
//const canvas = require('canvas');
const { createCanvas } = require("@napi-rs/canvas");
const path = require('path');

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

const initializeDB = require('./populatedb');

const dbFileName = 'microblog.db';

const passport = require('./passport');











//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const app = express();
const PORT = 3000;

async function connectToDatabase() {
    try {
        const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database});



        console.log('Connected to the db.');
        return db;
    } catch (err) {
        console.error('issue:', err);
    }
}




let db;

async function startServer() {
    try {
        db = await connectToDatabase();


        await initializeDB();

        updateUsersWithAvatars();


        app.listen(PORT, () => {

        console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {

        console.error('iisue:', err);
    }
  }
  
startServer();

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
//
app.engine('handlebars', expressHandlebars.engine({
    helpers: {
        toLowerCase: function (str) {
            return str.toLowerCase();
        },
        ifCond: function (v1, v2, options) {
            if (v1 === v2) {
                return options.fn(this);
            }
            return options.inverse(this);
        },
        eq: function(a, b) {
            return a === b;
        }
        
    },
}));

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: process.env.SESSION_SECRET,     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with letants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'PixBlog';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';


    
    req.session.likedPosts = req.session.likedPosts || [];
    res.locals.currentUser = getCurrentUser(req);
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//




app.get('/', async (req, res) => {
    try {

        const posts = await getPosts(req);
        const user = await getCurrentUser(req) || {};
        res.render('home', { posts, user});
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.redirect('/error');
    }
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {

    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('googleSignIn');
    //res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
app.get('/error', (req, res) => {
    res.render('error');
});


app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email', 'openid'] })
);

app.get('/auth/google/callback', async (req, res) => {

    passport.authenticate('google', { scope: ['profile', 'email', 'openid'],
        failureRedirect: '/'
    }) (req, res, async () => {
//p0

        const googleId = req.user.id;
        //console.log("GOOGLE ID IS " + googleId);



        const hashedGoogleId = hash(googleId);
        req.session.hashedGoogleId = hashedGoogleId;
 
 
        try {
            let loc = await findUserByHashedGoogleId(hashedGoogleId);

            if (loc) {
                req.session.userId = loc.id;
                req.session.loggedIn = true;
                res.redirect('/');
            } 
            else {
                res.redirect('/registerUsername');
            }
        } catch (err) {
            console.error('issue:', err);
            res.redirect('/error');
        }
    });
 
 
 });
 
 
 

function hash(input) {


    input = String(input);
    
    let hashValue = 0;

    for (let i = 0; i < input.length; i++) {

        hashValue+=input.charCodeAt(i);

    }


    return hashValue;
}




async function findUserByHashedGoogleId(hashedID) {


    //console.log("LOOKING FOR USER WITH HASHED ID OF " + hashedID);

    try {

        let userFound = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', [hashedID]);
        if (userFound) {

          return userFound;
        }
        else{

            return null;
        }
      } catch (err) {
        console.error('issue:', err);
        res.redirect('/error');


      }{}

}





app.get('/registerUsername', (req, res) => {

    res.render('registerUsername', { regError: req.query.error });
});



app.post('/posts', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const { title, content } = req.body;

    if (userId && title && content) {
        let user = await findUserById(userId);


        if (user) {

            await addPost(title, content, user);
            res.redirect('/');
        } else {
            //console.log("ISSUE POINT 1");
            res.redirect('/error');
        }
    } else {
        //console.log("ISSUE POINT 2");
        res.redirect('/error');
    }
});


app.post('/like/:id', isAuthenticated, function(req, res) {
    //console.log("liking");
    // TODO: Update post likes
    updatePostLikes(req, res);
});


app.post('/updateSorting/:sortMode', isAuthenticated, (req, res) => {
    const sortMode = req.params.sortMode;
    req.session.sortMode = sortMode;
    
    res.send({ success: true });
});



app.post('/delete/:id', isAuthenticated, async (req, res) => {
    const postId = parseInt(req.params.id);
    const userId = req.session.userId;

    try {
        let post = await db.get('SELECT * FROM posts WHERE id = ?', [postId]);
        let user = await findUserById(userId);


        if (user.role == 'user' && (!post || post.username !== user.username)) {
            return res.send({ success: false, message: 'not found or no perms' });
        }


        await db.run('DELETE FROM posts WHERE id = ?', [postId]);

        res.send({ success: true });
    } 
    catch (err) {
        console.error('issue:', err);
        res.send({ success: false, message: 'issue deleting post' });
    }
});


app.get('/profile', isAuthenticated, (req, res) => {
    renderProfile(req, res);
});
app.get('/avatar/:username', (req, res) => {
    // TODO: Serve the avatar image for the user

    handleAvatar(req,res);



});
app.post('/register', async (req, res) => {
    let username = req.body.username;
  
    try {
        const check = await db.get('SELECT * FROM users WHERE username = ?', [username]);

        
        if (check) {
            return res.redirect('/registerUsername?error=Username already exists');
        }
    
        await registerUser(req, res, username);


    } catch (err) {
        console.error('issue:', err);
        res.redirect('/error');
    }{}
  });


app.post('/login', async (req, res) => {
    try {
      await loginUser(req, res);

    } catch (err) {
      
      res.redirect('/error');
      
    }
});



app.get('/logout', (req, res) => {

    req.session.destroy((err) => {
        if (err) {
            res.redirect('/error');
        } else {

            res.redirect('/googleLogout');
        }
    });
});


app.get('/googleLogout', isAuthenticated, (req, res) => {

    res.render('googleLogout');
});


app.get('/emojis', (req, res) => {
    res.sendFile(path.join(__dirname, 'emojis.json'));
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/*
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
*/
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Example data for posts and users
// Sample data for testing the MicroBlog application









// Function to find a user by username
async function findUserByUsername(username) {
    try {
      const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

      return user;



    } catch (err) {

      return null;
    }
}
  

async function findUserById(userId) {
    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

        return user;

    } catch (err) {

        return null;
    }
}

// Function to add a new user

/*
function addUser(username) {

    let timestamp = new Date().toISOString();
    let date = timestamp.substring(0, 10);

    
    let newUser = {
        id: users.length + 1,
        username: username,
        avatar_url: undefined,
        memberSince: date
    };


    users.push(newUser);
}
*/
// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log(req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
async function registerUser(req, res, username) {
    try {

        let timing = new Date().toLocaleString('en-CA', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false 
        }).replace(',', '');


        const avatarBuffer = generateAvatar(username[0]);
        const avatarUrl = "data:image/png;base64," + avatarBuffer.toString('base64');




        await db.run('INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
        [username, req.session.hashedGoogleId, avatarUrl, timing]);

    
  
        let createdUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        req.session.loggedIn = true;
        req.session.userId = createdUser.id;

  
        res.redirect('/');

    } catch (err) {

      res.redirect('/error');
    }
  }

// Function to login a user
async function loginUser(req, res) {
    const { username } = req.body;
    //console.log(username);
  
    try {
        let user = await db.get('SELECT * FROM users WHERE username = ?', [username]);


        if (user) {
            //console.log(user.id);
            req.session.loggedIn = true;
            req.session.userId = user.id;

            console.log("LOGGED IN ID IS: " + req.session.userId);

        

        res.redirect('/');
      } 
      
      else {
        res.redirect('/login?error=INVALID username. Try Another');
      }


    } catch (err) {
      throw err;
    }
}



// Function to logout a user
function logoutUser(req, res) {
    //err -> log error, otherwise destroy
    req.session.destroy();
    res.redirect('/');
}

// Function to render the profile page
async function renderProfile(req, res) {
    try {
        
        let user = await getCurrentUser(req);
        if (!user) {
            return res.redirect('/login');
        }

        //console.log("USER ROLE IS " + user.role);

        let yourPosts = await db.all('SELECT * FROM posts WHERE username = ? ORDER BY timestamp DESC', [user.username]);

   
        
        yourPosts = await Promise.all(yourPosts.map(async (post) => {
            let temp = { ...post };
            temp.avatar_url = user.avatar_url;

            return temp;
        }));

        res.render('profile', { user, userPosts: yourPosts });

    } catch (err) {
        console.error('issue with ', err);
        res.redirect('/error');
    }
}




async function updatePostLikes(req, res) {
    const postId = parseInt(req.params.id);
    const userId = req.session.userId;

    try {
        
        let alreadyLiked = await db.get('SELECT * FROM likes WHERE userId = ? AND postId = ?', [userId, postId]);

        if (alreadyLiked) {
   //unlike
            await db.run('DELETE FROM likes WHERE userId = ? AND postId = ?', [userId, postId]);
            await db.run('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
            res.send({success: true, likes: (await getPostLikes(postId)), liked: false});
        } 
        else {

            //like it
            await db.run('INSERT INTO likes (userId, postId) VALUES (?, ?)', [userId, postId]);
            await db.run('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);

            res.send({success: true, likes: (await getPostLikes(postId)), liked: true});
        }


    } 
    catch (err) {
        res.send({ success: false, message: 'Issue liking post'});
    }
}

async function getPostLikes(postId) {
    try {
        const post = await db.get('SELECT likes FROM posts WHERE id = ?', [postId]);
        return post.likes || 0;
    } catch (err) {
        console.error('Error getting post likes:', err);
        return 0;
    }
}


// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    // TODO: Generate and serve the user's avatar image
    let username = req.params.username;
    let user = findUserByUsername(username);

    if (user && !user.avatar_url) {
        let avatarBuffer = generateAvatar(username[0]);
        user.avatar_url = "data:image/png;base64," + avatarBuffer.toString('base64');
        res.redirect(user.avatar_url);
    } 
    else if (user){
        res.redirect(user.avatar_url);
    }

    //issur
    else {
        res.send('Did not find user');
    }
}



async function getCurrentUser(req) {

    
    if (req.session.userId) {
        return await findUserById(req.session.userId);
    }
    else 
    {
        return undefined;
    }
}


async function getPosts(req) {
    const sortMode = req.session.sortMode || 'Recency'; //dfeault

    try {
        let currentUser = await getCurrentUser(req);
        let posts = await db.all('SELECT * FROM posts ORDER BY timestamp DESC');

        let result = await Promise.all(posts.map(async (post) => {

            let user = await findUserByUsername(post.username);


            let newPost = { ...post };

            if (user) {
                newPost.avatar_url = user.avatar_url;
            }

            else {
                newPost.avatar_url = undefined;
            }

            newPost.currentUser = currentUser;
            return newPost;
        }));


        let sortedPosts = sortPosts(sortMode, result);


        return sortedPosts;
    } 
    catch (err) {
        console.error('Error fetching posts:', err);
        return [];//empoty
    }
}

function sortPosts(mode, posts) {

    if (mode === 'Recency') {

        posts.sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp));

    }
    else if (mode === 'Likes') {
        posts.sort((x, y) => y.likes - x.likes);
    }

    return posts;


}


// Function to add a new post
async function addPost(title, content, user) {
    try {


        let timing = new Date().toLocaleString('en-CA', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false 
        }).replace(',', '');



        await db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)', [title, content, user.username, timing, 0]
        );


    } catch (err) {
        console.error('Issue with :', err);
    }
}


// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {

    // TODO: Generate an avatar image with a letter
    // Steps:
    // 1. Choose a color scheme based on the letter
    // 2. Create a canvas with the specified width and height
    // 3. Draw the background color
    // 4. Draw the letter in the center
    // 5. Return the avatar as a PNG buffer



    let colorSchemes = ['#32a852', '#a83632', '#32a8a6', '#4e32a8'];

    let randIndex = Math.floor(Math.random() * colorSchemes.length);
    let color = colorSchemes[randIndex];

    let canvas = createCanvas(width, height);
    let context = canvas.getContext('2d');

    context.fillStyle = color;
    context.fillRect(0, 0, width, height);


    let fontSize = Math.round(height / 2);
    context.font = `${fontSize}px Arial`;
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter.toUpperCase(), width / 2, height / 2);


    return canvas.toBuffer('image/png');
}




async function updateUsersWithAvatars() {
    try {
      let allusers = await db.all('SELECT * FROM users');
  
      for (let user of allusers) {
        if (!user.avatar_url) {
          const avatarBuffer = generateAvatar(user.username[0]);
          const avatarUrl = "data:image/png;base64," + avatarBuffer.toString('base64');
  
        
          await db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, user.id]);
        }
      }

    } 
    catch (err) {
      console.error('issue:', err);
    }

  }




app.post('/deleteaccount/', isAuthenticated, async (req, res) => {
    //console.log("DELETING ACCOUNT");
    
    let userId = req.session.userId;

    try {
        await db.run('DELETE FROM posts WHERE username = (SELECT username FROM users WHERE id = ?)', [userId]);
    

        let likedPostIds = await db.all('SELECT postId FROM likes WHERE userId = ?', [userId]);
        for (let { postId } of likedPostIds) {
            await db.run('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
        }
        await db.run('DELETE FROM likes WHERE userId = ?', [userId]);

    

        await db.run('DELETE FROM users WHERE id = ?', [userId]);

        req.session.destroy();
        res.send({ success: true });
    }

    catch (err) {
        res.send({ success: false, message: 'issue deleting account' });
    }


});


app.post('/setAdminMode', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        await db.run('UPDATE users SET role = "admin" WHERE id = ?', [userId]);

        res.send({ success: true });
    }
    catch (err) {
        res.send({ success: false, message: 'issue setting admin mode' });
    }
});

app.post('/exitAdminMode', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        await db.run('UPDATE users SET role = "user" WHERE id = ?', [userId]);


        res.send({ success: true });
    }
    catch (err) {
        res.send({ success: false, message: 'issue exiting admin mode' });
    }
});



app.post('/adminremoveaccount/:id', isAuthenticated, async (req, res) => {
    let postId = parseInt(req.params.id);

    let post = await db.get('SELECT * FROM posts WHERE id = ?', [postId]);
    let username = post.username;
    let user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    let userId = user.id;



    try {

        await db.run('DELETE FROM posts WHERE username = (SELECT username FROM users WHERE id = ?)', [userId]);

        const likedPostIds = await db.all('SELECT postId FROM likes WHERE userId = ?', [userId]);
        for (const { postId } of likedPostIds) {
            await db.run('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
        }


        await db.run('DELETE FROM likes WHERE userId = ?', [userId]);

        await db.run('DELETE FROM users WHERE id = ?', [userId]);

        res.send({ success: true });

    }
    catch (err) {
        res.send({ success: false, message: 'issue removing account' });
    }

    
});