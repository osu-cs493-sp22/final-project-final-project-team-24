const { ObjectId } = require('mongodb')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

const SubmissionSchema = {
    assignmentId: { required: true },
    studentId: { required: true },
    timestamp: { required: true },
    grade: { required: true },
    file: { required: true }
}


async function getSubmissionPage(page) {
    const db = getDbReference()
    const collection = db.collection('submissions')
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
        // .project({ students: 0 })
        .sort({ _id: 1 })
        .skip(offset)
        .limit(pageSize)
        .toArray()

    return {
        submissions: results,
        page: page,
        totalPages: lastPage,
        pageSize: pageSize,
        count: count
    }
}
exports.getSubmissionPage = getSubmissionPage