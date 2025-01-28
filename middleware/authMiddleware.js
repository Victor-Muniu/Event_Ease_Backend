const jwt = require('jsonwebtoken');
const Staff = require('../../modules/general/staff'); 

module.exports = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: 'No token provided. Unauthorized.' });
        }

        
        const decoded = jwt.verify(token, 'your_secret_key'); 
        
        
        const staff = await Staff.findOne({ emp_no: decoded.user.emp_no });
        if (!staff) {
            return res.status(401).json({ message: 'Invalid user. Unauthorized.' });
        }

        
        req.user = staff;

        next(); 
    } catch (err) {
        console.error('Token verification failed:', err.message);
        res.status(401).json({ message: 'Invalid token. Unauthorized.' });
    }
};
