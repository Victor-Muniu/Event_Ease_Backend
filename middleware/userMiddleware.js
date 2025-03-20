const jwt = require('jsonwebtoken');
const User = require("../modules/user")

module.exports = async (req, res, next) => {
    try {
        const token = req.cookies.token

        if (!token) {
            return res.status(401).json({ message: 'No token provided. Unauthorized.' });
        }

        const decoded = jwt.verify(token, 'your_secret_key'); 
        
        const user = await User.findOne({ email: decoded.user.email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid user. Unauthorized.' });
        }

        req.user = user;
        next();  
    } catch (err) {
        console.error('Token verification failed:', err.message);
        res.status(401).json({ message: 'Invalid token. Unauthorized.' });
    }
};
