const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
//const canvas = require('canvas');
const { createCanvas } = require("@napi-rs/canvas");
const path = require('path');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

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
    },
}));

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
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
app.get('/', (req, res) => {
    const posts = getPosts(req); // Pass the `req` object
    const user = getCurrentUser(req) || {};
    res.render('home', { posts, user });
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement


app.post('/posts', (req, res) => {
    
    let userId = req.session.userId;


    let user = findUserById(userId);
    let { title, content } = req.body;

    if (user && title && content){
        addPost(title, content, user);
        res.redirect('/');
    }
    else {
        res.redirect('/error');
    }
    
    

});
app.post('/like/:id', isAuthenticated, function(req, res) {
    // TODO: Update post likes
    updatePostLikes(req, res);
});



app.post('/delete/:id', isAuthenticated, (req, res) => {
    let postId = parseInt(req.params.id);
    let userId = req.session.userId;

    //find psot index
    let postIndex = posts.findIndex(p => p.id === postId && findUserByUsername(p.username).id === userId);

    if (postIndex !== -1) {
        posts.splice(postIndex, 1);
        res.send({ success: true });
    } 
    else {
        res.status(404).send({ success: false, message: 'Did not findl post' });
    }
});


app.get('/profile', isAuthenticated, (req, res) => {
    renderProfile(req, res);
});
app.get('/avatar/:username', (req, res) => {
    // TODO: Serve the avatar image for the user

    handleAvatar(req,res);



});
app.post('/register', (req, res) => {

    let username = req.body.username;

    if (findUserByUsername(username)) {
        res.redirect('/register?error=Username already exists');
    }
    else {
        //addUser(username)
        registerUser(req, res);
    }

});


app.post('/login', (req, res) => {
    loginUser(req, res);
});

app.get('/logout', (req, res) => {
    logoutUser(req, res);
});



app.get('/emojis', (req, res) => {
    res.sendFile(path.join(__dirname, 'emojis.json'));
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Example data for posts and users
// Sample data for testing the MicroBlog application

// Users object array
let users = [
    {
        id: 1,
        username: 'ByteArtist',
        memberSince: '2024-06-01'
    },
    {
        id: 2,
        username: 'PixelMaster',
        memberSince: '2024-06-01'
    },
    {
        id: 3,
        username: 'EightBits',
        memberSince: '2024-06-01'
    },
    {
        id: 4,
        username: 'RetroRogue',
        memberSince: '2024-06-01'
    },
    {
        id: 5,
        username: 'SpriteSuccessor',
        memberSince: '2024-06-01'
    }
];

// Generate avatars for existing users
for (let i = 0; i < users.length; i++) {
    let user = users[i];
    if (user && !user.avatar_url) {
        let avatarBuffer = generateAvatar(user.username[0]);
        user.avatar_url = "data:image/png;base64," + avatarBuffer.toString('base64');
    }
}



// Posts object array
let posts = [
    {
        id: 1,
        title: 'Getting Started with Pixel Art: An Introductory Guide',
        content: 'Just created a comprehensive guide for beginners covering the basics of pixel art, essential tools, and fundamental techniques.',
        username: 'SpriteSuccessor',
        timestamp: '2024-06-02 08:30',
        likes: 0
    },
    {
        id: 2,
        title: 'Monetizing Your Pixel Art: Tips for Selling and Commissioning Work',
        content: 'Practical advice on how to turn your pixel art hobby into a source of income through commissions, prints, and digital sales.',
        username: 'PixelMaster',
        timestamp: '2024-06-02 09:45',
        likes: 0
    },
    {
        id: 3,
        title: 'Exploring Different Styles of Pixel Art: Minimalism to Hyper-Detail',
        content: 'A look at various pixel art styles, providing examples and techniques for achieving each style.',
        username: 'EightBits',
        timestamp: '2024-06-02 11:00',
        likes: 0
    },
    {
        id: 4,
        title: 'Pixel Art Trends: Whats Hot in 2024',
        content: 'An analysis of current trends in pixel art, predicting future directions and highlighting popular themes and techniques.',
        username: 'RetroRogue',
        timestamp: '2024-06-02 13:00',
        likes: 0
    },
    {
        id: 5,
        title: 'Top 10 Pixel Art Tools for Aspiring Artists',
        content: 'An overview of the best software and online tools available for creating pixel art, with pros and cons for each.',
        username: 'ByteArtist',
        timestamp: '2024-06-02 14:00',
        likes: 0
    },
    {
        id: 6,
        title: 'Top 20 Pixel Art Games You Must Play',
        content: 'A curated list of the best pixel art games across various genres, highlighting what makes each game unique and visually appealing.',
        username: 'RetroRogue',
        timestamp: '2024-06-02 15:00',
        likes: 0
    },
    {
        id: 7,
        title: 'Exploring Minimalist Pixel Art: Less is More',
        content: 'An introduction to minimalist pixel art, showcasing techniques for creating impactful images with a limited number of pixels and colors.',
        username: 'SpriteSuccessor',
        timestamp: '2024-06-02 16:00',
        likes: 0
    },
    {
        id: 8,
        title: 'Seasonal Pixel Art: Designing Art for Holidays and Celebrations',
        content: 'Ideas and techniques for creating pixel art themed around different seasons and holidays, from festive decorations to seasonal landscapes.',
        username: 'PixelMaster',
        timestamp: '2024-06-02 17:00',
        likes: 0
    }

];

// Function to find a user by username
function findUserByUsername(username) {
    for (let i = 0; i < users.length; i++) {
        if (users[i].username === username) {
          return users[i];
        }
    }
    return null;
}

// Function to find a user by user ID
function findUserById(userId) {
    for (let i = 0; i < users.length; i++) {
        if (users[i].id === userId) {
          return users[i];
        }
    }
    return null;
}

// Function to add a new user
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
function registerUser(req, res) {
    // TODO: Register a new user and redirect appropriately
    addUser(req.body.username);
    let createdUser = findUserByUsername(req.body.username);


    req.session.loggedIn = true;
    req.session.userId = createdUser.id;
    

    res.redirect('/');
}

// Function to login a user
function loginUser(req, res) {
    let username = req.body.username;
    let user = findUserByUsername(username);


    if (user) {
        req.session.loggedIn = true;
        req.session.userId = user.id;
        res.redirect('/');
    }
    else {
        res.redirect('/login?error=Invalid username or password');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    //err -> log error, otherwise destroy
    req.session.destroy();
    res.redirect('/');
}

// Function to render the profile page
function renderProfile(req, res) {
    let user = getCurrentUser(req);
    let userPosts = [];
    for (let post of posts) {
        if (post.username === user.username) {
            userPosts.push(post);
        }
    }
    res.render('profile', { user, userPosts });
}

// Function to update post likes
function updatePostLikes(req, res) {
    let postId = parseInt(req.params.id);

    let post;
    for (let i = 0; i < posts.length; i++) {
        if (posts[i].id === postId) {
            post = posts[i];
            break;
        }
    }

    if (post) {
        let likedPostIndex = -1;
        for (let i = 0; i < req.session.likedPosts.length; i++) {
            if (req.session.likedPosts[i] === postId) {
                likedPostIndex = i;
                break;
            }
        }

        if (likedPostIndex !== -1) {
            // unlike
            post.likes -= 1;
            req.session.likedPosts.splice(likedPostIndex, 1);
            res.send({ success: true, likes: post.likes, liked: false });
        } else {
            // like
            post.likes += 1;
            req.session.likedPosts.push(postId);
            res.send({ success: true, likes: post.likes, liked: true });
        }
    } 
    else {
        res.status(404).send({ success: false, message: 'Did not find post' });
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
    else {
        res.status(404).send('Did not find user');
    }
}

// Function to get the current user from session
function getCurrentUser(req) {
    // TODO: Return the user object if the session user ID matches
    if (req.session.userId) {
        return findUserById(req.session.userId);
    }
    else {
        return undefined;
    }
}

// Function to get all posts, sorted by latest first
function getPosts(req) {
    let currentUser = getCurrentUser(req);
    let postsReversed = posts.slice().reverse();
    let result = [];
  
    for (let i = 0; i < postsReversed.length; i++) {
        let post = postsReversed[i];
        let user = findUserByUsername(post.username);
        let newPost = {};

        for (let data in post) {
            newPost[data] = post[data];
        }



        if (user) {
            newPost.avatar_url = user.avatar_url;
        } else {
            newPost.avatar_url = undefined;
        }
        newPost.currentUser = currentUser;

        result.push(newPost);
    }
  
    return result;
}

// Function to add a new post
function addPost(title, content, user, res) {
    // TODO: Create a new post object and add to posts array

    let timestamp = new Date().toISOString();
    let date = timestamp.substring(0, 10);


    let newPost = {
        id: posts.length + 1,
        title,
        content,
        username: user.username,
        timestamp: date,
        likes: 0
    };

    posts.push(newPost);
    
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
