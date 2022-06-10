const { ObjectId, GridFSBucket } = require('mongodb');
const fs = require('fs')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

const SubmissionSchema = {
    assignmentId: { required: true },
    studentId: { required: true },
    timestamp: { required: true },
    grade: { required: false },
    file: { required: true }
}


async function getSubmissionPage(page, studentId) {
    const db = getDbReference()
    const collection = db.collection('submissions')
    const query = studentId ? { studentId: studentId } : {}
    const count = await collection.countDocuments(query)

    /*
     * Compute last page number and make sure page is within allowed bounds.
     * Compute offset into collection.
     */
    const pageSize = 10
    const lastPage = Math.ceil(count / pageSize)
    page = page > lastPage ? lastPage : page
    page = page < 1 ? 1 : page
    const offset = (page - 1) * pageSize

    const results = await collection.find(query)
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


async function insertNewSubmission(submission) {
    const db = getDbReference()
    const collection = db.collection('submissions')

    submission = extractValidFields(submission, SubmissionSchema)
    const result = await collection.insertOne({
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        timestamp: submission.timestamp,
    })
    return result.insertedId
}
exports.insertNewSubmission = insertNewSubmission


exports.saveFile = function (f) {
    return new Promise(function (resolve, reject) {
      const db = getDbReference()
      const bucket = new GridFSBucket(db, { bucketName: 'files' })
      const uploadStream = bucket.openUploadStream(f.filename)
      fs.createReadStream(f.path).pipe(uploadStream)
        .on('error', function (err) {
          reject(err)
        })
        .on('finish', function (result) {
          console.log("== stream result:", result)
          resolve(result._id)
        })
    })
  }

  exports.getDownloadStreamById = function (id) {
    const db = getDbReference()
    const bucket = new GridFSBucket(db, { bucketName: 'files' })
    if (!ObjectId.isValid(id)) {
      return null
    } else {
      return bucket.openDownloadStream(new ObjectId(id))
    }
  }