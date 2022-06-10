const jwt = require('jsonwebtoken')

const secret = "SuperSecret"

function generateAuthToken(userId, role) {
    const payload = { sub: userId, role: role }
    return jwt.sign(payload, secret, { expiresIn: '24h' })
}
exports.generateAuthToken = generateAuthToken


function requireAuthentication(req, res, next) {
    const authHeader = req.get('authorization') || ''
    const authParts = authHeader.split(' ')
    const token = authParts[0] === 'Bearer' ? authParts[1] : null

    try {
        const payload = jwt.verify(token, secret)
        console.log("== payload:", payload)
        req.user = payload.sub
        req.role = payload.role
        next()
    } catch (err) {
        res.status(401).send({
            err: "Invalid authentication token"
        })
    }
}
exports.requireAuthentication = requireAuthentication
