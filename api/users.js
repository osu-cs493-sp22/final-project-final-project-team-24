const { Router } = require('express')
const { validateAgainstSchema } = require('../lib/validation')
const bcrypt = require('bcryptjs')
const { generateAuthToken, requireAuthentication } = require('../lib/auth')
const {
    UserSchema,
    insertNewUser,
    getUserById
} = require('../models/user')

const router = Router()


/*
 * POST /users - Create a new user.
 */
router.post('/', async (req, res) => {
    if (validateAgainstSchema(req.body, UserSchema)) {
        const id = await insertNewUser(req.body)
        res.status(201).send({
            _id: id
        })
    } else {
        res.status(400).send({
            error: "Request body does not contain a valid User."
        })
    }
})

/*
 * POST /users/login - Log in a User.
 */
router.post('/login', async  (req, res) =>  {
    if (req.body && req.body.id && req.body.email &&req.body.password) {
        const user = await getUserById(req.body.id, true)
        const authenticated = user && await bcrypt.compare(
            req.body.password,
            user.password
        )
        if (authenticated) {
            const token = generateAuthToken(req.body.id)
            res.status(200).send({ token: token })
        } else {
            res.status(401).send({
                error: "Invalid credentials"
            })
        }
    } else {
        res.status(400).send({
            error: "Request needs email and password."
        })
    }
})

/*
 * Get /users/{id} - Fetch data about a specific user.
 */
router.get('/:id', requireAuthentication, async (req, res, next) => {
    console.log("== req.user:", req.user)
    if (req.user !== req.params.id) {
        res.status(403).send({
          err: "Unauthorized to access the specified resource"
        })
        next()
    } else {
        const user = await getUserById(req.params.id)
        console.log("== req.headers:", req.headers)
        if (user) {
            res.status(200).send(user)
        } else {
            next()
        }
    }
})




module.exports = router