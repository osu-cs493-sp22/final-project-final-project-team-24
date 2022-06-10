const { Router } = require('express')
const { validateAgainstSchema } = require('../lib/validation')
const bcrypt = require('bcryptjs')
const { generateAuthToken, requireAuthentication } = require('../lib/auth')
const {
    UserSchema,
    insertNewUser,
    getUserById,
    getUserByEmail
} = require('../models/user')
const { getCoursesByStudentId, getCoursesByInstructorId } = require('../models/course')

const router = Router()


/*
 * POST /users - Create a new user.
 */
router.post('/', requireAuthentication, async (req, res, next) => {
    if (validateAgainstSchema(req.body, UserSchema)) {
        if (req.body && (req.body.role == "admin"
            || req.body.role == "instructor")) {
            if (req.role != "admin") {
                res.status(403).send({
                    err: "Only admin user can create admin or instructor!"
                })
                next()
            }
        }

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
router.post('/login', async (req, res) => {
    if (req.body && req.body.email && req.body.password) {
        const user = await getUserByEmail(req.body.email);
        const authenticated = user && await bcrypt.compare(
            req.body.password,
            user.password
        )

        if (authenticated) {
            const token = generateAuthToken(user._id, user.role)
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
    console.log("== req.role:", req.role)
    if (req.user !== req.params.id) {
        res.status(403).send({
            err: "Unauthorized to access the specified resource"
        })
        return
    } else {
        const user = await getUserById(req.user)
        if (user) {
            // if the authenticated user is instructor, give courses user teaches
            if (req.role == "instructor") {
                user.courses = []
                const courses = await getCoursesByInstructorId(req.user)
                courses.forEach(course => {
                    user.courses.push(course._id)
                });
            }
            // if the authenticated user is student, give courses user enrolled
            if (req.role == "student") {
                user.courses = []
                const courses = await getCoursesByStudentId(req.user)
                courses.forEach(course => {
                    user.courses.push(course._id)
                });
            }
            res.status(200).send(user)
        } else {
            res.status(404).send({
                err: "Cannot find the id"
            })
        }
    }
})


module.exports = router