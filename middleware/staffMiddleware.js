const jwt = require('jsonwebtoken');
const Staff = require('../modules/staff'); 

module.exports = async (req, res, next) => {
    try {
        const token = req.cookies.token

        if (!token) {
            return res.status(401).json({ message: 'No token provided. Unauthorized.' });
        }

        const decoded = jwt.verify(token, 'your_secret_key'); 
        
        const event_organizer = await Staff.findOne({ email: decoded.user.email });
        if (!event_organizer) {
            return res.status(401).json({ message: 'Invalid user. Unauthorized.' });
        }

        req.user = event_organizer;
        next();  
    } catch (err) {
        console.error('Token verification failed:', err.message);
        res.status(401).json({ message: 'Invalid token. Unauthorized.' });
    }
};
