const { ObjectId } = require('mongodb')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

const AssignmentSchema = {
    courseId: { required: true },
    title: { required: true },
    points: { required: true },
    due: { required: true }
}

exports.AssignmentSchema = AssignmentSchema

/*
 * Create and store a new Assignment with specified data and adds it to the application's database. 
 * Only an authenticated User with 'admin' role or an authenticated 'instructor' User whose ID matches 
 * the instructorId of the Course corresponding to the Assignment's courseId can create an Assignment.
 */
async function insertNewAssignment(assignment) {
    const db = getDbReference()
    const collection = db.collection('assignments')

    assignment = extractValidFields(assignment, AssignmentSchema)
    const result = await collection.insertOne(assignment)
    return result.insertedId
}
exports.insertNewAssignment = insertNewAssignment

/*
 * Returns summary data about the Assignment, excluding the list of Submissions
 */
async function getAssignmentById(id) {
    const db = getDbReference()
    const collection = db.collection('assignments')
    const assignments = await collection.find({
        _id: new ObjectId(id)
    })
        .project({ _id: 0 })
        .toArray()
    return assignments[0];
}
exports.getAssignmentById = getAssignmentById

/*
 * Performs a partial update on the data for the Assignment. Note that submissions 
 * cannot be modified via this endpoint. Only an authenticated User with 'admin' role or 
 * an authenticated 'instructor' User whose ID matches the instructorId of the Course 
 * corresponding to the Assignment's courseId can update an Assignment.
 */
async function updateOneAssignment(id, assignment) {
    const db = getDbReference()
    const collection = db.collection('assignments')
    const assignments = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $set: {
                courseId: assignment.courseId,
                title: assignment.title,
                points: assignment.points,
                due: assignment.due
            }
        }
    )
    return assignments
}
exports.updateOneAssignment = updateOneAssignment


async function getAssignmentsByCourseId(cid) {
    const db = getDbReference()
    const collection = db.collection('assignments')
    const assignments = await collection.find(
        { courseId: cid }
    )
        .project({ _id: 0 })
        .toArray()
    return assignments
}
exports.getAssignmentsByCourseId = getAssignmentsByCourseId


/*
 * Completely removes the data for the specified Assignment, including all 
 * submissions. Only an authenticated User with 'admin' role or an authenticated 
 * 'instructor' User whose ID matches the instructorId of the Course corresponding to 
 * the Assignment's courseId can delete an Assignment.
 */
async function deleteOneAssignment(id) {
    const db = getDbReference()
    const collection = db.collection('assignments')
    const assignments = await collection.deleteOne({
        _id: new ObjectId(id)
    })
    return assignments
}
exports.deleteOneAssignment = deleteOneAssignment