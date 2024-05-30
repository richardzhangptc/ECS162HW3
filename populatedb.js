// populatedb.js

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Placeholder for the database file name
const dbFileName = 'microblog.db';

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });



    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS likes (
            userId INTEGER NOT NULL,
            postId INTEGER NOT NULL,
            PRIMARY KEY (userId, postId),
            FOREIGN KEY (userId) REFERENCES users(id),
            FOREIGN KEY (postId) REFERENCES posts(id)
        );

        
    `);




    // Sample data - Replace these arrays with your own data
    const users = [
        { username: 'ByteArtist', hashedGoogleId: 'hashedGoogleId1', avatar_url: '', memberSince: '2024-06-01 12:00:00' },
        { username: 'PixelMaster', hashedGoogleId: 'hashedGoogleId2', avatar_url: '', memberSince: '2024-06-01 12:00:00' },
        { username: 'EightBits', hashedGoogleId: 'hashedGoogleId3', avatar_url: '', memberSince: '2024-06-01 12:00:00' },
        { username: 'RetroRogue', hashedGoogleId: 'hashedGoogleId4', avatar_url: '', memberSince: '2024-06-01 12:00:00' },
        { username: 'SpriteSuccessor', hashedGoogleId: 'hashedGoogleId5', avatar_url: '', memberSince: '2024-06-01 12:00:00' }
    ];

    const posts = [
        { title: 'Getting Started with Pixel Art: An Introductory Guide', content: 'Just created a comprehensive guide for beginners covering the basics of pixel art, essential tools, and fundamental techniques.', username: 'SpriteSuccessor', timestamp: '2024-02-02 08:30:00', likes: 0 },
        { title: 'Monetizing Your Pixel Art: Tips for Selling and Commissioning Work', content: 'Practical advice on how to turn your pixel art hobby into a source of income through commissions, prints, and digital sales.', username: 'PixelMaster', timestamp: '2024-02-02 09:45:00', likes: 0 },
        { title: 'Exploring Different Styles of Pixel Art: Minimalism to Hyper-Detail', content: 'A look at various pixel art styles, providing examples and techniques for achieving each style.', username: 'EightBits', timestamp: '2024-02-02 11:00:00', likes: 0 },
        { title: 'Pixel Art Trends: Whats Hot in 2024', content: 'An analysis of current trends in pixel art, predicting future directions and highlighting popular themes and techniques.', username: 'RetroRogue', timestamp: '2024-02-02 13:00:00', likes: 0 },
        { title: 'Top 10 Pixel Art Tools for Aspiring Artists', content: 'An overview of the best software and online tools available for creating pixel art, with pros and cons for each.', username: 'ByteArtist', timestamp: '2024-02-02 14:00:00', likes: 0 },
        { title: 'Top 20 Pixel Art Games You Must Play', content: 'A curated list of the best pixel art games across various genres, highlighting what makes each game unique and visually appealing.', username: 'RetroRogue', timestamp: '2024-02-02 15:00:00', likes: 0 },
        { title: 'Exploring Minimalist Pixel Art: Less is More', content: 'An introduction to minimalist pixel art, showcasing techniques for creating impactful images with a limited number of pixels and colors.', username: 'SpriteSuccessor', timestamp: '2024-02-02 16:00:00', likes: 0 },
        { title: 'Seasonal Pixel Art: Designing Art for Holidays and Celebrations', content: 'Ideas and techniques for creating pixel art themed around different seasons and holidays, from festive decorations to seasonal landscapes.', username: 'PixelMaster', timestamp: '2024-01-02 17:00:00', likes: 0 }
    ];

    // Insert sample data into the database
    await Promise.all(users.map(user => {
        console.log(user.hashedGoogleId);
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
        );
        
    }));

    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

/*

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});

*/

module.exports = initializeDB;