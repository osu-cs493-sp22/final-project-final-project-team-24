const { ObjectId, GridFSBucket } = require('mongodb');

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

const UserSchema = {
    name: { required: true },
    email: { required: true },
    password: { required: true },
    role: { required: true }
}



async function bulkInsertNewUsers(users) {
    const usersToInsert = users.map(function (user) {
        return extractValidFields(user, UserSchema)
    })
    const db = getDbReference()
    const collection = db.collection('users')
    const result = await collection.insertMany(usersToInsert)
    return result.insertedIds
}
exports.bulkInsertNewUsers = bulkInsertNewUsers