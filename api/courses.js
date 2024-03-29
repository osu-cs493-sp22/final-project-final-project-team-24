const { Router } = require('express')
const { validateAgainstSchema } = require('../lib/validation')
const { requireAuthentication } = require('../lib/auth')
const {
    CourseSchema,
    getCoursesPage,
    insertNewCourse,
    getCourseById,
    updateOneCourse,
    deleteOneCourse,
    getByIdWithoutStu,
    addStudents,
    removeStudents,
} = require('../models/course')
const { getUserById, getUserByIdWithId } = require('../models/user')
const { getAssignmentsByCourseId } = require('../models/assignment')

const fs = require('fs');
const router = Router()

/*
 * GET /courses - Route to return a paginated list of courses.
 */
router.get('/', async (req, res) => {
    try {
        /*
        * Fetch page info, generate HATEOAS links for surrounding pages and then
        * send response.
        * */
        const coursePage = await getCoursesPage(parseInt(req.query.page) || 1)
        coursePage.links = {}
        if (coursePage.page < coursePage.totalPages) {
            coursePage.links.nextPage = `/courses?page=${coursePage.page + 1}`
            coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}`
        }
        if (coursePage.page > 1) {
            coursePage.links.prevPage = `/courses?page=${coursePage.page - 1}`
            coursePage.links.firstPage = '/courses?page=1'
        }
        res.status(200).send(coursePage)
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Error fetching courses list.  Please try again later."
        })
    }
})

/*
 * POST /courses - Route to create a new courses.
 */
router.post('/', requireAuthentication, async (req, res, next) => {
    if (validateAgainstSchema(req.body, CourseSchema)) {
        try {
            if (req.role != "admin") {
                res.status(403).send({
                    err: "Only admin user can create a course!"
                })
                return
            }

            const id = await insertNewCourse(req.body)
            res.status(201).send({
                id: id
            })
        } catch (err) {
            console.error(err)
            res.status(500).send({
                error: "Error inserting course into DB.  Please try again later."
            })
        }
    } else {
        res.status(400).send({
            error: "Request body is not a valid course object."
        })
    }
})

/*
 * GET /courses/{id} - Route to fetch info about a specific course.
 */
router.get('/:id', async (req, res, next) => {
    try {
        const course = await getByIdWithoutStu(req.params.id)
        if (course) {
            res.status(200).send(course)
        } else {
            next()
        }
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable to fetch course.  Please try again later."
        })
    }
})

/*
 * PATCH /courses/{id} - Update data for a specific Course.
 */
router.patch('/:id', requireAuthentication, async (req, res, next) => {
    if (validateAgainstSchema(req.body, CourseSchema)) {
        try {
            const course = await getByIdWithoutStu(req.params.id)
            console.log(req.role)
            if (req.role == "admin" || course.instructorId == req.user) {
                const updated = await updateOneCourse(req.params.id, req.body)
                if (updated) {
                    res.status(200).send()
                } else {
                    next()
                }
            } else {
                res.status(403).send({
                    error: "Only admin or instructor can change course info."
                })
            }
        } catch (err) {
            console.error(err)
            res.status(500).send({
                error: "Unable to update course.  Please try again later."
            })
        }
    } else {
        res.status(400).send({
            error: "Request body is not a valid course object."
        })
    }
})

/*
 * DELETE /courses/{id} - Remove a specific Course from the database.
 */
router.delete('/:id', requireAuthentication, async (req, res, next) => {
    try {
        if (req.role != "admin") {
            res.status(403).send({
                err: "Only admin user can remove a course!"
            })
            return
        }
        const deleted = await deleteOneCourse(req.params.id)
        if (deleted) {
            res.status(204).send()
        } else {
            res.status(404).send({
                err: "cannot find the course id"
            })
        }
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable to delete course.  Please try again later."
        })
    }
})


router.get('/:id/students', requireAuthentication, async (req, res, next) => {
    const course = await getCourseById(req.params.id)

    if (course) {
        if (req.role == "admin" || course.instructorId == req.user) {
            let students = []
            if (course.students) {
                const promise = course.students.map(async studentId => {
                    console.log(studentId)
                    const student = await getUserById(studentId);
                    return student
                });
                students = await Promise.all(promise)
            }
            res.status(200).send({ students: students })
        } else {
            res.status(403).send({
                err: "Only admin or instructor user can fetch student info!"
            })
            next()
        }
    } else {
        next()
    }
})


router.post('/:id/students', requireAuthentication, async (req, res) => {
    if (req.body && req.body.add && req.body.remove) {
        try {
            const course = await getByIdWithoutStu(req.params.id)
            if(course){
                if (req.role == "admin" || course.instructorId == req.user) {
                    const added = await addStudents(req.params.id, req.body.add)
                    const removed = await removeStudents(req.params.id, req.body.remove)
                    if (added && removed) {
                        res.status(200).send()
                    } else {
                        next()
                    }
                } else {
                    res.status(403).send({
                        error: "Only admin or instructor can enroll or unenroll students."
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
                error: "Unable to update course.  Please try again later."
            })
        }
    } else {
        res.status(400).send({
            error: "Request body needs add and remove."
        })
    }
})

// get the course student info list into csv file
router.get('/:id/roster', requireAuthentication, async (req, res, next) => {
    try {
        const course = await getCourseById(req.params.id)
        if (req.role == "admin" || course.instructorId == req.user) {
            let students = []
            if (course.students) {
                const promise = course.students.map(async studentId => {
                    const student = await getUserByIdWithId(studentId);
                    return student
                });
                students = await Promise.all(promise)

                let stringify = "";

                students.forEach(student => {
                    if (student) {
                        stringify += (student._id + ',"'
                            + student.name + '",'
                            + student.email + "\n")
                    }
                });

                if (!fs.existsSync('./csv')) {
                    fs.mkdirSync('./csv');
                }
                fs.writeFile('./csv/roster.csv', stringify, (err) => {
                    if (err) throw err;
                    const filename = './csv/roster.csv'
                    res.status(200).download(filename)
                })
            } else {
                next()
            }
        } else {
            res.status(403).send({
                error: "Only admin or instructor can download csv."
            })
        }
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable get the roster.  Please try again later."
        })
    }
})


router.get('/:id/assignments', async (req, res, next) => {
    const course = await getCourseById(req.params.id)

    if (course) {
        const assignments = await getAssignmentsByCourseId(req.params.id)
        if (assignments) {
            res.status(200).send({
                assignments: assignments
            })
        }
    } else {
        next()
    }
})

module.exports = router