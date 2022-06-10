const { Router } = require('express')
const { validateAgainstSchema } = require('../lib/validation')
const { requireAuthentication } = require('../lib/auth')
const {
    AssignmentSchema,
    insertNewAssignment,
    getAssignmentById,
    updateOneAssignment,
    deleteOneAssignment
} = require('../models/assignment')
const {
    SubmissionSchema,
    getSubmissionPage,
    insertNewSubmission,
    saveFile
} = require('../models/submission')
const { getByIdWithoutStu, getCourseById } = require('../models/course')
const multer = require('multer')
const crypto = require("crypto")

const upload = multer({
    storage: multer.diskStorage({
        destination: `${__dirname}/../uploads`,
        filename: function (req, file, callback) {
            const ext = file.originalname.split('.')[1]
            const filename = crypto.pseudoRandomBytes(16).toString('hex')
            callback(null, `${filename}.${ext}`)
        }
    })
})

const router = Router()


/*
 * POST /assignments - Route to create a new assignment.
 */
router.post('/', requireAuthentication, async (req, res) => {
    if (validateAgainstSchema(req.body, AssignmentSchema)) {
        try {
            const course = await getByIdWithoutStu(req.body.courseId)
            if (course){
                if (req.role == "admin" || course.instructorId == req.user) {
                    const id = await insertNewAssignment(req.body)
                    res.status(201).send({
                        id: id
                    })
                } else {
                    res.status(403).send({
                        error: "Only admin or instructor add assignments."
                    })
                }
            }else{
                res.status(404).send({
                    error: "Specified Course id not found."
                })
            }
        } catch (err) {
            console.error(err)
            res.status(500).send({
                error: "Error inserting assignment into DB.  Please try again later."
            })
        }
    } else {
        res.status(400).send({
            error: "Request body is not a valid assignment object."
        })
    }
})

/*
 * GET /assignments/{id} - Route to fetch data about a specific assignment.
 */
router.get('/:id', async (req, res, next) => {
    try {
        const assignment = await getAssignmentById(req.params.id)
        if (assignment) {
            res.status(200).send(assignment)
        } else {
            next()
        }
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable to fetch assignment.  Please try again later."
        })
    }
})

/*
 * PATCH /assignments/{id} - Update data for a specific Assignment.
 */
router.patch('/:id', requireAuthentication, async (req, res, next) => {
    if (validateAgainstSchema(req.body, AssignmentSchema)) {
        try {
            const assignment = await getAssignmentById(req.params.id)
            if(assignment){
                const course = await getByIdWithoutStu(assignment.courseId)
                if (req.role == "admin" || course.instructorId == req.user) {
                    const updated = await updateOneAssignment(req.params.id, req.body)
                    if (updated) {
                        res.status(200).send()
                    } else {
                        next()
                    }
                } else {
                    res.status(403).send({
                        error: "Only admin or instructor can change assignment info."
                    })
                }
            }else{
                res.status(404).send({
                    error: "Specified assignment id not found."
                })
            }
        } catch (err) {
            console.error(err)
            res.status(500).send({
                error: "Unable to update assignment.  Please try again later."
            })
        }
    } else {
        res.status(400).send({
            error: "Request body is not a valid assignment object."
        })
    }
})

/*
 * DELETE /assignments/{id} - Remove a specific Assignment from the database.
 */
router.delete('/:id', requireAuthentication, async (req, res, next) => {
    try {
        const assignment = await getAssignmentById(req.params.id)
        if(assignment){
            const course = await getByIdWithoutStu(assignment.courseId)
            if (req.role != "admin" && course.instructorId != req.user) {
                console.log(req.role)
                res.status(403).send({
                    err: "Only admin or instructor user can remove an assignment!"
                })
                return
            }
            const deleted = await deleteOneAssignment(req.params.id)
            if (deleted) {
                res.status(204).send()
                return
            }
        }else{
            res.status(404).send({
                error: "Specified assignment id not found."
            })
            return
        }
        const deleted = await deleteOneAssignment(req.params.id)
        if (deleted) {
            res.status(204).send()
        } else {
            next()
        }
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable to delete assignment.  Please try again later."
        })
    }
})


router.get('/:id/submissions', requireAuthentication, async (req, res, next) => {
    try {
        const assignment = await getAssignmentById(req.params.id)
        const course = await getByIdWithoutStu(assignment.courseId)
        if (req.role != "admin" && course.instructorId != req.user) {
            res.status(403).send({
                err: "Only admin or instructor user can fetch submission!"
            })
            return
        }
        if (assignment) {
            const submissionsePage = await getSubmissionPage(parseInt(req.query.page) || 1, req.query.studentId || '')
            submissionsePage.links = {}
            if (submissionsePage.page < submissionsePage.totalPages) {
                submissionsePage.links.nextPage = `/courses?page=${submissionsePage.page + 1}`
                submissionsePage.links.lastPage = `/courses?page=${submissionsePage.totalPages}`
            }
            if (submissionsePage.page > 1) {
                submissionsePage.links.prevPage = `/courses?page=${submissionsePage.page - 1}`
                submissionsePage.links.firstPage = '/courses?page=1'
            }
            res.status(200).send(submissionsePage)
        } else {
            next()
        }
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable to fetch submissions.  Please try again later."
        })
    }
})


router.post('/:id/submissions', [requireAuthentication, upload.single('file')], async (req, res) => {
    console.log(req.user)
    console.log(req.file)
    if (req.params.id && req.file) {
        try {
            const assignment = await getAssignmentById(req.params.id)
            const course = await getCourseById(assignment.courseId)

            if (course.students && course.students.includes(req.user)) {
                const id = await insertNewSubmission({
                    assignmentId: req.params.id,
                    studentId: req.user,
                    timestamp: new Date().toISOString()
                });
                const fid = await saveFile({
                    filename: req.file.filename,
                    path: req.file.path
                })

                res.status(201).send({
                    id: id,
                    file: "/file/" + fid
                })
            } else {
                res.status(403).send({
                    err: "Only enrolled student can post submission!"
                })
            }
        } catch (err) {
            console.error(err)
            res.status(500).send({
                error: "Unable to post submissions.  Please try again later."
            })
        }
    } else {
        res.status(400).send({
            error: "Request params or body is not a valid submission object."
        })
    }
})

module.exports = router