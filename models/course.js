const { ObjectId } = require('mongodb')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

const CourseSchema = {
    subject: { required: true },
    number: { required: true },
    title: { required: true },
    term: { required: true },
    instructorId: { required: true },
    students: { required: false }
}

exports.CourseSchema = CourseSchema

/*
 * Executes a DB query to return a single page of courses.  Returns a
 * Promise that resolves to an array containing the fetched page of courses.
 */
async function getCoursesPage(page) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const count = await collection.countDocuments()

    /*
     * Compute last page number and make sure page is within allowed bounds.
     * Compute offset into collection.
     */
    const pageSize = 10
    const lastPage = Math.ceil(count / pageSize)
    page = page > lastPage ? lastPage : page
    page = page < 1 ? 1 : page
    const offset = (page - 1) * pageSize

    const results = await collection.find({})
        .project({ students: 0 })
        .sort({ _id: 1 })
        .skip(offset)
        .limit(pageSize)
        .toArray()

    return {
        courses: results,
        page: page,
        totalPages: lastPage,
        pageSize: pageSize,
        count: count
    }
}
exports.getCoursesPage = getCoursesPage

/*
 * Executes a DB query to insert a new course into the database.  Returns
 * a Promise that resolves to the ID of the newly-created course entry.
 */
async function insertNewCourse(course) {
    const db = getDbReference()
    const collection = db.collection('courses')

    course = extractValidFields(course, CourseSchema)
    const result = await collection.insertOne(course)
    return result.insertedId
}
exports.insertNewCourse = insertNewCourse

/*
 * Returns summary data about the Course, excluding the list of students 
 * enrolled in the course and the list of Assignments for the course.
 */
async function getByIdWithoutStu(id) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const courses = await collection.find({
        _id: new ObjectId(id)
    })
        .project({ students: 0 })
        .toArray()
    return courses[0];
}
exports.getByIdWithoutStu = getByIdWithoutStu


async function getCourseById(id) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const courses = await collection.find({
        _id: new ObjectId(id)
    })
        .toArray()
    return courses[0];
}
exports.getCourseById = getCourseById

async function getCoursesByStudentId(sid) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const courses = await collection.find({
        students: { $all: [sid] }
    }).toArray()
    return courses;
}
exports.getCoursesByStudentId = getCoursesByStudentId

async function getCoursesByInstructorId(iid) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const courses = await collection.find({
        instructorId: iid
    }).toArray()
    return courses;
}
exports.getCoursesByInstructorId = getCoursesByInstructorId

/*
 * Returns a list containing the User IDs of all students currently enrolled in the Course. 
 * Only an authenticated User with 'admin' role or an authenticated 'instructor' User whose 
 * ID matches the instructorId of the Course can fetch the list of enrolled students.
 */
async function updateOneCourse(id, course) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const courses = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $set: {
                subject: course.subject,
                number: course.number,
                title: course.title,
                term: course.term,
                instructorId: course.instructorId
            }
        }
    )
    return courses
}
exports.updateOneCourse = updateOneCourse


async function addStudents(id, uids) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const courses = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $addToSet: {
                students: {
                    $each: uids
                }
            }
        }
    )
    return courses
}
exports.addStudents = addStudents


async function removeStudents(id, uids) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const courses = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $pull: {
                students: { $in: uids }
            }
        }
    )
    return courses
}
exports.removeStudents = removeStudents


/*
 * Completely removes the data for the specified Course, including all enrolled students, 
 * all Assignments, etc. Only an authenticated User with 'admin' role can remove a Course.
 */
async function deleteOneCourse(id) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const courses = await collection.deleteOne({
        _id: new ObjectId(id)
    })
    return courses
}
exports.deleteOneCourse = deleteOneCourse